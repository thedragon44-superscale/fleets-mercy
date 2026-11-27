// src/components/casino/envStudio/EnvInspectorPanel.tsx
import React from 'react';
import {
  ENV_OBJECT_TYPE_META,
  EnvBlueprint,
  EnvMotionMode,
  EnvMotionProfile,
  EnvPhysicsProfile,
  ProjectileBehavior,
  computeEnvBoundingRadius,
} from '../../../services/envService';

export interface EnvInspectorPanelProps {
  blueprint: EnvBlueprint;
  allBlueprints: EnvBlueprint[];
  saving: boolean;
  dirty: boolean;
  statusMessage: string | null;
  errorMessage: string | null;
  onChangeBlueprint: (patch: Partial<EnvBlueprint>) => void;
  onSave: () => void;
  onDelete: () => void;
}

const IMMUNITY_OPTIONS = ['plasma_skimmer', 'grav_extractor', 'mining_barge', 'flagship'];

export const EnvInspectorPanel: React.FC<EnvInspectorPanelProps> = ({
  blueprint,
  allBlueprints,
  saving,
  dirty,
  statusMessage,
  errorMessage,
  onChangeBlueprint,
  onSave,
  onDelete,
}) => {
  const boundingRadius = computeEnvBoundingRadius(blueprint, allBlueprints);
  const meta = ENV_OBJECT_TYPE_META[blueprint.objectType];
  const phys = blueprint.physicsProfile;
  const mot = blueprint.motionProfile;

  const num = (raw: string, fallback: number): number => {
    const v = Number(raw);
    return Number.isFinite(v) ? v : fallback;
  };

  const patchPhysics = (p: Partial<EnvPhysicsProfile>) =>
    onChangeBlueprint({ physicsProfile: { ...phys, ...p } });

  const patchMotion = (m: Partial<EnvMotionProfile>) =>
    onChangeBlueprint({ motionProfile: { ...mot, ...m } });

  const toggleImmunity = (unitClass: string) => {
    const cur = phys.immune_unit_classes || [];
    const next = cur.includes(unitClass)
      ? cur.filter((x) => x !== unitClass)
      : [...cur, unitClass];
    patchPhysics({ immune_unit_classes: next });
  };

  return (
    <aside className="w-84 shrink-0 h-full bg-slate-950 border-l border-slate-800 flex flex-col text-slate-200 font-mono overflow-y-auto">
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider" style={{ color: meta.color }}>
            {meta.label} Inspector
          </h3>
          <p className="text-[10px] text-slate-500">
            {blueprint.blueprintId > 0 ? `Blueprint #${blueprint.blueprintId}` : 'Unsaved Blueprint'} · R={boundingRadius}px
          </p>
        </div>
        {dirty && (
          <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[10px] font-bold">
            UNSAVED
          </span>
        )}
      </div>

      <div className="p-4 flex flex-col gap-4 flex-1 text-xs">
        {/* Identity */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
            Blueprint Name
          </label>
          <input
            type="text"
            value={blueprint.name}
            onChange={(e) => onChangeBlueprint({ name: e.target.value })}
            className="w-full px-2.5 py-2 rounded bg-slate-900 border border-slate-700 focus:border-sky-400 focus:outline-none text-slate-100 text-xs"
          />
        </div>

        {/* Motion Profile */}
        <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
            Motion &amp; Proportional Scale
          </div>
          <select
            value={mot.mode}
            onChange={(e) => patchMotion({ mode: e.target.value as EnvMotionMode })}
            className="px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-100"
          >
            <option value="drift_wrap">Drift &amp; Whole-Object Wrap</option>
            <option value="static">Static Landmark</option>
            <option value="orbital">Orbital Child</option>
            <option value="transient_transit">Transient Transit (Comet)</option>
          </select>

          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-500">Scale Min</span>
              <input
                type="number"
                step="0.05"
                min="0.25"
                max="3.0"
                value={mot.scale_min}
                onChange={(e) => {
                  const v = Math.max(0.25, num(e.target.value, mot.scale_min));
                  patchMotion({ scale_min: v, scale_max: Math.max(v, mot.scale_max) });
                }}
                className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-500">Scale Max</span>
              <input
                type="number"
                step="0.05"
                min="0.25"
                max="3.0"
                value={mot.scale_max}
                onChange={(e) =>
                  patchMotion({ scale_max: Math.max(mot.scale_min, num(e.target.value, mot.scale_max)) })
                }
                className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-500">Speed Min</span>
              <input
                type="number"
                step="0.05"
                min="0"
                max="15"
                value={mot.speed_min}
                onChange={(e) => {
                  const v = Math.max(0, num(e.target.value, mot.speed_min));
                  patchMotion({ speed_min: v, speed_max: Math.max(v, mot.speed_max) });
                }}
                className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-500">Speed Max</span>
              <input
                type="number"
                step="0.05"
                min="0"
                max="15"
                value={mot.speed_max}
                onChange={(e) =>
                  patchMotion({ speed_max: Math.max(mot.speed_min, num(e.target.value, mot.speed_max)) })
                }
                className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100"
              />
            </label>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-500">Spin</span>
              <input
                type="number"
                step="0.0005"
                min="0"
                max="0.1"
                value={mot.spin_rate}
                onChange={(e) => patchMotion({ spin_rate: Math.max(0, num(e.target.value, mot.spin_rate)) })}
                className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-500">Min Wraps</span>
              <input
                type="number"
                min="0"
                max="10"
                value={mot.min_wraps}
                onChange={(e) => {
                  const v = Math.max(0, Math.floor(num(e.target.value, mot.min_wraps)));
                  patchMotion({ min_wraps: v, max_wraps: Math.max(v, mot.max_wraps) });
                }}
                className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-500">Max Wraps</span>
              <input
                type="number"
                min="0"
                max="10"
                value={mot.max_wraps}
                onChange={(e) =>
                  patchMotion({ max_wraps: Math.max(mot.min_wraps, Math.floor(num(e.target.value, mot.max_wraps))) })
                }
                className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100"
              />
            </label>
          </div>
        </div>

        {/* Physics Profile */}
        <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
            Physics, Cover &amp; Stealth Profile
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-500">Projectiles</span>
              <select
                value={phys.projectile_behavior}
                onChange={(e) =>
                  patchPhysics({ projectile_behavior: e.target.value as ProjectileBehavior })
                }
                className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100"
              >
                <option value="block">Block</option>
                <option value="pass">Pass Through</option>
                <option value="refract">Refract (Rift)</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-500">Refract (rad)</span>
              <input
                type="number"
                step="0.05"
                min="0"
                max="1.5"
                value={phys.refract_angle_rad}
                onChange={(e) => patchPhysics({ refract_angle_rad: num(e.target.value, 0) })}
                className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-500">Gravity Str</span>
              <input
                type="number"
                step="0.01"
                min="0"
                max="0.5"
                value={phys.gravity_strength}
                onChange={(e) => patchPhysics({ gravity_strength: Math.max(0, num(e.target.value, 0)) })}
                className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-500">Gravity R (px)</span>
              <input
                type="number"
                step="10"
                min="0"
                max="600"
                value={phys.gravity_radius}
                onChange={(e) => patchPhysics({ gravity_radius: Math.max(0, num(e.target.value, 0)) })}
                className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-500">Repulsion Str</span>
              <input
                type="number"
                step="0.01"
                min="0"
                max="0.5"
                value={phys.repulsion_strength}
                onChange={(e) => patchPhysics({ repulsion_strength: Math.max(0, num(e.target.value, 0)) })}
                className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-500">Repulsion R</span>
              <input
                type="number"
                step="10"
                min="0"
                max="600"
                value={phys.repulsion_radius}
                onChange={(e) => patchPhysics({ repulsion_radius: Math.max(0, num(e.target.value, 0)) })}
                className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100"
              />
            </label>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-500">Drag (0-1)</span>
              <input
                type="number"
                step="0.05"
                min="0"
                max="0.9"
                value={phys.drag_factor}
                onChange={(e) => patchPhysics({ drag_factor: Math.max(0, Math.min(0.9, num(e.target.value, 0))) })}
                className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-500">Drag Max W</span>
              <input
                type="number"
                min="0"
                max="5"
                value={phys.drag_max_weight}
                onChange={(e) => patchPhysics({ drag_max_weight: Math.max(0, Math.min(5, Math.floor(num(e.target.value, 0)))) })}
                className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-500">Passable W</span>
              <input
                type="number"
                min="0"
                max="5"
                value={phys.max_passable_weight}
                onChange={(e) => patchPhysics({ max_passable_weight: Math.max(0, Math.min(5, Math.floor(num(e.target.value, 0)))) })}
                className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100"
              />
            </label>
          </div>

          {/* Stealth Lock-Break */}
          <div className="flex items-center justify-between px-2.5 py-2 rounded bg-slate-900/70 border border-slate-800">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={phys.radar_opaque}
                onChange={(e) =>
                  patchPhysics({
                    radar_opaque: e.target.checked,
                    visual_range_mult: e.target.checked ? 0.5 : 1.0,
                  })
                }
                className="accent-purple-400 w-4 h-4 cursor-pointer"
              />
              <span className="text-[11px] font-bold text-purple-300">Stealth Lock-Break</span>
            </label>
            <span className="text-[10px] text-slate-400">
              {Math.round((phys.visual_range_mult || 1) * 100)}% Range
            </span>
          </div>

          {/* Unit Class Immunities */}
          <div>
            <div className="text-[10px] text-slate-500 mb-1">Field Immune Unit Classes</div>
            <div className="flex flex-wrap gap-1.5">
              {IMMUNITY_OPTIONS.map((cls) => {
                const active = (phys.immune_unit_classes || []).includes(cls);
                return (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => toggleImmunity(cls)}
                    className={`px-2 py-0.5 rounded text-[10px] border cursor-pointer ${
                      active
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 font-bold'
                        : 'bg-slate-900 border-slate-700 text-slate-400'
                    }`}
                  >
                    {cls}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

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

      <div className="p-4 border-t border-slate-800 flex flex-col gap-2 bg-slate-950">
        <button
          type="button"
          disabled={saving || !blueprint.name.trim() || blueprint.components.length === 0}
          onClick={onSave}
          className="w-full py-2.5 rounded-lg font-black text-xs uppercase tracking-wider bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-slate-950 transition cursor-pointer"
        >
          {saving ? 'Saving to PostgreSQL...' : 'Save Blueprint'}
        </button>

        {blueprint.blueprintId > 0 && (
          <button
            type="button"
            disabled={saving}
            onClick={onDelete}
            className="w-full py-2 rounded-lg font-bold text-[11px] uppercase tracking-wider bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 transition cursor-pointer"
          >
            Delete Blueprint
          </button>
        )}
      </div>
    </aside>
  );
};
