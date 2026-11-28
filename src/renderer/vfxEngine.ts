// src/renderer/vfxEngine.ts
// Zero-GC pre-allocated combat VFX & particle engine for Canvas2DRenderer.
// Reactively detects unit destruction, shield impacts, weapon muzzle flashes, and
// engine ion exhaust trails from consecutive ViewportFrameState snapshots.

import { useSettingsStore } from '../config/settingsStore';
import type { WorldBounds } from './viewportCamera';
import type { RenderUnit } from './viewportRenderer';
import { GlowColor, getGlowSprite } from './vfxSprites';

const MAX_PARTICLES = 1200;
const MAX_RINGS = 64;

const COLOR_LIST: readonly GlowColor[] = [
  'cyan',
  'blue',
  'amber',
  'rose',
  'violet',
  'ice',
  'emerald',
  'white',
];

const COLOR_INDEX: Record<GlowColor, number> = {
  cyan: 0,
  blue: 1,
  amber: 2,
  rose: 3,
  violet: 4,
  ice: 5,
  emerald: 6,
  white: 7,
};

const CORE_HEX: readonly string[] = [
  '#e0f2fe',
  '#dbeafe',
  '#fef3c7',
  '#ffe4e6',
  '#f3e8ff',
  '#f0f9ff',
  '#d1fae5',
  '#ffffff',
];

const RING_RGB: readonly string[] = [
  '34, 211, 238',
  '96, 165, 250',
  '251, 191, 36',
  '251, 113, 133',
  '192, 132, 252',
  '125, 211, 252',
  '52, 211, 153',
  '255, 255, 255',
];

interface TrackedUnit {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  size: number;
  faction: 'player' | 'enemy' | 'neutral';
  shieldRatio: number;
  lastMuzzleMs: number;
  lastSeenFrame: number;
}

export class VfxEngine {
  // Flat typed-array particle pool (zero GC allocations during 60Hz combat)
  private pActive = new Uint8Array(MAX_PARTICLES);
  private pX = new Float32Array(MAX_PARTICLES);
  private pY = new Float32Array(MAX_PARTICLES);
  private pVx = new Float32Array(MAX_PARTICLES);
  private pVy = new Float32Array(MAX_PARTICLES);
  private pLife = new Float32Array(MAX_PARTICLES);
  private pMaxLife = new Float32Array(MAX_PARTICLES);
  private pSize = new Float32Array(MAX_PARTICLES);
  private pDrag = new Float32Array(MAX_PARTICLES);
  private pColor = new Uint8Array(MAX_PARTICLES);
  private pKind = new Uint8Array(MAX_PARTICLES); // 0 = glow spark, 1 = streak ember
  private pCursor = 0;

  // Flat typed-array shockwave & shield ripple ring pool
  private rActive = new Uint8Array(MAX_RINGS);
  private rX = new Float32Array(MAX_RINGS);
  private rY = new Float32Array(MAX_RINGS);
  private rRadius = new Float32Array(MAX_RINGS);
  private rMaxRadius = new Float32Array(MAX_RINGS);
  private rLife = new Float32Array(MAX_RINGS);
  private rMaxLife = new Float32Array(MAX_RINGS);
  private rWidth = new Float32Array(MAX_RINGS);
  private rColor = new Uint8Array(MAX_RINGS);
  private rCursor = 0;

  private trackedUnits = new Map<string, TrackedUnit>();
  private vanishedScratch: TrackedUnit[] = [];
  private frameSeq = 0;
  private lastNow = 0;
  private trailAccum = 0;

  public reset(): void {
    this.pActive.fill(0);
    this.rActive.fill(0);
    this.trackedUnits.clear();
    this.vanishedScratch.length = 0;
    this.frameSeq = 0;
    this.lastNow = 0;
    this.trailAccum = 0;
  }

  private spawnParticle(
    x: number,
    y: number,
    vx: number,
    vy: number,
    life: number,
    size: number,
    drag: number,
    color: GlowColor,
    kind: 0 | 1 = 0
  ): void {
    const idx = this.pCursor;
    this.pCursor = (idx + 1) % MAX_PARTICLES;

    this.pActive[idx] = 1;
    this.pX[idx] = x;
    this.pY[idx] = y;
    this.pVx[idx] = vx;
    this.pVy[idx] = vy;
    this.pLife[idx] = life;
    this.pMaxLife[idx] = life;
    this.pSize[idx] = size;
    this.pDrag[idx] = drag;
    this.pColor[idx] = COLOR_INDEX[color];
    this.pKind[idx] = kind;
  }

