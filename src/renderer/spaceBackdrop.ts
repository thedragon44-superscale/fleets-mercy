// src/renderer/spaceBackdrop.ts
// Multi-layer deep-space parallax starfield and subtle pre-baked cosmic nebula wash.
// Drawn in screen space for pin-sharp stars at every zoom level with zero per-frame allocations.

interface StarLayerConfig {
  tileSize: number;
  parallax: number;
  starsPerTile: number;
  minRadius: number;
  maxRadius: number;
  minAlpha: number;
  maxAlpha: number;
  twinkle: boolean;
  glintChance: number;
  seedOffset: number;
}

const STAR_LAYERS: readonly StarLayerConfig[] = [
  // Layer 1: Distant deep-field star dust
  {
    tileSize: 300,
    parallax: 0.1,
    starsPerTile: 12,
    minRadius: 0.65,
    maxRadius: 1.05,
    minAlpha: 0.18,
    maxAlpha: 0.42,
    twinkle: false,
    glintChance: 0,
    seedOffset: 101,
  },
  // Layer 2: Mid-field stars
  {
    tileSize: 340,
    parallax: 0.24,
    starsPerTile: 7,
    minRadius: 0.95,
    maxRadius: 1.55,
    minAlpha: 0.34,
    maxAlpha: 0.68,
    twinkle: false,
    glintChance: 0,
    seedOffset: 733,
  },
  // Layer 3: Near hero stars with gentle spectral twinkle & subtle cross glint
  {
    tileSize: 420,
    parallax: 0.46,
    starsPerTile: 3,
    minRadius: 1.25,
    maxRadius: 2.15,
    minAlpha: 0.52,
    maxAlpha: 0.9,
    twinkle: true,
    glintChance: 0.24,
    seedOffset: 2029,
  },
];

// Subtle astronomical spectral tint palette (O/B blue-white, A/F white, G/K pale gold, nebula cyan/violet)
const STAR_COLORS = [
  '#e0f2fe',
  '#f8fafc',
  '#f8fafc',
  '#bae6fd',
  '#fef3c7',
  '#e9d5ff',
  '#dbeafe',
];

const NEBULA_TILE_SIZE = 512;

