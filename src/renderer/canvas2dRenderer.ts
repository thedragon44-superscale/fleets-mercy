// src/renderer/canvas2dRenderer.ts
// High-performance HTML5 2D Canvas implementation of ViewportRenderer.
// Uses offscreen-cached Environment Objects (with automatic invalidation when async resource
// color maps arrive), frustum culling, offscreen arena backdrops, and crisp ctx.drawImage PNG sprites.
import {
  DEFAULT_RESOURCE_COLORS,
  ENV_COMPONENT_KIND,
  ENV_OBJECT_TYPE,
  RenderableEnvObject,
  drawRockPolygon,
  isSoftEnvLayer,
} from '../utils/envRenderer';
import {
  getUnitRotationOffset,
  getUnitSpriteImage,
  preloadUnitSprites,
} from './spriteRegistry';
import {
  ViewportCameraState,
  WorldBounds,
  computeCameraTransform,
  computeVisibleWorldBounds,
} from './viewportCamera';
import type {
  RenderBackdrop,
  RenderBeacon,
  RenderCryoCloud,
  RenderFloatingText,
  RenderGhostSprite,
  RenderLegacyRock,
  RenderProjectile,
  RenderUnit,
  ViewportFrameState,
  ViewportRenderer,
  ViewportRendererInitOptions,
} from './viewportRenderer';

const MAX_ENV_CACHE_CANVAS_DIM = 1536;

interface CachedEnvSprite {
  canvas: HTMLCanvasElement;
  halfWorldSize: number;
  blueprintId: number;
  componentCount: number;
  boundingRadius: number;
  colorSig: string;
  soft: boolean;
}

interface CachedArenaBackdrop {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  fillColor: string;
}

function serializeColorMap(map: Record<number, string>): string {
  const keys = Object.keys(map).sort();
  let out = '';
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    out += `${k}:${map[Number(k)]}|`;
  }
  return out;
}

function computeEnvLocalExtent(obj: RenderableEnvObject): number {
  let maxExtent = Math.max(40, obj.boundingRadius || 40);
  for (let i = 0; i < obj.components.length; i++) {
    const c = obj.components[i];
    const d = Math.hypot(c.pos.x - obj.pos.x, c.pos.y - obj.pos.y) + c.radius;
    if (d > maxExtent) maxExtent = d;
  }
  // Margin for glow/stroke bleed on baked offscreen canvas
  return Math.ceil(maxExtent + 36);
}

/**
 * Bakes one EnvObject's static geometry ONCE in local unrotated object space onto an
 * offscreen canvas (all gradients, rock polygons, and node glows baked once — zero 60Hz shadowBlur).
 */
