// src/components/UnitConfig/tabs/CombatTab.tsx
import React from 'react';
import { UnitConfigConfigPayload } from '../types';
import { VariableDoc } from '../../../constants/variableDocs';
import { ConfigSliderCard } from '../common/ConfigSliderCard';

interface CombatTabProps {
  config: UnitConfigConfigPayload;
  modifiedFields?: Set<keyof UnitConfigConfigPayload>;
  onChange: (field: keyof UnitConfigConfigPayload, value: number) => void;
  onOpenDoc: (doc: VariableDoc) => void;
}

const COMBAT_SLIDERS: Array<{
  field: keyof UnitConfigConfigPayload;
  label: string;
  min: number;
  max: number;
  step: number;
}> = [
  { field: 'dps', label: 'Damage Per Second (DPS)', min: 0, max: 5000, step: 50 },
  { field: 'maxCooldown', label: 'Max Cooldown (Ticks)', min: 1, max: 120, step: 1 },
  { field: 'projectileSpeed', label: 'Projectile Speed', min: 0, max: 100, step: 1 },
  { field: 'projectileRange', label: 'Projectile Range (m)', min: 0, max: 10000, step: 100 },
  { field: 'optimalRange', label: 'Optimal Range (m)', min: 0, max: 10000, step: 100 },
  { field: 'maxRange', label: 'Max Range (m)', min: 0, max: 10000, step: 100 },
  { field: 'engagementRangeCap', label: 'Engagement Range Cap (m)', min: 0, max: 10000, step: 100 },
  { field: 'ammoCapacity', label: 'Ammo Capacity (-1 = Infinite)', min: -1, max: 1000, step: 1 },
  { field: 'initialOrdnanceCapacity', label: 'Initial Ordnance Capacity', min: 0, max: 500, step: 10 },
  { field: 'turretTraverseSpeed', label: 'Turret Traverse Speed', min: 0, max: 10, step: 0.1 },
  { field: 'weaponDispersionBloom', label: 'Weapon Dispersion Bloom', min: 0, max: 5, step: 0.1 },
  { field: 'projectileTrackingCapability', label: 'Projectile Tracking Capability', min: 0, max: 5, step: 0.1 },
  { field: 'shieldPenetrationFactor', label: 'Shield Penetration Factor', min: 0, max: 1, step: 0.05 },
  { field: 'sustainedFireLimitSeconds', label: 'Sustained Fire Limit (s)', min: 0, max: 60, step: 1 },
  { field: 'barrelCoolingDurationSeconds', label: 'Barrel Cooling Duration (s)', min: 0, max: 30, step: 0.5 },
  { field: 'burstSalvoCooldown', label: 'Burst Salvo Cooldown', min: 0, max: 1000, step: 10 },
  { field: 'beamRaycastDuration', label: 'Beam Raycast Duration (s)', min: 0, max: 10, step: 0.1 },
  { field: 'maxThermalCapacity', label: 'Max Thermal Capacity', min: 0, max: 5000, step: 50 },
  { field: 'thermalDissipationRate', label: 'Thermal Dissipation Rate', min: 0, max: 250, step: 5 },
  { field: 'powerGridAllocationWeight', label: 'Power Grid Allocation Weight', min: 0, max: 10, step: 0.5 },
];

export const CombatTab: React.FC<CombatTabProps> = ({
  config,
  modifiedFields,
  onChange,
  onOpenDoc,
}) => {
  return (
    <div className="flex flex-col gap-3">
      <div className="text-[10px] font-black text-amber-400 uppercase tracking-widest border-b border-slate-800 pb-1">
        ⚡ Combat Output & Ballistic Profiles
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {COMBAT_SLIDERS.map(({ field, label, min, max, step }) => (
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
