// src/components/teamDeathMatch/tdmViewport.tsx
import React, { useEffect, useRef, useState } from 'react';
import { WS_BASE_URL } from '../../config';
import {
  unpackServerBinaryMessage,
  serializeClientInput,
  ServerStateSnapshot,
} from '../../parsers/binaryCodec';
import { fetchMapDetail } from '../../services/mapService';

interface TdmViewportProps {
  mapId: number;
  pilotedUnit: string;
  customPool: string[];
  onBackToMenu: () => void;
  onChangeLoadout: () => void;
}

interface MapStructureSimple {
  id?: number;
  structureType?: string;
  structure_type?: string;
  posX?: number;
  posY?: number;
  pos_x?: number;
  pos_y?: number;
  radius?: number;
}

interface TdmHudState {
  fps: number;
  playerAlive: number;
  enemyAlive: number;
  isGameOver: boolean;
  winningFaction: string;
  pilotedAlive: boolean;
}

export const TdmViewport: React.FC<TdmViewportProps> = ({
  mapId,
  pilotedUnit,
  customPool,
  onBackToMenu,
  onChangeLoadout,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // High-frequency 60Hz simulation state lives in refs (never triggers React re-renders)
  const snapshotRef = useRef<ServerStateSnapshot | null>(null);
  const structuresRef = useRef<MapStructureSimple[]>([]);
  const pilotedIdRef = useRef<string | null>(null);

  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [hud, setHud] = useState<TdmHudState>({
    fps: 60,
    playerAlive: 20,
    enemyAlive: 20,
    isGameOver: false,
    winningFaction: '',
    pilotedAlive: true,
  });

  const keysRef = useRef<{ w: boolean; s: boolean; a: boolean; d: boolean; isFiring: boolean }>({
    w: false,
    s: false,
    a: false,
    d: false,
    isFiring: false,
  });
  const mouseRef = useRef<{ x: number; y: number; angle: number }>({ x: 0, y: 0, angle: 0 });

  const clearInputs = () => {
    keysRef.current.w = false;
    keysRef.current.s = false;
    keysRef.current.a = false;
    keysRef.current.d = false;
    keysRef.current.isFiring = false;
  };

  // Load map environmental structures once per mapId
  useEffect(() => {
    let active = true;
    fetchMapDetail(mapId)
      .then((detail: any) => {
        if (active && detail?.structures) {
          structuresRef.current = detail.structures;
        }
      })
      .catch((err) => {
        console.warn('TDM map detail fetch failed, continuing without structures:', err);
        if (active) structuresRef.current = [];
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
      if (parsedState) {
        snapshotRef.current = parsedState;
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [mapId, pilotedUnit, customPool]);

  // Keyboard, mouse & window-blur input handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'w' || e.key === 'W') keysRef.current.w = true;
      if (e.key === 's' || e.key === 'S') keysRef.current.s = true;
      if (e.key === 'a' || e.key === 'A') keysRef.current.a = true;
      if (e.key === 'd' || e.key === 'D') keysRef.current.d = true;
      if (e.key === ' ') keysRef.current.isFiring = true;
      if (e.key === 'r' || e.key === 'R') {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          pilotedIdRef.current = null;
          wsRef.current.send(serializeClientInput({ reset: true }));
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'w' || e.key === 'W') keysRef.current.w = false;
      if (e.key === 's' || e.key === 'S') keysRef.current.s = false;
      if (e.key === 'a' || e.key === 'A') keysRef.current.a = false;
      if (e.key === 'd' || e.key === 'D') keysRef.current.d = false;
      if (e.key === ' ') keysRef.current.isFiring = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      mouseRef.current.x = mouseX;
      mouseRef.current.y = mouseY;
      mouseRef.current.angle = Math.atan2(mouseY - centerY, mouseX - centerX);
    };

    const handleMouseDown = (e: MouseEvent) => {
      if ((e.target as HTMLElement)?.closest('.ui-interactive')) return;
      if (e.button === 0) keysRef.current.isFiring = true;
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) keysRef.current.isFiring = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('blur', clearInputs);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('blur', clearInputs);
    };
  }, []);

  // Continuous 60Hz Render & Input Loop (never tears down on incoming packets)
  useEffect(() => {
    let animationFrameId: number;
    let lastFpsTime = performance.now();
    let lastHudSyncTime = performance.now();
    let frameCount = 0;
    let currentFps = 60;

    const render = () => {
      const now = performance.now();
      frameCount++;
      if (now - lastFpsTime >= 1000) {
        currentFps = Math.round((frameCount * 1000) / (now - lastFpsTime));
        frameCount = 0;
        lastFpsTime = now;
      }

      const canvas = canvasRef.current;
      const snapshot = snapshotRef.current;

      if (canvas && snapshot) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const mapW = snapshot.mapBounds?.width || 12000;
          const mapH = snapshot.mapBounds?.height || 12000;

          // Resolve & pin piloted unit ID so camera never jumps between allied ships of the same class
          let playerUnit = pilotedIdRef.current
            ? snapshot.units.find((u) => u.id === pilotedIdRef.current && !u.isDestroyed)
            : undefined;

          if (!playerUnit) {
            playerUnit =
              snapshot.units.find(
                (u) => u.ownerId === 'player' && u.type === pilotedUnit && !u.isDestroyed
              ) || snapshot.units.find((u) => u.ownerId === 'player' && !u.isDestroyed);
            pilotedIdRef.current = playerUnit ? playerUnit.id : null;
          }

          const cameraX = playerUnit ? playerUnit.pos.x : mapW / 2;
          const cameraY = playerUnit ? playerUnit.pos.y : mapH / 2;

          // Clear frame
          ctx.fillStyle = '#020617';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          ctx.save();
          ctx.translate(canvas.width / 2 - cameraX, canvas.height / 2 - cameraY);

          // Tactical sector grid
          const gridSize = 500;
          const startX = Math.max(0, Math.floor((cameraX - canvas.width / 2) / gridSize) * gridSize);
          const endX = Math.min(mapW, Math.ceil((cameraX + canvas.width / 2) / gridSize) * gridSize);
          const startY = Math.max(0, Math.floor((cameraY - canvas.height / 2) / gridSize) * gridSize);
          const endY = Math.min(mapH, Math.ceil((cameraY + canvas.height / 2) / gridSize) * gridSize);

          ctx.strokeStyle = 'rgba(30, 41, 59, 0.45)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (let x = startX; x <= endX; x += gridSize) {
            ctx.moveTo(x, startY);
            ctx.lineTo(x, endY);
          }
          for (let y = startY; y <= endY; y += gridSize) {
            ctx.moveTo(startX, y);
            ctx.lineTo(endX, y);
          }
          ctx.stroke();

          // Map bounds
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 3;
          ctx.strokeRect(0, 0, mapW, mapH);

          // Environmental structures
          for (const s of structuresRef.current) {
            const sx = s.posX ?? s.pos_x ?? 0;
            const sy = s.posY ?? s.pos_y ?? 0;
            const sr = s.radius ?? 150;
            const sType = s.structureType ?? s.structure_type ?? '';

            ctx.save();
            ctx.beginPath();
            ctx.arc(sx, sy, sr, 0, Math.PI * 2);
            if (sType === 'gas_giant') {
              ctx.fillStyle = 'rgba(249, 115, 22, 0.14)';
              ctx.strokeStyle = 'rgba(251, 146, 60, 0.55)';
            } else if (sType === 'asteroid_belt') {
              ctx.fillStyle = 'rgba(100, 116, 139, 0.12)';
              ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
            } else {
              ctx.fillStyle = 'rgba(56, 189, 248, 0.10)';
              ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
            }
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();
          }

          // Projectiles
          for (const p of snapshot.projectiles) {
            ctx.save();
            if (p.type === 'railgun') {
              ctx.fillStyle = '#38bdf8';
              ctx.beginPath();
              ctx.arc(p.pos.x, p.pos.y, 4, 0, Math.PI * 2);
              ctx.fill();
            } else if (p.type === 'torpedo') {
              ctx.fillStyle = '#fb7185';
              ctx.beginPath();
              ctx.arc(p.pos.x, p.pos.y, 5, 0, Math.PI * 2);
              ctx.fill();
            } else {
              ctx.fillStyle = '#f59e0b';
              ctx.beginPath();
              ctx.arc(p.pos.x, p.pos.y, 3, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.restore();
          }

          // Fleet units
          let playerAlive = 0;
          let enemyAlive = 0;

          for (const u of snapshot.units) {
            if (u.isDestroyed) continue;
            const isPlayer = u.ownerId === 'player';
            if (isPlayer) playerAlive++;
            else enemyAlive++;

            const isPiloted = playerUnit?.id === u.id;

            ctx.save();
            ctx.translate(u.pos.x, u.pos.y);

            // Piloted unit highlight ring
            if (isPiloted) {
              ctx.strokeStyle = 'rgba(34, 211, 238, 0.75)';
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.arc(0, 0, 26, 0, Math.PI * 2);
              ctx.stroke();
            }

            ctx.rotate(u.angle);
            ctx.fillStyle = isPiloted ? '#22d3ee' : isPlayer ? '#0891b2' : '#e11d48';
            ctx.strokeStyle = isPiloted ? '#ecfeff' : isPlayer ? '#67e8f9' : '#fda4af';
            ctx.lineWidth = isPiloted ? 2.5 : 1.75;

            ctx.beginPath();
            ctx.moveTo(16, 0);
            ctx.lineTo(-11, -11);
            ctx.lineTo(-6, 0);
            ctx.lineTo(-11, 11);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.restore();
          }

          ctx.restore();

          // Un-shrouded TDM Tactical Minimap (bottom-right, per tdm_visibility.go)
          const radarSize = 180;
          const radarPad = 16;
          const rx = canvas.width - radarSize - radarPad;
          const ry = canvas.height - radarSize - radarPad;

          ctx.save();
          ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          ctx.strokeStyle = 'rgba(34, 211, 238, 0.45)';
          ctx.lineWidth = 1.5;
          ctx.fillRect(rx, ry, radarSize, radarSize);
          ctx.strokeRect(rx, ry, radarSize, radarSize);

          for (const u of snapshot.units) {
            if (u.isDestroyed) continue;
            const ux = rx + (u.pos.x / mapW) * radarSize;
            const uy = ry + (u.pos.y / mapH) * radarSize;
            const isPiloted = playerUnit?.id === u.id;

            ctx.fillStyle = isPiloted
              ? '#ffffff'
              : u.ownerId === 'player'
              ? '#22d3ee'
              : '#fb7185';
            ctx.beginPath();
            ctx.arc(ux, uy, isPiloted ? 3.5 : 2, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();

          // Send player input at 60Hz
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(
              serializeClientInput({
                keys: keysRef.current,
                angle: mouseRef.current.angle,
                isFiring: keysRef.current.isFiring,
                currentId: playerUnit?.id || null,
              })
            );
          }

          // Sync low-frequency HUD state (~4Hz or immediately on match end)
          if (now - lastHudSyncTime >= 250 || snapshot.isGameOver) {
            lastHudSyncTime = now;
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
  }, [pilotedUnit]);

  const handleResetMatch = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      pilotedIdRef.current = null;
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
