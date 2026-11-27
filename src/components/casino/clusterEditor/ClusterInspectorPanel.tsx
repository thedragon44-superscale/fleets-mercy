// src/components/casino/clusterEditor/ClusterInspectorPanel.tsx
import React from 'react';
import {
  SPClusterVariant,
  computeClusterBoundingRadius,
} from '../../../services/clusterService';

export interface ClusterInspectorPanelProps {
  variant: SPClusterVariant;
  saving: boolean;
  dirty: boolean;
  statusMessage: string | null;
  errorMessage: string | null;
  onChange: (patch: Partial<SPClusterVariant>) => void;
  onSave: () => void;
  onDelete: () => void;
}

export const ClusterInspectorPanel: React.FC<ClusterInspectorPanelProps> = ({
  variant,
  saving,
  dirty,
  statusMessage,
  errorMessage,
  onChange,
  onSave,
  onDelete,
}) => {
  const boundingRadius = computeClusterBoundingRadius(variant.nodesLayout);
  const resourceSlots = variant.nodesLayout.filter((n) => n.is_node).length;
  const coverRocks = variant.nodesLayout.length - resourceSlots;

  const numField = (raw: string, fallback: number): number => {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  return (
    <aside className="w-80 shrink-0 h-full bg-slate-950 border-l border-slate-800 flex flex-col text-slate-200 font-mono overflow-y-auto">
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-sky-400">
            Cluster Inspector
          </h3>
          <p className="text-[10px] text-slate-500">
            {variant.variantId > 0 ? `PostgreSQL Variant #${variant.variantId}` : 'Unsaved Blueprint'}
          </p>
        </div>
        {dirty && (
          <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[10px] font-bold">
            UNSAVED
          </span>
        )}
      </div>

      <div className="p-4 flex flex-col gap-4 flex-1 text-xs">
        {/* Identity & Active Toggle */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
            Variant Name
          </label>
          <input
            type="text"
            value={variant.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="e.g. Obsidian Isotope Belt"
            className="w-full px-2.5 py-2 rounded bg-slate-900 border border-slate-700 focus:border-sky-400 focus:outline-none text-slate-100 text-xs"
          />

          <label className="flex items-center justify-between px-2.5 py-2 rounded bg-slate-900/70 border border-slate-800 cursor-pointer mt-1">
            <span className="text-[11px] font-bold text-slate-300">Enabled in Live Spawner</span>
            <input
              type="checkbox"
              checked={variant.isEnabled}
              onChange={(e) => onChange({ isEnabled: e.target.checked })}
              className="accent-sky-400 w-4 h-4 cursor-pointer"
            />
          </label>
        </div>

        {/* Computed Geometry Summary */}
        <div className="grid grid-cols-3 gap-2 p-2.5 rounded bg-slate-900/80 border border-slate-800 text-center">
          <div>
            <div className="text-[9px] uppercase text-slate-500">Wrap R</div>
            <div className="text-sm font-bold text-sky-300">{boundingRadius}px</div>
          </div>
          <div>
            <div className="text-[9px] uppercase text-slate-500">Nodes</div>
            <div className="text-sm font-bold text-emerald-300">{resourceSlots}</div>
          </div>
          <div>
            <div className="text-[9px] uppercase text-slate-500">Cover</div>
            <div className="text-sm font-bold text-slate-300">{coverRocks}</div>
          </div>
        </div>

        {/* Scale Range */}
        <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
            Scale Multiplier Range
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-500">Scale Min</span>
              <input
                type="number"
                step="0.05"
                min="0.4"
                max="2.5"
                value={variant.scaleMin}
                onChange={(e) => {
                  const v = Math.max(0.4, numField(e.target.value, variant.scaleMin));
                  onChange({ scaleMin: v, scaleMax: Math.max(v, variant.scaleMax) });
                }}
                className="px-2 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-100"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-500">Scale Max</span>
              <input
                type="number"
                step="0.05"
                min="0.4"
                max="2.5"
                value={variant.scaleMax}
                onChange={(e) => {
                  const v = Math.max(variant.scaleMin, numField(e.target.value, variant.scaleMax));
                  onChange({ scaleMax: v });
                }}
                className="px-2 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-100"
              />
            </label>
          </div>
        </div>

        {/* Drift Speed & Spin */}
        <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
            Drift Velocity & Rigid Spin
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-500">Speed Min (px/tick)</span>
              <input
                type="number"
                step="0.05"
                min="0.05"
                max="3.0"
                value={variant.speedMin}
                onChange={(e) => {
                  const v = Math.max(0.05, numField(e.target.value, variant.speedMin));
                  onChange({ speedMin: v, speedMax: Math.max(v, variant.speedMax) });
                }}
                className="px-2 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-100"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-500">Speed Max (px/tick)</span>
              <input
                type="number"
                step="0.05"
                min="0.05"
                max="3.0"
                value={variant.speedMax}
                onChange={(e) => {
                  const v = Math.max(variant.speedMin, numField(e.target.value, variant.speedMax));
                  onChange({ speedMax: v });
                }}
                className="px-2 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-100"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1 mt-1">
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>Spin Rate (rad/tick)</span>
              <span className="text-sky-300 font-bold">{variant.spinRate.toFixed(4)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="0.01"
              step="0.0005"
              value={variant.spinRate}
              onChange={(e) => onChange({ spinRate: numField(e.target.value, variant.spinRate) })}
              className="w-full accent-sky-400 cursor-pointer"
            />
          </label>
        </div>

        {/* Wrap Budget & Spawn Director Weights */}
        <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
            Wrap Lifecycle & Spawner Weights
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-500">Min Wraps</span>
              <input
                type="number"
                min="0"
                max="10"
                value={variant.minWraps}
                onChange={(e) => {
                  const v = Math.max(0, Math.floor(numField(e.target.value, variant.minWraps)));
                  onChange({ minWraps: v, maxWraps: Math.max(v, variant.maxWraps) });
                }}
                className="px-2 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-100"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-500">Max Wraps</span>
              <input
                type="number"
                min="0"
                max="10"
                value={variant.maxWraps}
                onChange={(e) => {
                  const v = Math.max(variant.minWraps, Math.floor(numField(e.target.value, variant.maxWraps)));
                  onChange({ maxWraps: v });
                }}
                className="px-2 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-100"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-500">Spawn Weight</span>
              <input
                type="number"
                min="1"
                max="500"
                value={variant.spawnWeight}
                onChange={(e) =>
                  onChange({
                    spawnWeight: Math.max(1, Math.floor(numField(e.target.value, variant.spawnWeight))),
                  })
                }
                className="px-2 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-100"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-500">Max Concurrent</span>
              <input
                type="number"
                min="1"
                max="10"
                value={variant.maxConcurrent}
                onChange={(e) =>
                  onChange({
                    maxConcurrent: Math.max(1, Math.floor(numField(e.target.value, variant.maxConcurrent))),
                  })
                }
                className="px-2 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-100"
              />
            </label>
          </div>
        </div>

        {/* Status / Error Feedback */}
        {errorMessage && (
          <div className="p-2.5 rounded bg-rose-500/15 border border-rose-500/50 text-rose-300 text-[11px]">
            {errorMessage}
          </div>
        )}
        {statusMessage && (
          <div className="p-2.5 rounded bg-emerald-500/15 border border-emerald-500/50 text-emerald-300 text-[11px]">
            {statusMessage}
          </div>
        )}
      </div>

      {/* Footer Save / Delete Actions */}
      <div className="p-4 border-t border-slate-800 flex flex-col gap-2 bg-slate-950">
        <button
          type="button"
          disabled={saving || !variant.name.trim() || variant.nodesLayout.length === 0}
          onClick={onSave}
          className="w-full py-2.5 rounded-lg font-black text-xs uppercase tracking-wider bg-sky-500 hover:bg-sky-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 transition cursor-pointer"
        >
          {saving ? 'Saving to PostgreSQL...' : 'Save Variant & Refresh Cache'}
        </button>

        {variant.variantId > 0 && (
          <button
            type="button"
            disabled={saving}
            onClick={onDelete}
            className="w-full py-2 rounded-lg font-bold text-[11px] uppercase tracking-wider bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 transition cursor-pointer"
          >
            Delete Saved Variant
          </button>
        )}
      </div>
    </aside>
  );
};
