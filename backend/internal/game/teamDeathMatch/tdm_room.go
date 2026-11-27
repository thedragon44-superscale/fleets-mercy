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
	clients         map[*game.WSClient]bool
	pilotedUnitType string
	pilotedUnitID   string
	customUnitPool  []string
	isGameOver      bool
	winningFaction  string
	lastInput       game.SandboxClientInput

	fbBuilder   *flatbuffers.Builder
	unitOffsets []flatbuffers.UOffsetT
	projOffsets []flatbuffers.UOffsetT
}

func NewTDMRoom(mapID int, pilotedUnitType string, customPool []string) *TDMRoom {
	baseRoom := game.NewGameRoom(mapID)

	room := &TDMRoom{
		GameRoom:        baseRoom,
		clients:         make(map[*game.WSClient]bool),
		pilotedUnitType: pilotedUnitType,
		customUnitPool:  customPool,
		fbBuilder:       flatbuffers.NewBuilder(16384),
		unitOffsets:     make([]flatbuffers.UOffsetT, 0, 64),
		projOffsets:     make([]flatbuffers.UOffsetT, 0, 128),
	}
	room.ResetMatch()
	return room
}

func (r *TDMRoom) LoadMapStructures() {
	targetMapID := r.GetMapID()
	if targetMapID == 0 {
		r.SetMapID(1)
	}
	r.ReloadMapStructures()
}

func (r *TDMRoom) ResetMatch() {
	r.SetUnits(make(map[string]*models.FleetUnit))
	r.SetProjectiles([]models.Projectile{})
	r.SetTick(0)
	r.isGameOver = false
	r.winningFaction = ""
	r.lastInput = game.SandboxClientInput{}

	r.pilotedUnitID = InitializeTDMRoster(r, r.pilotedUnitType, r.customUnitPool)
	log.Printf("⚔️ TDM Match Initialized: 20v20 Skirmish spawned. Piloted unit locked to ID: %s", r.pilotedUnitID)
}

