// src/components/PracticeViewport.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useGameSocket } from '../hooks/useGameSockets';
import { useUnitTemplates } from '../hooks/useUnitTemplates';
import {
  drawFlagship,
  drawUnitAsset,
  drawProjectile,
  drawHUDDiagnostics,
  renderEnvironmentVector,
  drawUnitDebugOverlays,
  drawSpawnGhost,
  DebugOverlayFlags,
  UNIT_SCALES,
} from '../renderer/vectorAssets';
import { getInterpolatedUnits } from '../renderer/interpolation';
import { SnapshotUnit, ServerStateSnapshot } from '../parsers/binaryCodec';
import { UNIT_DB } from './GarageDashboard';
import { WS_BASE_URL } from '../config';
import { fetchMapDetail, MapDefinition } from '../services/mapService';
import { UnitConfigModal } from './UnitConfig';
import { DockingModal } from './DockingModal';
import { PilotSwitcherModal } from './PilotSwitcherModal';
import { LoadingIndicator } from './common/LoadingIndicator';

const GRID_SPACING = 200;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2.5;

type CanvasToolMode = 'pilot' | 'spawn' | 'select';

interface ScenarioPreset {
  id: string;
  label: string;
  description: string;
  units: Array<{ unitType: string; count: number; ownerId: 'player' | 'enemy' }>;
}

const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: 'duel',
    label: '1v1 Duel',
    description: 'Player Viper vs Enemy Viper',
    units: [
      { unitType: 'viper_interceptor', count: 1, ownerId: 'player' },
      { unitType: 'viper_interceptor', count: 1, ownerId: 'enemy' },
    ],
  },
  {
    id: 'recon_fow',
    label: 'Recon FoW',
    description: 'Flagship + 2 Recon Probes vs 3 Enemy Corvettes',
    units: [
      { unitType: 'flagship', count: 1, ownerId: 'player' },
      { unitType: 'recon_probe', count: 2, ownerId: 'player' },
      { unitType: 'lancer_corvette', count: 3, ownerId: 'enemy' },
    ],
  },
  {
    id: 'squad_skirmish',
    label: 'Skirmish',
    description: 'Balanced 6v6 tactical engagement',
    units: [
      { unitType: 'flagship', count: 1, ownerId: 'player' },
      { unitType: 'viper_interceptor', count: 3, ownerId: 'player' },
      { unitType: 'lancer_corvette', count: 1, ownerId: 'player' },
      { unitType: 'aegis_repair', count: 1, ownerId: 'player' },
      { unitType: 'flagship', count: 1, ownerId: 'enemy' },
      { unitType: 'viper_interceptor', count: 3, ownerId: 'enemy' },
      { unitType: 'assault_gunship', count: 2, ownerId: 'enemy' },
    ],
  },
];

interface PracticeViewportProps {
  mapId?: number;
  onNavigateGarage: () => void;
  onLogout: () => void;
  onNavigateHome?: () => void;
}

const formatUnitName = (unitId: string): string =>
  unitId
    .split('_')
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : ''))
    .join(' ');

