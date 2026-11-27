// src/components/sandbox/PracticeViewport.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useGameSocket } from '../../hooks/useGameSockets';
import { useUnitTemplates } from '../../hooks/useUnitTemplates';
import { useFlightControls } from '../../hooks/useFlightControls';
import { DebugOverlayFlags, UNIT_SCALES } from '../../renderer/vectorAssets';
import { Canvas2DRenderer } from '../../renderer/canvas2dRenderer';
import { getUnitSpriteSize } from '../../renderer/spriteRegistry';
import { hitTestUnits } from '../../renderer/viewportCamera';
import type {
  RenderGhostSprite,
  RenderProjectile,
  RenderUnit,
  RenderUnitBar,
  RenderUnitLabel,
  RenderUnitRangeCircle,
  ViewportFrameState,
  ViewportRenderer,
} from '../../renderer/viewportRenderer';
import { drawEnvObjectsOnRadar } from '../../utils/envRenderer';
import { getInterpolatedUnits } from '../../renderer/interpolation';
import { SnapshotUnit, ServerStateSnapshot } from '../../parsers/binaryCodec';
import { UNIT_DB } from '../garage/GarageDashboard';
import { WS_BASE_URL } from '../../config';
import { fetchMapDetail, MapDefinition } from '../../services/mapService';
import { LoadingIndicator } from '../common/LoadingIndicator';
import { TacticalRadar } from '../common/TacticalRadar';
import { ViewportTopBar } from '../viewport/ViewportTopBar';
import { CanvasToolMode } from '../viewport/CanvasToolBar';
import { SandboxCommandMenu, SandboxMenuTab } from './SandboxCommandMenu';
import {
  GRID_SPACING,
  MIN_ZOOM,
  MAX_ZOOM,
  ScenarioPreset,
  formatUnitName,
} from './constants';

interface PracticeViewportProps {
  mapId?: number;
  onNavigateGarage: () => void;
  onLogout: () => void;
  onNavigateHome?: () => void;
}

const RADAR_REDRAW_INTERVAL_MS = 80; // ~12Hz 2D radar redraw

const lerpAngleShort = (from: number, to: number, t: number): number => {
  const twoPi = Math.PI * 2;
  let diff = (to - from) % twoPi;
  if (diff > Math.PI) diff -= twoPi;
  if (diff < -Math.PI) diff += twoPi;
  return from + diff * t;
};

