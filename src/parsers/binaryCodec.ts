// src/parsers/binaryCodec.ts
import * as flatbuffersNS from "flatbuffers";
import { ServerState } from "../generated/space-tactics/server-state";
import { FleetUnit } from "../generated/space-tactics/fleet-unit";
import { Projectile } from "../generated/space-tactics/projectile";
import { Shields } from "../generated/space-tactics/shields";
import { Hull } from "../generated/space-tactics/hull";
import { ClientInput } from "../generated/space-tactics/client-input";
import { UnitConfigUpdate } from "../generated/space-tactics/unit-config-update";
import { UnitGroupingPayload } from "../generated/space-tactics/unit-grouping-payload";
import { SandboxCountPair } from "../generated/space-tactics/sandbox-count-pair";
import { SandboxTimeControl } from "../generated/space-tactics/sandbox-time-control";
import { EnvObject } from "../generated/space-tactics/env-object";
import { EnvComponent } from "../generated/space-tactics/env-component";
import { EnvObjectType } from "../generated/space-tactics/env-object-type";
import { EnvComponentKind } from "../generated/space-tactics/env-component-kind";
import { Vector2D as FBVector2D } from "../generated/space-tactics/vector2d";

export { EnvObjectType, EnvComponentKind };

export interface Vector2D {
  x: number;
  y: number;
}

export interface QuadrantStats {
  front: number;
  rear: number;
  port: number;
  starboard: number;
}

export interface SnapshotUnit {
  id: string;
  type: string;
  ownerId: string;
  pos: Vector2D;
  vel: Vector2D;
  angle: number;
  shields: QuadrantStats;
  hull: QuadrantStats;
  isDestroyed: boolean;
  isSquadLeader: boolean;
  isFiring: boolean;
  battalionId: number;
  squadId: number;
  visionRange: number;
  aiState: string;
  currentThermal: number;
  currentAmmo: number;
  isStealthed: boolean;
}

export interface SnapshotProjectile {
  id: string;
  ownerId: string;
  type: string;
  pos: Vector2D;
  vel: Vector2D;
}

export interface SnapshotEnvComponent {
  id: number;
  kind: EnvComponentKind;
  pos: Vector2D;
  vel: Vector2D;
  radius: number;
  innerRadius: number;
  isNode: boolean;
  resourceType: number;
  colorHex: string;
}

export interface SnapshotEnvObject {
  id: number;
  blueprintId: number;
  objectType: EnvObjectType;
  pos: Vector2D;
  vel: Vector2D;
  angle: number;
  scale: number;
  boundingRadius: number;
  parentObjectId: number;
  orbitRadius: number;
  components: SnapshotEnvComponent[];
}

export interface ServerStateSnapshot {
  tick: number | bigint;
  units: SnapshotUnit[];
  projectiles: SnapshotProjectile[];
  envObjects: SnapshotEnvObject[];
  mapBounds: {
    width: number;
    height: number;
  };
  isGameOver: boolean;
  winningFaction: string;
}

// Reusable FlatBuffers accessors for zero-churn 60Hz decoding
const _serverState = new ServerState();
const _unit = new FleetUnit();
const _proj = new Projectile();
const _shields = new Shields();
const _hull = new Hull();
const _envObj = new EnvObject();
const _envComp = new EnvComponent();
const _envPos = new FBVector2D();
const _envVel = new FBVector2D();

// Safe interop fallback for Vite / CJS package bundling of flatbuffers
const FB = (flatbuffersNS as any).Flatbuffers || flatbuffersNS;
const ByteBuffer = FB.ByteBuffer || (flatbuffersNS as any).ByteBuffer;
const Builder = FB.Builder || flatbuffersNS.Builder;

/**
 * ==========================================
 * DOWNSTREAM: Unpack Server Binary Message
 * ==========================================
 */
