// src/components/UnitConfig/tabs/VitalsTab.tsx
import React from 'react';
import { UnitConfigConfigPayload } from '../types';
import { VariableDoc } from '../../../constants/variableDocs';
import { ConfigSliderCard } from '../common/ConfigSliderCard';
import { ConfigCheckboxRow } from '../common/ConfigCheckboxRow';

interface VitalsTabProps {
  config: UnitConfigConfigPayload;
  modifiedFields?: Set<keyof UnitConfigConfigPayload>;
  onChange: (field: keyof UnitConfigConfigPayload, value: number | boolean) => void;
  onOpenDoc: (doc: VariableDoc) => void;
}

const VITALS_SLIDERS: Array<{
  field: keyof UnitConfigConfigPayload;
  label: string;
  min: number;
  max: number;
  step: number;
}> = [
  { field: 'shieldBase', label: 'Base Shields (HP)', min: 0, max: 25000, step: 100 },
  { field: 'hullBase', label: 'Base Hull (HP)', min: 0, max: 25000, step: 100 },
  { field: 'shieldRegenRate', label: 'Shield Regen Rate (HP/s)', min: 0, max: 200, step: 1 },
  { field: 'shieldRechargeDelayTicks', label: 'Recharge Delay (Ticks)', min: 0, max: 600, step: 10 },
  { field: 'armorMitigation', label: 'Armor Mitigation', min: 0, max: 1, step: 0.05 },
  { field: 'armorHardnessRating', label: 'Armor Hardness Rating', min: 0, max: 50, step: 1 },
  { field: 'ablativePlatingDurability', label: 'Ablative Plating Durability', min: 0, max: 2000, step: 50 },
  { field: 'directionalShieldArc', label: 'Shield Arc (Degrees)', min: 45, max: 360, step: 45 },
];

export const VitalsTab: React.FC<VitalsTabProps> = ({
  config,
  modifiedFields,
  onChange,
  onOpenDoc,
}) => {
  return (
    <div className="flex flex-col gap-3">
      <div className="text-[10px] font-black text-amber-400 uppercase tracking-widest border-b border-slate-800 pb-1">
        🛡️ Vitals, Health & Shield Systems
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {VITALS_SLIDERS.map(({ field, label, min, max, step }) => (
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

        <div className="col-span-full grid grid-cols-1 sm:grid-cols-3 gap-2">
          <ConfigCheckboxRow
            field="quadrantShieldingEnabled"
            label="Quad Shielding"
            checked={!!config.quadrantShieldingEnabled}
            isModified={modifiedFields?.has('quadrantShieldingEnabled')}
            onChange={onChange}
            onOpenDoc={onOpenDoc}
          />
          <ConfigCheckboxRow
            field="quadrantShieldPoolsEnabled"
            label="Quad Shield Pools"
            checked={!!config.quadrantShieldPoolsEnabled}
            isModified={modifiedFields?.has('quadrantShieldPoolsEnabled')}
            onChange={onChange}
            onOpenDoc={onOpenDoc}
          />
          <ConfigCheckboxRow
            field="quadrantHullPoolsEnabled"
            label="Quad Hull Pools"
            checked={!!config.quadrantHullPoolsEnabled}
            isModified={modifiedFields?.has('quadrantHullPoolsEnabled')}
            onChange={onChange}
            onOpenDoc={onOpenDoc}
          />
        </div>
      </div>
    </div>
  );
};