function hash2D(ix: number, iy: number, salt: number): number {
  let h = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(salt, 1442695041);
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function buildSeamlessNebulaTile(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = NEBULA_TILE_SIZE;
  canvas.height = NEBULA_TILE_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Toroidally wrapped soft radial clouds so tiling across screen has zero visible seams
  const clouds = [
    { x: 110, y: 140, r: 220, inner: 'rgba(14, 116, 144, 0.11)', outer: 'rgba(14, 116, 144, 0)' },
    { x: 370, y: 310, r: 250, inner: 'rgba(67, 56, 202, 0.10)', outer: 'rgba(67, 56, 202, 0)' },
    { x: 260, y: 80, r: 190, inner: 'rgba(88, 28, 135, 0.08)', outer: 'rgba(88, 28, 135, 0)' },
    { x: 430, y: 460, r: 185, inner: 'rgba(30, 64, 175, 0.09)', outer: 'rgba(30, 64, 175, 0)' },
    { x: 90, y: 400, r: 160, inner: 'rgba(8, 145, 178, 0.07)', outer: 'rgba(8, 145, 178, 0)' },
  ];

  for (let i = 0; i < clouds.length; i++) {
    const c = clouds[i];
    for (let ox = -1; ox <= 1; ox++) {
      for (let oy = -1; oy <= 1; oy++) {
        const cx = c.x + ox * NEBULA_TILE_SIZE;
        const cy = c.y + oy * NEBULA_TILE_SIZE;
        const g = ctx.createRadialGradient(cx, cy, c.r * 0.05, cx, cy, c.r);
        g.addColorStop(0, c.inner);
        g.addColorStop(1, c.outer);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, c.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  return canvas;
}

export class SpaceBackdropRenderer {
  private nebulaTile: HTMLCanvasElement | null = null;

  public draw(
    ctx: CanvasRenderingContext2D,
    viewW: number,
    viewH: number,
    cameraX: number,
    cameraY: number,
    now: number
  ): void {
    if (!this.nebulaTile) {
      this.nebulaTile = buildSeamlessNebulaTile();
    }

    // 1. Subtle deep-space cosmic nebula wash (tiled seamlessly at 0.06x parallax)
    const nebScale = 1.65;
    const tileScreen = NEBULA_TILE_SIZE * nebScale;
    const nebOffX = -(((cameraX * 0.06) % tileScreen) + tileScreen) % tileScreen;
    const nebOffY = -(((cameraY * 0.06) % tileScreen) + tileScreen) % tileScreen;

    for (let x = nebOffX; x < viewW; x += tileScreen) {
      for (let y = nebOffY; y < viewH; y += tileScreen) {
        ctx.drawImage(this.nebulaTile, x, y, tileScreen, tileScreen);
      }
    }

    // 2. Three-layer deterministic parallax starfield
    ctx.save();
    for (let l = 0; l < STAR_LAYERS.length; l++) {
      const layer = STAR_LAYERS[l];
      const ts = layer.tileSize;
      const scrollX = cameraX * layer.parallax;
      const scrollY = cameraY * layer.parallax;

      const minTileX = Math.floor(scrollX / ts) - 1;
      const maxTileX = Math.floor((scrollX + viewW) / ts) + 1;
      const minTileY = Math.floor(scrollY / ts) - 1;
      const maxTileY = Math.floor((scrollY + viewH) / ts) + 1;

      for (let tx = minTileX; tx <= maxTileX; tx++) {
        for (let ty = minTileY; ty <= maxTileY; ty++) {
          for (let s = 0; s < layer.starsPerTile; s++) {
            const salt = layer.seedOffset + s * 17;
            const rx = hash2D(tx, ty, salt);
            const ry = hash2D(tx, ty, salt + 3);
            const sx = tx * ts + rx * ts - scrollX;
            const sy = ty * ts + ry * ts - scrollY;

            if (sx < -6 || sx > viewW + 6 || sy < -6 || sy > viewH + 6) continue;

            const rFrac = hash2D(tx, ty, salt + 5);
            const aFrac = hash2D(tx, ty, salt + 7);
            const cFrac = hash2D(tx, ty, salt + 11);

            const radius = layer.minRadius + (layer.maxRadius - layer.minRadius) * rFrac;
            let alpha = layer.minAlpha + (layer.maxAlpha - layer.minAlpha) * aFrac;
            if (layer.twinkle) {
              const phase = rFrac * Math.PI * 2 + now * (0.0014 + aFrac * 0.0016);
              alpha *= 0.78 + 0.22 * Math.sin(phase);
            }

            const color = STAR_COLORS[Math.floor(cFrac * STAR_COLORS.length) % STAR_COLORS.length];
            ctx.globalAlpha = alpha;
            ctx.fillStyle = color;

            if (radius <= 1.2) {
              // Fast crisp sub-2px rect for distant star dust
              const d = radius * 1.65;
              ctx.fillRect(sx - d * 0.5, sy - d * 0.5, d, d);
            } else {
              ctx.beginPath();
              ctx.arc(sx, sy, radius, 0, Math.PI * 2);
              ctx.fill();

              // Subtle 4-point optical diffraction glint on brightest hero stars
              if (layer.glintChance > 0 && rFrac > 1 - layer.glintChance) {
                const arm = radius * 3.4;
                ctx.globalAlpha = alpha * 0.42;
                ctx.fillRect(sx - arm, sy - 0.5, arm * 2, 1);
                ctx.fillRect(sx - 0.5, sy - arm, 1, arm * 2);
              }
            }
          }
        }
      }
    }
    ctx.restore();
  }

  public destroy(): void {
    this.nebulaTile = null;
  }
}
