package teamDeathMatch

import (
	"log"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"space-tactics-server/internal/game"
	SpaceTactics "space-tactics-server/internal/generated/SpaceTactics"
	"space-tactics-server/internal/models"

	flatbuffers "github.com/google/flatbuffers/go"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{CheckOrigin: func(r *http.Request) bool { return true }}

type TDMRoom struct {
	*game.GameRoom
	mu              sync.Mutex
	clients         map[*websocket.Conn]bool
	pilotedUnitType string
	pilotedUnitID   string
	customUnitPool  []string
	isGameOver      bool
	winningFaction  string
	lastInput       game.SandboxClientInput
}

func NewTDMRoom(mapID int, pilotedUnitType string, customPool []string) *TDMRoom {
	baseRoom := game.NewGameRoom(mapID, false)
	
	room := &TDMRoom{
		GameRoom:        baseRoom,
		clients:         make(map[*websocket.Conn]bool),
		pilotedUnitType: pilotedUnitType,
		customUnitPool:  customPool,
	}
	room.LoadMapStructures()
	room.ResetMatch()
	return room
}

func (r *TDMRoom) LoadMapStructures() {
	targetMapID := r.GetMapID()
	if targetMapID == 0 {
		r.SetMapID(1)
	}
}

func (r *TDMRoom) ResetMatch() {
	r.SetUnits(make(map[string]*models.FleetUnit))
	r.SetProjectiles([]models.Projectile{})
	r.SetTick(0)
	r.isGameOver = false
	r.winningFaction = ""

	r.pilotedUnitID = InitializeTDMRoster(r, r.pilotedUnitType, r.customUnitPool)
	log.Printf("⚔️ TDM Match Initialized: 20v20 Skirmish spawned. Piloted unit locked to ID: %s", r.pilotedUnitID)
}

func (r *TDMRoom) HandleWS(w http.ResponseWriter, req *http.Request) {
	query := req.URL.Query()
	if unitType := query.Get("unit"); unitType != "" {
		r.pilotedUnitType = unitType
	}
	if mapStr := query.Get("map"); mapStr != "" {
		if parsedMap, err := strconv.Atoi(mapStr); err == nil && parsedMap > 0 {
			r.SetMapID(parsedMap)
		}
	}
	if poolStr := query.Get("pool"); poolStr != "" {
		r.customUnitPool = strings.Split(poolStr, ",")
	}

	r.mu.Lock()
	if len(r.GetUnits()) == 0 {
		r.ResetMatch()
	}
	r.mu.Unlock()

	conn, _ := upgrader.Upgrade(w, req, nil)
	clientAddr := conn.RemoteAddr().String()
	log.Printf("🔌 Player connected to TDM Room: %s", clientAddr)

	r.mu.Lock()
	r.clients[conn] = true
	r.mu.Unlock()

	defer func() {
		log.Printf("❌ Player disconnected from TDM: %s", clientAddr)
		r.mu.Lock()
		delete(r.clients, conn)
		r.mu.Unlock()
		conn.Close()
	}()

	for {
		messageType, msg, err := conn.ReadMessage()
		if err != nil { break }
		if messageType != websocket.BinaryMessage { continue }

		clientInput := SpaceTactics.GetRootAsClientInput(msg, 0)

		r.mu.Lock()
		r.lastInput.W = clientInput.W()
		r.lastInput.S = clientInput.S()
		r.lastInput.A = clientInput.A()
		r.lastInput.D = clientInput.D()
		r.lastInput.Angle = clientInput.Angle()
		r.lastInput.IsFiring = clientInput.IsFiring()
		
		if clientInput.Reset() {
			r.ResetMatch()
		}
		r.mu.Unlock()
	}
}

func (r *TDMRoom) Run() {
	ticker := time.NewTicker(16 * time.Millisecond)
	defer ticker.Stop()

	for range ticker.C {
		r.mu.Lock()
		r.SetTick(r.GetTick() + 1)

		// 1. Check Win Conditions
		if !r.isGameOver {
			if winner := CheckWinConditions(r); winner != "" {
				r.isGameOver = true
				r.winningFaction = winner
				log.Printf("🏆 TDM Match Over! Winning Faction: %s", winner)
			}
		}

		// 2. Run Game Physics & AI Simulation Loops
		if !r.isGameOver {
			units := r.GetUnits()
			for id, unit := range units {
				if unit.IsDestroyed {
					delete(units, id)
					continue
				}

				// Player control handling for the designated piloted unit
				if unit.ID == r.pilotedUnitID {
					game.HandlePlayerMovement(unit, game.SandboxClientInput{
						W:        r.lastInput.W,
						S:        r.lastInput.S,
						A:        r.lastInput.A,
						D:        r.lastInput.D,
						Angle:    r.lastInput.Angle,
						IsFiring: r.lastInput.IsFiring,
					}, 12000.0, 12000.0)
					unit.IsFiring = r.lastInput.IsFiring
					unit.Angle = float64(r.lastInput.Angle)
				} else {
					// Autonomous squad AI execution
					game.RunUnitAI(unit, r.GameRoom, nil)
				}

				game.ApplyUnitPhysics(unit, 12000.0, 12000.0)
				game.ApplyEnvironmentalCollisions(unit, r.GetStructures())
				game.ApplyMajorWorldGravity(unit, r.GetStructures())
				game.HandleWeaponFiring(unit, r.GameRoom)
			}

			game.ResolveUnitCollisions(units, false)
			game.UpdateProjectiles(r.GameRoom)
		}

		// 3. Build & Broadcast Binary FlatBuffers State
		builder := flatbuffers.NewBuilder(1024)
		units := r.GetUnits()
		unitOffsets := make([]flatbuffers.UOffsetT, 0, len(units))

		for _, u := range units {
			if u.IsDestroyed { continue }
			idOffset := builder.CreateString(u.ID)
			typeOffset := builder.CreateString(u.Type)
			ownerOffset := builder.CreateString(u.OwnerID)

			SpaceTactics.FleetUnitStart(builder)
			SpaceTactics.FleetUnitAddId(builder, idOffset)
			SpaceTactics.FleetUnitAddType(builder, typeOffset)
			SpaceTactics.FleetUnitAddOwnerId(builder, ownerOffset)

			pos := SpaceTactics.CreateVector2D(builder, float32(u.Pos.X), float32(u.Pos.Y))
			SpaceTactics.FleetUnitAddPos(builder, pos)

			shields := SpaceTactics.CreateShields(builder, float32(u.Shields.Front), float32(u.Shields.Rear), float32(u.Shields.Port), float32(u.Shields.Starboard))
			SpaceTactics.FleetUnitAddShields(builder, shields)

			hull := SpaceTactics.CreateHull(builder, float32(u.Hull.Front), float32(u.Hull.Rear), float32(u.Hull.Port), float32(u.Hull.Starboard))
			SpaceTactics.FleetUnitAddHull(builder, hull)

			SpaceTactics.FleetUnitAddAngle(builder, float32(u.Angle))
			SpaceTactics.FleetUnitAddIsDestroyed(builder, u.IsDestroyed)
			SpaceTactics.FleetUnitAddIsSquadLeader(builder, u.IsSquadLeader)
			SpaceTactics.FleetUnitAddIsFiring(builder, u.IsFiring)
			SpaceTactics.FleetUnitAddBattalionId(builder, int32(u.BattalionID))
			SpaceTactics.FleetUnitAddSquadId(builder, int32(u.SquadID))
			SpaceTactics.FleetUnitAddVisionRange(builder, int32(u.VisionRange))
			unitOffsets = append(unitOffsets, SpaceTactics.FleetUnitEnd(builder))
		}

		SpaceTactics.ServerStateStartUnitsVector(builder, len(unitOffsets))
		for i := len(unitOffsets) - 1; i >= 0; i-- {
			builder.PrependUOffsetT(unitOffsets[i])
		}
		unitsVector := builder.EndVector(len(unitOffsets))

		projectiles := r.GetProjectiles()
		projOffsets := make([]flatbuffers.UOffsetT, 0, len(projectiles))
		for _, p := range projectiles {
			pIdOffset := builder.CreateString(p.ID)
			ownerOffset := builder.CreateString(p.OwnerID)
			typeOffset := builder.CreateString(p.Type)

			SpaceTactics.ProjectileStart(builder)
			SpaceTactics.ProjectileAddId(builder, pIdOffset)
			SpaceTactics.ProjectileAddOwnerId(builder, ownerOffset)
			SpaceTactics.ProjectileAddType(builder, typeOffset)

			pos := SpaceTactics.CreateVector2D(builder, float32(p.Pos.X), float32(p.Pos.Y))
			SpaceTactics.ProjectileAddPos(builder, pos)

			vel := SpaceTactics.CreateVector2D(builder, float32(p.Vel.X), float32(p.Vel.Y))
			SpaceTactics.ProjectileAddVel(builder, vel)

			projOffsets = append(projOffsets, SpaceTactics.ProjectileEnd(builder))
		}

		SpaceTactics.ServerStateStartProjectilesVector(builder, len(projOffsets))
		for i := len(projOffsets) - 1; i >= 0; i-- {
			builder.PrependUOffsetT(projOffsets[i])
		}
		projVector := builder.EndVector(len(projOffsets))

		winningFactionOffset := builder.CreateString(r.winningFaction)

		SpaceTactics.ServerStateStart(builder)
		SpaceTactics.ServerStateAddTick(builder, r.GetTick())
		SpaceTactics.ServerStateAddUnits(builder, unitsVector)
		SpaceTactics.ServerStateAddProjectiles(builder, projVector)
		SpaceTactics.ServerStateAddMapWidth(builder, 12000.0)
		SpaceTactics.ServerStateAddMapHeight(builder, 12000.0)
		SpaceTactics.ServerStateAddIsGameOver(builder, r.isGameOver)
		SpaceTactics.ServerStateAddWinningFaction(builder, winningFactionOffset)
		serverState := SpaceTactics.ServerStateEnd(builder)

		builder.Finish(serverState)
		binaryData := builder.FinishedBytes()

		for conn := range r.clients {
			conn.WriteMessage(websocket.BinaryMessage, binaryData)
		}
		r.mu.Unlock()
	}
}
