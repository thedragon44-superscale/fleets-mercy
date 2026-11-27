// src/components/teamDeathMatch/tdmViewport.tsx
import React, { useEffect, useRef, useState } from 'react';
import { WS_BASE_URL } from '../../config';
import {
  unpackServerBinaryMessage,
  serializeClientInput,
  ServerStateSnapshot,
  SnapshotUnit,
} from '../../parsers/binaryCodec';
import { fetchMapDetail, MapDefinition } from '../../services/mapService';
import { useUnitTemplates } from '../../hooks/useUnitTemplates';
import { useFlightControls } from '../../hooks/useFlightControls';
import { Canvas2DRenderer } from '../../renderer/canvas2dRenderer';
import { getUnitSpriteSize } from '../../renderer/spriteRegistry';
import type {
  RenderProjectile,
  RenderUnit,
  ViewportFrameState,
  ViewportRenderer,
} from '../../renderer/viewportRenderer';
import { drawEnvObjectsOnRadar } from '../../utils/envRenderer';
import { getInterpolatedUnits } from '../../renderer/interpolation';
import { TacticalRadar } from '../common/TacticalRadar';

interface TdmViewportProps {
  mapId: number;
  pilotedUnit: string;
  customPool: string[];
  onBackToMenu: () => void;
  onChangeLoadout: () => void;
}

interface TdmShieldHud {
  front: number;
  rear: number;
  port: number;
  starboard: number;
}

interface TdmHudState {
  fps: number;
  playerAlive: number;
  enemyAlive: number;
  isGameOver: boolean;
  winningFaction: string;
  pilotedAlive: boolean;
  pilotedType: string;
  transferNotice: string;
  zoomPercent: number;
  shields: TdmShieldHud | null;
}

const GRID_SPACING = 500;
const RADAR_REDRAW_INTERVAL_MS = 80; // ~12Hz 2D radar redraw
const TRANSFER_NOTICE_DURATION_MS = 3000;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 1.5;
const DEFAULT_ZOOM = 0.75;

const round1 = (v: number | undefined): number => Math.round((v || 0) * 10) / 10;

const lerpAngleShort = (from: number, to: number, t: number): number => {
  const twoPi = Math.PI * 2;
  let diff = (to - from) % twoPi;
  if (diff > Math.PI) diff -= twoPi;
  if (diff < -Math.PI) diff += twoPi;
  return from + diff * t;
};

const formatHullName = (unitType: string): string =>
  unitType
    .split('_')
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : ''))
    .join(' ');

const findNearestAlly = (
  units: SnapshotUnit[],
  refX: number,
  refY: number
): SnapshotUnit | undefined => {
  let nearest: SnapshotUnit | undefined;
  let bestDistSq = Infinity;
  for (let i = 0; i < units.length; i++) {
    const u = units[i];
    if (u.ownerId !== 'player' || u.isDestroyed) continue;
    const dx = u.pos.x - refX;
    const dy = u.pos.y - refY;
    const dSq = dx * dx + dy * dy;
    if (dSq < bestDistSq) {
      bestDistSq = dSq;
      nearest = u;
    }
  }
  return nearest;
};

