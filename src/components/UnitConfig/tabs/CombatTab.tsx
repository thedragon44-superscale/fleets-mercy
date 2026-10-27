// src/components/UnitConfig/tabs/CombatTab.tsx
import React, { useState, useEffect } from 'react';
import { UnitConfigConfigPayload } from '../types';
import { VARIABLE_DOCS, VariableDoc } from '../../../constants/variableDocs';

interface CombatTabProps {
  config: UnitConfigConfigPayload;
  onChange: (field: keyof UnitConfigConfigPayload, value: number) => void;
  onOpenDoc: (doc: VariableDoc) => void;
}

export const CombatTab: React.FC<CombatTabProps> = ({ config, onChange, onOpenDoc }) => {
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
        ⚡ Combat Output & Ballistic Profiles
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {renderSliderCard('dps', 'Damage Per Second (DPS)', '0', '5000', '50')}
        {renderSliderCard('maxCooldown', 'Max Cooldown (Ticks)', '1', '120', '1')}
        {renderSliderCard('projectileSpeed', 'Projectile Speed', '0', '100', '1')}
        {renderSliderCard('projectileRange', 'Projectile Range (m)', '0', '10000', '100')}
        {renderSliderCard('optimalRange', 'Optimal Range (m)', '0', '10000', '100')}
        {renderSliderCard('maxRange', 'Max Range (m)', '0', '10000', '100')}
        {renderSliderCard('engagementRangeCap', 'Engagement Range Cap (m)', '0', '10000', '100')}
        {renderSliderCard('ammoCapacity', 'Ammo Capacity (-1 = Infinite)', '-1', '1000', '10')}
        {renderSliderCard('initialOrdnanceCapacity', 'Initial Ordnance Capacity', '0', '500', '10')}
        {renderSliderCard('turretTraverseSpeed', 'Turret Traverse Speed', '0', '10', '0.1')}
        {renderSliderCard('weaponDispersionBloom', 'Weapon Dispersion Bloom', '0', '5.0', '0.1')}
        {renderSliderCard('projectileTrackingCapability', 'Projectile Tracking Capability', '0', '5.0', '0.1')}
        {renderSliderCard('shieldPenetrationFactor', 'Shield Penetration Factor', '0', '1.0', '0.05')}
        {renderSliderCard('sustainedFireLimitSeconds', 'Sustained Fire Limit (s)', '0', '60', '1')}
        {renderSliderCard('barrelCoolingDurationSeconds', 'Barrel Cooling Duration (s)', '0', '30', '0.5')}
        {renderSliderCard('burstSalvoCooldown', 'Burst Salvo Cooldown', '0', '1000', '10')}
        {renderSliderCard('beamRaycastDuration', 'Beam Raycast Duration (s)', '0', '10', '0.1')}
        {renderSliderCard('maxThermalCapacity', 'Max Thermal Capacity', '0', '5000', '50')}
        {renderSliderCard('thermalDissipationRate', 'Thermal Dissipation Rate', '0', '250', '5')}
        {renderSliderCard('powerGridAllocationWeight', 'Power Grid Allocation Weight', '0', '10', '0.5')}
      </div>
    </div>
  );
};
