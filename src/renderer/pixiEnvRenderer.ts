// src/renderer/pixiEnvRenderer.ts
// High-performance Pixi.js v8 WebGL renderer for all 9 universal celestial archetypes
// using per-object cached Graphics (zero per-frame tessellation/GPU buffer uploads)
// plus a shared BitmapFont atlas for 1-draw-call unit/HUD labels.
import { BitmapFont, Container, Graphics } from 'pixi.js';
import {
  DEFAULT_RESOURCE_COLORS,
  ENV_COMPONENT_KIND,
  ENV_OBJECT_TYPE,
  RenderableEnvObject,
  isSoftEnvLayer,
} from '../utils/envRenderer';

export const TACTICAL_BITMAP_FONT = 'TacticalMono';

let bitmapFontInstalled = false;

/**
 * Installs a single shared BitmapFont atlas once so all unit/HUD labels across
 * Sandbox, TDM, and Space Pirates batch into a single GPU draw call.
 */
export function ensurePixiBitmapFont(): void {
  if (bitmapFontInstalled) return;
  bitmapFontInstalled = true;
  BitmapFont.install({
    name: TACTICAL_BITMAP_FONT,
    style: {
      fontFamily: 'monospace',
      fontSize: 24,
      fontWeight: '700',
      fill: '#ffffff',
    },
    chars: [[' ', '~']],
    padding: 6,
    skipKerning: true,
    resolution: 2,
  });
}

