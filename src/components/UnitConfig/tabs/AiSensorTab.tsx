// src/components/UnitConfig/tabs/AiSensorTab.tsx
import React from 'react';
import { UnitConfigConfigPayload } from '../types';
import { VariableDoc } from '../../../constants/variableDocs';
import { ConfigSliderCard } from '../common/ConfigSliderCard';
import { ConfigCheckboxRow } from '../common/ConfigCheckboxRow';

interface AiSensorTabProps {
  config: UnitConfigConfigPayload;
  modifiedFields?: Set<keyof UnitConfigConfigPayload>;
  onChange: (field: keyof UnitConfigConfigPayload, value: number | boolean) => void;
  onOpenDoc: (doc: VariableDoc) => void;
}

const AI_SENSOR_SLIDERS: Array<{
  field: keyof UnitConfigConfigPayload;
  label: string;
  min: number;
  max: number;
  step: number;
}> = [
  { field: 'weightClass', label: 'Weight Class', min: 1, max: 10, step: 1 },
  { field: 'visionRange', label: 'Vision Range (m)', min: 0, max: 10000, step: 100 },
  { field: 'sensorRange', label: 'Sensor Range (Bubble) (m)', min: 0, max: 10000, step: 100 },
  { field: 'aggroRange', label: 'Aggro Range (m)', min: 0, max: 10000, step: 100 },
  { field: 'aggroThreatWeight', label: 'Aggro Threat Weight', min: 0, max: 10, step: 0.5 },
  { field: 'retreatMoraleThreshold', label: 'Retreat Morale Threshold (%)', min: 0, max: 1, step: 0.05 },
  { field: 'squadCohesionLeashRange', label: 'Squad Leash Range (m)', min: 0, max: 2500, step: 50 },
  { field: 'radarCrossSection', label: 'Radar Cross Section', min: 0, max: 10, step: 0.1 },
  { field: 'sensorResolutionTier', label: 'Sensor Resolution Tier', min: 0, max: 10, step: 1 },
  { field: 'jammingSusceptibility', label: 'Jamming Susceptibility', min: 0, max: 1, step: 0.05 },
  { field: 'targetLockTime', label: 'Target Lock Time (s)', min: 0, max: 10, step: 0.1 },
  { field: 'shieldGatedStealthThreshold', label: 'Shield-Gated Stealth Threshold', min: 0, max: 1000, step: 10 },
  { field: 'stealthRecoveryDelaySeconds', label: 'Stealth Recovery Delay (s)', min: 0, max: 30, step: 0.5 },
];

export const AiSensorTab: React.FC<AiSensorTabProps> = ({
  config,
  modifiedFields,
  onChange,
  onOpenDoc,
}) => {
  return (
    <div className="flex flex-col gap-3">
      <div className="text-[10px] font-black text-amber-400 uppercase tracking-widest border-b border-slate-800 pb-1">
        📡 AI, Sensors & Stealth Systems
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {AI_SENSOR_SLIDERS.map(({ field, label, min, max, step }) => (
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

        <div className="col-span-full grid grid-cols-1 sm:grid-cols-2 gap-2">
          <ConfigCheckboxRow
            field="radarImmunityActive"
            label="Radar Immunity Active"
            checked={!!config.radarImmunityActive}
            isModified={modifiedFields?.has('radarImmunityActive')}
            onChange={onChange}
            onOpenDoc={onOpenDoc}
          />
          <ConfigCheckboxRow
            field="decloakOnActionFlag"
            label="Decloak On Action Flag"
            checked={!!config.decloakOnActionFlag}
            isModified={modifiedFields?.has('decloakOnActionFlag')}
            onChange={onChange}
            onOpenDoc={onOpenDoc}
          />
        </div>
      </div>
    </div>
  );
};
