// src/components/UnitConfig/tabs/MovementTab.tsx
import React, { useState, useEffect } from 'react';
import { UnitConfigConfigPayload } from '../types';
import { VARIABLE_DOCS, VariableDoc } from '../../../constants/variableDocs';

interface MovementTabProps {
  config: UnitConfigConfigPayload;
  onChange: (field: keyof UnitConfigConfigPayload, value: number) => void;
  onOpenDoc: (doc: VariableDoc) => void;
}

export const MovementTab: React.FC<MovementTabProps> = ({ config, onChange, onOpenDoc }) => {
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

  return (
    <div className="flex flex-col gap-3">
      <div className="text-[10px] font-black text-amber-400 uppercase tracking-widest border-b border-slate-800 pb-1">
        🚀 Movement & Physics Dynamics
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {renderSliderCard('speed', 'Base Speed', '0', '25', '0.5')}
        {renderSliderCard('strafingSpeed', 'Strafing Speed', '0', '20', '0.5')}
        {renderSliderCard('turnRate', 'Turn Rate', '0', '1.0', '0.01')}
        {renderSliderCard('angularVelocity', 'Angular Velocity', '0', '2.0', '0.02')}
        {renderSliderCard('lateralThrustPower', 'Lateral Thrust Power', '0', '10', '0.2')}
        {renderSliderCard('reverseThrustPower', 'Reverse Thrust Power', '0', '10', '0.2')}
        {renderSliderCard('driftCoefficient', 'Drift Coefficient', '0', '2.0', '0.05')}
        {renderSliderCard('accelerationCurve', 'Acceleration Curve', '0.1', '5.0', '0.1')}
      </div>
    </div>
  );
};
