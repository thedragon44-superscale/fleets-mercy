// src/renderer/interpolation.ts
import { useSettingsStore } from '../config/settingsStore';

export interface InterpolatableUnit {
  id: string;
  pos: { x: number; y: number };
  angle: number;
  vel?: { x: number; y: number };
}

export interface InterpolationSnapshot<T extends InterpolatableUnit = InterpolatableUnit> {
  timestamp: number;
  units: T[];
}

const MAX_EXTRAPOLATION_MS = 60; // Cap dead-reckoning at ~3.6 ticks so paused/stalled servers never drift
const _olderById = new Map<string, InterpolatableUnit>();

export function getInterpolatedUnits<T extends InterpolatableUnit>(
  serverHistory: InterpolationSnapshot<T>[],
  renderTime: number,
  allowExtrapolation = true
): T[] {
  if (!serverHistory || serverHistory.length === 0) return [];
  if (serverHistory.length === 1) return serverHistory[0].units;

  const renderDelay = useSettingsStore.getState().renderDelay;
  const targetTime = renderTime - renderDelay;

  const first = serverHistory[0];
  const last = serverHistory[serverHistory.length - 1];

  // Clamp cleanly when targetTime precedes the oldest snapshot
  if (targetTime <= first.timestamp) return first.units;

  // Bounded velocity dead-reckoning when network jitter briefly exceeds renderDelay
  if (targetTime >= last.timestamp) {
    if (!allowExtrapolation) return last.units;
    const extrapMs = Math.min(MAX_EXTRAPOLATION_MS, targetTime - last.timestamp);
    const extrapTicks = extrapMs * 0.06; // server vel is px per 60Hz tick
    if (extrapTicks <= 0.01) return last.units;

    return last.units.map((u) => {
      const vx = u.vel?.x || 0;
      const vy = u.vel?.y || 0;
      if (vx === 0 && vy === 0) return u;
      return {
        ...u,
        pos: {
          x: u.pos.x + vx * extrapTicks,
          y: u.pos.y + vy * extrapTicks,
        },
      };
    });
  }

  // Locate the two snapshots bracketing targetTime
  let older: InterpolationSnapshot<T> | null = null;
  let newer: InterpolationSnapshot<T> | null = null;

  for (let i = 0; i < serverHistory.length - 1; i++) {
    if (serverHistory[i].timestamp <= targetTime && serverHistory[i + 1].timestamp >= targetTime) {
      older = serverHistory[i];
      newer = serverHistory[i + 1];
      break;
    }
  }

  if (!older || !newer) return last.units;

  const denom = newer.timestamp - older.timestamp;
  if (denom <= 0) return newer.units;

  const alpha = Math.max(0, Math.min(1, (targetTime - older.timestamp) / denom));

  _olderById.clear();
  for (let i = 0; i < older.units.length; i++) {
    const u = older.units[i];
    _olderById.set(u.id, u);
  }

  return newer.units.map((newUnit) => {
    const oldUnit = _olderById.get(newUnit.id) as T | undefined;
    if (!oldUnit) return newUnit;

    const interpolated: T = {
      ...newUnit,
      pos: {
        x: oldUnit.pos.x + (newUnit.pos.x - oldUnit.pos.x) * alpha,
        y: oldUnit.pos.y + (newUnit.pos.y - oldUnit.pos.y) * alpha,
      },
      angle: lerpAngle(oldUnit.angle, newUnit.angle, alpha),
    };

    if (oldUnit.vel && newUnit.vel) {
      interpolated.vel = {
        x: oldUnit.vel.x + (newUnit.vel.x - oldUnit.vel.x) * alpha,
        y: oldUnit.vel.y + (newUnit.vel.y - oldUnit.vel.y) * alpha,
      };
    }

    return interpolated;
  });
}

function lerpAngle(a: number, b: number, t: number): number {
  const twoPi = Math.PI * 2;
  let diff = (b - a) % twoPi;
  if (diff > Math.PI) diff -= twoPi;
  if (diff < -Math.PI) diff += twoPi;
  return a + diff * t;
}
