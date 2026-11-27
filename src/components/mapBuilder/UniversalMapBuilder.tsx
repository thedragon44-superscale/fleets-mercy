// src/components/mapBuilder/UniversalMapBuilder.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ENV_OBJECT_TYPE_META,
  EnvBlueprint,
  MapEnvPlacement,
  fetchEnvBlueprints,
  fetchMapEnvPlacements,
  saveMapEnvPlacements,
} from '../../services/envService';
import { MapDefinition, fetchMaps } from '../../services/mapService';

export interface UniversalMapBuilderProps {
  onExit: () => void;
}

interface EditorPlacement {
  localKey: string;
  placementId: number;
  blueprintId: number;
  posX: number;
  posY: number;
  scale: number;
  angle: number;
  velX: number;
  velY: number;
  parentKey: string | null;
  orbitRadius: number;
  orbitSpeed: number;
}

export const UniversalMapBuilder: React.FC<UniversalMapBuilderProps> = ({ onExit }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [maps, setMaps] = useState<MapDefinition[]>([]);
  const [selectedMapId, setSelectedMapId] = useState<number>(1);
  const [blueprints, setBlueprints] = useState<EnvBlueprint[]>([]);
  const [brushBlueprintId, setBrushBlueprintId] = useState<number | null>(null);

  const [placements, setPlacements] = useState<EditorPlacement[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [previewMotion, setPreviewMotion] = useState<boolean>(false);
  const [canvasSize, setCanvasSize] = useState({ width: 900, height: 600 });

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const draggingIdxRef = useRef<number | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const previewTickRef = useRef<number>(0);

  const bpById = useMemo(() => {
    const m = new Map<number, EnvBlueprint>();
    for (const b of blueprints) m.set(b.blueprintId, b);
    return m;
  }, [blueprints]);

  const activeMap = useMemo(
    () => maps.find((m) => m.id === selectedMapId) || null,
    [maps, selectedMapId]
  );

  const arenaW = activeMap && activeMap.width > 0 ? activeMap.width : 2400;
  const arenaH = activeMap && activeMap.height > 0 ? activeMap.height : 1600;

  const loadPlacements = useCallback(async (mapId: number) => {
    try {
      const list = await fetchMapEnvPlacements(mapId);
      const idToKey = new Map<number, string>();
      list.forEach((p, idx) => idToKey.set(p.placementId, `p_${p.placementId}_${idx}`));

      const mapped: EditorPlacement[] = list.map((p, idx) => ({
        localKey: idToKey.get(p.placementId) || `p_${idx}`,
        placementId: p.placementId,
        blueprintId: p.blueprintId,
        posX: p.posX,
        posY: p.posY,
        scale: p.scale || 1,
        angle: p.angle || 0,
        velX: p.velX || 0,
        velY: p.velY || 0,
        parentKey: p.parentPlacementId ? idToKey.get(p.parentPlacementId) || null : null,
        orbitRadius: p.orbitRadius || 0,
        orbitSpeed: p.orbitSpeed || 0,
      }));
      setPlacements(mapped);
      setSelectedIdx(mapped.length > 0 ? 0 : null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load map placements');
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([fetchMaps(), fetchEnvBlueprints()])
      .then(async ([mapList, bpList]) => {
        if (!mounted) return;
        setMaps(mapList || []);
        setBlueprints(bpList || []);
        if (bpList.length > 0) setBrushBlueprintId(bpList[0].blueprintId);
        const initialMapId = mapList && mapList.length > 0 ? mapList[0].id : 1;
        setSelectedMapId(initialMapId);
        await loadPlacements(initialMapId);
      })
      .catch((err) => {
        if (mounted) {
          setErrorMsg(err instanceof Error ? err.message : 'Failed to initialize Universal Map Builder');
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [loadPlacements]);

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

  const getTransform = useCallback(() => {
    const pad = 28;
    const scale = Math.min(
      (canvasSize.width - pad * 2) / arenaW,
      (canvasSize.height - pad * 2) / arenaH
    );
    const ox = (canvasSize.width - arenaW * scale) / 2;
    const oy = (canvasSize.height - arenaH * scale) / 2;
    return { scale, ox, oy };
  }, [canvasSize.width, canvasSize.height, arenaW, arenaH]);

  const screenToWorld = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const { scale, ox, oy } = getTransform();
      return {
        x: (clientX - rect.left - ox) / scale,
        y: (clientY - rect.top - oy) / scale,
      };
    },
    [getTransform]
  );

  const hitTestPlacement = useCallback(
    (wx: number, wy: number): number | null => {
      for (let i = placements.length - 1; i >= 0; i--) {
        const p = placements[i];
        const bp = bpById.get(p.blueprintId);
        const r = Math.max(35, (bp?.boundingRadius || 80) * p.scale * 0.75);
        if (Math.hypot(wx - p.posX, wy - p.posY) <= r) return i;
      }
      return null;
    },
    [placements, bpById]
  );

  const patchPlacement = useCallback((idx: number, patch: Partial<EditorPlacement>) => {
    setPlacements((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
    setStatusMsg(null);
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (previewMotion) return;
    const w = screenToWorld(e.clientX, e.clientY);

    if (e.button === 2) {
      const hit = hitTestPlacement(w.x, w.y);
      if (hit !== null) {
        const removedKey = placements[hit].localKey;
        setPlacements((prev) =>
          prev
            .filter((_, i) => i !== hit)
            .map((p) => (p.parentKey === removedKey ? { ...p, parentKey: null, orbitRadius: 0 } : p))
        );
        setSelectedIdx(null);
      }
      return;
    }
    if (e.button !== 0) return;

    const hit = hitTestPlacement(w.x, w.y);
    if (hit !== null) {
      draggingIdxRef.current = hit;
      dragOffsetRef.current = { x: w.x - placements[hit].posX, y: w.y - placements[hit].posY };
      setSelectedIdx(hit);
    } else if (brushBlueprintId !== null) {
      const clampedX = Math.max(40, Math.min(arenaW - 40, Math.round(w.x)));
      const clampedY = Math.max(40, Math.min(arenaH - 40, Math.round(w.y)));
      const created: EditorPlacement = {
        localKey: `new_${Date.now().toString(36)}_${placements.length}`,
        placementId: 0,
        blueprintId: brushBlueprintId,
        posX: clampedX,
        posY: clampedY,
        scale: 1.0,
        angle: 0,
        velX: 0,
        velY: 0,
        parentKey: null,
        orbitRadius: 0,
        orbitSpeed: 0,
      };
      setPlacements((prev) => [...prev, created]);
      setSelectedIdx(placements.length);
      draggingIdxRef.current = placements.length;
      dragOffsetRef.current = { x: 0, y: 0 };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (previewMotion || draggingIdxRef.current === null) return;
    const w = screenToWorld(e.clientX, e.clientY);
    const idx = draggingIdxRef.current;
    patchPlacement(idx, {
      posX: Math.max(20, Math.min(arenaW - 20, Math.round(w.x - dragOffsetRef.current.x))),
      posY: Math.max(20, Math.min(arenaH - 20, Math.round(w.y - dragOffsetRef.current.y))),
    });
  };

  const handleMouseUp = () => {
    draggingIdxRef.current = null;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (previewMotion) return;
    const w = screenToWorld(e.clientX, e.clientY);
    const target = hitTestPlacement(w.x, w.y) ?? selectedIdx;
    if (target !== null && placements[target]) {
      const delta = e.deltaY < 0 ? 0.08 : -0.08;
      const nextScale = Math.max(0.2, Math.min(3.0, Number((placements[target].scale + delta).toFixed(2))));
      patchPlacement(target, { scale: nextScale });
      setSelectedIdx(target);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      const keyToIndex = new Map<string, number>();
      placements.forEach((p, idx) => keyToIndex.set(p.localKey, idx));

      const payload: MapEnvPlacement[] = placements.map((p) => {
        const parentIdx = p.parentKey ? keyToIndex.get(p.parentKey) ?? null : null;
        return {
          placementId: p.placementId,
          mapId: selectedMapId,
          blueprintId: p.blueprintId,
          posX: p.posX,
          posY: p.posY,
          scale: p.scale,
          angle: p.angle,
          velX: p.velX,
          velY: p.velY,
          parentPlacementId: null,
          parentIndex: parentIdx,
          orbitRadius: p.orbitRadius,
          orbitSpeed: p.orbitSpeed,
        };
      });

      await saveMapEnvPlacements(selectedMapId, payload);
      await loadPlacements(selectedMapId);
      setStatusMsg(`Saved ${payload.length} universal placement(s) to map #${selectedMapId}.`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save map placements');
    } finally {
      setSaving(false);
    }
  };

  const handleExportJSON = () => {
    const blob = new Blob(
      [JSON.stringify({ mapId: selectedMapId, arenaW, arenaH, placements }, null, 2)],
      { type: 'application/json' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fleets-mercy-map-${selectedMapId}-env.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Render Arena Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;

    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== canvasSize.width * dpr || canvas.height !== canvasSize.height * dpr) {
        canvas.width = canvasSize.width * dpr;
        canvas.height = canvasSize.height * dpr;
      }

      if (previewMotion) previewTickRef.current++;
      else previewTickRef.current = 0;
      const tick = previewTickRef.current;

      const { scale, ox, oy } = getTransform();

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.fillStyle = '#03060c';
      ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

      ctx.save();
      ctx.translate(ox, oy);
      ctx.scale(scale, scale);

      ctx.fillStyle = '#070d1a';
      ctx.fillRect(0, 0, arenaW, arenaH);

      // Grid
      const step = arenaW > 5000 ? 1000 : 200;
      ctx.strokeStyle = 'rgba(56,189,248,0.08)';
      ctx.lineWidth = 1 / scale;
      for (let gx = step; gx < arenaW; gx += step) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, arenaH);
        ctx.stroke();
      }
      for (let gy = step; gy < arenaH; gy += step) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(arenaW, gy);
        ctx.stroke();
      }

      ctx.strokeStyle = 'rgba(56,189,248,0.45)';
      ctx.lineWidth = 2 / scale;
      ctx.strokeRect(0, 0, arenaW, arenaH);

      // Compute preview world coordinates (resolving parent-child orbital moons)
      const posByKey = new Map<string, { x: number; y: number }>();
      for (const p of placements) {
        if (!p.parentKey) {
          let x = p.posX + p.velX * tick;
          let y = p.posY + p.velY * tick;
          if (previewMotion) {
            x = ((x % arenaW) + arenaW) % arenaW;
            y = ((y % arenaH) + arenaH) % arenaH;
          }
          posByKey.set(p.localKey, { x, y });
        }
      }
      for (const p of placements) {
        if (p.parentKey) {
          const parentPos = posByKey.get(p.parentKey);
          if (parentPos && p.orbitRadius > 0) {
            const ang = p.angle + tick * (p.orbitSpeed || 0.005);
            posByKey.set(p.localKey, {
              x: parentPos.x + Math.cos(ang) * p.orbitRadius,
              y: parentPos.y + Math.sin(ang) * p.orbitRadius,
            });
          } else {
            posByKey.set(p.localKey, { x: p.posX, y: p.posY });
          }
        }
      }

      // Draw orbital paths first
      for (const p of placements) {
        if (p.parentKey && p.orbitRadius > 0) {
          const parentPos = posByKey.get(p.parentKey);
          if (parentPos) {
            ctx.strokeStyle = 'rgba(251,191,36,0.38)';
            ctx.lineWidth = 1.5 / scale;
            ctx.setLineDash([8 / scale, 6 / scale]);
            ctx.beginPath();
            ctx.arc(parentPos.x, parentPos.y, p.orbitRadius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }
      }

      // Draw placed blueprints
      placements.forEach((p, idx) => {
        const bp = bpById.get(p.blueprintId);
        const pos = posByKey.get(p.localKey) || { x: p.posX, y: p.posY };
        const meta = bp ? ENV_OBJECT_TYPE_META[bp.objectType] : null;
        const isSel = idx === selectedIdx;

        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate(p.angle + (previewMotion && bp ? bp.motionProfile.spin_rate * tick : 0));

        if (bp) {
          const ordered = [...bp.components].sort((a, b) => b.radius - a.radius);
          for (const c of ordered) {
            const cx = c.dx * p.scale;
            const cy = c.dy * p.scale;
            const cr = c.radius * p.scale;
            const col = c.color_hex || meta?.color || '#64748b';
            ctx.fillStyle =
              c.kind === 'nebula_blob' || c.kind === 'gas_outer' || c.kind === 'rift_field'
                ? `${col}33`
                : `${col}99`;
            ctx.strokeStyle = isSel ? '#ffffff' : col;
            ctx.lineWidth = (isSel ? 2.5 : 1.5) / scale;
            ctx.beginPath();
            ctx.arc(cx, cy, cr, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          }
        }

        if (isSel) {
          const br = (bp?.boundingRadius || 80) * p.scale;
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2 / scale;
          ctx.setLineDash([6 / scale, 4 / scale]);
          ctx.beginPath();
          ctx.arc(0, 0, br, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        ctx.restore();

        // Label
        ctx.fillStyle = isSel ? '#ffffff' : '#cbd5e1';
        ctx.font = `700 ${11 / scale}px ui-monospace, monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(bp?.name || `BP #${p.blueprintId}`, pos.x, pos.y + ((bp?.boundingRadius || 60) * p.scale) + 14 / scale);
      });

      ctx.restore();
      ctx.restore();

      if (previewMotion) {
        rafId = requestAnimationFrame(render);
      }
    };

    render();
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [canvasSize, arenaW, arenaH, placements, bpById, selectedIdx, previewMotion, getTransform]);

  const selected = selectedIdx !== null ? placements[selectedIdx] : null;

  return (
    <div className="fixed inset-0 w-screen h-screen flex bg-[#03060c] text-slate-100 font-mono overflow-hidden select-none">
      {/* Left Blueprint Palette */}
      <aside className="w-72 shrink-0 h-full bg-slate-950 border-r border-slate-800 flex flex-col">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-cyan-400">
              Universal Map Builder
            </h2>
            <p className="text-[10px] text-slate-500">All Modes · env_blueprints</p>
          </div>
          <button
            type="button"
            onClick={onExit}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-bold uppercase cursor-pointer"
          >
            &larr; Menu
          </button>
        </div>

        <div className="p-3 border-b border-slate-800 flex flex-col gap-1.5 text-xs">
          <label className="text-[10px] uppercase font-bold text-slate-400">Target Map</label>
          <select
            value={selectedMapId}
            onChange={(e) => {
              const id = Number(e.target.value);
              setSelectedMapId(id);
              loadPlacements(id);
            }}
            className="px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-100"
          >
            {maps.map((m) => (
              <option key={m.id} value={m.id}>
                #{m.id} — {m.name} ({m.width}×{m.height})
              </option>
            ))}
          </select>
        </div>

        <div className="px-3 pt-2.5 text-[10px] uppercase font-bold text-slate-500">
          Blueprint Brush (Click Canvas to Place)
        </div>
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1.5">
          {loading ? (
            <div className="text-center text-xs text-slate-500 py-8">Loading blueprints...</div>
          ) : (
            blueprints.map((bp) => {
              const meta = ENV_OBJECT_TYPE_META[bp.objectType];
              const active = brushBlueprintId === bp.blueprintId;
              return (
                <button
                  key={bp.blueprintId}
                  type="button"
                  onClick={() => setBrushBlueprintId(bp.blueprintId)}
                  className={`w-full text-left p-2.5 rounded-lg border cursor-pointer transition ${
                    active
                      ? 'bg-cyan-500/15 border-cyan-400'
                      : 'bg-slate-900/70 border-slate-800 hover:border-slate-600'
                  }`}
                >
                  <div className="text-xs font-bold text-slate-100 truncate">{bp.name}</div>
                  <div className="text-[10px] flex justify-between mt-0.5">
                    <span style={{ color: meta.color }}>{meta.label}</span>
                    <span className="text-slate-500">R:{Math.round(bp.boundingRadius)}</span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* Center Arena Canvas */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-3 text-slate-300">
            <span className="font-black text-cyan-300">{activeMap?.name || `Map #${selectedMapId}`}</span>
            <span className="text-slate-400">
              {arenaW}×{arenaH} · {placements.length} placed
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPreviewMotion((v) => !v)}
              className={`px-3 py-1 rounded font-bold border cursor-pointer ${
                previewMotion
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                  : 'bg-slate-800 border-slate-700 text-slate-200'
              }`}
            >
              {previewMotion ? 'Stop Motion' : 'Preview Orbits & Drift'}
            </button>
            <button
              type="button"
              onClick={handleExportJSON}
              className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold cursor-pointer"
            >
              Export JSON
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="px-3.5 py-1 rounded bg-cyan-400 hover:bg-cyan-300 disabled:opacity-40 text-slate-950 font-black uppercase cursor-pointer"
            >
              {saving ? 'Saving...' : 'Save Map Layout'}
            </button>
          </div>
        </div>

        <div ref={containerRef} className="relative flex-1 w-full h-full">
          <canvas
            ref={canvasRef}
            style={{ width: canvasSize.width, height: canvasSize.height }}
            className="block cursor-crosshair"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            onContextMenu={(e) => e.preventDefault()}
          />
          <div className="pointer-events-none absolute bottom-3 left-3 px-2.5 py-1.5 rounded bg-slate-950/85 border border-slate-800 text-[11px] text-slate-400">
            Click canvas to place blueprint · Drag to move · Scroll to scale · Right-click to remove
          </div>
        </div>
      </div>

      {/* Right Placement Inspector */}
      <aside className="w-76 shrink-0 h-full bg-slate-950 border-l border-slate-800 flex flex-col p-4 gap-4 text-xs overflow-y-auto">
        <div className="border-b border-slate-800 pb-2">
          <h3 className="text-xs font-black uppercase tracking-wider text-amber-400">
            Placement Inspector
          </h3>
        </div>

        {errorMsg && (
          <div className="p-2.5 rounded bg-rose-500/15 border border-rose-500/50 text-rose-300 text-[11px]">
            {errorMsg}
          </div>
        )}
        {statusMsg && (
          <div className="p-2.5 rounded bg-emerald-500/15 border border-emerald-500/50 text-emerald-300 text-[11px]">
            {statusMsg}
          </div>
        )}

        {selected && selectedIdx !== null ? (
          <div className="flex flex-col gap-3">
            <div className="font-bold text-slate-100">
              {bpById.get(selected.blueprintId)?.name || `Blueprint #${selected.blueprintId}`}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-[10px] text-slate-500">Pos X</span>
                <input
                  type="number"
                  value={Math.round(selected.posX)}
                  onChange={(e) => patchPlacement(selectedIdx, { posX: Number(e.target.value) || 0 })}
                  className="px-2 py-1 rounded bg-slate-900 border border-slate-700"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] text-slate-500">Pos Y</span>
                <input
                  type="number"
                  value={Math.round(selected.posY)}
                  onChange={(e) => patchPlacement(selectedIdx, { posY: Number(e.target.value) || 0 })}
                  className="px-2 py-1 rounded bg-slate-900 border border-slate-700"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-[10px] text-slate-500">Proportional Scale</span>
                <input
                  type="number"
                  step="0.05"
                  min="0.2"
                  max="3.0"
                  value={selected.scale}
                  onChange={(e) =>
                    patchPlacement(selectedIdx, { scale: Math.max(0.2, Number(e.target.value) || 1) })
                  }
                  className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-sky-300"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] text-slate-500">Angle (rad)</span>
                <input
                  type="number"
                  step="0.1"
                  value={Number(selected.angle.toFixed(2))}
                  onChange={(e) => patchPlacement(selectedIdx, { angle: Number(e.target.value) || 0 })}
                  className="px-2 py-1 rounded bg-slate-900 border border-slate-700"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-[10px] text-slate-500">Drift Vel X</span>
                <input
                  type="number"
                  step="0.1"
                  value={selected.velX}
                  onChange={(e) => patchPlacement(selectedIdx, { velX: Number(e.target.value) || 0 })}
                  className="px-2 py-1 rounded bg-slate-900 border border-slate-700"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] text-slate-500">Drift Vel Y</span>
                <input
                  type="number"
                  step="0.1"
                  value={selected.velY}
                  onChange={(e) => patchPlacement(selectedIdx, { velY: Number(e.target.value) || 0 })}
                  className="px-2 py-1 rounded bg-slate-900 border border-slate-700"
                />
              </label>
            </div>

            {/* Orbital Parent Link */}
            <div className="pt-2 border-t border-slate-800 flex flex-col gap-2">
              <span className="text-[10px] uppercase font-bold text-amber-300">
                Orbital Moon Link
              </span>
              <select
                value={selected.parentKey || ''}
                onChange={(e) => {
                  const key = e.target.value || null;
                  patchPlacement(selectedIdx, {
                    parentKey: key,
                    orbitRadius: key ? Math.max(120, selected.orbitRadius || 220) : 0,
                    orbitSpeed: key ? selected.orbitSpeed || 0.005 : 0,
                  });
                }}
                className="px-2 py-1.5 rounded bg-slate-900 border border-slate-700"
              >
                <option value="">Independent (No Parent)</option>
                {placements.map((other, oIdx) => {
                  if (oIdx === selectedIdx) return null;
                  const obp = bpById.get(other.blueprintId);
                  return (
                    <option key={other.localKey} value={other.localKey}>
                      Orbit #{oIdx + 1}: {obp?.name || `BP #${other.blueprintId}`}
                    </option>
                  );
                })}
              </select>

              {selected.parentKey && (
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] text-slate-500">Orbit R</span>
                    <input
                      type="number"
                      min="60"
                      value={selected.orbitRadius}
                      onChange={(e) =>
                        patchPlacement(selectedIdx, {
                          orbitRadius: Math.max(60, Number(e.target.value) || 200),
                        })
                      }
                      className="px-2 py-1 rounded bg-slate-900 border border-slate-700"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] text-slate-500">Orbit Spd</span>
                    <input
                      type="number"
                      step="0.001"
                      value={selected.orbitSpeed}
                      onChange={(e) =>
                        patchPlacement(selectedIdx, { orbitSpeed: Number(e.target.value) || 0 })
                      }
                      className="px-2 py-1 rounded bg-slate-900 border border-slate-700"
                    />
                  </label>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                const removedKey = selected.localKey;
                setPlacements((prev) =>
                  prev
                    .filter((_, i) => i !== selectedIdx)
                    .map((p) => (p.parentKey === removedKey ? { ...p, parentKey: null, orbitRadius: 0 } : p))
                );
                setSelectedIdx(null);
              }}
              className="mt-2 py-2 rounded bg-rose-500/15 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-bold uppercase cursor-pointer"
            >
              Remove Placement
            </button>
          </div>
        ) : (
          <div className="text-slate-500 text-xs">
            Select a placed object on the arena canvas to edit coordinates, scale, drift, or orbital links.
          </div>
        )}
      </aside>
    </div>
  );
};
