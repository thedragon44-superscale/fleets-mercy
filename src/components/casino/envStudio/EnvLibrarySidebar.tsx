// src/components/casino/envStudio/EnvLibrarySidebar.tsx
import React, { useMemo, useState } from 'react';
import {
  ENV_OBJECT_TYPE_META,
  EnvBlueprint,
  EnvObjectType,
  ModeEnvPoolEntry,
} from '../../../services/envService';

export interface EnvLibrarySidebarProps {
  blueprints: EnvBlueprint[];
  poolsByBlueprint: Record<number, ModeEnvPoolEntry>;
  activeBlueprintId: number;
  loading: boolean;
  onSelect: (bp: EnvBlueprint) => void;
  onCreateNew: (objectType: EnvObjectType) => void;
  onDuplicate: (bp: EnvBlueprint) => void;
  onToggleEnabled: (bp: EnvBlueprint) => void;
  onDelete: (bp: EnvBlueprint) => void;
  onBack: () => void;
}

const ALL_TYPES: EnvObjectType[] = [
  'asteroid_cluster',
  'asteroid_belt',
  'nebula_field',
  'singularity_rift',
  'mineral_planetoid',
  'major_world',
  'gas_giant',
  'moon',
  'comet',
];

export const EnvLibrarySidebar: React.FC<EnvLibrarySidebarProps> = ({
  blueprints,
  poolsByBlueprint,
  activeBlueprintId,
  loading,
  onSelect,
  onCreateNew,
  onDuplicate,
  onToggleEnabled,
  onDelete,
  onBack,
}) => {
  const [filterType, setFilterType] = useState<'all' | EnvObjectType>('all');
  const [pickerOpen, setPickerOpen] = useState<boolean>(false);

  const filtered = useMemo(() => {
    if (filterType === 'all') return blueprints;
    return blueprints.filter((b) => b.objectType === filterType);
  }, [blueprints, filterType]);

  return (
    <aside className="w-76 shrink-0 h-full bg-slate-950 border-r border-slate-800 flex flex-col text-slate-200 font-mono">
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-xs font-black uppercase tracking-wider text-amber-400">
            Env Blueprint Library
          </h2>
          <p className="text-[10px] text-slate-500">env_blueprints (PostgreSQL)</p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold uppercase cursor-pointer"
        >
          &larr; Hub
        </button>
      </div>

      {/* New Blueprint Archetype Picker */}
      <div className="p-3 border-b border-slate-800">
        <button
          type="button"
          onClick={() => setPickerOpen((o) => !o)}
          className="w-full py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition cursor-pointer"
        >
          {pickerOpen ? 'Close Archetype Picker' : '+ New Celestial Blueprint'}
        </button>

        {pickerOpen && (
          <div className="mt-2 grid grid-cols-3 gap-1.5 p-2 rounded-lg bg-slate-900 border border-slate-700">
            {ALL_TYPES.map((t) => {
              const meta = ENV_OBJECT_TYPE_META[t];
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setPickerOpen(false);
                    onCreateNew(t);
                  }}
                  className="px-1.5 py-1.5 rounded bg-slate-950 hover:bg-slate-800 border border-slate-700 text-[10px] font-bold text-slate-200 cursor-pointer text-center"
                  style={{ borderLeftColor: meta.color, borderLeftWidth: 3 }}
                >
                  {meta.short}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Archetype Filter Tabs */}
      <div className="px-3 py-2 border-b border-slate-800 flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => setFilterType('all')}
          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase cursor-pointer ${
            filterType === 'all'
              ? 'bg-sky-500 text-slate-950'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200'
          }`}
        >
          All ({blueprints.length})
        </button>
        {ALL_TYPES.map((t) => {
          const meta = ENV_OBJECT_TYPE_META[t];
          const count = blueprints.filter((b) => b.objectType === t).length;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setFilterType(t)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                filterType === t
                  ? 'bg-sky-500 text-slate-950'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              {meta.short}
              {count > 0 ? ` (${count})` : ''}
            </button>
          );
        })}
      </div>

      {/* Blueprint Cards */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {loading ? (
          <div className="text-center text-xs text-slate-500 py-8">Loading blueprints...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-xs text-slate-500 py-8">No blueprints in filter.</div>
        ) : (
          filtered.map((bp) => {
            const isSelected = bp.blueprintId === activeBlueprintId;
            const meta = ENV_OBJECT_TYPE_META[bp.objectType];
            const pool = poolsByBlueprint[bp.blueprintId];
            const nodeCount = bp.components.filter((c) => c.is_node).length;

            return (
              <div
                key={bp.blueprintId}
                onClick={() => onSelect(bp)}
                className={`p-3 rounded-lg border cursor-pointer transition ${
                  isSelected
                    ? 'bg-sky-500/10 border-sky-400 shadow-md'
                    : 'bg-slate-900/70 border-slate-800 hover:border-slate-600'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-slate-100 leading-tight truncate">
                      {bp.name}
                    </div>
                    <span
                      className="inline-block mt-0.5 text-[9px] font-black uppercase tracking-wide"
                      style={{ color: meta.color }}
                    >
                      {meta.label}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                        pool?.isEnabled
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40'
                          : 'bg-slate-800 text-slate-500 border border-slate-700'
                      }`}
                    >
                      {pool?.isEnabled ? `SP W:${pool.spawnWeight}` : 'SP OFF'}
                    </span>
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 flex flex-wrap gap-x-2 gap-y-0.5 mb-2">
                  <span>{bp.components.length} parts</span>
                  {nodeCount > 0 && <span className="text-sky-300">· {nodeCount} nodes</span>}
                  {bp.orbitingChildren.length > 0 && (
                    <span className="text-amber-300">· {bp.orbitingChildren.length} moon</span>
                  )}
                  <span>· R:{Math.round(bp.boundingRadius)}</span>
                </div>

                <div
                  className="flex items-center gap-1.5 pt-2 border-t border-slate-800/80"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => onDuplicate(bp)}
                    className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 font-bold cursor-pointer"
                  >
                    Copy
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleEnabled(bp)}
                    className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 font-bold cursor-pointer"
                  >
                    {bp.isEnabled ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(bp)}
                    className="px-2 py-1 rounded bg-rose-500/10 hover:bg-rose-500/30 text-[10px] text-rose-300 font-bold cursor-pointer"
                  >
                    Del
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
