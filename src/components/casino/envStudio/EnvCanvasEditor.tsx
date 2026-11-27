// src/components/casino/envStudio/EnvCanvasEditor.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ClusterSlotTier, SPResourceConfig } from '../../../services/clusterService';
import {
  EnvBlueprint,
  EnvComponentKind,
  EnvComponentSpec,
  OrbitingChildSpec,
  computeEnvBoundingRadius,
} from '../../../services/envService';

export interface EnvCanvasEditorProps {
  blueprint: EnvBlueprint;
  allBlueprints: EnvBlueprint[];
  resources: Record<string, SPResourceConfig>;
  selectedIndex: number | null;
  onSelectIndex: (idx: number | null) => void;
  onChangeComponents: (components: EnvComponentSpec[]) => void;
  onChangeOrbitingChildren: (children: OrbitingChildSpec[]) => void;
}

const TIER_COLORS: Record<string, string> = {
  common: '#d97706',
  mid: '#a855f7',
  rare: '#38bdf8',
  any: '#facc15',
};

const COMPONENT_KINDS: EnvComponentKind[] = [
  'solid_rock',
  'resource_node',
  'solid_core',
  'cave_mouth',
  'crater_node',
  'gas_core',
  'gas_deep',
  'gas_outer',
  'nebula_blob',
  'rift_core',
  'rift_field',
  'comet_core',
];

function defaultComponentForArchetype(
  objectType: EnvBlueprint['objectType'],
  dx: number,
  dy: number,
  idx: number
): EnvComponentSpec {
  const id = `c${Date.now().toString(36)}_${idx}`;
  switch (objectType) {
    case 'nebula_field':
      return {
        id,
        kind: 'nebula_blob',
        dx,
        dy,
        radius: 82,
        inner_radius: 0,
        is_node: false,
        slot_tier: null,
        pinned_resource: null,
        color_hex: '#7c3aed',
        is_destructible: false,
      };
    case 'major_world':
      return {
        id,
        kind: 'cave_mouth',
        dx,
        dy,
        radius: 24,
        inner_radius: 0,
        is_node: true,
        slot_tier: 'common',
        pinned_resource: null,
        color_hex: '#d97706',
        is_destructible: false,
      };
    case 'mineral_planetoid':
    case 'moon':
      return {
        id,
        kind: 'crater_node',
        dx,
        dy,
        radius: 20,
        inner_radius: 0,
        is_node: true,
        slot_tier: 'common',
        pinned_resource: null,
        color_hex: '#d97706',
        is_destructible: false,
      };
    case 'gas_giant':
    case 'singularity_rift':
      return {
        id,
        kind: 'resource_node',
        dx,
        dy,
        radius: 22,
        inner_radius: 0,
        is_node: true,
        slot_tier: objectType === 'singularity_rift' ? 'rare' : 'mid',
        pinned_resource: null,
        color_hex: objectType === 'singularity_rift' ? '#38bdf8' : '#a855f7',
        is_destructible: false,
      };
    default:
      return {
        id,
        kind: 'solid_rock',
        dx,
        dy,
        radius: 34,
        inner_radius: 0,
        is_node: false,
        slot_tier: null,
        pinned_resource: null,
        color_hex: '#64748b',
        is_destructible: false,
      };
  }
}

