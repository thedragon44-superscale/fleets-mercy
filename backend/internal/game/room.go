package game

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
	resetTimer  int
	deployQueue []string
	isSandbox   bool
	mapID       int
	structures  []models.MapStructure

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
		mapID:       mapID,
	}
	room.loadMapStructures()
	room.resetWorld()
	return room
}

func (r *GameRoom) loadMapStructures() {
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
	
	r.spawnUnit("flagship", "player", 6000, 10000, "MANUAL")
	
	if !r.isSandbox {
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
			if battalionID == 0 || unit.BattalionID == battalionID {
				return unit
			}
		}
	}
	return nil
}

func (r *GameRoom) findBestTarget(unit *models.FleetUnit) *models.FleetUnit {
	var bestTarget *models.FleetUnit
	bestScore := -999999.0

	for _, target := range r.units {
		if target.IsDestroyed || target.OwnerID == unit.OwnerID || target.Type == "asteroid" {
			continue
		}

		if !r.IsUnitVisible(unit.OwnerID, target) {
			continue
		}

		dx := target.Pos.X - unit.Pos.X
		dy := target.Pos.Y - unit.Pos.Y
		dist := math.Sqrt(dx*dx + dy*dy)

		if dist > 1500.0 { continue }

		score := 2000.0 - dist 

		if unit.Type == "torpedo_bomber" && (target.Type == "flagship" || target.Type == "battalion_command_ship" || target.Type == "target_dummy") {
			score += 5000.0 
		} else if target.Type == "flagship" || target.Type == "battalion_command_ship" || target.Type == "target_dummy" {
			score -= 1500.0 
		}

		if (unit.Type == "viper_interceptor" || unit.Type == "assault_gunship") && 
		   (target.Type == "torpedo_bomber" || target.Type == "recon_probe" || target.Type == "viper_interceptor") {
			score += 1000.0 
		}

		if (unit.Type == "lancer_corvette" || unit.Type == "ion_interceptor") && 
		   (target.Type == "aegis_wall" || target.Type == "cryo_flak" || target.Type == "lancer_corvette") {
			score += 1000.0 
		}

		if score > bestScore {
			bestScore = score
			bestTarget = target
		}
	}
	return bestTarget
}

