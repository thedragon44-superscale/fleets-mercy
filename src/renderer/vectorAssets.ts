export interface QuadrantStats {
  front: number;
  rear: number;
  port: number;
  starboard: number;
}

export interface DebugOverlayFlags {
  showRanges: boolean;
  showVitals: boolean;
  showVelocity: boolean;
  showHitboxes: boolean;
}

import { useSettingsStore } from '../config/settingsStore';

const spriteCache: { [key: string]: HTMLImageElement } = {};
const loadedSprites = new Set<string>();

const ASSET_FILENAME_MAP: { [unitId: string]: string } = {
  flagship: 'flagship.png',
  battalion_command_ship: 'flagship.png',
  command_escort: 'assault.png',
  viper_interceptor: 'viper.png',
  recon_probe: 'recon.png',
  phantom_transport: 'phantom.png',
  ion_interceptor: 'ion.png',
  mining_barge: 'mining.png',
  supply_tender: 'supply.png',
  plasma_skimmer: 'plasma.png',
  grav_extractor: 'grav.png',
  assault_gunship: 'assault.png',
  aegis_repair: 'aegis.png',
  vortex_minelayer: 'vortex.png',
  lancer_corvette: 'lancer.png',
  cryo_flak: 'cryo.png',
  specter_jammer: 'specter.png',
  aegis_wall: 'wall.png',
  torpedo_bomber: 'torpedo.png',
  warp_frigate: 'warp.png',
  gun_emplacement: 'turret.png'
};

if (typeof window !== 'undefined') {
  Object.entries(ASSET_FILENAME_MAP).forEach(([unitId, filename]) => {
    const img = new Image();
    try {
      img.src = new URL(`../assets/${filename}`, import.meta.url).href;
      img.onload = () => {
        if (img.naturalWidth !== 0) {
          loadedSprites.add(unitId);
        }
      };
      spriteCache[unitId] = img;
    } catch (e) {
      console.warn(`Failed to load asset: ${filename}`);
    }
  });
}

export const UNIT_SCALES: { [type: string]: { w: number; h: number } } = {
  flagship: { w: 90, h: 90 },
  battalion_command_ship: { w: 90, h: 90 },
  command_escort: { w: 52, h: 52 },
  viper_interceptor: { w: 36, h: 36 },
  recon_probe: { w: 32, h: 32 },
  phantom_transport: { w: 38, h: 38 },
  ion_interceptor: { w: 36, h: 36 },
  mining_barge: { w: 48, h: 48 },
  supply_tender: { w: 48, h: 48 },
  plasma_skimmer: { w: 44, h: 44 },
  grav_extractor: { w: 46, h: 46 },
  assault_gunship: { w: 48, h: 48 },
  aegis_repair: { w: 48, h: 48 },
  vortex_minelayer: { w: 46, h: 46 },
  lancer_corvette: { w: 56, h: 56 },
  cryo_flak: { w: 54, h: 54 },
  specter_jammer: { w: 52, h: 52 },
  aegis_wall: { w: 68, h: 68 },
  torpedo_bomber: { w: 64, h: 64 },
  warp_frigate: { w: 66, h: 66 },
  gun_emplacement: { w: 60, h: 60 },
  default: { w: 40, h: 40 }
};

const UNIT_ROTATION_OFFSETS: { [unitId: string]: number } = {
  // 1. Facing RIGHT in PNG file (0 offset)
  viper_interceptor: 0,
  lancer_corvette: 0,

  // 2. Facing LEFT in PNG file (Math.PI offset)
  flagship: Math.PI,
  battalion_command_ship: Math.PI,
  command_escort: Math.PI,
  assault_gunship: Math.PI,
  aegis_repair: Math.PI,
  cryo_flak: Math.PI,
  grav_extractor: Math.PI,
  mining_barge: Math.PI,
  plasma_skimmer: Math.PI,
  specter_jammer: Math.PI,
  supply_tender: Math.PI,
  torpedo_bomber: Math.PI,
  vortex_minelayer: Math.PI,

  // 3. Facing UP in PNG file (Math.PI / 2 offset)
  phantom_transport: Math.PI / 2,
  gun_emplacement: Math.PI / 2,
  aegis_wall: Math.PI / 2,
  ion_interceptor: Math.PI / 2,
  recon_probe: Math.PI / 2,
  warp_frigate: Math.PI / 2,

  default: 0
};