export function unpackServerBinaryMessage(arrayBuffer: ArrayBuffer): ServerStateSnapshot | null {
  try {
    const uint8Array = new Uint8Array(arrayBuffer);
    const bb = new ByteBuffer(uint8Array);
    const serverState = ServerState.getRootAsServerState(bb, _serverState);

    const mapWidth = serverState.mapWidth();
    const mapHeight = serverState.mapHeight();
    const isGameOver = serverState.isGameOver();
    const winningFaction = serverState.winningFaction() || '';

    // Parse Fleet Units (reusing FlatBuffers wrapper instances)
    const unitsLength = serverState.unitsLength();
    const units: SnapshotUnit[] = new Array(unitsLength);
    let unitOut = 0;
    for (let i = 0; i < unitsLength; i++) {
      const u = serverState.units(i, _unit);
      if (!u) continue;

      const pos = u.pos(_envPos);
      const vel = u.vel(_envVel);
      const shields = u.shields(_shields);
      const hull = u.hull(_hull);

      units[unitOut++] = {
        id: u.id() || '',
        type: u.type() || 'default',
        ownerId: u.ownerId() || 'enemy',
        pos: { x: pos ? pos.x() : 0, y: pos ? pos.y() : 0 },
        vel: { x: vel ? vel.x() : 0, y: vel ? vel.y() : 0 },
        angle: u.angle(),
        shields: {
          front: shields ? shields.front() : 0,
          rear: shields ? shields.rear() : 0,
          port: shields ? shields.port() : 0,
          starboard: shields ? shields.starboard() : 0,
        },
        hull: {
          front: hull ? hull.front() : 0,
          rear: hull ? hull.rear() : 0,
          port: hull ? hull.port() : 0,
          starboard: hull ? hull.starboard() : 0,
        },
        isDestroyed: u.isDestroyed(),
        isSquadLeader: u.isSquadLeader(),
        isFiring: u.isFiring(),
        battalionId: u.battalionId(),
        squadId: u.squadId(),
        visionRange: u.visionRange(),
        aiState: u.aiState() || '',
        currentThermal: u.currentThermal(),
        currentAmmo: u.currentAmmo(),
        isStealthed: u.isStealthed(),
      };
    }
    if (unitOut !== unitsLength) units.length = unitOut;

    // Parse Projectiles (reusing FlatBuffers wrapper instances)
    const projLength = serverState.projectilesLength();
    const projectiles: SnapshotProjectile[] = new Array(projLength);
    let projOut = 0;
    for (let i = 0; i < projLength; i++) {
      const p = serverState.projectiles(i, _proj);
      if (!p) continue;

      const pos = p.pos(_envPos);
      const vel = p.vel(_envVel);
      projectiles[projOut++] = {
        id: p.id() || '',
        ownerId: p.ownerId() || '',
        type: p.type() || 'player',
        pos: { x: pos ? pos.x() : 0, y: pos ? pos.y() : 0 },
        vel: { x: vel ? vel.x() : 0, y: vel ? vel.y() : 0 },
      };
    }
    if (projOut !== projLength) projectiles.length = projOut;

    // Parse Universal Environmental Objects
    const envLen = serverState.envObjectsLength();
    const envObjects: SnapshotEnvObject[] = new Array(envLen);
    for (let i = 0; i < envLen; i++) {
      const eo = serverState.envObjects(i, _envObj)!;
      const ePos = eo.pos(_envPos);
      const eVel = eo.vel(_envVel);
      const ox = ePos ? ePos.x() : 0;
      const oy = ePos ? ePos.y() : 0;
      const ovx = eVel ? eVel.x() : 0;
      const ovy = eVel ? eVel.y() : 0;

      const cLen = eo.componentsLength();
      const components: SnapshotEnvComponent[] = new Array(cLen);
      for (let j = 0; j < cLen; j++) {
        const ec = eo.components(j, _envComp)!;
        const cPos = ec.pos(_envPos);
        const cVel = ec.vel(_envVel);
        components[j] = {
          id: ec.id(),
          kind: ec.kind(),
          pos: { x: cPos ? cPos.x() : 0, y: cPos ? cPos.y() : 0 },
          vel: { x: cVel ? cVel.x() : 0, y: cVel ? cVel.y() : 0 },
          radius: ec.radius(),
          innerRadius: ec.innerRadius(),
          isNode: ec.isNode(),
          resourceType: ec.resourceType(),
          colorHex: ec.colorHex() || '',
        };
      }

      envObjects[i] = {
        id: eo.id(),
        blueprintId: eo.blueprintId(),
        objectType: eo.objectType(),
        pos: { x: ox, y: oy },
        vel: { x: ovx, y: ovy },
        angle: eo.angle(),
        scale: eo.scale() || 1,
        boundingRadius: eo.boundingRadius(),
        parentObjectId: eo.parentObjectId(),
        orbitRadius: eo.orbitRadius(),
        components,
      };
    }

    return {
      tick: serverState.tick(),
      units,
      projectiles,
      envObjects,
      mapBounds: {
        width: mapWidth,
        height: mapHeight,
      },
      isGameOver,
      winningFaction,
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
  sandboxSpawnOwner?: string;
  sandboxRemove?: string;
  spawnX?: number;
  spawnY?: number;
  isPaused?: boolean;
  timeScale?: number;
  sandboxCounts?: Array<{
    unitType: string;
    count: number;
    ownerId: string;
  }>;
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
      sensorRange?: number;
      radarCrossSection?: number;
      sensorResolutionTier?: number;
      jammingSusceptibility?: number;
      targetLockTime?: number;
      radarImmunityActive?: boolean;
      shieldGatedStealthThreshold?: number;
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
}): Uint8Array<ArrayBuffer> {
  const builder = new Builder(1024);

  // 1. Create string offsets
  const controlledIdOffset = actionParams.currentId ? builder.createString(actionParams.currentId) : 0;
  const deployOffset = actionParams.deploy ? builder.createString(actionParams.deploy) : 0;
  const sandboxSpawnOffset = actionParams.sandboxSpawn ? builder.createString(actionParams.sandboxSpawn) : 0;
  const sandboxSpawnOwnerOffset = actionParams.sandboxSpawnOwner ? builder.createString(actionParams.sandboxSpawnOwner) : 0;
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
    if (cfg.sensorRange !== undefined) UnitConfigUpdate.addSensorRange(builder, cfg.sensorRange);
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
  if (actionParams.sandboxCounts && actionParams.sandboxCounts.length > 0) {
    const pairOffsets = actionParams.sandboxCounts.map((item) => {
      const typeOffset = builder.createString(item.unitType);
      const ownerOffset = builder.createString(item.ownerId || 'player');

      SandboxCountPair.startSandboxCountPair(builder);
      SandboxCountPair.addUnitType(builder, typeOffset);
      SandboxCountPair.addCount(builder, item.count);
      SandboxCountPair.addOwnerId(builder, ownerOffset);
      return SandboxCountPair.endSandboxCountPair(builder);
    });

    ClientInput.startSandboxCountsVector(builder, pairOffsets.length);
    for (let i = pairOffsets.length - 1; i >= 0; i--) {
      builder.addOffset(pairOffsets[i]);
    }
    countsVectorOffset = builder.endVector();
  }

  // 5. Build Sandbox Time Control Sub-Table (only when explicitly changed)
  let timeControlOffset = 0;
  if (actionParams.isPaused !== undefined || actionParams.timeScale !== undefined) {
    SandboxTimeControl.startSandboxTimeControl(builder);
    if (actionParams.isPaused !== undefined) {
      SandboxTimeControl.addIsPaused(builder, actionParams.isPaused);
    }
    if (actionParams.timeScale !== undefined) {
      SandboxTimeControl.addTimeScale(builder, actionParams.timeScale);
    }
    timeControlOffset = SandboxTimeControl.endSandboxTimeControl(builder);
  }

  // 6. Build Root ClientInput Table
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
  if (sandboxSpawnOwnerOffset) ClientInput.addSandboxSpawnOwner(builder, sandboxSpawnOwnerOffset);
  if (sandboxRemoveOffset) ClientInput.addSandboxRemove(builder, sandboxRemoveOffset);

  if (actionParams.spawnX !== undefined) ClientInput.addSpawnX(builder, actionParams.spawnX);
  if (actionParams.spawnY !== undefined) ClientInput.addSpawnY(builder, actionParams.spawnY);

  if (countsVectorOffset) ClientInput.addSandboxCounts(builder, countsVectorOffset);
  if (templateTypeOffset) ClientInput.addTemplateOverrideType(builder, templateTypeOffset);
  if (templateConfigOffset) ClientInput.addTemplateOverrideConfig(builder, templateConfigOffset);
  if (groupingOffset) ClientInput.addUnitGrouping(builder, groupingOffset);
  if (timeControlOffset) ClientInput.addTimeControl(builder, timeControlOffset);

  const root = ClientInput.endClientInput(builder);
  builder.finish(root);

  return builder.asUint8Array() as Uint8Array<ArrayBuffer>;
}
