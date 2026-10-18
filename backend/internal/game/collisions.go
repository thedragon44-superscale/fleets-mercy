package game

import (
	"math"
	"space-tactics-server/internal/models"
)

// getUnitRadius returns the physical footprint radius based on unit type
func getUnitRadius(unit *models.FleetUnit) float64 {
	switch unit.Type {
	case "flagship", "battalion_command_ship":
		return 75.0
	case "aegis_wall":
		return 55.0
	case "lancer_corvette", "torpedo_bomber":
		return 35.0
	default: // intereceptors, recon probes, fighters
		return 22.0
	}
}

// ResolveUnitCollisions checks and resolves physics-based overlapping collisions between individual fleet units
func ResolveUnitCollisions(units map[string]*models.FleetUnit, isSandbox bool) {
	// Run 2 iterative passes per tick for stable multi-body cluster separation
	for iteration := 0; iteration < 2; iteration++ {
		for _, unit := range units {
			if unit.IsDestroyed {
				continue
			}

			radiusA := getUnitRadius(unit)

			for _, other := range units {
				if unit.ID == other.ID || other.IsDestroyed {
					continue
				}

				radiusB := getUnitRadius(other)
				minDist := radiusA + radiusB

				dx := other.Pos.X - unit.Pos.X
				dy := other.Pos.Y - unit.Pos.Y
				dist := math.Hypot(dx, dy)

				if dist < minDist && dist > 0.1 {
					overlap := minDist - dist
					nx := dx / dist
					ny := dy / dist
					
					// Weight-based displacement (lighter units get pushed more)
					weightA := float64(unit.WeightClass)
					if weightA < 1 { weightA = 1 }
					weightB := float64(other.WeightClass)
					if weightB < 1 { weightB = 1 }
					
					totalWeight := weightA + weightB
					ratioA := weightB / totalWeight
					ratioB := weightA / totalWeight

					unit.Pos.X -= nx * overlap * ratioA
					unit.Pos.Y -= ny * overlap * ratioA
					other.Pos.X += nx * overlap * ratioB
					other.Pos.Y += ny * overlap * ratioB

					if !(isSandbox && unit.OwnerID == "player" && other.OwnerID == "player") {
						impactVel := math.Hypot(unit.Vel.X-other.Vel.X, unit.Vel.Y-other.Vel.Y)
						if impactVel > 2.0 {
							applyDamage(other, impactVel*0.03, math.Atan2(dy, dx))
						}
					}
				}
			}
		}
	}
}
```[cite: 22]

---

### Part 2: Clean Up the Codec Template Override Boilerplate (`binaryCodec.ts`)

Writing dozens of manual `if (cfg.field !== undefined) UnitConfigUpdate.addX(builder, cfg.field)` statements is tedious and prone to human error. 

You can collapse that entire massive wall of code in **`src/parsers/binaryCodec.ts`** into a clean, loop-driven property map using the generated FlatBuffers setter methods. 

Replace the template override builder section inside `serializeClientInput` with this compact mapping block:

```ts
  // 2. Build Template Override Table (if provided)
  let templateTypeOffset = 0;
  let templateConfigOffset = 0;
  if (actionParams.templateOverride) {
    templateTypeOffset = builder.createString(actionParams.templateOverride.type);
    const cfg = actionParams.templateOverride.config;

    UnitConfigUpdate.startUnitConfigUpdate(builder);

    // Map configuration keys directly to their FlatBuffers add methods
    const configMappings: [keyof typeof cfg, (b: any, val: any) => void][] = [
      ['weightClass', UnitConfigUpdate.addWeightClass],
      ['visionRange', UnitConfigUpdate.addVisionRange],
      ['aggroRange', UnitConfigUpdate.addAggroRange],
      ['aggroThreatWeight', UnitConfigUpdate.addAggroThreatWeight],
      ['retreatMoraleThreshold', UnitConfigUpdate.addRetreatMoraleThreshold],
      ['squadCohesionLeashRange', UnitConfigUpdate.addSquadCohesionLeashRange],
      ['shieldBase', UnitConfigUpdate.addShieldBase],
      ['hullBase', UnitConfigUpdate.addHullBase],
      ['quadrantShieldingEnabled', UnitConfigUpdate.addQuadrantShieldingEnabled],
      ['quadrantShieldPoolsEnabled', UnitConfigUpdate.addQuadrantShieldPoolsEnabled],
      ['quadrantHullPoolsEnabled', UnitConfigUpdate.addQuadrantHullPoolsEnabled],
      ['shieldRegenRate', UnitConfigUpdate.addShieldRegenRate],
      ['shieldRechargeDelayTicks', UnitConfigUpdate.addShieldRechargeDelayTicks],
      ['directionalShieldArc', UnitConfigUpdate.addDirectionalShieldArc],
      ['armorMitigation', UnitConfigUpdate.addArmorMitigation],
      ['armorHardnessRating', UnitConfigUpdate.addArmorHardnessRating],
      ['ablativePlatingDurability', UnitConfigUpdate.addAblativePlatingDurability],
      ['speed', UnitConfigUpdate.addSpeed],
      ['strafingSpeed', UnitConfigUpdate.addStrafingSpeed],
      ['turnRate', UnitConfigUpdate.addTurnRate],
      ['angularVelocity', UnitConfigUpdate.addAngularVelocity],
      ['lateralThrustPower', UnitConfigUpdate.addLateralThrustPower],
      ['reverseThrustPower', UnitConfigUpdate.addReverseThrustPower],
      ['driftCoefficient', UnitConfigUpdate.addDriftCoefficient],
      ['accelerationCurve', UnitConfigUpdate.addAccelerationCurve],
      ['dps', UnitConfigUpdate.addDps],
      ['maxCooldown', UnitConfigUpdate.addMaxCooldown],
      ['projectileRange', UnitConfigUpdate.addProjectileRange],
      ['projectileSpeed', UnitConfigUpdate.addProjectileSpeed],
      ['optimalRange', UnitConfigUpdate.addOptimalRange],
      ['maxRange', UnitConfigUpdate.addMaxRange],
      ['engagementRangeCap', UnitConfigUpdate.addEngagementRangeCap],
      ['ammoCapacity', UnitConfigUpdate.addAmmoCapacity],
      ['initialOrdnanceCapacity', UnitConfigUpdate.addInitialOrdnanceCapacity],
      ['turretTraverseSpeed', UnitConfigUpdate.addTurretTraverseSpeed],
      ['weaponDispersionBloom', UnitConfigUpdate.addWeaponDispersionBloom],
      ['projectileTrackingCapability', UnitConfigUpdate.addProjectileTrackingCapability],
      ['shieldPenetrationFactor', UnitConfigUpdate.addShieldPenetrationFactor],
      ['sustainedFireLimitSeconds', UnitConfigUpdate.addSustainedFireLimitSeconds],
      ['barrelCoolingDurationSeconds', UnitConfigUpdate.addBarrelCoolingDurationSeconds],
      ['burstSalvoCooldown', UnitConfigUpdate.addBurstSalvoCooldown],
      ['beamRaycastDuration', UnitConfigUpdate.addBeamRaycastDuration],
      ['maxThermalCapacity', UnitConfigUpdate.addMaxThermalCapacity],
      ['thermalDissipationRate', UnitConfigUpdate.addThermalDissipationRate],
      ['powerGridAllocationWeight', UnitConfigUpdate.addPowerGridAllocationWeight],
      ['radarCrossSection', UnitConfigUpdate.addRadarCrossSection],
      ['sensorResolutionTier', UnitConfigUpdate.addSensorResolutionTier],
      ['jammingSusceptibility', UnitConfigUpdate.addJammingSusceptibility],
      ['targetLockTime', UnitConfigUpdate.addTargetLockTime],
      ['radarImmunityActive', UnitConfigUpdate.addRadarImmunityActive],
      ['shieldGatedStealthThreshold', UnitConfigUpdate.addShieldGatedStealthThreshold],
      ['decloakOnActionFlag', UnitConfigUpdate.addDecloakOnActionFlag],
      ['stealthRecoveryDelaySeconds', UnitConfigUpdate.addStealthRecoveryDelaySeconds],
      ['resourceHarvestingType', UnitConfigUpdate.addResourceHarvestingType],
      ['requiresReconTelemetry', UnitConfigUpdate.addRequiresReconTelemetry],
      ['requiresAnchorDrone', UnitConfigUpdate.addRequiresAnchorDrone],
      ['requiresReconAnchor', UnitConfigUpdate.addRequiresReconAnchor],
      ['portDockingBayStatus', UnitConfigUpdate.addPortDockingBayStatus],
      ['starboardDeploymentBayStatus', UnitConfigUpdate.addStarboardDeploymentBayStatus],
      ['salvageableUponDestruction', UnitConfigUpdate.addSalvageableUponDestruction],
      ['cryoGasRadius', UnitConfigUpdate.addCryoGasRadius],
      ['cryoEffectDuration', UnitConfigUpdate.addCryoEffectDuration],
      ['gravitonVortexDuration', UnitConfigUpdate.addGravitonVortexDuration],
      ['warpCanisterCapacity', UnitConfigUpdate.addWarpCanisterCapacity],
      ['emergencyWarpEvacuationTarget', UnitConfigUpdate.addEmergencyWarpEvacuationTarget],
    ];

    for (const [key, addFn] of configMappings) {
      if (cfg[key] !== undefined) {
        addFn(builder, cfg[key]);
      }
    }

    templateConfigOffset = UnitConfigUpdate.endUnitConfigUpdate(builder);
  }
