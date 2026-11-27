// src/components/casino/SpawnPoolManagerPanel.tsx
import React, { useCallback, useEffect, useState } from 'react';
import {
  ENV_OBJECT_TYPE_META,
  EnvBlueprint,
  SPEnvPoolEntry,
  deleteSPEnvPoolEntry,
  fetchEnvBlueprints,
  fetchSPEnvPool,
  saveSPEnvPoolEntry,
} from '../../services/envService';

export interface SpawnPoolManagerPanelProps {
  rulesetId: number;
  onOpenUniversalMapBuilder: () => void;
}

interface EditablePoolRow {
  poolId: number;
  rulesetId: number;
  blueprintId: number;
  spawnWeight: number;
  maxConcurrent: number;
  scaleOverride: string;
  speedMin: string;
  speedMax: string;
  minWraps: string;
  maxWraps: string;
  isEnabled: boolean;
  dirty: boolean;
}

function toEditableRow(entry: SPEnvPoolEntry): EditablePoolRow {
  return {
    poolId: entry.poolId,
    rulesetId: entry.rulesetId,
    blueprintId: entry.blueprintId,
    spawnWeight: entry.spawnWeight,
    maxConcurrent: entry.maxConcurrent,
    scaleOverride: entry.scaleOverride !== null && entry.scaleOverride !== undefined ? String(entry.scaleOverride) : '',
    speedMin: entry.speedMin !== null && entry.speedMin !== undefined ? String(entry.speedMin) : '',
    speedMax: entry.speedMax !== null && entry.speedMax !== undefined ? String(entry.speedMax) : '',
    minWraps: entry.minWraps !== null && entry.minWraps !== undefined ? String(entry.minWraps) : '',
    maxWraps: entry.maxWraps !== null && entry.maxWraps !== undefined ? String(entry.maxWraps) : '',
    isEnabled: entry.isEnabled,
    dirty: false,
  };
}

function parseOptionalFloat(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const v = Number(trimmed);
  return Number.isFinite(v) ? v : null;
}

function parseOptionalInt(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const v = Math.floor(Number(trimmed));
  return Number.isFinite(v) ? v : null;
}

