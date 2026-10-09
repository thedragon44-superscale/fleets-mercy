export interface QuadrantStats {
  front: number;
  rear: number;
  port: number;
  starboard: number;
}

const spriteCache: { [key: string]: HTMLImageElement } = {};

const ASSET_FILENAME_MAP: { [unitId: string]: string } = {
  flagship: 'flagship.png',
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

Object.entries(ASSET_FILENAME_MAP).forEach(([unitId, filename]) => {
  const img = new Image();
  try {
    img.src = new URL(`../assets/${filename}`, import.meta.url).href;
    spriteCache[unitId] = img;
  } catch (e) {
    console.warn(`Failed to load asset: ${filename}`);
  }
});

const UNIT_SCALES: { [type: string]: { w: number; h: number } } = {
  flagship: { w: 90, h: 90 },
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

// Canvas Angle = 0 points RIGHT (3 o'clock)
const UNIT_ROTATION_OFFSETS: { [unitId: string]: number } = {
  // Native LEFT -> rotate +180deg (Math.PI)
  flagship: Math.PI, aegis_repair: Math.PI, assault_gunship: Math.PI, 
  grav_extractor: Math.PI, mining_barge: Math.PI, plasma_skimmer: Math.PI, 
  specter_jammer: Math.PI, supply_tender: Math.PI, torpedo_bomber: Math.PI, 
  vortex_minelayer: Math.PI,

  // Native RIGHT -> rotate 0deg (0)
  lancer_corvette: 0, viper_interceptor: 0,

  // Native UP -> rotate +90deg (Math.PI / 2)
  cryo_flak: Math.PI / 2, ion_interceptor: Math.PI / 2, phantom_transport: Math.PI / 2, 
  recon_probe: Math.PI / 2, gun_emplacement: Math.PI / 2, aegis_wall: Math.PI / 2, 
  warp_frigate: Math.PI / 2
};

export function drawFlagship(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, shields?: QuadrantStats, hull?: QuadrantStats, isFiring = false, isDestroyed = false) {
  if (isDestroyed) return;

  ctx.save();
  ctx.translate(x, y);
  
  const offset = UNIT_ROTATION_OFFSETS['flagship'] ?? Math.PI;
  ctx.rotate(angle + offset);

  const img = spriteCache['flagship'];
  if (img && img.complete && img.naturalWidth !== 0) {
    ctx.drawImage(img, -45, -45, 90, 90);
  } else {
    ctx.strokeStyle = '#00f3ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -35); ctx.lineTo(25, 25); ctx.lineTo(-25, 25); ctx.closePath();
    ctx.stroke();
  }

  if (isFiring) {
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(35, -10); ctx.lineTo(55, -10);
    ctx.moveTo(35, 10); ctx.lineTo(55, 10);
    ctx.stroke();
  }

  ctx.restore();

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  drawShieldArcs(ctx, shields, 52);
  ctx.restore();
}

export function drawUnitAsset(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, unitType: string, ownerId: string, isDestroyed = false) {
  if (isDestroyed) return;

  ctx.save();
  ctx.translate(x, y);

  if (unitType === 'asteroid') {
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

  const img = spriteCache[unitType];
  const scale = UNIT_SCALES[unitType] || UNIT_SCALES.default;

  if (img && img.complete && img.naturalWidth !== 0) {
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
    ctx.strokeStyle = `rgba(0, 243, 255, ${Math.min(val, 1)})`;
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

export function drawHUDDiagnostics(ctx: CanvasRenderingContext2D, shields?: QuadrantStats, hull?: QuadrantStats) {
  ctx.save();
  ctx.font = '10px monospace'; ctx.fillStyle = '#00f3ff';
  ctx.fillText(`FRONT SHD: ${(shields?.front || 0).toFixed(1)}`, 20, window.innerHeight - 80);
  ctx.fillText(`REAR  SHD: ${(shields?.rear || 0).toFixed(1)}`, 20, window.innerHeight - 65);
  ctx.fillText(`PORT  SHD: ${(shields?.port || 0).toFixed(1)}`, 20, window.innerHeight - 50);
  ctx.fillText(`STBD  SHD: ${(shields?.starboard || 0).toFixed(1)}`, 20, window.innerHeight - 35);
  ctx.restore();
}

export function drawTargetDummy(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, shields?: QuadrantStats, hull?: QuadrantStats, isDestroyed = false, ownerId = 'enemy', type = 'viper_interceptor') {
  drawUnitAsset(ctx, x, y, angle, type, ownerId, isDestroyed);
}

export function drawProjectile(ctx: CanvasRenderingContext2D, x: number, y: number, vx: number, vy: number, type: string) {
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
                ctx.beginPath();
                ctx.arc(x, y, 15 + (i % 3) * 8, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
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
            ctx.beginPath(); ctx.arc(0, 0, radius * 0.4, 0, Math.PI * 2); ctx.fill();
            ctx.stroke();
            break;

        case 'comet':
            ctx.strokeStyle = 'rgba(0, 200, 255, 0.6)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-radius * 6, -radius * 2);
            ctx.lineTo(-radius * 4, radius * 2);
            ctx.closePath();
            ctx.fillStyle = 'rgba(0, 200, 255, 0.2)';
            ctx.fill();
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
    ctx.moveTo(0, -10);
    ctx.lineTo(10, 0);
    ctx.lineTo(0, 10);
    ctx.lineTo(-10, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    ctx.restore();
}