export const TdmViewport: React.FC<TdmViewportProps> = ({
  mapId,
  pilotedUnit,
  customPool,
  onBackToMenu,
  onChangeLoadout,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const radarCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // High-frequency 60Hz simulation state lives in refs with latest-frame coalescing
  const pendingBufferRef = useRef<ArrayBuffer | null>(null);
  const snapshotRef = useRef<ServerStateSnapshot | null>(null);
  const serverHistoryRef = useRef<{ timestamp: number; units: SnapshotUnit[] }[]>([]);
  const mapDetailsRef = useRef<MapDefinition | null>(null);
  const pilotedIdRef = useRef<string | null>(null);
  const pendingPilotSyncRef = useRef<boolean>(false);
  const transferNoticeRef = useRef<{ text: string; expiresAt: number } | null>(null);
  const cameraPosRef = useRef({ x: 6000, y: 6000 });
  const renderPosRef = useRef({ x: 6000, y: 6000 });
  const renderAngleRef = useRef<number>(0);
  const zoomRef = useRef<number>(DEFAULT_ZOOM);
  const isInitializedRef = useRef<boolean>(false);

  const { templatesRef } = useUnitTemplates();

  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [hud, setHud] = useState<TdmHudState>({
    fps: 60,
    playerAlive: 20,
    enemyAlive: 20,
    isGameOver: false,
    winningFaction: '',
    pilotedAlive: true,
    pilotedType: pilotedUnit,
    transferNotice: '',
    zoomPercent: Math.round(DEFAULT_ZOOM * 100),
    shields: null,
  });

  const { keysRef, tickFlightInput, sendImmediate, clearInputs } = useFlightControls({
    canvasRef,
    cameraPosRef,
    zoomRef,
    canControl: !hud.isGameOver,
    resolvePilotedUnit: (units) => {
      // Always prefer the server's authoritative PILOTED unit if present in the snapshot
      const authoritativePilot = units.find(
        (u) => u.ownerId === 'player' && u.aiState === 'PILOTED' && !u.isDestroyed
      );
      if (authoritativePilot) {
        if (pilotedIdRef.current !== authoritativePilot.id) {
          const hadPrevious = pilotedIdRef.current !== null;
          pilotedIdRef.current = authoritativePilot.id;
          if (!hadPrevious) {
            isInitializedRef.current = false;
          }
        }
        return authoritativePilot;
      }

      let unit = pilotedIdRef.current
        ? units.find((u) => u.id === pilotedIdRef.current && !u.isDestroyed)
        : undefined;

      if (!unit) {
        const hadPreviousPilot = pilotedIdRef.current !== null;
        // Fallback for older servers or pre-transfer frame: prefer tdm-pilot-* prefix
        const designatedPilot = units.find(
          (u) => u.ownerId === 'player' && u.id.startsWith('tdm-pilot-') && !u.isDestroyed
        );
        unit =
          designatedPilot ||
          findNearestAlly(units, renderPosRef.current.x, renderPosRef.current.y);

        const nextId = unit ? unit.id : null;
        if (pilotedIdRef.current !== nextId) {
          pilotedIdRef.current = nextId;
          if (!hadPreviousPilot || designatedPilot) {
            isInitializedRef.current = false;
          } else if (unit) {
            renderPosRef.current = { x: unit.pos.x, y: unit.pos.y };
            renderAngleRef.current = unit.angle;
            pendingPilotSyncRef.current = true;
            transferNoticeRef.current = {
              text: `HULL LOST // TRANSFERRED TO ${formatHullName(unit.type).toUpperCase()}`,
              expiresAt: performance.now() + TRANSFER_NOTICE_DURATION_MS,
            };
          }
        }
      }
      return unit;
    },
    onSendInput: (payload) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          serializeClientInput({
            keys: payload.keys,
            angle: payload.angle,
            isFiring: payload.isFiring,
            currentId: payload.currentId || null,
          })
        );
        return true;
      }
      return false;
    },
    onCustomKeyDown: (e) => {
      if (!e.repeat && e.key.toLowerCase() === 'r') {
        handleResetMatch();
        return true;
      }
      return false;
    },
  });

  // Load map metadata once per mapId
  useEffect(() => {
    let active = true;
    fetchMapDetail(mapId)
      .then((detail) => {
        if (active && detail) {
          mapDetailsRef.current = detail;
          if (!isInitializedRef.current) {
            cameraPosRef.current = { x: detail.width / 2, y: detail.height / 2 };
            renderPosRef.current = { x: detail.width / 2, y: detail.height / 2 };
          }
        }
      })
      .catch((err) => {
        console.warn('TDM map detail fetch failed:', err);
        if (active) mapDetailsRef.current = null;
      });
    return () => {
      active = false;
    };
  }, [mapId]);

  // Connect to TDM WebSocket (O(1) latest-frame coalescing in ws.onmessage)
  useEffect(() => {
    let closedByCleanup = false;
    pilotedIdRef.current = null;
    pendingPilotSyncRef.current = false;
    transferNoticeRef.current = null;
    pendingBufferRef.current = null;
    snapshotRef.current = null;
    serverHistoryRef.current = [];
    isInitializedRef.current = false;
    clearInputs();

    const poolQuery = customPool.join(',');
    const wsUrl = `${WS_BASE_URL}/ws/tdm?mapId=${mapId}&unit=${encodeURIComponent(
      pilotedUnit
    )}&pool=${encodeURIComponent(poolQuery)}`;

    const ws = new WebSocket(wsUrl);
    ws.binaryType = 'arraybuffer';
    wsRef.current = ws;

    ws.onopen = () => {
      if (closedByCleanup || wsRef.current !== ws) {
        ws.close();
        return;
      }
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      if (closedByCleanup || wsRef.current !== ws) return;
      if (event.data instanceof ArrayBuffer) {
        // Coalesce: keep only the newest binary frame; decode once per render tick
        pendingBufferRef.current = event.data;
      }
    };

    ws.onclose = () => {
      if (wsRef.current === ws) {
        wsRef.current = null;
      }
      if (!closedByCleanup) {
        setIsConnected(false);
      }
    };

    return () => {
      closedByCleanup = true;
      pendingBufferRef.current = null;
      if (wsRef.current === ws) {
        wsRef.current = null;
      }
      ws.close();
    };
  }, [mapId, pilotedUnit, customPool, clearInputs]);

  // Swappable ViewportRenderer (Canvas2DRenderer) — Single 60Hz rAF loop, zero WebGL context loss
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let destroyed = false;
    let rafId = 0;
    let viewW = 1;
    let viewH = 1;

    const renderer: ViewportRenderer = new Canvas2DRenderer();
    renderer.init(canvas, { backgroundColor: '#050811' });

    const syncSize = () => {
      if (destroyed) return;
      const r = container.getBoundingClientRect();
      viewW = Math.max(1, Math.floor(r.width));
      viewH = Math.max(1, Math.floor(r.height));
      renderer.resize(viewW, viewH);
    };
    syncSize();
    const resizeObserver = new ResizeObserver(syncSize);
    resizeObserver.observe(container);

    // Preallocated scratch structures
    const liveUnitMap = new Map<string, SnapshotUnit>();

    let lastRadarDrawMs = 0;
    let lastErrLogMs = 0;
    let lastTime = performance.now();
    let lastSnapTime = lastTime;
    let lastHudSyncTime = lastTime;
    let lastSyncedNotice = '';
    let fpsAvg = 60;

    const renderLoop = () => {
      if (destroyed) return;
      rafId = requestAnimationFrame(renderLoop);

      try {
        const currentTime = performance.now();
        const rawDt = (currentTime - lastTime) / 1000;
        const dt = Math.min(Math.max(rawDt, 0.001), 0.1);
        lastTime = currentTime;

        if (rawDt > 0 && rawDt < 0.5) {
          fpsAvg = fpsAvg * 0.92 + (1 / rawDt) * 0.08;
        }
        const currentFps = Math.max(1, Math.round(fpsAvg));

        // 0. Decode ONLY the latest arrived binary frame (drops any stale queued packets)
        const pendingBuf = pendingBufferRef.current;
        if (pendingBuf) {
          pendingBufferRef.current = null;
          const parsedState = unpackServerBinaryMessage(pendingBuf);
          if (parsedState) {
            snapshotRef.current = parsedState;
            lastSnapTime = currentTime;
            if (!parsedState.units || parsedState.units.length === 0) {
              serverHistoryRef.current = [];
              isInitializedRef.current = false;
            } else {
              serverHistoryRef.current.push({
                timestamp: currentTime,
                units: parsedState.units,
              });
              if (serverHistoryRef.current.length > 20) {
                serverHistoryRef.current.shift();
              }
            }
          }
        }

        const snapshot = snapshotRef.current;
        if (!snapshot) return;

        const mapDetails = mapDetailsRef.current;
        const mapW = snapshot.mapBounds?.width || mapDetails?.width || 12000;
        const mapH = snapshot.mapBounds?.height || mapDetails?.height || 12000;

        const liveUnits = snapshot.units || [];
        liveUnitMap.clear();
        let playerAlive = 0;
        let enemyAlive = 0;
        for (let i = 0; i < liveUnits.length; i++) {
          const u = liveUnits[i];
          liveUnitMap.set(u.id, u);
          if (!u.isDestroyed) {
            if (u.ownerId === 'player') playerAlive++;
            else enemyAlive++;
          }
        }

        const playerUnit = tickFlightInput(currentTime, liveUnits);

        if (pendingPilotSyncRef.current) {
          pendingPilotSyncRef.current = false;
          clearInputs();
          if (playerUnit) {
            sendImmediate(liveUnits);
          }
        }

        const sinceSnapTicks = Math.min(4.8, Math.max(0, (currentTime - lastSnapTime) * 0.06));
        const pilotExtrapTicks = Math.min(1.8, sinceSnapTicks);

        if (playerUnit) {
          const predX = playerUnit.pos.x + (playerUnit.vel?.x || 0) * pilotExtrapTicks;
          const predY = playerUnit.pos.y + (playerUnit.vel?.y || 0) * pilotExtrapTicks;

          if (
            !isInitializedRef.current ||
            Math.hypot(predX - renderPosRef.current.x, predY - renderPosRef.current.y) > 220
          ) {
            renderPosRef.current = { x: predX, y: predY };
            renderAngleRef.current = playerUnit.angle;
            cameraPosRef.current = { x: predX, y: predY };
            isInitializedRef.current = true;
          } else {
            const lerpRate = 1.0 - Math.exp(-28.0 * dt);
            renderPosRef.current.x += (predX - renderPosRef.current.x) * lerpRate;
            renderPosRef.current.y += (predY - renderPosRef.current.y) * lerpRate;
            renderAngleRef.current = lerpAngleShort(renderAngleRef.current, playerUnit.angle, lerpRate);

            const camLerp = 1.0 - Math.exp(-16.0 * dt);
            cameraPosRef.current.x += (renderPosRef.current.x - cameraPosRef.current.x) * camLerp;
            cameraPosRef.current.y += (renderPosRef.current.y - cameraPosRef.current.y) * camLerp;
          }
        }

        const cameraX = cameraPosRef.current.x;
        const cameraY = cameraPosRef.current.y;
        const z = zoomRef.current;

        // 1. Cached Universal Environmental Objects
        const liveEnvObjects = snapshot.envObjects || [];
        renderer.setEnvObjects(liveEnvObjects);

        // 2. Interpolated Fleet Units -> ViewportFrameState
        const interpolatedUnits =
          liveUnits.length > 0 ? getInterpolatedUnits(serverHistoryRef.current, currentTime) : [];
        const unitsToDraw =
          interpolatedUnits && interpolatedUnits.length > 0 ? interpolatedUnits : liveUnits;

        const renderUnits: RenderUnit[] = [];
        for (let i = 0; i < unitsToDraw.length; i++) {
          const u = unitsToDraw[i];
          const latest = liveUnitMap.get(u.id);
          if (!latest || latest.isDestroyed) continue;

          const isPiloted = playerUnit?.id === latest.id;
          const rx = isPiloted ? renderPosRef.current.x : u.pos.x;
          const ry = isPiloted ? renderPosRef.current.y : u.pos.y;
          const angle = isPiloted ? renderAngleRef.current : u.angle;
          const size = getUnitSpriteSize(latest.type);
          const halfH = size / 2;
          const isFlagship =
            latest.type === 'flagship' || latest.type === 'battalion_command_ship';
          const factionColor = latest.ownerId === 'player' ? '#22d3ee' : '#fb7185';

          renderUnits.push({
            id: latest.id,
            unitType: latest.type,
            x: rx,
            y: ry,
            angle,
            size,
            alpha: latest.isStealthed ? 0.48 : 1,
            fallbackColor: factionColor,
            ring: isPiloted
              ? {
                  radius: Math.max(34, halfH + 8),
                  strokeColor: '#22d3ee',
                  strokeAlpha: 0.8,
                  lineWidth: 2,
                }
              : {
                  radius: Math.max(20, halfH + 4),
                  strokeColor: factionColor,
                  strokeAlpha: 0.35,
                  lineWidth: 1.4,
                },
            stealthRingRadius: latest.isStealthed ? halfH + 8 : undefined,
            thrustFlames: isFlagship && isPiloted && !!keysRef.current['w'],
            flagshipMuzzleFlash: isFlagship && !!latest.isFiring,
            shieldArcs:
              isFlagship && latest.shields
                ? {
                    radius: 52,
                    front: latest.shields.front,
                    rear: latest.shields.rear,
                    port: latest.shields.port,
                    starboard: latest.shields.starboard,
                  }
                : undefined,
          });
        }

        // 3. Projectiles (gentle bounded extrapolation between server snapshots)
        const rawProjectiles = snapshot.projectiles || [];
        const renderProjectiles: RenderProjectile[] = [];
        for (let i = 0; i < rawProjectiles.length; i++) {
          const p = rawProjectiles[i];
          renderProjectiles.push({
            x: p.pos.x + (p.vel?.x || 0) * sinceSnapTicks,
            y: p.pos.y + (p.vel?.y || 0) * sinceSnapTicks,
            kind: 'dot',
            color: p.type === 'player' ? '#00f3ff' : '#ff2a6d',
            radius: 3,
          });
        }

        const frame: ViewportFrameState = {
          now: currentTime,
          worldWidth: mapW,
          worldHeight: mapH,
          backgroundColor: '#050811',
          backdrop: {
            kind: 'grid',
            spacing: GRID_SPACING,
            lineColor: 'rgba(0, 243, 255, 0.055)',
            borderColor: 'rgba(168, 85, 247, 0.9)',
            borderWidth: 4,
          },
          units: renderUnits,
          projectiles: renderProjectiles,
        };

        renderer.render(frame, {
          mode: 'camera',
          x: cameraX,
          y: cameraY,
          zoom: z,
        });

        // 4. Throttled Tactical Radar Minimap (~12Hz instead of 60Hz)
        if (currentTime - lastRadarDrawMs >= RADAR_REDRAW_INTERVAL_MS) {
          lastRadarDrawMs = currentTime;
          const radarCanvas = radarCanvasRef.current;
          const radarCtx = radarCanvas?.getContext('2d');
          if (radarCtx && radarCanvas) {
            const rw = radarCanvas.width;
            const rh = radarCanvas.height;
            const scaleX = rw / mapW;
            const scaleY = rh / mapH;

            radarCtx.fillStyle = 'rgba(5, 8, 17, 0.95)';
            radarCtx.fillRect(0, 0, rw, rh);
            radarCtx.strokeStyle = 'rgba(34, 211, 238, 0.45)';
            radarCtx.lineWidth = 1.5;
            radarCtx.strokeRect(0, 0, rw, rh);

            drawEnvObjectsOnRadar(radarCtx, liveEnvObjects, scaleX, scaleY);

            for (let j = 0; j < liveUnits.length; j++) {
              const u = liveUnits[j];
              if (u.isDestroyed) continue;
              const isPiloted = playerUnit?.id === u.id;
              const ux = (isPiloted ? renderPosRef.current.x : u.pos.x) * scaleX;
              const uy = (isPiloted ? renderPosRef.current.y : u.pos.y) * scaleY;
              const weight = templatesRef.current[u.type]?.weightClass ?? 1;

              radarCtx.fillStyle = isPiloted
                ? '#ffffff'
                : u.ownerId === 'player'
                ? '#22d3ee'
                : '#fb7185';
              radarCtx.beginPath();
              radarCtx.arc(ux, uy, isPiloted ? 3.5 : weight >= 3 ? 2.5 : 1.8, 0, Math.PI * 2);
              radarCtx.fill();
            }

            const camViewW = (viewW / z) * scaleX;
            const camViewH = (viewH / z) * scaleY;
            const camViewX = cameraX * scaleX - camViewW / 2;
            const camViewY = cameraY * scaleY - camViewH / 2;
            radarCtx.strokeStyle = 'rgba(251, 191, 36, 0.55)';
            radarCtx.lineWidth = 1;
            radarCtx.strokeRect(camViewX, camViewY, camViewW, camViewH);
          }
        }

        // 5. Low-frequency HUD state sync (~4Hz, or immediately on transfer notice / match end)
        let activeTransferNotice = '';
        if (transferNoticeRef.current) {
          if (currentTime < transferNoticeRef.current.expiresAt) {
            activeTransferNotice = transferNoticeRef.current.text;
          } else {
            transferNoticeRef.current = null;
          }
        }

        if (
          currentTime - lastHudSyncTime >= 250 ||
          snapshot.isGameOver ||
          activeTransferNotice !== lastSyncedNotice
        ) {
          lastHudSyncTime = currentTime;
          lastSyncedNotice = activeTransferNotice;
          const zoomPercent = Math.round(z * 100);
          const nextPilotedType = playerUnit ? playerUnit.type : '';
          const nextShields: TdmShieldHud | null = playerUnit
            ? {
                front: round1(playerUnit.shields?.front),
                rear: round1(playerUnit.shields?.rear),
                port: round1(playerUnit.shields?.port),
                starboard: round1(playerUnit.shields?.starboard),
              }
            : null;

          setHud((prev) => {
            const shieldsSame =
              prev.shields === nextShields ||
              (prev.shields !== null &&
                nextShields !== null &&
                prev.shields.front === nextShields.front &&
                prev.shields.rear === nextShields.rear &&
                prev.shields.port === nextShields.port &&
                prev.shields.starboard === nextShields.starboard);
            if (
              prev.fps === currentFps &&
              prev.playerAlive === playerAlive &&
              prev.enemyAlive === enemyAlive &&
              prev.isGameOver === !!snapshot.isGameOver &&
              prev.winningFaction === (snapshot.winningFaction || '') &&
              prev.pilotedAlive === !!playerUnit &&
              prev.pilotedType === nextPilotedType &&
              prev.transferNotice === activeTransferNotice &&
              prev.zoomPercent === zoomPercent &&
              shieldsSame
            ) {
              return prev;
            }
            return {
              fps: currentFps,
              playerAlive,
              enemyAlive,
              isGameOver: !!snapshot.isGameOver,
              winningFaction: snapshot.winningFaction || '',
              pilotedAlive: !!playerUnit,
              pilotedType: nextPilotedType,
              transferNotice: activeTransferNotice,
              zoomPercent,
              shields: nextShields,
            };
          });
        }
      } catch (err) {
        const now = performance.now();
        if (now - lastErrLogMs > 2000) {
          lastErrLogMs = now;
          console.error('[TDM CANVAS2D] Render tick error:', err);
        }
      }
    };

    rafId = requestAnimationFrame(renderLoop);

    return () => {
      destroyed = true;
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      renderer.destroy();
    };
  }, [pilotedUnit, templatesRef, tickFlightInput, sendImmediate, clearInputs]);

  const handleCanvasWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    zoomRef.current = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoomRef.current * zoomFactor));
  };

  const handleResetMatch = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      pilotedIdRef.current = null;
      pendingPilotSyncRef.current = false;
      transferNoticeRef.current = null;
      pendingBufferRef.current = null;
      snapshotRef.current = null;
      serverHistoryRef.current = [];
      isInitializedRef.current = false;
      clearInputs();
      wsRef.current.send(serializeClientInput({ reset: true }));
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-screen h-screen overflow-hidden bg-slate-950 select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      <canvas
        ref={canvasRef}
        onWheel={handleCanvasWheel}
        onContextMenu={(e) => e.preventDefault()}
        className="w-full h-full block cursor-crosshair"
      />

      {/* TOP HUD BAR */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
        <div className="ui-interactive bg-slate-900/85 border border-slate-800 px-4 py-2 rounded-lg backdrop-blur flex items-center space-x-4 pointer-events-auto">
          <button
            onClick={onBackToMenu}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded transition"
          >
            Quit Match
          </button>
          <div className="text-xs font-mono text-cyan-400">
            TDM SKIRMISH // MAP #{mapId}
          </div>
        </div>

        {/* LIVE 20v20 SCOREBOARD */}
        <div className="bg-slate-900/85 border border-slate-800 px-5 py-2 rounded-lg backdrop-blur flex items-center gap-4 text-xs font-mono">
          <span className="text-cyan-400 font-black">
            ALLIED: {hud.playerAlive} / 20
          </span>
          <span className="text-slate-600">VS</span>
          <span className="text-rose-400 font-black">
            HOSTILE: {hud.enemyAlive} / 20
          </span>
        </div>

        <div className="bg-slate-900/85 border border-slate-800 px-4 py-2 rounded-lg backdrop-blur text-xs font-mono text-slate-300">
          FPS: <span className="text-emerald-400">{hud.fps}</span> | Zoom:{' '}
          <span className="text-amber-300">{hud.zoomPercent}%</span> | Active:{' '}
          <span className="text-cyan-400">{hud.playerAlive + hud.enemyAlive}</span>
        </div>
      </div>

      {/* PILOT TRANSFER NOTICE BANNER */}
      {hud.transferNotice && !hud.isGameOver && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-amber-950/90 border border-amber-400/60 px-4 py-1.5 rounded-lg backdrop-blur pointer-events-none font-mono text-xs font-bold tracking-wider text-amber-300 shadow-lg">
          {hud.transferNotice}
        </div>
      )}

      {/* PILOTED SHIP HULL & 4-QUADRANT SHIELD HUD (Crisp DOM Overlay) */}
      {hud.pilotedAlive && hud.shields && (
        <div className="absolute bottom-4 left-4 bg-slate-900/85 border border-cyan-500/35 px-3.5 py-2.5 rounded-lg backdrop-blur pointer-events-none font-mono text-[11px] leading-relaxed text-cyan-300 shadow-lg tabular-nums min-w-[170px]">
          {hud.pilotedType && (
            <div className="mb-1.5 pb-1 border-b border-cyan-500/25 flex items-center justify-between gap-3">
              <span className="text-[9px] uppercase tracking-widest text-slate-400">PILOTING</span>
              <span className="text-[10px] font-bold uppercase tracking-wide text-amber-300">
                {formatHullName(hud.pilotedType)}
              </span>
            </div>
          )}
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">FRONT SHD</span>
            <span className="text-cyan-300 font-bold">{hud.shields.front.toFixed(1)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">REAR SHD</span>
            <span className="text-cyan-300 font-bold">{hud.shields.rear.toFixed(1)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">PORT SHD</span>
            <span className="text-cyan-300 font-bold">{hud.shields.port.toFixed(1)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">STBD SHD</span>
            <span className="text-cyan-300 font-bold">{hud.shields.starboard.toFixed(1)}</span>
          </div>
        </div>
      )}

      {/* SHARED TACTICAL RADAR */}
      <TacticalRadar
        canvasRef={radarCanvasRef}
        label="TDM Radar"
        accent="cyan"
        positionClass="bottom-4 right-4"
      />

      {/* CONNECTION STATUS OVERLAY */}
      {!isConnected && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center">
          <div className="text-xl font-mono text-amber-400 animate-pulse">
            Connecting to TDM Room Server...
          </div>
        </div>
      )}

      {/* MATCH OVER MODAL OVERLAY */}
      {hud.isGameOver && (
        <div className="ui-interactive absolute inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-md w-full text-center shadow-2xl">
            <div className="text-xs font-mono tracking-widest text-slate-400 mb-2 uppercase">
              Match Concluded
            </div>

            <h2
              className={`text-4xl font-black mb-4 tracking-wider uppercase ${
                hud.winningFaction === 'player'
                  ? 'text-cyan-400'
                  : hud.winningFaction === 'draw'
                  ? 'text-amber-400'
                  : 'text-rose-500'
              }`}
            >
              {hud.winningFaction === 'player'
                ? 'Victory!'
                : hud.winningFaction === 'draw'
                ? 'Mutual Draw'
                : 'Defeat'}
            </h2>

            <p className="text-sm text-slate-400 mb-8">
              {hud.winningFaction === 'draw'
                ? 'Both fleets were eliminated simultaneously in the engagement.'
                : `Faction ${hud.winningFaction.toUpperCase()} secured tactical supremacy on the battlefield.`}
            </p>

            <div className="space-y-3">
              <button
                onClick={handleResetMatch}
                className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition shadow-lg shadow-cyan-900/40"
              >
                Play Again (Same Loadout)
              </button>

              <button
                onClick={onChangeLoadout}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold rounded-xl transition border border-cyan-900/50"
              >
                Change Loadout &amp; Spawn Pool
              </button>

              <button
                onClick={onBackToMenu}
                className="w-full py-3 bg-slate-800/60 hover:bg-slate-800 text-slate-400 font-bold rounded-xl transition"
              >
                Main Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
