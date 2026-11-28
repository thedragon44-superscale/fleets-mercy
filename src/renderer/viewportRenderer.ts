// src/renderer/viewportRenderer.ts
// Swappable, stateless ViewportRenderer contract shared by Sandbox, TDM, and Space Pirates.
// Viewports produce plain ViewportFrameState data and talk only to this interface, allowing
// Canvas2DRenderer to be swapped for PixiRenderer / WebGPURenderer later without touching game modes.
import type { RenderableEnvObject } from '../utils/envRenderer';
import type { ViewportCameraState } from './viewportCamera';

export interface ViewportRendererInitOptions {
  backgroundColor?: string;
}

export interface RenderStarDot {
  x: number;
  y: number;
  r: number;
  alpha: number;
}

export type RenderBackdrop =
  | {
      kind: 'grid';
      spacing: number;
      lineColor: string;
      borderColor: string;
      borderWidth?: number;
    }
  | {
      kind: 'arena';
      fillColor: string;
      glowColor?: string;
      gridSpacing: number;
      gridColor: string;
      borderColor: string;
      stars?: readonly RenderStarDot[];
    };

export interface RenderBeacon {
  x: number;
  y: number;
  radius: number;
  color: string;
  occupied: boolean;
  label: string;
}

export interface RenderLegacyRock {
  id: number;
  x: number;
  y: number;
  radius: number;
  isNode: boolean;
  color: string;
}

export interface RenderCryoCloud {
  id: number;
  x: number;
  y: number;
  radius: number;
  ratio: number;
}

export interface RenderUnitRing {
  radius: number;
  strokeColor: string;
  strokeAlpha?: number;
  lineWidth?: number;
  fillColor?: string;
  fillAlpha?: number;
  dashed?: boolean;
}

export interface RenderUnitRangeCircle {
  radius: number;
  color: string;
  alpha: number;
}

export interface RenderUnitBar {
  yOffset: number;
  width: number;
  height: number;
  ratio: number;
  fillColor: string;
  bgColor?: string;
}

export interface RenderUnitLabel {
  text: string;
  yOffset: number;
  color: string;
  fontSize: number;
  bold?: boolean;
}

export interface RenderUnitShieldArcs {
  radius: number;
  front: number;
  rear: number;
  port: number;
  starboard: number;
}

export interface RenderHarvesterOverlay {
  ringRadius: number;
  cargoRatio: number;
  cargoColor: string;
  isHarvesting: boolean;
  beamColor: string;
  beamLength: number;
}

export interface RenderUnit {
  id: string;
  unitType: string;
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  faction?: 'player' | 'enemy' | 'neutral';
  isFiring?: boolean;
  shieldRatio?: number;
  angle: number;
  size: number;
  alpha?: number;
  fallbackColor: string;
  ring?: RenderUnitRing;
  stealthRingRadius?: number;
  hitbox?: boolean;
  ranges?: RenderUnitRangeCircle[];
  thrustFlames?: boolean;
  flagshipMuzzleFlash?: boolean;
  muzzleFlashDot?: boolean;
  shieldArcs?: RenderUnitShieldArcs;
  harvester?: RenderHarvesterOverlay;
  velocityVector?: { vx: number; vy: number; scale: number; color: string };
  bars?: RenderUnitBar[];
  labels?: RenderUnitLabel[];
}

export interface RenderProjectile {
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  kind: 'dot' | 'laser' | 'railgun' | 'torpedo' | 'cryo';
  color: string;
  radius?: number;
}

export interface RenderGhostSprite {
  unitType: string;
  x: number;
  y: number;
  size: number;
  ringColor: string;
  alpha?: number;
}

export interface RenderFloatingText {
  text: string;
  x: number;
  y: number;
  color: string;
  fontSize: number;
  alpha: number;
}

export interface ViewportFrameState {
  now: number;
  worldWidth: number;
  worldHeight: number;
  backgroundColor: string;
  backdrop?: RenderBackdrop;
  beacons?: readonly RenderBeacon[];
  legacyRocks?: readonly RenderLegacyRock[];
  cryoClouds?: readonly RenderCryoCloud[];
  units: readonly RenderUnit[];
  projectiles: readonly RenderProjectile[];
  ghostSprite?: RenderGhostSprite | null;
  floatingTexts?: readonly RenderFloatingText[];
}

/**
 * Single rendering interface implemented by Canvas2DRenderer (and any future Pixi/WebGPU renderer).
 */
export interface ViewportRenderer {
  init(canvas: HTMLCanvasElement, options?: ViewportRendererInitOptions): void;
  resize(width: number, height: number, dpr?: number): void;
  setEnvObjects(
    envObjects: readonly RenderableEnvObject[],
    colorByResourceEnum?: Record<number, string>
  ): void;
  render(frame: ViewportFrameState, camera: ViewportCameraState): void;
  destroy(): void;
}
