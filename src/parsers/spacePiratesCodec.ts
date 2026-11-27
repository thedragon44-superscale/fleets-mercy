// src/parsers/spacePiratesCodec.ts
import * as flatbuffersNS from 'flatbuffers';
import { ClientActionType } from '../generated/space-pirates/client-action-type';
import { EnvComponentKind } from '../generated/space-pirates/env-component-kind';
import { EnvObjectType } from '../generated/space-pirates/env-object-type';
import { Hull } from '../generated/space-pirates/hull';
import { ResourceType } from '../generated/space-pirates/resource-type';
import { Shields } from '../generated/space-pirates/shields';
import { SPAsteroidNode } from '../generated/space-pirates/spasteroid-node';
import { SPClientAction } from '../generated/space-pirates/spclient-action';
import { SPCryoCloud } from '../generated/space-pirates/spcryo-cloud';
import { SPEnvComponent } from '../generated/space-pirates/spenv-component';
import { SPEnvObject } from '../generated/space-pirates/spenv-object';
import { SPPayoutEvent } from '../generated/space-pirates/sppayout-event';
import { SPProjectile } from '../generated/space-pirates/spprojectile';
import { SPSeatState } from '../generated/space-pirates/spseat-state';
import { SPServerState } from '../generated/space-pirates/spserver-state';
import { SPUnit } from '../generated/space-pirates/spunit';
import { Vec2 } from '../generated/space-pirates/vec2';

export { ClientActionType, EnvComponentKind, EnvObjectType, ResourceType };

// Safe interop fallback for Vite / CJS bundling of flatbuffers
const FB = (flatbuffersNS as any).Flatbuffers || flatbuffersNS;
const ByteBuffer = FB.ByteBuffer || (flatbuffersNS as any).ByteBuffer;
const Builder = FB.Builder || flatbuffersNS.Builder;

export interface SPVec2 {
  x: number;
  y: number;
}

export interface SPQuadrantVitals {
  front: number;
  rear: number;
  port: number;
  starboard: number;
}

export interface SPUnitSnapshot {
  id: string;
  unitType: string;
  ownerId: string;
  seatIndex: number;
  isHouse: boolean;
  pos: SPVec2;
  vel: SPVec2;
  angle: number;
  shields: SPQuadrantVitals;
  hull: SPQuadrantVitals;
  isFiring: boolean;
  isSquadLeader: boolean;
  squadId: number;
  aiState: string;
  currentAmmo: number;
  maxAmmo: number;
  betMultiplier: number;
  resourceType: ResourceType;
  cargoRatio: number;
  currentBountyCents: number;
  isStealthed: boolean;
}

export interface SPProjectileSnapshot {
  id: string;
  ownerId: string;
  seatIndex: number;
  isHouse: boolean;
  projType: string;
  pos: SPVec2;
  vel: SPVec2;
  betMultiplier: number;
}

export interface SPAsteroidNodeSnapshot {
  id: number;
  clusterId: number;
  pos: SPVec2;
  vel: SPVec2;
  radius: number;
  isNode: boolean;
  resourceType: ResourceType;
}

export interface SPEnvComponentSnapshot {
  id: number;
  kind: EnvComponentKind;
  pos: SPVec2;
  vel: SPVec2;
  radius: number;
  innerRadius: number;
  isNode: boolean;
  resourceType: ResourceType;
  colorHex: string;
}

export interface SPEnvObjectSnapshot {
  id: number;
  blueprintId: number;
  objectType: EnvObjectType;
  pos: SPVec2;
  vel: SPVec2;
  angle: number;
  boundingRadius: number;
  parentObjectId: number;
  orbitRadius: number;
  components: SPEnvComponentSnapshot[];
}

export interface SPCryoCloudSnapshot {
  id: number;
  ownerId: string;
  seatIndex: number;
  pos: SPVec2;
  radius: number;
  remainingTicks: number;
  maxTicks: number;
}

export interface SPSeatSnapshot {
  seatIndex: number;
  occupied: boolean;
  playerId: number;
  username: string;
  balanceCents: number;
  activeMultiplier: number;
  activeUnitCount: number;
}

export interface SPPayoutEventSnapshot {
  eventId: number;
  seatIndex: number;
  unitType: string;
  pos: SPVec2;
  payoutCents: number;
  multiplier: number;
  wasBoss: boolean;
}

export interface SPServerStateSnapshot {
  tick: number;
  tableId: string;
  arenaWidth: number;
  arenaHeight: number;
  units: SPUnitSnapshot[];
  projectiles: SPProjectileSnapshot[];
  asteroids: SPAsteroidNodeSnapshot[];
  envObjects: SPEnvObjectSnapshot[];
  cryoClouds: SPCryoCloudSnapshot[];
  seats: SPSeatSnapshot[];
  payoutEvents: SPPayoutEventSnapshot[];
  bossMeterCurrent: number;
  bossMeterThreshold: number;
  bossActive: boolean;
  bossEscapeTicksRemaining: number;
}

