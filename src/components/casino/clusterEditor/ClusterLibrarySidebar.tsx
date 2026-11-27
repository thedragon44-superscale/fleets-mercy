// src/components/casino/clusterEditor/ClusterLibrarySidebar.tsx
import React from 'react';
import { SPClusterVariant } from '../../../services/clusterService';

export interface ClusterLibrarySidebarProps {
  variants: SPClusterVariant[];
  activeVariantId: number;
  loading: boolean;
  onSelect: (variant: SPClusterVariant) => void;
  onCreateNew: () => void;
  onDuplicate: (variant: SPClusterVariant) => void;
  onToggleEnabled: (variant: SPClusterVariant) => void;
  onDelete: (variant: SPClusterVariant) => void;
  onBack: () => void;
}

export const ClusterLibrarySidebar: React.FC<ClusterLibrarySidebarProps> = ({
  variants,
  activeVariantId,
  loading,
  onSelect,
  onCreateNew,
  onDuplicate,
  onToggleEnabled,
  onDelete,
  onBack,
}) => {
  return (
    <aside className="w-72 shrink-0 h-full bg-slate-950 border-r border-slate-800 flex flex-col text-slate-200 font-mono">
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-xs font-black uppercase tracking-wider text-amber-400">
            Cluster Library
          </h2>
          <p className="text-[10px] text-slate-500">sp_cluster_variants (PG)</p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold uppercase cursor-pointer"
        >
          &larr; Hub
        </button>
      </div>

      <div className="p-3 border-b border-slate-800">
        <button
          type="button"
          onClick={onCreateNew}
          className="w-full py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition cursor-pointer"
        >
          + New Asteroid Cluster
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {loading ? (
          <div className="text-center text-xs text-slate-500 py-8">
            Loading cluster blueprints...
          </div>
        ) : variants.length === 0 ? (
          <div className="text-center text-xs text-slate-500 py-8">
            No saved cluster variants yet.
          </div>
        ) : (
          variants.map((v) => {
            const isSelected = v.variantId === activeVariantId;
            const nodeCount = v.nodesLayout.filter((n) => n.is_node).length;
            const rockCount = v.nodesLayout.length;

            return (
              <div
                key={v.variantId}
                onClick={() => onSelect(v)}
                className={`p-3 rounded-lg border cursor-pointer transition ${
                  isSelected
                    ? 'bg-sky-500/10 border-sky-400 shadow-md'
                    : 'bg-slate-900/70 border-slate-800 hover:border-slate-600'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="font-bold text-xs text-slate-100 leading-tight break-words">
                    {v.name}
                  </div>
                  <span
                    className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                      v.isEnabled
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40'
                        : 'bg-slate-800 text-slate-500 border border-slate-700'
                    }`}
                  >
                    {v.isEnabled ? 'ON' : 'OFF'}
                  </span>
                </div>

                <div className="text-[10px] text-slate-400 flex flex-wrap gap-x-2 gap-y-0.5 mb-2">
                  <span>{rockCount} rocks</span>
                  <span>·</span>
                  <span className="text-sky-300">{nodeCount} slots</span>
                  <span>·</span>
                  <span>W:{v.spawnWeight}</span>
                  <span>·</span>
                  <span>R:{Math.round(v.boundingRadius)}</span>
                </div>

                <div
                  className="flex items-center gap-1.5 pt-2 border-t border-slate-800/80"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => onDuplicate(v)}
                    className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 font-bold cursor-pointer"
                  >
                    Duplicate
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleEnabled(v)}
                    className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 font-bold cursor-pointer"
                  >
                    {v.isEnabled ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(v)}
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
