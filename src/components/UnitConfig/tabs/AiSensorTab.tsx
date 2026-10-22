// src/components/UnitConfig/tabs/AiSensorTab.tsx
import React from 'react';
import { UnitConfigConfigPayload } from '../types';

interface AiSensorTabProps {
  config: UnitConfigConfigPayload;
  onChange: (field: keyof UnitConfigConfigPayload, value: number | boolean) => void;
}

export const AiSensorTab: React.FC<AiSensorTabProps> = ({ config, onChange }) => {
  return (
    <div className="flex flex-col gap-3">
      <div className="text-[10px] font-black text-amber-400 uppercase tracking-widest border-b border-slate-800 pb-1">
        📡 AI, Sensors & Stealth Systems
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Vision Range */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Vision Range (m)[cite: 7]</span>
            <span className="text-cyan-400 font-black">{config.visionRange ?? 2500}</span>
          </div>
          <input
            type="range"
            min="500"
            max="5000"
            step="100"
            value={config.visionRange ?? 2500}
            onChange={(e) => onChange('visionRange', parseFloat(e.target.value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Aggro Range */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Aggro Range (m)</span>
            <span className="text-cyan-400 font-black">{config.aggroRange ?? 1500}</span>
          </div>
          <input
            type="range"
            min="200"
            max="4000"
            step="100"
            value={config.aggroRange ?? 1500}
            onChange={(e) => onChange('aggroRange', parseFloat(e.target.value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Retreat Morale Threshold */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Retreat Morale Threshold (%)</span>
            <span className="text-cyan-400 font-black">{config.retreatMoraleThreshold ?? 0.15}</span>
          </div>
          <input
            type="range"
            min="0.0"
            max="0.5"
            step="0.05"
            value={config.retreatMoraleThreshold ?? 0.15}
            onChange={(e) => onChange('retreatMoraleThreshold', parseFloat(e.target.value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Squad Cohesion Leash Range */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Squad Leash Range (m)[cite: 17, 19]</span>
            <span className="text-cyan-400 font-black">{config.squadCohesionLeashRange ?? 300}</span>
          </div>
          <input
            type="range"
            min="100"
            max="1000"
            step="50"
            value={config.squadCohesionLeashRange ?? 300}
            onChange={(e) => onChange('squadCohesionLeashRange', parseFloat(e.target.value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Radar Immunity Toggle */}
        <div className="col-span-full bg-[#161922] p-3 rounded-xl border border-slate-800">
          <label className="flex items-center gap-2 cursor-pointer text-[9px] font-bold text-slate-300 uppercase">
            <input
              type="checkbox"
              checked={!!config.radarImmunityActive}
              onChange={(e) => onChange('radarImmunityActive', e.target.checked)}
              className="accent-cyan-400 w-3.5 h-3.5"
            />
            Radar Immunity / Stealth Active
          </label>
        </div>
      </div>
    </div>
  );
};
