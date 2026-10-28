import { useGameSocket } from '../hooks/useGameSockets';
import React, { useEffect, useRef, useState } from 'react';
import { drawFlagship, drawUnitAsset, drawProjectile, drawHUDDiagnostics, renderEnvironmentVector } from '../renderer/vectorAssets';
import { getInterpolatedUnits } from '../renderer/interpolation';
import { UNIT_DB } from './GarageDashboard';
import { WS_BASE_URL, API_BASE_URL } from '../config';
import { fetchMapDetail, MapDefinition } from '../services/mapService';
import { UnitConfigModal } from './UnitConfig';
import { DockingModal } from './DockingModal';
import { PilotSwitcherModal } from './PilotSwitcherModal';
import { LoadingIndicator } from './common/LoadingIndicator';

// Bundle local asset PNGs via Vite to bypass CORS entirely
const localAssets = import.meta.glob('../assets/*.png', { eager: true }) as Record<string, { default: string }>;

// Data-Driven Configuration Constants
const GRID_SPACING = 200;

const ASSET_FILENAME_MAP: { [unitId: string]: string } = {
  viper_interceptor: 'viper.png', recon_probe: 'recon.png', phantom_transport: 'phantom.png', ion_interceptor: 'ion.png',
  mining_barge: 'mining.png', supply_tender: 'supply.png', plasma_skimmer: 'plasma.png', grav_extractor: 'grav.png',
  assault_gunship: 'assault.png', command_escort: 'assault.png', aegis_repair: 'aegis.png', vortex_minelayer: 'vortex.png', 
  lancer_corvette: 'lancer.png', cryo_flak: 'cryo.png', specter_jammer: 'specter.png', aegis_wall: 'wall.png', 
  torpedo_bomber: 'torpedo.png', warp_frigate: 'warp.png', gun_emplacement: 'turret.png', flagship: 'flagship.png',
  battalion_command_ship: 'flagship.png'
};

const getLocalAssetUrl = (unitType: string): string => {
  const filename = ASSET_FILENAME_MAP[unitType] || 'viper.png';
  const matchKey = Object.keys(localAssets).find(key => key.endsWith(filename));
  return matchKey ? localAssets[matchKey].default : '';
};

interface FleetUnit {
  id: string; type: string; ownerId: string;
  pos: { x: number; y: number }; vel: { x: number; y: number }; angle: number;
  shields: any; hull: any;
  isFiring: boolean; isDestroyed: boolean; aiState: string;
}

interface ServerState {
  units: FleetUnit[];
  projectiles: { pos: { x: number; y: number }; vel: { x: number; y: number }; type: string }[];
  mapBounds: { width: number; height: number };
}

interface PracticeViewportProps {
  mapId?: number;
  onNavigateGarage: () => void;
  onLogout: () => void;
  onNavigateHome?: () => void;
}

