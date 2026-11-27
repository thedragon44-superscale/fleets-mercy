// src/renderer/viewportCamera.ts
// Renderer-agnostic camera transforms, screen/world coordinate conversion, frustum bounds, and hit-testing.

export interface Vec2 {
  x: number;
  y: number;
}

export type ViewportCameraState =
  | {
      mode: 'camera';
      x: number;
      y: number;
      zoom: number;
    }
  | {
      mode: 'fit';
      arenaWidth: number;
      arenaHeight: number;
    };

export interface CameraTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export interface WorldBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Computes the affine 2D transform mapping world coordinates -> logical screen coordinates:
 *   screenX = worldX * scale + offsetX
 *   screenY = worldY * scale + offsetY
 */
export function computeCameraTransform(
  camera: ViewportCameraState,
  viewWidth: number,
  viewHeight: number
): CameraTransform {
  if (camera.mode === 'fit') {
    const arenaW = camera.arenaWidth > 0 ? camera.arenaWidth : 2400;
    const arenaH = camera.arenaHeight > 0 ? camera.arenaHeight : 1600;
    const scale = Math.min(viewWidth / arenaW, viewHeight / arenaH);
    return {
      scale,
      offsetX: (viewWidth - arenaW * scale) / 2,
      offsetY: (viewHeight - arenaH * scale) / 2,
    };
  }

  const scale = camera.zoom > 0 ? camera.zoom : 1;
  return {
    scale,
    offsetX: viewWidth / 2 - camera.x * scale,
    offsetY: viewHeight / 2 - camera.y * scale,
  };
}

export function screenToWorld(
  screenX: number,
  screenY: number,
  camera: ViewportCameraState,
  viewWidth: number,
  viewHeight: number
): Vec2 {
  const { scale, offsetX, offsetY } = computeCameraTransform(camera, viewWidth, viewHeight);
  return {
    x: (screenX - offsetX) / scale,
    y: (screenY - offsetY) / scale,
  };
}

export function worldToScreen(
  worldX: number,
  worldY: number,
  camera: ViewportCameraState,
  viewWidth: number,
  viewHeight: number
): Vec2 {
  const { scale, offsetX, offsetY } = computeCameraTransform(camera, viewWidth, viewHeight);
  return {
    x: worldX * scale + offsetX,
    y: worldY * scale + offsetY,
  };
}

export function computeVisibleWorldBounds(
  camera: ViewportCameraState,
  viewWidth: number,
  viewHeight: number,
  padding = 0
): WorldBounds {
  const { scale, offsetX, offsetY } = computeCameraTransform(camera, viewWidth, viewHeight);
  const invScale = scale > 0 ? 1 / scale : 1;
  return {
    minX: -offsetX * invScale - padding,
    minY: -offsetY * invScale - padding,
    maxX: (viewWidth - offsetX) * invScale + padding,
    maxY: (viewHeight - offsetY) * invScale + padding,
  };
}

export function hitTestUnits<T extends { pos: Vec2; isDestroyed?: boolean }>(
  worldX: number,
  worldY: number,
  units: readonly T[],
  getHitRadius: (unit: T) => number
): T | null {
  let closest: T | null = null;
  let bestDist = Infinity;

  for (let i = 0; i < units.length; i++) {
    const u = units[i];
    if (u.isDestroyed) continue;
    const hitRadius = getHitRadius(u);
    const d = Math.hypot(u.pos.x - worldX, u.pos.y - worldY);
    if (d <= hitRadius && d < bestDist) {
      bestDist = d;
      closest = u;
    }
  }

  return closest;
}