export function drawFlagship(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  shields?: QuadrantStats,
  _hull?: QuadrantStats,
  isFiring = false,
  isDestroyed = false,
  isAccelerating = false
) {
  if (isDestroyed) return;

  const { debugCollisions, debugRadarRanges } = useSettingsStore.getState();

  ctx.save();
  ctx.translate(x, y);

  const offset = UNIT_ROTATION_OFFSETS['flagship'] ?? Math.PI / 2;
  ctx.rotate(angle + offset);

  if (debugRadarRanges) {
    ctx.save();
    ctx.rotate(-offset);
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, 2000, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  if (debugCollisions) {
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    const scale = UNIT_SCALES['flagship'];
    ctx.strokeRect(-scale.w / 2, -scale.h / 2, scale.w, scale.h);
    ctx.setLineDash([]);
  }

  const img = spriteCache['flagship'];
  if (img && loadedSprites.has('flagship')) {
    ctx.drawImage(img, -45, -45, 90, 90);
  } else {
    ctx.strokeStyle = '#00f3ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -35); ctx.lineTo(25, 25); ctx.lineTo(-25, 25); ctx.closePath();
    ctx.stroke();
  }

  // Exhaust animation positioned at rear engines
  if (isAccelerating) {
    ctx.fillStyle = '#38bdf8';
    ctx.shadowColor = '#00f3ff';
    ctx.shadowBlur = 14;

    const flameLen = 22 + Math.random() * 16;
    ctx.beginPath();
    ctx.moveTo(42, -18); ctx.lineTo(42 + flameLen, -14); ctx.lineTo(42, -10); ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(42, 10); ctx.lineTo(42 + flameLen, 14); ctx.lineTo(42, 18); ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Muzzle flashes positioned at nose
  if (isFiring) {
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-42, -12); ctx.lineTo(-62, -12);
    ctx.moveTo(-42, 12); ctx.lineTo(-62, 12);
    ctx.stroke();
  }

  ctx.restore();

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  drawShieldArcs(ctx, shields, 52);
  ctx.restore();
}

export function drawUnitAsset(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  unitType: string,
  ownerId: string,
  isDestroyed = false
) {
  if (isDestroyed) return;

  const { debugCollisions, debugRadarRanges } = useSettingsStore.getState();

  ctx.save();
  ctx.translate(x, y);

  if (unitType === 'asteroid') {
    if (debugCollisions) {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(-40, -40, 80, 80);
      ctx.setLineDash([]);
    }
    ctx.strokeStyle = '#475569';
    ctx.fillStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -40); ctx.lineTo(30, -20); ctx.lineTo(40, 15); ctx.lineTo(15, 40); ctx.lineTo(-25, 30); ctx.lineTo(-35, -10);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.restore();
    return;
  }

  const offset = UNIT_ROTATION_OFFSETS[unitType] ?? 0;
  ctx.rotate(angle + offset);

  if (debugRadarRanges) {
    ctx.save();
    ctx.rotate(-offset);
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, 1200, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  if (debugCollisions) {
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    const scale = UNIT_SCALES[unitType] || UNIT_SCALES.default;
    ctx.strokeRect(-scale.w / 2, -scale.h / 2, scale.w, scale.h);
    ctx.setLineDash([]);
  }

  const img = spriteCache[unitType];
  const scale = UNIT_SCALES[unitType] || UNIT_SCALES.default;

  if (img && loadedSprites.has(unitType)) {
    ctx.drawImage(img, -scale.w / 2, -scale.h / 2, scale.w, scale.h);
  } else {
    ctx.strokeStyle = ownerId === 'player' ? '#00f3ff' : '#ff2a6d';
    ctx.beginPath(); ctx.arc(0, 0, scale.w / 3, 0, Math.PI * 2); ctx.stroke();
  }

  ctx.restore();
}

function drawShieldArcs(ctx: CanvasRenderingContext2D, shields?: QuadrantStats, radius = 35) {
  if (!shields) return;
  const drawArc = (startDeg: number, endDeg: number, val: number) => {
    if (val <= 0) return;
    ctx.strokeStyle = 'rgba(0, 243, 255,' + Math.min(val, 1) + ')';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, radius, (startDeg * Math.PI) / 180, (endDeg * Math.PI) / 180);
    ctx.stroke();
  };

  drawArc(-40, 40, shields.front);
  drawArc(50, 130, shields.starboard);
  drawArc(140, 220, shields.rear);
  drawArc(230, 310, shields.port);
}

// ==========================================
// SANDBOX DEBUG OVERLAYS & SPAWN GHOST
// ==========================================