func (r *GameRoom) spawnUnit(unitType string, owner string, x float64, y float64, overrideAI string) {
	if unitType == "battalion_command_ship" {
		commandCount := 0
		for _, u := range r.units {
			if u.OwnerID == owner && u.Type == "battalion_command_ship" && !u.IsDestroyed {
				commandCount++
			}
		}
		if commandCount >= 2 {
			log.Printf("⚠️ Spawn rejected: Owner '%s' already has the maximum cap of 2 Battalion Command Ships.", owner)
			return
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
		if owner == "player" { id = "player-flagship" } else { id = "enemy-flagship" }
	} else if unitType == "battalion_command_ship" {
		if owner == "player" { id = "player-battalion-command" } else { id = "enemy-battalion-command" }
	}

	aiState := template.AIState
	if overrideAI != "" { aiState = overrideAI }

	unit := &models.FleetUnit{
		ID: id, Type: unitType, OwnerID: owner, Pos: models.Vector2D{X: x, Y: y},
		Shields: template.Shields, Hull: template.Hull, AIState: aiState,
		Speed: template.Speed, MaxCooldown: template.MaxCooldown, WeightClass: template.WeightClass,
		VisionRange: template.VisionRange, DPS: template.DPS,
		MaxThermalCapacity: template.MaxThermalCapacity, CurrentThermal: 0.0,
		MaxAmmoCapacity: template.MaxAmmoCapacity, CurrentAmmo: template.CurrentAmmo,
		RadarImmunityActive: template.RadarImmunityActive, StealthTimer: template.StealthTimer,
		IsBattalionCommander: (unitType == "battalion_command_ship"),
		BattalionID:          0,
		SquadID:              0,
		ResourceCache:       100.0,
		MaxResourceCapacity: 500.0,
	}
	r.units[unit.ID] = unit
}

func (r *GameRoom) HandleWS(w http.ResponseWriter, req *http.Request) {
	conn, _ := upgrader.Upgrade(w, req, nil)
	clientAddr := conn.RemoteAddr().String()
	log.Printf("🔌 Player connected to room (Sandbox: %v): %s", r.isSandbox, clientAddr)

	r.mu.Lock()
	r.clients[conn] = true
	r.mu.Unlock()

	defer func() {
		log.Printf("❌ Player disconnected: %s. Resetting state.", clientAddr)
		r.mu.Lock()
		delete(r.clients, conn)
		r.resetWorld()
		r.mu.Unlock()
		conn.Close()
	}()

	for {
		messageType, msg, err := conn.ReadMessage()
		if err != nil { break }

		// We exclusively expect binary FlatBuffers frames upstream
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
		if spawn := clientInput.SandboxSpawn(); len(spawn) > 0 {
			spawnStr := string(spawn)
			r.deployQueue = append(r.deployQueue, "SANDBOX:"+spawnStr)
			sx := clientInput.SpawnX()
			sy := clientInput.SpawnY()
			offsetX := sx + (rand.Float64()-0.5)*120
			offsetY := sy + (rand.Float64()-0.5)*120
			r.spawnUnit(spawnStr, "player", offsetX, offsetY, "GUARD")
		}
		if rem := clientInput.SandboxRemove(); len(rem) > 0 {
			remStr := string(rem)
			for id, u := range r.units {
				if u.OwnerID == "player" && u.Type == remStr && u.Type != "flagship" {
					delete(r.units, id)
					break
				}
			}
		}

		// Parse sandbox counts vector
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
					r.lastInput.SandboxCounts[unitType] = targetCount

					if unitType != "flagship" {
						currentCount := 0
						for _, u := range r.units {
							if u.OwnerID == "player" && u.Type == unitType && !u.IsDestroyed {
								currentCount++
							}
						}
						if targetCount > currentCount {
							diff := targetCount - currentCount
							for j := 0; j < diff; j++ {
								spawnX, spawnY := 6000.0, 10000.0
								if flagship, ok := r.units["player-flagship"]; ok && !flagship.IsDestroyed {
									spawnX = flagship.Pos.X + (rand.Float64()-0.5)*200
									spawnY = flagship.Pos.Y + (rand.Float64()-0.5)*200
								}
								r.spawnUnit(unitType, "player", spawnX, spawnY, "GUARD")
							}
						} else if targetCount < currentCount {
							diff := currentCount - targetCount
							removed := 0
							for id, u := range r.units {
								if removed < diff && u.OwnerID == "player" && u.Type == unitType && u.Type != "flagship" && !u.IsDestroyed {
									delete(r.units, id)
									removed++
								}
							}
						}
					}
				}
			}
		}

		// Parse template overrides
		if tTypeBytes := clientInput.TemplateOverrideType(); len(tTypeBytes) > 0 {
			tType := string(tTypeBytes)
			var configTable SpaceTactics.UnitConfigUpdate
			if clientInput.TemplateOverrideConfig(&configTable) != nil {
				unitType := tType
				if tmpl, exists := db.Templates[unitType]; exists {
					if speed := configTable.Speed(); speed != 0 { tmpl.Speed = speed }
					if dps := configTable.Dps(); dps != 0 { tmpl.DPS = dps }
					if cool := configTable.MaxCooldown(); cool != 0 { tmpl.MaxCooldown = int(cool) }
					if vis := configTable.VisionRange(); vis != 0 { tmpl.VisionRange = int(vis) }
					if therm := configTable.MaxThermalCapacity(); therm != 0 { tmpl.MaxThermalCapacity = therm }
					db.Templates[unitType] = tmpl
				}
				for _, u := range r.units {
					if u.Type == unitType {
						if speed := configTable.Speed(); speed != 0 { u.Speed = speed }
						if dps := configTable.Dps(); dps != 0 { u.DPS = dps }
						if cool := configTable.MaxCooldown(); cool != 0 { u.MaxCooldown = int(cool) }
						if vis := configTable.VisionRange(); vis != 0 { u.VisionRange = int(vis) }
						if therm := configTable.MaxThermalCapacity(); therm != 0 { u.MaxThermalCapacity = therm }
					}
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

func (r *GameRoom) runAI() {
	if r.isSandbox { return }

	var ai *models.FleetUnit
	var player *models.FleetUnit

	for _, u := range r.units {
		if (u.Type == "flagship" || u.Type == "battalion_command_ship") && u.OwnerID == "enemy" { ai = u }
		if (u.Type == "flagship" || u.Type == "battalion_command_ship") && u.OwnerID == "player" { player = u }
	}

	if ai == nil || player == nil || ai.IsDestroyed || player.IsDestroyed { return }

	dx := player.Pos.X - ai.Pos.X
	dy := player.Pos.Y - ai.Pos.Y
	dist := math.Sqrt(dx*dx + dy*dy)

	ai.Angle = math.Atan2(dy, dx)
	ai.IsFiring = dist < 1200

	if dist > 800 {
		ai.Vel.X += math.Cos(ai.Angle) * 0.4
		ai.Vel.Y += math.Sin(ai.Angle) * 0.4
	}

	if dist < 8000 && rand.Float64() < 0.025 {
		reserves := []string{"viper_interceptor", "viper_interceptor", "lancer_corvette", "torpedo_bomber", "aegis_wall", "command_escort"}
		choice := reserves[rand.Intn(len(reserves))]
		spawnX := ai.Pos.X + (rand.Float64() - 0.5) * 300
		spawnY := ai.Pos.Y + (rand.Float64() - 0.5) * 300
		r.spawnUnit(choice, "enemy", spawnX, spawnY, "SEEK")
	}
}

func (r *GameRoom) Run() {
	ticker := time.NewTicker(16 * time.Millisecond)
	defer ticker.Stop()
	var deployDebounce int

	for range ticker.C {
		r.mu.Lock()
		r.tick++

		if r.lastInput.Reset {
			r.resetWorld()
			r.lastInput.Reset = false
			r.mu.Unlock()
			continue
		}

		r.runAI()

		if deployDebounce > 0 { deployDebounce-- }
		
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
			
			if len(toDeploy) > 8 && toDeploy[:8] != "SANDBOX:" {
				r.spawnUnit(toDeploy, "player", flagship.Pos.X, flagship.Pos.Y-100, "GUARD")
				deployDebounce = 8 
			}
		}

		deadCount := 0
		controlledID := r.lastInput.ControlledUnitID
		if controlledID == "" { controlledID = "player-flagship" }

		for id, unit := range r.units {
			if unit.IsDestroyed {
				if (unit.Type == "flagship" || unit.Type == "battalion_command_ship") && !r.isSandbox {
					deadCount++
				} else {
					delete(r.units, id)
				}
				continue
			}

			if unit.IsSquadLeader && !unit.IsDestroyed && unit.AIState != "RETREAT" {
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

			if unit.ID == controlledID && unit.OwnerID == "player" {
				unit.Angle = float64(r.lastInput.Angle)
				unit.IsFiring = r.lastInput.IsFiring
				accel := unit.Speed * 3.5
				maxSpeed := unit.Speed * 6.0

				if r.lastInput.W { 
					unit.Vel.X += math.Cos(unit.Angle) * accel 
					unit.Vel.Y += math.Sin(unit.Angle) * accel 
				}
				if r.lastInput.S { 
					unit.Vel.X -= math.Cos(unit.Angle) * (accel * 0.5) 
					unit.Vel.Y -= math.Sin(unit.Angle) * (accel * 0.5) 
				}
				if r.lastInput.A { 
					strafeAngle := unit.Angle - (math.Pi / 2) 
					unit.Vel.X += math.Cos(strafeAngle) * (accel * 0.75) 
					unit.Vel.Y += math.Sin(strafeAngle) * (accel * 0.75) 
				}
				if r.lastInput.D { 
					strafeAngle := unit.Angle + (math.Pi / 2) 
					unit.Vel.X += math.Cos(strafeAngle) * (accel * 0.75) 
					unit.Vel.Y += math.Sin(strafeAngle) * (accel * 0.75) 
				}

				currentSpeed := math.Hypot(unit.Vel.X, unit.Vel.Y)
				if currentSpeed > maxSpeed {
					unit.Vel.X = (unit.Vel.X / currentSpeed) * maxSpeed
					unit.Vel.Y = (unit.Vel.Y / currentSpeed) * maxSpeed
				}
			} else {
				if unit.AIState == "RETREAT" {
					var portTarget *models.FleetUnit
					minDistToPort := math.MaxFloat64

					for _, ally := range r.units {
						if ally.OwnerID == unit.OwnerID && (ally.Type == "flagship" || ally.Type == "battalion_command_ship") && !ally.IsDestroyed {
							d := math.Hypot(ally.Pos.X-unit.Pos.X, ally.Pos.Y-unit.Pos.Y)
							if d < minDistToPort {
								minDistToPort = d
								portTarget = ally
							}
						}
					}

					if portTarget != nil {
						dx := portTarget.Pos.X - unit.Pos.X
						dy := portTarget.Pos.Y - unit.Pos.Y
						unit.Angle = math.Atan2(dy, dx)
						unit.Vel.X += math.Cos(unit.Angle) * unit.Speed * 1.2
						unit.Vel.Y += math.Sin(unit.Angle) * unit.Speed * 1.2
						unit.IsFiring = false

						if minDistToPort < 150.0 { unit.AIState = "GUARD" }
					} else {
						unit.IsFiring = false
					}
				} else if unit.SquadID > 0 && !unit.IsSquadLeader {
					leader := r.findSquadLeader(unit.OwnerID, unit.BattalionID, unit.SquadID)
					if leader != nil && !leader.IsDestroyed {
						target := r.findBestTarget(leader)
						if target == nil { target = r.findBestTarget(unit) }

						if target != nil && !target.IsDestroyed {
							dx := target.Pos.X - unit.Pos.X
							dy := target.Pos.Y - unit.Pos.Y
							dist := math.Hypot(dx, dy)
							unit.Angle = math.Atan2(dy, dx)

							if dist > 300 {
								unit.Vel.X += math.Cos(unit.Angle) * unit.Speed
								unit.Vel.Y += math.Sin(unit.Angle) * unit.Speed
								unit.IsFiring = false
							} else {
								unit.IsFiring = true
							}
						} else {
							targetX := leader.Pos.X + 100.0
							targetY := leader.Pos.Y + 100.0
							dx := targetX - unit.Pos.X
							dy := targetY - unit.Pos.Y
							distToAnchor := math.Hypot(dx, dy)

							if distToAnchor > 40.0 {
								unit.Angle = math.Atan2(dy, dx)
								unit.Vel.X += math.Cos(unit.Angle) * unit.Speed * 0.9
								unit.Vel.Y += math.Sin(unit.Angle) * unit.Speed * 0.9
							} else {
								unit.Angle = leader.Angle
							}
							unit.IsFiring = false
						}
					} else {
						target := r.findBestTarget(unit)
						if target != nil && !target.IsDestroyed {
							dx := target.Pos.X - unit.Pos.X
							dy := target.Pos.Y - unit.Pos.Y
							dist := math.Hypot(dx, dy)
							unit.Angle = math.Atan2(dy, dx)
							if dist > 250 {
								unit.Vel.X += math.Cos(unit.Angle) * unit.Speed
								unit.Vel.Y += math.Sin(unit.Angle) * unit.Speed
								unit.IsFiring = false
							} else {
								unit.IsFiring = true
							}
						} else {
							unit.IsFiring = false
						}
					}
				} else {
					target := r.findBestTarget(unit)
					if unit.OwnerID == "enemy" && target == nil { target = flagship }

					if target != nil && !target.IsDestroyed {
						dx := target.Pos.X - unit.Pos.X
						dy := target.Pos.Y - unit.Pos.Y
						dist := math.Hypot(dx, dy)
						unit.Angle = math.Atan2(dy, dx)

						if dist > 250 {
							unit.Vel.X += math.Cos(unit.Angle) * unit.Speed
							unit.Vel.Y += math.Sin(unit.Angle) * unit.Speed
							unit.IsFiring = false
						} else {
							unit.IsFiring = true
						}
					} else {
						unit.IsFiring = false
					}
				}
			}

			unit.Pos.X += unit.Vel.X
			unit.Pos.Y += unit.Vel.Y
			unit.Vel.X *= 0.95
			unit.Vel.Y *= 0.95

			if unit.Pos.X < 50 { unit.Pos.X = 50; unit.Vel.X = 0 }
			if unit.Pos.X > 11950 { unit.Pos.X = 11950; unit.Vel.X = 0 }
			if unit.Pos.Y < 50 { unit.Pos.Y = 50; unit.Vel.Y = 0 }
			if unit.Pos.Y > 11950 { unit.Pos.Y = 11950; unit.Vel.Y = 0 }

			if unit.Cooldown > 0 { unit.Cooldown-- }
			if unit.IsFiring && unit.Cooldown <= 0 {
				r.idCounter++
				projSpeed, projDmg, projColor := 18.0, 50.0, "laser"
				if unit.Type == "lancer_corvette" || unit.Type == "flagship" || unit.Type == "battalion_command_ship" {
					projSpeed = 25.0
					projDmg = 120.0
					projColor = "railgun"
				}

				r.projectiles = append(r.projectiles, models.Projectile{
					ID: fmt.Sprintf("proj-%d", r.idCounter), OwnerID: unit.OwnerID, Type: projColor,
					Pos: models.Vector2D{X: unit.Pos.X + math.Cos(unit.Angle)*30, Y: unit.Pos.Y + math.Sin(unit.Angle)*30},
					Vel: models.Vector2D{X: unit.Vel.X + math.Cos(unit.Angle)*projSpeed, Y: unit.Vel.Y + math.Sin(unit.Angle)*projSpeed},
					Life: 100, Damage: projDmg,
				})
				unit.Cooldown = unit.MaxCooldown
			}
		}

		// Downstream: Build and broadcast binary FlatBuffers frame
		builder := flatbuffers.NewBuilder(1024)

		unitOffsets := make([]flatbuffers.UOffsetT, 0, len(r.units))
		for _, u := range r.units {
			idOffset := builder.CreateString(u.ID)
			typeOffset := builder.CreateString(u.Type)
			ownerOffset := builder.CreateString(u.OwnerID)

			pos := SpaceTactics.CreateVector2D(builder, float32(u.Pos.X), float32(u.Pos.Y))
			shields := SpaceTactics.CreateShields(builder, float32(u.Shields.Front), float32(u.Shields.Rear), float32(u.Shields.Port), float32(u.Shields.Starboard))
			hull := SpaceTactics.CreateHull(builder, float32(u.Hull.Front), float32(u.Hull.Rear), float32(u.Hull.Port), float32(u.Hull.Starboard))

			SpaceTactics.FleetUnitStart(builder)
			SpaceTactics.FleetUnitAddId(builder, idOffset)
			SpaceTactics.FleetUnitAddType(builder, typeOffset)
			SpaceTactics.FleetUnitAddOwnerId(builder, ownerOffset)
			SpaceTactics.FleetUnitAddPos(builder, pos)
			SpaceTactics.FleetUnitAddAngle(builder, float32(u.Angle))
			SpaceTactics.FleetUnitAddShields(builder, shields)
			SpaceTactics.FleetUnitAddHull(builder, hull)
			SpaceTactics.FleetUnitAddIsDestroyed(builder, u.IsDestroyed)
			SpaceTactics.FleetUnitAddIsSquadLeader(builder, u.IsSquadLeader)
			SpaceTactics.FleetUnitAddIsFiring(builder, u.IsFiring)
			SpaceTactics.FleetUnitAddBattalionId(builder, int32(u.BattalionID))
			SpaceTactics.FleetUnitAddSquadId(builder, int32(u.SquadID))
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
			pos := SpaceTactics.CreateVector2D(builder, float32(p.Pos.X), float32(p.Pos.Y))

			SpaceTactics.ProjectileStart(builder)
			SpaceTactics.ProjectileAddId(builder, pIdOffset)
			SpaceTactics.ProjectileAddOwnerId(builder, ownerOffset)
			SpaceTactics.ProjectileAddType(builder, typeOffset)
			SpaceTactics.ProjectileAddPos(builder, pos)
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
