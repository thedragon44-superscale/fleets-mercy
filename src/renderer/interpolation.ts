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

export function getInterpolatedUnits<T extends InterpolatableUnit>(
  serverHistory: InterpolationSnapshot<T>[],
  renderTime: number
): T[] {
  if (!serverHistory || serverHistory.length === 0) return [];
  if (serverHistory.length === 1) return serverHistory[0].units;

  const renderDelay = useSettingsStore.getState().renderDelay;
  const targetTime = renderTime - renderDelay;

  const first = serverHistory[0];
  const last = serverHistory[serverHistory.length - 1];

  // Clamp cleanly when targetTime falls outside the buffered window
  if (targetTime <= first.timestamp) return first.units;
  if (targetTime >= last.timestamp) return last.units;

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

  const olderById = new Map<string, T>();
  for (let i = 0; i < older.units.length; i++) {
    const u = older.units[i];
    olderById.set(u.id, u);
  }

  return newer.units.map((newUnit) => {
    const oldUnit = olderById.get(newUnit.id);
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