export interface SPClientActionParams {
  action: ClientActionType;
  playerId?: number;
  seatIndex?: number;
  multiplier?: number;
  unitType?: string;
}

// Reusable FlatBuffers accessor objects (zero per-frame wrapper allocations at 60Hz)
const _root = new SPServerState();
const _unit = new SPUnit();
const _proj = new SPProjectile();
const _rock = new SPAsteroidNode();
const _envObj = new SPEnvObject();
const _envComp = new SPEnvComponent();
const _cloud = new SPCryoCloud();
const _seat = new SPSeatState();
const _payout = new SPPayoutEvent();
const _pos = new Vec2();
const _vel = new Vec2();
const _shields = new Shields();
const _hull = new Hull();

export function decodeSPServerState(buffer: ArrayBuffer | Uint8Array): SPServerStateSnapshot | null {
  try {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    if (bytes.byteLength < 8) {
      return null;
    }

    const bb = new ByteBuffer(bytes);
    const state = SPServerState.getRootAsSPServerState(bb, _root);

    // 1. Units
    const unitsLen = state.unitsLength();
    const units: SPUnitSnapshot[] = new Array(unitsLen);
    for (let i = 0; i < unitsLen; i++) {
      const u = state.units(i, _unit)!;
      const pos = u.pos(_pos);
      const vel = u.vel(_vel);
      const sh = u.shields(_shields);
      const hu = u.hull(_hull);

      units[i] = {
        id: u.id() || '',
        unitType: u.unitType() || '',
        ownerId: u.ownerId() || '',
        seatIndex: u.seatIndex(),
        isHouse: u.isHouse(),
        pos: { x: pos ? pos.x() : 0, y: pos ? pos.y() : 0 },
        vel: { x: vel ? vel.x() : 0, y: vel ? vel.y() : 0 },
        angle: u.angle(),
        shields: {
          front: sh ? sh.front() : 0,
          rear: sh ? sh.rear() : 0,
          port: sh ? sh.port() : 0,
          starboard: sh ? sh.starboard() : 0,
        },
        hull: {
          front: hu ? hu.front() : 0,
          rear: hu ? hu.rear() : 0,
          port: hu ? hu.port() : 0,
          starboard: hu ? hu.starboard() : 0,
        },
        isFiring: u.isFiring(),
        isSquadLeader: u.isSquadLeader(),
        squadId: u.squadId(),
        aiState: u.aiState() || '',
        currentAmmo: u.currentAmmo(),
        maxAmmo: u.maxAmmo(),
        betMultiplier: u.betMultiplier(),
        resourceType: u.resourceType(),
        cargoRatio: u.cargoRatio(),
        currentBountyCents: Number(u.currentBountyCents()),
        isStealthed: u.isStealthed(),
      };
    }

    // 2. Projectiles
    const projLen = state.projectilesLength();
    const projectiles: SPProjectileSnapshot[] = new Array(projLen);
    for (let i = 0; i < projLen; i++) {
      const p = state.projectiles(i, _proj)!;
      const pos = p.pos(_pos);
      const vel = p.vel(_vel);

      projectiles[i] = {
        id: p.id() || '',
        ownerId: p.ownerId() || '',
        seatIndex: p.seatIndex(),
        isHouse: p.isHouse(),
        projType: p.projType() || 'laser',
        pos: { x: pos ? pos.x() : 0, y: pos ? pos.y() : 0 },
        vel: { x: vel ? vel.x() : 0, y: vel ? vel.y() : 0 },
        betMultiplier: p.betMultiplier(),
      };
    }

    // 3. Legacy Asteroids projection
    const rockLen = state.asteroidsLength();
    const asteroids: SPAsteroidNodeSnapshot[] = new Array(rockLen);
    for (let i = 0; i < rockLen; i++) {
      const a = state.asteroids(i, _rock)!;
      const pos = a.pos(_pos);
      const vel = a.vel(_vel);

      asteroids[i] = {
        id: a.id(),
        clusterId: a.clusterId(),
        pos: { x: pos ? pos.x() : 0, y: pos ? pos.y() : 0 },
        vel: { x: vel ? vel.x() : 0, y: vel ? vel.y() : 0 },
        radius: a.radius(),
        isNode: a.isNode(),
        resourceType: a.resourceType(),
      };
    }

    // 4. Universal EnvObjects & nested EnvComponents
    const envLen = state.envObjectsLength();
    const envObjects: SPEnvObjectSnapshot[] = new Array(envLen);
    for (let i = 0; i < envLen; i++) {
      const eo = state.envObjects(i, _envObj)!;
      const ePos = eo.pos(_pos);
      const eVel = eo.vel(_vel);
      const ox = ePos ? ePos.x() : 0;
      const oy = ePos ? ePos.y() : 0;
      const ovx = eVel ? eVel.x() : 0;
      const ovy = eVel ? eVel.y() : 0;

      const cLen = eo.componentsLength();
      const components: SPEnvComponentSnapshot[] = new Array(cLen);
      for (let j = 0; j < cLen; j++) {
        const ec = eo.components(j, _envComp)!;
        const cPos = ec.pos(_pos);
        const cVel = ec.vel(_vel);
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
        boundingRadius: eo.boundingRadius(),
        parentObjectId: eo.parentObjectId(),
        orbitRadius: eo.orbitRadius(),
        components,
      };
    }

    // 5. Cryo Clouds
    const cloudLen = state.cryoCloudsLength();
    const cryoClouds: SPCryoCloudSnapshot[] = new Array(cloudLen);
    for (let i = 0; i < cloudLen; i++) {
      const c = state.cryoClouds(i, _cloud)!;
      const pos = c.pos(_pos);

      cryoClouds[i] = {
        id: c.id(),
        ownerId: c.ownerId() || '',
        seatIndex: c.seatIndex(),
        pos: { x: pos ? pos.x() : 0, y: pos ? pos.y() : 0 },
        radius: c.radius(),
        remainingTicks: c.remainingTicks(),
        maxTicks: c.maxTicks(),
      };
    }

    // 6. Seats
    const seatsLen = state.seatsLength();
    const seats: SPSeatSnapshot[] = new Array(seatsLen);
    for (let i = 0; i < seatsLen; i++) {
      const s = state.seats(i, _seat)!;
      seats[i] = {
        seatIndex: s.seatIndex(),
        occupied: s.occupied(),
        playerId: s.playerId(),
        username: s.username() || '',
        balanceCents: Number(s.balanceCents()),
        activeMultiplier: s.activeMultiplier(),
        activeUnitCount: s.activeUnitCount(),
      };
    }

    // 7. Payout Events
    const payLen = state.payoutEventsLength();
    const payoutEvents: SPPayoutEventSnapshot[] = new Array(payLen);
    for (let i = 0; i < payLen; i++) {
      const ev = state.payoutEvents(i, _payout)!;
      const pos = ev.pos(_pos);

      payoutEvents[i] = {
        eventId: Number(ev.eventId()),
        seatIndex: ev.seatIndex(),
        unitType: ev.unitType() || '',
        pos: { x: pos ? pos.x() : 0, y: pos ? pos.y() : 0 },
        payoutCents: Number(ev.payoutCents()),
        multiplier: ev.multiplier(),
        wasBoss: ev.wasBoss(),
      };
    }

    return {
      tick: Number(state.tick()),
      tableId: state.tableId() || '',
      arenaWidth: state.arenaWidth(),
      arenaHeight: state.arenaHeight(),
      units,
      projectiles,
      asteroids,
      envObjects,
      cryoClouds,
      seats,
      payoutEvents,
      bossMeterCurrent: state.bossMeterCurrent(),
      bossMeterThreshold: state.bossMeterThreshold(),
      bossActive: state.bossActive(),
      bossEscapeTicksRemaining: state.bossEscapeTicksRemaining(),
    };
  } catch (err) {
    console.error('[SP CODEC] Failed to decode SPServerState:', err);
    return null;
  }
}

