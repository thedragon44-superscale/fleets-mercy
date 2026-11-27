// src/renderer/spriteRegistry.ts
// Shared, renderer-agnostic data-driven PNG sprite manifest and HTMLImageElement cache.
// Works directly with Canvas2DRenderer (ctx.drawImage) and can feed Pixi/WebGPU textures later.
import aegisUrl from '../assets/aegis.png';
import assaultUrl from '../assets/assault.png';
import cryoUrl from '../assets/cryo.png';
import flagshipUrl from '../assets/flagship.png';
import gravUrl from '../assets/grav.png';
import ionUrl from '../assets/ion.png';
import lancerUrl from '../assets/lancer.png';
import miningUrl from '../assets/mining.png';
import phantomUrl from '../assets/phantom.png';
import plasmaUrl from '../assets/plasma.png';
import reconUrl from '../assets/recon.png';
import specterUrl from '../assets/specter.png';
import supplyUrl from '../assets/supply.png';
import torpedoUrl from '../assets/torpedo.png';
import turretUrl from '../assets/turret.png';
import viperUrl from '../assets/viper.png';
import vortexUrl from '../assets/vortex.png';
import wallUrl from '../assets/wall.png';
import warpUrl from '../assets/warp.png';

export interface SpriteAssetEntry {
  filename: string;
  url: string;
}

export const SPRITE_MANIFEST: Record<string, SpriteAssetEntry> = {
  'aegis.png': { filename: 'aegis.png', url: aegisUrl },
  'assault.png': { filename: 'assault.png', url: assaultUrl },
  'cryo.png': { filename: 'cryo.png', url: cryoUrl },
  'flagship.png': { filename: 'flagship.png', url: flagshipUrl },
  'grav.png': { filename: 'grav.png', url: gravUrl },
  'ion.png': { filename: 'ion.png', url: ionUrl },
  'lancer.png': { filename: 'lancer.png', url: lancerUrl },
  'mining.png': { filename: 'mining.png', url: miningUrl },
  'phantom.png': { filename: 'phantom.png', url: phantomUrl },
  'plasma.png': { filename: 'plasma.png', url: plasmaUrl },
  'recon.png': { filename: 'recon.png', url: reconUrl },
  'specter.png': { filename: 'specter.png', url: specterUrl },
  'supply.png': { filename: 'supply.png', url: supplyUrl },
  'torpedo.png': { filename: 'torpedo.png', url: torpedoUrl },
  'turret.png': { filename: 'turret.png', url: turretUrl },
  'viper.png': { filename: 'viper.png', url: viperUrl },
  'vortex.png': { filename: 'vortex.png', url: vortexUrl },
  'wall.png': { filename: 'wall.png', url: wallUrl },
  'warp.png': { filename: 'warp.png', url: warpUrl },
};

export const UNIT_ASSET_FILENAMES: Record<string, string> = {
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
  gun_emplacement: 'turret.png',
};

// Recalibrated square sprite sizes for 10%-padded power-of-two unit PNGs,
// aligned with backend physical radii (ShipRadiusForWeight = 18 + 3.5*w).
export const UNIT_SPRITE_SIZES: Record<string, number> = {
  // 1W (r = 21.5px)
  viper_interceptor: 46,
  recon_probe: 42,
  phantom_transport: 46,
  ion_interceptor: 46,
  // 2W (r = 25px)
  mining_barge: 54,
  supply_tender: 54,
  plasma_skimmer: 52,
  grav_extractor: 54,
  // 3W (r = 28.5px)
  assault_gunship: 58,
  command_escort: 58,
  aegis_repair: 58,
  vortex_minelayer: 58,
  // 4W (r = 32px)
  lancer_corvette: 66,
  cryo_flak: 64,
  specter_jammer: 64,
  // 5W (r = 35.5px)
  aegis_wall: 74,
  torpedo_bomber: 72,
  warp_frigate: 74,
  gun_emplacement: 68,
  // Capital / Flagship
  battalion_command_ship: 96,
  flagship: 96,
  default: 52,
};

// Rotation offset from source PNG art orientation to 0 rad (+X right)
export const UNIT_ROTATION_OFFSETS: Record<string, number> = {
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

  default: 0,
};

const imageByFilename = new Map<string, HTMLImageElement>();
let preloadPromise: Promise<void> | null = null;

function loadImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => {
      if (typeof img.decode === 'function') {
        img.decode().then(() => resolve(img)).catch(() => resolve(img));
      } else {
        resolve(img);
      }
    };
    img.onerror = (err) => reject(err);
    img.src = url;
  });
}

/**
 * Preloads all 19 optimized unit PNGs once into a shared HTMLImageElement cache.
 * Safe to invoke repeatedly across mode switches.
 */
export function preloadUnitSprites(): Promise<void> {
  if (preloadPromise) return preloadPromise;

  const entries = Object.values(SPRITE_MANIFEST);
  preloadPromise = Promise.all(
    entries.map(async (entry) => {
      try {
        const img = await loadImageElement(entry.url);
        imageByFilename.set(entry.filename, img);
      } catch (err) {
        console.warn(`[SPRITE REGISTRY] Failed to load ${entry.filename}:`, err);
      }
    })
  ).then(() => undefined);

  return preloadPromise;
}

export function getUnitSpriteImage(unitType: string): HTMLImageElement | null {
  const filename = UNIT_ASSET_FILENAMES[unitType];
  if (!filename) return null;
  const img = imageByFilename.get(filename);
  if (!img || !img.complete || img.naturalWidth === 0) return null;
  return img;
}

// Canonical circular hull hitbox radii mirroring backend envphysics.ShipHitboxRadius
// (visible 80% hull inside 10%-padded square PNG sprites).
export const UNIT_HITBOX_RADII: Record<string, number> = {
  viper_interceptor: 18.0,
  recon_probe: 16.5,
  phantom_transport: 18.0,
  ion_interceptor: 18.0,
  mining_barge: 21.0,
  supply_tender: 21.0,
  plasma_skimmer: 20.0,
  grav_extractor: 21.0,
  assault_gunship: 22.5,
  command_escort: 22.5,
  aegis_repair: 22.5,
  vortex_minelayer: 22.5,
  lancer_corvette: 25.5,
  cryo_flak: 25.0,
  specter_jammer: 25.0,
  aegis_wall: 29.0,
  torpedo_bomber: 28.0,
  warp_frigate: 29.0,
  gun_emplacement: 26.5,
  battalion_command_ship: 37.0,
  flagship: 37.0,
  default: 20.0,
};

export function getUnitSpriteSize(unitType: string): number {
  return UNIT_SPRITE_SIZES[unitType] ?? UNIT_SPRITE_SIZES.default;
}

export function getUnitHitboxRadius(unitType: string): number {
  return UNIT_HITBOX_RADII[unitType] ?? UNIT_HITBOX_RADII.default;
}

export function getUnitRotationOffset(unitType: string): number {
  return UNIT_ROTATION_OFFSETS[unitType] ?? 0;
}
