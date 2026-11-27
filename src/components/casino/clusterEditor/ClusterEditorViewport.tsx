// src/components/casino/clusterEditor/ClusterEditorViewport.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ClusterNodeSpec,
  ClusterSlotTier,
  SPClusterVariant,
  SPResourceConfig,
  computeClusterBoundingRadius,
} from '../../../services/clusterService';

export interface ClusterEditorViewportProps {
  variant: SPClusterVariant;
  resources: Record<string, SPResourceConfig>;
  selectedNodeIndex: number | null;
  onSelectNode: (index: number | null) => void;
  onChangeNodes: (nodes: ClusterNodeSpec[]) => void;
}

const MIN_ROCK_RADIUS = 16;
const MAX_ROCK_RADIUS = 90;
const DEFAULT_ROCK_RADIUS = 34;

const TIER_COLORS: Record<string, string> = {
  common: '#d97706',
  mid: '#a855f7',
  rare: '#38bdf8',
  any: '#facc15',
};

function getNodeAccentColor(
  node: ClusterNodeSpec,
  resources: Record<string, SPResourceConfig>
): string {
  if (!node.is_node) return '#64748b';
  if (node.pinned_resource && resources[node.pinned_resource]) {
    return resources[node.pinned_resource].colorHex;
  }
  return TIER_COLORS[node.slot_tier || 'any'] || '#facc15';
}

function getNodeLabel(
  node: ClusterNodeSpec,
  resources: Record<string, SPResourceConfig>
): string {
  if (!node.is_node) return 'COVER';
  if (node.pinned_resource && resources[node.pinned_resource]) {
    return resources[node.pinned_resource].displayName.toUpperCase();
  }
  return (node.slot_tier || 'any').toUpperCase();
}

