// src/components/UnitConfig/tabs/MovementTab.tsx
import React from 'react';
import { UnitConfigConfigPayload } from '../types';
import { VariableDoc } from '../../../../constants/variableDocs';
import { ConfigSliderCard } from '../common/ConfigSliderCard';

interface MovementTabProps {
  config: UnitConfigConfigPayload;
  modifiedFields?: Set<keyof UnitConfigConfigPayload>;
  onChange: (field: keyof UnitConfigConfigPayload, value: number) => void;
  onOpenDoc: (doc: VariableDoc) => void;
}

const MOVEMENT_SLIDERS: Array<{
  field: keyof UnitConfigConfigPayload;
  label: string;
  min: number;
  max: number;
  step: number;
}> = [
  { field: 'speed', label: 'Base Speed', min: 0, max: 50, step: 0.5 },
  { field: 'strafingSpeed', label: 'Strafing Speed', min: 0, max: 50, step: 0.5 },
  { field: 'turnRate', label: 'Turn Rate', min: 0.1, max: 60, step: 0.1 },
  { field: 'angularVelocity', label: 'Angular Velocity', min: 0, max: 15, step: 0.05 },
  { field: 'lateralThrustPower', label: 'Lateral Thrust Power', min: 0, max: 10, step: 0.2 },
  { field: 'reverseThrustPower', label: 'Reverse Thrust Power', min: 0, max: 10, step: 0.2 },
  { field: 'driftCoefficient', label: 'Drift Coefficient', min: 0, max: 2, step: 0.05 },
  { field: 'accelerationCurve', label: 'Acceleration Curve', min: 0.1, max: 10, step: 0.1 },
];

export const MovementTab: React.FC<MovementTabProps> = ({
  config,
  modifiedFields,
  onChange,
  onOpenDoc,
}) => {
  return (
    <div className="flex flex-col gap-3">
      <div className="text-[10px] font-black text-amber-400 uppercase tracking-widest border-b border-slate-800 pb-1">
        🚀 Movement & Physics Dynamics
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {MOVEMENT_SLIDERS.map(({ field, label, min, max, step }) => (
          <ConfigSliderCard
            key={field}
            field={field}
            label={label}
            value={(config[field] as number) ?? 0}
            min={min}
            max={max}
            step={step}
            isModified={modifiedFields?.has(field)}
            onChange={onChange}
            onOpenDoc={onOpenDoc}
          />
        ))}
      </div>
    </div>
  );
};
