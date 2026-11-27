// src/renderer/pixiSprites.ts
// Shared Pixi.js v8 WebGL mipmapped unit sprite loader, scale calibration, and pooled Sprite layer.
import { Assets, Container, Sprite, Texture } from 'pixi.js';

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
export const PIXI_UNIT_SCALES: Record<string, number> = {
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

const textureByFilename = new Map<string, Texture>();
let loadAllPromise: Promise<void> | null = null;

/**
 * Loads all 19 optimized power-of-two unit PNGs into Pixi.js v8 GPU textures
 * with autoGenerateMipmaps + linear filtering + 4x anisotropic filtering enabled.
 * Safe to call multiple times across modes; resolves from cache after first load.
 */
export function loadPixiUnitTextures(): Promise<void> {
  if (loadAllPromise) return loadAllPromise;

  const uniqueFiles = Array.from(new Set(Object.values(UNIT_ASSET_FILENAMES)));
  loadAllPromise = Promise.all(
    uniqueFiles.map(async (filename) => {
      try {
        const srcUrl = new URL(`../assets/${filename}`, import.meta.url).href;
        const tex = await Assets.load<Texture>({
          src: srcUrl,
          data: {
            autoGenerateMipmaps: true,
            scaleMode: 'linear',
            maxAnisotropy: 4,
          },
        });
        if (tex?.source) {
          tex.source.autoGenerateMipmaps = true;
          tex.source.scaleMode = 'linear';
          tex.source.maxAnisotropy = 4;
          tex.source.updateMipmaps();
        }
        textureByFilename.set(filename, tex);
      } catch (err) {
        console.warn(`[PIXI SPRITES] Failed to load texture ${filename}:`, err);
      }
    })
  ).then(() => undefined);

  return loadAllPromise;
}

export function getPixiUnitTexture(unitType: string): Texture | null {
  const filename = UNIT_ASSET_FILENAMES[unitType];
  if (!filename) return null;
  return textureByFilename.get(filename) ?? null;
}

export function getPixiUnitSize(unitType: string): number {
  return PIXI_UNIT_SCALES[unitType] ?? PIXI_UNIT_SCALES.default;
}

export function getPixiUnitRotationOffset(unitType: string): number {
  return UNIT_ROTATION_OFFSETS[unitType] ?? 0;
}

export interface SpriteSyncItem {
  id: string;
  unitType: string;
  x: number;
  y: number;
  angle: number;
  size: number;
  alpha?: number;
  tint?: number;
}

/**
 * Pooled Pixi.js Sprite container that synchronizes active units at 60Hz
 * with zero per-frame Sprite allocations or GPU texture churn.
 */
export class PixiUnitSpriteLayer {
  public readonly container = new Container();
  private readonly sprites = new Map<string, Sprite>();
  private readonly activeIds = new Set<string>();

  public sync(items: SpriteSyncItem[]): void {
    this.activeIds.clear();

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const tex = getPixiUnitTexture(item.unitType);
      if (!tex) continue;

      this.activeIds.add(item.id);
      let sprite = this.sprites.get(item.id);
      if (!sprite) {
        sprite = new Sprite(tex);
        sprite.anchor.set(0.5);
        this.sprites.set(item.id, sprite);
        this.container.addChild(sprite);
      } else if (sprite.texture !== tex) {
        sprite.texture = tex;
      }

      sprite.position.set(item.x, item.y);
      sprite.rotation = item.angle + getPixiUnitRotationOffset(item.unitType);
      sprite.width = item.size;
      sprite.height = item.size;
      sprite.alpha = item.alpha ?? 1;
      sprite.tint = item.tint ?? 0xffffff;
      sprite.visible = true;
    }

    for (const [id, sprite] of this.sprites) {
      if (!this.activeIds.has(id)) {
        this.container.removeChild(sprite);
        sprite.destroy();
        this.sprites.delete(id);
      }
    }
  }

  public clear(): void {
    for (const sprite of this.sprites.values()) {
      this.container.removeChild(sprite);
      sprite.destroy();
    }
    this.sprites.clear();
    this.activeIds.clear();
  }
}