export const PracticeViewport: React.FC<PracticeViewportProps> = ({
  mapId = 1,
  onNavigateGarage,
  onLogout,
  onNavigateHome,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const radarCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const serverState = useRef<ServerStateSnapshot | null>(null);
  const serverHistoryRef = useRef<{ timestamp: number; units: SnapshotUnit[] }[]>([]);

  // Camera, Zoom & Pan Refs
  const cameraPos = useRef({ x: 6000, y: 6000 });
  const renderPos = useRef({ x: 6000, y: 6000 });
  const zoomRef = useRef<number>(1.0);
  const isCameraLockedRef = useRef<boolean>(true);
  const isPanningRef = useRef<boolean>(false);
  const panLastMouseRef = useRef({ x: 0, y: 0 });

  // Input & Pointer Refs (canvas-local pixel coords)
  const keys = useRef<{ [key: string]: boolean }>({});
  const mouseCanvasPos = useRef({ x: 0, y: 0 });
  const mouseDirtyRef = useRef<boolean>(false);
  const isFiring = useRef<boolean>(false);
  const isInitialized = useRef<boolean>(false);

  // Live FPS measurement
  const fpsAvgRef = useRef<number>(60);
  const [fpsDisplay, setFpsDisplay] = useState<number>(60);

  // Core Sandbox State
  const [mapDetails, setMapDetails] = useState<MapDefinition | null>(null);
  const [selectedCatalogUnitId, setSelectedCatalogUnitId] = useState<string>('viper_interceptor');
  const selectedCatalogUnitIdRef = useRef<string>('viper_interceptor');
  const [spawnerFaction, setSpawnerFaction] = useState<'player' | 'enemy'>('player');
  const spawnerFactionRef = useRef<'player' | 'enemy'>('player');
  const [catalogSearch, setCatalogSearch] = useState<string>('');

  const [controlledUnitId, setControlledUnitId] = useState<string>('player-flagship');
  const controlledUnitIdRef = useRef<string>('player-flagship');
  const [selectedWorldUnitId, setSelectedWorldUnitId] = useState<string | null>(null);
  const selectedWorldUnitIdRef = useRef<string | null>(null);

  const [canvasMode, setCanvasMode] = useState<CanvasToolMode>('pilot');
  const canvasModeRef = useRef<CanvasToolMode>('pilot');
  const [isCameraLocked, setIsCameraLocked] = useState<boolean>(true);
  const [zoomPercent, setZoomPercent] = useState<number>(100);

  const [isSidebarVisible, setIsSidebarVisible] = useState<boolean>(true);
  const [simulationSpeed, setSimulationSpeed] = useState<number>(1.0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isBootstrapping, setIsBootstrapping] = useState<boolean>(true);

  // Studio Modal States
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(false);
  const [isDockingOpen, setIsDockingOpen] = useState<boolean>(false);
  const [isPilotOpen, setIsPilotOpen] = useState<boolean>(false);

  // Visual Debug Overlay Toggles
  const [debugFlags, setDebugFlags] = useState<DebugOverlayFlags>({
    showRanges: false,
    showVitals: true,
    showVelocity: false,
    showHitboxes: false,
  });
  const debugFlagsRef = useRef<DebugOverlayFlags>(debugFlags);

  // Shared PostgreSQL Template Store
  const { templates, templatesRef } = useUnitTemplates();

  // Binary WebSocket Hook
  const {
    state: socketState,
    tickMs,
    sendInput,
    sendTemplateOverride,
    sendUnitGrouping,
  } = useGameSocket(`${WS_BASE_URL}/ws?mode=sandbox`);

  // Keep refs synced with state for the 60fps loop
  useEffect(() => {
    controlledUnitIdRef.current = controlledUnitId;
    isInitialized.current = false;
  }, [controlledUnitId]);

  useEffect(() => {
    selectedWorldUnitIdRef.current = selectedWorldUnitId;
  }, [selectedWorldUnitId]);

  useEffect(() => {
    selectedCatalogUnitIdRef.current = selectedCatalogUnitId;
  }, [selectedCatalogUnitId]);

  useEffect(() => {
    spawnerFactionRef.current = spawnerFaction;
  }, [spawnerFaction]);

  useEffect(() => {
    canvasModeRef.current = canvasMode;
    if (canvasMode !== 'pilot') {
      isFiring.current = false;
    }
  }, [canvasMode]);

  useEffect(() => {
    isCameraLockedRef.current = isCameraLocked;
  }, [isCameraLocked]);

  useEffect(() => {
    debugFlagsRef.current = debugFlags;
  }, [debugFlags]);

  // Build data-driven catalog from PostgreSQL templates, enriched with optional UNIT_DB labels
  const catalogUnits = useMemo(() => {
    const dbMetaById = new Map(UNIT_DB.map((u) => [u.id, u]));
    const templateKeys = Object.keys(templates);
    const allIds = templateKeys.length > 0 ? templateKeys : UNIT_DB.map((u) => u.id);

    const items = allIds.map((id) => {
      const tmpl = templates[id];
      const meta = dbMetaById.get(id);
      return {
        id,
        name: meta?.name || formatUnitName(id),
        role: meta?.role || 'Combat Unit',
        weight: tmpl?.weightClass ?? meta?.weight ?? 1,
      };
    });

    items.sort((a, b) => a.weight - b.weight || a.name.localeCompare(b.name));
    return items;
  }, [templates]);

  const filteredCatalogUnits = useMemo(() => {
    const q = catalogSearch.trim().toLowerCase();
    if (!q) return catalogUnits;
    return catalogUnits.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
    );
  }, [catalogUnits, catalogSearch]);

  // Load map metadata & center camera
  useEffect(() => {
    if (!mapId) return;
    fetchMapDetail(mapId).then((data) => {
      if (data) {
        setMapDetails(data);
        const centerX = data.width / 2;
        const centerY = data.height / 2;
        cameraPos.current = { x: centerX, y: centerY };
        renderPos.current = { x: centerX, y: centerY };
      }
    });
  }, [mapId]);

  // Sync incoming socket state safely inside useEffect (never mutate React state during render)
  useEffect(() => {
    if (!socketState) return;
    serverState.current = socketState;

    if (isBootstrapping) {
      setIsBootstrapping(false);
    }

    if (socketState.units && socketState.units.length > 0) {
      const now = performance.now();
      serverHistoryRef.current.push({ timestamp: now, units: socketState.units });
      if (serverHistoryRef.current.length > 20) {
        serverHistoryRef.current.shift();
      }

      const activePlayerUnits = socketState.units.filter(
        (u) => u.ownerId === 'player' && !u.isDestroyed
      );
      const exists = activePlayerUnits.some((u) => u.id === controlledUnitIdRef.current);
      if (!exists && activePlayerUnits.length > 0) {
        const nextId = activePlayerUnits[0].id;
        controlledUnitIdRef.current = nextId;
        isInitialized.current = false;
        setControlledUnitId(nextId);
      }

      const controlledUnit = socketState.units.find((u) => u.id === controlledUnitIdRef.current);
      if (controlledUnit && !isInitialized.current) {
        renderPos.current = { x: controlledUnit.pos.x, y: controlledUnit.pos.y };
        isInitialized.current = true;
      }
    }
  }, [socketState, isBootstrapping]);

  // Dynamic ResizeObserver so canvas pixel dimensions always match container (eliminates aim/click drift)
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const syncSize = () => {
      const rect = container.getBoundingClientRect();
      const w = Math.max(1, Math.floor(rect.width));
      const h = Math.max(1, Math.floor(rect.height));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    };

    syncSize();
    const observer = new ResizeObserver(syncSize);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Update FPS display at 4Hz instead of 60Hz
  useEffect(() => {
    const id = setInterval(() => {
      setFpsDisplay(Math.round(fpsAvgRef.current));
    }, 250);
    return () => clearInterval(id);
  }, []);

  // Coordinate helper: canvas pixel -> world coordinate
  const canvasToWorld = (cx: number, cy: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: cameraPos.current.x, y: cameraPos.current.y };
    const z = zoomRef.current;
    return {
      x: (cx - canvas.width / 2) / z + cameraPos.current.x,
      y: (cy - canvas.height / 2) / z + cameraPos.current.y,
    };
  };

  const sendAction = (actionParams: any = {}) => {
    const canvas = canvasRef.current;
    if (!canvas || !serverState.current) return;

    const currentId = controlledUnitIdRef.current;
    const controlledUnit = serverState.current.units?.find((u) => u.id === currentId);
    let angle = controlledUnit?.angle || 0;

    if (controlledUnit) {
      const worldMouse = canvasToWorld(mouseCanvasPos.current.x, mouseCanvasPos.current.y);
      const dx = worldMouse.x - controlledUnit.pos.x;
      const dy = worldMouse.y - controlledUnit.pos.y;
      const distToCursor = Math.hypot(dx, dy);
      const DEADZONE_RADIUS = 35.0;

      if (distToCursor > DEADZONE_RADIUS) {
        angle = Math.atan2(dy, dx);
      }
    }

    sendInput({
      keys: keys.current,
      angle,
      isFiring: isFiring.current && !!controlledUnit && canvasModeRef.current === 'pilot',
      currentId,
      reset: actionParams.reset || false,
      sandboxCounts: actionParams.sandboxCounts,
      sandboxSpawn: actionParams.sandboxSpawn,
      sandboxSpawnOwner: actionParams.sandboxSpawnOwner,
      spawnX: actionParams.spawnX,
      spawnY: actionParams.spawnY,
      isPaused: actionParams.isPaused,
      timeScale: actionParams.timeScale,
    });
  };

  const handleTimeControl = (nextPaused: boolean, nextSpeed: number) => {
    setIsPaused(nextPaused);
    setSimulationSpeed(nextSpeed);
    sendInput({
      keys: keys.current,
      currentId: controlledUnitIdRef.current,
      isPaused: nextPaused,
      timeScale: nextSpeed,
    });
  };

  const updateUnitCount = (unitType: string, delta: number) => {
    if (!serverState.current) return;

    const sandboxCountsPayload = catalogUnits.map((u) => {
      const currentCount =
        serverState.current?.units?.filter(
          (unit) => unit.ownerId === spawnerFaction && unit.type === u.id && !unit.isDestroyed
        ).length || 0;

      const targetCount = u.id === unitType ? Math.max(0, currentCount + delta) : currentCount;
      return {
        unitType: u.id,
        count: targetCount,
        ownerId: spawnerFaction,
      };
    });

    sendInput({
      keys: keys.current,
      sandboxCounts: sandboxCountsPayload,
    });
  };

  const applyScenarioPreset = (preset: ScenarioPreset) => {
    // Zero out all existing units for both factions, then apply preset counts
    const presetMap = new Map<string, number>();
    preset.units.forEach((p) => presetMap.set(`${p.ownerId}_${p.unitType}`, p.count));

    const payload: Array<{ unitType: string; count: number; ownerId: string }> = [];
    (['player', 'enemy'] as const).forEach((faction) => {
      catalogUnits.forEach((u) => {
        const key = `${faction}_${u.id}`;
        const targetCount = presetMap.get(key) ?? 0;
        const existingCount =
          serverState.current?.units?.filter(
            (unit) => unit.ownerId === faction && unit.type === u.id && !unit.isDestroyed
          ).length || 0;

        if (targetCount > 0 || existingCount > 0) {
          payload.push({ unitType: u.id, count: targetCount, ownerId: faction });
        }
      });
    });

    sendInput({
      keys: keys.current,
      sandboxCounts: payload,
    });
  };

  const handleCanvasWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 0.89;
    const nextZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomRef.current * factor));
    zoomRef.current = nextZoom;
    setZoomPercent(Math.round(nextZoom * 100));
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    mouseCanvasPos.current = { x: cx, y: cy };

    // Middle-click: Free-cam drag pan
    if (e.button === 1) {
      e.preventDefault();
      isPanningRef.current = true;
      panLastMouseRef.current = { x: e.clientX, y: e.clientY };
      if (isCameraLockedRef.current) {
        isCameraLockedRef.current = false;
        setIsCameraLocked(false);
      }
      return;
    }

    if (e.button !== 0) return;

    const worldPos = canvasToWorld(cx, cy);

    // Click-to-Spawn Mode
    if (canvasModeRef.current === 'spawn') {
      sendInput({
        keys: keys.current,
        currentId: controlledUnitIdRef.current,
        sandboxSpawn: selectedCatalogUnitIdRef.current,
        sandboxSpawnOwner: spawnerFactionRef.current,
        spawnX: worldPos.x,
        spawnY: worldPos.y,
      });
      return;
    }

    // Click-to-Select Mode (or Shift+Click in Pilot Mode)
    if (canvasModeRef.current === 'select' || e.shiftKey) {
      const units = serverState.current?.units || [];
      let closest: SnapshotUnit | null = null;
      let bestDist = Infinity;

      for (const u of units) {
        if (u.isDestroyed) continue;
        const scale = UNIT_SCALES[u.type] || UNIT_SCALES.default;
        const hitRadius = Math.max(scale.w, scale.h) * 0.6;
        const d = Math.hypot(u.pos.x - worldPos.x, u.pos.y - worldPos.y);
        if (d <= hitRadius && d < bestDist) {
          bestDist = d;
          closest = u;
        }
      }

      if (closest) {
        setSelectedWorldUnitId(closest.id);
        setSelectedCatalogUnitId(closest.type);
        if (closest.ownerId === 'player') {
          setControlledUnitId(closest.id);
        }
        setIsInspectorOpen(true);
        setIsPilotOpen(false);
        setIsDockingOpen(false);
        setIsSidebarVisible(true);
      } else {
        setSelectedWorldUnitId(null);
      }
      return;
    }

    // Pilot Mode: Fire weapons
    isFiring.current = true;
    sendAction();
  };

  // Input listeners & 60fps Canvas Render Loop
  useEffect(() => {
    const isTypingInInput = (target: EventTarget | null): boolean => {
      const el = target as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingInInput(e.target)) return;
      const k = e.key.toLowerCase();
      keys.current[k] = true;
      if (!e.repeat) sendAction();
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (isTypingInInput(e.target)) return;
      const k = e.key.toLowerCase();
      keys.current[k] = false;
      sendAction();
    };

    const onMouseMove = (e: MouseEvent) => {
      if (isPanningRef.current) {
        const dx = e.clientX - panLastMouseRef.current.x;
        const dy = e.clientY - panLastMouseRef.current.y;
        panLastMouseRef.current = { x: e.clientX, y: e.clientY };
        cameraPos.current.x -= dx / zoomRef.current;
        cameraPos.current.y -= dy / zoomRef.current;
        return;
      }

      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        mouseCanvasPos.current = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        };
        mouseDirtyRef.current = true;
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 1) {
        isPanningRef.current = false;
      }
      if (e.button === 0 && isFiring.current) {
        isFiring.current = false;
        sendAction();
      }
    };

    const onBlur = () => {
      keys.current = {};
      isFiring.current = false;
      isPanningRef.current = false;
      sendAction();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('blur', onBlur);

    let animId: number;
    let lastTime = performance.now();
    let lastInputSendTime = 0;

    const render = (currentTime: number) => {
      const rawDt = (currentTime - lastTime) / 1000;
      const dt = Math.min(Math.max(rawDt, 0.001), 0.1);
      lastTime = currentTime;

      // Rolling client FPS average
      if (rawDt > 0 && rawDt < 0.5) {
        const instantFps = 1 / rawDt;
        fpsAvgRef.current = fpsAvgRef.current * 0.92 + instantFps * 0.08;
      }

      // Throttled mouse/aim sync (~60Hz max, only when mouse moved or firing)
      if (
        (mouseDirtyRef.current || isFiring.current) &&
        canvasModeRef.current === 'pilot' &&
        currentTime - lastInputSendTime >= 16
      ) {
        mouseDirtyRef.current = false;
        lastInputSendTime = currentTime;
        sendAction();
      }

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      const radarCanvas = radarCanvasRef.current;
      const radarCtx = radarCanvas?.getContext('2d');

      if (!ctx || !canvas) {
        animId = requestAnimationFrame(render);
        return;
      }

      ctx.fillStyle = '#050811';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (serverState.current) {
        const liveUnits = serverState.current.units || [];
        const liveUnitMap = new Map<string, SnapshotUnit>(liveUnits.map((u) => [u.id, u]));

        const activePlayerUnits = liveUnits.filter((u) => u.ownerId === 'player' && !u.isDestroyed);
        const activeId = activePlayerUnits.some((u) => u.id === controlledUnitIdRef.current)
          ? controlledUnitIdRef.current
          : activePlayerUnits[0]?.id || controlledUnitIdRef.current;

        const controlledUnit = liveUnitMap.get(activeId);
        if (controlledUnit) {
          if (!isInitialized.current) {
            renderPos.current = { x: controlledUnit.pos.x, y: controlledUnit.pos.y };
            isInitialized.current = true;
          }

          const lerpRate = 1.0 - Math.pow(0.0001, dt);
          renderPos.current.x += (controlledUnit.pos.x - renderPos.current.x) * lerpRate;
          renderPos.current.y += (controlledUnit.pos.y - renderPos.current.y) * lerpRate;

          if (isCameraLockedRef.current) {
            const worldMouse = canvasToWorld(mouseCanvasPos.current.x, mouseCanvasPos.current.y);
            const dx = worldMouse.x - renderPos.current.x;
            const dy = worldMouse.y - renderPos.current.y;
            const dist = Math.hypot(dx, dy);

            let targetCamX = renderPos.current.x;
            let targetCamY = renderPos.current.y;

            if (keys.current['w'] && dist > 1) {
              const lookAheadRatio = 0.45;
              targetCamX += (dx / dist) * Math.min(dist * lookAheadRatio, (canvas.width * 0.35) / zoomRef.current);
              targetCamY += (dy / dist) * Math.min(dist * lookAheadRatio, (canvas.height * 0.35) / zoomRef.current);
            } else if (canvasModeRef.current === 'pilot') {
              targetCamX += ((mouseCanvasPos.current.x - canvas.width / 2) * 0.15) / zoomRef.current;
              targetCamY += ((mouseCanvasPos.current.y - canvas.height / 2) * 0.15) / zoomRef.current;
            }

            const camBaseFactor = keys.current['w'] ? 18.0 : 8.0;
            const camLerpFactor = 1.0 - Math.exp(-camBaseFactor * dt);
            cameraPos.current.x += (targetCamX - cameraPos.current.x) * camLerpFactor;
            cameraPos.current.y += (targetCamY - cameraPos.current.y) * camLerpFactor;
          }
        }

        const mapW = mapDetails?.width ?? serverState.current?.mapBounds?.width ?? 0;
        const mapH = mapDetails?.height ?? serverState.current?.mapBounds?.height ?? 0;

        if (mapW === 0 || mapH === 0) {
          animId = requestAnimationFrame(render);
          return;
        }

        const z = zoomRef.current;

        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.scale(z, z);
        ctx.translate(-cameraPos.current.x, -cameraPos.current.y);

        // World grid
        ctx.strokeStyle = 'rgba(0, 243, 255, 0.05)';
        ctx.lineWidth = 1 / z;
        ctx.beginPath();
        for (let i = 0; i <= mapW; i += GRID_SPACING) {
          ctx.moveTo(i, 0);
          ctx.lineTo(i, mapH);
        }
        for (let i = 0; i <= mapH; i += GRID_SPACING) {
          ctx.moveTo(0, i);
          ctx.lineTo(mapW, i);
        }
        ctx.stroke();

        // Map boundary
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 4 / z;
        ctx.strokeRect(0, 0, mapW, mapH);

        // Environmental structures
        if (mapDetails?.structures) {
          mapDetails.structures.forEach((s) => {
            ctx.save();
            ctx.translate(s.posX, s.posY);
            renderEnvironmentVector(ctx, s.structureType, s.radius);
            ctx.restore();
          });
        }

        // Interpolated units merged with latest telemetry fields
        const interpolatedUnits = getInterpolatedUnits(serverHistoryRef.current, currentTime);
        const unitsToDraw = interpolatedUnits && interpolatedUnits.length > 0 ? interpolatedUnits : liveUnits;

        unitsToDraw.forEach((u: any) => {
          const latest = liveUnitMap.get(u.id);
          const mergedUnit = latest ? { ...latest, pos: u.pos, angle: u.angle } : u;

          const isControlled = mergedUnit.id === activeId;
          const rx = isControlled ? renderPos.current.x : mergedUnit.pos.x;
          const ry = isControlled ? renderPos.current.y : mergedUnit.pos.y;
          const isAccelerating = isControlled && !!keys.current['w'];

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

          drawUnitDebugOverlays(
            ctx,
            mergedUnit,
            rx,
            ry,
            templatesRef.current[mergedUnit.type],
            debugFlagsRef.current,
            isControlled,
            mergedUnit.id === selectedWorldUnitIdRef.current
          );
        });

        // Projectiles
        (serverState.current.projectiles || []).forEach((p) => {
          drawProjectile(ctx, p.pos.x, p.pos.y, p.vel.x, p.vel.y, p.type);
        });

        // Click-to-Spawn Ghost Preview
        if (canvasModeRef.current === 'spawn') {
          const worldMouse = canvasToWorld(mouseCanvasPos.current.x, mouseCanvasPos.current.y);
          drawSpawnGhost(
            ctx,
            worldMouse.x,
            worldMouse.y,
            selectedCatalogUnitIdRef.current,
            spawnerFactionRef.current
          );
        }

        ctx.restore();

        // Piloted ship HUD diagnostics
        if (controlledUnit) {
          drawHUDDiagnostics(ctx, controlledUnit.shields, controlledUnit.hull);
        }

        // Tactical Radar Minimap
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

          const isVisibleToPlayer = (x: number, y: number): boolean => {
            for (const u of liveUnits) {
              if (u.ownerId === 'player' && !u.isDestroyed) {
                const tmpl = templatesRef.current[u.type];
                const sensorRange = tmpl?.sensorRange ?? 0;
                if (Math.hypot(u.pos.x - x, u.pos.y - y) <= sensorRange) {
                  return true;
                }
              }
            }
            return false;
          };

          // 1. Recon Probe sensor bubbles
          liveUnits.forEach((u) => {
            if (u.isDestroyed || u.ownerId !== 'player' || u.type !== 'recon_probe') return;
            const rx = (u.id === activeId ? renderPos.current.x : u.pos.x) * scaleX;
            const ry = (u.id === activeId ? renderPos.current.y : u.pos.y) * scaleY;
            const probeSensorRange = templatesRef.current[u.type]?.sensorRange ?? 0;
            const radiusPixels = probeSensorRange * scaleX;

            radarCtx.beginPath();
            radarCtx.arc(rx, ry, radiusPixels, 0, Math.PI * 2);
            radarCtx.fillStyle = 'rgba(0, 243, 255, 0.04)';
            radarCtx.fill();
            radarCtx.strokeStyle = 'rgba(0, 243, 255, 0.25)';
            radarCtx.lineWidth = 0.75;
            radarCtx.stroke();
          });

          // 2. Detected environmental structures
          if (mapDetails?.structures) {
            mapDetails.structures.forEach((s) => {
              if (!isVisibleToPlayer(s.posX, s.posY)) return;
              const rx = s.posX * scaleX;
              const ry = s.posY * scaleY;
              const rr = Math.max(2, s.radius * scaleX);
              radarCtx.fillStyle =
                s.structureType === 'gas_giant'
                  ? 'rgba(100, 150, 255, 0.2)'
                  : 'rgba(168, 85, 247, 0.5)';
              radarCtx.strokeStyle = 'rgba(168, 85, 247, 0.8)';
              radarCtx.lineWidth = 1;
              radarCtx.beginPath();
              radarCtx.arc(rx, ry, rr, 0, Math.PI * 2);
              radarCtx.fill();
              radarCtx.stroke();
            });
          }

          // 3. Units by data-driven weight class
          liveUnits.forEach((u) => {
            if (u.isDestroyed) return;
            if (u.ownerId !== 'player' && !isVisibleToPlayer(u.pos.x, u.pos.y)) return;

            const isControlled = u.id === activeId;
            const rx = (isControlled ? renderPos.current.x : u.pos.x) * scaleX;
            const ry = (isControlled ? renderPos.current.y : u.pos.y) * scaleY;
            const weight = templatesRef.current[u.type]?.weightClass ?? 1;

            const baseColor = isControlled
              ? '#38bdf8'
              : u.ownerId === 'player'
              ? '#22c55e'
              : '#ef4444';
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

          // 4. Camera viewport box on radar
          const viewW = (canvas.width / z) * scaleX;
          const viewH = (canvas.height / z) * scaleY;
          const viewX = cameraPos.current.x * scaleX - viewW / 2;
          const viewY = cameraPos.current.y * scaleY - viewH / 2;
          radarCtx.strokeStyle = 'rgba(251, 191, 36, 0.55)';
          radarCtx.lineWidth = 1;
          radarCtx.strokeRect(viewX, viewY, viewW, viewH);
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
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [mapDetails, templatesRef]);

  const allUnits = socketState?.units || [];
  const playerUnits = allUnits
    .filter((u) => u.ownerId === 'player' && !u.isDestroyed)
    .sort((a, b) => {
      if (a.id === 'player-flagship') return -1;
      if (b.id === 'player-flagship') return 1;
      return a.id.localeCompare(b.id);
    });
  const enemyCount = allUnits.filter((u) => u.ownerId !== 'player' && !u.isDestroyed).length;
  const projectileCount = socketState?.projectiles?.length || 0;
  const hasCommandShip = playerUnits.some((u) => u.type === 'battalion_command_ship');

  const toggleDebugFlag = (flag: keyof DebugOverlayFlags) => {
    setDebugFlags((prev) => ({ ...prev, [flag]: !prev[flag] }));
  };

  return (
    <div
      className="fixed inset-0 w-screen h-screen overflow-hidden bg-[#0b0e14] text-slate-100 flex flex-col p-2 gap-2 font-mono select-none"
      onContextMenu={(e) => {
        e.preventDefault();
        setIsSidebarVisible((prev) => !prev);
      }}
    >
      {/* TOP HEADER BAR */}
      <header
        className="ui-interactive bg-[#0f1115] border border-slate-800/80 rounded-xl px-3 py-2 flex items-center justify-between shadow-lg shrink-0 gap-3 z-50"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black text-xs">
            🧪
          </div>
          <div>
            <h1 className="text-xs font-black tracking-tight text-white uppercase leading-tight">
              Practice Sandbox
            </h1>
            <p className="text-[9px] font-bold text-slate-400 tracking-wider uppercase">
              {mapDetails?.name || 'Sector 01 — Combat Lab'}
            </p>
          </div>
        </div>

        {/* REAL SERVER TIME CONTROLS */}
        <div className="flex items-center gap-1.5 bg-[#161922] p-1 rounded-lg border border-slate-800 shrink-0">
          <span className="text-[9px] font-black text-slate-400 px-1 uppercase">Time:</span>
          {[0.25, 0.5, 1.0, 2.0].map((speed) => (
            <button
              key={speed}
              onClick={() => handleTimeControl(false, speed)}
              className={`px-2 py-0.5 rounded text-[10px] font-black uppercase transition-all ${
                !isPaused && simulationSpeed === speed
                  ? 'bg-cyan-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {speed}x
            </button>
          ))}
          <button
            onClick={() => handleTimeControl(!isPaused, simulationSpeed)}
            className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase transition-all ${
              isPaused
                ? 'bg-red-500 text-white animate-pulse'
                : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            {isPaused ? 'PAUSED' : 'PAUSE'}
          </button>
        </div>

        {/* LIVE MEASURED TELEMETRY */}
        <div className="flex items-center gap-3 bg-[#161922] px-3 py-1 rounded-lg border border-slate-800 shrink-0">
          <span className="text-[9px] font-bold text-slate-400">
            FPS: <strong className="text-cyan-400">{fpsDisplay}</strong>
          </span>
          <span className="text-[9px] font-bold text-slate-400">
            Tick: <strong className="text-amber-400">{tickMs.toFixed(1)}ms</strong>
          </span>
          <span className="text-[9px] font-bold text-slate-400">
            Units:{' '}
            <strong className="text-green-400">{playerUnits.length}</strong>
            <span className="text-slate-600 mx-0.5">/</span>
            <strong className="text-red-400">{enemyCount}</strong>
          </span>
          <span className="text-[9px] font-bold text-slate-400">
            Proj: <strong className="text-white">{projectileCount}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onNavigateHome && (
            <button
              onClick={onNavigateHome}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase transition-all"
            >
              Menu
            </button>
          )}
          <button
            onClick={onNavigateGarage}
            className="bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 px-3 py-1 rounded-lg font-black text-[10px] uppercase transition-all"
          >
            Garage
          </button>
          <button
            onClick={onLogout}
            className="bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase transition-all"
          >
            ✕
          </button>
        </div>
      </header>

      {/* MAIN CANVAS STAGE */}
      <div
        ref={containerRef}
        className="relative flex-1 w-full h-full rounded-xl overflow-hidden bg-[#050811] border border-slate-800/80 shadow-2xl"
      >
        {isBootstrapping && (
          <LoadingIndicator message="ESTABLISHING SECURE HANGAR LINK & INITIALIZING SANDBOX..." />
        )}

        <canvas
          ref={canvasRef}
          onWheel={handleCanvasWheel}
          onMouseDown={handleCanvasMouseDown}
          className={`w-full h-full block ${
            canvasMode === 'spawn'
              ? 'cursor-cell'
              : canvasMode === 'select'
              ? 'cursor-pointer'
              : 'cursor-crosshair'
          }`}
        />

        {/* FLOATING CANVAS TOOL & DEBUG OVERLAY BAR (TOP RIGHT) */}
        <div
          className="ui-interactive absolute top-3 right-3 flex flex-wrap items-center gap-1.5 bg-[#0f1115]/90 border border-slate-800 rounded-xl px-2.5 py-1.5 z-40 backdrop-blur-md shadow-xl"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Interaction Mode */}
          <div className="flex items-center gap-1 pr-2 border-r border-slate-800">
            {(
              [
                { id: 'pilot', label: 'Pilot' },
                { id: 'spawn', label: 'Click-Spawn' },
                { id: 'select', label: 'Pick/Inspect' },
              ] as const
            ).map((mode) => (
              <button
                key={mode.id}
                onClick={() => setCanvasMode(mode.id)}
                className={`px-2 py-0.5 rounded text-[9px] font-black uppercase transition-all ${
                  canvasMode === mode.id
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-slate-800/80 text-slate-300 hover:text-white'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>

          {/* Debug Overlay Toggles */}
          <div className="flex items-center gap-1 pr-2 border-r border-slate-800">
            {(
              [
                { key: 'showRanges', label: 'Ranges' },
                { key: 'showVitals', label: 'Vitals/AI' },
                { key: 'showVelocity', label: 'Vel' },
                { key: 'showHitboxes', label: 'Box' },
              ] as const
            ).map((item) => (
              <button
                key={item.key}
                onClick={() => toggleDebugFlag(item.key)}
                className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase transition-all border ${
                  debugFlags[item.key]
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                    : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Camera Lock & Zoom */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsCameraLocked((prev) => !prev)}
              title="Toggle camera follow (Middle-click drag pans freely)"
              className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase transition-all border ${
                isCameraLocked
                  ? 'bg-green-500/20 text-green-300 border-green-500/40'
                  : 'bg-slate-900 text-amber-300 border-amber-500/40'
              }`}
            >
              {isCameraLocked ? 'Cam: Lock' : 'Cam: Free'}
            </button>
            <button
              onClick={() => {
                zoomRef.current = 1.0;
                setZoomPercent(100);
              }}
              title="Reset zoom to 100% (Mouse wheel zooms)"
              className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-900 text-slate-300 border border-slate-800 hover:text-white"
            >
              {zoomPercent}%
            </button>
          </div>
        </div>

        {/* TACTICAL RADAR MINIMAP */}
        <div
          className="ui-interactive absolute bottom-4 right-4 w-[180px] h-[180px] bg-[#0f1115]/90 border border-amber-500/40 rounded-lg overflow-hidden shadow-2xl z-40 backdrop-blur-md"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="absolute top-1 left-2 text-[8px] font-black text-amber-400 uppercase tracking-widest pointer-events-none z-10">
            Tactical Radar
          </div>
          <canvas ref={radarCanvasRef} width={180} height={180} className="block w-full h-full" />
        </div>

        {!isSidebarVisible && (
          <div className="absolute top-4 left-4 bg-[#0f1115]/90 border border-slate-800 px-3 py-1.5 rounded-lg text-[9px] font-bold text-cyan-400 uppercase tracking-widest pointer-events-none z-40 shadow-lg">
            [Right-Click Anywhere to Open Sandbox Catalog]
          </div>
        )}

        {/* SANDBOX SIDEBAR */}
        {isSidebarVisible && (
          <div
            className="ui-interactive absolute top-4 left-4 w-80 h-[calc(100%-32px)] bg-[#0f1115]/95 border border-slate-800 rounded-xl p-3 z-50 flex flex-col shadow-2xl backdrop-blur-md"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-2 shrink-0">
              <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider">
                🧪 Unit Testing Sandbox
              </span>
              <button
                onClick={() => setIsSidebarVisible(false)}
                className="text-[9px] font-bold text-slate-400 hover:text-white"
              >
                [CLOSE]
              </button>
            </div>

            {/* Studio Modal Triggers */}
            <div className="flex flex-col gap-1.5 mb-2 shrink-0">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-black uppercase tracking-widest text-amber-400">
                  Studio Panels
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setIsPilotOpen((prev) => !prev);
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
                    {isPilotOpen ? 'Close Pilots' : 'Pilots 🚀'}
                  </button>
                  <button
                    onClick={() => {
                      setIsDockingOpen((prev) => !prev);
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
                    {isDockingOpen ? 'Close Docking' : 'Docking ⚓'}
                  </button>
                  <button
                    onClick={() => {
                      setIsInspectorOpen((prev) => !prev);
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
                    {isInspectorOpen ? 'Close Specs' : 'Inspector ⚙️'}
                  </button>
                </div>
              </div>

              {/* Scenario Presets */}
              <div className="flex items-center gap-1">
                {SCENARIO_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => applyScenarioPreset(preset)}
                    title={preset.description}
                    className="flex-1 bg-[#161922] hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-300 py-1 rounded text-[8px] font-black uppercase transition-all"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Faction Spawner Selector */}
              <div className="flex items-center justify-between bg-[#161922] p-1 rounded-lg border border-slate-800">
                <span className="text-[8px] font-black uppercase text-slate-400 px-1">
                  Spawn Faction:
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setSpawnerFaction('player')}
                    className={`px-2.5 py-0.5 rounded text-[8px] font-black uppercase transition-all ${
                      spawnerFaction === 'player'
                        ? 'bg-green-500 text-slate-950 shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Player 🟢
                  </button>
                  <button
                    onClick={() => setSpawnerFaction('enemy')}
                    className={`px-2.5 py-0.5 rounded text-[8px] font-black uppercase transition-all ${
                      spawnerFaction === 'enemy'
                        ? 'bg-red-500 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Enemy 🔴
                  </button>
                </div>
              </div>

              {/* Quick Search Filter */}
              <input
                type="text"
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                placeholder="Filter units by name or role..."
                className="w-full bg-[#0b0e14] border border-slate-800 focus:border-cyan-500/60 rounded-lg px-2.5 py-1 text-[10px] text-slate-200 placeholder-slate-500 outline-none"
              />
            </div>

            <div className="flex justify-between items-center mb-1 shrink-0 gap-1">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                Catalog ({spawnerFaction.toUpperCase()})
              </span>
              <span className="text-[8px] text-slate-500">
                {canvasMode === 'spawn' ? 'Click canvas to place' : 'Click unit to inspect'}
              </span>
            </div>

            {/* Data-Driven Unit Catalog List */}
            <div className="flex-1 flex flex-col gap-1 overflow-y-auto pr-1 mb-3">
              {filteredCatalogUnits.map((unit) => {
                const isSelected = selectedCatalogUnitId === unit.id;
                const unitCount = allUnits.filter(
                  (u) => u.ownerId === spawnerFaction && u.type === unit.id && !u.isDestroyed
                ).length;

                return (
                  <div
                    key={unit.id}
                    onClick={() => setSelectedCatalogUnitId(unit.id)}
                    className={`p-2 rounded-lg border transition-all flex items-center justify-between cursor-pointer shrink-0 ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-400 text-white shadow-md'
                        : 'bg-[#161922] border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex flex-col">
                      <div className="text-[10px] font-bold">{unit.name}</div>
                      <div className="text-[8px] text-slate-400">
                        {unit.role} | {unit.weight}W
                      </div>
                    </div>

                    <div
                      className="flex items-center gap-1.5 bg-[#0b0e14] px-1.5 py-1 rounded-md border border-slate-800"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => updateUnitCount(unit.id, -1)}
                        className="w-5 h-5 bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 rounded flex items-center justify-center font-black text-[10px] transition-all"
                      >
                        -
                      </button>
                      <span className="w-5 text-center text-[10px] font-black text-amber-400">
                        {unitCount}
                      </span>
                      <button
                        onClick={() => updateUnitCount(unit.id, 1)}
                        className="w-5 h-5 bg-slate-800 hover:bg-amber-500/20 text-slate-300 hover:text-amber-400 rounded flex items-center justify-center font-black text-[10px] transition-all"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col gap-2 shrink-0 pt-2 border-t border-slate-800">
              <button
                onClick={() => {
                  setIsBootstrapping(true);
                  setIsPaused(false);
                  setSimulationSpeed(1.0);
                  sendAction({ reset: true, isPaused: false, timeScale: 1.0 });
                }}
                className="w-full bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 font-black py-2 rounded-lg text-[10px] uppercase tracking-widest transition-all"
              >
                Reset Sandbox
              </button>
            </div>
          </div>
        )}

        {/* PILOT SWITCHER STUDIO MODAL */}
        <PilotSwitcherModal
          isOpen={isSidebarVisible && isPilotOpen}
          onClose={() => setIsPilotOpen(false)}
          playerUnits={playerUnits.map((u) => ({
            id: u.id,
            type: u.type,
            squadId: u.squadId || 0,
            battalionId: u.battalionId || 0,
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
          spawnedUnits={playerUnits.map((u) => ({
            id: u.id,
            type: u.type,
            squadId: u.squadId || 0,
            battalionId: u.battalionId || 0,
            isLeader: u.isSquadLeader || false,
          }))}
          onAssignUnitToSquad={(unitId, squadId, battalionId, isLeader) => {
            sendUnitGrouping({
              unitId,
              squadId,
              battalionId,
              isSquadLeader: isLeader || false,
            });
          }}
        />
      </div>
    </div>
  );
};

export default PracticeViewport;
