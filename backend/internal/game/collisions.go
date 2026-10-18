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
	default: // interceptors, recon probes, fighters
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
```[cite: 13]

---

### 2. Frontend Binary Codec Master (`src/parsers/binaryCodec.ts`)
This version replaces the massive manual block of `if` statements with a clean, loop-driven configuration mapping array that cleanly packs all custom unit specification variables without boilerplate clutter:

```ts
// src/parsers/binaryCodec.ts
import * as flatbuffersNS from 'flatbuffers';
import { ServerState } from '../generated/space-tactics/server-state';
import { ClientInput } from '../generated/space-tactics/client-input';
import { UnitConfigUpdate } from '../generated/space-tactics/unit-config-update';
import { UnitGroupingPayload } from '../generated/space-tactics/unit-grouping-payload';
import { SandboxCountPair } from '../generated/space-tactics/sandbox-count-pair';

// Safe interop fallback for Vite / CJS package bundling of flatbuffers
const FB = (flatbuffersNS as any).Flatbuffers || flatbuffersNS;
const ByteBuffer = FB.ByteBuffer || (flatbuffersNS as any).ByteBuffer;
const Builder = FB.Builder || flatbuffersNS.Builder;

/**
 * ==========================================
 * DOWNSTREAM: Unpack Server Binary Message
 * ==========================================
 */
export function unpackServerBinaryMessage(arrayBuffer: ArrayBuffer) {
  try {
    const uint8Array = new Uint8Array(arrayBuffer);
    const bb = new ByteBuffer(uint8Array);
    const serverState = ServerState.getRootAsServerState(bb);

    const tick = Number(serverState.tick());
    const mapWidth = serverState.mapWidth();
    const mapHeight = serverState.mapHeight();

    // Parse Fleet Units
    const unitsLength = serverState.unitsLength();
    const units = new Array(unitsLength);
    for (let i = 0; i < unitsLength; i++) {
      const u = serverState.units(i);
      if (!u) continue;

      const pos = u.pos();
      const shields = u.shields();
      const hull = u.hull();

      units[i] = {
        id: u.id() || '',
        type: u.type() || 'default',
        ownerId: u.ownerId() || 'enemy',
        pos: { x: pos?.x() || 0, y: pos?.y() || 0 },
        angle: u.angle(),
        shields: {
          front: shields?.front() || 0,
          rear: shields?.rear() || 0,
          port: shields?.port() || 0,
          starboard: shields?.starboard() || 0,
        },
        hull: {
          front: hull?.front() || 0,
          rear: hull?.rear() || 0,
          port: hull?.port() || 0,
          starboard: hull?.starboard() || 0,
        },
        isDestroyed: u.isDestroyed(),
        isSquadLeader: u.isSquadLeader(),
        isFiring: u.isFiring(),
        battalionId: u.battalionId(),
        squadId: u.squadId(),
      };
    }

    // Parse Projectiles
    const projLength = serverState.projectilesLength();
    const projectiles = new Array(projLength);
    for (let i = 0; i < projLength; i++) {
      const p = serverState.projectiles(i);
      if (!p) continue;

      const pos = p.pos();
      const vel = p.vel();
      projectiles[i] = {
        id: p.id() || '',
        ownerId: p.ownerId() || '',
        type: p.type() || 'player',
        pos: { x: pos?.x() || 0, y: pos?.y() || 0 },
        vel: { x: vel?.x() || 0, y: vel?.y() || 0 },
      };
    }

    return {
      tick: serverState.tick(),
      units,
      projectiles,
      mapBounds: {
        width: serverState.mapWidth(),
        height: serverState.mapHeight()
      }
    };
  } catch (error) {
    console.error('[BINARY CODEC] Failed to unpack FlatBuffers message:', error);
    return null;
  }
}

/**
 * ==========================================
 * UPSTREAM: Serialize Client Input Payload
 * ==========================================
 */
