// src/components/UnitConfig/tabs/AiSensorTab.tsx
import React, { useState, useEffect } from 'react';
import { UnitConfigConfigPayload } from '../types';
import { VARIABLE_DOCS, VariableDoc } from '../../../constants/variableDocs';

interface AiSensorTabProps {
  config: UnitConfigConfigPayload;
  onChange: (field: keyof UnitConfigConfigPayload, value: number | boolean) => void;
  onOpenDoc: (doc: VariableDoc) => void;
}

export const AiSensorTab: React.FC<AiSensorTabProps> = ({ config, onChange, onOpenDoc }) => {
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

  const renderSliderCard = (
    field: keyof UnitConfigConfigPayload,
    label: string,
    min: string,
    max: string,
    step: string
  ) => {
    const doc = VARIABLE_DOCS[field];
    const val = (localValues[field] as number) ?? 0;

    return (
      <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
        <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
          <div className="flex items-center gap-1.5">
            <span>{label}</span>
            {doc && (
              <button
                type="button"
                onClick={() => onOpenDoc(doc)}
                className="w-3.5 h-3.5 rounded-full bg-cyan-500/10 border border-cyan-500/40 text-cyan-400 hover:bg-cyan-400 hover:text-slate-950 flex items-center justify-center text-[8px] font-black transition-all"
                title="Click for variable documentation"
              >
                ?
              </button>
            )}
          </div>
          <span className="text-cyan-400 font-black">{val}</span>
        </div>
        <input
          type="range" min={min} max={max} step={step}
          value={val}
          onChange={(e) => handleSliderChange(field, parseFloat(e.target.value))}
          onMouseUp={(e) => handleCommitChange(field, parseFloat((e.target as HTMLInputElement).value))}
          onTouchEnd={(e) => handleCommitChange(field, parseFloat((e.target as HTMLInputElement).value))}
          className="accent-cyan-400 cursor-pointer"
        />
      </div>
    );
  };

  const renderCheckboxRow = (field: keyof UnitConfigConfigPayload, label: string) => {
    const doc = VARIABLE_DOCS[field];
    const checked = !!localValues[field];

    return (
      <label className="flex items-center justify-between cursor-pointer text-[9px] font-bold text-slate-300 uppercase bg-[#161922] p-2.5 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => {
              handleSliderChange(field, e.target.checked);
              onChange(field, e.target.checked);
            }}
            className="accent-cyan-400 w-3.5 h-3.5 cursor-pointer"
          />
          <span>{label}</span>
        </div>
        {doc && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onOpenDoc(doc);
            }}
            className="w-3.5 h-3.5 rounded-full bg-cyan-500/10 border border-cyan-500/40 text-cyan-400 hover:bg-cyan-400 hover:text-slate-950 flex items-center justify-center text-[8px] font-black transition-all"
            title="Click for variable documentation"
          >
            ?
          </button>
        )}
      </label>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="text-[10px] font-black text-amber-400 uppercase tracking-widest border-b border-slate-800 pb-1">
        📡 AI, Sensors & Stealth Systems
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {renderSliderCard('weightClass', 'Weight Class', '1', '10', '1')}
        {renderSliderCard('visionRange', 'Vision Range (m)', '0', '10000', '100')}
        {renderSliderCard('sensorRange', 'Sensor Range (Bubble) (m)', '0', '10000', '100')}
        {renderSliderCard('aggroRange', 'Aggro Range (m)', '0', '10000', '100')}
        {renderSliderCard('aggroThreatWeight', 'Aggro Threat Weight', '0', '10', '0.5')}
        {renderSliderCard('retreatMoraleThreshold', 'Retreat Morale Threshold (%)', '0.0', '1.0', '0.05')}
        {renderSliderCard('squadCohesionLeashRange', 'Squad Leash Range (m)', '0', '2500', '50')}
        {renderSliderCard('radarCrossSection', 'Radar Cross Section', '0', '10', '0.1')}
        {renderSliderCard('sensorResolutionTier', 'Sensor Resolution Tier', '0', '10', '1')}
        {renderSliderCard('jammingSusceptibility', 'Jamming Susceptibility', '0', '1.0', '0.05')}
        {renderSliderCard('targetLockTime', 'Target Lock Time (s)', '0', '10', '0.1')}
        {renderSliderCard('stealthRecoveryDelaySeconds', 'Stealth Recovery Delay (s)', '0', '30', '0.5')}

        {/* Toggle Checkboxes */}
        <div className="col-span-full grid grid-cols-1 sm:grid-cols-2 gap-2">
          {renderCheckboxRow('radarImmunityActive', 'Radar Immunity Active')}
          {renderCheckboxRow('decloakOnActionFlag', 'Decloak On Action Flag')}
        </div>
      </div>
    </div>
  );
};