const pickFallbackPlayerUnit = (units: SnapshotUnit[]): SnapshotUnit | undefined => {
  let best: SnapshotUnit | undefined;
  for (let i = 0; i < units.length; i++) {
    const u = units[i];
    if (u.ownerId !== 'player' || u.isDestroyed) continue;
    if (
      !best ||
      u.id === 'player-flagship' ||
      (best.id !== 'player-flagship' && u.id < best.id)
    ) {
      best = u;
    }
  }
  return best;
};

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
  const mapDetailsRef = useRef<MapDefinition | null>(null);

  // Camera, Zoom & Pan Refs
  const cameraPos = useRef({ x: 6000, y: 6000 });
  const renderPos = useRef({ x: 6000, y: 6000 });
  const renderAngle = useRef<number>(0);
  const zoomRef = useRef<number>(1.0);
  const isCameraLockedRef = useRef<boolean>(true);
  const isPanningRef = useRef<boolean>(false);
  const panLastMouseRef = useRef({ x: 0, y: 0 });
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

  const [controlledUnitId, setControlledUnitId] = useState<string>('');
  const controlledUnitIdRef = useRef<string>('');
  const [selectedWorldUnitId, setSelectedWorldUnitId] = useState<string | null>(null);
  const selectedWorldUnitIdRef = useRef<string | null>(null);

  const [canvasMode, setCanvasMode] = useState<CanvasToolMode>('pilot');
  const canvasModeRef = useRef<CanvasToolMode>('pilot');
  const [isCameraLocked, setIsCameraLocked] = useState<boolean>(true);
  const [zoomPercent, setZoomPercent] = useState<number>(100);

  // Single Unified Right-Click Menu State
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const isMenuOpenRef = useRef<boolean>(false);
  const [activeMenuTab, setActiveMenuTab] = useState<SandboxMenuTab>('battlefield');

  const [simulationSpeed, setSimulationSpeed] = useState<number>(1.0);
  const simulationSpeedRef = useRef<number>(1.0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const isPausedRef = useRef<boolean>(false);
  const [isBootstrapping, setIsBootstrapping] = useState<boolean>(true);
  const isBootstrappingRef = useRef<boolean>(true);

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

  // Decoupled Binary WebSocket Hook (5Hz React UI state + per-frame coalesced decode)
  const {
    state: uiSocketState,
    consumeLatestSnapshot,
    tickMs,
    sendInput,
    sendTemplateOverride,
    sendUnitGrouping,
  } = useGameSocket(`${WS_BASE_URL}/ws?mapId=${mapId}`);

  useEffect(() => {
    if (controlledUnitIdRef.current !== controlledUnitId) {
      controlledUnitIdRef.current = controlledUnitId;
      isInitialized.current = false;
    }
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
  }, [canvasMode]);

  const {
    keysRef,
    mouseCanvasPosRef,
    canvasToWorld,
    tickFlightInput,
    sendImmediate,
  } = useFlightControls({
    canvasRef,
    cameraPosRef: cameraPos,
    zoomRef,
    canControl: canvasMode === 'pilot',
    resolvePilotedUnit: (units) => {
      const controlled = controlledUnitIdRef.current
        ? units.find(
            (u) => u.id === controlledUnitIdRef.current && u.ownerId === 'player' && !u.isDestroyed
          )
        : undefined;
      return controlled || pickFallbackPlayerUnit(units);
    },
    onSendInput: sendInput,
    onCustomKeyDown: (e) => {
      if (e.key === 'Escape' && isMenuOpenRef.current) {
        setIsMenuOpen(false);
        return true;
      }
      if (!e.repeat && isMenuOpenRef.current) {
        if (e.key === '1') {
          setActiveMenuTab('battlefield');
          return true;
        }
        if (e.key === '2') {
          setActiveMenuTab('specs');
          return true;
        }
        if (e.key === '3') {
          setActiveMenuTab('fleet');
          return true;
        }
      }
      if (!e.repeat && e.key.toLowerCase() === 'p') {
        handleTimeControl(!isPausedRef.current, simulationSpeedRef.current);
        return true;
      }
      return false;
    },
  });

  useEffect(() => {
    isCameraLockedRef.current = isCameraLocked;
  }, [isCameraLocked]);

  useEffect(() => {
    debugFlagsRef.current = debugFlags;
  }, [debugFlags]);

  useEffect(() => {
    isMenuOpenRef.current = isMenuOpen;
  }, [isMenuOpen]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    simulationSpeedRef.current = simulationSpeed;
  }, [simulationSpeed]);

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

  useEffect(() => {
    if (!mapId) return;
    let active = true;
    fetchMapDetail(mapId)
      .then((data) => {
        if (!active || !data) return;
        mapDetailsRef.current = data;
        setMapDetails(data);
        if (!isInitialized.current) {
          const centerX = data.width / 2;
          const centerY = data.height / 2;
          cameraPos.current = { x: centerX, y: centerY };
          renderPos.current = { x: centerX, y: centerY };
        }
      })
      .catch((err) => {
        console.warn('Sandbox map detail fetch failed:', err);
      });
    return () => {
      active = false;
    };
  }, [mapId]);

  useEffect(() => {
    const id = setInterval(() => {
      const nextFps = Math.round(fpsAvgRef.current);
      setFpsDisplay((prev) => (prev === nextFps ? prev : nextFps));
    }, 250);
    return () => clearInterval(id);
  }, []);

  const handleTimeControl = (nextPaused: boolean, nextSpeed: number) => {
    setIsPaused(nextPaused);
    setSimulationSpeed(nextSpeed);
    sendInput({
      keys: keysRef.current,
      currentId: controlledUnitIdRef.current,
      isPaused: nextPaused,
      timeScale: nextSpeed,
    });
  };

  const handleResetSandbox = () => {
    serverHistoryRef.current = [];
    isInitialized.current = false;
    controlledUnitIdRef.current = '';
    setControlledUnitId('');
    setSelectedWorldUnitId(null);
    setIsPaused(false);
    setSimulationSpeed(1.0);
    sendImmediate(serverState.current?.units || [], {
      reset: true,
      isPaused: false,
      timeScale: 1.0,
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
      keys: keysRef.current,
      sandboxCounts: sandboxCountsPayload,
    });
  };

  const applyScenarioPreset = (preset: ScenarioPreset) => {
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
      keys: keysRef.current,
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
    mouseCanvasPosRef.current = { x: cx, y: cy };

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

    if (canvasModeRef.current === 'spawn') {
      sendInput({
        keys: keysRef.current,
        currentId: controlledUnitIdRef.current,
        sandboxSpawn: selectedCatalogUnitIdRef.current,
        sandboxSpawnOwner: spawnerFactionRef.current,
        spawnX: worldPos.x,
        spawnY: worldPos.y,
      });
      return;
    }

    if (canvasModeRef.current === 'select' || e.shiftKey) {
      const units = serverState.current?.units || [];
      const closest = hitTestUnits(worldPos.x, worldPos.y, units, (u) => {
        const scale = UNIT_SCALES[u.type] || UNIT_SCALES.default;
        return Math.max(scale.w, scale.h) * 0.6;
      });

      if (closest) {
        setSelectedWorldUnitId(closest.id);
        setSelectedCatalogUnitId(closest.type);
        if (closest.ownerId === 'player') {
          setControlledUnitId(closest.id);
        }
        setActiveMenuTab('specs');
        setIsMenuOpen(true);
      } else {
        setSelectedWorldUnitId(null);
      }
    }
  };

  // Swappable ViewportRenderer (Canvas2DRenderer) — Single 60Hz rAF loop, zero WebGL context loss
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const onPanMouseMove = (e: MouseEvent) => {
      if (!isPanningRef.current) return;
      const dx = e.clientX - panLastMouseRef.current.x;
      const dy = e.clientY - panLastMouseRef.current.y;
      panLastMouseRef.current = { x: e.clientX, y: e.clientY };
      cameraPos.current.x -= dx / zoomRef.current;
      cameraPos.current.y -= dy / zoomRef.current;
    };

    const onPanMouseUp = (e: MouseEvent) => {
      if (e.button === 1) isPanningRef.current = false;
    };

    const onPanBlur = () => {
      isPanningRef.current = false;
    };

    window.addEventListener('mousemove', onPanMouseMove);
    window.addEventListener('mouseup', onPanMouseUp);
    window.addEventListener('blur', onPanBlur);

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

    // Preallocated scratch map
    const liveUnitMap = new Map<string, SnapshotUnit>();

    let lastRadarDrawMs = 0;
    let lastTime = performance.now();
    let lastSnapTime = lastTime;
    let lastErrLogMs = 0;

    const renderLoop = () => {
      if (destroyed) return;
      rafId = requestAnimationFrame(renderLoop);

      try {
        const currentTime = performance.now();
        const rawDt = (currentTime - lastTime) / 1000;
        const dt = Math.min(Math.max(rawDt, 0.001), 0.1);
        lastTime = currentTime;

        if (rawDt > 0 && rawDt < 0.5) {
          fpsAvgRef.current = fpsAvgRef.current * 0.92 + (1 / rawDt) * 0.08;
        }

        // 0. Coalesced latest-frame decode (once per animation frame max; drops stale backlog in O(1))
        const freshSnap = consumeLatestSnapshot();
        if (freshSnap) {
          serverState.current = freshSnap;
          lastSnapTime = currentTime;
          if (isBootstrappingRef.current) {
            isBootstrappingRef.current = false;
            setIsBootstrapping(false);
          }

          if (!freshSnap.units || freshSnap.units.length === 0) {
            serverHistoryRef.current = [];
            isInitialized.current = false;
            if (controlledUnitIdRef.current !== '') {
              controlledUnitIdRef.current = '';
              setControlledUnitId('');
            }
            if (selectedWorldUnitIdRef.current !== null) {
              selectedWorldUnitIdRef.current = null;
              setSelectedWorldUnitId(null);
            }
          } else {
            serverHistoryRef.current.push({ timestamp: currentTime, units: freshSnap.units });
            if (serverHistoryRef.current.length > 20) {
              serverHistoryRef.current.shift();
            }

            let foundControlled = false;
            let bestFallbackUnit: SnapshotUnit | null = null;
            for (let i = 0; i < freshSnap.units.length; i++) {
              const u = freshSnap.units[i];
              if (u.ownerId === 'player' && !u.isDestroyed) {
                if (
                  !bestFallbackUnit ||
                  u.id === 'player-flagship' ||
                  (bestFallbackUnit.id !== 'player-flagship' && u.id < bestFallbackUnit.id)
                ) {
                  bestFallbackUnit = u;
                }
                if (u.id === controlledUnitIdRef.current) {
                  foundControlled = true;
                  if (!isInitialized.current) {
                    renderPos.current.x = u.pos.x;
                    renderPos.current.y = u.pos.y;
                    renderAngle.current = u.angle;
                    cameraPos.current.x = u.pos.x;
                    cameraPos.current.y = u.pos.y;
                    isInitialized.current = true;
                  }
                }
              }
            }
            if (!foundControlled && bestFallbackUnit) {
              controlledUnitIdRef.current = bestFallbackUnit.id;
              renderPos.current.x = bestFallbackUnit.pos.x;
              renderPos.current.y = bestFallbackUnit.pos.y;
              renderAngle.current = bestFallbackUnit.angle;
              cameraPos.current.x = bestFallbackUnit.pos.x;
              cameraPos.current.y = bestFallbackUnit.pos.y;
              isInitialized.current = true;
              setControlledUnitId(bestFallbackUnit.id);
            }
          }
        }

        const snap = serverState.current;
        if (!snap) return;

        const mapW = snap.mapBounds?.width || mapDetailsRef.current?.width || 0;
        const mapH = snap.mapBounds?.height || mapDetailsRef.current?.height || 0;
        if (mapW === 0 || mapH === 0) return;

        const liveUnits = snap.units || [];
        liveUnitMap.clear();
        for (let i = 0; i < liveUnits.length; i++) {
          liveUnitMap.set(liveUnits[i].id, liveUnits[i]);
        }

        const controlledUnit = tickFlightInput(currentTime, liveUnits);
        const activeId = controlledUnit?.id || '';

        const sinceSnapTicks = isPausedRef.current
          ? 0
          : Math.min(4.8, Math.max(0, (currentTime - lastSnapTime) * 0.06 * simulationSpeedRef.current));

        if (controlledUnit) {
          const predX = controlledUnit.pos.x + (controlledUnit.vel?.x || 0) * sinceSnapTicks;
          const predY = controlledUnit.pos.y + (controlledUnit.vel?.y || 0) * sinceSnapTicks;

          if (
            !isInitialized.current ||
            Math.hypot(predX - renderPos.current.x, predY - renderPos.current.y) > 220
          ) {
            renderPos.current = { x: predX, y: predY };
            renderAngle.current = controlledUnit.angle;
            if (isCameraLockedRef.current) {
              cameraPos.current = { x: predX, y: predY };
            }
            isInitialized.current = true;
          } else {
            const lerpRate = 1.0 - Math.exp(-28.0 * dt);
            renderPos.current.x += (predX - renderPos.current.x) * lerpRate;
            renderPos.current.y += (predY - renderPos.current.y) * lerpRate;
            renderAngle.current = lerpAngleShort(renderAngle.current, controlledUnit.angle, lerpRate);
          }

          if (isCameraLockedRef.current) {
            // Pure screen-space cursor lead (no cameraPos -> worldMouse feedback loop, no W-toggle rubberband)
            let targetCamX = renderPos.current.x;
            let targetCamY = renderPos.current.y;

            if (canvasModeRef.current === 'pilot') {
              const maxLeadX = (viewW * 0.14) / zoomRef.current;
              const maxLeadY = (viewH * 0.14) / zoomRef.current;
              const rawLeadX = ((mouseCanvasPosRef.current.x - viewW / 2) * 0.12) / zoomRef.current;
              const rawLeadY = ((mouseCanvasPosRef.current.y - viewH / 2) * 0.12) / zoomRef.current;
              targetCamX += Math.max(-maxLeadX, Math.min(maxLeadX, rawLeadX));
              targetCamY += Math.max(-maxLeadY, Math.min(maxLeadY, rawLeadY));
            }

            const camLerpFactor = 1.0 - Math.exp(-16.0 * dt);
            cameraPos.current.x += (targetCamX - cameraPos.current.x) * camLerpFactor;
            cameraPos.current.y += (targetCamY - cameraPos.current.y) * camLerpFactor;
          }
        }

        const z = zoomRef.current;

        // 1. Cached Universal Environmental Objects
        const liveEnvObjects = snap.envObjects || [];
        renderer.setEnvObjects(liveEnvObjects);

        // 2. Interpolated Units -> ViewportFrameState
        const interpolatedUnits =
          liveUnits.length > 0
            ? getInterpolatedUnits(serverHistoryRef.current, currentTime, !isPausedRef.current)
            : [];
        const unitsToDraw =
          interpolatedUnits && interpolatedUnits.length > 0 ? interpolatedUnits : liveUnits;

        const flags = debugFlagsRef.current;
        const renderUnits: RenderUnit[] = [];

        for (let i = 0; i < unitsToDraw.length; i++) {
          const u = unitsToDraw[i];
          const latest = liveUnitMap.get(u.id);
          if (!latest || latest.isDestroyed) continue;

          const isControlled = latest.id === activeId;
          const isSelected = latest.id === selectedWorldUnitIdRef.current;
          const rx = isControlled ? renderPos.current.x : u.pos.x;
          const ry = isControlled ? renderPos.current.y : u.pos.y;
          const angle = isControlled ? renderAngle.current : u.angle;
          const size = getUnitSpriteSize(latest.type);
          const halfH = size / 2;
          const isFlagship =
            latest.type === 'flagship' || latest.type === 'battalion_command_ship';
          const fallbackColor = latest.ownerId === 'player' ? '#22d3ee' : '#fb7185';
          const tmpl = templatesRef.current[latest.type];

          let ranges: RenderUnitRangeCircle[] | undefined;
          if (flags.showRanges && tmpl) {
            ranges = [];
            if (tmpl.sensorRange && tmpl.sensorRange > 0) {
              ranges.push({ radius: tmpl.sensorRange, color: '#22d3ee', alpha: 0.35 });
            }
            if (tmpl.visionRange && tmpl.visionRange > 0) {
              ranges.push({ radius: tmpl.visionRange, color: '#60a5fa', alpha: 0.35 });
            }
            if (tmpl.aggroRange && tmpl.aggroRange > 0) {
              ranges.push({ radius: tmpl.aggroRange, color: '#f59e0b', alpha: 0.35 });
            }
            if (tmpl.maxRange && tmpl.maxRange > 0) {
              ranges.push({ radius: tmpl.maxRange, color: '#ef4444', alpha: 0.3 });
            }
            if (tmpl.optimalRange && tmpl.optimalRange > 0) {
              ranges.push({ radius: tmpl.optimalRange, color: '#22c55e', alpha: 0.35 });
            }
          }

          let velocityVector: RenderUnit['velocityVector'];
          if (flags.showVelocity && latest.vel) {
            const vx = latest.vel.x || 0;
            const vy = latest.vel.y || 0;
            if (Math.hypot(vx, vy) > 0.05) {
              velocityVector = { vx, vy, scale: 14, color: 'rgba(163, 230, 53, 0.9)' };
            }
          }

          let bars: RenderUnitBar[] | undefined;
          let labels: RenderUnitLabel[] | undefined;
          if (flags.showVitals) {
            const barW = Math.max(40, size * 0.9);
            const barH = 4;
            const topYOffset = -halfH - 18;

            const totalShield = latest.shields
              ? latest.shields.front +
                latest.shields.rear +
                latest.shields.port +
                latest.shields.starboard
              : 0;
            const maxShield = Math.max(1, (tmpl?.shieldBase || 100) * 4);
            const shieldPct = Math.max(0, Math.min(1, totalShield / maxShield));

            const totalHull = latest.hull
              ? latest.hull.front +
                latest.hull.rear +
                latest.hull.port +
                latest.hull.starboard
              : 0;
            const maxHull = Math.max(1, (tmpl?.hullBase || 100) * 4);
            const hullPct = Math.max(0, Math.min(1, totalHull / maxHull));
            const hullColor =
              hullPct > 0.5 ? '#22c55e' : hullPct > 0.25 ? '#f59e0b' : '#ef4444';

            bars = [
              {
                yOffset: topYOffset,
                width: barW,
                height: barH,
                ratio: shieldPct,
                fillColor: '#38bdf8',
              },
              {
                yOffset: topYOffset + 5,
                width: barW,
                height: barH,
                ratio: hullPct,
                fillColor: hullColor,
              },
            ];

            const maxThermal = tmpl?.maxThermalCapacity || 0;
            if (maxThermal > 0 && (latest.currentThermal ?? 0) > 0) {
              const thermalPct = Math.max(
                0,
                Math.min(1, (latest.currentThermal || 0) / maxThermal)
              );
              bars.push({
                yOffset: topYOffset + 10,
                width: barW,
                height: 3,
                ratio: thermalPct,
                fillColor: thermalPct > 0.8 ? '#ef4444' : '#f97316',
              });
            }

            const squadTag =
              latest.squadId || latest.battalionId
                ? ` B${latest.battalionId || 0}·S${latest.squadId || 0}${
                    latest.isSquadLeader ? '*' : ''
                  }`
                : '';
            const stateTag = latest.aiState ? `[${latest.aiState}]` : '';
            const topStr = `${stateTag}${squadTag}`.trim() || latest.type;
            const ammoText =
              (tmpl?.ammoCapacity ?? -1) > 0 && latest.currentAmmo !== undefined
                ? ` | AMMO:${latest.currentAmmo}`
                : '';
            const botStr = `${latest.id}${ammoText}`;

            labels = [
              {
                text: topStr,
                yOffset: topYOffset - 8,
                color: latest.ownerId === 'player' ? '#4ade80' : '#f87171',
                fontSize: 10,
                bold: true,
              },
              {
                text: botStr,
                yOffset: halfH + 12,
                color: '#e2e8f0',
                fontSize: 9,
                bold: true,
              },
            ];
          }

          renderUnits.push({
            id: latest.id,
            unitType: latest.type,
            x: rx,
            y: ry,
            angle,
            size,
            alpha: latest.isStealthed ? 0.48 : 1,
            fallbackColor,
            ring: isControlled
              ? {
                  radius: size * 0.65,
                  strokeColor: '#38bdf8',
                  strokeAlpha: 0.9,
                  lineWidth: 2,
                }
              : isSelected
              ? {
                  radius: size * 0.65,
                  strokeColor: '#f59e0b',
                  strokeAlpha: 0.9,
                  lineWidth: 2,
                  dashed: true,
                }
              : undefined,
            stealthRingRadius: latest.isStealthed ? halfH + 8 : undefined,
            hitbox: flags.showHitboxes,
            ranges,
            thrustFlames: isFlagship && isControlled && !!keysRef.current['w'],
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
            velocityVector,
            bars,
            labels,
          });
        }

        // 3. Projectiles (bounded extrapolation between snapshots, respecting pause & timeScale)
        const rawProjectiles = snap.projectiles || [];
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

        // 4. Click-to-Spawn Ghost Preview
        let ghostSprite: RenderGhostSprite | null = null;
        if (canvasModeRef.current === 'spawn') {
          const worldMouse = canvasToWorld(
            mouseCanvasPosRef.current.x,
            mouseCanvasPosRef.current.y
          );
          const spawnType = selectedCatalogUnitIdRef.current;
          ghostSprite = {
            unitType: spawnType,
            x: worldMouse.x,
            y: worldMouse.y,
            size: getUnitSpriteSize(spawnType),
            ringColor: spawnerFactionRef.current === 'player' ? '#22c55e' : '#ef4444',
            alpha: 0.55,
          };
        }

        const frame: ViewportFrameState = {
          now: currentTime,
          worldWidth: mapW,
          worldHeight: mapH,
          backgroundColor: '#050811',
          backdrop: {
            kind: 'grid',
            spacing: GRID_SPACING,
            lineColor: 'rgba(0, 243, 255, 0.06)',
            borderColor: 'rgba(168, 85, 247, 0.9)',
            borderWidth: 4,
          },
          units: renderUnits,
          projectiles: renderProjectiles,
          ghostSprite,
        };

        renderer.render(frame, {
          mode: 'camera',
          x: cameraPos.current.x,
          y: cameraPos.current.y,
          zoom: z,
        });

        // 5. Throttled Tactical Radar Minimap (~12Hz instead of 60Hz)
        if (currentTime - lastRadarDrawMs >= RADAR_REDRAW_INTERVAL_MS) {
          lastRadarDrawMs = currentTime;
          const radarCanvas = radarCanvasRef.current;
          const radarCtx = radarCanvas?.getContext('2d');
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
              for (let j = 0; j < liveUnits.length; j++) {
                const u = liveUnits[j];
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

            for (let j = 0; j < liveUnits.length; j++) {
              const u = liveUnits[j];
              if (u.isDestroyed || u.ownerId !== 'player' || u.type !== 'recon_probe') continue;
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
            }

            drawEnvObjectsOnRadar(radarCtx, liveEnvObjects, scaleX, scaleY);

            for (let j = 0; j < liveUnits.length; j++) {
              const u = liveUnits[j];
              if (u.isDestroyed) continue;
              if (u.ownerId !== 'player' && !isVisibleToPlayer(u.pos.x, u.pos.y)) continue;

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
            }

            const camViewW = (viewW / z) * scaleX;
            const camViewH = (viewH / z) * scaleY;
            const camViewX = cameraPos.current.x * scaleX - camViewW / 2;
            const camViewY = cameraPos.current.y * scaleY - camViewH / 2;
            radarCtx.strokeStyle = 'rgba(251, 191, 36, 0.55)';
            radarCtx.lineWidth = 1;
            radarCtx.strokeRect(camViewX, camViewY, camViewW, camViewH);
          }
        }
      } catch (err) {
        const errNow = performance.now();
        if (errNow - lastErrLogMs > 2000) {
          lastErrLogMs = errNow;
          console.error('[SANDBOX CANVAS2D] Render tick error:', err);
        }
      }
    };

    rafId = requestAnimationFrame(renderLoop);

    return () => {
      destroyed = true;
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      window.removeEventListener('mousemove', onPanMouseMove);
      window.removeEventListener('mouseup', onPanMouseUp);
      window.removeEventListener('blur', onPanBlur);
      renderer.destroy();
    };
  }, [consumeLatestSnapshot, templatesRef, tickFlightInput, canvasToWorld]);

  // Low-frequency (~5Hz) UI-only derivations from uiSocketState
  const allUnits = uiSocketState?.units || [];
  const playerUnits = useMemo(
    () =>
      allUnits
        .filter((u) => u.ownerId === 'player' && !u.isDestroyed)
        .sort((a, b) => {
          if (a.id === 'player-flagship') return -1;
          if (b.id === 'player-flagship') return 1;
          return a.id.localeCompare(b.id);
        }),
    [allUnits]
  );
  const enemyCount = useMemo(
    () => allUnits.filter((u) => u.ownerId !== 'player' && !u.isDestroyed).length,
    [allUnits]
  );
  const projectileCount = uiSocketState?.projectiles?.length || 0;
  const hasCommandShip = playerUnits.some((u) => u.type === 'battalion_command_ship');
  const controlledUnitObj = useMemo(
    () => playerUnits.find((u) => u.id === controlledUnitId) || playerUnits[0] || null,
    [playerUnits, controlledUnitId]
  );

  const toggleDebugFlag = (flag: keyof DebugOverlayFlags) => {
    setDebugFlags((prev) => ({ ...prev, [flag]: !prev[flag] }));
  };

  return (
    <div
      className="fixed inset-0 w-screen h-screen overflow-hidden bg-[#0b0e14] text-slate-100 flex flex-col p-2 gap-2 font-mono select-none"
      onContextMenu={(e) => {
        e.preventDefault();
        setIsMenuOpen((prev) => !prev);
      }}
    >
      <ViewportTopBar
        icon="🧪"
        title="Practice Sandbox"
        subtitle={mapDetails?.name || `Sector #${mapId}`}
        fps={fpsDisplay}
        tickMs={tickMs}
        playerCount={playerUnits.length}
        enemyCount={enemyCount}
        projectileCount={projectileCount}
        showTimeControls={true}
        simulationSpeed={simulationSpeed}
        isPaused={isPaused}
        onTimeControl={handleTimeControl}
        onNavigateHome={onNavigateHome}
        onNavigateGarage={onNavigateGarage}
        onLogout={onLogout}
      />

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

        {controlledUnitObj && (
          <div className="absolute bottom-4 left-4 bg-slate-900/85 border border-cyan-500/35 px-3.5 py-2.5 rounded-lg backdrop-blur pointer-events-none font-mono text-[11px] leading-relaxed text-cyan-300 shadow-lg tabular-nums">
            <div className="flex justify-between gap-4">
              <span className="text-slate-400">FRONT SHD</span>
              <span className="text-cyan-300 font-bold">
                {(controlledUnitObj.shields?.front || 0).toFixed(1)}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-400">REAR SHD</span>
              <span className="text-cyan-300 font-bold">
                {(controlledUnitObj.shields?.rear || 0).toFixed(1)}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-400">PORT SHD</span>
              <span className="text-cyan-300 font-bold">
                {(controlledUnitObj.shields?.port || 0).toFixed(1)}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-400">STBD SHD</span>
              <span className="text-cyan-300 font-bold">
                {(controlledUnitObj.shields?.starboard || 0).toFixed(1)}
              </span>
            </div>
          </div>
        )}

        <TacticalRadar canvasRef={radarCanvasRef} positionClass="bottom-4 right-4" />

        <SandboxCommandMenu
          isOpen={isMenuOpen}
          onClose={() => setIsMenuOpen(false)}
          activeTab={activeMenuTab}
          onSelectTab={setActiveMenuTab}
          spawnerFaction={spawnerFaction}
          onChangeFaction={setSpawnerFaction}
          catalogSearch={catalogSearch}
          onChangeSearch={setCatalogSearch}
          catalogUnits={catalogUnits}
          filteredCatalogUnits={filteredCatalogUnits}
          selectedCatalogUnitId={selectedCatalogUnitId}
          onSelectCatalogUnit={setSelectedCatalogUnitId}
          allUnits={allUnits}
          onUpdateUnitCount={updateUnitCount}
          onApplyPreset={applyScenarioPreset}
          onResetSandbox={handleResetSandbox}
          playerUnits={playerUnits}
          controlledUnitId={controlledUnitId}
          hasCommandShip={hasCommandShip}
          onSelectControlledUnit={setControlledUnitId}
          sendTemplateOverride={sendTemplateOverride}
          sendUnitGrouping={sendUnitGrouping}
          canvasMode={canvasMode}
          onChangeMode={setCanvasMode}
          debugFlags={debugFlags}
          onToggleDebugFlag={toggleDebugFlag}
          isCameraLocked={isCameraLocked}
          onToggleCameraLock={() => setIsCameraLocked((prev) => !prev)}
          zoomPercent={zoomPercent}
          onResetZoom={() => {
            zoomRef.current = 1.0;
            setZoomPercent(100);
          }}
        />
      </div>
    </div>
  );
};

export default PracticeViewport;