/** Deterministic jagged asteroid polygon for visual polish without random flicker. */
function drawAsteroidPolygon(
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
    const jitter = 0.86 + 0.14 * Math.sin(seed * 3.7 + i * 2.3) * Math.cos(seed * 1.9 - i * 1.1);
    const r = radius * jitter;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

export const ClusterEditorViewport: React.FC<ClusterEditorViewportProps> = ({
  variant,
  resources,
  selectedNodeIndex,
  onSelectNode,
  onChangeNodes,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number }>({
    width: 800,
    height: 560,
  });
  const [zoom, setZoom] = useState<number>(1.0);
  const [showShipGhost, setShowShipGhost] = useState<boolean>(true);
  const [previewMotion, setPreviewMotion] = useState<boolean>(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Drag tracking refs (zero React re-render lag during drag)
  const draggingIndexRef = useRef<number | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const didMoveRef = useRef<boolean>(false);

  // Live motion preview simulation state (kept in ref for 60fps animation)
  const previewStateRef = useRef<{ x: number; y: number; angle: number; vx: number; vy: number }>({
    x: 0,
    y: 0,
    angle: 0,
    vx: 0.45,
    vy: 0.2,
  });

  const boundingRadius = useMemo(
    () => computeClusterBoundingRadius(variant.nodesLayout),
    [variant.nodesLayout]
  );

  const resourceList = useMemo(
    () => Object.values(resources).sort((a, b) => a.enumCode - b.enumCode),
    [resources]
  );

  // Responsive canvas sizing via ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setCanvasSize({ width: Math.floor(rect.width), height: Math.floor(rect.height) });
      }
    };
    updateSize();

    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Reset preview drift vector when toggling Preview Motion on or changing speed
  useEffect(() => {
    if (!previewMotion) {
      previewStateRef.current = { x: 0, y: 0, angle: 0, vx: 0, vy: 0 };
      return;
    }
    const avgSpeed = Math.max(0.15, (variant.speedMin + variant.speedMax) / 2);
    const driftAngle = Math.PI * 0.12;
    previewStateRef.current = {
      x: 0,
      y: 0,
      angle: 0,
      vx: Math.cos(driftAngle) * avgSpeed * 1.8, // Slight visual boost for quick inspection
      vy: Math.sin(driftAngle) * avgSpeed * 1.8,
    };
  }, [previewMotion, variant.speedMin, variant.speedMax]);

  // Keyboard delete support for selected rock
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (previewMotion || selectedNodeIndex === null) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        const next = variant.nodesLayout.filter((_, i) => i !== selectedNodeIndex);
        onChangeNodes(next);
        onSelectNode(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewMotion, selectedNodeIndex, variant.nodesLayout, onChangeNodes, onSelectNode]);

  // Convert screen mouse coords to cluster local space
  const screenToLocal = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const sx = clientX - rect.left;
      const sy = clientY - rect.top;
      return {
        x: (sx - canvasSize.width / 2) / zoom,
        y: (sy - canvasSize.height / 2) / zoom,
      };
    },
    [canvasSize.width, canvasSize.height, zoom]
  );

  // Hit-test topmost rock at local coordinate
  const hitTestRock = useCallback(
    (lx: number, ly: number): number | null => {
      const nodes = variant.nodesLayout;
      for (let i = nodes.length - 1; i >= 0; i--) {
        const n = nodes[i];
        if (Math.hypot(lx - n.dx, ly - n.dy) <= n.radius + 4) {
          return i;
        }
      }
      return null;
    },
    [variant.nodesLayout]
  );

  const updateNodeAt = useCallback(
    (index: number, patch: Partial<ClusterNodeSpec>) => {
      const next = variant.nodesLayout.map((n, i) => (i === index ? { ...n, ...patch } : n));
      onChangeNodes(next);
    },
    [variant.nodesLayout, onChangeNodes]
  );

  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (previewMotion) return;
    if (e.button === 2) {
      // Right-click deletes rock under cursor
      const local = screenToLocal(e.clientX, e.clientY);
      const hit = hitTestRock(local.x, local.y);
      if (hit !== null) {
        const next = variant.nodesLayout.filter((_, i) => i !== hit);
        onChangeNodes(next);
        if (selectedNodeIndex === hit) onSelectNode(null);
        else if (selectedNodeIndex !== null && selectedNodeIndex > hit) {
          onSelectNode(selectedNodeIndex - 1);
        }
      }
      return;
    }
    if (e.button !== 0) return;

    const local = screenToLocal(e.clientX, e.clientY);
    const hit = hitTestRock(local.x, local.y);
    didMoveRef.current = false;

    if (hit !== null) {
      draggingIndexRef.current = hit;
      dragOffsetRef.current = {
        x: local.x - variant.nodesLayout[hit].dx,
        y: local.y - variant.nodesLayout[hit].dy,
      };
      onSelectNode(hit);
    } else {
      // Click-to-place a new tactical cover rock
      const newRock: ClusterNodeSpec = {
        dx: Math.round(local.x),
        dy: Math.round(local.y),
        radius: DEFAULT_ROCK_RADIUS,
        is_node: false,
        slot_tier: null,
        pinned_resource: null,
      };
      const next = [...variant.nodesLayout, newRock];
      onChangeNodes(next);
      onSelectNode(next.length - 1);
      draggingIndexRef.current = next.length - 1;
      dragOffsetRef.current = { x: 0, y: 0 };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (previewMotion) return;
    const local = screenToLocal(e.clientX, e.clientY);

    if (draggingIndexRef.current !== null) {
      didMoveRef.current = true;
      const idx = draggingIndexRef.current;
      const clampedX = Math.max(-420, Math.min(420, Math.round(local.x - dragOffsetRef.current.x)));
      const clampedY = Math.max(-320, Math.min(320, Math.round(local.y - dragOffsetRef.current.y)));
      updateNodeAt(idx, { dx: clampedX, dy: clampedY });
      return;
    }

    setHoveredIndex(hitTestRock(local.x, local.y));
  };

  const handleMouseUp = () => {
    draggingIndexRef.current = null;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (previewMotion) return;

    const local = screenToLocal(e.clientX, e.clientY);
    const targetIdx = hitTestRock(local.x, local.y) ?? selectedNodeIndex;

    if (targetIdx !== null && variant.nodesLayout[targetIdx]) {
      const delta = e.deltaY < 0 ? 3 : -3;
      const nextRadius = Math.max(
        MIN_ROCK_RADIUS,
        Math.min(MAX_ROCK_RADIUS, Math.round(variant.nodesLayout[targetIdx].radius + delta))
      );
      updateNodeAt(targetIdx, { radius: nextRadius });
      if (selectedNodeIndex !== targetIdx) onSelectNode(targetIdx);
    } else {
      // Zoom viewport when scrolling on empty space with nothing selected
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      setZoom((prev) => Math.max(0.5, Math.min(2.0, Number((prev * factor).toFixed(2)))));
    }
  };

  // Main 2D Canvas render loop (runs continuously when previewMotion is active, or on state change)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;

    const renderFrame = () => {
      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== canvasSize.width * dpr || canvas.height !== canvasSize.height * dpr) {
        canvas.width = canvasSize.width * dpr;
        canvas.height = canvasSize.height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // Background
      ctx.fillStyle = '#070b14';
      ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

      const cx = canvasSize.width / 2;
      const cy = canvasSize.height / 2;

      // Step motion preview if enabled
      let offsetX = 0;
      let offsetY = 0;
      let rotAngle = 0;
      if (previewMotion) {
        const st = previewStateRef.current;
        st.x += st.vx;
        st.y += st.vy;
        st.angle += variant.spinRate;

        const halfW = canvasSize.width / (2 * zoom) + boundingRadius;
        const halfH = canvasSize.height / (2 * zoom) + boundingRadius;
        if (st.x > halfW) st.x = -halfW;
        if (st.x < -halfW) st.x = halfW;
        if (st.y > halfH) st.y = -halfH;
        if (st.y < -halfH) st.y = halfH;

        offsetX = st.x;
        offsetY = st.y;
        rotAngle = st.angle;
      }

      // Draw local-space grid
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(zoom, zoom);

      const gridExtentX = Math.ceil(canvasSize.width / (2 * zoom) / 50) * 50 + 50;
      const gridExtentY = Math.ceil(canvasSize.height / (2 * zoom) / 50) * 50 + 50;

      ctx.lineWidth = 1 / zoom;
      for (let gx = -gridExtentX; gx <= gridExtentX; gx += 50) {
        ctx.strokeStyle = gx === 0 ? 'rgba(56, 189, 248, 0.28)' : gx % 100 === 0 ? 'rgba(148, 163, 184, 0.14)' : 'rgba(148, 163, 184, 0.06)';
        ctx.beginPath();
        ctx.moveTo(gx, -gridExtentY);
        ctx.lineTo(gx, gridExtentY);
        ctx.stroke();
      }
      for (let gy = -gridExtentY; gy <= gridExtentY; gy += 50) {
        ctx.strokeStyle = gy === 0 ? 'rgba(56, 189, 248, 0.28)' : gy % 100 === 0 ? 'rgba(148, 163, 184, 0.14)' : 'rgba(148, 163, 184, 0.06)';
        ctx.beginPath();
        ctx.moveTo(-gridExtentX, gy);
        ctx.lineTo(gridExtentX, gy);
        ctx.stroke();
      }

      // Ship Scale Reference Ghosts (top-left of local origin when not previewing motion)
      if (showShipGhost && !previewMotion) {
        const ghostX = -boundingRadius - 95;
        const ghosts: Array<{ label: string; y: number; r: number; color: string }> = [
          { label: '1W Viper (21px)', y: -70, r: 21.5, color: 'rgba(56, 189, 248, 0.45)' },
          { label: '3W Cryo / Barge (28px)', y: 0, r: 28.5, color: 'rgba(168, 85, 247, 0.45)' },
          { label: '5W Flagship (35px)', y: 80, r: 35.5, color: 'rgba(248, 113, 113, 0.45)' },
        ];

        for (const g of ghosts) {
          ctx.save();
          ctx.translate(ghostX, g.y);
          ctx.strokeStyle = g.color;
          ctx.fillStyle = g.color.replace('0.45', '0.12');
          ctx.lineWidth = 1.5 / zoom;
          ctx.setLineDash([4 / zoom, 3 / zoom]);
          ctx.beginPath();
          ctx.arc(0, 0, g.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.setLineDash([]);

          // Directional nose chevron
          ctx.beginPath();
          ctx.moveTo(g.r * 0.75, 0);
          ctx.lineTo(-g.r * 0.55, -g.r * 0.5);
          ctx.lineTo(-g.r * 0.25, 0);
          ctx.lineTo(-g.r * 0.55, g.r * 0.5);
          ctx.closePath();
          ctx.stroke();

          ctx.fillStyle = 'rgba(226, 232, 240, 0.7)';
          ctx.font = `${11 / zoom}px ui-monospace, SFMono-Regular, monospace`;
          ctx.textAlign = 'center';
          ctx.fillText(g.label, 0, g.r + 14 / zoom);
          ctx.restore();
        }
      }

      // Transform into rigid cluster frame
      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.rotate(rotAngle);

      // Enclosing Bounding Radius Ring (exact whole-cluster wrap boundary)
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
      ctx.lineWidth = 1.5 / zoom;
      ctx.setLineDash([8 / zoom, 6 / zoom]);
      ctx.beginPath();
      ctx.arc(0, 0, boundingRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Max-scale outer envelope preview
      if (variant.scaleMax > 1.01) {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
        ctx.beginPath();
        ctx.arc(0, 0, boundingRadius * variant.scaleMax, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // Origin anchor dot
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(0, 0, 3.5 / zoom, 0, Math.PI * 2);
      ctx.fill();

      // Draw Asteroid Rocks & Resource Node Slots
      variant.nodesLayout.forEach((node, idx) => {
        const isSelected = !previewMotion && idx === selectedNodeIndex;
        const isHovered = !previewMotion && idx === hoveredIndex;
        const accent = getNodeAccentColor(node, resources);

        // Harvester standoff guide ring for selected resource nodes
        if (node.is_node && isSelected) {
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.28)';
          ctx.lineWidth = 1.2 / zoom;
          ctx.setLineDash([4 / zoom, 4 / zoom]);
          ctx.beginPath();
          ctx.arc(node.dx, node.dy, node.radius + 52, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Glow for resource nodes
        if (node.is_node) {
          ctx.save();
          ctx.shadowColor = accent;
          ctx.shadowBlur = 18;
          drawAsteroidPolygon(ctx, node.dx, node.dy, node.radius, idx + 1);
          ctx.fillStyle = '#1e293b';
          ctx.fill();
          ctx.restore();
        }

        // Main rock body
        drawAsteroidPolygon(ctx, node.dx, node.dy, node.radius, idx + 1);
        ctx.fillStyle = node.is_node ? '#1e293b' : '#334155';
        ctx.fill();
        ctx.lineWidth = (isSelected ? 3 : isHovered ? 2.2 : 1.5) / zoom;
        ctx.strokeStyle = isSelected ? '#ffffff' : node.is_node ? accent : isHovered ? '#cbd5e1' : '#64748b';
        ctx.stroke();

        // Inner crystalline core if unlimited resource slot
        if (node.is_node) {
          ctx.fillStyle = accent;
          ctx.globalAlpha = 0.85;
          ctx.beginPath();
          ctx.arc(node.dx, node.dy, Math.max(6, node.radius * 0.36), 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1.0;
        }

        // Exact collision circle hint on hover/selection
        if (isSelected || isHovered) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
          ctx.lineWidth = 1 / zoom;
          ctx.beginPath();
          ctx.arc(node.dx, node.dy, node.radius, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Label (un-rotated text readability)
        ctx.save();
        ctx.translate(node.dx, node.dy);
        ctx.rotate(-rotAngle);
        ctx.fillStyle = '#f8fafc';
        ctx.font = `600 ${10 / zoom}px ui-monospace, SFMono-Regular, monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(getNodeLabel(node, resources), 0, node.radius + 12 / zoom);
        ctx.restore();
      });

      ctx.restore(); // end cluster transform
      ctx.restore(); // end viewport transform
      ctx.restore(); // end dpr scale

      if (previewMotion) {
        rafId = requestAnimationFrame(renderFrame);
      }
    };

    renderFrame();
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [
    canvasSize,
    zoom,
    showShipGhost,
    previewMotion,
    variant.nodesLayout,
    variant.spinRate,
    variant.scaleMax,
    boundingRadius,
    selectedNodeIndex,
    hoveredIndex,
    resources,
  ]);

  const selectedNode =
    selectedNodeIndex !== null && variant.nodesLayout[selectedNodeIndex]
      ? variant.nodesLayout[selectedNodeIndex]
      : null;

  return (
    <div className="relative flex flex-col flex-1 h-full bg-[#070b14] select-none overflow-hidden">
      {/* Top Viewport Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 text-xs text-slate-300 z-10">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-sky-400 tracking-wide uppercase">
            Cluster Local Canvas
          </span>
          <span className="text-slate-400">
            Rocks: <strong className="text-slate-100">{variant.nodesLayout.length}</strong>
          </span>
          <span className="text-slate-400">
            Wrap Radius: <strong className="text-sky-300">{boundingRadius}px</strong>
          </span>
          <span className="text-slate-400">
            Zoom: <strong className="text-slate-100">{Math.round(zoom * 100)}%</strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.15).toFixed(2))))}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 cursor-pointer"
          >
            -
          </button>
          <button
            type="button"
            onClick={() => setZoom(1.0)}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 cursor-pointer"
          >
            100%
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(2.0, Number((z + 0.15).toFixed(2))))}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 cursor-pointer"
          >
            +
          </button>

          <button
            type="button"
            onClick={() => setShowShipGhost((v) => !v)}
            className={`px-2.5 py-1 rounded border cursor-pointer transition ${
              showShipGhost
                ? 'bg-sky-500/20 border-sky-400/60 text-sky-300'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            Ship Scale Ghost
          </button>

          <button
            type="button"
            onClick={() => setPreviewMotion((v) => !v)}
            className={`px-3 py-1 rounded font-semibold border cursor-pointer transition ${
              previewMotion
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
            }`}
          >
            {previewMotion ? 'Stop Motion Preview' : 'Preview Drift & Spin'}
          </button>
        </div>
      </div>

      {/* Interactive 2D Canvas */}
      <div ref={containerRef} className="relative flex-1 w-full h-full">
        <canvas
          ref={canvasRef}
          style={{ width: canvasSize.width, height: canvasSize.height }}
          className={`block ${previewMotion ? 'cursor-default' : hoveredIndex !== null ? 'cursor-grab' : 'cursor-crosshair'}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          onContextMenu={(e) => e.preventDefault()}
        />

        {/* Hint overlay */}
        <div className="pointer-events-none absolute bottom-3 left-3 px-2.5 py-1.5 rounded bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400">
          {previewMotion
            ? 'Live rigid-body drift & spin preview (editing paused)'
            : 'Click empty space to add rock · Drag to move · Scroll to resize · Right-click or Del to remove'}
        </div>

        {/* Selected Rock Floating Bar */}
        {selectedNode && selectedNodeIndex !== null && !previewMotion && (
          <div className="absolute bottom-3 right-3 flex flex-wrap items-center gap-3 px-3.5 py-2.5 rounded-lg bg-slate-900/95 border border-slate-700 shadow-xl text-xs text-slate-200">
            <span className="font-mono text-slate-400">
              Rock #{selectedNodeIndex + 1} ({selectedNode.dx}, {selectedNode.dy}) · R={selectedNode.radius}px
            </span>

            {/* Cover vs Resource Node Toggle */}
            <div className="flex rounded overflow-hidden border border-slate-700">
              <button
                type="button"
                onClick={() =>
                  updateNodeAt(selectedNodeIndex, {
                    is_node: false,
                    slot_tier: null,
                    pinned_resource: null,
                  })
                }
                className={`px-2.5 py-1 cursor-pointer ${
                  !selectedNode.is_node
                    ? 'bg-slate-600 text-white font-semibold'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Cover Rock
              </button>
              <button
                type="button"
                onClick={() =>
                  updateNodeAt(selectedNodeIndex, {
                    is_node: true,
                    slot_tier: selectedNode.slot_tier ?? 'common',
                  })
                }
                className={`px-2.5 py-1 cursor-pointer ${
                  selectedNode.is_node
                    ? 'bg-sky-600 text-white font-semibold'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Resource Slot
              </button>
            </div>

            {selectedNode.is_node && (
              <>
                <label className="flex items-center gap-1.5">
                  <span className="text-slate-400">Tier:</span>
                  <select
                    value={selectedNode.slot_tier || 'any'}
                    onChange={(e) =>
                      updateNodeAt(selectedNodeIndex, {
                        slot_tier: e.target.value as ClusterSlotTier,
                      })
                    }
                    className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-100"
                  >
                    <option value="common">Common</option>
                    <option value="mid">Mid</option>
                    <option value="rare">Rare</option>
                    <option value="any">Any</option>
                  </select>
                </label>

                <label className="flex items-center gap-1.5">
                  <span className="text-slate-400">Pin:</span>
                  <select
                    value={selectedNode.pinned_resource || ''}
                    onChange={(e) =>
                      updateNodeAt(selectedNodeIndex, {
                        pinned_resource: e.target.value || null,
                      })
                    }
                    className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-100"
                  >
                    <option value="">Roll by Tier</option>
                    {resourceList.map((r) => (
                      <option key={r.resourceKey} value={r.resourceKey}>
                        {r.displayName} ({r.tier})
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}

            <button
              type="button"
              onClick={() => {
                const next = variant.nodesLayout.filter((_, i) => i !== selectedNodeIndex);
                onChangeNodes(next);
                onSelectNode(null);
              }}
              className="px-2 py-1 rounded bg-rose-600/20 hover:bg-rose-600/40 border border-rose-500/50 text-rose-300 cursor-pointer"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