export function serializeClientInput(actionParams: {
  keys?: { w?: boolean; s?: boolean; a?: boolean; d?: boolean };
  angle?: number;
  isFiring?: boolean;
  currentId?: string | null;
  reset?: boolean;
  deploy?: string;
  sandboxSpawn?: string;
  sandboxRemove?: string;
  spawnX?: number;
  spawnY?: number;
  sandboxCounts?: Record<string, number>;
  templateOverride?: {
    type: string;
    config: {
      weightClass?: number;
      visionRange?: number;
      aggroRange?: number;
      aggroThreatWeight?: number;
      retreatMoraleThreshold?: number;
      squadCohesionLeashRange?: number;
      shieldBase?: number;
      hullBase?: number;
      quadrantShieldingEnabled?: boolean;
      quadrantShieldPoolsEnabled?: boolean;
      quadrantHullPoolsEnabled?: boolean;
      shieldRegenRate?: number;
      shieldRechargeDelayTicks?: number;
      directionalShieldArc?: number;
      armorMitigation?: number;
      armorHardnessRating?: number;
      ablativePlatingDurability?: number;
      speed?: number;
      strafingSpeed?: number;
      turnRate?: number;
      angularVelocity?: number;
      lateralThrustPower?: number;
      reverseThrustPower?: number;
      driftCoefficient?: number;
      accelerationCurve?: number;
      dps?: number;
      maxCooldown?: number;
      projectileRange?: number;
      projectileSpeed?: number;
      optimalRange?: number;
      maxRange?: number;
      engagementRangeCap?: number;
      ammoCapacity?: number;
      initialOrdnanceCapacity?: number;
      turretTraverseSpeed?: number;
      weaponDispersionBloom?: number;
      projectileTrackingCapability?: number;
      shieldPenetrationFactor?: number;
      sustainedFireLimitSeconds?: number;
      barrelCoolingDurationSeconds?: number;
      burstSalvoCooldown?: number;
      beamRaycastDuration?: number;
      maxThermalCapacity?: number;
      thermalDissipationRate?: number;
      powerGridAllocationWeight?: number;
      radarCrossSection?: number;
      sensorResolutionTier?: number;
      jammingSusceptibility?: number;
      targetLockTime?: number;
      radarImmunityActive?: boolean;
      shieldGatedStealthThreshold?: boolean;
      decloakOnActionFlag?: boolean;
      stealthRecoveryDelaySeconds?: number;
      resourceHarvestingType?: number;
      requiresReconTelemetry?: boolean;
      requiresAnchorDrone?: boolean;
      requiresReconAnchor?: boolean;
      portDockingBayStatus?: boolean;
      starboardDeploymentBayStatus?: boolean;
      salvageableUponDestruction?: boolean;
      cryoGasRadius?: number;
      cryoEffectDuration?: number;
      gravitonVortexDuration?: number;
      warpCanisterCapacity?: number;
      emergencyWarpEvacuationTarget?: boolean;
    };
  };
  unitGrouping?: {
    unitId: string;
    battalionId: number;
    squadId: number;
    isSquadLeader: boolean;
  };
}): Uint8Array {
  const builder = new Builder(1024);

  // 1. Create string offsets
  const controlledIdOffset = actionParams.currentId ? builder.createString(actionParams.currentId) : 0;
  const deployOffset = actionParams.deploy ? builder.createString(actionParams.deploy) : 0;
  const sandboxSpawnOffset = actionParams.sandboxSpawn ? builder.createString(actionParams.sandboxSpawn) : 0;
  const sandboxRemoveOffset = actionParams.sandboxRemove ? builder.createString(actionParams.sandboxRemove) : 0;
  
  // 2. Build Template Override Table (if provided)
  let templateTypeOffset = 0;
  let templateConfigOffset = 0;
  if (actionParams.templateOverride) {
    templateTypeOffset = builder.createString(actionParams.templateOverride.type);
    const cfg = actionParams.templateOverride.config;

    UnitConfigUpdate.startUnitConfigUpdate(builder);

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

  // 3. Build Unit Grouping Table (if provided)
  let groupingOffset = 0;
  if (actionParams.unitGrouping) {
    const ug = actionParams.unitGrouping;
    const unitIdOffset = builder.createString(ug.unitId);

    UnitGroupingPayload.startUnitGroupingPayload(builder);
    UnitGroupingPayload.addUnitId(builder, unitIdOffset);
    UnitGroupingPayload.addBattalionId(builder, ug.battalionId);
    UnitGroupingPayload.addSquadId(builder, ug.squadId);
    UnitGroupingPayload.addIsSquadLeader(builder, ug.isSquadLeader);
    groupingOffset = UnitGroupingPayload.endUnitGroupingPayload(builder);
  }

  // 4. Build Sandbox Counts Vector (if provided)
  let countsVectorOffset = 0;
  if (actionParams.sandboxCounts && Object.keys(actionParams.sandboxCounts).length > 0) {
    const entries = Object.entries(actionParams.sandboxCounts);
    const pairOffsets = entries.map(([unitType, count]) => {
      const typeOffset = builder.createString(unitType);
      SandboxCountPair.startSandboxCountPair(builder);
      SandboxCountPair.addUnitType(builder, typeOffset);
      SandboxCountPair.addCount(builder, count);
      return SandboxCountPair.endSandboxCountPair(builder);
    });

    ClientInput.startSandboxCountsVector(builder, pairOffsets.length);
    for (let i = pairOffsets.length - 1; i >= 0; i--) {
      builder.addOffset(pairOffsets[i]); 
    }
    countsVectorOffset = builder.endVector();
  }

  // 5. Build Root ClientInput Table
  ClientInput.startClientInput(builder);
  ClientInput.addW(builder, !!actionParams.keys?.w);
  ClientInput.addS(builder, !!actionParams.keys?.s);
  ClientInput.addA(builder, !!actionParams.keys?.a);
  ClientInput.addD(builder, !!actionParams.keys?.d);
  ClientInput.addAngle(builder, actionParams.angle || 0);
  ClientInput.addIsFiring(builder, !!actionParams.isFiring);

  if (controlledIdOffset) ClientInput.addControlledUnitId(builder, controlledIdOffset);
  ClientInput.addReset(builder, !!actionParams.reset);

  if (deployOffset) ClientInput.addDeploy(builder, deployOffset);
  if (sandboxSpawnOffset) ClientInput.addSandboxSpawn(builder, sandboxSpawnOffset);
  if (sandboxRemoveOffset) ClientInput.addSandboxRemove(builder, sandboxRemoveOffset);

  if (actionParams.spawnX !== undefined) ClientInput.addSpawnX(builder, actionParams.spawnX);
  if (actionParams.spawnY !== undefined) ClientInput.addSpawnY(builder, actionParams.spawnY);

  if (countsVectorOffset) ClientInput.addSandboxCounts(builder, countsVectorOffset);
  if (templateTypeOffset) ClientInput.addTemplateOverrideType(builder, templateTypeOffset);
  if (templateConfigOffset) ClientInput.addTemplateOverrideConfig(builder, templateConfigOffset);
  if (groupingOffset) ClientInput.addUnitGrouping(builder, groupingOffset);

  const root = ClientInput.endClientInput(builder);
  builder.finish(root);

  return builder.asUint8Array();
}
