// src/components/teamDeathMatch/tdmViewport.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Application, BitmapText, Container, Graphics } from 'pixi.js';
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
  PixiUnitSpriteLayer,
  SpriteSyncItem,
  getPixiUnitSize,
  loadPixiUnitTextures,
} from '../../renderer/pixiSprites';
import {
  PixiEnvLayer,
  TACTICAL_BITMAP_FONT,
  drawPixiDashedCircle,
  drawPixiShieldArcs,
  ensurePixiBitmapFont,
} from '../../renderer/pixiEnvRenderer';
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

interface TdmHudState {
  fps: number;
  playerAlive: number;
  enemyAlive: number;
  isGameOver: boolean;
  winningFaction: string;
  pilotedAlive: boolean;
}

const GRID_SPACING = 500;
const RADAR_REDRAW_INTERVAL_MS = 80; // ~12Hz 2D radar redraw

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

  // Load map metadata once per mapId
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
        console.warn('TDM map detail fetch failed:', err);
        if (active) mapDetailsRef.current = null;
      });
    return () => {
      active = false;
    };
  }, [mapId]);

  // Connect to TDM WebSocket (O(1) latest-frame coalescing in ws.onmessage)
  useEffect(() => {
    pilotedIdRef.current = null;
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
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        // Coalesce: keep only the newest binary frame; decode once per render tick
        pendingBufferRef.current = event.data;
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    return () => {
      pendingBufferRef.current = null;
      ws.close();
    };
  }, [mapId, pilotedUnit, customPool, clearInputs]);

  // Pixi.js v8 WebGL 60Hz Render & Input Loop (Cached EnvObjects + BitmapText + Throttled Radar)
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let destroyed = false;
    let initialized = false;
    let resizeObserver: ResizeObserver | null = null;
    const app = new Application();

    (async () => {
      const rect = container.getBoundingClientRect();
      const initW = Math.max(1, Math.floor(rect.width));
      const initH = Math.max(1, Math.floor(rect.height));

      await app.init({
        canvas,
        width: initW,
        height: initH,
        background: 0x050811,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        autoDensity: true,
        antialias: true,
        roundPixels: false,
      });

      if (destroyed) {
        app.destroy(false, { children: true, texture: false, textureSource: false });
        return;
      }
      initialized = true;

      ensurePixiBitmapFont();
      loadPixiUnitTextures();

      const worldContainer = new Container();
      const gridGfx = new Graphics();
      const envLayer = new PixiEnvLayer();
      const unitBackGfx = new Graphics();
      const unitSprites = new PixiUnitSpriteLayer();
      const unitFrontGfx = new Graphics();

      worldContainer.addChild(
        gridGfx,
        envLayer.softContainer,
        envLayer.dynamicGfx,
        envLayer.solidContainer,
        unitBackGfx,
        unitSprites.container,
        unitFrontGfx
      );

      const hudDiagText = new BitmapText({
        text: '',
        style: {
          fontFamily: TACTICAL_BITMAP_FONT,
          fontSize: 11,
        },
      });
      hudDiagText.tint = 0x00f3ff;
      hudDiagText.visible = false;

      app.stage.addChild(worldContainer, hudDiagText);

      // Preallocated scratch structures
      const liveUnitMap = new Map<string, SnapshotUnit>();
      const spriteItems: SpriteSyncItem[] = [];

      let cachedGridW = 0;
      let cachedGridH = 0;
      let lastRadarDrawMs = 0;

      const syncSize = () => {
        if (destroyed) return;
        const r = container.getBoundingClientRect();
        const w = Math.max(1, Math.floor(r.width));
        const h = Math.max(1, Math.floor(r.height));
        if (app.screen.width !== w || app.screen.height !== h) {
          app.renderer.resize(w, h);
        }
        hudDiagText.position.set(20, Math.max(20, h - 84));
      };
      syncSize();
      resizeObserver = new ResizeObserver(syncSize);
      resizeObserver.observe(container);

      let lastTime = performance.now();
      let lastFpsTime = lastTime;
      let lastHudSyncTime = lastTime;
      let frameCount = 0;
      let currentFps = 60;

      app.ticker.add(() => {
        const currentTime = performance.now();
        const rawDt = (currentTime - lastTime) / 1000;
        const dt = Math.min(Math.max(rawDt, 0.001), 0.1);
        lastTime = currentTime;

        frameCount++;
        if (currentTime - lastFpsTime >= 1000) {
          currentFps = Math.round((frameCount * 1000) / (currentTime - lastFpsTime));
          frameCount = 0;
          lastFpsTime = currentTime;
        }

        // 0. Decode ONLY the latest arrived binary frame (drops any stale queued packets)
        const pendingBuf = pendingBufferRef.current;
        if (pendingBuf) {
          pendingBufferRef.current = null;
          const parsedState = unpackServerBinaryMessage(pendingBuf);
          if (parsedState) {
            snapshotRef.current = parsedState;
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
        const viewW = app.screen.width;
        const viewH = app.screen.height;

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
        worldContainer.position.set(viewW / 2 - cameraX, viewH / 2 - cameraY);

        // 1. Cached Tactical Sector Grid
        if (cachedGridW !== mapW || cachedGridH !== mapH) {
          cachedGridW = mapW;
          cachedGridH = mapH;
          gridGfx.clear();
          for (let gx = 0; gx <= mapW; gx += GRID_SPACING) {
            gridGfx.moveTo(gx, 0).lineTo(gx, mapH);
          }
          for (let gy = 0; gy <= mapH; gy += GRID_SPACING) {
            gridGfx.moveTo(0, gy).lineTo(mapW, gy);
          }
          gridGfx.stroke({ width: 1, color: 0x00f3ff, alpha: 0.055 });
          gridGfx.rect(0, 0, mapW, mapH).stroke({ width: 4, color: 0xa855f7, alpha: 0.9 });
        }

        // 2. Cached Universal Environmental Objects (O(1) transform updates)
        const liveEnvObjects = snapshot.envObjects || [];
        envLayer.sync(liveEnvObjects, currentTime, mapW, mapH);

        // 3. Interpolated Fleet Units -> Pooled Mipmapped Pixi Sprites
        const interpolatedUnits =
          liveUnits.length > 0 ? getInterpolatedUnits(serverHistoryRef.current, currentTime) : [];
        const unitsToDraw =
          interpolatedUnits && interpolatedUnits.length > 0 ? interpolatedUnits : liveUnits;

        unitBackGfx.clear();
        unitFrontGfx.clear();
        spriteItems.length = 0;

        for (let i = 0; i < unitsToDraw.length; i++) {
          const u = unitsToDraw[i];
          const latest = liveUnitMap.get(u.id);
          if (!latest || latest.isDestroyed) continue;

          const isPiloted = playerUnit?.id === latest.id;
          const rx = isPiloted ? renderPosRef.current.x : u.pos.x;
          const ry = isPiloted ? renderPosRef.current.y : u.pos.y;
          const angle = u.angle;
          const size = getPixiUnitSize(latest.type);
          const halfH = size / 2;
          const isFlagship =
            latest.type === 'flagship' || latest.type === 'battalion_command_ship';

          if (isPiloted) {
            unitBackGfx
              .circle(rx, ry, Math.max(34, halfH + 8))
              .stroke({ width: 1.8, color: 0x22d3ee, alpha: 0.72 });
          }

          if (latest.isStealthed) {
            drawPixiDashedCircle(unitBackGfx, rx, ry, halfH + 8, 6, 6, 0xc084fc, 0.72, 2);
          }

          if (isFlagship) {
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            if (isPiloted && keysRef.current['w']) {
              const flameLen = 22 + Math.random() * 14;
              for (const side of [-12, 12]) {
                const bx = rx - cos * 38 - sin * side;
                const by = ry - sin * 38 + cos * side;
                const tx = rx - cos * (38 + flameLen) - sin * side;
                const ty = ry - sin * (38 + flameLen) + cos * side;
                unitBackGfx
                  .moveTo(bx, by)
                  .lineTo(tx, ty)
                  .stroke({ width: 6, color: 0x38bdf8, alpha: 0.85, cap: 'round' });
              }
            }
            if (latest.isFiring) {
              for (const side of [-11, 11]) {
                const fx = rx + cos * 38 - sin * side;
                const fy = ry + sin * 38 + cos * side;
                const ex = rx + cos * 58 - sin * side;
                const ey = ry + sin * 58 + cos * side;
                unitFrontGfx
                  .moveTo(fx, fy)
                  .lineTo(ex, ey)
                  .stroke({ width: 3, color: 0xf59e0b, alpha: 0.95 });
              }
            }
            drawPixiShieldArcs(unitFrontGfx, rx, ry, angle, latest.shields, 52);
          }

          spriteItems.push({
            id: latest.id,
            unitType: latest.type,
            x: rx,
            y: ry,
            angle,
            size,
            alpha: latest.isStealthed ? 0.48 : 1,
          });
        }

        unitSprites.sync(spriteItems);

        // 4. Projectiles
        const projectiles = snapshot.projectiles || [];
        for (let i = 0; i < projectiles.length; i++) {
          const p = projectiles[i];
          unitFrontGfx
            .circle(p.pos.x, p.pos.y, 3)
            .fill({ color: p.type === 'player' ? 0x00f3ff : 0xff2a6d, alpha: 1 });
        }

        // 5. Piloted ship 4-quadrant shield HUD diagnostics
        if (playerUnit) {
          const diagStr =
            `FRONT SHD: ${(playerUnit.shields?.front || 0).toFixed(1)}\n` +
            `REAR  SHD: ${(playerUnit.shields?.rear || 0).toFixed(1)}\n` +
            `PORT  SHD: ${(playerUnit.shields?.port || 0).toFixed(1)}\n` +
            `STBD  SHD: ${(playerUnit.shields?.starboard || 0).toFixed(1)}`;
          if (hudDiagText.text !== diagStr) hudDiagText.text = diagStr;
          hudDiagText.visible = true;
        } else {
          hudDiagText.visible = false;
        }

        // 6. Throttled Tactical Radar Minimap (~12Hz instead of 60Hz)
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

            const camViewW = viewW * scaleX;
            const camViewH = viewH * scaleY;
            const camViewX = cameraX * scaleX - camViewW / 2;
            const camViewY = cameraY * scaleY - camViewH / 2;
            radarCtx.strokeStyle = 'rgba(251, 191, 36, 0.55)';
            radarCtx.lineWidth = 1;
            radarCtx.strokeRect(camViewX, camViewY, camViewW, camViewH);
          }
        }

        // 7. Low-frequency HUD state sync (~4Hz or immediately on match end)
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
      });
    })();

    return () => {
      destroyed = true;
      resizeObserver?.disconnect();
      if (initialized) {
        app.destroy(false, { children: true, texture: false, textureSource: false });
      }
    };
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