export function encodeSPClientAction(params: SPClientActionParams): Uint8Array<ArrayBuffer> {
  const builder = new Builder(128);
  const unitTypeOffset = params.unitType ? builder.createString(params.unitType) : 0;

  SPClientAction.startSPClientAction(builder);
  SPClientAction.addAction(builder, params.action);
  if (params.playerId !== undefined) {
    SPClientAction.addPlayerId(builder, params.playerId);
  }
  if (params.seatIndex !== undefined) {
    SPClientAction.addSeatIndex(builder, params.seatIndex);
  }
  if (params.multiplier !== undefined) {
    SPClientAction.addMultiplier(builder, params.multiplier);
  }
  if (unitTypeOffset) {
    SPClientAction.addUnitType(builder, unitTypeOffset);
  }

  const root = SPClientAction.endSPClientAction(builder);
  builder.finish(root);
  return builder.asUint8Array() as Uint8Array<ArrayBuffer>;
}

export function encodeJoinSeat(playerId: number, seatIndex = -1): Uint8Array<ArrayBuffer> {
  return encodeSPClientAction({
    action: ClientActionType.JoinSeat,
    playerId,
    seatIndex,
  });
}

export function encodeLeaveSeat(): Uint8Array<ArrayBuffer> {
  return encodeSPClientAction({
    action: ClientActionType.LeaveSeat,
  });
}

export function encodeSetMultiplier(multiplier: number): Uint8Array<ArrayBuffer> {
  return encodeSPClientAction({
    action: ClientActionType.SetMultiplier,
    multiplier,
  });
}

export function encodeDeployUnit(unitType: string): Uint8Array<ArrayBuffer> {
  return encodeSPClientAction({
    action: ClientActionType.DeployUnit,
    unitType,
  });
}
