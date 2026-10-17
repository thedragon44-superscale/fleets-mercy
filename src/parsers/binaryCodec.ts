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
      projectiles[i] = {
        id: p.id() || '',
        ownerId: p.ownerId() || '',
        type: p.type() || 'player',
        pos: { x: pos?.x() || 0, y: pos?.y() || 0 },
      };
    }

    return {
      tick,
      units,
      projectiles,
      mapWidth,
      mapHeight,
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
      speed?: number;
      dps?: number;
      maxCooldown?: number;
      visionRange?: number;
      maxThermalCapacity?: number;
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
    if (cfg.speed !== undefined) UnitConfigUpdate.addSpeed(builder, cfg.speed);
    if (cfg.dps !== undefined) UnitConfigUpdate.addDps(builder, cfg.dps);
    if (cfg.maxCooldown !== undefined) UnitConfigUpdate.addMaxCooldown(builder, cfg.maxCooldown);
    if (cfg.visionRange !== undefined) UnitConfigUpdate.addVisionRange(builder, cfg.visionRange);
    if (cfg.maxThermalCapacity !== undefined) UnitConfigUpdate.addMaxThermalCapacity(builder, cfg.maxThermalCapacity);
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
      builder.prepedOffset(pairOffsets[i]); // or direct vector prepend depending on TS generator
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
