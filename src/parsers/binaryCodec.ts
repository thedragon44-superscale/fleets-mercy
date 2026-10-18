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
    
    // Core & General
    if (cfg.weightClass !== undefined) UnitConfigUpdate.addWeightClass(builder, cfg.weightClass);
    if (cfg.visionRange !== undefined) UnitConfigUpdate.addVisionRange(builder, cfg.visionRange);
    if (cfg.aggroRange !== undefined) UnitConfigUpdate.addAggroRange(builder, cfg.aggroRange);
    if (cfg.aggroThreatWeight !== undefined) UnitConfigUpdate.addAggroThreatWeight(builder, cfg.aggroThreatWeight);
    if (cfg.retreatMoraleThreshold !== undefined) UnitConfigUpdate.addRetreatMoraleThreshold(builder, cfg.retreatMoraleThreshold);
    if (cfg.squadCohesionLeashRange !== undefined) UnitConfigUpdate.addSquadCohesionLeashRange(builder, cfg.squadCohesionLeashRange);

    // Vitals & Shields
    if (cfg.shieldBase !== undefined) UnitConfigUpdate.addShieldBase(builder, cfg.shieldBase);
    if (cfg.hullBase !== undefined) UnitConfigUpdate.addHullBase(builder, cfg.hullBase);
    if (cfg.quadrantShieldingEnabled !== undefined) UnitConfigUpdate.addQuadrantShieldingEnabled(builder, cfg.quadrantShieldingEnabled);
    if (cfg.quadrantShieldPoolsEnabled !== undefined) UnitConfigUpdate.addQuadrantShieldPoolsEnabled(builder, cfg.quadrantShieldPoolsEnabled);
    if (cfg.quadrantHullPoolsEnabled !== undefined) UnitConfigUpdate.addQuadrantHullPoolsEnabled(builder, cfg.quadrantHullPoolsEnabled);
    if (cfg.shieldRegenRate !== undefined) UnitConfigUpdate.addShieldRegenRate(builder, cfg.shieldRegenRate);
    if (cfg.shieldRechargeDelayTicks !== undefined) UnitConfigUpdate.addShieldRechargeDelayTicks(builder, cfg.shieldRechargeDelayTicks);
    if (cfg.directionalShieldArc !== undefined) UnitConfigUpdate.addDirectionalShieldArc(builder, cfg.directionalShieldArc);
    if (cfg.armorMitigation !== undefined) UnitConfigUpdate.addArmorMitigation(builder, cfg.armorMitigation);
    if (cfg.armorHardnessRating !== undefined) UnitConfigUpdate.addArmorHardnessRating(builder, cfg.armorHardnessRating);
    if (cfg.ablativePlatingDurability !== undefined) UnitConfigUpdate.addAblativePlatingDurability(builder, cfg.ablativePlatingDurability);

    // Movement & Physics
    if (cfg.speed !== undefined) UnitConfigUpdate.addSpeed(builder, cfg.speed);
    if (cfg.strafingSpeed !== undefined) UnitConfigUpdate.addStrafingSpeed(builder, cfg.strafingSpeed);
    if (cfg.turnRate !== undefined) UnitConfigUpdate.addTurnRate(builder, cfg.turnRate);
    if (cfg.angularVelocity !== undefined) UnitConfigUpdate.addAngularVelocity(builder, cfg.angularVelocity);
    if (cfg.lateralThrustPower !== undefined) UnitConfigUpdate.addLateralThrustPower(builder, cfg.lateralThrustPower);
    if (cfg.reverseThrustPower !== undefined) UnitConfigUpdate.addReverseThrustPower(builder, cfg.reverseThrustPower);
    if (cfg.driftCoefficient !== undefined) UnitConfigUpdate.addDriftCoefficient(builder, cfg.driftCoefficient);
    if (cfg.accelerationCurve !== undefined) UnitConfigUpdate.addAccelerationCurve(builder, cfg.accelerationCurve);

    // Combat & Ballistics
    if (cfg.dps !== undefined) UnitConfigUpdate.addDps(builder, cfg.dps);
    if (cfg.maxCooldown !== undefined) UnitConfigUpdate.addMaxCooldown(builder, cfg.maxCooldown);
    if (cfg.projectileRange !== undefined) UnitConfigUpdate.addProjectileRange(builder, cfg.projectileRange);
    if (cfg.projectileSpeed !== undefined) UnitConfigUpdate.addProjectileSpeed(builder, cfg.projectileSpeed);
    if (cfg.optimalRange !== undefined) UnitConfigUpdate.addOptimalRange(builder, cfg.optimalRange);
    if (cfg.maxRange !== undefined) UnitConfigUpdate.addMaxRange(builder, cfg.maxRange);
    if (cfg.engagementRangeCap !== undefined) UnitConfigUpdate.addEngagementRangeCap(builder, cfg.engagementRangeCap);
    if (cfg.ammoCapacity !== undefined) UnitConfigUpdate.addAmmoCapacity(builder, cfg.ammoCapacity);
    if (cfg.initialOrdnanceCapacity !== undefined) UnitConfigUpdate.addInitialOrdnanceCapacity(builder, cfg.initialOrdnanceCapacity);
    if (cfg.turretTraverseSpeed !== undefined) UnitConfigUpdate.addTurretTraverseSpeed(builder, cfg.turretTraverseSpeed);
    if (cfg.weaponDispersionBloom !== undefined) UnitConfigUpdate.addWeaponDispersionBloom(builder, cfg.weaponDispersionBloom);
    if (cfg.projectileTrackingCapability !== undefined) UnitConfigUpdate.addProjectileTrackingCapability(builder, cfg.projectileTrackingCapability);
    if (cfg.shieldPenetrationFactor !== undefined) UnitConfigUpdate.addShieldPenetrationFactor(builder, cfg.shieldPenetrationFactor);
    if (cfg.sustainedFireLimitSeconds !== undefined) UnitConfigUpdate.addSustainedFireLimitSeconds(builder, cfg.sustainedFireLimitSeconds);
    if (cfg.barrelCoolingDurationSeconds !== undefined) UnitConfigUpdate.addBarrelCoolingDurationSeconds(builder, cfg.barrelCoolingDurationSeconds);
    if (cfg.burstSalvoCooldown !== undefined) UnitConfigUpdate.addBurstSalvoCooldown(builder, cfg.burstSalvoCooldown);
    if (cfg.beamRaycastDuration !== undefined) UnitConfigUpdate.addBeamRaycastDuration(builder, cfg.beamRaycastDuration);
    if (cfg.maxThermalCapacity !== undefined) UnitConfigUpdate.addMaxThermalCapacity(builder, cfg.maxThermalCapacity);
    if (cfg.thermalDissipationRate !== undefined) UnitConfigUpdate.addThermalDissipationRate(builder, cfg.thermalDissipationRate);
    if (cfg.powerGridAllocationWeight !== undefined) UnitConfigUpdate.addPowerGridAllocationWeight(builder, cfg.powerGridAllocationWeight);

    // Radar & Stealth
    if (cfg.radarCrossSection !== undefined) UnitConfigUpdate.addRadarCrossSection(builder, cfg.radarCrossSection);
    if (cfg.sensorResolutionTier !== undefined) UnitConfigUpdate.addSensorResolutionTier(builder, cfg.sensorResolutionTier);
    if (cfg.jammingSusceptibility !== undefined) UnitConfigUpdate.addJammingSusceptibility(builder, cfg.jammingSusceptibility);
    if (cfg.targetLockTime !== undefined) UnitConfigUpdate.addTargetLockTime(builder, cfg.targetLockTime);
    if (cfg.radarImmunityActive !== undefined) UnitConfigUpdate.addRadarImmunityActive(builder, cfg.radarImmunityActive);
    if (cfg.shieldGatedStealthThreshold !== undefined) UnitConfigUpdate.addShieldGatedStealthThreshold(builder, cfg.shieldGatedStealthThreshold);
    if (cfg.decloakOnActionFlag !== undefined) UnitConfigUpdate.addDecloakOnActionFlag(builder, cfg.decloakOnActionFlag);
    if (cfg.stealthRecoveryDelaySeconds !== undefined) UnitConfigUpdate.addStealthRecoveryDelaySeconds(builder, cfg.stealthRecoveryDelaySeconds);

    // Logistics & Special Systems
    if (cfg.resourceHarvestingType !== undefined) UnitConfigUpdate.addResourceHarvestingType(builder, cfg.resourceHarvestingType);
    if (cfg.requiresReconTelemetry !== undefined) UnitConfigUpdate.addRequiresReconTelemetry(builder, cfg.requiresReconTelemetry);
    if (cfg.requiresAnchorDrone !== undefined) UnitConfigUpdate.addRequiresAnchorDrone(builder, cfg.requiresAnchorDrone);
    if (cfg.requiresReconAnchor !== undefined) UnitConfigUpdate.addRequiresReconAnchor(builder, cfg.requiresReconAnchor);
    if (cfg.portDockingBayStatus !== undefined) UnitConfigUpdate.addPortDockingBayStatus(builder, cfg.portDockingBayStatus);
    if (cfg.starboardDeploymentBayStatus !== undefined) UnitConfigUpdate.addStarboardDeploymentBayStatus(builder, cfg.starboardDeploymentBayStatus);
    if (cfg.salvageableUponDestruction !== undefined) UnitConfigUpdate.addSalvageableUponDestruction(builder, cfg.salvageableUponDestruction);
    if (cfg.cryoGasRadius !== undefined) UnitConfigUpdate.addCryoGasRadius(builder, cfg.cryoGasRadius);
    if (cfg.cryoEffectDuration !== undefined) UnitConfigUpdate.addCryoEffectDuration(builder, cfg.cryoEffectDuration);
    if (cfg.gravitonVortexDuration !== undefined) UnitConfigUpdate.addGravitonVortexDuration(builder, cfg.gravitonVortexDuration);
    if (cfg.warpCanisterCapacity !== undefined) UnitConfigUpdate.addWarpCanisterCapacity(builder, cfg.warpCanisterCapacity);
    if (cfg.emergencyWarpEvacuationTarget !== undefined) UnitConfigUpdate.addEmergencyWarpEvacuationTarget(builder, cfg.emergencyWarpEvacuationTarget);

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