function drawPolygonRock(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  seed: number
) {
  const verts = 11;
  ctx.beginPath();
  for (let i = 0; i < verts; i++) {
    const a = (i / verts) * Math.PI * 2;
    const jitter = 0.87 + 0.13 * Math.sin(seed * 3.1 + i * 2.2) * Math.cos(seed * 1.7 - i * 1.1);
    const r = radius * jitter;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

interface RayPoint {
  x: number;
  y: number;
}

/** Traces a live Test Shot ray against solid cover & Singularity Rift refraction fields. */
function traceTestShot(
  start: RayPoint,
  target: RayPoint,
  bp: EnvBlueprint
): { points: RayPoint[]; outcome: 'clear' | 'blocked' | 'refracted' } {
  let dx = target.x - start.x;
  let dy = target.y - start.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 4) return { points: [start], outcome: 'clear' };

  let vx = (dx / dist) * 6;
  let vy = (dy / dist) * 6;
  let x = start.x;
  let y = start.y;
  let refracted = false;
  let outcome: 'clear' | 'blocked' | 'refracted' = 'clear';
  const points: RayPoint[] = [{ x, y }];

  for (let step = 0; step < 160; step++) {
    x += vx;
    y += vy;

    // Check refraction field (once per pass)
    if (
      !refracted &&
      bp.physicsProfile.projectile_behavior === 'refract' &&
      bp.physicsProfile.refract_angle_rad !== 0
    ) {
      const rField = bp.components.find((c) => c.kind === 'rift_field');
      const rRad = rField ? rField.radius : bp.physicsProfile.repulsion_radius;
      const fx = rField ? rField.dx : 0;
      const fy = rField ? rField.dy : 0;
      if (rRad > 0 && Math.hypot(x - fx, y - fy) <= rRad) {
        // Predictable side-dependent refraction bend based on cross-product relative to rift center
        const cross = (x - fx) * vy - (y - fy) * vx;
        const sign = cross >= 0 ? 1 : -1;
        const ang = Math.atan2(vy, vx) + sign * bp.physicsProfile.refract_angle_rad;
        const spd = Math.hypot(vx, vy);
        vx = Math.cos(ang) * spd;
        vy = Math.sin(ang) * spd;
        refracted = true;
        outcome = 'refracted';
        points.push({ x, y });
      }
    }

    // Check solid blocking components
    if (bp.physicsProfile.projectile_behavior === 'block') {
      let hit = false;
      for (const c of bp.components) {
        if (
          c.kind === 'solid_rock' ||
          c.kind === 'solid_core' ||
          c.kind === 'resource_node' ||
          c.kind === 'crater_node' ||
          c.kind === 'cave_mouth'
        ) {
          if (Math.hypot(x - c.dx, y - c.dy) <= c.radius) {
            hit = true;
            break;
          }
        }
      }
      if (hit) {
        points.push({ x, y });
        return { points, outcome: 'blocked' };
      }
    }

    if (step % 4 === 0) points.push({ x, y });
  }
  points.push({ x, y });
  return { points, outcome };
}

export const EnvCanvasEditor: React.FC<EnvCanvasEditorProps> = ({
  blueprint,
  allBlueprints,
  resources,
  selectedIndex,
  onSelectIndex,
  onChangeComponents,
  onChangeOrbitingChildren,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [canvasSize, setCanvasSize] = useState({ width: 820, height: 560 });
  const [zoom, setZoom] = useState<number>(1.0);
  const [showShipGhost, setShowShipGhost] = useState<boolean>(true);
  const [showCorridorOverlay, setShowCorridorOverlay] = useState<boolean>(false);
  const [previewMotion, setPreviewMotion] = useState<boolean>(false);
  const [testShotMode, setTestShotMode] = useState<boolean>(false);
  const [moonPanelOpen, setMoonPanelOpen] = useState<boolean>(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const [testRay, setTestRay] = useState<{ start: RayPoint; end: RayPoint } | null>(null);
  const testRayDraggingRef = useRef<boolean>(false);

  const draggingIndexRef = useRef<number | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const previewRef = useRef({ x: 0, y: 0, angle: 0, tick: 0, vx: 0.6, vy: 0.25 });

  const boundingRadius = useMemo(
    () => computeEnvBoundingRadius(blueprint, allBlueprints),
    [blueprint, allBlueprints]
  );

  const resourceList = useMemo(
    () => Object.values(resources).sort((a, b) => a.enumCode - b.enumCode),
    [resources]
  );

  const moonBlueprints = useMemo(
    () => allBlueprints.filter((b) => b.objectType === 'moon' && b.blueprintId !== blueprint.blueprintId),
    [allBlueprints, blueprint.blueprintId]
  );

  const canAttachMoons =
    blueprint.objectType === 'major_world' ||
    blueprint.objectType === 'gas_giant' ||
    blueprint.objectType === 'mineral_planetoid';

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const sync = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        setCanvasSize({ width: Math.floor(r.width), height: Math.floor(r.height) });
      }
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!previewMotion) {
      previewRef.current = { x: 0, y: 0, angle: 0, tick: 0, vx: 0, vy: 0 };
      return;
    }
    const mot = blueprint.motionProfile;
    const avgSpd = Math.max(0.15, (mot.speed_min + mot.speed_max) / 2);
    const boost = mot.mode === 'transient_transit' ? 1.0 : 1.7;
    previewRef.current = {
      x: 0,
      y: 0,
      angle: 0,
      tick: 0,
      vx: Math.cos(0.35) * avgSpd * boost,
      vy: Math.sin(0.35) * avgSpd * boost,
    };
  }, [previewMotion, blueprint.motionProfile]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (previewMotion || testShotMode || selectedIndex === null) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        if (blueprint.components.length <= 1) return;
        onChangeComponents(blueprint.components.filter((_, i) => i !== selectedIndex));
        onSelectIndex(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [previewMotion, testShotMode, selectedIndex, blueprint.components, onChangeComponents, onSelectIndex]);

  const screenToLocal = useCallback(
    (clientX: number, clientY: number): RayPoint => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return {
        x: (clientX - rect.left - canvasSize.width / 2) / zoom,
        y: (clientY - rect.top - canvasSize.height / 2) / zoom,
      };
    },
    [canvasSize.width, canvasSize.height, zoom]
  );

  // Hit-test smallest/topmost component first so inner Gas Core / Rift Core / Crater Nodes stay clickable!
  const hitTestComponent = useCallback(
    (lx: number, ly: number): number | null => {
      let bestIdx: number | null = null;
      let bestRad = Infinity;
      blueprint.components.forEach((c, idx) => {
        const d = Math.hypot(lx - c.dx, ly - c.dy);
        if (d <= c.radius + 4 && c.radius < bestRad) {
          bestRad = c.radius;
          bestIdx = idx;
        }
      });
      return bestIdx;
    },
    [blueprint.components]
  );

  const patchComponent = useCallback(
    (idx: number, patch: Partial<EnvComponentSpec>) => {
      onChangeComponents(blueprint.components.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
    },
    [blueprint.components, onChangeComponents]
  );

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (previewMotion) return;
    const local = screenToLocal(e.clientX, e.clientY);

    if (testShotMode) {
      if (e.button === 0) {
        testRayDraggingRef.current = true;
        setTestRay({ start: local, end: local });
      }
      return;
    }

    if (e.button === 2) {
      const hit = hitTestComponent(local.x, local.y);
      if (hit !== null && blueprint.components.length > 1) {
        onChangeComponents(blueprint.components.filter((_, i) => i !== hit));
        if (selectedIndex === hit) onSelectIndex(null);
      }
      return;
    }
    if (e.button !== 0) return;

    const hit = hitTestComponent(local.x, local.y);
    if (hit !== null) {
      draggingIndexRef.current = hit;
      dragOffsetRef.current = {
        x: local.x - blueprint.components[hit].dx,
        y: local.y - blueprint.components[hit].dy,
      };
      onSelectIndex(hit);
    } else {
      const nextComp = defaultComponentForArchetype(
        blueprint.objectType,
        Math.round(local.x),
        Math.round(local.y),
        blueprint.components.length + 1
      );
      const next = [...blueprint.components, nextComp];
      onChangeComponents(next);
      onSelectIndex(next.length - 1);
      draggingIndexRef.current = next.length - 1;
      dragOffsetRef.current = { x: 0, y: 0 };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (previewMotion) return;
    const local = screenToLocal(e.clientX, e.clientY);

    if (testShotMode) {
      if (testRayDraggingRef.current) {
        setTestRay((prev) => (prev ? { ...prev, end: local } : null));
      }
      return;
    }

    if (draggingIndexRef.current !== null) {
      const idx = draggingIndexRef.current;
      const clampedX = Math.max(-460, Math.min(460, Math.round(local.x - dragOffsetRef.current.x)));
      const clampedY = Math.max(-360, Math.min(360, Math.round(local.y - dragOffsetRef.current.y)));
      patchComponent(idx, { dx: clampedX, dy: clampedY });
      return;
    }

    setHoveredIndex(hitTestComponent(local.x, local.y));
  };

  const handleMouseUp = () => {
    draggingIndexRef.current = null;
    testRayDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (previewMotion || testShotMode) return;
    const local = screenToLocal(e.clientX, e.clientY);
    const targetIdx = hitTestComponent(local.x, local.y) ?? selectedIndex;
    if (targetIdx !== null && blueprint.components[targetIdx]) {
      const delta = e.deltaY < 0 ? 4 : -4;
      const nextR = Math.max(12, Math.min(320, Math.round(blueprint.components[targetIdx].radius + delta)));
      patchComponent(targetIdx, { radius: nextR });
      if (selectedIndex !== targetIdx) onSelectIndex(targetIdx);
    } else {
      setZoom((z) => Math.max(0.4, Math.min(2.0, Number((z * (e.deltaY < 0 ? 1.1 : 0.9)).toFixed(2)))));
    }
  };

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== canvasSize.width * dpr || canvas.height !== canvasSize.height * dpr) {
        canvas.width = canvasSize.width * dpr;
        canvas.height = canvasSize.height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.fillStyle = '#060a12';
      ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

      const cx = canvasSize.width / 2;
      const cy = canvasSize.height / 2;

      let ox = 0;
      let oy = 0;
      let rot = 0;
      let tick = 0;

      if (previewMotion) {
        const st = previewRef.current;
        st.tick++;
        st.x += st.vx;
        st.y += st.vy;
        st.angle += blueprint.motionProfile.spin_rate;
        const halfW = canvasSize.width / (2 * zoom) + boundingRadius;
        const halfH = canvasSize.height / (2 * zoom) + boundingRadius;
        if (st.x > halfW) st.x = -halfW;
        if (st.x < -halfW) st.x = halfW;
        if (st.y > halfH) st.y = -halfH;
        if (st.y < -halfH) st.y = halfH;
        ox = st.x;
        oy = st.y;
        rot = st.angle;
        tick = st.tick;
      }

      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(zoom, zoom);

      // Grid
      const gxMax = Math.ceil(canvasSize.width / (2 * zoom) / 50) * 50 + 50;
      const gyMax = Math.ceil(canvasSize.height / (2 * zoom) / 50) * 50 + 50;
      ctx.lineWidth = 1 / zoom;
      for (let gx = -gxMax; gx <= gxMax; gx += 50) {
        ctx.strokeStyle = gx === 0 ? 'rgba(56,189,248,0.28)' : gx % 100 === 0 ? 'rgba(148,163,184,0.12)' : 'rgba(148,163,184,0.05)';
        ctx.beginPath();
        ctx.moveTo(gx, -gyMax);
        ctx.lineTo(gx, gyMax);
        ctx.stroke();
      }
      for (let gy = -gyMax; gy <= gyMax; gy += 50) {
        ctx.strokeStyle = gy === 0 ? 'rgba(56,189,248,0.28)' : gy % 100 === 0 ? 'rgba(148,163,184,0.12)' : 'rgba(148,163,184,0.05)';
        ctx.beginPath();
        ctx.moveTo(-gxMax, gy);
        ctx.lineTo(gxMax, gy);
        ctx.stroke();
      }

      // Ship Scale Reference Ghosts
      if (showShipGhost && !previewMotion) {
        const ghostX = -boundingRadius - 95;
        const ghosts = [
          { label: '1W Viper (21px)', y: -75, r: 21.5, color: 'rgba(56,189,248,0.5)' },
          { label: 'Mining Barge (28px)', y: 0, r: 28.5, color: 'rgba(251,191,36,0.5)' },
          { label: '5W Flagship (35px)', y: 80, r: 35.5, color: 'rgba(248,113,113,0.5)' },
        ];
        for (const g of ghosts) {
          ctx.save();
          ctx.translate(ghostX, g.y);
          ctx.strokeStyle = g.color;
          ctx.fillStyle = g.color.replace('0.5', '0.12');
          ctx.lineWidth = 1.5 / zoom;
          ctx.setLineDash([4 / zoom, 3 / zoom]);
          ctx.beginPath();
          ctx.arc(0, 0, g.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = 'rgba(226,232,240,0.7)';
          ctx.font = `${10 / zoom}px ui-monospace, monospace`;
          ctx.textAlign = 'center';
          ctx.fillText(g.label, 0, g.r + 13 / zoom);
          ctx.restore();
        }
      }

      // Rigid Object Frame
      ctx.save();
      ctx.translate(ox, oy);
      ctx.rotate(rot);

      // Gravity / Repulsion Physics Field Envelope
      if (blueprint.physicsProfile.gravity_radius > 0) {
        ctx.strokeStyle = 'rgba(96, 165, 250, 0.32)';
        ctx.lineWidth = 1.5 / zoom;
        ctx.setLineDash([5 / zoom, 5 / zoom]);
        ctx.beginPath();
        ctx.arc(0, 0, blueprint.physicsProfile.gravity_radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if (blueprint.physicsProfile.repulsion_radius > 0) {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
        ctx.lineWidth = 1.8 / zoom;
        ctx.setLineDash([6 / zoom, 4 / zoom]);
        ctx.beginPath();
        ctx.arc(0, 0, blueprint.physicsProfile.repulsion_radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Enclosing Wrap Bounding Radius
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
      ctx.lineWidth = 1.5 / zoom;
      ctx.setLineDash([8 / zoom, 6 / zoom]);
      ctx.beginPath();
      ctx.arc(0, 0, boundingRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw components back-to-front (largest radii first so inner cores/nodes draw on top)
      const order = blueprint.components
        .map((c, idx) => ({ c, idx }))
        .sort((a, b) => b.c.radius - a.c.radius);

      for (const { c, idx } of order) {
        const isSel = !previewMotion && idx === selectedIndex;
        const isHov = !previewMotion && idx === hoveredIndex;
        const resColor =
          c.is_node && c.pinned_resource && resources[c.pinned_resource]
            ? resources[c.pinned_resource].colorHex
            : c.is_node
            ? TIER_COLORS[c.slot_tier || 'any'] || '#facc15'
            : c.color_hex || '#64748b';

        ctx.save();
        if (c.kind === 'nebula_blob') {
          const ng = ctx.createRadialGradient(c.dx, c.dy, c.radius * 0.1, c.dx, c.dy, c.radius);
          ng.addColorStop(0, `${resColor}66`);
          ng.addColorStop(0.7, `${resColor}28`);
          ng.addColorStop(1, `${resColor}00`);
          ctx.fillStyle = ng;
          ctx.beginPath();
          ctx.arc(c.dx, c.dy, c.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = isSel ? '#ffffff' : `${resColor}99`;
          ctx.lineWidth = (isSel ? 2.5 : 1.2) / zoom;
          ctx.setLineDash([5 / zoom, 4 / zoom]);
          ctx.stroke();
          ctx.setLineDash([]);
        } else if (c.kind === 'gas_outer' || c.kind === 'gas_deep' || c.kind === 'gas_core') {
          const alpha = c.kind === 'gas_core' ? 'aa' : c.kind === 'gas_deep' ? '55' : '2a';
          ctx.fillStyle = `${c.color_hex || '#a855f7'}${alpha}`;
          ctx.beginPath();
          ctx.arc(c.dx, c.dy, c.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = isSel ? '#ffffff' : c.color_hex || '#c084fc';
          ctx.lineWidth = (isSel ? 3 : 1.8) / zoom;
          ctx.stroke();
        } else if (c.kind === 'rift_field') {
          const rg = ctx.createRadialGradient(c.dx, c.dy, c.inner_radius || 20, c.dx, c.dy, c.radius);
          rg.addColorStop(0, 'rgba(56,189,248,0.35)');
          rg.addColorStop(1, 'rgba(56,189,248,0.03)');
          ctx.fillStyle = rg;
          ctx.beginPath();
          ctx.arc(c.dx, c.dy, c.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = isSel ? '#ffffff' : '#38bdf8';
          ctx.lineWidth = (isSel ? 2.5 : 1.5) / zoom;
          ctx.stroke();
        } else if (c.kind === 'solid_core' || c.kind === 'rift_core' || c.kind === 'comet_core') {
          ctx.fillStyle = c.color_hex || '#334155';
          ctx.beginPath();
          ctx.arc(c.dx, c.dy, c.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = isSel ? '#ffffff' : isHov ? '#e2e8f0' : resColor;
          ctx.lineWidth = (isSel ? 3 : 2) / zoom;
          ctx.stroke();
        } else {
          // Solid rocks, resource nodes, craters, cave mouths
          drawPolygonRock(ctx, c.dx, c.dy, c.radius, idx + 1);
          ctx.fillStyle = c.is_node ? '#1e293b' : '#334155';
          ctx.fill();
          ctx.strokeStyle = isSel ? '#ffffff' : c.is_node ? resColor : isHov ? '#cbd5e1' : '#64748b';
          ctx.lineWidth = (isSel ? 3 : 1.8) / zoom;
          ctx.stroke();
        }

        if (c.is_node) {
          ctx.fillStyle = resColor;
          ctx.beginPath();
          ctx.arc(c.dx, c.dy, Math.max(6, Math.min(18, c.radius * 0.34)), 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = '#e2e8f0';
        ctx.font = `600 ${9 / zoom}px ui-monospace, monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(c.kind.toUpperCase(), c.dx, c.dy + c.radius + 11 / zoom);
        ctx.restore();
      }

      // 1W/2W Corridor Gap Overlay (for Belts & Clusters)
      if (showCorridorOverlay && !previewMotion) {
        const solids = blueprint.components.filter((c) => c.kind === 'solid_rock' || c.kind === 'resource_node');
        for (let i = 0; i < solids.length; i++) {
          for (let j = i + 1; j < solids.length; j++) {
            const a = solids[i];
            const b = solids[j];
            const centerDist = Math.hypot(b.dx - a.dx, b.dy - a.dy);
            const gap = centerDist - a.radius - b.radius;
            if (gap > 0 && gap < 140) {
              const passable1W2W = gap >= 48;
              ctx.strokeStyle = passable1W2W ? 'rgba(52,211,153,0.65)' : 'rgba(251,113,133,0.6)';
              ctx.lineWidth = 1.5 / zoom;
              ctx.setLineDash([4 / zoom, 3 / zoom]);
              ctx.beginPath();
              ctx.moveTo(a.dx, a.dy);
              ctx.lineTo(b.dx, b.dy);
              ctx.stroke();
              ctx.setLineDash([]);
              ctx.fillStyle = passable1W2W ? '#34d399' : '#fb7185';
              ctx.font = `700 ${9 / zoom}px ui-monospace, monospace`;
              ctx.textAlign = 'center';
              ctx.fillText(`${Math.round(gap)}px`, (a.dx + b.dx) / 2, (a.dy + b.dy) / 2);
            }
          }
        }
      }

      // Orbiting Moons Preview
      for (const ch of blueprint.orbitingChildren) {
        const childBp = allBlueprints.find((b) => b.blueprintId === ch.child_blueprint_id);
        const orbitAngle = ch.start_angle + tick * ch.orbit_speed;
        const mx = Math.cos(orbitAngle) * ch.orbit_radius;
        const my = Math.sin(orbitAngle) * ch.orbit_radius;
        const mr = (childBp ? childBp.boundingRadius * 0.65 : 34) * (ch.scale || 1);

        ctx.strokeStyle = 'rgba(251, 191, 36, 0.35)';
        ctx.lineWidth = 1.3 / zoom;
        ctx.setLineDash([6 / zoom, 5 / zoom]);
        ctx.beginPath();
        ctx.arc(0, 0, ch.orbit_radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#475569';
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2 / zoom;
        ctx.beginPath();
        ctx.arc(mx, my, mr, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#fde68a';
        ctx.font = `700 ${9 / zoom}px ui-monospace, monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(childBp?.name || `Moon #${ch.child_blueprint_id}`, mx, my + mr + 12 / zoom);
      }

      ctx.restore(); // end object frame

      // Live Test Shot Raycaster Overlay
      if (testShotMode && testRay) {
        const traced = traceTestShot(testRay.start, testRay.end, blueprint);
        if (traced.points.length >= 2) {
          ctx.strokeStyle =
            traced.outcome === 'blocked'
              ? '#f43f5e'
              : traced.outcome === 'refracted'
              ? '#38bdf8'
              : '#4ade80';
          ctx.lineWidth = 3 / zoom;
          ctx.beginPath();
          ctx.moveTo(traced.points[0].x, traced.points[0].y);
          for (let i = 1; i < traced.points.length; i++) {
            ctx.lineTo(traced.points[i].x, traced.points[i].y);
          }
          ctx.stroke();

          const last = traced.points[traced.points.length - 1];
          ctx.fillStyle = ctx.strokeStyle;
          ctx.beginPath();
          ctx.arc(last.x, last.y, 6 / zoom, 0, Math.PI * 2);
          ctx.fill();
          ctx.font = `800 ${11 / zoom}px ui-monospace, monospace`;
          ctx.fillText(traced.outcome.toUpperCase(), last.x + 12 / zoom, last.y - 8 / zoom);
        }
      }

      ctx.restore(); // end viewport transform
      ctx.restore(); // end dpr

      if (previewMotion) {
        rafId = requestAnimationFrame(draw);
      }
    };

    draw();
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [
    canvasSize,
    zoom,
    showShipGhost,
    showCorridorOverlay,
    previewMotion,
    testShotMode,
    testRay,
    blueprint,
    allBlueprints,
    boundingRadius,
    selectedIndex,
    hoveredIndex,
    resources,
  ]);

  const selected = selectedIndex !== null ? blueprint.components[selectedIndex] : null;

  return (
    <div className="relative flex flex-col flex-1 h-full bg-[#060a12] select-none overflow-hidden font-mono">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 text-xs text-slate-300 z-10">
        <div className="flex items-center gap-3">
          <span className="font-black text-sky-400 uppercase tracking-wide">
            Environment Canvas
          </span>
          <span className="text-slate-400">
            Wrap R: <strong className="text-sky-300">{boundingRadius}px</strong>
          </span>
          <span className="text-slate-400">
            Zoom: <strong className="text-slate-100">{Math.round(zoom * 100)}%</strong>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.4, Number((z - 0.15).toFixed(2))))}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 cursor-pointer"
          >
            -
          </button>
          <button
            type="button"
            onClick={() => setZoom(1.0)}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 cursor-pointer"
          >
            100%
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(2.0, Number((z + 0.15).toFixed(2))))}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 cursor-pointer"
          >
            +
          </button>

          <button
            type="button"
            onClick={() => setShowShipGhost((v) => !v)}
            className={`px-2 py-1 rounded border cursor-pointer ${
              showShipGhost
                ? 'bg-sky-500/20 border-sky-400/60 text-sky-300'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            Scale Ghost
          </button>

          <button
            type="button"
            onClick={() => setShowCorridorOverlay((v) => !v)}
            className={`px-2 py-1 rounded border cursor-pointer ${
              showCorridorOverlay
                ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-300'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            1W/2W Gaps
          </button>

          {canAttachMoons && (
            <button
              type="button"
              onClick={() => setMoonPanelOpen((v) => !v)}
              className={`px-2 py-1 rounded border cursor-pointer ${
                moonPanelOpen
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                  : 'bg-slate-800 border-slate-700 text-slate-300'
              }`}
            >
              Moons ({blueprint.orbitingChildren.length})
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setTestShotMode((v) => !v);
              setPreviewMotion(false);
            }}
            className={`px-2.5 py-1 rounded font-bold border cursor-pointer ${
              testShotMode
                ? 'bg-rose-500/20 border-rose-400 text-rose-300'
                : 'bg-slate-800 border-slate-700 text-slate-200'
            }`}
          >
            {testShotMode ? 'Exit Test Shot' : 'Test Shot Ray'}
          </button>

          <button
            type="button"
            onClick={() => {
              setPreviewMotion((v) => !v);
              setTestShotMode(false);
            }}
            className={`px-2.5 py-1 rounded font-bold border cursor-pointer ${
              previewMotion
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                : 'bg-slate-800 border-slate-700 text-slate-200'
            }`}
          >
            {previewMotion ? 'Stop Motion' : 'Preview Motion'}
          </button>
        </div>
      </div>

      {/* Canvas Container */}
      <div ref={containerRef} className="relative flex-1 w-full h-full">
        <canvas
          ref={canvasRef}
          style={{ width: canvasSize.width, height: canvasSize.height }}
          className={`block ${
            previewMotion
              ? 'cursor-default'
              : testShotMode
              ? 'cursor-crosshair'
              : hoveredIndex !== null
              ? 'cursor-grab'
              : 'cursor-crosshair'
          }`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          onContextMenu={(e) => e.preventDefault()}
        />

        {/* Orbiting Moon Attachment Popover */}
        {canAttachMoons && moonPanelOpen && (
          <div className="absolute top-3 right-3 w-72 p-3 rounded-lg bg-slate-900/95 border border-amber-500/50 shadow-2xl text-xs text-slate-200 z-20 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-black text-amber-300 uppercase">Orbiting Moons</span>
              <button
                type="button"
                disabled={moonBlueprints.length === 0}
                onClick={() => {
                  const first = moonBlueprints[0];
                  if (!first) return;
                  onChangeOrbitingChildren([
                    ...blueprint.orbitingChildren,
                    {
                      child_blueprint_id: first.blueprintId,
                      orbit_radius: Math.max(160, boundingRadius + 40),
                      orbit_speed: 0.004,
                      start_angle: 0,
                      scale: 0.85,
                    },
                  ]);
                }}
                className="px-2 py-0.5 rounded bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-black text-[10px] cursor-pointer"
              >
                + Attach Moon
              </button>
            </div>
            {moonBlueprints.length === 0 ? (
              <div className="text-[11px] text-slate-500">Save a Moon blueprint first to attach.</div>
            ) : blueprint.orbitingChildren.length === 0 ? (
              <div className="text-[11px] text-slate-500">No orbiting moons attached.</div>
            ) : (
              blueprint.orbitingChildren.map((ch, idx) => (
                <div key={idx} className="p-2 rounded bg-slate-950 border border-slate-800 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-1">
                    <select
                      value={ch.child_blueprint_id}
                      onChange={(e) => {
                        const next = blueprint.orbitingChildren.map((x, i) =>
                          i === idx ? { ...x, child_blueprint_id: Number(e.target.value) } : x
                        );
                        onChangeOrbitingChildren(next);
                      }}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[11px]"
                    >
                      {moonBlueprints.map((m) => (
                        <option key={m.blueprintId} value={m.blueprintId}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() =>
                        onChangeOrbitingChildren(blueprint.orbitingChildren.filter((_, i) => i !== idx))
                      }
                      className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] cursor-pointer"
                    >
                      ×
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-[10px]">
                    <label>
                      R
                      <input
                        type="number"
                        value={ch.orbit_radius}
                        onChange={(e) => {
                          const next = blueprint.orbitingChildren.map((x, i) =>
                            i === idx ? { ...x, orbit_radius: Math.max(60, Number(e.target.value) || 180) } : x
                          );
                          onChangeOrbitingChildren(next);
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-1 py-0.5"
                      />
                    </label>
                    <label>
                      Spd
                      <input
                        type="number"
                        step="0.001"
                        value={ch.orbit_speed}
                        onChange={(e) => {
                          const next = blueprint.orbitingChildren.map((x, i) =>
                            i === idx ? { ...x, orbit_speed: Number(e.target.value) || 0 } : x
                          );
                          onChangeOrbitingChildren(next);
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-1 py-0.5"
                      />
                    </label>
                    <label>
                      Scale
                      <input
                        type="number"
                        step="0.05"
                        value={ch.scale}
                        onChange={(e) => {
                          const next = blueprint.orbitingChildren.map((x, i) =>
                            i === idx ? { ...x, scale: Math.max(0.2, Number(e.target.value) || 1) } : x
                          );
                          onChangeOrbitingChildren(next);
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-1 py-0.5"
                      />
                    </label>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Hint bar */}
        <div className="pointer-events-none absolute bottom-3 left-3 px-2.5 py-1.5 rounded bg-slate-950/85 border border-slate-800 text-[11px] text-slate-400">
          {testShotMode
            ? 'Test Shot Mode: Click & drag from outside the object to trace cover blocking or Rift refraction'
            : previewMotion
            ? 'Live rigid drift, spin & orbiting moon preview'
            : 'Click empty space to place · Drag to move · Scroll to resize · Right-click or Del to remove'}
        </div>

        {/* Selected Component Bar */}
        {selected && selectedIndex !== null && !previewMotion && !testShotMode && (
          <div className="absolute bottom-3 right-3 flex flex-wrap items-center gap-2.5 px-3.5 py-2.5 rounded-lg bg-slate-900/95 border border-slate-700 shadow-xl text-xs text-slate-200 max-w-[70%]">
            <span className="text-slate-400">
              #{selectedIndex + 1} ({selected.dx},{selected.dy}) R={selected.radius}
            </span>

            <select
              value={selected.kind}
              onChange={(e) => patchComponent(selectedIndex, { kind: e.target.value as EnvComponentKind })}
              className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-100"
            >
              {COMPONENT_KINDS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>

            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={selected.is_node}
                onChange={(e) =>
                  patchComponent(selectedIndex, {
                    is_node: e.target.checked,
                    slot_tier: e.target.checked ? selected.slot_tier || 'common' : null,
                    pinned_resource: e.target.checked ? selected.pinned_resource : null,
                  })
                }
                className="accent-sky-400 cursor-pointer"
              />
              <span>Resource Slot</span>
            </label>

            {selected.is_node && (
              <>
                <select
                  value={selected.slot_tier || 'any'}
                  onChange={(e) =>
                    patchComponent(selectedIndex, { slot_tier: e.target.value as ClusterSlotTier })
                  }
                  className="bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-slate-100"
                >
                  <option value="common">Common</option>
                  <option value="mid">Mid</option>
                  <option value="rare">Rare</option>
                  <option value="any">Any</option>
                </select>

                <select
                  value={selected.pinned_resource || ''}
                  onChange={(e) =>
                    patchComponent(selectedIndex, { pinned_resource: e.target.value || null })
                  }
                  className="bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-slate-100"
                >
                  <option value="">Roll Tier</option>
                  {resourceList.map((r) => (
                    <option key={r.resourceKey} value={r.resourceKey}>
                      {r.displayName}
                    </option>
                  ))}
                </select>
              </>
            )}

            {blueprint.components.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  onChangeComponents(blueprint.components.filter((_, i) => i !== selectedIndex));
                  onSelectIndex(null);
                }}
                className="px-2 py-1 rounded bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 cursor-pointer"
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