  private spawnRing(
    x: number,
    y: number,
    startRadius: number,
    maxRadius: number,
    life: number,
    lineWidth: number,
    color: GlowColor
  ): void {
    const idx = this.rCursor;
    this.rCursor = (idx + 1) % MAX_RINGS;

    this.rActive[idx] = 1;
    this.rX[idx] = x;
    this.rY[idx] = y;
    this.rRadius[idx] = startRadius;
    this.rMaxRadius[idx] = maxRadius;
    this.rLife[idx] = life;
    this.rMaxLife[idx] = life;
    this.rWidth[idx] = lineWidth;
    this.rColor[idx] = COLOR_INDEX[color];
  }

  private spawnExplosion(unit: TrackedUnit, density: number): void {
    const scale = Math.max(0.75, unit.size / 54);
    const primaryColor: GlowColor = unit.faction === 'player' ? 'cyan' : 'amber';
    const accentColor: GlowColor = unit.faction === 'player' ? 'ice' : 'rose';

    // Expanding outer shockwave + hot white inner flash ring
    this.spawnRing(unit.x, unit.y, unit.size * 0.2, unit.size * 2.1, 0.52, 3.2 * scale, primaryColor);
    this.spawnRing(unit.x, unit.y, unit.size * 0.1, unit.size * 1.25, 0.28, 4.5 * scale, 'white');

    // Central incandescent flash bloom
    this.spawnParticle(unit.x, unit.y, unit.vx * 12, unit.vy * 12, 0.24, unit.size * 1.6, 0.9, 'white', 0);
    this.spawnParticle(unit.x, unit.y, unit.vx * 8, unit.vy * 8, 0.48, unit.size * 2.1, 0.92, primaryColor, 0);

    // Radial fiery sparks & hull embers
    const sparkCount = Math.max(8, Math.min(44, Math.round(22 * scale * density)));
    for (let i = 0; i < sparkCount; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = (55 + Math.random() * 210) * scale;
      const life = 0.28 + Math.random() * 0.58;
      const isHot = i % 3 === 0;
      this.spawnParticle(
        unit.x + Math.cos(ang) * (Math.random() * unit.size * 0.25),
        unit.y + Math.sin(ang) * (Math.random() * unit.size * 0.25),
        Math.cos(ang) * spd + unit.vx * 20,
        Math.sin(ang) * spd + unit.vy * 20,
        life,
        (isHot ? 9 : 13) * scale,
        0.93,
        isHot ? 'white' : i % 2 === 0 ? primaryColor : accentColor,
        1
      );
    }

    // Lingering glowing plasma clouds
    const cloudCount = Math.max(3, Math.round(6 * scale * density));
    for (let i = 0; i < cloudCount; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = (15 + Math.random() * 48) * scale;
      this.spawnParticle(
        unit.x,
        unit.y,
        Math.cos(ang) * spd,
        Math.sin(ang) * spd,
        0.55 + Math.random() * 0.5,
        (24 + Math.random() * 22) * scale,
        0.95,
        i % 2 === 0 ? 'amber' : accentColor,
        0
      );
    }
  }

