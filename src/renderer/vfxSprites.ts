// src/renderer/vfxSprites.ts
// Pre-baked offscreen additive glow halos and tapered engine thruster plumes.
// Blitting pre-baked canvases with globalCompositeOperation = 'lighter' achieves
// HDR-like bloom at ~100x the speed of ctx.shadowBlur with zero per-frame allocations.

export type GlowColor =
  | 'cyan'
  | 'blue'
  | 'amber'
  | 'rose'
  | 'violet'
  | 'ice'
  | 'emerald'
  | 'white';

const GLOW_PALETTE: Record<GlowColor, { core: string; mid: string; outer: string }> = {
  cyan: {
    core: 'rgba(224, 252, 255, 1)',
    mid: 'rgba(34, 211, 238, 0.55)',
    outer: 'rgba(6, 182, 212, 0)',
  },
  blue: {
    core: 'rgba(219, 234, 254, 1)',
    mid: 'rgba(59, 130, 246, 0.55)',
    outer: 'rgba(37, 99, 235, 0)',
  },
  amber: {
    core: 'rgba(255, 251, 235, 1)',
    mid: 'rgba(245, 158, 11, 0.6)',
    outer: 'rgba(234, 88, 12, 0)',
  },
  rose: {
    core: 'rgba(255, 228, 236, 1)',
    mid: 'rgba(244, 63, 94, 0.58)',
    outer: 'rgba(225, 29, 72, 0)',
  },
  violet: {
    core: 'rgba(245, 243, 255, 1)',
    mid: 'rgba(168, 85, 247, 0.55)',
    outer: 'rgba(126, 34, 206, 0)',
  },
  ice: {
    core: 'rgba(240, 249, 255, 1)',
    mid: 'rgba(125, 211, 252, 0.58)',
    outer: 'rgba(56, 189, 248, 0)',
  },
  emerald: {
    core: 'rgba(236, 253, 245, 1)',
    mid: 'rgba(52, 211, 153, 0.55)',
    outer: 'rgba(16, 185, 129, 0)',
  },
  white: {
    core: 'rgba(255, 255, 255, 1)',
    mid: 'rgba(226, 232, 240, 0.5)',
    outer: 'rgba(148, 163, 184, 0)',
  },
};

const glowCache = new Map<GlowColor, HTMLCanvasElement>();
const plumeCache = new Map<GlowColor, HTMLCanvasElement>();

function bakeGlowSprite(color: GlowColor): HTMLCanvasElement {
  const size = 64;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  if (!ctx) return c;

  const pal = GLOW_PALETTE[color];
  const half = size / 2;
  const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
  grad.addColorStop(0, pal.core);
  grad.addColorStop(0.24, pal.mid);
  grad.addColorStop(0.62, pal.mid.replace(/0\.\d+\)$/, '0.16)'));
  grad.addColorStop(1, pal.outer);

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return c;
}

/**
 * Bakes a tapered thruster exhaust cone extending from x = width (engine nozzle)
 * leftwards to x = 0 (fading tail), centered vertically at y = height / 2.
 */
function bakePlumeSprite(color: GlowColor): HTMLCanvasElement {
  const w = 96;
  const h = 40;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) return c;

  const pal = GLOW_PALETTE[color];
  const cy = h / 2;

  // Outer soft ion halo
  ctx.save();
  ctx.translate(w, cy);
  ctx.scale(1, 0.42);
  const outerG = ctx.createRadialGradient(-10, 0, 2, -32, 0, 86);
  outerG.addColorStop(0, pal.mid);
  outerG.addColorStop(0.45, pal.mid.replace(/0\.\d+\)$/, '0.25)'));
  outerG.addColorStop(1, pal.outer);
  ctx.fillStyle = outerG;
  ctx.beginPath();
  ctx.arc(-32, 0, 86, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Inner tapered plasma jet
  const jetG = ctx.createLinearGradient(w, cy, 4, cy);
  jetG.addColorStop(0, pal.core);
  jetG.addColorStop(0.28, pal.mid);
  jetG.addColorStop(1, pal.outer);
  ctx.fillStyle = jetG;
  ctx.beginPath();
  ctx.moveTo(w, cy - 8);
  ctx.quadraticCurveTo(w * 0.45, cy - 5, 4, cy);
  ctx.quadraticCurveTo(w * 0.45, cy + 5, w, cy + 8);
  ctx.closePath();
  ctx.fill();

  // White-hot nozzle core
  const coreG = ctx.createRadialGradient(w - 5, cy, 0, w - 12, cy, 22);
  coreG.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
  coreG.addColorStop(0.5, pal.mid);
  coreG.addColorStop(1, pal.outer);
  ctx.fillStyle = coreG;
  ctx.beginPath();
  ctx.ellipse(w - 12, cy, 22, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  return c;
}

export function getGlowSprite(color: GlowColor): HTMLCanvasElement {
  let cached = glowCache.get(color);
  if (!cached) {
    cached = bakeGlowSprite(color);
    glowCache.set(color, cached);
  }
  return cached;
}

export function getPlumeSprite(color: GlowColor): HTMLCanvasElement {
  let cached = plumeCache.get(color);
  if (!cached) {
    cached = bakePlumeSprite(color);
    plumeCache.set(color, cached);
  }
  return cached;
}

export function resolveGlowColor(hexOrColor: string): GlowColor {
  const c = hexOrColor.toLowerCase();
  if (c.includes('ff2a') || c.includes('fb71') || c.includes('ef44') || c.includes('f43f') || c.includes('e11d')) {
    return 'rose';
  }
  if (c.includes('f59e') || c.includes('fbbf') || c.includes('f973') || c.includes('eab3')) {
    return 'amber';
  }
  if (c.includes('a855') || c.includes('c084') || c.includes('8b5c')) {
    return 'violet';
  }
  if (c.includes('bae6') || c.includes('7dd3')) {
    return 'ice';
  }
  if (c.includes('22c5') || c.includes('4ade') || c.includes('34d3') || c.includes('10b9')) {
    return 'emerald';
  }
  if (c.includes('ffff')) {
    return 'white';
  }
  if (c.includes('3b82') || c.includes('60a5')) {
    return 'blue';
  }
  return 'cyan';
}
