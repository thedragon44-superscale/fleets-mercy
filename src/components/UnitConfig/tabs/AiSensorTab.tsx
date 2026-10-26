// src/components/UnitConfig/tabs/AiSensorTab.tsx
import React, { useState, useEffect } from 'react';
import { UnitConfigConfigPayload } from '../types';

interface AiSensorTabProps {
  config: UnitConfigConfigPayload;
  onChange: (field: keyof UnitConfigConfigPayload, value: number | boolean) => void;
}

export const AiSensorTab: React.FC<AiSensorTabProps> = ({ config, onChange }) => {
  // Local state for smooth dragging without spamming WS packets
  const [localValues, setLocalValues] = useState<UnitConfigConfigPayload>(config);

  useEffect(() => {
    setLocalValues(config);
  }, [config]);

  const handleSliderChange = (field: keyof UnitConfigConfigPayload, val: number) => {
    setLocalValues((prev) => ({ ...prev, [field]: val }));
  };

  const handleCommitChange = (field: keyof UnitConfigConfigPayload, val: number) => {
    onChange(field, val);
  };

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
            <span className="text-cyan-400 font-black">{localValues.weightClass ?? 0}</span>
          </div>
          <input
            type="range" min="1" max="10" step="1"
            value={localValues.weightClass ?? 0}
            onChange={(e) => handleSliderChange('weightClass', parseInt(e.target.value, 10))}
            onMouseUp={(e) => handleCommitChange('weightClass', parseInt((e.target as HTMLInputElement).value, 10))}
            onTouchEnd={(e) => handleCommitChange('weightClass', parseInt((e.target as HTMLInputElement).value, 10))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Vision Range */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Vision Range (m)</span>
            <span className="text-cyan-400 font-black">{localValues.visionRange ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="10000" step="100"
            value={localValues.visionRange ?? 0}
            onChange={(e) => handleSliderChange('visionRange', parseFloat(e.target.value))}
            onMouseUp={(e) => handleCommitChange('visionRange', parseFloat((e.target as HTMLInputElement).value))}
            onTouchEnd={(e) => handleCommitChange('visionRange', parseFloat((e.target as HTMLInputElement).value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Sensor Range (Bubble Radar) */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Sensor Range (Bubble) (m)</span>
            <span className="text-cyan-400 font-black">{localValues.sensorRange ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="10000" step="100"
            value={localValues.sensorRange ?? 0}
            onChange={(e) => handleSliderChange('sensorRange', parseFloat(e.target.value))}
            onMouseUp={(e) => handleCommitChange('sensorRange', parseFloat((e.target as HTMLInputElement).value))}
            onTouchEnd={(e) => handleCommitChange('sensorRange', parseFloat((e.target as HTMLInputElement).value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Aggro Range */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Aggro Range (m)</span>
            <span className="text-cyan-400 font-black">{localValues.aggroRange ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="10000" step="100"
            value={localValues.aggroRange ?? 0}
            onChange={(e) => handleSliderChange('aggroRange', parseFloat(e.target.value))}
            onMouseUp={(e) => handleCommitChange('aggroRange', parseFloat((e.target as HTMLInputElement).value))}
            onTouchEnd={(e) => handleCommitChange('aggroRange', parseFloat((e.target as HTMLInputElement).value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Aggro Threat Weight */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Aggro Threat Weight</span>
            <span className="text-cyan-400 font-black">{localValues.aggroThreatWeight ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="10" step="0.5"
            value={localValues.aggroThreatWeight ?? 0}
            onChange={(e) => handleSliderChange('aggroThreatWeight', parseFloat(e.target.value))}
            onMouseUp={(e) => handleCommitChange('aggroThreatWeight', parseFloat((e.target as HTMLInputElement).value))}
            onTouchEnd={(e) => handleCommitChange('aggroThreatWeight', parseFloat((e.target as HTMLInputElement).value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Retreat Morale Threshold */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Retreat Morale Threshold (%)</span>
            <span className="text-cyan-400 font-black">{localValues.retreatMoraleThreshold ?? 0}</span>
          </div>
          <input
            type="range" min="0.0" max="1.0" step="0.05"
            value={localValues.retreatMoraleThreshold ?? 0}
            onChange={(e) => handleSliderChange('retreatMoraleThreshold', parseFloat(e.target.value))}
            onMouseUp={(e) => handleCommitChange('retreatMoraleThreshold', parseFloat((e.target as HTMLInputElement).value))}
            onTouchEnd={(e) => handleCommitChange('retreatMoraleThreshold', parseFloat((e.target as HTMLInputElement).value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Squad Cohesion Leash Range */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Squad Leash Range (m)</span>
            <span className="text-cyan-400 font-black">{localValues.squadCohesionLeashRange ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="2500" step="50"
            value={localValues.squadCohesionLeashRange ?? 0}
            onChange={(e) => handleSliderChange('squadCohesionLeashRange', parseFloat(e.target.value))}
            onMouseUp={(e) => handleCommitChange('squadCohesionLeashRange', parseFloat((e.target as HTMLInputElement).value))}
            onTouchEnd={(e) => handleCommitChange('squadCohesionLeashRange', parseFloat((e.target as HTMLInputElement).value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Radar Cross Section */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Radar Cross Section</span>
            <span className="text-cyan-400 font-black">{localValues.radarCrossSection ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="10" step="0.1"
            value={localValues.radarCrossSection ?? 0}
            onChange={(e) => handleSliderChange('radarCrossSection', parseFloat(e.target.value))}
            onMouseUp={(e) => handleCommitChange('radarCrossSection', parseFloat((e.target as HTMLInputElement).value))}
            onTouchEnd={(e) => handleCommitChange('radarCrossSection', parseFloat((e.target as HTMLInputElement).value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Sensor Resolution Tier */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Sensor Resolution Tier</span>
            <span className="text-cyan-400 font-black">{localValues.sensorResolutionTier ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="10" step="1"
            value={localValues.sensorResolutionTier ?? 0}
            onChange={(e) => handleSliderChange('sensorResolutionTier', parseInt(e.target.value, 10))}
            onMouseUp={(e) => handleCommitChange('sensorResolutionTier', parseInt((e.target as HTMLInputElement).value, 10))}
            onTouchEnd={(e) => handleCommitChange('sensorResolutionTier', parseInt((e.target as HTMLInputElement).value, 10))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Jamming Susceptibility */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Jamming Susceptibility</span>
            <span className="text-cyan-400 font-black">{localValues.jammingSusceptibility ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="1.0" step="0.05"
            value={localValues.jammingSusceptibility ?? 0}
            onChange={(e) => handleSliderChange('jammingSusceptibility', parseFloat(e.target.value))}
            onMouseUp={(e) => handleCommitChange('jammingSusceptibility', parseFloat((e.target as HTMLInputElement).value))}
            onTouchEnd={(e) => handleCommitChange('jammingSusceptibility', parseFloat((e.target as HTMLInputElement).value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Target Lock Time */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Target Lock Time (s)</span>
            <span className="text-cyan-400 font-black">{localValues.targetLockTime ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="10" step="0.1"
            value={localValues.targetLockTime ?? 0}
            onChange={(e) => handleSliderChange('targetLockTime', parseFloat(e.target.value))}
            onMouseUp={(e) => handleCommitChange('targetLockTime', parseFloat((e.target as HTMLInputElement).value))}
            onTouchEnd={(e) => handleCommitChange('targetLockTime', parseFloat((e.target as HTMLInputElement).value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Stealth Recovery Delay Seconds */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Stealth Recovery Delay (s)</span>
            <span className="text-cyan-400 font-black">{localValues.stealthRecoveryDelaySeconds ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="30" step="0.5"
            value={localValues.stealthRecoveryDelaySeconds ?? 0}
            onChange={(e) => handleSliderChange('stealthRecoveryDelaySeconds', parseFloat(e.target.value))}
            onMouseUp={(e) => handleCommitChange('stealthRecoveryDelaySeconds', parseFloat((e.target as HTMLInputElement).value))}
            onTouchEnd={(e) => handleCommitChange('stealthRecoveryDelaySeconds', parseFloat((e.target as HTMLInputElement).value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Toggle Checkboxes */}
        <div className="col-span-full grid grid-cols-2 gap-2 bg-[#161922] p-3 rounded-xl border border-slate-800">
          <label className="flex items-center gap-2 cursor-pointer text-[9px] font-bold text-slate-300 uppercase">
            <input
              type="checkbox"
              checked={!!localValues.radarImmunityActive}
              onChange={(e) => {
                handleSliderChange('radarImmunityActive', e.target.checked);
                onChange('radarImmunityActive', e.target.checked);
              }}
              className="accent-cyan-400 w-3.5 h-3.5"
            />
            Radar Immunity Active
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-[9px] font-bold text-slate-300 uppercase">
            <input
              type="checkbox"
              checked={!!localValues.decloakOnActionFlag}
              onChange={(e) => {
                handleSliderChange('decloakOnActionFlag', e.target.checked);
                onChange('decloakOnActionFlag', e.target.checked);
              }}
              className="accent-cyan-400 w-3.5 h-3.5"
            />
            Decloak On Action Flag
          </label>
        </div>
      </div>
    </div>
  );
};
