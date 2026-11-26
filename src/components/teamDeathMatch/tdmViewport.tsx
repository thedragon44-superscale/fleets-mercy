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
import {
  drawFlagship,
  drawUnitAsset,
  drawProjectile,
  drawHUDDiagnostics,
  renderEnvironmentVector,
} from '../../renderer/vectorAssets';
import { getInterpolatedUnits } from '../../renderer/interpolation';
import { TacticalRadar } from '../common/TacticalRadar';

interface TdmViewportProps {
  mapId: number;
  pilotedUnit: string;
  customPool: string[];
  onBackToMenu: () => void;
  onChangeLoadout: () => void;
}

interface TdmHudState {
  fps: number;
  playerAlive: number;
  enemyAlive: number;
  isGameOver: boolean;
  winningFaction: string;
  pilotedAlive: boolean;
}

const GRID_SPACING = 500;

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

  // High-frequency 60Hz simulation state lives in refs (never triggers React re-renders)
  const snapshotRef = useRef<ServerStateSnapshot | null>(null);
  const serverHistoryRef = useRef<{ timestamp: number; units: SnapshotUnit[] }[]>([]);
  const mapDetailsRef = useRef<MapDefinition | null>(null);
  const pilotedIdRef = useRef<string | null>(null);
  const cameraPosRef = useRef({ x: 6000, y: 6000 });
  const renderPosRef = useRef({ x: 6000, y: 6000 });
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
  });

  const { keysRef, tickFlightInput, clearInputs } = useFlightControls({
    canvasRef,
    cameraPosRef,
    canControl: !hud.isGameOver,
    resolvePilotedUnit: (units) => {
      let unit = pilotedIdRef.current
        ? units.find((u) => u.id === pilotedIdRef.current && !u.isDestroyed)
        : undefined;

      if (!unit) {
        unit =
          units.find(
            (u) => u.ownerId === 'player' && u.type === pilotedUnit && !u.isDestroyed
          ) || units.find((u) => u.ownerId === 'player' && !u.isDestroyed);
        const nextId = unit ? unit.id : null;
        if (pilotedIdRef.current !== nextId) {
          pilotedIdRef.current = nextId;
          isInitializedRef.current = false;
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
      }
    },
    onCustomKeyDown: (e) => {
      if (!e.repeat && e.key.toLowerCase() === 'r') {
        handleResetMatch();
        return true;
      }
      return false;
    },
  });

  // Load map metadata & environmental structures once per mapId
  useEffect(() => {
    let active = true;
    fetchMapDetail(mapId)
      .then((detail) => {
        if (active && detail) {
          mapDetailsRef.current = detail;
          cameraPosRef.current = { x: detail.width / 2, y: detail.height / 2 };
          renderPosRef.current = { x: detail.width / 2, y: detail.height / 2 };
        }
      })
      .catch((err) => {
        console.warn('TDM map detail fetch failed, continuing without structures:', err);
        if (active) mapDetailsRef.current = null;
      });
    return () => {
      active = false;
    };
  }, [mapId]);

  // ResizeObserver for crisp canvas sizing without per-frame layout thrashing
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width));
      canvas.height = Math.max(1, Math.floor(rect.height));
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Connect to TDM WebSocket
  useEffect(() => {
    pilotedIdRef.current = null;
    snapshotRef.current = null;
    serverHistoryRef.current = [];
    isInitializedRef.current = false;
    clearInputs();

    const poolQuery = customPool.join(',');
    const wsUrl = `${WS_BASE_URL}/ws/tdm?map=${mapId}&unit=${encodeURIComponent(
      pilotedUnit
    )}&pool=${encodeURIComponent(poolQuery)}`;

    const ws = new WebSocket(wsUrl);
    ws.binaryType = 'arraybuffer';
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      const parsedState = unpackServerBinaryMessage(event.data);
      if (!parsedState) return;
      snapshotRef.current = parsedState;

      if (!parsedState.units || parsedState.units.length === 0) {
        serverHistoryRef.current = [];
        isInitializedRef.current = false;
        return;
      }

      serverHistoryRef.current.push({
        timestamp: performance.now(),
        units: parsedState.units,
      });
      if (serverHistoryRef.current.length > 20) {
        serverHistoryRef.current.shift();
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [mapId, pilotedUnit, customPool]);

  

  // Continuous 60Hz Render & Input Loop (uses PNG/vector assets from vectorAssets.ts)
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();
    let lastFpsTime = lastTime;
    let lastHudSyncTime = lastTime;
    let frameCount = 0;
    let currentFps = 60;

    const render = (currentTime: number) => {
      const rawDt = (currentTime - lastTime) / 1000;
      const dt = Math.min(Math.max(rawDt, 0.001), 0.1);
      lastTime = currentTime;

      frameCount++;
      if (currentTime - lastFpsTime >= 1000) {
        currentFps = Math.round((frameCount * 1000) / (currentTime - lastFpsTime));
        frameCount = 0;
        lastFpsTime = currentTime;
      }

      const canvas = canvasRef.current;
      const snapshot = snapshotRef.current;

      if (canvas && snapshot) {
        const ctx = canvas.getContext('2d');
        const radarCanvas = radarCanvasRef.current;
        const radarCtx = radarCanvas?.getContext('2d');

        if (ctx) {
          const mapDetails = mapDetailsRef.current;
          const mapW = mapDetails?.width ?? snapshot.mapBounds?.width ?? 12000;
          const mapH = mapDetails?.height ?? snapshot.mapBounds?.height ?? 12000;

          const liveUnits = snapshot.units || [];
          const liveUnitMap = new Map<string, SnapshotUnit>(liveUnits.map((u) => [u.id, u]));

          const playerUnit = tickFlightInput(currentTime, liveUnits);

          if (playerUnit) {
            if (!isInitializedRef.current) {
              renderPosRef.current = { x: playerUnit.pos.x, y: playerUnit.pos.y };
              cameraPosRef.current = { x: playerUnit.pos.x, y: playerUnit.pos.y };
              isInitializedRef.current = true;
            }
            const lerpRate = 1.0 - Math.pow(0.0001, dt);
            renderPosRef.current.x += (playerUnit.pos.x - renderPosRef.current.x) * lerpRate;
            renderPosRef.current.y += (playerUnit.pos.y - renderPosRef.current.y) * lerpRate;

            const camLerp = 1.0 - Math.exp(-12.0 * dt);
            cameraPosRef.current.x += (renderPosRef.current.x - cameraPosRef.current.x) * camLerp;
            cameraPosRef.current.y += (renderPosRef.current.y - cameraPosRef.current.y) * camLerp;
          }

          const cameraX = cameraPosRef.current.x;
          const cameraY = cameraPosRef.current.y;

          // Clear frame
          ctx.fillStyle = '#050811';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          ctx.save();
          ctx.translate(canvas.width / 2 - cameraX, canvas.height / 2 - cameraY);

          // Tactical sector grid
          const startX = Math.max(
            0,
            Math.floor((cameraX - canvas.width / 2) / GRID_SPACING) * GRID_SPACING
          );
          const endX = Math.min(
            mapW,
            Math.ceil((cameraX + canvas.width / 2) / GRID_SPACING) * GRID_SPACING
          );
          const startY = Math.max(
            0,
            Math.floor((cameraY - canvas.height / 2) / GRID_SPACING) * GRID_SPACING
          );
          const endY = Math.min(
            mapH,
            Math.ceil((cameraY + canvas.height / 2) / GRID_SPACING) * GRID_SPACING
          );

          ctx.strokeStyle = 'rgba(0, 243, 255, 0.05)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (let x = startX; x <= endX; x += GRID_SPACING) {
            ctx.moveTo(x, startY);
            ctx.lineTo(x, endY);
          }
          for (let y = startY; y <= endY; y += GRID_SPACING) {
            ctx.moveTo(startX, y);
            ctx.lineTo(endX, y);
          }
          ctx.stroke();

          // Map bounds
          ctx.strokeStyle = '#a855f7';
          ctx.lineWidth = 4;
          ctx.strokeRect(0, 0, mapW, mapH);

          // Environmental structures (shared vector renderer)
          if (mapDetails?.structures) {
            mapDetails.structures.forEach((s) => {
              ctx.save();
              ctx.translate(s.posX, s.posY);
              renderEnvironmentVector(ctx, s.structureType, s.radius);
              ctx.restore();
            });
          }

          // Interpolated fleet units rendered with real PNG/vector assets
          const interpolatedUnits =
            liveUnits.length > 0 ? getInterpolatedUnits(serverHistoryRef.current, currentTime) : [];
          const unitsToDraw =
            interpolatedUnits && interpolatedUnits.length > 0 ? interpolatedUnits : liveUnits;

          let playerAlive = 0;
          let enemyAlive = 0;

          for (const u of liveUnits) {
            if (u.isDestroyed) continue;
            if (u.ownerId === 'player') playerAlive++;
            else enemyAlive++;
          }

          unitsToDraw.forEach((u: any) => {
            const latest = liveUnitMap.get(u.id);
            if (!latest || latest.isDestroyed) return;
            const mergedUnit = { ...latest, pos: u.pos, angle: u.angle };

            const isPiloted = playerUnit?.id === mergedUnit.id;
            const rx = isPiloted ? renderPosRef.current.x : mergedUnit.pos.x;
            const ry = isPiloted ? renderPosRef.current.y : mergedUnit.pos.y;
            const isAccelerating = isPiloted && !!keysRef.current['w'];

            // Subtle highlight ring around the player's piloted ship
            if (isPiloted) {
              ctx.save();
              ctx.strokeStyle = 'rgba(34, 211, 238, 0.7)';
              ctx.lineWidth = 1.75;
              ctx.beginPath();
              ctx.arc(rx, ry, 34, 0, Math.PI * 2);
              ctx.stroke();
              ctx.restore();
            }

            if (mergedUnit.type === 'flagship' || mergedUnit.type === 'battalion_command_ship') {
              drawFlagship(
                ctx,
                rx,
                ry,
                mergedUnit.angle,
                mergedUnit.shields,
                mergedUnit.hull,
                mergedUnit.isFiring,
                mergedUnit.isDestroyed,
                isAccelerating
              );
            } else {
              drawUnitAsset(
                ctx,
                rx,
                ry,
                mergedUnit.angle,
                mergedUnit.type,
                mergedUnit.ownerId,
                mergedUnit.isDestroyed
              );
            }
          });

          // Projectiles (shared renderer)
          (snapshot.projectiles || []).forEach((p) => {
            drawProjectile(ctx, p.pos.x, p.pos.y, p.vel.x, p.vel.y, p.type);
          });

          ctx.restore();

          // Piloted ship 4-quadrant shield & hull HUD diagnostics
          if (playerUnit) {
            drawHUDDiagnostics(ctx, playerUnit.shields, playerUnit.hull);
          }

          // Un-shrouded TDM Tactical Minimap (per tdm_visibility.go)
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

            if (mapDetails?.structures) {
              mapDetails.structures.forEach((s) => {
                const sx = s.posX * scaleX;
                const sy = s.posY * scaleY;
                const sr = Math.max(2, s.radius * scaleX);
                radarCtx.fillStyle =
                  s.structureType === 'gas_giant'
                    ? 'rgba(100, 150, 255, 0.2)'
                    : 'rgba(168, 85, 247, 0.45)';
                radarCtx.beginPath();
                radarCtx.arc(sx, sy, sr, 0, Math.PI * 2);
                radarCtx.fill();
              });
            }

            liveUnits.forEach((u) => {
              if (u.isDestroyed) return;
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
            });

            // Camera viewport rectangle on minimap
            const viewW = canvas.width * scaleX;
            const viewH = canvas.height * scaleY;
            const viewX = cameraX * scaleX - viewW / 2;
            const viewY = cameraY * scaleY - viewH / 2;
            radarCtx.strokeStyle = 'rgba(251, 191, 36, 0.55)';
            radarCtx.lineWidth = 1;
            radarCtx.strokeRect(viewX, viewY, viewW, viewH);
          }

          

          // Sync low-frequency HUD state (~4Hz or immediately on match end)
          if (currentTime - lastHudSyncTime >= 250 || snapshot.isGameOver) {
            lastHudSyncTime = currentTime;
            setHud((prev) => {
              if (
                prev.fps === currentFps &&
                prev.playerAlive === playerAlive &&
                prev.enemyAlive === enemyAlive &&
                prev.isGameOver === !!snapshot.isGameOver &&
                prev.winningFaction === (snapshot.winningFaction || '') &&
                prev.pilotedAlive === !!playerUnit
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
              };
            });
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [pilotedUnit, templatesRef, tickFlightInput]);

  const handleResetMatch = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      pilotedIdRef.current = null;
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
    >
      <canvas ref={canvasRef} className="w-full h-full block cursor-crosshair" />

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
          FPS: <span className="text-emerald-400">{hud.fps}</span> | Active:{' '}
          <span className="text-cyan-400">{hud.playerAlive + hud.enemyAlive}</span>
        </div>
      </div>

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
                Change Loadout & Spawn Pool
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
