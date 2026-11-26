// src/components/sandbox/PracticeViewport.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useGameSocket } from '../../hooks/useGameSockets';
import { useUnitTemplates } from '../../hooks/useUnitTemplates';
import { useFlightControls } from '../../hooks/useFlightControls';
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
} from '../../renderer/vectorAssets';
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
      const activePlayerUnits = units.filter((u) => u.ownerId === 'player' && !u.isDestroyed);
      return (
        activePlayerUnits.find((u) => u.id === controlledUnitIdRef.current) ||
        activePlayerUnits[0]
      );
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

  // Sync incoming socket state & clear interpolation history on empty state
  useEffect(() => {
    if (!socketState) return;
    serverState.current = socketState;

    if (isBootstrapping) {
      setIsBootstrapping(false);
    }

    if (!socketState.units || socketState.units.length === 0) {
      serverHistoryRef.current = [];
      isInitialized.current = false;
      if (controlledUnitIdRef.current !== '') {
        controlledUnitIdRef.current = '';
        setControlledUnitId('');
      }
      setSelectedWorldUnitId(null);
      return;
    }

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
  }, [socketState, isBootstrapping]);

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

  useEffect(() => {
    const id = setInterval(() => {
      setFpsDisplay(Math.round(fpsAvgRef.current));
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
        setActiveMenuTab('specs');
        setIsMenuOpen(true);
      } else {
        setSelectedWorldUnitId(null);
      }
    }
  };

  useEffect(() => {
    const onPanMouseMove = (e: MouseEvent) => {
      if (!isPanningRef.current) return;
      const dx = e.clientX - panLastMouseRef.current.x;
      const dy = e.clientY - panLastMouseRef.current.y;
      panLastMouseRef.current = { x: e.clientX, y: e.clientY };
      cameraPos.current.x -= dx / zoomRef.current;
      cameraPos.current.y -= dy / zoomRef.current;
    };

    const onPanMouseUp = (e: MouseEvent) => {
      if (e.button === 1) {
        isPanningRef.current = false;
      }
    };

    const onPanBlur = () => {
      isPanningRef.current = false;
    };

    window.addEventListener('mousemove', onPanMouseMove);
    window.addEventListener('mouseup', onPanMouseUp);
    window.addEventListener('blur', onPanBlur);

    let animId: number;
    let lastTime = performance.now();

    const render = (currentTime: number) => {
      const rawDt = (currentTime - lastTime) / 1000;
      const dt = Math.min(Math.max(rawDt, 0.001), 0.1);
      lastTime = currentTime;

      if (rawDt > 0 && rawDt < 0.5) {
        const instantFps = 1 / rawDt;
        fpsAvgRef.current = fpsAvgRef.current * 0.92 + instantFps * 0.08;
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

        const controlledUnit = tickFlightInput(currentTime, liveUnits);
        const activeId = controlledUnit?.id || '';

        if (controlledUnit) {
          if (!isInitialized.current) {
            renderPos.current = { x: controlledUnit.pos.x, y: controlledUnit.pos.y };
            isInitialized.current = true;
          }

          const lerpRate = 1.0 - Math.pow(0.0001, dt);
          renderPos.current.x += (controlledUnit.pos.x - renderPos.current.x) * lerpRate;
          renderPos.current.y += (controlledUnit.pos.y - renderPos.current.y) * lerpRate;

          if (isCameraLockedRef.current) {
            const worldMouse = canvasToWorld(
              mouseCanvasPosRef.current.x,
              mouseCanvasPosRef.current.y
            );
            const dx = worldMouse.x - renderPos.current.x;
            const dy = worldMouse.y - renderPos.current.y;
            const dist = Math.hypot(dx, dy);

            let targetCamX = renderPos.current.x;
            let targetCamY = renderPos.current.y;

            if (keysRef.current['w'] && dist > 1) {
              const lookAheadRatio = 0.45;
              targetCamX +=
                (dx / dist) *
                Math.min(dist * lookAheadRatio, (canvas.width * 0.35) / zoomRef.current);
              targetCamY +=
                (dy / dist) *
                Math.min(dist * lookAheadRatio, (canvas.height * 0.35) / zoomRef.current);
            } else if (canvasModeRef.current === 'pilot') {
              targetCamX +=
                ((mouseCanvasPosRef.current.x - canvas.width / 2) * 0.15) / zoomRef.current;
              targetCamY +=
                ((mouseCanvasPosRef.current.y - canvas.height / 2) * 0.15) / zoomRef.current;
            }

            const camBaseFactor = keysRef.current['w'] ? 18.0 : 8.0;
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

        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 4 / z;
        ctx.strokeRect(0, 0, mapW, mapH);

        if (mapDetails?.structures) {
          mapDetails.structures.forEach((s) => {
            ctx.save();
            ctx.translate(s.posX, s.posY);
            renderEnvironmentVector(ctx, s.structureType, s.radius);
            ctx.restore();
          });
        }

        const interpolatedUnits =
          liveUnits.length > 0 ? getInterpolatedUnits(serverHistoryRef.current, currentTime) : [];
        const unitsToDraw =
          interpolatedUnits && interpolatedUnits.length > 0 ? interpolatedUnits : liveUnits;

        unitsToDraw.forEach((u: any) => {
          const latest = liveUnitMap.get(u.id);
          if (!latest) return;
          const mergedUnit = { ...latest, pos: u.pos, angle: u.angle };

          const isControlled = mergedUnit.id === activeId;
          const rx = isControlled ? renderPos.current.x : mergedUnit.pos.x;
          const ry = isControlled ? renderPos.current.y : mergedUnit.pos.y;
          const isAccelerating = isControlled && !!keysRef.current['w'];

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

        (serverState.current.projectiles || []).forEach((p) => {
          drawProjectile(ctx, p.pos.x, p.pos.y, p.vel.x, p.vel.y, p.type);
        });

        if (canvasModeRef.current === 'spawn') {
          const worldMouse = canvasToWorld(
            mouseCanvasPosRef.current.x,
            mouseCanvasPosRef.current.y
          );
          drawSpawnGhost(
            ctx,
            worldMouse.x,
            worldMouse.y,
            selectedCatalogUnitIdRef.current,
            spawnerFactionRef.current
          );
        }

        ctx.restore();

        if (controlledUnit) {
          drawHUDDiagnostics(ctx, controlledUnit.shields, controlledUnit.hull);
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
      window.removeEventListener('mousemove', onPanMouseMove);
      window.removeEventListener('mouseup', onPanMouseUp);
      window.removeEventListener('blur', onPanBlur);
    };
  }, [mapDetails, templatesRef, tickFlightInput, canvasToWorld]);

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
        setIsMenuOpen((prev) => !prev);
      }}
    >
      <ViewportTopBar
        icon="🧪"
        title="Practice Sandbox"
        subtitle={mapDetails?.name || 'Sector 01 — Combat Lab'}
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
