package teamDeathMatch

import (
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

	// Use custom spawn pool if available and non-empty, otherwise fallback to default tdmUnitPool
	activePool := customPool
	if len(activePool) == 0 {
		activePool = tdmUnitPool
	}

	var pilotedID string

	// Spawn Factions: player, enemy
	factions := []string{"player", "enemy"}

	for _, faction := range factions {
		// Each faction gets 20 units total, split across 4 squads (5 units per squad)
		unitIndex := 0
		for squadID := 1; squadID <= 4; squadID++ {
			// Generate a decentralized cluster center coordinate for this squad
			clusterX, clusterY := generateSquadClusterCoords(faction, squadID)

			// Randomly select one unit index in this squad of 5 to be the Squad Leader (0 to 4)
			leaderIndexWithinSquad := rand.Intn(5)

			for i := 0; i < 5; i++ {
				unitIndex++
				var unitType string

				// If player faction and this is the very first unit, enforce the user's chosen piloted class
				if faction == "player" && unitIndex == 1 {
					unitType = pilotedUnitType
				} else {
					// Pick a random unit type from the active custom spawn pool
					unitType = activePool[rand.Intn(len(activePool))]
				}

				template, exists := db.Templates[unitType]
				if !exists {
					// Fallback to viper if template lookup fails
					unitType = "viper_interceptor"
					template = db.Templates[unitType]
				}

				r.idCounter++
				id := "tdm-" + faction + "-" + unitType + "-" + string(rune(r.idCounter))

				if faction == "player" && unitIndex == 1 {
					pilotedID = id
				}

				isLeader := (i == leaderIndexWithinSquad)

				// Scatter individual squad members slightly around the cluster center
				spawnX := clusterX + (rand.Float64()-0.5)*300.0
				spawnY := clusterY + (rand.Float64()-0.5)*300.0

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

				r.units[unit.ID] = unit
			}
		}
	}

	return pilotedID
}

// generateSquadClusterCoords computes decentralized spawn locations across the 12000x12000 map bounds,
// keeping player squads generally separated from enemy squads initially.
func generateSquadClusterCoords(faction string, squadID int) (float64, float64) {
	var baseX, baseY float64

	if faction == "player" {
		// Player side occupies the bottom/left sectors of the map
		baseX = 2000.0 + float64((squadID-1)%2)*3000.0
		baseY = 8000.0 + float64((squadID-1)/2)*2000.0
	} else {
		// Enemy side occupies the top/right sectors of the map
		baseX = 7000.0 + float64((squadID-1)%2)*3000.0
		baseY = 2000.0 + float64((squadID-1)/2)*2000.0
	}

	// Add a bit of random variance to sector placement
	finalX := baseX + (rand.Float64()-0.5)*1000.0
	finalY := baseY + (rand.Float64()-0.5)*1000.0

	return finalX, finalY
}