export function drawUnitDebugOverlays(
  ctx: CanvasRenderingContext2D,
  unit: {
    id: string;
    type: string;
    ownerId: string;
    pos: { x: number; y: number };
    vel?: { x: number; y: number };
    shields?: QuadrantStats;
    hull?: QuadrantStats;
    aiState?: string;
    battalionId?: number;
    squadId?: number;
    isSquadLeader?: boolean;
    currentThermal?: number;
    currentAmmo?: number;
    isDestroyed?: boolean;
  },
  renderX: number,
  renderY: number,
  template: any,
  flags: DebugOverlayFlags,
  isControlled: boolean,
  isSelected: boolean
) {
  if (unit.isDestroyed) return;

  const scale = UNIT_SCALES[unit.type] || UNIT_SCALES.default;
  const halfH = scale.h / 2;

  ctx.save();
  ctx.translate(renderX, renderY);

  // Selection / Controlled Highlight Ring
  if (isControlled || isSelected) {
    ctx.strokeStyle = isControlled ? '#38bdf8' : '#f59e0b';
    ctx.lineWidth = 2;
    ctx.setLineDash(isControlled ? [] : [5, 4]);
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(scale.w, scale.h) * 0.65, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // 1. Hitbox Overlay
  if (flags.showHitboxes) {
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.85)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(-scale.w / 2, -scale.h / 2, scale.w, scale.h);
    ctx.setLineDash([]);
  }

  // 2. Range Rings Overlay (Data-Driven from PostgreSQL Templates)
  if (flags.showRanges && template) {
    const rings: Array<{ radius: number; color: string; dash: number[]; label: string }> = [
      { radius: template.sensorRange ?? 0, color: 'rgba(34, 211, 238, 0.35)', dash: [10, 6], label: 'SENSOR' },
      { radius: template.visionRange ?? 0, color: 'rgba(96, 165, 250, 0.35)', dash: [4, 4], label: 'VISION' },
      { radius: template.aggroRange ?? 0, color: 'rgba(245, 158, 11, 0.35)', dash: [6, 4], label: 'AGGRO' },
      { radius: template.maxRange ?? 0, color: 'rgba(239, 68, 68, 0.3)', dash: [8, 6], label: 'MAX' },
      { radius: template.optimalRange ?? 0, color: 'rgba(34, 197, 94, 0.35)', dash: [], label: 'OPT' },
    ];

    ctx.font = '9px monospace';
    ctx.lineWidth = 1;

    rings.forEach((ring, idx) => {
      if (ring.radius <= 0) return;
      ctx.strokeStyle = ring.color;
      ctx.setLineDash(ring.dash);
      ctx.beginPath();
      ctx.arc(0, 0, ring.radius, 0, Math.PI * 2);
      ctx.stroke();

      // Only label rings for the selected or piloted ship to prevent visual clutter
      if (isControlled || isSelected) {
        ctx.fillStyle = ring.color.replace(/0\.\d+\)/, '0.9)');
        const angleOffset = -Math.PI / 2 + idx * 0.22;
        const lx = Math.cos(angleOffset) * ring.radius;
        const ly = Math.sin(angleOffset) * ring.radius;
        ctx.fillText(`${ring.label} ${Math.round(ring.radius)}`, lx + 4, ly - 2);
      }
    });
    ctx.setLineDash([]);
  }

  // 3. Velocity Vector Arrow
  if (flags.showVelocity && unit.vel) {
    const vx = unit.vel.x || 0;
    const vy = unit.vel.y || 0;
    const speed = Math.hypot(vx, vy);
    if (speed > 0.05) {
      const vecScale = 14;
      const ex = vx * vecScale;
      const ey = vy * vecScale;
      const ang = Math.atan2(ey, ex);

      ctx.strokeStyle = '#a3e635';
      ctx.fillStyle = '#a3e635';
      ctx.lineWidth = 1.75;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(ex, ey);
      ctx.stroke();

      // Arrowhead
      const headLen = 7;
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex - headLen * Math.cos(ang - Math.PI / 6), ey - headLen * Math.sin(ang - Math.PI / 6));
      ctx.lineTo(ex - headLen * Math.cos(ang + Math.PI / 6), ey - headLen * Math.sin(ang + Math.PI / 6));
      ctx.closePath();
      ctx.fill();
    }
  }

  // 4. Floating Vitals, AI State, Squad Badge & Thermal/Ammo Bars
  if (flags.showVitals) {
    const barW = Math.max(40, scale.w * 0.9);
    const barH = 4;
    const topY = -halfH - 18;

    const totalShield = unit.shields
      ? unit.shields.front + unit.shields.rear + unit.shields.port + unit.shields.starboard
      : 0;
    const maxShield = Math.max(1, (template?.shieldBase || 100) * 4);
    const shieldPct = Math.max(0, Math.min(1, totalShield / maxShield));

    const totalHull = unit.hull
      ? unit.hull.front + unit.hull.rear + unit.hull.port + unit.hull.starboard
      : 0;
    const maxHull = Math.max(1, (template?.hullBase || 100) * 4);
    const hullPct = Math.max(0, Math.min(1, totalHull / maxHull));

    // Shield bar
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(-barW / 2, topY, barW, barH);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-barW / 2, topY, barW * shieldPct, barH);

    // Hull bar
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(-barW / 2, topY + 5, barW, barH);
    ctx.fillStyle = hullPct > 0.5 ? '#22c55e' : hullPct > 0.25 ? '#f59e0b' : '#ef4444';
    ctx.fillRect(-barW / 2, topY + 5, barW * hullPct, barH);

    // Thermal bar (if unit tracks thermal load)
    const maxThermal = template?.maxThermalCapacity || 0;
    if (maxThermal > 0 && (unit.currentThermal ?? 0) > 0) {
      const thermalPct = Math.max(0, Math.min(1, (unit.currentThermal || 0) / maxThermal));
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(-barW / 2, topY + 10, barW, 3);
      ctx.fillStyle = thermalPct > 0.8 ? '#ef4444' : '#f97316';
      ctx.fillRect(-barW / 2, topY + 10, barW * thermalPct, 3);
    }

    // Label line above bars: [AI_STATE] + Squad/Battalion badge
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    const factionColor = unit.ownerId === 'player' ? '#4ade80' : '#f87171';
    const squadTag =
      unit.squadId || unit.battalionId
        ? ` B${unit.battalionId || 0}·S${unit.squadId || 0}${unit.isSquadLeader ? '★' : ''}`
        : '';
    const stateTag = unit.aiState ? `[${unit.aiState}]` : '';
    ctx.fillStyle = factionColor;
    ctx.fillText(`${stateTag}${squadTag}`.trim() || unit.type, 0, topY - 4);

    // Unit ID + Ammo below sprite
    ctx.font = '8px monospace';
    ctx.fillStyle = 'rgba(226, 232, 240, 0.8)';
    const ammoText =
      (template?.ammoCapacity ?? -1) > 0 && unit.currentAmmo !== undefined
        ? ` | AMMO:${unit.currentAmmo}`
        : '';
    ctx.fillText(`${unit.id}${ammoText}`, 0, halfH + 12);
    ctx.textAlign = 'left';
  }

  ctx.restore();
}

