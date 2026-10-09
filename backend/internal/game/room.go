package game

import (
	"encoding/json"
	"fmt"
	"log"
	"math"
	"math/rand"
	"net/http"
	"sync"
	"time"

	"space-tactics-server/internal/db"
	"space-tactics-server/internal/models"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{CheckOrigin: func(r *http.Request) bool { return true }}

type SandboxClientInput struct {
	models.ClientInput
	SandboxSpawn     string   `json:"sandboxSpawn"`
	SpawnX           *float64 `json:"spawnX"`
	SpawnY           *float64 `json:"spawnY"`
	ControlledUnitID string   `json:"controlledUnitId"`
}

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
	lastInput   SandboxClientInput
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
		"SELECT id, map_id, structure_type, pos_x, pos_y, radius, custom_props FROM map_structures WHERE map_id = $1", 
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
		r.spawnUnit("flagship", "enemy", 6000, 2000, "SEEK")
	}
}

func (r *GameRoom) findBestTarget(unit *models.FleetUnit) *models.FleetUnit {
	var bestTarget *models.FleetUnit
	bestScore := -999999.0

	for _, target := range r.units {
		if target.IsDestroyed || target.OwnerID == unit.OwnerID || target.Type == "asteroid" {
			continue
		}

		dx := target.Pos.X - unit.Pos.X
		dy := target.Pos.Y - unit.Pos.Y
		dist := math.Sqrt(dx*dx + dy*dy)

		if dist > 1500.0 { continue }

		score := 2000.0 - dist 

		if unit.Type == "torpedo_bomber" && (target.Type == "flagship" || target.Type == "target_dummy") {
			score += 5000.0 
		} else if target.Type == "flagship" || target.Type == "target_dummy" {
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
	if overrideAI != "" { aiState = overrideAI }

	unit := &models.FleetUnit{
		ID: id, Type: unitType, OwnerID: owner, Pos: models.Vector2D{X: x, Y: y},
		Shields: template.Shields, Hull: template.Hull, AIState: aiState,
		Speed: template.Speed, MaxCooldown: template.MaxCooldown,
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
		_, msg, err := conn.ReadMessage()
		if err != nil { break }
		var input SandboxClientInput
		if err := json.Unmarshal(msg, &input); err == nil {
			r.mu.Lock()
			if input.Deploy != "" {
				r.deployQueue = append(r.deployQueue, input.Deploy)
			}
			if input.SandboxSpawn != "" {
				r.deployQueue = append(r.deployQueue, "SANDBOX:"+input.SandboxSpawn)
				if input.SpawnX != nil && input.SpawnY != nil {
					offsetX := *input.SpawnX + (rand.Float64()-0.5)*120
					offsetY := *input.SpawnY + (rand.Float64()-0.5)*120
					r.spawnUnit(input.SandboxSpawn, "player", offsetX, offsetY, "GUARD")
				}
			}
			r.lastInput = input
			r.mu.Unlock()
		}
	}
}

func (r *GameRoom) runAI() {
	if r.isSandbox { return }

	var ai *models.FleetUnit
	var player *models.FleetUnit

	for _, u := range r.units {
		if u.Type == "flagship" && u.OwnerID == "enemy" { ai = u }
		if u.Type == "flagship" && u.OwnerID == "player" { player = u }
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
		reserves := []string{"viper_interceptor", "viper_interceptor", "lancer_corvette", "torpedo_bomber", "aegis_wall"}
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
		flagship := r.units["player-flagship"]

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
		if controlledID == "" {
			controlledID = "player-flagship"
		}

		for id, unit := range r.units {
			if unit.IsDestroyed {
				if unit.Type == "flagship" && !r.isSandbox {
					deadCount++
				} else {
					delete(r.units, id)
				}
				continue
			}

			if unit.ID == controlledID && unit.OwnerID == "player" {
				unit.Angle = r.lastInput.Angle
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
				} else if unit.AIState == "GUARD" && flagship != nil && !flagship.IsDestroyed {
					dx := flagship.Pos.X - unit.Pos.X
					dy := flagship.Pos.Y - unit.Pos.Y
					if math.Hypot(dx, dy) > 200 {
						unit.Angle = math.Atan2(dy, dx)
						unit.Vel.X += math.Cos(unit.Angle) * unit.Speed * 0.8
						unit.Vel.Y += math.Sin(unit.Angle) * unit.Speed * 0.8
					} else {
						unit.Angle = flagship.Angle
					}
					unit.IsFiring = false
				} else {
					unit.IsFiring = false
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

			// Apply Environmental Collisions (Planets, Moons, Planetoids, Gas Giant Cores)
			ApplyEnvironmentalCollisions(unit, r.structures)

			for _, other := range r.units {
				if unit.ID == other.ID || other.IsDestroyed { continue }
				dx := other.Pos.X - unit.Pos.X
				dy := other.Pos.Y - unit.Pos.Y
				dist := math.Hypot(dx, dy)
				if dist < 45.0 && dist > 0.1 {
					overlap := 45.0 - dist
					nx := dx / dist
					ny := dy / dist
					unit.Pos.X -= nx * overlap * 0.5
					unit.Pos.Y -= ny * overlap * 0.5
					other.Pos.X += nx * overlap * 0.5
					other.Pos.Y += ny * overlap * 0.5

					if !(r.isSandbox && unit.OwnerID == "player" && other.OwnerID == "player") {
						impactVel := math.Hypot(unit.Vel.X, unit.Vel.Y)
						if impactVel > 2.0 {
							applyDamage(other, impactVel*0.05, math.Atan2(dy, dx))
						}
					}
				}
			}

			if unit.Cooldown > 0 { unit.Cooldown-- }
			if unit.IsFiring && unit.Cooldown <= 0 {
				r.idCounter++
				projSpeed, projDmg, projColor := 18.0, 50.0, "laser"
				if unit.Type == "lancer_corvette" || unit.Type == "flagship" {
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

		activeProjectiles := []models.Projectile{}
		for _, p := range r.projectiles {
			p.Pos.X += p.Vel.X
			p.Pos.Y += p.Vel.Y
			p.Life--
			hit := false
			for _, unit := range r.units {
				if unit.IsDestroyed || p.OwnerID == unit.OwnerID { continue }
				if math.Hypot(p.Pos.X-unit.Pos.X, p.Pos.Y-unit.Pos.Y) < 40 {
					applyDamage(unit, p.Damage, math.Atan2(p.Vel.Y, p.Vel.X)+math.Pi)
					hit = true
					break
				}
			}
			if !hit && p.Life > 0 {
				activeProjectiles = append(activeProjectiles, p)
			}
		}
		r.projectiles = activeProjectiles

		if !r.isSandbox && deadCount > 0 {
			if r.resetTimer == 0 { r.resetTimer = 300 }
			r.resetTimer--
			if r.resetTimer <= 0 {
				r.resetWorld()
				r.resetTimer = 0
			}
		} else {
			r.resetTimer = 0
		}

		payloadUnits := make([]*models.FleetUnit, 0, len(r.units))
		for _, u := range r.units {
			payloadUnits = append(payloadUnits, u)
		}

		statePayload := models.ServerState{
			Units:       payloadUnits,
			Projectiles: r.projectiles,
			Tick:        r.tick,
			MapBounds:   struct{ Width float64 `json:"width"`; Height float64 `json:"height"` }{12000, 12000},
		}

		data, _ := json.Marshal(statePayload)
		for conn := range r.clients {
			conn.WriteMessage(websocket.TextMessage, data)
		}
		r.mu.Unlock()
	}
}
