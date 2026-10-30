package teamDeathMatch

import (
	"fmt"
	"log"
	"math"
	"math/rand"
	"net/http"
	"sync"
	"time"

	"space-tactics-server/internal/db"
	SpaceTactics "space-tactics-server/internal/generated/SpaceTactics"
	"space-tactics-server/internal/models"

	flatbuffers "github.com/google/flatbuffers/go"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{CheckOrigin: func(r *http.Request) bool { return true }}

type TDMRoom struct {
	mu                   sync.Mutex
	clients              map[*websocket.Conn]bool
	units                map[string]*models.FleetUnit
	projectiles          []models.Projectile
	mapID                int
	structures           []models.MapStructure
	tick                 uint64
	idCounter            uint64
	pilotedUnitType      string
	pilotedUnitID        string
	isGameOver           bool
	winningFaction       string
	lastInput            ClientStateInput
}

// ClientStateInput mirrors the input structure from room.go for unified control interop
type ClientStateInput struct {
	W        bool
	S        bool
	A        bool
	D        bool
	Angle    float32
	IsFiring bool
	Reset    bool
}

func NewTDMRoom(mapID int, pilotedUnitType string) *TDMRoom {
	room := &TDMRoom{
		clients:         make(map[*websocket.Conn]bool),
		units:           make(map[string]*models.FleetUnit),
		projectiles:     []models.Projectile{},
		mapID:           mapID,
		pilotedUnitType: pilotedUnitType,
	}
	room.loadMapStructures()
	room.ResetMatch()
	return room
}

func (r *TDMRoom) loadMapStructures() {
	r.structures = []models.MapStructure{}
	if r.mapID == 0 { r.mapID = 1 }

	rows, err := db.Conn.Query(
		`SELECT ms.structure_id, ms.map_id, es.structure_key, ms.pos_x, ms.pos_y, ms.radius, ms.custom_props 
		 FROM map_structures ms 
		 JOIN environmental_structures es ON ms.environmental_structure_id = es.id 
		 WHERE ms.map_id = $1`, 
		r.mapID,
	)
	if err != nil {
		log.Printf("⚠️ TDM Warning: Failed to load structures for map %d: %v", r.mapID, err)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var s models.MapStructure
		var props []byte
		if err := rows.Scan(&s.ID, &s.MapID, &s.StructureType, &s.PosX, &s.PosY, &s.Radius, &props); err == nil {
			s.CustomProps = props
			r.structures = append(r.structures, s)
		}
	}
	log.Printf("🗺️ TDM Loaded %d environmental structures for map ID %d", len(r.structures), r.mapID)
}

func (r *TDMRoom) ResetMatch() {
	r.units = make(map[string]*models.FleetUnit)
	r.projectiles = []models.Projectile{}
	r.tick = 0
	r.isGameOver = false
	r.winningFaction = ""

	// Initialize 20v20 Teams via tdm_spawner (to be implemented next)
	r.pilotedUnitID = InitializeTDMRoster(r, r.pilotedUnitType)
	log.Printf("⚔️ TDM Match Initialized: 20v20 Skirmish spawned. Piloted unit locked to ID: %s", r.pilotedUnitID)
}

func (r *TDMRoom) HandleWS(w http.ResponseWriter, req *http.Request) {
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
		r.tick++

		if r.isGameOver {
			r.mu.Unlock()
			continue
		}

		// 1. Check Win Conditions (via tdm_rules.go)
		if winner := CheckWinConditions(r); winner != "" {
			r.isGameOver = true
			r.winningFaction = winner
			log.Printf("🏆 TDM Match Over! Winning Faction: %s", winner)
		}

		// 2. Run Game Physics & AI Simulation Loops
		for id, unit := range r.units {
			if unit.IsDestroyed {
				delete(r.units, id)
				continue
			}

			// Player control handling for the designated piloted unit
			if unit.ID == r.pilotedUnitID {
				HandlePlayerMovement(unit, struct {
					W, S, A, D bool
					Angle      float32
					IsFiring   bool
				}{
					W: r.lastInput.W, S: r.lastInput.S, A: r.lastInput.A, D: r.lastInput.D,
					Angle: r.lastInput.Angle, IsFiring: r.lastInput.IsFiring,
				}, 12000.0, 12000.0)
				unit.IsFiring = r.lastInput.IsFiring
				unit.Angle = float64(r.lastInput.Angle)
			} else {
				// Autonomous squad AI execution
				RunUnitAI(unit, r, nil)
			}

			ApplyUnitPhysics(unit, 12000.0, 12000.0)
			ApplyEnvironmentalCollisions(unit, r.structures)
			ApplyMajorWorldGravity(unit, r.structures)
			HandleWeaponFiring(unit, r)
		}

		ResolveUnitCollisions(r.units, false)
		UpdateProjectiles(r)

		// 3. Build & Broadcast Binary FlatBuffers State
		builder := flatbuffers.NewBuilder(1024)
		unitOffsets := make([]flatbuffers.UOffsetT, 0, len(r.units))

		for _, u := range r.units {
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

		projOffsets := make([]flatbuffers.UOffsetT, 0, len(r.projectiles))
		for _, p := range r.projectiles {
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

		SpaceTactics.ServerStateStart(builder)
		SpaceTactics.ServerStateAddTick(builder, r.tick)
		SpaceTactics.ServerStateAddUnits(builder, unitsVector)
		SpaceTactics.ServerStateAddProjectiles(builder, projVector)
		SpaceTactics.ServerStateAddMapWidth(builder, 12000.0)
		SpaceTactics.ServerStateAddMapHeight(builder, 12000.0)
		serverState := SpaceTactics.ServerStateEnd(builder)

		builder.Finish(serverState)
		binaryData := builder.FinishedBytes()

		for conn := range r.clients {
			conn.WriteMessage(websocket.BinaryMessage, binaryData)
		}
		r.mu.Unlock()
	}
}
