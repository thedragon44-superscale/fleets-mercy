import { useGameSocket } from '../hooks/useGameSockets';
import React, { useEffect, useRef, useState } from 'react';
import { drawFlagship, drawUnitAsset, drawProjectile, drawHUDDiagnostics, renderEnvironmentVector } from '../renderer/vectorAssets';
import { getInterpolatedUnits } from '../renderer/interpolation';
import { UNIT_DB } from './GarageDashboard';
import { API_BASE_URL, WS_BASE_URL } from '../config';
import { fetchMapDetail, MapDefinition } from '../services/mapService';
import { UnitConfigModal } from './UnitConfig';
import { LoadingIndicator } from './common/LoadingIndicator';

// Bundle local asset PNGs via Vite to bypass CORS entirely
const localAssets = import.meta.glob('../assets/*.png', { eager: true }) as Record<string, { default: string }>;

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
  const cameraPos = useRef({ x: 6000, y: 10000 });
  const keys = useRef<{ [key: string]: boolean }>({});
  const mousePos = useRef({ x: 0, y: 0 });
  const isFiring = useRef(false);

  const renderPos = useRef({ x: 6000, y: 10000 });
  const isInitialized = useRef(false);
  
  // Preloaded HTML Image cache for 2D Canvas rendering
  const loadedImages = useRef<{ [key: string]: HTMLImageElement }>({});

  const [mapDetails, setMapDetails] = useState<MapDefinition | null>(null);
  const [selectedCatalogUnitId, setSelectedCatalogUnitId] = useState<string>(UNIT_DB[0]?.id || 'viper_interceptor');
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(false);

  const [controlledUnitId, setControlledUnitId] = useState<string>('player-flagship');
  const controlledUnitIdRef = useRef<string>('player-flagship');
  const [isSidebarVisible, setIsSidebarVisible] = useState<boolean>(true);
  const [simulationSpeed, setSimulationSpeed] = useState<number>(1.0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isBootstrapping, setIsBootstrapping] = useState<boolean>(true);

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
        if (data) setMapDetails(data);
      });
    }
  }, [mapId]);

  const { state: socketState, sendInput, updateUnitCount: sendUnitCount, sendTemplateOverride } = useGameSocket(`${WS_BASE_URL}/ws?mode=sandbox`);

  if (socketState) {
    serverState.current = socketState;

    if (socketState.units && socketState.units.length > 0) {
      if (isBootstrapping) {
        setIsBootstrapping(false); // Dismiss loader once initial units are received
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
      let angle = 0;
      if (controlledUnit) {
        const worldMouseX = mousePos.current.x - canvasRef.current.width / 2 + cameraPos.current.x;
        const worldMouseY = mousePos.current.y - canvasRef.current.height / 2 + cameraPos.current.y;
        angle = Math.atan2(worldMouseY - controlledUnit.pos.y, worldMouseX - controlledUnit.pos.x);
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
      const counts: { [key: string]: number } = {};
      UNIT_DB.forEach(u => {
        const currentCount = serverState.current?.units?.filter(unit => unit.ownerId === 'player' && unit.type === u.id && !unit.isDestroyed).length || 0;
        counts[u.id] = currentCount;
      });
      counts[unitType] = Math.max(0, (counts[unitType] || 0) + delta);
      sendUnitCount(counts);
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

        const mapW = mapDetails?.width ?? serverState.current?.mapBounds?.width ?? 12000;
        const mapH = mapDetails?.height ?? serverState.current?.mapBounds?.height ?? 12000;

        ctx.strokeStyle = 'rgba(0, 243, 255, 0.05)'; ctx.lineWidth = 1; ctx.beginPath();
        for (let i = 0; i <= mapW; i += 200) { ctx.moveTo(i, 0); ctx.lineTo(i, mapH); }
        for (let i = 0; i <= mapH; i += 200) { ctx.moveTo(0, i); ctx.lineTo(mapW, i); }
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

          radarCtx.fillStyle = 'rgba(5, 8, 17, 0.85)';
          radarCtx.fillRect(0, 0, rw, rh);
          radarCtx.strokeStyle = '#a855f7';
          radarCtx.lineWidth = 1.5;
          radarCtx.strokeRect(0, 0, rw, rh);

          const scaleX = rw / mapW;
          const scaleY = rh / mapH;

          if (mapDetails?.structures) {
            mapDetails.structures.forEach(s => {
              const rx = s.posX * scaleX;
              const ry = s.posY * scaleY;
              const rr = Math.max(2, s.radius * scaleX);
              radarCtx.fillStyle = s.structureType === 'gas_giant' ? 'rgba(100, 150, 255, 0.25)' : 'rgba(168, 85, 247, 0.6)';
              radarCtx.beginPath();
              radarCtx.arc(rx, ry, rr, 0, Math.PI * 2);
              radarCtx.fill();
            });
          }

          (serverState.current.units || []).forEach((u: any) => {
            if (u.isDestroyed) return;
            const isControlled = u.id === activeId;
            const rx = (isControlled ? renderPos.current.x : u.pos.x) * scaleX;
            const ry = (isControlled ? renderPos.current.y : u.pos.y) * scaleY;
            radarCtx.fillStyle = isControlled ? '#38bdf8' : (u.ownerId === 'player' ? '#22c55e' : '#ef4444');
            radarCtx.fillRect(rx - 1.5, ry - 1.5, 3, 3);
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
              <span className="text-[9px] font-black uppercase tracking-widest text-cyan-400">Active Units (Pilot Switcher)</span>
              <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto pr-1">
                {playerUnits.map(unit => {
                  const isControlled = controlledUnitId === unit.id;
                  return (
                    <button
                      key={unit.id}
                      onClick={() => setControlledUnitId(unit.id)}
                      className={`px-2 py-0.5 rounded border text-[9px] font-bold uppercase transition-all ${isControlled ? 'bg-cyan-400 text-slate-950 border-white shadow-md font-black' : 'bg-[#161922] border-slate-800 text-slate-300 hover:border-slate-700'}`}
                    >
                      {unit.id}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-between items-center mb-1 shrink-0">
              <span className="text-[9px] font-black uppercase tracking-widest text-amber-400">Catalog Spawner</span>
              <button onClick={() => setIsInspectorOpen(prev => !prev)} className={`px-2 py-0.5 rounded text-[8px] font-black uppercase transition-all border ${isInspectorOpen ? 'bg-cyan-500 text-slate-950 border-cyan-400' : 'bg-slate-800 text-cyan-400 border-slate-700 hover:bg-slate-700'}`}>
                {isInspectorOpen ? 'Close Inspector ⚙️' : 'Inspect Unit ⚙️'}
              </button>
            </div>

            <div className="flex-1 flex flex-col gap-1 overflow-y-auto pr-1 mb-3">
              {UNIT_DB.map(unit => {
                const isSelected = selectedCatalogUnitId === unit.id;
                const unitCount = playerUnits.filter(u => u.type === unit.id).length;

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

        {/* MODULAR UNIT CONFIGURATION STUDIO MODAL */}
        <UnitConfigModal
          isOpen={isSidebarVisible && isInspectorOpen}
          initialUnitId={selectedCatalogUnitId}
          onClose={() => setIsInspectorOpen(false)}
          sendTemplateOverride={sendTemplateOverride}
        />
      </div>
    </div>
  );
};

export default PracticeViewport;