  private spawnShieldImpact(u: RenderUnit, density: number): void {
    const r = Math.max(20, u.size * 0.56);
    this.spawnRing(u.x, u.y, r * 0.85, r * 1.28, 0.24, 2.4, 'cyan');

    const count = Math.max(3, Math.round(6 * density));
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 45 + Math.random() * 90;
      this.spawnParticle(
        u.x + Math.cos(ang) * r,
        u.y + Math.sin(ang) * r,
        Math.cos(ang) * spd,
        Math.sin(ang) * spd,
        0.2 + Math.random() * 0.18,
        8 + Math.random() * 5,
        0.91,
        i % 2 === 0 ? 'cyan' : 'ice',
        1
      );
    }
  }

  private spawnMuzzleFlash(u: RenderUnit, density: number): void {
    const cos = Math.cos(u.angle);
    const sin = Math.sin(u.angle);
    const noseDist = u.size * 0.46;
    const mx = u.x + cos * noseDist;
    const my = u.y + sin * noseDist;
    const color: GlowColor = u.faction === 'enemy' ? 'rose' : 'cyan';

    this.spawnParticle(mx, my, cos * 30, sin * 30, 0.09, Math.max(14, u.size * 0.34), 0.85, color, 0);
    if (density >= 0.5) {
      const sparkAng = u.angle + (Math.random() - 0.5) * 0.65;
      const spd = 90 + Math.random() * 90;
      this.spawnParticle(mx, my, Math.cos(sparkAng) * spd, Math.sin(sparkAng) * spd, 0.14, 7, 0.88, 'white', 1);
    }
  }

  private spawnEngineMote(u: RenderUnit, speed: number): void {
    const cos = Math.cos(u.angle);
    const sin = Math.sin(u.angle);
    const aftDist = u.size * 0.42;
    const isTwin = u.size >= 64;
    const sideOffset = isTwin ? (Math.random() < 0.5 ? -u.size * 0.14 : u.size * 0.14) : (Math.random() - 0.5) * 4;

    const ex = u.x - cos * aftDist - sin * sideOffset;
    const ey = u.y - sin * aftDist + cos * sideOffset;
    const exhaustSpeed = 24 + speed * 8;
    const spread = (Math.random() - 0.5) * 26;
    const color: GlowColor = u.faction === 'enemy' ? 'rose' : 'cyan';

    this.spawnParticle(
      ex,
      ey,
      -cos * exhaustSpeed - sin * spread,
      -sin * exhaustSpeed + cos * spread,
      0.16 + Math.random() * 0.18,
      Math.max(8, u.size * 0.22),
      0.92,
      color,
      0
    );
  }

  public update(units: readonly RenderUnit[], now: number): void {
    const density = Math.max(0, Math.min(2, useSettingsStore.getState().particleDensityMultiplier ?? 1));
    const dt = this.lastNow > 0 ? Math.min(Math.max((now - this.lastNow) / 1000, 0), 0.05) : 1 / 60;
    this.lastNow = now;
    this.frameSeq++;

    const hadTracked = this.trackedUnits.size;
    let movedCount = 0;

    // 1. Update unit tracker & trigger live combat VFX
    for (let i = 0; i < units.length; i++) {
      const u = units[i];
      const vx = u.vx ?? 0;
      const vy = u.vy ?? 0;
      const faction = u.faction ?? 'neutral';
      const shieldRatio = u.shieldRatio ?? -1;

      const prev = this.trackedUnits.get(u.id);
      if (prev) {
        if (Math.abs(u.x - prev.x) > 0.05 || Math.abs(u.y - prev.y) > 0.05) {
          movedCount++;
        }

        // Reactive shield hit detection
        if (
          density > 0 &&
          shieldRatio >= 0 &&
          prev.shieldRatio >= 0 &&
          prev.shieldRatio - shieldRatio > 0.015
        ) {
          this.spawnShieldImpact(u, density);
        }

        // Reactive weapon muzzle burst (throttled per unit)
        if (density > 0 && u.isFiring && now - prev.lastMuzzleMs >= 110) {
          prev.lastMuzzleMs = now;
          this.spawnMuzzleFlash(u, density);
        }

        prev.x = u.x;
        prev.y = u.y;
        prev.vx = vx;
        prev.vy = vy;
        prev.angle = u.angle;
        prev.size = u.size;
        prev.faction = faction;
        prev.shieldRatio = shieldRatio;
        prev.lastSeenFrame = this.frameSeq;
      } else {
        this.trackedUnits.set(u.id, {
          x: u.x,
          y: u.y,
          vx,
          vy,
          angle: u.angle,
          size: u.size,
          faction,
          shieldRatio,
          lastMuzzleMs: 0,
          lastSeenFrame: this.frameSeq,
        });
      }
    }

    // 2. Detect destroyed units (with bulk reset/clear guard so match resets don't explode)
    this.vanishedScratch.length = 0;
    for (const [id, tracked] of this.trackedUnits) {
      if (tracked.lastSeenFrame !== this.frameSeq) {
        this.vanishedScratch.push(tracked);
        this.trackedUnits.delete(id);
      }
    }

    const isBulkReset =
      units.length === 0 ||
      (hadTracked >= 4 && this.vanishedScratch.length > Math.max(3, hadTracked * 0.4));

    if (density > 0 && !isBulkReset && this.vanishedScratch.length > 0) {
      for (let i = 0; i < this.vanishedScratch.length; i++) {
        this.spawnExplosion(this.vanishedScratch[i], density);
      }
    }

    // 3. Emit lightweight engine exhaust motes when simulation is actively moving
    if (density > 0 && movedCount > 0 && dt > 0) {
      this.trailAccum += dt * 45 * density;
      if (this.trailAccum >= 1) {
        const emitSteps = Math.min(2, Math.floor(this.trailAccum));
        this.trailAccum -= emitSteps;
        for (let i = 0; i < units.length; i++) {
          const u = units[i];
          const spd = Math.hypot(u.vx ?? 0, u.vy ?? 0);
          if (spd < 1.35) continue;
          // Emit probabilistically scaled by speed so 40 ships stay smooth and atmospheric
          if (Math.random() < Math.min(0.85, spd * 0.08)) {
            this.spawnEngineMote(u, spd);
          }
        }
      }
    }

    // 4. Advance particle & ring pools
    if (dt <= 0) return;
    const dragStep = dt * 60;

    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (this.pActive[i] === 0) continue;
      const nextLife = this.pLife[i] - dt;
      if (nextLife <= 0) {
        this.pActive[i] = 0;
        continue;
      }
      this.pLife[i] = nextLife;
      const damp = Math.pow(this.pDrag[i], dragStep);
      this.pVx[i] *= damp;
      this.pVy[i] *= damp;
      this.pX[i] += this.pVx[i] * dt;
      this.pY[i] += this.pVy[i] * dt;
    }

    for (let i = 0; i < MAX_RINGS; i++) {
      if (this.rActive[i] === 0) continue;
      const nextLife = this.rLife[i] - dt;
      if (nextLife <= 0) {
        this.rActive[i] = 0;
        continue;
      }
      this.rLife[i] = nextLife;
      const t = 1 - nextLife / this.rMaxLife[i];
      // Ease-out cubic expansion
      const eased = 1 - Math.pow(1 - t, 3);
      this.rRadius[i] = this.rMaxRadius[i] * eased;
    }
  }

  public render(ctx: CanvasRenderingContext2D, bounds: WorldBounds): void {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // 1. Expanding shockwave & shield ripple rings
    for (let i = 0; i < MAX_RINGS; i++) {
      if (this.rActive[i] === 0) continue;
      const x = this.rX[i];
      const y = this.rY[i];
      const r = this.rRadius[i];
      if (
        x + r < bounds.minX ||
        x - r > bounds.maxX ||
        y + r < bounds.minY ||
        y - r > bounds.maxY
      ) {
        continue;
      }

      const ratio = this.rLife[i] / this.rMaxLife[i];
      const rgb = RING_RGB[this.rColor[i]];
      ctx.strokeStyle = `rgba(${rgb}, ${(ratio * ratio * 0.85).toFixed(3)})`;
      ctx.lineWidth = Math.max(1, this.rWidth[i] * ratio);
      ctx.beginPath();
      ctx.arc(x, y, Math.max(1, r), 0, Math.PI * 2);
      ctx.stroke();
    }

    // 2. Additive glowing particles & streak embers
    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (this.pActive[i] === 0) continue;
      const x = this.pX[i];
      const y = this.pY[i];
      const size = this.pSize[i];
      if (
        x + size < bounds.minX ||
        x - size > bounds.maxX ||
        y + size < bounds.minY ||
        y - size > bounds.maxY
      ) {
        continue;
      }

      const ratio = this.pLife[i] / this.pMaxLife[i];
      const alpha = Math.min(1, ratio * 1.15);
      const colIdx = this.pColor[i];
      const glow = getGlowSprite(COLOR_LIST[colIdx]);
      const drawSize = size * (0.45 + 0.55 * ratio);

      ctx.globalAlpha = alpha * 0.85;
      ctx.drawImage(glow, x - drawSize * 0.5, y - drawSize * 0.5, drawSize, drawSize);

      if (this.pKind[i] === 1) {
        // Crisp directional spark streak
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = CORE_HEX[colIdx];
        ctx.lineWidth = Math.max(1.2, drawSize * 0.16);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - this.pVx[i] * 0.045, y - this.pVy[i] * 0.045);
        ctx.stroke();
      }
    }

    ctx.restore();
  }
}