export const SpawnPoolManagerPanel: React.FC<SpawnPoolManagerPanelProps> = ({
  rulesetId,
  onOpenUniversalMapBuilder,
}) => {
  const [blueprints, setBlueprints] = useState<EnvBlueprint[]>([]);
  const [rows, setRows] = useState<EditablePoolRow[]>([]);
  const [selectedBlueprintId, setSelectedBlueprintId] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [busyId, setBusyId] = useState<number | 'add' | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadPool = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [bpList, poolList] = await Promise.all([
        fetchEnvBlueprints(),
        fetchSPEnvPool(rulesetId),
      ]);
      setBlueprints(bpList);
      setRows(poolList.map(toEditableRow));
      setSelectedBlueprintId((prev) =>
        prev > 0 && bpList.some((b) => b.blueprintId === prev)
          ? prev
          : bpList[0]?.blueprintId ?? 0
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load Space Pirates spawn pool');
    } finally {
      setLoading(false);
    }
  }, [rulesetId]);

  useEffect(() => {
    loadPool();
  }, [loadPool]);

  const bpById = React.useMemo(() => {
    const m = new Map<number, EnvBlueprint>();
    for (const bp of blueprints) m.set(bp.blueprintId, bp);
    return m;
  }, [blueprints]);

  const patchRow = (poolId: number, patch: Partial<EditablePoolRow>) => {
    setRows((prev) =>
      prev.map((r) => (r.poolId === poolId ? { ...r, ...patch, dirty: true } : r))
    );
    setStatusMsg(null);
  };

  const handleAddBlueprint = async () => {
    if (!selectedBlueprintId) return;
    setBusyId('add');
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      const bp = bpById.get(selectedBlueprintId);
      const isGiant = bp?.objectType === 'gas_giant' || bp?.objectType === 'major_world';
      await saveSPEnvPoolEntry({
        rulesetId: rulesetId || 1,
        blueprintId: selectedBlueprintId,
        spawnWeight: isGiant ? 8 : 15,
        maxConcurrent: isGiant ? 1 : 2,
        scaleOverride: bp?.objectType === 'gas_giant' ? 0.65 : bp?.objectType === 'major_world' ? 0.6 : null,
        speedMin: null,
        speedMax: null,
        minWraps: null,
        maxWraps: null,
        isEnabled: true,
      });
      await loadPool();
      setStatusMsg(`Added "${bp?.name || `BP #${selectedBlueprintId}`}" to Space Pirates spawn pool.`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to add blueprint to pool');
    } finally {
      setBusyId(null);
    }
  };

  const handleSaveRow = async (row: EditablePoolRow) => {
    setBusyId(row.poolId);
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      await saveSPEnvPoolEntry({
        poolId: row.poolId,
        rulesetId: row.rulesetId || rulesetId || 1,
        blueprintId: row.blueprintId,
        spawnWeight: Math.max(1, Math.floor(row.spawnWeight) || 10),
        maxConcurrent: Math.max(1, Math.floor(row.maxConcurrent) || 1),
        scaleOverride: parseOptionalFloat(row.scaleOverride),
        speedMin: parseOptionalFloat(row.speedMin),
        speedMax: parseOptionalFloat(row.speedMax),
        minWraps: parseOptionalInt(row.minWraps),
        maxWraps: parseOptionalInt(row.maxWraps),
        isEnabled: row.isEnabled,
      });
      await loadPool();
      setStatusMsg(`Saved pool entry #${row.poolId} & refreshed live server EnvCache.`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save pool entry');
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteRow = async (poolId: number) => {
    setBusyId(poolId);
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      await deleteSPEnvPoolEntry(poolId);
      await loadPool();
      setStatusMsg(`Removed pool entry #${poolId}.`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to delete pool entry');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="rounded-xl bg-slate-950 border border-amber-500/35 overflow-hidden shadow-xl">
      <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-amber-400">
              Space Pirates Spawn Pool Manager
            </h3>
            <span className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-400/40 text-amber-300 text-[9px] font-black uppercase">
              sp_env_pool · {rows.filter((r) => r.isEnabled).length}/{rows.length} Active
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Add unlimited saved blueprints with custom drift speed, wrap counts, weights, concurrency &amp; scale.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenUniversalMapBuilder}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-sky-500/40 text-sky-300 text-[11px] font-bold uppercase cursor-pointer transition"
        >
          Author Blueprints in Map Builder &rarr;
        </button>
      </div>

      {/* Add Blueprint Bar */}
      <div className="px-4 py-3 bg-slate-900/40 border-b border-slate-800 flex flex-wrap items-center gap-2 text-xs">
        <select
          value={selectedBlueprintId}
          onChange={(e) => setSelectedBlueprintId(Number(e.target.value))}
          disabled={blueprints.length === 0}
          className="flex-1 min-w-[220px] px-2.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100"
        >
          {blueprints.length === 0 ? (
            <option value={0}>No blueprints in env_blueprints</option>
          ) : (
            blueprints.map((bp) => {
              const meta = ENV_OBJECT_TYPE_META[bp.objectType];
              return (
                <option key={bp.blueprintId} value={bp.blueprintId}>
                  [{meta.short}] {bp.name} (R:{Math.round(bp.boundingRadius)})
                </option>
              );
            })
          )}
        </select>

        <button
          type="button"
          disabled={!selectedBlueprintId || busyId === 'add'}
          onClick={handleAddBlueprint}
          className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-black uppercase text-xs cursor-pointer transition"
        >
          {busyId === 'add' ? 'Adding...' : '+ Add to Pool'}
        </button>
      </div>

      {errorMsg && (
        <div className="mx-4 mt-3 p-2.5 rounded bg-rose-500/15 border border-rose-500/50 text-rose-300 text-[11px]">
          {errorMsg}
        </div>
      )}
      {statusMsg && (
        <div className="mx-4 mt-3 p-2.5 rounded bg-emerald-500/15 border border-emerald-500/50 text-emerald-300 text-[11px]">
          {statusMsg}
        </div>
      )}

      {/* Pool Table */}
      <div className="p-4">
        {loading ? (
          <div className="text-center text-xs text-slate-500 py-6">Loading spawn pool...</div>
        ) : rows.length === 0 ? (
          <div className="text-center text-xs text-slate-500 py-6">
            No blueprints assigned to this ruleset pool yet. Select a blueprint above and click{' '}
            <span className="text-amber-300 font-bold">+ Add to Pool</span>.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {rows.map((row) => {
              const bp = bpById.get(row.blueprintId);
              const meta = bp ? ENV_OBJECT_TYPE_META[bp.objectType] : null;
              const isBusy = busyId === row.poolId;

              return (
                <div
                  key={row.poolId}
                  className={`p-3 rounded-lg border transition ${
                    row.isEnabled
                      ? 'bg-slate-900/75 border-slate-800'
                      : 'bg-slate-950/60 border-slate-800/60 opacity-65'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <input
                        type="checkbox"
                        checked={row.isEnabled}
                        onChange={(e) => patchRow(row.poolId, { isEnabled: e.target.checked })}
                        className="accent-cyan-400 w-4 h-4 cursor-pointer"
                        title="Toggle Enabled"
                      />
                      <span className="font-bold text-xs text-slate-100 truncate">
                        {bp?.name || `Blueprint #${row.blueprintId}`}
                      </span>
                      {meta && (
                        <span
                          className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-[9px] font-black uppercase"
                          style={{ color: meta.color }}
                        >
                          {meta.short}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-500">#{row.poolId}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleSaveRow(row)}
                        className={`px-2.5 py-1 rounded text-[10px] font-black uppercase cursor-pointer transition ${
                          row.dirty
                            ? 'bg-cyan-400 hover:bg-cyan-300 text-slate-950'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        }`}
                      >
                        {isBusy ? '...' : row.dirty ? 'Save *' : 'Save'}
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleDeleteRow(row.poolId)}
                        className="px-2 py-1 rounded bg-rose-500/15 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-[10px] font-bold uppercase cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  {/* Per-Entry Speed, Wraps, Weight, Max Concurrent, Scale Override */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-[10px]">
                    <label className="flex flex-col gap-0.5">
                      <span className="text-slate-500">Speed Min</span>
                      <input
                        type="number"
                        step="0.05"
                        min="0"
                        placeholder={bp ? String(bp.motionProfile.speed_min) : 'BP'}
                        value={row.speedMin}
                        onChange={(e) => patchRow(row.poolId, { speedMin: e.target.value })}
                        className="px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-100"
                      />
                    </label>
                    <label className="flex flex-col gap-0.5">
                      <span className="text-slate-500">Speed Max</span>
                      <input
                        type="number"
                        step="0.05"
                        min="0"
                        placeholder={bp ? String(bp.motionProfile.speed_max) : 'BP'}
                        value={row.speedMax}
                        onChange={(e) => patchRow(row.poolId, { speedMax: e.target.value })}
                        className="px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-100"
                      />
                    </label>
                    <label className="flex flex-col gap-0.5">
                      <span className="text-slate-500">Min Wraps</span>
                      <input
                        type="number"
                        min="0"
                        max="20"
                        placeholder={bp ? String(bp.motionProfile.min_wraps) : 'BP'}
                        value={row.minWraps}
                        onChange={(e) => patchRow(row.poolId, { minWraps: e.target.value })}
                        className="px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-100"
                      />
                    </label>
                    <label className="flex flex-col gap-0.5">
                      <span className="text-slate-500">Max Wraps</span>
                      <input
                        type="number"
                        min="0"
                        max="20"
                        placeholder={bp ? String(bp.motionProfile.max_wraps) : 'BP'}
                        value={row.maxWraps}
                        onChange={(e) => patchRow(row.poolId, { maxWraps: e.target.value })}
                        className="px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-100"
                      />
                    </label>
                    <label className="flex flex-col gap-0.5">
                      <span className="text-slate-500">Weight</span>
                      <input
                        type="number"
                        min="1"
                        max="500"
                        value={row.spawnWeight}
                        onChange={(e) =>
                          patchRow(row.poolId, {
                            spawnWeight: Math.max(1, Number(e.target.value) || 1),
                          })
                        }
                        className="px-2 py-1 rounded bg-slate-950 border border-slate-700 text-amber-300 font-bold"
                      />
                    </label>
                    <label className="flex flex-col gap-0.5">
                      <span className="text-slate-500">Max Active</span>
                      <input
                        type="number"
                        min="1"
                        max="12"
                        value={row.maxConcurrent}
                        onChange={(e) =>
                          patchRow(row.poolId, {
                            maxConcurrent: Math.max(1, Number(e.target.value) || 1),
                          })
                        }
                        className="px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-100"
                      />
                    </label>
                    <label className="flex flex-col gap-0.5">
                      <span className="text-slate-500">Scale</span>
                      <input
                        type="number"
                        step="0.05"
                        min="0.2"
                        max="3.0"
                        placeholder="Auto"
                        value={row.scaleOverride}
                        onChange={(e) => patchRow(row.poolId, { scaleOverride: e.target.value })}
                        className="px-2 py-1 rounded bg-slate-950 border border-slate-700 text-sky-300"
                      />
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
