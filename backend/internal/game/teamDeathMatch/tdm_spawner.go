package teamDeathMatch

import (
	"fmt"
	"math"
	"math/rand"

	"space-tactics-server/internal/db"
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
	structures := r.GetStructures()

	factions := []string{"player", "enemy"}

	for _, faction := range factions {
		unitIndex := 0
		for squadID := 1; squadID <= 4; squadID++ {
			clusterX, clusterY := generateSquadClusterCoords(faction, squadID, structures)
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

				id := fmt.Sprintf("tdm-%s-%s-%d", faction, unitType, r.NextUnitID())

				if faction == "player" && unitIndex == 1 {
					pilotedID = id
				}

				isLeader := (i == leaderIndexWithinSquad)

				spawnX := clusterX + (rand.Float64()-0.5)*300.0
				spawnY := clusterY + (rand.Float64()-0.5)*300.0
				spawnX, spawnY = sanitizeSpawnCoords(spawnX, spawnY, structures)

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

// generateSquadClusterCoords computes decentralized spawn locations across the 12000x12000 map bounds,
// keeping player squads separated from enemy squads and clear of environmental hazards.
func generateSquadClusterCoords(faction string, squadID int, structures []models.MapStructure) (float64, float64) {
	var baseX, baseY float64

	if faction == "player" {
		baseX = 2000.0 + float64((squadID-1)%2)*3000.0
		baseY = 8000.0 + float64((squadID-1)/2)*2000.0
	} else {
		baseX = 7000.0 + float64((squadID-1)%2)*3000.0
		baseY = 2000.0 + float64((squadID-1)/2)*2000.0
	}

	finalX := baseX + (rand.Float64()-0.5)*1000.0
	finalY := baseY + (rand.Float64()-0.5)*1000.0

	return sanitizeSpawnCoords(finalX, finalY, structures)
}

// sanitizeSpawnCoords pushes spawn coordinates outside hazardous/solid structures and clamps to map bounds.
func sanitizeSpawnCoords(x, y float64, structures []models.MapStructure) (float64, float64) {
	for _, s := range structures {
		safeRadius := s.Radius + 150.0
		dx := x - s.PosX
		dy := y - s.PosY
		dist := math.Hypot(dx, dy)

		if dist < safeRadius {
			angle := math.Atan2(dy, dx)
			if dist < 0.1 {
				angle = rand.Float64() * 2 * math.Pi
			}
			x = s.PosX + math.Cos(angle)*safeRadius
			y = s.PosY + math.Sin(angle)*safeRadius
		}
	}

	x = math.Max(150.0, math.Min(11850.0, x))
	y = math.Max(150.0, math.Min(11850.0, y))
	return x, y
}