export const PracticeViewport: React.FC<PracticeViewportProps> = ({ mapId = 1, onNavigateGarage, onLogout, onNavigateHome }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const radarCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const serverState = useRef<ServerState | null>(null);
  const serverHistoryRef = useRef<{ timestamp: number; units: FleetUnit[] }[]>([]);
  
  // Dynamic camera and render positions initialized at center upon map service resolution
  const cameraPos = useRef({ x: 0, y: 0 });
  const renderPos = useRef({ x: 0, y: 0 });

  const keys = useRef<{ [key: string]: boolean }>({});
  const mousePos = useRef({ x: 0, y: 0 });
  const isFiring = useRef(false);

  const isInitialized = useRef(false);
  
  // Preloaded HTML Image cache for 2D Canvas rendering
  const loadedImages = useRef<{ [key: string]: HTMLImageElement }>({});

  const [mapDetails, setMapDetails] = useState<MapDefinition | null>(null);
  const [selectedCatalogUnitId, setSelectedCatalogUnitId] = useState<string>(UNIT_DB[0]?.id || 'viper_interceptor');
  const [spawnerFaction, setSpawnerFaction] = useState<'player' | 'enemy'>('player');

  const [controlledUnitId, setControlledUnitId] = useState<string>('player-flagship');
  const controlledUnitIdRef = useRef<string>('player-flagship');
  const [isSidebarVisible, setIsSidebarVisible] = useState<boolean>(true);
  const [simulationSpeed, setSimulationSpeed] = useState<number>(1.0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isBootstrapping, setIsBootstrapping] = useState<boolean>(true);
  const [liveTemplates, setLiveTemplates] = useState<{ [key: string]: any }>({});
  const liveTemplatesRef = useRef<{ [key: string]: any }>({});

  // Fetch live templates on mount and poll periodically, updating both state and ref for the render loop
  useEffect(() => {
    const fetchTemplates = () => {
      fetch(`${API_BASE_URL}/api/templates`)
        .then(res => res.json())
        .then(data => {
          if (data) {
            setLiveTemplates(data);
            liveTemplatesRef.current = data;
          }
        })
        .catch(err => console.log('⚠️ Failed to load live templates for viewport:', err));
    };

    fetchTemplates();
    const interval = setInterval(fetchTemplates, 2000);
    return () => clearInterval(interval);
  }, []);

  // Studio Modal States
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(false);
  const [isDockingOpen, setIsDockingOpen] = useState<boolean>(false);
  const [isPilotOpen, setIsPilotOpen] = useState<boolean>(false);

  // Preload PNG images on mount
  useEffect(() => {
    Object.keys(ASSET_FILENAME_MAP).forEach(unitType => {
      const url = getLocalAssetUrl(unitType);
      if (url && !loadedImages.current[unitType]) {
        const img = new Image();
        img.src = url;
        loadedImages.current[unitType] = img;
      }
    });
  }, []);

  useEffect(() => {
    controlledUnitIdRef.current = controlledUnitId;
    isInitialized.current = false;
  }, [controlledUnitId]);

  useEffect(() => {
    if (mapId) {
      fetchMapDetail(mapId).then(data => {
        if (data) {
          setMapDetails(data);
          // Dynamically adjust camera/render center based on loaded map dimensions
          const centerX = data.width / 2;
          const centerY = data.height / 2;
          cameraPos.current = { x: centerX, y: centerY };
          renderPos.current = { x: centerX, y: centerY };
        }
      });
    }
  }, [mapId]);

  const { state: socketState, sendInput, updateUnitCount: _updateUnitCount, sendTemplateOverride } = useGameSocket(`${WS_BASE_URL}/ws?mode=sandbox`);

  if (socketState) {
    serverState.current = socketState;

    if (socketState.units && socketState.units.length > 0) {
      if (isBootstrapping) {
        setIsBootstrapping(false);
      }

      const now = performance.now();
      serverHistoryRef.current.push({ timestamp: now, units: socketState.units });
      if (serverHistoryRef.current.length > 20) {
        serverHistoryRef.current.shift();
      }

      const playerUnits = socketState.units.filter((u: FleetUnit) => u.ownerId === 'player' && !u.isDestroyed);
      const exists = playerUnits.some((u: FleetUnit) => u.id === controlledUnitIdRef.current);
      if (!exists && playerUnits.length > 0) {
        const newId = playerUnits[0].id;
        setControlledUnitId(newId);
        controlledUnitIdRef.current = newId;
        isInitialized.current = false;
      }
    }

    const activeId = controlledUnitIdRef.current;
    const controlledUnit = socketState.units?.find((u: FleetUnit) => u.id === activeId);
    if (controlledUnit && !isInitialized.current) {
      renderPos.current = { x: controlledUnit.pos.x, y: controlledUnit.pos.y };
      isInitialized.current = true;
    }
  }

  const sendAction = (actionParams: any = {}) => {
    if (canvasRef.current && serverState.current) {
      const playerUnits = serverState.current.units?.filter((u: FleetUnit) => u.ownerId === 'player' && !u.isDestroyed) || [];
      const currentId = playerUnits.some(u => u.id === controlledUnitIdRef.current)
        ? controlledUnitIdRef.current
        : (playerUnits[0]?.id || controlledUnitIdRef.current);

      const controlledUnit = serverState.current.units?.find(u => u.id === currentId);
      let angle = controlledUnit?.angle || 0;
      if (controlledUnit) {
        const worldMouseX = mousePos.current.x - canvasRef.current.width / 2 + cameraPos.current.x;
        const worldMouseY = mousePos.current.y - canvasRef.current.height / 2 + cameraPos.current.y;
        const dx = worldMouseX - controlledUnit.pos.x;
        const dy = worldMouseY - controlledUnit.pos.y;
        const distToCursor = Math.hypot(dx, dy);
        const DEADZONE_RADIUS = 35.0; // pixels

        if (distToCursor > DEADZONE_RADIUS) {
          angle = Math.atan2(dy, dx);
        }
      }
      sendInput({
        keys: keys.current,
        angle,
        isFiring: isFiring.current && !!controlledUnit,
        currentId,
        reset: actionParams.reset || false,
        sandboxCounts: actionParams.sandboxCounts || undefined
      });
    }
  };

  const updateUnitCount = (unitType: string, delta: number) => {
    if (serverState.current) {
      const sandboxCountsPayload = UNIT_DB.map(u => {
        const currentCount = serverState.current?.units?.filter(
          unit => unit.ownerId === spawnerFaction && unit.type === u.id && !unit.isDestroyed
        ).length || 0;
        
        const targetCount = u.id === unitType ? Math.max(0, currentCount + delta) : currentCount;
        return {
          unitType: u.id,
          count: targetCount,
          ownerId: spawnerFaction
        };
      });

      sendInput({
        keys: keys.current,
        sandboxCounts: sandboxCountsPayload
      });
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = true; if (!e.repeat) sendAction(); };
    const onKeyUp = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = false; sendAction(); };
    const onMouseMove = (e: MouseEvent) => { mousePos.current = { x: e.clientX, y: e.clientY }; sendAction(); };
    const onMouseDown = (e: MouseEvent) => { if (e.button === 0 && !(e.target as HTMLElement).closest('.ui-interactive')) { isFiring.current = true; sendAction(); } };
    const onMouseUp = (e: MouseEvent) => { if (e.button === 0) { isFiring.current = false; sendAction(); } };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', () => { keys.current = {}; isFiring.current = false; sendAction(); });
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);

    let animId: number;
    let lastTime = performance.now();

    const render = (currentTime: number) => {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      const ctx = canvasRef.current?.getContext('2d');
      const canvas = canvasRef.current;
      const radarCtx = radarCanvasRef.current?.getContext('2d');
      const radarCanvas = radarCanvasRef.current;
      
      if (!ctx || !canvas) { animId = requestAnimationFrame(render); return; }

      ctx.fillStyle = '#050811'; ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (serverState.current) {
        const playerUnits = serverState.current.units?.filter((u: FleetUnit) => u.ownerId === 'player' && !u.isDestroyed) || [];
        const activeId = playerUnits.some(u => u.id === controlledUnitIdRef.current)
          ? controlledUnitIdRef.current
          : (playerUnits[0]?.id || controlledUnitIdRef.current);

        const controlledUnit = serverState.current.units?.find(u => u.id === activeId);
        if (controlledUnit) {
          if (!isInitialized.current) {
            renderPos.current = { x: controlledUnit.pos.x, y: controlledUnit.pos.y };
            isInitialized.current = true;
          }

          const lerpRate = 1.0 - Math.pow(0.0001, dt);
          renderPos.current.x += (controlledUnit.pos.x - renderPos.current.x) * lerpRate;
          renderPos.current.y += (controlledUnit.pos.y - renderPos.current.y) * lerpRate;

          const worldMouseX = mousePos.current.x - canvas.width / 2 + cameraPos.current.x;
          const worldMouseY = mousePos.current.y - canvas.height / 2 + cameraPos.current.y;
          const dx = worldMouseX - renderPos.current.x;
          const dy = worldMouseY - renderPos.current.y;
          const dist = Math.hypot(dx, dy);

          let targetCamX = renderPos.current.x;
          let targetCamY = renderPos.current.y;

          if (keys.current['w'] && dist > 1) {
            const lookAheadRatio = 0.5;
            targetCamX += (dx / dist) * Math.min(dist * lookAheadRatio, canvas.width * 0.35);
            targetCamY += (dy / dist) * Math.min(dist * lookAheadRatio, canvas.height * 0.35);
          } else {
            targetCamX += (mousePos.current.x - canvas.width / 2) * 0.2;
            targetCamY += (mousePos.current.y - canvas.height / 2) * 0.2;
          }

          const camBaseFactor = keys.current['w'] ? 18.0 : 8.0;
          const camLerpFactor = 1.0 - Math.exp(-camBaseFactor * dt);
          cameraPos.current.x += (targetCamX - cameraPos.current.x) * camLerpFactor;
          cameraPos.current.y += (targetCamY - cameraPos.current.y) * camLerpFactor;
        }

        ctx.save();
        ctx.translate(canvas.width / 2 - cameraPos.current.x, canvas.height / 2 - cameraPos.current.y);

        const mapW = mapDetails?.width ?? serverState.current?.mapBounds?.width ?? 0;
        const mapH = mapDetails?.height ?? serverState.current?.mapBounds?.height ?? 0;

        // Skip rendering world grid and radar if map dimensions have not resolved from telemetry or mapService
        if (mapW === 0 || mapH === 0) {
          animId = requestAnimationFrame(render);
          return;
        }

        ctx.strokeStyle = 'rgba(0, 243, 255, 0.05)'; ctx.lineWidth = 1; ctx.beginPath();
        for (let i = 0; i <= mapW; i += GRID_SPACING) { ctx.moveTo(i, 0); ctx.lineTo(i, mapH); }
        for (let i = 0; i <= mapH; i += GRID_SPACING) { ctx.moveTo(0, i); ctx.lineTo(mapW, i); }
        ctx.stroke();

        ctx.strokeStyle = '#a855f7'; ctx.lineWidth = 4;
        ctx.strokeRect(0, 0, mapW, mapH);

        if (mapDetails?.structures) {
          mapDetails.structures.forEach(s => {
            ctx.save();
            ctx.translate(s.posX, s.posY);
            renderEnvironmentVector(ctx, s.structureType, s.radius);
            ctx.restore();
          });
        }

        const renderTime = performance.now();
        const interpolatedUnits = getInterpolatedUnits(serverHistoryRef.current, renderTime);

        (interpolatedUnits || []).forEach((u: any) => {
          const isControlled = u.id === activeId;
          const rx = isControlled ? renderPos.current.x : u.pos.x;
          const ry = isControlled ? renderPos.current.y : u.pos.y;

          const isAccelerating = isControlled && !!keys.current['w'];

          if (u.type === 'flagship' || u.type === 'battalion_command_ship') {
            drawFlagship(ctx, rx, ry, u.angle, u.shields, u.hull, u.isFiring, u.isDestroyed, isAccelerating);
          } else {
            drawUnitAsset(ctx, rx, ry, u.angle, u.type, u.ownerId, u.isDestroyed);
          }
        });

        if (serverState.current?.projectiles && serverState.current.projectiles.length > 0) {
  console.log('[PROJECTILE DEBUG] Count:', serverState.current.projectiles.length, serverState.current.projectiles);
}

        (serverState.current.projectiles || []).forEach(p => {
          drawProjectile(ctx, p.pos.x, p.pos.y, p.vel.x, p.vel.y, p.type);
        });

        ctx.restore();
        
        const cu = serverState.current.units.find(u => u.id === activeId);
        if (cu) {
          drawHUDDiagnostics(ctx, cu.shields, cu.hull);
        }

        if (radarCtx && radarCanvas) {
          const rw = radarCanvas.width;
          const rh = radarCanvas.height;

          radarCtx.fillStyle = 'rgba(5, 8, 17, 0.95)';
          radarCtx.fillRect(0, 0, rw, rh);
          radarCtx.strokeStyle = '#a855f7';
          radarCtx.lineWidth = 1.5;
          radarCtx.strokeRect(0, 0, rw, rh);

          const scaleX = rw / mapW;
          const scaleY = rh / mapH;

          // Helper: Check if a world coordinate is within active player sensor/recon telemetry range using liveTemplatesRef
          const isVisibleToPlayer = (x: number, y: number): boolean => {
            if (!serverState.current?.units) return false;
            for (const u of serverState.current.units) {
              if (u.ownerId === 'player' && !u.isDestroyed) {
                const tmpl = liveTemplatesRef.current[u.type] || {};
                const sensorRange = tmpl.sensorRange ?? tmpl.sensor_range ?? 0;
                const dist = Math.hypot(u.pos.x - x, u.pos.y - y);
                if (dist <= sensorRange) {
                  return true;
                }
              }
            }
            return false;
          };

          // 1. Render Recon Probe sensor bubbles and overlap zones using database-backed sensor ranges
          (serverState.current.units || []).forEach((u: any) => {
            if (u.isDestroyed || u.ownerId !== 'player') return;
            if (u.type === 'recon_probe') {
              const rx = (u.id === activeId ? renderPos.current.x : u.pos.x) * scaleX;
              const ry = (u.id === activeId ? renderPos.current.y : u.pos.y) * scaleY;
              const tmpl = liveTemplatesRef.current[u.type] || {};
              const probeSensorRange = tmpl.sensorRange ?? tmpl.sensor_range ?? 0;
              const radiusPixels = probeSensorRange * scaleX;

              radarCtx.beginPath();
              radarCtx.arc(rx, ry, radiusPixels, 0, Math.PI * 2);
              radarCtx.fillStyle = 'rgba(0, 243, 255, 0.04)';
              radarCtx.fill();
              radarCtx.strokeStyle = 'rgba(0, 243, 255, 0.25)';
              radarCtx.lineWidth = 0.75;
              radarCtx.stroke();
            }
          });

          // 2. Render environmental structures / obstacles ONLY if detected by player telemetry[cite: 7]
          if (mapDetails?.structures) {
            mapDetails.structures.forEach(s => {
              if (!isVisibleToPlayer(s.posX, s.posY)) return;

              const rx = s.posX * scaleX;
              const ry = s.posY * scaleY;
              const rr = Math.max(2, s.radius * scaleX);
              radarCtx.fillStyle = s.structureType === 'gas_giant' ? 'rgba(100, 150, 255, 0.2)' : 'rgba(168, 85, 247, 0.5)';
              radarCtx.strokeStyle = 'rgba(168, 85, 247, 0.8)';
              radarCtx.lineWidth = 1;
              radarCtx.beginPath();
              radarCtx.arc(rx, ry, rr, 0, Math.PI * 2);
              radarCtx.fill();
              radarCtx.stroke();
            });
          }

          // 3. Render units using distinct geometric figures based on weight class[cite: 7]
          (serverState.current.units || []).forEach((u: any) => {
            if (u.isDestroyed) return;

            if (u.ownerId !== 'player' && !isVisibleToPlayer(u.pos.x, u.pos.y)) {
              return;
            }

            const isControlled = u.id === activeId;
            const rx = (isControlled ? renderPos.current.x : u.pos.x) * scaleX;
            const ry = (isControlled ? renderPos.current.y : u.pos.y) * scaleY;
            
            const unitMeta = UNIT_DB.find(item => item.id === u.type);
            const weight = unitMeta ? unitMeta.weight : 1;

            const baseColor = isControlled ? '#38bdf8' : (u.ownerId === 'player' ? '#22c55e' : '#ef4444');
            radarCtx.fillStyle = baseColor;
            radarCtx.strokeStyle = baseColor;
            radarCtx.lineWidth = 1;

            radarCtx.beginPath();
            if (weight === 1) {
              radarCtx.moveTo(rx, ry - 3.5);
              radarCtx.lineTo(rx - 3, ry + 3);
              radarCtx.lineTo(rx + 3, ry + 3);
              radarCtx.closePath();
              radarCtx.fill();
            } else if (weight === 2) {
              radarCtx.arc(rx, ry, 2.5, 0, Math.PI * 2);
              radarCtx.fill();
            } else if (weight === 3) {
              radarCtx.rect(rx - 2.5, ry - 2.5, 5, 5);
              radarCtx.fill();
            } else if (weight === 4) {
              radarCtx.moveTo(rx, ry - 4);
              radarCtx.lineTo(rx + 3.5, ry);
              radarCtx.lineTo(rx, ry + 4);
              radarCtx.lineTo(rx - 3.5, ry);
              radarCtx.closePath();
              radarCtx.fill();
            } else {
              radarCtx.rect(rx - 4, ry - 4, 8, 8);
              radarCtx.stroke();
            }
          });
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => { 
      cancelAnimationFrame(animId);  
      window.removeEventListener('keydown', onKeyDown); 
      window.removeEventListener('keyup', onKeyUp); 
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [mapDetails]);

  const playerUnits = serverState.current?.units
    ?.filter(u => u.ownerId === 'player' && !u.isDestroyed)
    ?.sort((a, b) => {
      if (a.id === 'player-flagship') return -1;
      if (b.id === 'player-flagship') return 1;
      return a.id.localeCompare(b.id);
    }) || [];

  const hasCommandShip = playerUnits.some(u => u.type === 'battalion_command_ship');

  return (
    <div 
      className="fixed inset-0 w-screen h-screen overflow-hidden bg-[#0b0e14] text-slate-100 flex flex-col p-2 gap-2 font-mono select-none"
      onContextMenu={(e) => { e.preventDefault(); setIsSidebarVisible(prev => !prev); }}
    >
      <header 
        className="ui-interactive bg-[#0f1115] border border-slate-800/80 rounded-xl px-3 py-2 flex items-center justify-between shadow-lg shrink-0 gap-4 z-50"
        onMouseDown={e => e.stopPropagation()}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black text-xs">🧪</div>
          <div>
            <h1 className="text-xs font-black tracking-tight text-white uppercase leading-tight">Practice Sandbox (PNG Overlays)</h1>
            <p className="text-[9px] font-bold text-slate-400 tracking-wider uppercase">Sector 01 — Combat Lab</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-[#161922] p-1 rounded-lg border border-slate-800 shrink-0">
          <span className="text-[9px] font-black text-slate-400 px-1 uppercase">Time:</span>
          {[0.25, 0.5, 1.0, 2.0].map(speed => (
            <button
              key={speed}
              onClick={() => { setSimulationSpeed(speed); setIsPaused(false); }}
              className={`px-2 py-0.5 rounded text-[10px] font-black uppercase transition-all ${!isPaused && simulationSpeed === speed ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
            >
              {speed}x
            </button>
          ))}
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase transition-all ${isPaused ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-800 text-slate-300 hover:text-white'}`}
          >
            {isPaused ? 'PAUSED' : 'PAUSE'}
          </button>
        </div>

        <div className="flex items-center gap-4 bg-[#161922] px-3 py-1 rounded-lg border border-slate-800 flex-1 max-w-sm justify-between">
          <span className="text-[9px] font-bold text-slate-400">FPS: <strong className="text-cyan-400">60.0</strong></span>
          <span className="text-[9px] font-bold text-slate-400">Tick: <strong className="text-amber-400">16ms</strong></span>
          <span className="text-[9px] font-bold text-slate-400">Units: <strong className="text-white">{serverState.current?.units?.length || 0}</strong></span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onNavigateHome && (
            <button onClick={onNavigateHome} className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase transition-all">Menu</button>
          )}
          <button onClick={onNavigateGarage} className="bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 px-3 py-1 rounded-lg font-black text-[10px] uppercase transition-all">Garage</button>
          <button onClick={onLogout} className="bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase transition-all">✕</button>
        </div>
      </header>

      <div className="relative flex-1 w-full h-full rounded-xl overflow-hidden bg-[#050811] border border-slate-800/80 shadow-2xl">
        {isBootstrapping && (
          <LoadingIndicator message="ESTABLISHING SECURE HANGAR LINK & SPAWNING UNITS..." />
        )}

        <canvas ref={canvasRef} width={window.innerWidth} height={window.innerHeight} className="w-full h-full block cursor-crosshair" />

        <div className="ui-interactive absolute bottom-4 right-4 w-[180px] h-[180px] bg-[#0f1115]/90 border border-amber-500/40 rounded-lg overflow-hidden shadow-2xl z-40 backdrop-blur-md" onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
          <div className="absolute top-1 left-2 text-[8px] font-black text-amber-400 uppercase tracking-widest pointer-events-none z-10">Tactical Radar</div>
          <canvas ref={radarCanvasRef} width={180} height={180} className="block w-full h-full" />
        </div>

        {!isSidebarVisible && (
          <div className="absolute top-4 left-4 bg-[#0f1115]/90 border border-slate-800 px-3 py-1.5 rounded-lg text-[9px] font-bold text-cyan-400 uppercase tracking-widest pointer-events-none z-40 shadow-lg">
            [Right-Click Anywhere to Open Sandbox Catalog]
          </div>
        )}

        {isSidebarVisible && (
          <div className="ui-interactive absolute top-4 left-4 w-80 h-[calc(100vh-90px)] bg-[#0f1115]/95 border border-slate-800 rounded-xl p-3 z-50 flex flex-col shadow-2xl backdrop-blur-md" onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-2 shrink-0">
              <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider">🧪 Unit Testing Sandbox</span>
              <button onClick={() => setIsSidebarVisible(false)} className="text-[9px] font-bold text-slate-400 hover:text-white">[CLOSE]</button>
            </div>

            <p className="text-[9px] text-slate-400 font-medium leading-tight mb-2 shrink-0">Click unit to inspect/tweak stats. Use +/- to spawn/despawn.</p>

            <div className="flex flex-col gap-1.5 mb-2 shrink-0">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-black uppercase tracking-widest text-amber-400">Catalog Spawner</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setIsPilotOpen(prev => !prev);
                      if (!isPilotOpen) {
                        setIsDockingOpen(false);
                        setIsInspectorOpen(false);
                      }
                    }}
                    className={`px-2 py-0.5 rounded text-[8px] font-black uppercase transition-all border ${
                      isPilotOpen
                        ? 'bg-cyan-400 text-slate-950 border-cyan-300'
                        : 'bg-slate-800 text-cyan-400 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    {isPilotOpen ? 'Close Pilots 🚀' : 'Pilots 🚀'}
                  </button>
                  <button
                    onClick={() => {
                      setIsDockingOpen(prev => !prev);
                      if (!isDockingOpen) {
                        setIsPilotOpen(false);
                        setIsInspectorOpen(false);
                      }
                    }}
                    className={`px-2 py-0.5 rounded text-[8px] font-black uppercase transition-all border ${
                      isDockingOpen
                        ? 'bg-amber-500 text-slate-950 border-amber-400'
                        : 'bg-slate-800 text-amber-400 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    {isDockingOpen ? 'Close Docking ⚓' : 'Docking ⚓'}
                  </button>
                  <button
                    onClick={() => {
                      setIsInspectorOpen(prev => !prev);
                      if (!isInspectorOpen) {
                        setIsPilotOpen(false);
                        setIsDockingOpen(false);
                      }
                    }}
                    className={`px-2 py-0.5 rounded text-[8px] font-black uppercase transition-all border ${
                      isInspectorOpen
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                        : 'bg-slate-800 text-cyan-400 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    {isInspectorOpen ? 'Close Inspector ⚙️' : 'Inspector ⚙️'}
                  </button>
                </div>
              </div>

              {/* Faction Spawner Selector */}
              <div className="flex items-center justify-between bg-[#161922] p-1 rounded-lg border border-slate-800">
                <span className="text-[8px] font-black uppercase text-slate-400 px-1">Spawn Faction:</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setSpawnerFaction('player')}
                    className={`px-2.5 py-0.5 rounded text-[8px] font-black uppercase transition-all ${spawnerFaction === 'player' ? 'bg-green-500 text-slate-950 font-black shadow-md' : 'text-slate-400 hover:text-white'}`}
                  >
                    Player 🟢
                  </button>
                  <button
                    onClick={() => setSpawnerFaction('enemy')}
                    className={`px-2.5 py-0.5 rounded text-[8px] font-black uppercase transition-all ${spawnerFaction === 'enemy' ? 'bg-red-500 text-white font-black shadow-md' : 'text-slate-400 hover:text-white'}`}
                  >
                    Enemy 🔴
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center mb-1 shrink-0 gap-1">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Units List ({spawnerFaction.toUpperCase()})</span>
            </div>

            <div className="flex-1 flex flex-col gap-1 overflow-y-auto pr-1 mb-3">
              {UNIT_DB.map(unit => {
                const isSelected = selectedCatalogUnitId === unit.id;
                const unitCount = serverState.current?.units?.filter(u => u.ownerId === spawnerFaction && u.type === unit.id && !u.isDestroyed).length || 0;

                return (
                  <div
                    key={unit.id}
                    onClick={() => setSelectedCatalogUnitId(unit.id)}
                    className={`p-2 rounded-lg border transition-all flex items-center justify-between cursor-pointer shrink-0 ${isSelected ? 'bg-amber-500/20 border-amber-400 text-white shadow-md' : 'bg-[#161922] border-slate-800 text-slate-300 hover:border-slate-700'}`}
                  >
                    <div className="flex flex-col">
                      <div className="text-[10px] font-bold">{unit.name}</div>
                      <div className="text-[8px] text-slate-400">{unit.role} | {unit.weight}W</div>
                    </div>

                    <div className="flex items-center gap-1.5 bg-[#0b0e14] px-1.5 py-1 rounded-md border border-slate-800" onClick={e => e.stopPropagation()}>
                      <button onClick={() => updateUnitCount(unit.id, -1)} className="w-5 h-5 bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 rounded flex items-center justify-center font-black text-[10px] transition-all">-</button>
                      <span className="w-5 text-center text-[10px] font-black text-amber-400">{unitCount}</span>
                      <button onClick={() => updateUnitCount(unit.id, 1)} className="w-5 h-5 bg-slate-800 hover:bg-amber-500/20 text-slate-300 hover:text-amber-400 rounded flex items-center justify-center font-black text-[10px] transition-all">+</button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col gap-2 shrink-0 pt-2 border-t border-slate-800">
              <button onClick={() => { setIsBootstrapping(true); sendAction({ reset: true }); }} className="w-full bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 font-black py-2 rounded-lg text-[10px] uppercase tracking-widest transition-all">Reset Sandbox</button>
            </div>
          </div>
        )}

        {/* PILOT SWITCHER STUDIO MODAL */}
        <PilotSwitcherModal
          isOpen={isSidebarVisible && isPilotOpen}
          onClose={() => setIsPilotOpen(false)}
          playerUnits={playerUnits.map(u => ({
            id: u.id,
            type: u.type,
            squadId: (u as any).squadId || 0,
            battalionId: (u as any).battalionId || 0,
          }))}
          controlledUnitId={controlledUnitId}
          onSelectUnit={(unitId) => setControlledUnitId(unitId)}
        />

        {/* MODULAR UNIT CONFIGURATION STUDIO MODAL */}
        <UnitConfigModal
          isOpen={isSidebarVisible && isInspectorOpen}
          initialUnitId={selectedCatalogUnitId}
          onClose={() => setIsInspectorOpen(false)}
          sendTemplateOverride={sendTemplateOverride}
        />

        {/* FLEET DOCKING & GROUPING STUDIO MODAL */}
        <DockingModal
          isOpen={isSidebarVisible && isDockingOpen}
          onClose={() => setIsDockingOpen(false)}
          hasCommandShip={hasCommandShip}
          spawnedUnits={playerUnits.map(u => ({
            id: u.id,
            type: u.type,
            squadId: (u as any).squadId || 0,
            battalionId: (u as any).battalionId || 0,
            isLeader: (u as any).isSquadLeader || false,
          }))}
          onAssignUnitToSquad={(unitId, squadId, battalionId, isLeader) => {
            sendInput({
              type: 'UPDATE_GROUPING',
              unitGrouping: {
                unitId,
                squadId,
                battalionId,
                isSquadLeader: isLeader || false,
              }
            });
          }}
        />
      </div>
    </div>
  );
};

export default PracticeViewport;