export function hexToPixiColor(hex: string | undefined | null, fallback = 0x94a3b8): number {
  if (!hex) return fallback;
  const cleaned = hex.trim().replace(/^#/, '');
  if (cleaned.length !== 6) return fallback;
  const parsed = parseInt(cleaned, 16);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function drawPixiDashedCircle(
  g: Graphics,
  cx: number,
  cy: number,
  radius: number,
  dashPx: number,
  gapPx: number,
  color: number,
  alpha: number,
  width: number
): void {
  if (radius <= 1) return;
  const circumference = Math.PI * 2 * radius;
  const step = Math.max(6, dashPx + gapPx);
  const count = Math.max(6, Math.min(48, Math.floor(circumference / step)));
  const segAngle = (Math.PI * 2) / count;
  const dashAngle = segAngle * (dashPx / step);

  for (let i = 0; i < count; i++) {
    const a0 = i * segAngle;
    const a1 = a0 + dashAngle;
    g.moveTo(cx + Math.cos(a0) * radius, cy + Math.sin(a0) * radius);
    g.arc(cx, cy, radius, a0, a1);
  }
  g.stroke({ width, color, alpha });
}

export function drawPixiDashedLine(
  g: Graphics,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  dashLen: number,
  gapLen: number,
  color: number,
  alpha: number,
  width: number
): void {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return;
  const nx = dx / dist;
  const ny = dy / dist;
  const maxSegments = 140;
  const step = Math.max(8, dashLen + gapLen, dist / maxSegments);
  const effDash = Math.min(dashLen, step * 0.6);

  for (let d = 0; d < dist; d += step) {
    const end = Math.min(dist, d + effDash);
    g.moveTo(x1 + nx * d, y1 + ny * d);
    g.lineTo(x1 + nx * end, y1 + ny * end);
  }
  g.stroke({ width, color, alpha });
}

export function drawPixiRockPolygon(
  g: Graphics,
  cx: number,
  cy: number,
  radius: number,
  seed: number
): void {
  const verts = 10;
  const pts: number[] = new Array(verts * 2);
  for (let i = 0; i < verts; i++) {
    const a = (i / verts) * Math.PI * 2;
    const jitter = 0.87 + 0.13 * Math.sin(seed * 2.9 + i * 2.1) * Math.cos(seed * 1.7 - i * 1.3);
    const r = radius * jitter;
    pts[i * 2] = cx + Math.cos(a) * r;
    pts[i * 2 + 1] = cy + Math.sin(a) * r;
  }
  g.poly(pts, true);
}

/**
 * Builds one EnvObject's static celestial geometry ONCE in local object space
 * (rotated back to angle=0 so runtime updates only change gfx.position & gfx.rotation).
 */
function buildStaticEnvObjectGraphics(
  obj: RenderableEnvObject,
  colorByResourceEnum: Record<number, string>
): Graphics {
  const g = new Graphics();
  const cosNeg = Math.cos(-obj.angle);
  const sinNeg = Math.sin(-obj.angle);

  const sorted = [...obj.components].sort((a, b) => b.radius - a.radius);

  for (const c of sorted) {
    // Recover local unrotated coordinates relative to obj.pos
    const wx = c.pos.x - obj.pos.x;
    const wy = c.pos.y - obj.pos.y;
    const lx = wx * cosNeg - wy * sinNeg;
    const ly = wx * sinNeg + wy * cosNeg;
    const resColor = hexToPixiColor(colorByResourceEnum[c.resourceType] || c.colorHex, 0x94a3b8);

    switch (c.kind) {
      case ENV_COMPONENT_KIND.NebulaBlob: {
        const base = hexToPixiColor(c.colorHex, 0x7c3aed);
        g.circle(lx, ly, c.radius).fill({ color: base, alpha: 0.14 });
        g.circle(lx, ly, c.radius * 0.68).fill({ color: base, alpha: 0.18 });
        g.circle(lx, ly, c.radius * 0.36).fill({ color: base, alpha: 0.2 });
        if (c.isNode) {
          g.circle(lx, ly, Math.max(12, c.radius * 0.25)).fill({ color: resColor, alpha: 0.25 });
          g.circle(lx, ly, Math.max(9, c.radius * 0.18)).fill({ color: resColor, alpha: 0.92 });
        }
        break;
      }

      case ENV_COMPONENT_KIND.GasOuter:
      case ENV_COMPONENT_KIND.GasDeep:
      case ENV_COMPONENT_KIND.GasCore: {
        const fallback =
          c.kind === ENV_COMPONENT_KIND.GasCore
            ? 0x581c87
            : c.kind === ENV_COMPONENT_KIND.GasDeep
            ? 0x7e22ce
            : 0xc084fc;
        const col = hexToPixiColor(c.colorHex, fallback);

        if (c.kind === ENV_COMPONENT_KIND.GasCore) {
          g.circle(lx, ly, c.radius)
            .fill({ color: col, alpha: 0.86 })
            .stroke({ width: 3, color: 0xf43f5e, alpha: 0.95 });
          g.circle(lx, ly, c.radius * 0.55).fill({ color: 0x3b0764, alpha: 0.75 });
        } else if (c.kind === ENV_COMPONENT_KIND.GasDeep) {
          g.circle(lx, ly, c.radius)
            .fill({ color: col, alpha: 0.28 })
            .stroke({ width: 1.8, color: col, alpha: 0.6 });
        } else {
          g.circle(lx, ly, c.radius)
            .fill({ color: col, alpha: 0.14 })
            .stroke({ width: 1.8, color: col, alpha: 0.5 });
        }
        break;
      }

      case ENV_COMPONENT_KIND.RiftField: {
        g.circle(lx, ly, c.radius).fill({ color: 0x8b5cf6, alpha: 0.12 });
        g.circle(lx, ly, c.radius * 0.62).fill({ color: 0x38bdf8, alpha: 0.2 });
        g.circle(lx, ly, c.radius).stroke({ width: 1.8, color: 0x7dd3fc, alpha: 0.35 });
        break;
      }

      case ENV_COMPONENT_KIND.RiftCore: {
        g.circle(lx, ly, c.radius * 1.25).fill({ color: 0x38bdf8, alpha: 0.18 });
        g.circle(lx, ly, c.radius)
          .fill({ color: 0x020617, alpha: 0.98 })
          .stroke({ width: 3.5, color: 0x38bdf8, alpha: 1 });
        if (c.isNode) {
          g.circle(lx, ly, c.radius * 0.42).fill({ color: resColor, alpha: 0.95 });
        }
        break;
      }

      case ENV_COMPONENT_KIND.CometCore: {
        g.circle(lx, ly, c.radius * 1.45).fill({ color: 0xbae6fd, alpha: 0.28 });
        g.circle(lx, ly, c.radius)
          .fill({ color: 0xf0f9ff, alpha: 1 })
          .stroke({ width: 3, color: 0x38bdf8, alpha: 1 });
        break;
      }

      case ENV_COMPONENT_KIND.SolidCore: {
        const base = hexToPixiColor(c.colorHex, 0x475569);
        g.circle(lx, ly, c.radius)
          .fill({ color: 0x0f172a, alpha: 0.98 })
          .stroke({ width: 2.6, color: 0x94a3b8, alpha: 0.95 });
        g.circle(lx - c.radius * 0.12, ly - c.radius * 0.12, c.radius * 0.82).fill({
          color: base,
          alpha: 0.85,
        });
        g.circle(lx - c.radius * 0.26, ly - c.radius * 0.26, c.radius * 0.36).fill({
          color: 0xffffff,
          alpha: 0.12,
        });
        break;
      }

      case ENV_COMPONENT_KIND.CaveMouth:
      case ENV_COMPONENT_KIND.CraterNode: {
        if (c.isNode) {
          g.circle(lx, ly, c.radius * 1.25).fill({ color: resColor, alpha: 0.2 });
        }
        g.circle(lx, ly, c.radius)
          .fill({ color: 0x090d16, alpha: 0.96 })
          .stroke({
            width: c.isNode ? 2.8 : 2,
            color: c.isNode ? resColor : 0x94a3b8,
            alpha: 0.95,
          });
        if (c.isNode) {
          g.circle(lx, ly, Math.max(5, c.radius * 0.42)).fill({
            color: resColor,
            alpha: 0.88,
          });
        }
        break;
      }

      default: {
        // SolidRock, ResourceNode
        if (c.isNode) {
          g.circle(lx, ly, c.radius * 1.25).fill({ color: resColor, alpha: 0.18 });
        }
        drawPixiRockPolygon(g, lx, ly, c.radius, c.id);
        const fillCol =
          c.isNode || obj.objectType === ENV_OBJECT_TYPE.AsteroidBelt ? 0x1e293b : 0x2d3748;
        const strokeCol = c.isNode
          ? resColor
          : obj.objectType === ENV_OBJECT_TYPE.AsteroidBelt
          ? 0x64748b
          : 0x475569;
        g.fill({ color: fillCol, alpha: 0.96 }).stroke({
          width: c.isNode ? 2.8 : 2,
          color: strokeCol,
          alpha: 0.96,
        });

        if (c.isNode) {
          g.circle(lx, ly, Math.max(7, c.radius * 0.36)).fill({
            color: resColor,
            alpha: 0.9,
          });
        }
        break;
      }
    }
  }

  return g;
}

interface CachedEnvNode {
  gfx: Graphics;
  blueprintId: number;
  componentCount: number;
  soft: boolean;
}

/**
 * Pooled Pixi.js v8 environmental object manager.
 * Builds each EnvObject's Graphics ONCE in local space and updates only transform
 * (.position / .rotation) at 60Hz — eliminating per-frame re-tessellation & GPU buffer uploads.
 */
export class PixiEnvLayer {
  public readonly softContainer = new Container();
  public readonly solidContainer = new Container();
  public readonly dynamicGfx = new Graphics();

  private readonly nodes = new Map<number, CachedEnvNode>();
  private readonly activeIds = new Set<number>();
  private readonly parentById = new Map<number, RenderableEnvObject>();
  private dynamicWasDirty = false;

  public sync(
    envObjects: RenderableEnvObject[],
    now: number,
    arenaW: number,
    arenaH: number,
    colorByResourceEnum: Record<number, string> = DEFAULT_RESOURCE_COLORS
  ): void {
    this.activeIds.clear();
    this.parentById.clear();

    let hasDynamicEffects = false;

    for (let i = 0; i < envObjects.length; i++) {
      const obj = envObjects[i];
      this.activeIds.add(obj.id);
      this.parentById.set(obj.id, obj);

      if (
        (obj.parentObjectId > 0 && obj.orbitRadius > 0) ||
        obj.objectType === ENV_OBJECT_TYPE.Comet ||
        obj.objectType === ENV_OBJECT_TYPE.SingularityRift
      ) {
        hasDynamicEffects = true;
      }

      const soft = isSoftEnvLayer(obj.objectType);
      let cached = this.nodes.get(obj.id);
      if (
        !cached ||
        cached.blueprintId !== obj.blueprintId ||
        cached.componentCount !== obj.components.length ||
        cached.soft !== soft
      ) {
        if (cached) {
          cached.gfx.parent?.removeChild(cached.gfx);
          cached.gfx.destroy();
        }
        const gfx = buildStaticEnvObjectGraphics(obj, colorByResourceEnum);
        (soft ? this.softContainer : this.solidContainer).addChild(gfx);
        cached = {
          gfx,
          blueprintId: obj.blueprintId,
          componentCount: obj.components.length,
          soft,
        };
        this.nodes.set(obj.id, cached);
      }

      cached.gfx.position.set(obj.pos.x, obj.pos.y);
      cached.gfx.rotation = obj.angle;
    }

    // Prune expired / despawned EnvObjects
    for (const [id, node] of this.nodes) {
      if (!this.activeIds.has(id)) {
        node.gfx.parent?.removeChild(node.gfx);
        node.gfx.destroy();
        this.nodes.delete(id);
      }
    }

    // Only touch dynamicGfx when comets, moons, or singularity rifts are actually present
    if (!hasDynamicEffects) {
      if (this.dynamicWasDirty) {
        this.dynamicGfx.clear();
        this.dynamicWasDirty = false;
      }
      return;
    }

    this.dynamicGfx.clear();
    this.dynamicWasDirty = true;

    for (let i = 0; i < envObjects.length; i++) {
      const obj = envObjects[i];

      // Orbital path ring for orbiting moons
      if (obj.parentObjectId > 0 && obj.orbitRadius > 0) {
        const parent = this.parentById.get(obj.parentObjectId);
        if (parent) {
          drawPixiDashedCircle(
            this.dynamicGfx,
            parent.pos.x,
            parent.pos.y,
            obj.orbitRadius,
            10,
            8,
            0xfbbf24,
            0.24,
            1.8
          );
        }
      }

      // Singularity Rift animated refraction ripple rings
      if (obj.objectType === ENV_OBJECT_TYPE.SingularityRift) {
        for (let j = 0; j < obj.components.length; j++) {
          const c = obj.components[j];
          if (c.kind !== ENV_COMPONENT_KIND.RiftField) continue;
          for (let rIdx = 0; rIdx < 2; rIdx++) {
            const frac = (now * 0.0005 + rIdx * 0.5) % 1;
            const ringR = c.innerRadius + (c.radius - c.innerRadius) * frac;
            this.dynamicGfx.circle(c.pos.x, c.pos.y, ringR).stroke({
              width: 2,
              color: 0x7dd3fc,
              alpha: 0.45 * (1 - frac),
            });
          }
        }
      }

      // Comet full-arena dashed radar warning trajectory + luminous ice tail
      if (obj.objectType === ENV_OBJECT_TYPE.Comet) {
        const spd = Math.hypot(obj.vel.x, obj.vel.y);
        if (spd > 0.2) {
          const nx = obj.vel.x / spd;
          const ny = obj.vel.y / spd;
          const maxSpan = Math.hypot(arenaW, arenaH);

          drawPixiDashedLine(
            this.dynamicGfx,
            obj.pos.x,
            obj.pos.y,
            obj.pos.x + nx * maxSpan,
            obj.pos.y + ny * maxSpan,
            18,
            14,
            0xf87171,
            0.55,
            3
          );

          const tailSegments = 4;
          const totalTailLen = 190;
          for (let s = 0; s < tailSegments; s++) {
            const t0 = s / tailSegments;
            const t1 = (s + 1) / tailSegments;
            this.dynamicGfx
              .moveTo(obj.pos.x - nx * (t0 * totalTailLen), obj.pos.y - ny * (t0 * totalTailLen))
              .lineTo(obj.pos.x - nx * (t1 * totalTailLen), obj.pos.y - ny * (t1 * totalTailLen))
              .stroke({
                width: 22 * (1 - t0 * 0.65),
                color: s === 0 ? 0xbae6fd : 0x38bdf8,
                alpha: (1 - t0) * 0.75,
                cap: 'round',
              });
          }
        }
      }
    }
  }

  public clear(): void {
    for (const node of this.nodes.values()) {
      node.gfx.parent?.removeChild(node.gfx);
      node.gfx.destroy();
    }
    this.nodes.clear();
    this.activeIds.clear();
    this.parentById.clear();
    this.dynamicGfx.clear();
    this.dynamicWasDirty = false;
  }
}

export function drawPixiShieldArcs(
  g: Graphics,
  x: number,
  y: number,
  angle: number,
  shields: { front: number; rear: number; port: number; starboard: number } | undefined,
  radius = 52
): void {
  if (!shields) return;
  const drawArc = (startDeg: number, endDeg: number, val: number) => {
    if (val <= 0) return;
    const a0 = angle + (startDeg * Math.PI) / 180;
    const a1 = angle + (endDeg * Math.PI) / 180;
    g.moveTo(x + Math.cos(a0) * radius, y + Math.sin(a0) * radius);
    g.arc(x, y, radius, a0, a1);
    g.stroke({ width: 2.5, color: 0x00f3ff, alpha: Math.min(val, 1) });
  };

  drawArc(-40, 40, shields.front);
  drawArc(50, 130, shields.starboard);
  drawArc(140, 220, shields.rear);
  drawArc(230, 310, shields.port);
}