export function drawSpawnGhost(
  ctx: CanvasRenderingContext2D,
  worldX: number,
  worldY: number,
  unitType: string,
  faction: 'player' | 'enemy'
) {
  const scale = UNIT_SCALES[unitType] || UNIT_SCALES.default;
  const color = faction === 'player' ? '#22c55e' : '#ef4444';

  ctx.save();
  ctx.translate(worldX, worldY);
  ctx.globalAlpha = 0.55;

  const img = spriteCache[unitType];
  if (img && loadedSprites.has(unitType)) {
    const offset = UNIT_ROTATION_OFFSETS[unitType] ?? 0;
    ctx.save();
    ctx.rotate(offset);
    ctx.drawImage(img, -scale.w / 2, -scale.h / 2, scale.w, scale.h);
    ctx.restore();
  }

  ctx.globalAlpha = 0.9;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.arc(0, 0, Math.max(scale.w, scale.h) * 0.65, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Crosshair ticks
  const r = Math.max(scale.w, scale.h) * 0.8;
  ctx.beginPath();
  ctx.moveTo(-r, 0); ctx.lineTo(-r + 8, 0);
  ctx.moveTo(r, 0); ctx.lineTo(r - 8, 0);
  ctx.moveTo(0, -r); ctx.lineTo(0, -r + 8);
  ctx.moveTo(0, r); ctx.lineTo(0, r - 8);
  ctx.stroke();

  ctx.font = 'bold 9px monospace';
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.fillText(`SPAWN ${faction.toUpperCase()}: ${unitType}`, 0, -r - 6);
  ctx.textAlign = 'left';

  ctx.restore();
}

export function drawHUDDiagnostics(ctx: CanvasRenderingContext2D, shields?: QuadrantStats, _hull?: QuadrantStats) {
  ctx.save();
  ctx.font = '10px monospace'; ctx.fillStyle = '#00f3ff';
  const canvasHeight = ctx.canvas?.height || window.innerHeight;
  ctx.fillText('FRONT SHD: ' + (shields?.front || 0).toFixed(1), 20, canvasHeight - 80);
  ctx.fillText('REAR  SHD: ' + (shields?.rear || 0).toFixed(1), 20, canvasHeight - 65);
  ctx.fillText('PORT  SHD: ' + (shields?.port || 0).toFixed(1), 20, canvasHeight - 50);
  ctx.fillText('STBD  SHD: ' + (shields?.starboard || 0).toFixed(1), 20, canvasHeight - 35);
  ctx.restore();
}

export function drawTargetDummy(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  _shields?: QuadrantStats,
  _hull?: QuadrantStats,
  isDestroyed = false,
  ownerId = 'enemy',
  type = 'viper_interceptor'
) {
  drawUnitAsset(ctx, x, y, angle, type, ownerId, isDestroyed);
}

export function drawProjectile(ctx: CanvasRenderingContext2D, x: number, y: number, _vx: number, _vy: number, type: string) {
  ctx.save();
  ctx.fillStyle = type === 'player' ? '#00f3ff' : '#ff2a6d';
  ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// ==========================================
// ENVIRONMENTAL STRUCTURES & RESOURCES RENDERERS
// ==========================================

export function renderEnvironmentVector(ctx: CanvasRenderingContext2D, type: string, radius: number) {
  ctx.save();

  switch (type) {
    case 'major_world':
    case 'terrestrial':
      ctx.fillStyle = '#1e3a8a';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#15803d';
      ctx.beginPath(); ctx.arc(-radius * 0.3, -radius * 0.2, radius * 0.35, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(radius * 0.35, radius * 0.3, radius * 0.3, 0, Math.PI * 2); ctx.fill();
      break;

    case 'planetoid':
      ctx.fillStyle = '#334155';
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#d97706';
      ctx.beginPath(); ctx.arc(radius * 0.2, -radius * 0.25, radius * 0.15, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(-radius * 0.3, radius * 0.3, radius * 0.18, 0, Math.PI * 2); ctx.fill();
      break;

    case 'gas_giant':
      ctx.strokeStyle = 'rgba(100, 150, 255, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, radius * 0.85, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = 'rgba(255, 100, 100, 0.6)';
      ctx.beginPath(); ctx.arc(0, 0, radius * 0.6, 0, Math.PI * 2); ctx.stroke();
      break;

    case 'asteroid_belt':
      ctx.fillStyle = 'rgba(120, 120, 120, 0.5)';
      ctx.strokeStyle = 'rgba(180, 180, 180, 0.8)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const dist = radius * (0.6 + Math.sin(i) * 0.3);
        const x = Math.cos(angle) * dist;
        const y = Math.sin(angle) * dist;
        ctx.beginPath(); ctx.arc(x, y, 15 + (i % 3) * 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
      break;

    case 'moon':
      ctx.fillStyle = '#2d3748';
      ctx.strokeStyle = '#cbd5e0';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#4a5568';
      ctx.beginPath(); ctx.arc(-radius * 0.3, -radius * 0.2, radius * 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(radius * 0.4, radius * 0.3, radius * 0.15, 0, Math.PI * 2); ctx.fill();
      break;

    case 'nebula':
      ctx.fillStyle = 'rgba(128, 0, 128, 0.15)';
      ctx.strokeStyle = 'rgba(216, 112, 214, 0.4)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.setLineDash([]);
      break;

    case 'singularity':
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#000000';
      ctx.beginPath(); ctx.arc(0, 0, radius * 0.4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      break;

    case 'comet':
      ctx.strokeStyle = 'rgba(0, 200, 255, 0.6)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(-radius * 6, -radius * 2); ctx.lineTo(-radius * 4, radius * 2); ctx.closePath();
      ctx.fillStyle = 'rgba(0, 200, 255, 0.2)'; ctx.fill();
      ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.stroke();
      break;

    default:
      break;
  }

  ctx.restore();
}

export function renderResourceNodeVector(ctx: CanvasRenderingContext2D, resourceType: number) {
  ctx.save();
  const colors = ['', '#a0aec0', '#d69e2e', '#3182ce', '#805ad5', '#38b2ac'];
  ctx.fillStyle = colors[resourceType] || '#ffffff';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  ctx.moveTo(0, -10); ctx.lineTo(10, 0); ctx.lineTo(0, 10); ctx.lineTo(-10, 0); ctx.closePath();
  ctx.fill(); ctx.stroke();

  ctx.restore();
}
