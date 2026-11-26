package game

import (
	"fmt"
	"log"
	"math"
	"math/rand"
	"net/http"
	"strings"
	"sync"
	"time"

	"space-tactics-server/internal/db"
	SpaceTactics "space-tactics-server/internal/generated/SpaceTactics"
	"space-tactics-server/internal/models"

	flatbuffers "github.com/google/flatbuffers/go"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{CheckOrigin: func(r *http.Request) bool { return true }}

// Decoded client input state maintained across ticks
type ClientStateInput struct {
	W                bool
	S                bool
	A                bool
	D                bool
	Angle            float32
	IsFiring         bool
	ControlledUnitID string
	Reset            bool
	Deploy           string
	SandboxSpawn     string
	SandboxRemove    string
	SpawnX           float64
	SpawnY           float64
	SandboxCounts    map[string]int
	TemplateOverride *TemplateOverrideData
	UnitGrouping     *UnitGroupingData
}

type TemplateOverrideData struct {
	Type               string
	Speed              *float64
	DPS                *float64
	MaxCooldown        *int
	VisionRange        *int
	MaxThermalCapacity *float64
}

type UnitGroupingData struct {
	UnitID        string
	BattalionID   int
	SquadID       int
	IsSquadLeader bool
}

type SandboxClientInput = ClientStateInput

type GameRoom struct {
	resetTimer      int
	deployQueue     []string
	isSandbox       bool
	isPaused        bool
	timeScale       float64
	tickAccumulator float64
	mapID           int
	structures      []models.MapStructure

	clients     map[*websocket.Conn]bool
	mu          sync.Mutex
	units       map[string]*models.FleetUnit
	projectiles []models.Projectile
	lastInput   ClientStateInput
	tick        uint64
	idCounter   uint64
}

func NewGameRoom(mapID int, isSandbox bool) *GameRoom {
	room := &GameRoom{
		clients:     make(map[*websocket.Conn]bool),
		units:       make(map[string]*models.FleetUnit),
		deployQueue: make([]string, 0),
		isSandbox:   isSandbox,
		timeScale:   1.0,
		mapID:       mapID,
	}
	room.loadMapStructures()
	room.resetWorld()
	return room
}

// Exported getters & setters so sub-packages (like teamDeathMatch) can read/write room state safely
func (r *GameRoom) GetUnits() map[string]*models.FleetUnit {
	return r.units
}

func (r *GameRoom) SetUnits(units map[string]*models.FleetUnit) {
	r.units = units
}

func (r *GameRoom) GetStructures() []models.MapStructure {
	return r.structures
}

func (r *GameRoom) GetMapID() int {
	return r.mapID
}

func (r *GameRoom) SetMapID(id int) {
	r.mapID = id
}

func (r *GameRoom) ReloadMapStructures() {
	r.loadMapStructures()
}

func (r *GameRoom) GetTick() uint64 {
	return r.tick
}

func (r *GameRoom) SetTick(tick uint64) {
	r.tick = tick
}

func (r *GameRoom) GetProjectiles() []models.Projectile {
	return r.projectiles
}

func (r *GameRoom) SetProjectiles(projectiles []models.Projectile) {
	r.projectiles = projectiles
}

func (r *GameRoom) NextUnitID() uint64 {
	r.idCounter++
	return r.idCounter
}

func (r *GameRoom) loadMapStructures() {
	r.structures = []models.MapStructure{}
	if r.mapID == 0 {
		r.mapID = 1
	}

	rows, err := db.Conn.Query(
		`SELECT ms.structure_id, ms.map_id, es.structure_key, ms.pos_x, ms.pos_y, ms.radius, ms.custom_props 
		 FROM map_structures ms 
		 JOIN environmental_structures es ON ms.environmental_structure_id = es.id 
		 WHERE ms.map_id = $1`,
		r.mapID,
	)
	if err != nil {
		log.Printf("⚠️ Warning: Failed to load structures for map %d: %v", r.mapID, err)
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
	log.Printf("🗺️ Loaded %d environmental structures for map ID %d", len(r.structures), r.mapID)
}

func (r *GameRoom) resetWorld() {
	r.units = make(map[string]*models.FleetUnit)
	r.projectiles = []models.Projectile{}
	r.deployQueue = make([]string, 0)
	r.tickAccumulator = 0

	if !r.isSandbox {
		r.spawnUnit("flagship", "player", 6000, 10000, "MANUAL")
		r.spawnUnit("battalion_command_ship", "player", 6000, 9500, "COMMAND")
		r.spawnUnit("flagship", "enemy", 6000, 2000, "SEEK")
		r.spawnUnit("battalion_command_ship", "enemy", 6000, 2500, "COMMAND")
	}
}

func (r *GameRoom) findSquadLeader(ownerID string, args ...int) *models.FleetUnit {
	var battalionID, squadID int
	if len(args) == 1 {
		squadID = args[0]
	} else if len(args) >= 2 {
		battalionID = args[0]
		squadID = args[1]
	}
	for _, unit := range r.units {
		if unit.OwnerID == ownerID && unit.SquadID == squadID && unit.IsSquadLeader && !unit.IsDestroyed {
			if unit.BattalionID == battalionID {
				return unit
			}
		}
	}
	return nil
}

func (r *GameRoom) findBestTarget(unit *models.FleetUnit) *models.FleetUnit {
	var bestTarget *models.FleetUnit
	bestScore := -999999.0

	// Use database-backed EngagementRangeCap, falling back to MaxRange or standard default
	maxRange := unit.EngagementRangeCap
	if maxRange <= 0 {
		maxRange = unit.MaxRange
	}
	if maxRange <= 0 {
		maxRange = 1500.0
	}

	for _, target := range r.units {
		if target.IsDestroyed || target.OwnerID == unit.OwnerID || target.Type == "asteroid" {
			continue
		}

		// Enforce radar fog-of-war state: must be at least Pinged (1) or Clear (2) to target
		visibilityState := r.GetUnitVisibilityState(unit.OwnerID, target)
		if visibilityState == VisibilityShrouded {
			continue
		}

		dx := target.Pos.X - unit.Pos.X
		dy := target.Pos.Y - unit.Pos.Y
		dist := math.Hypot(dx, dy)

		if dist > maxRange {
			continue
		}

		score := 2000.0 - dist

		if score > bestScore {
			bestScore = score
			bestTarget = target
		}
	}
	return bestTarget
}

func (r *GameRoom) spawnUnit(unitType string, owner string, x float64, y float64, overrideAI string) {
	assignedBattalionID := 0
	if unitType == "battalion_command_ship" {
		commandCount := 0
		existingBattalions := map[int]bool{}
		for _, u := range r.units {
			if u.OwnerID == owner && u.Type == "battalion_command_ship" && !u.IsDestroyed {
				commandCount++
				existingBattalions[u.BattalionID] = true
			}
		}
		if commandCount >= 2 {
			log.Printf("⚠️ Spawn rejected: Owner '%s' already has the maximum cap of 2 Battalion Command Ships.", owner)
			return
		}
		// Automatically assign to Battalion 1 first, then Battalion 2
		if !existingBattalions[1] {
			assignedBattalionID = 1
		} else {
			assignedBattalionID = 2
		}
	}

	template, exists := db.Templates[unitType]
	if !exists {
		log.Printf("⚠️ Warning: Blueprint '%s' not found in DB", unitType)
		return
	}

	r.idCounter++
	id := fmt.Sprintf("%s-%d", unitType, r.idCounter)

	if unitType == "flagship" {
		if owner == "player" {
			id = "player-flagship"
		} else {
			id = "enemy-flagship"
		}
	}

	aiState := template.AIState
	if overrideAI != "" {
		aiState = overrideAI
	}

	unit := &models.FleetUnit{
		ID:                           id,
		Type:                         unitType,
		OwnerID:                      owner,
		Pos:                          models.Vector2D{X: x, Y: y},
		Shields:                      template.Shields,
		Hull:                         template.Hull,
		AIState:                      aiState,
		Speed:                        template.Speed,
		StrafingSpeed:                template.StrafingSpeed,
		TurnRate:                     template.TurnRate,
		AngularVelocity:              template.AngularVelocity,
		AccelerationCurve:            template.AccelerationCurve,
		MaxCooldown:                  template.MaxCooldown,
		ProjectileRange:              template.ProjectileRange,
		ProjectileSpeed:              template.ProjectileSpeed,
		OptimalRange:                 template.OptimalRange,
		MaxRange:                     template.MaxRange,
		EngagementRangeCap:           template.EngagementRangeCap,
		LateralThrustPower:           template.LateralThrustPower,
		ReverseThrustPower:           template.ReverseThrustPower,
		DriftCoefficient:             template.DriftCoefficient,
		WeightClass:                  template.WeightClass,
		VisionRange:                  template.VisionRange,
		SensorRange:                  template.SensorRange,
		DPS:                          template.DPS,
		ShieldBase:                   template.ShieldBase,
		HullBase:                     template.HullBase,
		ShieldRegenRate:              template.ShieldRegenRate,
		ShieldRechargeDelayTicks:     template.ShieldRechargeDelayTicks,
		ArmorMitigation:              template.ArmorMitigation,
		AggroRange:                   template.AggroRange,
		RetreatMoraleThreshold:       template.RetreatMoraleThreshold,
		SquadCohesionLeashRange:      template.SquadCohesionLeashRange,
		ResourceHarvestingType:       template.ResourceHarvestingType,
		WarpCanisterCapacity:         template.WarpCanisterCapacity,
		PortDockingBayStatus:         template.PortDockingBayStatus,
		StarboardDeploymentBayStatus: template.StarboardDeploymentBayStatus,
		SalvageableUponDestruction:   template.SalvageableUponDestruction,
		RequiresReconTelemetry:       template.RequiresReconTelemetry,
		MaxThermalCapacity:           template.MaxThermalCapacity,
		CurrentThermal:               0.0,
		MaxAmmoCapacity:              template.MaxAmmoCapacity,
		CurrentAmmo:                  template.CurrentAmmo,
		RadarImmunityActive:          template.RadarImmunityActive,
		StealthTimer:                 template.StealthTimer,
		IsBattalionCommander:         (unitType == "battalion_command_ship"),
		BattalionID:                  assignedBattalionID,
		SquadID:                      0,
		ResourceCache:                100.0,
		MaxResourceCapacity:          500.0,
	}
	r.units[unit.ID] = unit
}

func (r *GameRoom) HandleWS(w http.ResponseWriter, req *http.Request) {
	conn, err := upgrader.Upgrade(w, req, nil)
	if err != nil {
		log.Printf("⚠️ WebSocket upgrade failed: %v", err)
		return
	}
	clientAddr := conn.RemoteAddr().String()
	log.Printf("🔌 Player connected to room (Sandbox: %v): %s", r.isSandbox, clientAddr)

	r.mu.Lock()
	r.clients[conn] = true
	r.mu.Unlock()

	defer func() {
		log.Printf("❌ Player disconnected: %s. Resetting state.", clientAddr)
		r.mu.Lock()
		delete(r.clients, conn)
		r.isPaused = false
		r.timeScale = 1.0
		r.resetWorld()
		r.mu.Unlock()
		conn.Close()
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
		r.lastInput.Reset = clientInput.Reset()

		if uid := clientInput.ControlledUnitId(); len(uid) > 0 {
			r.lastInput.ControlledUnitID = string(uid)
		}
		if dep := clientInput.Deploy(); len(dep) > 0 {
			r.deployQueue = append(r.deployQueue, string(dep))
		}

		// Sandbox Time Controls (Pause & Simulation Speed)
		var timeCtrl SpaceTactics.SandboxTimeControl
		if r.isSandbox && clientInput.TimeControl(&timeCtrl) != nil {
			r.isPaused = timeCtrl.IsPaused()
			if ts := float64(timeCtrl.TimeScale()); ts > 0 {
				r.timeScale = math.Max(0.1, math.Min(ts, 4.0))
			}
			log.Printf("⏱️ Sandbox time control -> Paused: %v, Scale: %.2fx", r.isPaused, r.timeScale)
		}

		// Faction-aware exact spatial spawning for Click-to-Spawn
		if spawn := clientInput.SandboxSpawn(); len(spawn) > 0 {
			spawnStr := string(spawn)
			ownerID := "player"
			if ownerBytes := clientInput.SandboxSpawnOwner(); len(ownerBytes) > 0 {
				ownerID = string(ownerBytes)
			}
			sx := clientInput.SpawnX()
			sy := clientInput.SpawnY()
			defaultAI := "GUARD"
			if ownerID == "enemy" {
				defaultAI = "SEEK"
			}
			r.spawnUnit(spawnStr, ownerID, sx, sy, defaultAI)
		}

		if rem := clientInput.SandboxRemove(); len(rem) > 0 {
			remStr := string(rem)
			ownerID := "player"
			if ownerBytes := clientInput.SandboxSpawnOwner(); len(ownerBytes) > 0 {
				ownerID = string(ownerBytes)
			}
			for id, u := range r.units {
				if u.OwnerID == ownerID && u.Type == remStr {
					delete(r.units, id)
					break
				}
			}
		}

		// Parse sandbox counts vector with faction/owner attribution
		countsLength := clientInput.SandboxCountsLength()
		if countsLength > 0 {
			if r.lastInput.SandboxCounts == nil {
				r.lastInput.SandboxCounts = make(map[string]int)
			}
			var pairPtr SpaceTactics.SandboxCountPair
			for i := 0; i < countsLength; i++ {
				if clientInput.SandboxCounts(&pairPtr, i) {
					unitType := string(pairPtr.UnitType())
					targetCount := int(pairPtr.Count())
					ownerID := string(pairPtr.OwnerId())
					if ownerID == "" {
						ownerID = "player"
					}

					mapCompoundKey := ownerID + "_" + unitType
					r.lastInput.SandboxCounts[mapCompoundKey] = targetCount

					currentCount := 0
					for _, u := range r.units {
						if u.OwnerID == ownerID && u.Type == unitType && !u.IsDestroyed {
							currentCount++
						}
					}
					if targetCount > currentCount {
						diff := targetCount - currentCount
						defaultAI := "GUARD"
						if ownerID == "enemy" {
							defaultAI = "SEEK"
						}
						for j := 0; j < diff; j++ {
							spawnX, spawnY := r.CalculateSpawnPosition(ownerID, j, targetCount)
							r.spawnUnit(unitType, ownerID, spawnX, spawnY, defaultAI)
						}
					} else if targetCount < currentCount {
						diff := currentCount - targetCount
						removed := 0
						for id, u := range r.units {
							if removed < diff && u.OwnerID == ownerID && u.Type == unitType && !u.IsDestroyed {
								delete(r.units, id)
								removed++
							}
						}
					}
				}
			}
		}

		// Parse live template overrides (supports zeroing stats cleanly)
		if tTypeBytes := clientInput.TemplateOverrideType(); len(tTypeBytes) > 0 {
			unitType := string(tTypeBytes)
			var cfg SpaceTactics.UnitConfigUpdate
			if clientInput.TemplateOverrideConfig(&cfg) != nil {
				clampedSpeed := math.Max(0, math.Min(float64(cfg.Speed()), 50.0))
				clampedStrafe := math.Max(0, math.Min(float64(cfg.StrafingSpeed()), 50.0))
				clampedTurn := math.Max(0, math.Min(float64(cfg.TurnRate()), 60.0))
				clampedAngVel := math.Max(0, math.Min(float64(cfg.AngularVelocity()), 60.0))
				clampedAccel := math.Max(0, math.Min(float64(cfg.AccelerationCurve()), 10.0))

				if tmpl, exists := db.Templates[unitType]; exists {
					// 1. Core & General
					if wc := int(cfg.WeightClass()); wc > 0 {
						tmpl.WeightClass = wc
					}
					tmpl.VisionRange = int(cfg.VisionRange())
					tmpl.SensorRange = float64(cfg.SensorRange())
					tmpl.AggroRange = float64(cfg.AggroRange())
					tmpl.RetreatMoraleThreshold = float64(cfg.RetreatMoraleThreshold())
					tmpl.SquadCohesionLeashRange = float64(cfg.SquadCohesionLeashRange())

					// 2. Movement & Physics Dynamics
					tmpl.Speed = clampedSpeed
					tmpl.StrafingSpeed = clampedStrafe
					tmpl.TurnRate = clampedTurn
					tmpl.AngularVelocity = clampedAngVel
					tmpl.AccelerationCurve = clampedAccel
					tmpl.LateralThrustPower = float64(cfg.LateralThrustPower())
					tmpl.ReverseThrustPower = float64(cfg.ReverseThrustPower())
					tmpl.DriftCoefficient = float64(cfg.DriftCoefficient())

					// 3. Combat Output & Ballistics
					tmpl.DPS = float64(cfg.Dps())
					if mc := int(cfg.MaxCooldown()); mc > 0 {
						tmpl.MaxCooldown = mc
					}
					tmpl.ProjectileRange = float64(cfg.ProjectileRange())
					tmpl.ProjectileSpeed = float64(cfg.ProjectileSpeed())
					tmpl.OptimalRange = float64(cfg.OptimalRange())
					tmpl.MaxRange = float64(cfg.MaxRange())
					tmpl.EngagementRangeCap = float64(cfg.EngagementRangeCap())
					tmpl.MaxAmmoCapacity = int(cfg.AmmoCapacity())
					tmpl.MaxThermalCapacity = float64(cfg.MaxThermalCapacity())

					// 4. Vitals, Health & Shield Systems
					newShieldBase := float64(cfg.ShieldBase())
					tmpl.ShieldBase = newShieldBase
					tmpl.Shields = models.QuadrantStats{
						Front: newShieldBase, Rear: newShieldBase, Port: newShieldBase, Starboard: newShieldBase,
					}
					newHullBase := float64(cfg.HullBase())
					tmpl.HullBase = newHullBase
					tmpl.Hull = models.QuadrantStats{
						Front: newHullBase, Rear: newHullBase, Port: newHullBase, Starboard: newHullBase,
					}
					tmpl.ShieldRegenRate = float64(cfg.ShieldRegenRate())
					tmpl.ShieldRechargeDelayTicks = int(cfg.ShieldRechargeDelayTicks())
					tmpl.ArmorMitigation = float64(cfg.ArmorMitigation())

					// 5. Stealth, Logistics & Special Systems
					tmpl.RadarImmunityActive = cfg.RadarImmunityActive()
					tmpl.ResourceHarvestingType = int(cfg.ResourceHarvestingType())
					tmpl.WarpCanisterCapacity = int(cfg.WarpCanisterCapacity())
					tmpl.PortDockingBayStatus = cfg.PortDockingBayStatus()
					tmpl.StarboardDeploymentBayStatus = cfg.StarboardDeploymentBayStatus()
					tmpl.SalvageableUponDestruction = cfg.SalvageableUponDestruction()
					tmpl.RequiresReconTelemetry = cfg.RequiresReconTelemetry()

					db.Templates[unitType] = tmpl
				}

				// Hot-update all live unit instances of this type in the room
				for _, u := range r.units {
					if u.Type != unitType {
						continue
					}

					if wc := int(cfg.WeightClass()); wc > 0 {
						u.WeightClass = wc
					}
					u.VisionRange = int(cfg.VisionRange())
					u.SensorRange = float64(cfg.SensorRange())
					u.AggroRange = float64(cfg.AggroRange())
					u.RetreatMoraleThreshold = float64(cfg.RetreatMoraleThreshold())
					u.SquadCohesionLeashRange = float64(cfg.SquadCohesionLeashRange())

					u.Speed = clampedSpeed
					u.StrafingSpeed = clampedStrafe
					u.TurnRate = clampedTurn
					u.AngularVelocity = clampedAngVel
					u.AccelerationCurve = clampedAccel
					u.LateralThrustPower = float64(cfg.LateralThrustPower())
					u.ReverseThrustPower = float64(cfg.ReverseThrustPower())
					u.DriftCoefficient = float64(cfg.DriftCoefficient())

					u.DPS = float64(cfg.Dps())
					if mc := int(cfg.MaxCooldown()); mc > 0 {
						u.MaxCooldown = mc
					}
					u.ProjectileRange = float64(cfg.ProjectileRange())
					u.ProjectileSpeed = float64(cfg.ProjectileSpeed())
					u.OptimalRange = float64(cfg.OptimalRange())
					u.MaxRange = float64(cfg.MaxRange())
					u.EngagementRangeCap = float64(cfg.EngagementRangeCap())
					u.MaxAmmoCapacity = int(cfg.AmmoCapacity())
					u.MaxThermalCapacity = float64(cfg.MaxThermalCapacity())

					// Only refill shield/hull pools when their base values actually change
					if newShieldBase := float64(cfg.ShieldBase()); newShieldBase != u.ShieldBase {
						u.ShieldBase = newShieldBase
						u.Shields.Front = newShieldBase
						u.Shields.Rear = newShieldBase
						u.Shields.Port = newShieldBase
						u.Shields.Starboard = newShieldBase
					}
					if newHullBase := float64(cfg.HullBase()); newHullBase != u.HullBase {
						u.HullBase = newHullBase
						u.Hull.Front = newHullBase
						u.Hull.Rear = newHullBase
						u.Hull.Port = newHullBase
						u.Hull.Starboard = newHullBase
					}
					u.ShieldRegenRate = float64(cfg.ShieldRegenRate())
					u.ShieldRechargeDelayTicks = int(cfg.ShieldRechargeDelayTicks())
					u.ArmorMitigation = float64(cfg.ArmorMitigation())

					u.RadarImmunityActive = cfg.RadarImmunityActive()
					u.ResourceHarvestingType = int(cfg.ResourceHarvestingType())
					u.WarpCanisterCapacity = int(cfg.WarpCanisterCapacity())
					u.PortDockingBayStatus = cfg.PortDockingBayStatus()
					u.StarboardDeploymentBayStatus = cfg.StarboardDeploymentBayStatus()
					u.SalvageableUponDestruction = cfg.SalvageableUponDestruction()
					u.RequiresReconTelemetry = cfg.RequiresReconTelemetry()
				}
				log.Printf("⚙️ Applied binary WebSocket template override for: %s", unitType)
			}
		}

		// Parse unit grouping updates
		var groupingTable SpaceTactics.UnitGroupingPayload
		if clientInput.UnitGrouping(&groupingTable) != nil {
			uID := string(groupingTable.UnitId())
			if u, exists := r.units[uID]; exists {
				u.BattalionID = int(groupingTable.BattalionId())
				u.SquadID = int(groupingTable.SquadId())
				u.IsSquadLeader = groupingTable.IsSquadLeader()
				log.Printf("🛡️ Updated unit %s grouping via binary -> Battalion: %d, Squad: %d, Leader: %v", u.ID, u.BattalionID, u.SquadID, u.IsSquadLeader)
			}
		}

		r.mu.Unlock()
	}
}

func (r *GameRoom) IsTargetVisibleToFaction(factionOwner string, target *models.FleetUnit) bool {
	for _, unit := range r.units {
		if unit.OwnerID == factionOwner && !unit.IsDestroyed {
			visibilityState := r.GetUnitVisibilityState(factionOwner, target)
			if visibilityState > VisibilityShrouded {
				return true
			}
		}
	}
	return false
}

func (r *GameRoom) runAI() {
	if r.isSandbox {
		return
	}

	var ai *models.FleetUnit
	var player *models.FleetUnit

	for _, u := range r.units {
		if (u.Type == "flagship" || u.Type == "battalion_command_ship") && u.OwnerID == "enemy" {
			ai = u
		}
		if (u.Type == "flagship" || u.Type == "battalion_command_ship") && u.OwnerID == "player" {
			player = u
		}
	}

	if ai == nil || player == nil || ai.IsDestroyed || player.IsDestroyed {
		return
	}

	// Enforce radar telemetry: Enemy faction must have visual/radar contact to track and engage
	if !r.IsTargetVisibleToFaction("enemy", player) {
		ai.IsFiring = false
		ai.Vel.X *= 0.95
		ai.Vel.Y *= 0.95
		return
	}

	dx := player.Pos.X - ai.Pos.X
	dy := player.Pos.Y - ai.Pos.Y
	dist := math.Hypot(dx, dy)

	ai.Angle = math.Atan2(dy, dx)
	ai.IsFiring = dist < 1200

	if dist > 800 {
		ai.Vel.X += math.Cos(ai.Angle) * 0.4
		ai.Vel.Y += math.Sin(ai.Angle) * 0.4
	}

	if dist < 8000 && rand.Float64() < 0.025 {
		reserves := []string{"viper_interceptor", "viper_interceptor", "lancer_corvette", "torpedo_bomber", "aegis_wall", "command_escort"}
		choice := reserves[rand.Intn(len(reserves))]
		spawnX := ai.Pos.X + (rand.Float64()-0.5)*300
		spawnY := ai.Pos.Y + (rand.Float64()-0.5)*300
		r.spawnUnit(choice, "enemy", spawnX, spawnY, "SEEK")
	}
}

func (r *GameRoom) CalculateSpawnPosition(ownerID string, index int, total int) (float64, float64) {
	var baseX, baseY float64
	if ownerID == "player" {
		baseX = 2000.0
		baseY = 10000.0
		if flagship, ok := r.units["player-flagship"]; ok && !flagship.IsDestroyed {
			baseX = flagship.Pos.X
			baseY = flagship.Pos.Y - 250.0
		}
	} else {
		baseX = 10000.0
		baseY = 2000.0
		if flagship, ok := r.units["enemy-flagship"]; ok && !flagship.IsDestroyed {
			baseX = flagship.Pos.X
			baseY = flagship.Pos.Y + 250.0
		}
	}
	cols := 5
	col := index % cols
	row := index / cols
	return baseX + float64(col)*50.0 + (rand.Float64()-0.5)*20, baseY + float64(row)*50.0 + (rand.Float64()-0.5)*20
}

func (r *GameRoom) Run() {
	ticker := time.NewTicker(16 * time.Millisecond)
	defer ticker.Stop()
	var deployDebounce int

	for range ticker.C {
		r.mu.Lock()

		if r.lastInput.Reset {
			r.resetWorld()
			r.lastInput.Reset = false
			r.mu.Unlock()
			continue
		}

		// Determine simulation steps for this 16ms frame (supports sandbox pause & 0.25x-2.0x scaling)
		steps := 1
		if r.isSandbox {
			if r.isPaused {
				steps = 0
			} else {
				r.tickAccumulator += r.timeScale
				steps = int(r.tickAccumulator)
				r.tickAccumulator -= float64(steps)
			}
		}

		for step := 0; step < steps; step++ {
			r.tick++

			r.runAI()
			ProcessLogisticsLoops(r)

			if deployDebounce > 0 {
				deployDebounce--
			}

			var flagship *models.FleetUnit = r.units["player-flagship"]
			if flagship == nil || flagship.IsDestroyed {
				for _, u := range r.units {
					if u.OwnerID == "player" && (u.Type == "flagship" || u.Type == "battalion_command_ship") && !u.IsDestroyed {
						flagship = u
						break
					}
				}
			}

			if flagship != nil && !flagship.IsDestroyed && deployDebounce == 0 && len(r.deployQueue) > 0 {
				toDeploy := r.deployQueue[0]
				r.deployQueue = r.deployQueue[1:]

				if !strings.HasPrefix(toDeploy, "SANDBOX:") {
					r.spawnUnit(toDeploy, "player", flagship.Pos.X, flagship.Pos.Y-100, "GUARD")
					deployDebounce = 8
				}
			}

			controlledID := r.lastInput.ControlledUnitID
			if controlledID == "" {
				controlledID = "player-flagship"
			}

			for id, unit := range r.units {
				if unit.IsDestroyed {
					if (unit.Type == "flagship" || unit.Type == "battalion_command_ship") && !r.isSandbox {
						// Capital ship down tracking
					} else {
						delete(r.units, id)
					}
					continue
				}

				// Shield-Break Retreat Trigger for Squad Leaders
				if unit.IsSquadLeader && unit.AIState != "RETREAT" {
					totalShields := unit.Shields.Front + unit.Shields.Rear + unit.Shields.Port + unit.Shields.Starboard
					if totalShields <= 0.0 {
						unit.AIState = "RETREAT"
						for _, member := range r.units {
							if member.SquadID == unit.SquadID && member.OwnerID == unit.OwnerID && !member.IsDestroyed {
								member.AIState = "RETREAT"
							}
						}
					}
				}

				// Player Movement or Autonomous AI State Machine (with room dimensions passed)
				if unit.ID == controlledID {
					HandlePlayerMovement(unit, r.lastInput, 12000.0, 12000.0)
					unit.IsFiring = r.lastInput.IsFiring
				} else if unit.OwnerID == "player" && unit.Type == "flagship" {
					// Player flagship should NEVER move or run AI when unpiloted; it holds position and coasts spin to zero.
					unit.IsFiring = false
					unit.Vel.X *= 0.95
					unit.Vel.Y *= 0.95
					unit.CurrentAngularVel *= 0.88
					if math.Abs(unit.CurrentAngularVel) < 0.01 {
						unit.CurrentAngularVel = 0
					}
				} else {
					// All other units (enemy units, spawned support drones, etc.) run their AI behavior
					RunUnitAI(unit, r, flagship)
				}

				// Physics, Damping, Environment Collisions & World Gravity (with room dimensions passed)
				ApplyUnitPhysics(unit, 12000.0, 12000.0)
				ApplyEnvironmentalCollisions(unit, r.structures)
				ApplyMajorWorldGravity(unit, r.structures)

				// Weapon Firing & Cooldowns
				HandleWeaponFiring(unit, r)
			}

			// Unit-to-Unit Collisions and Projectile Updates
			ResolveUnitCollisions(r.units, r.isSandbox)
			UpdateProjectiles(r)
		}

		// Downstream: Build and broadcast binary FlatBuffers frame (runs even while paused so UI edits stay live)
		builder := flatbuffers.NewBuilder(1024)

		unitOffsets := make([]flatbuffers.UOffsetT, 0, len(r.units))
		for _, u := range r.units {
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

			vel := SpaceTactics.CreateVector2D(builder, float32(u.Vel.X), float32(u.Vel.Y))
			SpaceTactics.FleetUnitAddVel(builder, vel)

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
			SpaceTactics.FleetUnitAddAiState(builder, aiStateOffset)
			SpaceTactics.FleetUnitAddCurrentThermal(builder, float32(u.CurrentThermal))
			SpaceTactics.FleetUnitAddCurrentAmmo(builder, int32(u.CurrentAmmo))
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