function bakeEnvObjectOffscreen(
  obj: RenderableEnvObject,
  colorByResourceEnum: Record<number, string>,
  colorSig: string,
  soft: boolean
): CachedEnvSprite {
  const halfWorldSize = computeEnvLocalExtent(obj);
  const fullWorldSize = halfWorldSize * 2;
  const pixelDim = Math.min(MAX_ENV_CACHE_CANVAS_DIM, Math.max(64, fullWorldSize));
  const drawScale = pixelDim / fullWorldSize;

  const offscreen = document.createElement('canvas');
  offscreen.width = pixelDim;
  offscreen.height = pixelDim;
  const ctx = offscreen.getContext('2d');

  if (ctx) {
    ctx.save();
    ctx.translate(pixelDim / 2, pixelDim / 2);
    ctx.scale(drawScale, drawScale);

    const cosNeg = Math.cos(-obj.angle);
    const sinNeg = Math.sin(-obj.angle);
    const sorted = [...obj.components].sort((a, b) => b.radius - a.radius);

    for (let i = 0; i < sorted.length; i++) {
      const c = sorted[i];
      const wx = c.pos.x - obj.pos.x;
      const wy = c.pos.y - obj.pos.y;
      const lx = wx * cosNeg - wy * sinNeg;
      const ly = wx * sinNeg + wy * cosNeg;
      const resColor = colorByResourceEnum[c.resourceType] || c.colorHex || '#94a3b8';

      ctx.save();
      switch (c.kind) {
        case ENV_COMPONENT_KIND.NebulaBlob: {
          const base = c.colorHex || '#7c3aed';
          const ng = ctx.createRadialGradient(lx, ly, c.radius * 0.12, lx, ly, c.radius);
          ng.addColorStop(0, `${base}66`);
          ng.addColorStop(0.65, `${base}2b`);
          ng.addColorStop(1, `${base}00`);
          ctx.fillStyle = ng;
          ctx.beginPath();
          ctx.arc(lx, ly, c.radius, 0, Math.PI * 2);
          ctx.fill();
          if (c.isNode) {
            ctx.shadowColor = resColor;
            ctx.shadowBlur = 16;
            ctx.fillStyle = resColor;
            ctx.beginPath();
            ctx.arc(lx, ly, Math.max(9, c.radius * 0.18), 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        }

        case ENV_COMPONENT_KIND.GasOuter:
        case ENV_COMPONENT_KIND.GasDeep:
        case ENV_COMPONENT_KIND.GasCore: {
          const col =
            c.colorHex ||
            (c.kind === ENV_COMPONENT_KIND.GasCore
              ? '#581c87'
              : c.kind === ENV_COMPONENT_KIND.GasDeep
              ? '#7e22ce'
              : '#c084fc');
          const g = ctx.createRadialGradient(lx, ly, c.innerRadius * 0.6, lx, ly, c.radius);
          if (c.kind === ENV_COMPONENT_KIND.GasCore) {
            g.addColorStop(0, '#3b0764');
            g.addColorStop(1, `${col}dd`);
          } else if (c.kind === ENV_COMPONENT_KIND.GasDeep) {
            g.addColorStop(0, `${col}66`);
            g.addColorStop(1, `${col}22`);
          } else {
            g.addColorStop(0, `${col}2c`);
            g.addColorStop(1, `${col}08`);
          }
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(lx, ly, c.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = c.kind === ENV_COMPONENT_KIND.GasCore ? '#f43f5e' : `${col}99`;
          ctx.lineWidth = c.kind === ENV_COMPONENT_KIND.GasCore ? 3 : 1.8;
          ctx.stroke();
          break;
        }

        case ENV_COMPONENT_KIND.RiftField: {
          const rg = ctx.createRadialGradient(lx, ly, c.innerRadius, lx, ly, c.radius);
          rg.addColorStop(0, 'rgba(56, 189, 248, 0.34)');
          rg.addColorStop(0.6, 'rgba(139, 92, 246, 0.16)');
          rg.addColorStop(1, 'rgba(56, 189, 248, 0)');
          ctx.fillStyle = rg;
          ctx.beginPath();
          ctx.arc(lx, ly, c.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(125, 211, 252, 0.35)';
          ctx.lineWidth = 1.8;
          ctx.stroke();
          break;
        }

        case ENV_COMPONENT_KIND.RiftCore: {
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 22;
          ctx.fillStyle = '#020617';
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.arc(lx, ly, c.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          if (c.isNode) {
            ctx.shadowBlur = 0;
            ctx.fillStyle = resColor;
            ctx.beginPath();
            ctx.arc(lx, ly, c.radius * 0.42, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        }

        case ENV_COMPONENT_KIND.CometCore: {
          ctx.shadowColor = '#bae6fd';
          ctx.shadowBlur = 24;
          ctx.fillStyle = '#f0f9ff';
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(lx, ly, c.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          break;
        }

        case ENV_COMPONENT_KIND.SolidCore: {
          const base = c.colorHex || '#475569';
          const pg = ctx.createRadialGradient(
            lx - c.radius * 0.3,
            ly - c.radius * 0.3,
            c.radius * 0.1,
            lx,
            ly,
            c.radius
          );
          pg.addColorStop(0, base);
          pg.addColorStop(1, '#0f172a');
          ctx.fillStyle = pg;
          ctx.beginPath();
          ctx.arc(lx, ly, c.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 2.6;
          ctx.stroke();
          break;
        }

        case ENV_COMPONENT_KIND.CaveMouth:
        case ENV_COMPONENT_KIND.CraterNode: {
          ctx.fillStyle = '#090d16';
          ctx.strokeStyle = c.isNode ? resColor : '#94a3b8';
          ctx.lineWidth = c.isNode ? 2.8 : 2;
          if (c.isNode) {
            ctx.shadowColor = resColor;
            ctx.shadowBlur = 16;
          }
          ctx.beginPath();
          ctx.arc(lx, ly, c.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          if (c.isNode) {
            ctx.shadowBlur = 0;
            ctx.fillStyle = resColor;
            ctx.globalAlpha = 0.88;
            ctx.beginPath();
            ctx.arc(lx, ly, Math.max(5, c.radius * 0.42), 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        }

        default: {
          if (c.isNode) {
            ctx.shadowColor = resColor;
            ctx.shadowBlur = 18;
          }
          drawRockPolygon(ctx, lx, ly, c.radius, c.id);
          ctx.fillStyle =
            c.isNode || obj.objectType === ENV_OBJECT_TYPE.AsteroidBelt ? '#1e293b' : '#2d3748';
          ctx.fill();
          ctx.lineWidth = c.isNode ? 2.8 : 2;
          ctx.strokeStyle = c.isNode
            ? resColor
            : obj.objectType === ENV_OBJECT_TYPE.AsteroidBelt
            ? '#64748b'
            : '#475569';
          ctx.stroke();

          if (c.isNode) {
            ctx.shadowBlur = 0;
            ctx.fillStyle = resColor;
            ctx.globalAlpha = 0.9;
            ctx.beginPath();
            ctx.arc(lx, ly, Math.max(7, c.radius * 0.36), 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        }
      }
      ctx.restore();
    }

    ctx.restore();
  }

  return {
    canvas: offscreen,
    halfWorldSize,
    blueprintId: obj.blueprintId,
    componentCount: obj.components.length,
    boundingRadius: obj.boundingRadius,
    colorSig,
    soft,
  };
}

export class Canvas2DRenderer implements ViewportRenderer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private viewWidth = 1;
  private viewHeight = 1;
  private dpr = 1;
  private defaultBackground = '#050811';

  private envObjects: readonly RenderableEnvObject[] = [];
  private envCache = new Map<number, CachedEnvSprite>();
  private envActiveIds = new Set<number>();
  private envParentById = new Map<number, RenderableEnvObject>();
  private arenaBackdropCache: CachedArenaBackdrop | null = null;

  public init(canvas: HTMLCanvasElement, options?: ViewportRendererInitOptions): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    if (options?.backgroundColor) {
      this.defaultBackground = options.backgroundColor;
    }
    preloadUnitSprites();
  }

  public resize(width: number, height: number, dpr?: number): void {
    const nextW = Math.max(1, Math.floor(width));
    const nextH = Math.max(1, Math.floor(height));
    const nextDpr = Math.min(Math.max(1, dpr ?? window.devicePixelRatio ?? 1), 2);

    this.viewWidth = nextW;
    this.viewHeight = nextH;
    this.dpr = nextDpr;

    if (!this.canvas) return;
    const pixelW = Math.round(nextW * nextDpr);
    const pixelH = Math.round(nextH * nextDpr);
    if (this.canvas.width !== pixelW) this.canvas.width = pixelW;
    if (this.canvas.height !== pixelH) this.canvas.height = pixelH;
  }

  public setEnvObjects(
    envObjects: readonly RenderableEnvObject[],
    colorByResourceEnum: Record<number, string> = DEFAULT_RESOURCE_COLORS
  ): void {
    this.envObjects = envObjects;
    this.envActiveIds.clear();
    this.envParentById.clear();

    if (!envObjects || envObjects.length === 0) {
      if (this.envCache.size > 0) this.envCache.clear();
      return;
    }

    const colorSig = serializeColorMap(colorByResourceEnum);

    for (let i = 0; i < envObjects.length; i++) {
      const obj = envObjects[i];
      this.envActiveIds.add(obj.id);
      this.envParentById.set(obj.id, obj);

      const soft = isSoftEnvLayer(obj.objectType);
      const cached = this.envCache.get(obj.id);
      if (
        !cached ||
        cached.blueprintId !== obj.blueprintId ||
        cached.componentCount !== obj.components.length ||
        cached.boundingRadius !== obj.boundingRadius ||
        cached.colorSig !== colorSig ||
        cached.soft !== soft
      ) {
        this.envCache.set(
          obj.id,
          bakeEnvObjectOffscreen(obj, colorByResourceEnum, colorSig, soft)
        );
      }
    }

    for (const id of this.envCache.keys()) {
      if (!this.envActiveIds.has(id)) {
        this.envCache.delete(id);
      }
    }
  }

  public render(frame: ViewportFrameState, camera: ViewportCameraState): void {
    const ctx = this.ctx;
    if (!ctx) return;

    const w = this.viewWidth;
    const h = this.viewHeight;
    const dpr = this.dpr;

    // 1. Clear full viewport in screen space
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = frame.backgroundColor || this.defaultBackground;
    ctx.fillRect(0, 0, w, h);

    // 2. Apply camera transform
    const { scale, offsetX, offsetY } = computeCameraTransform(camera, w, h);
    const bounds = computeVisibleWorldBounds(camera, w, h, 240);

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    // 3. Backdrop (cached offscreen arena or culled sector grid)
    if (frame.backdrop) {
      this.drawBackdrop(ctx, frame.backdrop, frame.worldWidth, frame.worldHeight, bounds);
    }

    // 4. Optional deployment beacons (Space Pirates 4 corners)
    if (frame.beacons && frame.beacons.length > 0) {
      this.drawBeacons(ctx, frame.beacons);
    }

    // 5. Soft EnvObjects (Nebulas, Gas Giants, Singularity Rifts)
    this.drawCachedEnvPass(ctx, true, bounds);

    // 6. Cryo Flak Clouds
    if (frame.cryoClouds && frame.cryoClouds.length > 0) {
      this.drawCryoClouds(ctx, frame.cryoClouds, frame.now, bounds);
    }

    // 7. Dynamic EnvObject effects (Moon orbits, Rift ripples, Comet trajectories/tails)
    this.drawEnvDynamicEffects(ctx, frame.now, frame.worldWidth, frame.worldHeight);

    // 8. Solid EnvObjects (Planets, Asteroid Clusters/Belts, Moons, Comets)
    this.drawCachedEnvPass(ctx, false, bounds);

    // 9. Optional legacy asteroids fallback
    if (frame.legacyRocks && frame.legacyRocks.length > 0) {
      this.drawLegacyRocks(ctx, frame.legacyRocks, bounds);
    }

    // 10. Units (back overlays -> PNG sprites -> front overlays & labels)
    this.drawUnits(ctx, frame.units, frame.now, bounds);

    // 11. Projectiles
    if (frame.projectiles.length > 0) {
      this.drawProjectiles(ctx, frame.projectiles, bounds);
    }

    // 12. Sandbox Click-to-Spawn ghost sprite
    if (frame.ghostSprite) {
      this.drawGhostSprite(ctx, frame.ghostSprite);
    }

    // 13. Floating payout/event texts
    if (frame.floatingTexts && frame.floatingTexts.length > 0) {
      this.drawFloatingTexts(ctx, frame.floatingTexts);
    }

    ctx.restore();
  }

  public destroy(): void {
    this.envObjects = [];
    this.envCache.clear();
    this.envActiveIds.clear();
    this.envParentById.clear();
    this.arenaBackdropCache = null;
    this.ctx = null;
    this.canvas = null;
  }

  // --- INTERNAL DRAW HELPERS ---

  private drawBackdrop(
    ctx: CanvasRenderingContext2D,
    backdrop: RenderBackdrop,
    worldW: number,
    worldH: number,
    bounds: WorldBounds
  ): void {
    if (backdrop.kind === 'grid') {
      const spacing = Math.max(50, backdrop.spacing);
      const startX = Math.max(0, Math.floor(bounds.minX / spacing) * spacing);
      const endX = Math.min(worldW, Math.ceil(bounds.maxX / spacing) * spacing);
      const startY = Math.max(0, Math.floor(bounds.minY / spacing) * spacing);
      const endY = Math.min(worldH, Math.ceil(bounds.maxY / spacing) * spacing);

      ctx.strokeStyle = backdrop.lineColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let gx = startX; gx <= endX; gx += spacing) {
        ctx.moveTo(gx, Math.max(0, bounds.minY));
        ctx.lineTo(gx, Math.min(worldH, bounds.maxY));
      }
      for (let gy = startY; gy <= endY; gy += spacing) {
        ctx.moveTo(Math.max(0, bounds.minX), gy);
        ctx.lineTo(Math.min(worldW, bounds.maxX), gy);
      }
      ctx.stroke();

      ctx.strokeStyle = backdrop.borderColor;
      ctx.lineWidth = backdrop.borderWidth ?? 4;
      ctx.strokeRect(0, 0, worldW, worldH);
      return;
    }

    // Cached offscreen arena backdrop (Space Pirates)
    const w = Math.max(1, Math.round(worldW));
    const h = Math.max(1, Math.round(worldH));
    if (
      !this.arenaBackdropCache ||
      this.arenaBackdropCache.width !== w ||
      this.arenaBackdropCache.height !== h ||
      this.arenaBackdropCache.fillColor !== backdrop.fillColor
    ) {
      const off = document.createElement('canvas');
      off.width = w;
      off.height = h;
      const bctx = off.getContext('2d');
      if (bctx) {
        bctx.fillStyle = backdrop.fillColor;
        bctx.fillRect(0, 0, w, h);

        if (backdrop.glowColor) {
          const grad = bctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.44);
          grad.addColorStop(0, backdrop.glowColor);
          grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          bctx.fillStyle = grad;
          bctx.fillRect(0, 0, w, h);
        }

        const step = Math.max(50, backdrop.gridSpacing);
        bctx.strokeStyle = backdrop.gridColor;
        bctx.lineWidth = 1.5;
        bctx.beginPath();
        for (let gx = step; gx < w; gx += step) {
          bctx.moveTo(gx, 0);
          bctx.lineTo(gx, h);
        }
        for (let gy = step; gy < h; gy += step) {
          bctx.moveTo(0, gy);
          bctx.lineTo(w, gy);
        }
        bctx.stroke();

        if (backdrop.stars) {
          for (let i = 0; i < backdrop.stars.length; i++) {
            const s = backdrop.stars[i];
            bctx.fillStyle = `rgba(226, 232, 240, ${s.alpha})`;
            bctx.beginPath();
            bctx.arc(s.x * w, s.y * h, s.r * 1.5, 0, Math.PI * 2);
            bctx.fill();
          }
        }

        bctx.strokeStyle = backdrop.borderColor;
        bctx.lineWidth = 3;
        bctx.strokeRect(1.5, 1.5, w - 3, h - 3);
      }

      this.arenaBackdropCache = {
        canvas: off,
        width: w,
        height: h,
        fillColor: backdrop.fillColor,
      };
    }

    ctx.drawImage(this.arenaBackdropCache.canvas, 0, 0);
  }

  private drawBeacons(ctx: CanvasRenderingContext2D, beacons: readonly RenderBeacon[]): void {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 18px monospace';

    for (let i = 0; i < beacons.length; i++) {
      const b = beacons[i];
      if (b.occupied) {
        ctx.save();
        ctx.globalAlpha = 0.1;
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      ctx.save();
      ctx.globalAlpha = b.occupied ? 0.9 : 0.35;
      ctx.strokeStyle = b.occupied ? b.color : '#64748b';
      ctx.lineWidth = b.occupied ? 3 : 1.5;
      ctx.setLineDash([12, 10]);
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = b.occupied ? b.color : '#64748b';
      ctx.fillText(b.label, b.x, b.y + b.radius + 24);
    }

    ctx.restore();
  }

  private drawCachedEnvPass(
    ctx: CanvasRenderingContext2D,
    softPass: boolean,
    bounds: WorldBounds
  ): void {
    const objs = this.envObjects;
    for (let i = 0; i < objs.length; i++) {
      const obj = objs[i];
      const cached = this.envCache.get(obj.id);
      if (!cached || cached.soft !== softPass) continue;

      const r = cached.halfWorldSize;
      if (
        obj.pos.x + r < bounds.minX ||
        obj.pos.x - r > bounds.maxX ||
        obj.pos.y + r < bounds.minY ||
        obj.pos.y - r > bounds.maxY
      ) {
        continue;
      }

      ctx.save();
      ctx.translate(obj.pos.x, obj.pos.y);
      if (obj.angle !== 0) ctx.rotate(obj.angle);
      ctx.drawImage(cached.canvas, -r, -r, r * 2, r * 2);
      ctx.restore();
    }
  }

  private drawEnvDynamicEffects(
    ctx: CanvasRenderingContext2D,
    now: number,
    worldW: number,
    worldH: number
  ): void {
    const objs = this.envObjects;
    for (let i = 0; i < objs.length; i++) {
      const obj = objs[i];

      // Orbiting moon dashed trajectory ring
      if (obj.parentObjectId > 0 && obj.orbitRadius > 0) {
        const parent = this.envParentById.get(obj.parentObjectId);
        if (parent) {
          ctx.save();
          ctx.strokeStyle = 'rgba(251, 191, 36, 0.24)';
          ctx.lineWidth = 1.8;
          ctx.setLineDash([10, 8]);
          ctx.beginPath();
          ctx.arc(parent.pos.x, parent.pos.y, obj.orbitRadius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }

      // Singularity Rift animated ripple rings
      if (obj.objectType === ENV_OBJECT_TYPE.SingularityRift) {
        for (let j = 0; j < obj.components.length; j++) {
          const c = obj.components[j];
          if (c.kind !== ENV_COMPONENT_KIND.RiftField) continue;
          for (let rIdx = 0; rIdx < 2; rIdx++) {
            const frac = (now * 0.0005 + rIdx * 0.5) % 1;
            const ringR = c.innerRadius + (c.radius - c.innerRadius) * frac;
            ctx.strokeStyle = `rgba(125, 211, 252, ${0.45 * (1 - frac)})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(c.pos.x, c.pos.y, ringR, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
      }

      // Comet full-arena warning trajectory + ice tail
      if (obj.objectType === ENV_OBJECT_TYPE.Comet) {
        const spd = Math.hypot(obj.vel.x, obj.vel.y);
        if (spd > 0.2) {
          const nx = obj.vel.x / spd;
          const ny = obj.vel.y / spd;
          const maxSpan = Math.hypot(worldW, worldH);

          ctx.save();
          ctx.strokeStyle = 'rgba(248, 113, 113, 0.55)';
          ctx.lineWidth = 3;
          ctx.setLineDash([18, 14]);
          ctx.beginPath();
          ctx.moveTo(obj.pos.x, obj.pos.y);
          ctx.lineTo(obj.pos.x + nx * maxSpan, obj.pos.y + ny * maxSpan);
          ctx.stroke();
          ctx.setLineDash([]);

          const tailGrad = ctx.createLinearGradient(
            obj.pos.x,
            obj.pos.y,
            obj.pos.x - nx * 190,
            obj.pos.y - ny * 190
          );
          tailGrad.addColorStop(0, 'rgba(186, 230, 253, 0.85)');
          tailGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.35)');
          tailGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
          ctx.strokeStyle = tailGrad;
          ctx.lineWidth = 22;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(obj.pos.x, obj.pos.y);
          ctx.lineTo(obj.pos.x - nx * 190, obj.pos.y - ny * 190);
          ctx.stroke();
          ctx.restore();
        }
      }
    }
  }

  private drawLegacyRocks(
    ctx: CanvasRenderingContext2D,
    rocks: readonly RenderLegacyRock[],
    bounds: WorldBounds
  ): void {
    for (let i = 0; i < rocks.length; i++) {
      const rock = rocks[i];
      if (
        rock.x + rock.radius < bounds.minX ||
        rock.x - rock.radius > bounds.maxX ||
        rock.y + rock.radius < bounds.minY ||
        rock.y - rock.radius > bounds.maxY
      ) {
        continue;
      }
      drawRockPolygon(ctx, rock.x, rock.y, rock.radius, rock.id);
      ctx.fillStyle = rock.isNode ? '#1e293b' : '#2d3748';
      ctx.fill();
      ctx.strokeStyle = rock.isNode ? rock.color : '#475569';
      ctx.lineWidth = rock.isNode ? 2.8 : 2;
      ctx.stroke();
    }
  }

  private drawCryoClouds(
    ctx: CanvasRenderingContext2D,
    clouds: readonly RenderCryoCloud[],
    now: number,
    bounds: WorldBounds
  ): void {
    for (let i = 0; i < clouds.length; i++) {
      const cl = clouds[i];
      const pulse = 0.94 + 0.06 * Math.sin(now * 0.008 + cl.id);
      const rad = cl.radius * pulse;
      if (
        cl.x + rad < bounds.minX ||
        cl.x - rad > bounds.maxX ||
        cl.y + rad < bounds.minY ||
        cl.y - rad > bounds.maxY
      ) {
        continue;
      }

      ctx.save();
      ctx.fillStyle = `rgba(14, 165, 233, ${0.16 * cl.ratio})`;
      ctx.beginPath();
      ctx.arc(cl.x, cl.y, rad, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(56, 189, 248, ${0.2 * cl.ratio})`;
      ctx.beginPath();
      ctx.arc(cl.x, cl.y, rad * 0.55, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = `rgba(125, 211, 252, ${0.55 * cl.ratio})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      ctx.arc(cl.x, cl.y, rad, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawUnits(
    ctx: CanvasRenderingContext2D,
    units: readonly RenderUnit[],
    now: number,
    bounds: WorldBounds
  ): void {
    for (let i = 0; i < units.length; i++) {
      const u = units[i];
      const pad = Math.max(u.size, 120);
      // Skip off-screen units unless they have large range circles enabled
      if (
        !u.ranges &&
        (u.x + pad < bounds.minX ||
          u.x - pad > bounds.maxX ||
          u.y + pad < bounds.minY ||
          u.y - pad > bounds.maxY)
      ) {
        continue;
      }

      const half = u.size / 2;

      // 1. Optional debug range circles (behind everything)
      if (u.ranges && u.ranges.length > 0) {
        ctx.lineWidth = 1;
        for (let r = 0; r < u.ranges.length; r++) {
          const rc = u.ranges[r];
          ctx.save();
          ctx.globalAlpha = rc.alpha;
          ctx.strokeStyle = rc.color;
          ctx.beginPath();
          ctx.arc(u.x, u.y, rc.radius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }

      // 2. Selection / Faction ring
      if (u.ring) {
        ctx.save();
        if (u.ring.fillColor && (u.ring.fillAlpha ?? 0) > 0) {
          ctx.globalAlpha = u.ring.fillAlpha!;
          ctx.fillStyle = u.ring.fillColor;
          ctx.beginPath();
          ctx.arc(u.x, u.y, u.ring.radius, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = u.ring.strokeAlpha ?? 0.85;
        ctx.strokeStyle = u.ring.strokeColor;
        ctx.lineWidth = u.ring.lineWidth ?? 2;
        if (u.ring.dashed) ctx.setLineDash([6, 5]);
        ctx.beginPath();
        ctx.arc(u.x, u.y, u.ring.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // 3. Stealth dashed ring
      if (u.stealthRingRadius) {
        ctx.save();
        ctx.strokeStyle = 'rgba(192, 132, 252, 0.72)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.arc(u.x, u.y, u.stealthRingRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // 4. Optional hitbox
      if (u.hitbox) {
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.85)';
        ctx.lineWidth = 1;
        ctx.strokeRect(u.x - half, u.y - half, u.size, u.size);
      }

      // 5. Harvester cargo ring
      if (u.harvester) {
        const ringR = u.harvester.ringRadius;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(u.x, u.y, ringR, 0, Math.PI * 2);
        ctx.stroke();

        if (u.harvester.cargoRatio > 0.01) {
          const startA = -Math.PI / 2;
          const endA = startA + Math.PI * 2 * u.harvester.cargoRatio;
          ctx.strokeStyle = u.harvester.cargoColor;
          ctx.lineWidth = 4.5;
          ctx.beginPath();
          ctx.arc(u.x, u.y, ringR, startA, endA);
          ctx.stroke();
        }
      }

      // 6. Flagship thrust flames (behind sprite)
      if (u.thrustFlames) {
        const cos = Math.cos(u.angle);
        const sin = Math.sin(u.angle);
        const flameLen = 22 + ((now * 0.17 + i * 7) % 14);
        ctx.save();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        for (const side of [-12, 12]) {
          const bx = u.x - cos * 38 - sin * side;
          const by = u.y - sin * 38 + cos * side;
          const tx = u.x - cos * (38 + flameLen) - sin * side;
          const ty = u.y - sin * (38 + flameLen) + cos * side;
          ctx.beginPath();
          ctx.moveTo(bx, by);
          ctx.lineTo(tx, ty);
          ctx.stroke();
        }
        ctx.restore();
      }

      // 7. Unit PNG Sprite (or vector triangle fallback while image loads)
      const img = getUnitSpriteImage(u.unitType);
      ctx.save();
      ctx.translate(u.x, u.y);
      ctx.globalAlpha = u.alpha ?? 1;
      if (img) {
        ctx.rotate(u.angle + getUnitRotationOffset(u.unitType));
        ctx.drawImage(img, -half, -half, u.size, u.size);
      } else {
        ctx.rotate(u.angle);
        const r = Math.max(12, half * 0.65);
        ctx.fillStyle = u.fallbackColor;
        ctx.beginPath();
        ctx.moveTo(r, 0);
        ctx.lineTo(-r * 0.7, r * 0.6);
        ctx.lineTo(-r * 0.7, -r * 0.6);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // 8. Front combat & harvester overlays
      if (u.flagshipMuzzleFlash) {
        const cos = Math.cos(u.angle);
        const sin = Math.sin(u.angle);
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.95)';
        ctx.lineWidth = 3;
        for (const side of [-11, 11]) {
          const fx = u.x + cos * 38 - sin * side;
          const fy = u.y + sin * 38 + cos * side;
          const ex = u.x + cos * 58 - sin * side;
          const ey = u.y + sin * 58 + cos * side;
          ctx.beginPath();
          ctx.moveTo(fx, fy);
          ctx.lineTo(ex, ey);
          ctx.stroke();
        }
      }

      if (u.muzzleFlashDot) {
        const halfR = u.size * 0.48;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.beginPath();
        ctx.arc(
          u.x + Math.cos(u.angle) * halfR,
          u.y + Math.sin(u.angle) * halfR,
          Math.max(3.5, u.size * 0.08),
          0,
          Math.PI * 2
        );
        ctx.fill();
      }

      if (u.harvester?.isHarvesting) {
        const halfR = u.size * 0.48;
        ctx.save();
        ctx.globalAlpha = 0.65 + 0.25 * Math.sin(now * 0.02);
        ctx.strokeStyle = u.harvester.beamColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(u.x + Math.cos(u.angle) * halfR, u.y + Math.sin(u.angle) * halfR);
        ctx.lineTo(
          u.x + Math.cos(u.angle) * (halfR + u.harvester.beamLength),
          u.y + Math.sin(u.angle) * (halfR + u.harvester.beamLength)
        );
        ctx.stroke();
        ctx.restore();
      }

      if (u.shieldArcs) {
        this.drawShieldArcs(ctx, u.x, u.y, u.angle, u.shieldArcs);
      }

      if (u.velocityVector) {
        const { vx, vy, scale: vScale, color } = u.velocityVector;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.75;
        ctx.beginPath();
        ctx.moveTo(u.x, u.y);
        ctx.lineTo(u.x + vx * vScale, u.y + vy * vScale);
        ctx.stroke();
      }

      if (u.bars && u.bars.length > 0) {
        for (let b = 0; b < u.bars.length; b++) {
          const bar = u.bars[b];
          const bx = u.x - bar.width / 2;
          const by = u.y + bar.yOffset;
          ctx.fillStyle = bar.bgColor || 'rgba(15, 23, 42, 0.85)';
          ctx.fillRect(bx, by, bar.width, bar.height);
          if (bar.ratio > 0) {
            ctx.fillStyle = bar.fillColor;
            ctx.fillRect(bx, by, bar.width * Math.min(1, bar.ratio), bar.height);
          }
        }
      }

      if (u.labels && u.labels.length > 0) {
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (let l = 0; l < u.labels.length; l++) {
          const lbl = u.labels[l];
          ctx.font = `${lbl.bold === false ? '500' : '700'} ${lbl.fontSize}px monospace`;
          ctx.fillStyle = lbl.color;
          ctx.fillText(lbl.text, u.x, u.y + lbl.yOffset);
        }
        ctx.restore();
      }
    }
  }

  private drawShieldArcs(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    angle: number,
    sh: NonNullable<RenderUnit['shieldArcs']>
  ): void {
    const drawArc = (startDeg: number, endDeg: number, val: number) => {
      if (val <= 0) return;
      const a0 = angle + (startDeg * Math.PI) / 180;
      const a1 = angle + (endDeg * Math.PI) / 180;
      ctx.strokeStyle = `rgba(0, 243, 255, ${Math.min(val, 1)})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(x, y, sh.radius, a0, a1);
      ctx.stroke();
    };
    drawArc(-40, 40, sh.front);
    drawArc(50, 130, sh.starboard);
    drawArc(140, 220, sh.rear);
    drawArc(230, 310, sh.port);
  }

  private drawProjectiles(
    ctx: CanvasRenderingContext2D,
    projectiles: readonly RenderProjectile[],
    bounds: WorldBounds
  ): void {
    for (let i = 0; i < projectiles.length; i++) {
      const p = projectiles[i];
      if (
        p.x + 40 < bounds.minX ||
        p.x - 40 > bounds.maxX ||
        p.y + 40 < bounds.minY ||
        p.y - 40 > bounds.maxY
      ) {
        continue;
      }

      if (p.kind === 'dot') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius ?? 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === 'cryo') {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#bae6fd';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === 'torpedo') {
        ctx.save();
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      } else if (p.kind === 'railgun') {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - (p.vx ?? 0) * 1.4, p.y - (p.vy ?? 0) * 1.4);
        ctx.stroke();
      } else {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - (p.vx ?? 0) * 0.9, p.y - (p.vy ?? 0) * 0.9);
        ctx.stroke();
      }
    }
  }

  private drawGhostSprite(ctx: CanvasRenderingContext2D, ghost: RenderGhostSprite): void {
    const img = getUnitSpriteImage(ghost.unitType);
    if (img) {
      const half = ghost.size / 2;
      ctx.save();
      ctx.translate(ghost.x, ghost.y);
      ctx.rotate(getUnitRotationOffset(ghost.unitType));
      ctx.globalAlpha = ghost.alpha ?? 0.55;
      ctx.drawImage(img, -half, -half, ghost.size, ghost.size);
      ctx.restore();
    }

    ctx.save();
    ctx.strokeStyle = ghost.ringColor;
    ctx.globalAlpha = 0.9;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.arc(ghost.x, ghost.y, ghost.size * 0.65, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  private drawFloatingTexts(
    ctx: CanvasRenderingContext2D,
    texts: readonly RenderFloatingText[]
  ): void {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < texts.length; i++) {
      const t = texts[i];
      ctx.globalAlpha = Math.max(0, Math.min(1, t.alpha));
      ctx.font = `900 ${t.fontSize}px monospace`;
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.restore();
  }
}