func (r *TDMRoom) HandleWS(w http.ResponseWriter, req *http.Request) {
	conn, err := upgrader.Upgrade(w, req, nil)
	if err != nil {
		log.Printf("⚠️ TDM WebSocket upgrade failed: %v", err)
		return
	}
	clientAddr := conn.RemoteAddr().String()
	log.Printf("🔌 Player connected to TDM Room: %s", clientAddr)

	query := req.URL.Query()
	r.mu.Lock()
	needsReset := len(r.GetUnits()) == 0
	mapChanged := false

	if unitType := query.Get("unit"); unitType != "" {
		r.pilotedUnitType = unitType
		needsReset = true
	}
	mapStr := query.Get("mapId")
	if mapStr == "" {
		mapStr = query.Get("map")
	}
	if mapStr != "" {
		if parsedMap, err := strconv.Atoi(mapStr); err == nil && parsedMap > 0 {
			if parsedMap != r.GetMapID() {
				r.SetMapID(parsedMap)
				mapChanged = true
			}
			needsReset = true
		}
	}
	if poolStr := query.Get("pool"); poolStr != "" {
		r.customUnitPool = strings.Split(poolStr, ",")
		needsReset = true
	}

	if mapChanged {
		r.ReloadMapStructures()
	}
	if needsReset {
		r.ResetMatch()
	}

	client := game.NewWSClient(conn)
	go client.WritePump()

	r.clients[client] = true
	r.mu.Unlock()

	defer func() {
		log.Printf("❌ Player disconnected from TDM: %s", clientAddr)
		r.mu.Lock()
		delete(r.clients, client)
		if len(r.clients) == 0 {
			r.lastInput = game.SandboxClientInput{}
		}
		r.mu.Unlock()
		client.Close()
	}()

	for {
		messageType, msg, err := conn.ReadMessage()
		if err != nil {
			break
		}
		if messageType != websocket.BinaryMessage {
			continue
		}

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

		arenaW, arenaH := r.GetArenaSize()

		// 2. Run Game Physics & AI Simulation Loops
		if !r.isGameOver {
			if envW := r.GetEnvWorld(); envW != nil {
				envW.StepAuthored()
			}

			units := r.GetUnits()
			for id, unit := range units {
				if unit.IsDestroyed {
					delete(units, id)
					continue
				}

				if unit.ID == r.pilotedUnitID {
					game.HandlePlayerMovement(unit, game.SandboxClientInput{
						W:        r.lastInput.W,
						S:        r.lastInput.S,
						A:        r.lastInput.A,
						D:        r.lastInput.D,
						Angle:    r.lastInput.Angle,
						IsFiring: r.lastInput.IsFiring,
					}, arenaW, arenaH)
					unit.IsFiring = r.lastInput.IsFiring
				} else {
					game.RunUnitAI(unit, r.GameRoom, nil)
				}

				game.ApplyUnitPhysics(unit, arenaW, arenaH)
				game.ApplyUniversalEnvPhysics(unit, r.GetEnvWorld())
				game.RegenerateShields(unit)
				game.HandleWeaponFiring(unit, r.GameRoom)
			}

			game.ResolveUnitCollisions(units, false)
			game.UpdateProjectiles(r.GameRoom)
		}

		if len(r.clients) == 0 {
			r.mu.Unlock()
			continue
		}

		// 3. Build & Broadcast Binary FlatBuffers State (persistent scratch builder + non-blocking enqueue)
		builder := r.fbBuilder
		builder.Reset()
		units := r.GetUnits()
		r.unitOffsets = r.unitOffsets[:0]

		for _, u := range units {
			if u.IsDestroyed {
				continue
			}
			idOffset := builder.CreateString(u.ID)
			typeOffset := builder.CreateString(u.Type)
			ownerOffset := builder.CreateString(u.OwnerID)
			aiStateOffset := builder.CreateString(u.AIState)

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

			vel := SpaceTactics.CreateVector2D(builder, float32(u.Vel.X), float32(u.Vel.Y))
			SpaceTactics.FleetUnitAddVel(builder, vel)
			SpaceTactics.FleetUnitAddAiState(builder, aiStateOffset)
			SpaceTactics.FleetUnitAddCurrentThermal(builder, float32(u.CurrentThermal))
			SpaceTactics.FleetUnitAddCurrentAmmo(builder, int32(u.CurrentAmmo))
			SpaceTactics.FleetUnitAddIsStealthed(builder, u.StealthActive)

			r.unitOffsets = append(r.unitOffsets, SpaceTactics.FleetUnitEnd(builder))
		}

		SpaceTactics.ServerStateStartUnitsVector(builder, len(r.unitOffsets))
		for i := len(r.unitOffsets) - 1; i >= 0; i-- {
			builder.PrependUOffsetT(r.unitOffsets[i])
		}
		unitsVector := builder.EndVector(len(r.unitOffsets))

		projectiles := r.GetProjectiles()
		r.projOffsets = r.projOffsets[:0]
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

			r.projOffsets = append(r.projOffsets, SpaceTactics.ProjectileEnd(builder))
		}

		SpaceTactics.ServerStateStartProjectilesVector(builder, len(r.projOffsets))
		for i := len(r.projOffsets) - 1; i >= 0; i-- {
			builder.PrependUOffsetT(r.projOffsets[i])
		}
		projVector := builder.EndVector(len(r.projOffsets))

		winningFactionOffset := builder.CreateString(r.winningFaction)
		envObjectsVector := game.EncodeEnvObjectsVector(builder, r.GetEnvWorld())

		SpaceTactics.ServerStateStart(builder)
		SpaceTactics.ServerStateAddTick(builder, r.GetTick())
		SpaceTactics.ServerStateAddUnits(builder, unitsVector)
		SpaceTactics.ServerStateAddProjectiles(builder, projVector)
		SpaceTactics.ServerStateAddMapWidth(builder, float32(arenaW))
		SpaceTactics.ServerStateAddMapHeight(builder, float32(arenaH))
		SpaceTactics.ServerStateAddIsGameOver(builder, r.isGameOver)
		SpaceTactics.ServerStateAddWinningFaction(builder, winningFactionOffset)
		SpaceTactics.ServerStateAddEnvObjects(builder, envObjectsVector)
		serverState := SpaceTactics.ServerStateEnd(builder)

		builder.Finish(serverState)
		finished := builder.FinishedBytes()
		payload := make([]byte, len(finished))
		copy(payload, finished)

		clients := make([]*game.WSClient, 0, len(r.clients))
		for c := range r.clients {
			clients = append(clients, c)
		}
		r.mu.Unlock()

		for _, c := range clients {
			c.Enqueue(payload)
		}
	}
}
