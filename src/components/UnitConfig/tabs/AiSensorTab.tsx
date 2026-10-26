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
        {/* Weight Class */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Weight Class</span>
            <span className="text-cyan-400 font-black">{config.weightClass ?? 0}</span>
          </div>
          <input
            type="range" min="1" max="10" step="1"
            value={config.weightClass ?? 0}
            onChange={(e) => onChange('weightClass', parseInt(e.target.value, 10))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Vision Range */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Vision Range (m)[cite: 7]</span>
            <span className="text-cyan-400 font-black">{config.visionRange ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="10000" step="100"
            value={config.visionRange ?? 0}
            onChange={(e) => onChange('visionRange', parseFloat(e.target.value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Aggro Range */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Aggro Range (m)</span>
            <span className="text-cyan-400 font-black">{config.aggroRange ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="10000" step="100"
            value={config.aggroRange ?? 0}
            onChange={(e) => onChange('aggroRange', parseFloat(e.target.value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Aggro Threat Weight */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Aggro Threat Weight</span>
            <span className="text-cyan-400 font-black">{config.aggroThreatWeight ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="10" step="0.5"
            value={config.aggroThreatWeight ?? 0}
            onChange={(e) => onChange('aggroThreatWeight', parseFloat(e.target.value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Retreat Morale Threshold */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Retreat Morale Threshold (%)</span>
            <span className="text-cyan-400 font-black">{config.retreatMoraleThreshold ?? 0}</span>
          </div>
          <input
            type="range" min="0.0" max="1.0" step="0.05"
            value={config.retreatMoraleThreshold ?? 0}
            onChange={(e) => onChange('retreatMoraleThreshold', parseFloat(e.target.value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Squad Cohesion Leash Range */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Squad Leash Range (m)[cite: 17, 19]</span>
            <span className="text-cyan-400 font-black">{config.squadCohesionLeashRange ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="2500" step="50"
            value={config.squadCohesionLeashRange ?? 0}
            onChange={(e) => onChange('squadCohesionLeashRange', parseFloat(e.target.value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Radar Cross Section */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Radar Cross Section</span>
            <span className="text-cyan-400 font-black">{config.radarCrossSection ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="10" step="0.1"
            value={config.radarCrossSection ?? 0}
            onChange={(e) => onChange('radarCrossSection', parseFloat(e.target.value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Sensor Resolution Tier */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Sensor Resolution Tier</span>
            <span className="text-cyan-400 font-black">{config.sensorResolutionTier ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="10" step="1"
            value={config.sensorResolutionTier ?? 0}
            onChange={(e) => onChange('sensorResolutionTier', parseInt(e.target.value, 10))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Jamming Susceptibility */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Jamming Susceptibility</span>
            <span className="text-cyan-400 font-black">{config.jammingSusceptibility ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="1.0" step="0.05"
            value={config.jammingSusceptibility ?? 0}
            onChange={(e) => onChange('jammingSusceptibility', parseFloat(e.target.value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Target Lock Time */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Target Lock Time (s)</span>
            <span className="text-cyan-400 font-black">{config.targetLockTime ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="10" step="0.1"
            value={config.targetLockTime ?? 0}
            onChange={(e) => onChange('targetLockTime', parseFloat(e.target.value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Stealth Recovery Delay Seconds */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Stealth Recovery Delay (s)</span>
            <span className="text-cyan-400 font-black">{config.stealthRecoveryDelaySeconds ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="30" step="0.5"
            value={config.stealthRecoveryDelaySeconds ?? 0}
            onChange={(e) => onChange('stealthRecoveryDelaySeconds', parseFloat(e.target.value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Toggle Toggles */}
        <div className="col-span-full grid grid-cols-2 gap-2 bg-[#161922] p-3 rounded-xl border border-slate-800">
          <label className="flex items-center gap-2 cursor-pointer text-[9px] font-bold text-slate-300 uppercase">
            <input
              type="checkbox"
              checked={!!config.radarImmunityActive}
              onChange={(e) => onChange('radarImmunityActive', e.target.checked)}
              className="accent-cyan-400 w-3.5 h-3.5"
            />
            Radar Immunity Active
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-[9px] font-bold text-slate-300 uppercase">
            <input
              type="checkbox"
              checked={!!config.decloakOnActionFlag}
              onChange={(e) => onChange('decloakOnActionFlag', e.target.checked)}
              className="accent-cyan-400 w-3.5 h-3.5"
            />
            Decloak On Action Flag
          </label>
        </div>
      </div>
    </div>
  );
};
