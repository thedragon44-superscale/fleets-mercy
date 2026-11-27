package teamDeathMatch

import (
	"fmt"
	"math"
	"math/rand"

	"space-tactics-server/internal/db"
	"space-tactics-server/internal/game/envphysics"
	"space-tactics-server/internal/models"
)

// Standard fallback pool of unit types available if no custom pool is provided
var tdmUnitPool = []string{
	"viper_interceptor",
	"recon_probe",
	"ion_interceptor",
	"assault_gunship",
	"lancer_corvette",
	"cryo_flak",
	"torpedo_bomber",
	"aegis_wall",
}

// InitializeTDMRoster builds the 20v20 match roster, dividing units into 4 squads of 5 per team,
// assigning random squad leaders, and scattering them across decentralized map sectors.
// Pulls randomly from the custom spawn pool if provided.
// Returns the unique ID of the human player's piloted unit.
func InitializeTDMRoster(r *TDMRoom, pilotedUnitType string, customPool []string) string {
	if pilotedUnitType == "" {
		pilotedUnitType = "viper_interceptor"
	}

	activePool := customPool
	if len(activePool) == 0 {
		activePool = tdmUnitPool
	}

	var pilotedID string
	units := r.GetUnits()
	envWorld := r.GetEnvWorld()
	arenaW, arenaH := r.GetArenaSize()

	factions := []string{"player", "enemy"}

	for _, faction := range factions {
		unitIndex := 0
		for squadID := 1; squadID <= 4; squadID++ {
			clusterX, clusterY := generateSquadClusterCoords(faction, squadID, arenaW, arenaH, envWorld)
			leaderIndexWithinSquad := rand.Intn(5)

			for i := 0; i < 5; i++ {
				unitIndex++
				var unitType string

				if faction == "player" && unitIndex == 1 {
					unitType = pilotedUnitType
				} else {
					unitType = activePool[rand.Intn(len(activePool))]
				}

				template, exists := db.GetTemplate(unitType)
				if !exists {
					unitType = "viper_interceptor"
					template, _ = db.GetTemplate(unitType)
				}

				var id string
				if faction == "player" && unitIndex == 1 {
					id = fmt.Sprintf("tdm-pilot-%s-%d", unitType, r.NextUnitID())
					pilotedID = id
				} else {
					id = fmt.Sprintf("tdm-%s-%s-%d", faction, unitType, r.NextUnitID())
				}

				isLeader := (i == leaderIndexWithinSquad)

				spread := math.Min(300.0, math.Min(arenaW, arenaH)*0.08)
				spawnX := clusterX + (rand.Float64()-0.5)*spread
				spawnY := clusterY + (rand.Float64()-0.5)*spread
				spawnX, spawnY = sanitizeSpawnCoords(spawnX, spawnY, arenaW, arenaH, envWorld)

				unit := &models.FleetUnit{
					ID:                           id,
					Type:                         unitType,
					OwnerID:                      faction,
					Pos:                          models.Vector2D{X: spawnX, Y: spawnY},
					Shields:                      template.Shields,
					Hull:                         template.Hull,
					AIState:                      template.AIState,
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
					BattalionID:                  1,
					SquadID:                      squadID,
					IsSquadLeader:                isLeader,
					ResourceCache:                100.0,
					MaxResourceCapacity:          500.0,
				}

				units[unit.ID] = unit
			}
		}
	}

	return pilotedID
}

// generateSquadClusterCoords computes decentralized spawn locations scaled to the active arena bounds,
// keeping player squads separated from enemy squads and clear of universal envphysics hazards.
func generateSquadClusterCoords(faction string, squadID int, arenaW, arenaH float64, envWorld *envphysics.World) (float64, float64) {
	var baseX, baseY float64

	if faction == "player" {
		baseX = arenaW*(0.16+float64((squadID-1)%2)*0.25)
		baseY = arenaH*(0.68+float64((squadID-1)/2)*0.16)
	} else {
		baseX = arenaW*(0.58+float64((squadID-1)%2)*0.25)
		baseY = arenaH*(0.16+float64((squadID-1)/2)*0.16)
	}

	jitterX := arenaW * 0.06
	jitterY := arenaH * 0.06
	finalX := baseX + (rand.Float64()-0.5)*jitterX
	finalY := baseY + (rand.Float64()-0.5)*jitterY

	return sanitizeSpawnCoords(finalX, finalY, arenaW, arenaH, envWorld)
}

// sanitizeSpawnCoords pushes spawn coordinates outside universal envphysics objects and clamps to arena bounds.
func sanitizeSpawnCoords(x, y, arenaW, arenaH float64, envWorld *envphysics.World) (float64, float64) {
	if envWorld != nil {
		for _, obj := range envWorld.Objects {
			if obj == nil {
				continue
			}
			safeRadius := obj.BoundingRadius + 150.0
			dx := x - obj.Center.X
			dy := y - obj.Center.Y
			dist := math.Hypot(dx, dy)

			if dist < safeRadius {
				angle := math.Atan2(dy, dx)
				if dist < 0.1 {
					angle = rand.Float64() * 2 * math.Pi
				}
				x = obj.Center.X + math.Cos(angle)*safeRadius
				y = obj.Center.Y + math.Sin(angle)*safeRadius
			}
		}
	}

	pad := math.Min(150.0, math.Min(arenaW, arenaH)*0.1)
	x = math.Max(pad, math.Min(arenaW-pad, x))
	y = math.Max(pad, math.Min(arenaH-pad, y))
	return x, y
}
