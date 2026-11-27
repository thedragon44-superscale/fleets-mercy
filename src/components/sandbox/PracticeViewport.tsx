// src/components/sandbox/PracticeViewport.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Application, BitmapText, Container, Graphics, Sprite } from 'pixi.js';
import { useGameSocket } from '../../hooks/useGameSockets';
import { useUnitTemplates } from '../../hooks/useUnitTemplates';
import { useFlightControls } from '../../hooks/useFlightControls';
import { DebugOverlayFlags, UNIT_SCALES } from '../../renderer/vectorAssets';
import {
  PixiUnitSpriteLayer,
  SpriteSyncItem,
  getPixiUnitRotationOffset,
  getPixiUnitSize,
  getPixiUnitTexture,
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
        mapDetailsRef.current = data;
        setMapDetails(data);
        const centerX = data.width / 2;
        const centerY = data.height / 2;
        cameraPos.current = { x: centerX, y: centerY };
        renderPos.current = { x: centerX, y: centerY };
      }
    });
  }, [mapId]);

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

  // Pixi.js v8 WebGL Renderer + 60Hz Loop (Zero 60Hz React renders, cached EnvObjects, BitmapText labels)
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

      // World Scene Graph (cached per-object EnvObjects + mipmapped unit sprites + BitmapText labels)
      const worldContainer = new Container();
      const gridGfx = new Graphics();
      const envLayer = new PixiEnvLayer();
      const unitBackGfx = new Graphics();
      const unitSprites = new PixiUnitSpriteLayer();
      const unitFrontGfx = new Graphics();
      const spawnGhostSprite = new Sprite();
      spawnGhostSprite.anchor.set(0.5);
      spawnGhostSprite.visible = false;
      const labelsContainer = new Container();

      worldContainer.addChild(
        gridGfx,
        envLayer.softContainer,
        envLayer.dynamicGfx,
        envLayer.solidContainer,
        unitBackGfx,
        unitSprites.container,
        unitFrontGfx,
        spawnGhostSprite,
        labelsContainer
      );

      // Screen-space Shield Diagnostics HUD (single BitmapText node)
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

      // Pooled BitmapText labels (all share 1 single GPU font atlas = 1 draw call!)
      const labelPool = new Map<string, BitmapText>();
      const activeLabelKeys = new Set<string>();
      const getOrCreateLabel = (key: string, fontSize: number, tint: number): BitmapText => {
        activeLabelKeys.add(key);
        let t = labelPool.get(key);
        if (!t) {
          t = new BitmapText({
            text: '',
            style: {
              fontFamily: TACTICAL_BITMAP_FONT,
              fontSize,
            },
          });
          t.anchor.set(0.5, 0.5);
          t.tint = tint;
          labelPool.set(key, t);
          labelsContainer.addChild(t);
        } else if (t.tint !== tint) {
          t.tint = tint;
        }
        return t;
      };

      // Preallocated scratch collections (zero per-frame Map/Array allocations)
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

      app.ticker.add(() => {
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
            let firstPlayerUnit: SnapshotUnit | null = null;
            for (let i = 0; i < freshSnap.units.length; i++) {
              const u = freshSnap.units[i];
              if (u.ownerId === 'player' && !u.isDestroyed) {
                if (!firstPlayerUnit) firstPlayerUnit = u;
                if (u.id === controlledUnitIdRef.current) {
                  foundControlled = true;
                  if (!isInitialized.current) {
                    renderPos.current.x = u.pos.x;
                    renderPos.current.y = u.pos.y;
                    isInitialized.current = true;
                  }
                }
              }
            }
            if (!foundControlled && firstPlayerUnit) {
              controlledUnitIdRef.current = firstPlayerUnit.id;
              renderPos.current.x = firstPlayerUnit.pos.x;
              renderPos.current.y = firstPlayerUnit.pos.y;
              isInitialized.current = true;
              setControlledUnitId(firstPlayerUnit.id);
            }
          }
        }

        const snap = serverState.current;
        if (!snap) return;

        const mapW = snap.mapBounds?.width || mapDetailsRef.current?.width || 0;
        const mapH = snap.mapBounds?.height || mapDetailsRef.current?.height || 0;
        if (mapW === 0 || mapH === 0) return;

        const viewW = app.screen.width;
        const viewH = app.screen.height;
        const liveUnits = snap.units || [];

        liveUnitMap.clear();
        for (let i = 0; i < liveUnits.length; i++) {
          liveUnitMap.set(liveUnits[i].id, liveUnits[i]);
        }

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
                Math.min(dist * lookAheadRatio, (viewW * 0.35) / zoomRef.current);
              targetCamY +=
                (dy / dist) *
                Math.min(dist * lookAheadRatio, (viewH * 0.35) / zoomRef.current);
            } else if (canvasModeRef.current === 'pilot') {
              targetCamX +=
                ((mouseCanvasPosRef.current.x - viewW / 2) * 0.15) / zoomRef.current;
              targetCamY +=
                ((mouseCanvasPosRef.current.y - viewH / 2) * 0.15) / zoomRef.current;
            }

            const camBaseFactor = keysRef.current['w'] ? 18.0 : 8.0;
            const camLerpFactor = 1.0 - Math.exp(-camBaseFactor * dt);
            cameraPos.current.x += (targetCamX - cameraPos.current.x) * camLerpFactor;
            cameraPos.current.y += (targetCamY - cameraPos.current.y) * camLerpFactor;
          }
        }

        const z = zoomRef.current;
        worldContainer.scale.set(z);
        worldContainer.position.set(
          viewW / 2 - cameraPos.current.x * z,
          viewH / 2 - cameraPos.current.y * z
        );

        // 1. Rebuild cached tactical grid only when map dimensions change
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
          gridGfx.stroke({ width: 1.2, color: 0x00f3ff, alpha: 0.06 });
          gridGfx.rect(0, 0, mapW, mapH).stroke({ width: 4, color: 0xa855f7, alpha: 0.9 });
        }

        // 2. Cached Universal Environmental Objects (O(1) position/rotation updates — ZERO per-frame tessellation)
        const liveEnvObjects = snap.envObjects || [];
        envLayer.sync(liveEnvObjects, currentTime, mapW, mapH);

        // 3. Interpolated Units -> Pooled Mipmapped Pixi Sprites + Lightweight Debug Overlays
        const interpolatedUnits =
          liveUnits.length > 0 ? getInterpolatedUnits(serverHistoryRef.current, currentTime) : [];
        const unitsToDraw =
          interpolatedUnits && interpolatedUnits.length > 0 ? interpolatedUnits : liveUnits;

        unitBackGfx.clear();
        unitFrontGfx.clear();
        activeLabelKeys.clear();
        spriteItems.length = 0;

        const flags = debugFlagsRef.current;

        for (let i = 0; i < unitsToDraw.length; i++) {
          const u = unitsToDraw[i];
          const latest = liveUnitMap.get(u.id);
          if (!latest || latest.isDestroyed) continue;

          const isControlled = latest.id === activeId;
          const isSelected = latest.id === selectedWorldUnitIdRef.current;
          const rx = isControlled ? renderPos.current.x : u.pos.x;
          const ry = isControlled ? renderPos.current.y : u.pos.y;
          const angle = u.angle;
          const size = getPixiUnitSize(latest.type);
          const halfH = size / 2;
          const isFlagship =
            latest.type === 'flagship' || latest.type === 'battalion_command_ship';

          if (latest.isStealthed) {
            drawPixiDashedCircle(unitBackGfx, rx, ry, halfH + 8, 6, 6, 0xc084fc, 0.72, 2);
          }

          if (isControlled || isSelected) {
            const ringR = size * 0.65;
            if (isControlled) {
              unitBackGfx.circle(rx, ry, ringR).stroke({ width: 2, color: 0x38bdf8, alpha: 0.9 });
            } else {
              drawPixiDashedCircle(unitBackGfx, rx, ry, ringR, 6, 5, 0xf59e0b, 0.9, 2);
            }
          }

          if (flags.showHitboxes) {
            unitBackGfx
              .rect(rx - halfH, ry - halfH, size, size)
              .stroke({ width: 1, color: 0xf59e0b, alpha: 0.85 });
          }

          const tmpl = templatesRef.current[latest.type];
          if (flags.showRanges && tmpl) {
            if (tmpl.sensorRange && tmpl.sensorRange > 0)
              unitBackGfx.circle(rx, ry, tmpl.sensorRange).stroke({ width: 1, color: 0x22d3ee, alpha: 0.35 });
            if (tmpl.visionRange && tmpl.visionRange > 0)
              unitBackGfx.circle(rx, ry, tmpl.visionRange).stroke({ width: 1, color: 0x60a5fa, alpha: 0.35 });
            if (tmpl.aggroRange && tmpl.aggroRange > 0)
              unitBackGfx.circle(rx, ry, tmpl.aggroRange).stroke({ width: 1, color: 0xf59e0b, alpha: 0.35 });
            if (tmpl.maxRange && tmpl.maxRange > 0)
              unitBackGfx.circle(rx, ry, tmpl.maxRange).stroke({ width: 1, color: 0xef4444, alpha: 0.3 });
            if (tmpl.optimalRange && tmpl.optimalRange > 0)
              unitBackGfx.circle(rx, ry, tmpl.optimalRange).stroke({ width: 1, color: 0x22c55e, alpha: 0.35 });
          }

          if (isFlagship) {
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            if (isControlled && keysRef.current['w']) {
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

          if (flags.showVelocity && latest.vel) {
            const vx = latest.vel.x || 0;
            const vy = latest.vel.y || 0;
            if (Math.hypot(vx, vy) > 0.05) {
              unitFrontGfx
                .moveTo(rx, ry)
                .lineTo(rx + vx * 14, ry + vy * 14)
                .stroke({ width: 1.75, color: 0xa3e635, alpha: 0.9 });
            }
          }

          if (flags.showVitals) {
            const barW = Math.max(40, size * 0.9);
            const barH = 4;
            const topY = ry - halfH - 18;

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

            unitFrontGfx
              .rect(rx - barW / 2, topY, barW, barH)
              .fill({ color: 0x0f172a, alpha: 0.85 });
            if (shieldPct > 0) {
              unitFrontGfx
                .rect(rx - barW / 2, topY, barW * shieldPct, barH)
                .fill({ color: 0x38bdf8, alpha: 1 });
            }

            const hullColor = hullPct > 0.5 ? 0x22c55e : hullPct > 0.25 ? 0xf59e0b : 0xef4444;
            unitFrontGfx
              .rect(rx - barW / 2, topY + 5, barW, barH)
              .fill({ color: 0x0f172a, alpha: 0.85 });
            if (hullPct > 0) {
              unitFrontGfx
                .rect(rx - barW / 2, topY + 5, barW * hullPct, barH)
                .fill({ color: hullColor, alpha: 1 });
            }

            const maxThermal = tmpl?.maxThermalCapacity || 0;
            if (maxThermal > 0 && (latest.currentThermal ?? 0) > 0) {
              const thermalPct = Math.max(
                0,
                Math.min(1, (latest.currentThermal || 0) / maxThermal)
              );
              unitFrontGfx
                .rect(rx - barW / 2, topY + 10, barW, 3)
                .fill({ color: 0x0f172a, alpha: 0.85 });
              unitFrontGfx
                .rect(rx - barW / 2, topY + 10, barW * thermalPct, 3)
                .fill({ color: thermalPct > 0.8 ? 0xef4444 : 0xf97316, alpha: 1 });
            }

            const squadTag =
              latest.squadId || latest.battalionId
                ? ` B${latest.battalionId || 0}·S${latest.squadId || 0}${
                    latest.isSquadLeader ? '*' : ''
                  }`
                : '';
            const stateTag = latest.aiState ? `[${latest.aiState}]` : '';
            const topStr = `${stateTag}${squadTag}`.trim() || latest.type;
            const topLabel = getOrCreateLabel(
              `top:${latest.id}`,
              10,
              latest.ownerId === 'player' ? 0x4ade80 : 0xf87171
            );
            if (topLabel.text !== topStr) topLabel.text = topStr;
            topLabel.position.set(rx, topY - 8);

            const ammoText =
              (tmpl?.ammoCapacity ?? -1) > 0 && latest.currentAmmo !== undefined
                ? ` | AMMO:${latest.currentAmmo}`
                : '';
            const botStr = `${latest.id}${ammoText}`;
            const botLabel = getOrCreateLabel(`bot:${latest.id}`, 9, 0xe2e8f0);
            if (botLabel.text !== botStr) botLabel.text = botStr;
            botLabel.position.set(rx, ry + halfH + 12);
          }
        }

        unitSprites.sync(spriteItems);

        for (const [key, t] of labelPool) {
          if (!activeLabelKeys.has(key)) {
            labelsContainer.removeChild(t);
            t.destroy();
            labelPool.delete(key);
          }
        }

        // 4. Projectiles
        const projectiles = snap.projectiles || [];
        for (let i = 0; i < projectiles.length; i++) {
          const p = projectiles[i];
          unitFrontGfx
            .circle(p.pos.x, p.pos.y, 3)
            .fill({ color: p.type === 'player' ? 0x00f3ff : 0xff2a6d, alpha: 1 });
        }

        // 5. Click-to-Spawn Ghost Preview
        if (canvasModeRef.current === 'spawn') {
          const worldMouse = canvasToWorld(
            mouseCanvasPosRef.current.x,
            mouseCanvasPosRef.current.y
          );
          const spawnType = selectedCatalogUnitIdRef.current;
          const ghostSize = getPixiUnitSize(spawnType);
          const ghostTex = getPixiUnitTexture(spawnType);
          const ghostColor = spawnerFactionRef.current === 'player' ? 0x22c55e : 0xef4444;

          if (ghostTex) {
            spawnGhostSprite.texture = ghostTex;
            spawnGhostSprite.position.set(worldMouse.x, worldMouse.y);
            spawnGhostSprite.rotation = getPixiUnitRotationOffset(spawnType);
            spawnGhostSprite.width = ghostSize;
            spawnGhostSprite.height = ghostSize;
            spawnGhostSprite.alpha = 0.55;
            spawnGhostSprite.visible = true;
          } else {
            spawnGhostSprite.visible = false;
          }
          drawPixiDashedCircle(
            unitFrontGfx,
            worldMouse.x,
            worldMouse.y,
            ghostSize * 0.65,
            6,
            5,
            ghostColor,
            0.9,
            1.5
          );
        } else {
          spawnGhostSprite.visible = false;
        }

        // 6. Quadrant Shield Diagnostics HUD
        if (controlledUnit) {
          const diagStr =
            `FRONT SHD: ${(controlledUnit.shields?.front || 0).toFixed(1)}\n` +
            `REAR  SHD: ${(controlledUnit.shields?.rear || 0).toFixed(1)}\n` +
            `PORT  SHD: ${(controlledUnit.shields?.port || 0).toFixed(1)}\n` +
            `STBD  SHD: ${(controlledUnit.shields?.starboard || 0).toFixed(1)}`;
          if (hudDiagText.text !== diagStr) hudDiagText.text = diagStr;
          hudDiagText.visible = true;
        } else {
          hudDiagText.visible = false;
        }

        // 7. Throttled Tactical Radar Minimap (~12Hz instead of 60Hz)
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
      });
    })();

    return () => {
      destroyed = true;
      resizeObserver?.disconnect();
      window.removeEventListener('mousemove', onPanMouseMove);
      window.removeEventListener('mouseup', onPanMouseUp);
      window.removeEventListener('blur', onPanBlur);
      if (initialized) {
        app.destroy(false, { children: true, texture: false, textureSource: false });
      }
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
