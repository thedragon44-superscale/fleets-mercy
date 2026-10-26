// src/components/UnitConfig/tabs/CombatTab.tsx
import React, { useState, useEffect } from 'react';
import { UnitConfigConfigPayload } from '../types';

interface CombatTabProps {
  config: UnitConfigConfigPayload;
  onChange: (field: keyof UnitConfigConfigPayload, value: number) => void;
}

export const CombatTab: React.FC<CombatTabProps> = ({ config, onChange }) => {
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
        ⚡ Combat Output & Ballistic Profiles
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* DPS */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Damage Per Second (DPS)</span>
            <span className="text-cyan-400 font-black">{localValues.dps ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="5000" step="50"
            value={localValues.dps ?? 0}
            onChange={(e) => handleSliderChange('dps', parseFloat(e.target.value))}
            onMouseUp={(e) => handleCommitChange('dps', parseFloat((e.target as HTMLInputElement).value))}
            onTouchEnd={(e) => handleCommitChange('dps', parseFloat((e.target as HTMLInputElement).value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Max Cooldown */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Max Cooldown (Ticks)</span>
            <span className="text-cyan-400 font-black">{localValues.maxCooldown ?? 0}</span>
          </div>
          <input
            type="range" min="1" max="120" step="1"
            value={localValues.maxCooldown ?? 0}
            onChange={(e) => handleSliderChange('maxCooldown', parseInt(e.target.value, 10))}
            onMouseUp={(e) => handleCommitChange('maxCooldown', parseInt((e.target as HTMLInputElement).value, 10))}
            onTouchEnd={(e) => handleCommitChange('maxCooldown', parseInt((e.target as HTMLInputElement).value, 10))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Projectile Speed */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Projectile Speed</span>
            <span className="text-cyan-400 font-black">{localValues.projectileSpeed ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="100" step="1"
            value={localValues.projectileSpeed ?? 0}
            onChange={(e) => handleSliderChange('projectileSpeed', parseFloat(e.target.value))}
            onMouseUp={(e) => handleCommitChange('projectileSpeed', parseFloat((e.target as HTMLInputElement).value))}
            onTouchEnd={(e) => handleCommitChange('projectileSpeed', parseFloat((e.target as HTMLInputElement).value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Projectile Range */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Projectile Range (m)</span>
            <span className="text-cyan-400 font-black">{localValues.projectileRange ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="10000" step="100"
            value={localValues.projectileRange ?? 0}
            onChange={(e) => handleSliderChange('projectileRange', parseFloat(e.target.value))}
            onMouseUp={(e) => handleCommitChange('projectileRange', parseFloat((e.target as HTMLInputElement).value))}
            onTouchEnd={(e) => handleCommitChange('projectileRange', parseFloat((e.target as HTMLInputElement).value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Optimal Range */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Optimal Range (m)</span>
            <span className="text-cyan-400 font-black">{localValues.optimalRange ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="10000" step="100"
            value={localValues.optimalRange ?? 0}
            onChange={(e) => handleSliderChange('optimalRange', parseFloat(e.target.value))}
            onMouseUp={(e) => handleCommitChange('optimalRange', parseFloat((e.target as HTMLInputElement).value))}
            onTouchEnd={(e) => handleCommitChange('optimalRange', parseFloat((e.target as HTMLInputElement).value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Max Range */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Max Range (m)</span>
            <span className="text-cyan-400 font-black">{localValues.maxRange ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="10000" step="100"
            value={localValues.maxRange ?? 0}
            onChange={(e) => handleSliderChange('maxRange', parseFloat(e.target.value))}
            onMouseUp={(e) => handleCommitChange('maxRange', parseFloat((e.target as HTMLInputElement).value))}
            onTouchEnd={(e) => handleCommitChange('maxRange', parseFloat((e.target as HTMLInputElement).value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Engagement Range Cap */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Engagement Range Cap (m)</span>
            <span className="text-cyan-400 font-black">{localValues.engagementRangeCap ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="10000" step="100"
            value={localValues.engagementRangeCap ?? 0}
            onChange={(e) => handleSliderChange('engagementRangeCap', parseFloat(e.target.value))}
            onMouseUp={(e) => handleCommitChange('engagementRangeCap', parseFloat((e.target as HTMLInputElement).value))}
            onTouchEnd={(e) => handleCommitChange('engagementRangeCap', parseFloat((e.target as HTMLInputElement).value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Ammo Capacity */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Ammo Capacity (-1 = Infinite)</span>
            <span className="text-cyan-400 font-black">{localValues.ammoCapacity ?? -1}</span>
          </div>
          <input
            type="range" min="-1" max="1000" step="10"
            value={localValues.ammoCapacity ?? -1}
            onChange={(e) => handleSliderChange('ammoCapacity', parseInt(e.target.value, 10))}
            onMouseUp={(e) => handleCommitChange('ammoCapacity', parseInt((e.target as HTMLInputElement).value, 10))}
            onTouchEnd={(e) => handleCommitChange('ammoCapacity', parseInt((e.target as HTMLInputElement).value, 10))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Initial Ordnance Capacity */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Initial Ordnance Capacity</span>
            <span className="text-cyan-400 font-black">{localValues.initialOrdnanceCapacity ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="500" step="10"
            value={localValues.initialOrdnanceCapacity ?? 0}
            onChange={(e) => handleSliderChange('initialOrdnanceCapacity', parseInt(e.target.value, 10))}
            onMouseUp={(e) => handleCommitChange('initialOrdnanceCapacity', parseInt((e.target as HTMLInputElement).value, 10))}
            onTouchEnd={(e) => handleCommitChange('initialOrdnanceCapacity', parseInt((e.target as HTMLInputElement).value, 10))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Turret Traverse Speed */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Turret Traverse Speed</span>
            <span className="text-cyan-400 font-black">{localValues.turretTraverseSpeed ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="10" step="0.1"
            value={localValues.turretTraverseSpeed ?? 0}
            onChange={(e) => handleSliderChange('turretTraverseSpeed', parseFloat(e.target.value))}
            onMouseUp={(e) => handleCommitChange('turretTraverseSpeed', parseFloat((e.target as HTMLInputElement).value))}
            onTouchEnd={(e) => handleCommitChange('turretTraverseSpeed', parseFloat((e.target as HTMLInputElement).value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Weapon Dispersion Bloom */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Weapon Dispersion Bloom</span>
            <span className="text-cyan-400 font-black">{localValues.weaponDispersionBloom ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="5.0" step="0.1"
            value={localValues.weaponDispersionBloom ?? 0}
            onChange={(e) => handleSliderChange('weaponDispersionBloom', parseFloat(e.target.value))}
            onMouseUp={(e) => handleCommitChange('weaponDispersionBloom', parseFloat((e.target as HTMLInputElement).value))}
            onTouchEnd={(e) => handleCommitChange('weaponDispersionBloom', parseFloat((e.target as HTMLInputElement).value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Projectile Tracking Capability */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Projectile Tracking Capability</span>
            <span className="text-cyan-400 font-black">{localValues.projectileTrackingCapability ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="5.0" step="0.1"
            value={localValues.projectileTrackingCapability ?? 0}
            onChange={(e) => handleSliderChange('projectileTrackingCapability', parseFloat(e.target.value))}
            onMouseUp={(e) => handleCommitChange('projectileTrackingCapability', parseFloat((e.target as HTMLInputElement).value))}
            onTouchEnd={(e) => handleCommitChange('projectileTrackingCapability', parseFloat((e.target as HTMLInputElement).value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Shield Penetration Factor */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Shield Penetration Factor</span>
            <span className="text-cyan-400 font-black">{localValues.shieldPenetrationFactor ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="1.0" step="0.05"
            value={localValues.shieldPenetrationFactor ?? 0}
            onChange={(e) => handleSliderChange('shieldPenetrationFactor', parseFloat(e.target.value))}
            onMouseUp={(e) => handleCommitChange('shieldPenetrationFactor', parseFloat((e.target as HTMLInputElement).value))}
            onTouchEnd={(e) => handleCommitChange('shieldPenetrationFactor', parseFloat((e.target as HTMLInputElement).value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Sustained Fire Limit (Seconds) */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Sustained Fire Limit (s)</span>
            <span className="text-cyan-400 font-black">{localValues.sustainedFireLimitSeconds ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="60" step="1"
            value={localValues.sustainedFireLimitSeconds ?? 0}
            onChange={(e) => handleSliderChange('sustainedFireLimitSeconds', parseFloat(e.target.value))}
            onMouseUp={(e) => handleCommitChange('sustainedFireLimitSeconds', parseFloat((e.target as HTMLInputElement).value))}
            onTouchEnd={(e) => handleCommitChange('sustainedFireLimitSeconds', parseFloat((e.target as HTMLInputElement).value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Barrel Cooling Duration (Seconds) */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Barrel Cooling Duration (s)</span>
            <span className="text-cyan-400 font-black">{localValues.barrelCoolingDurationSeconds ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="30" step="0.5"
            value={localValues.barrelCoolingDurationSeconds ?? 0}
            onChange={(e) => handleSliderChange('barrelCoolingDurationSeconds', parseFloat(e.target.value))}
            onMouseUp={(e) => handleCommitChange('barrelCoolingDurationSeconds', parseFloat((e.target as HTMLInputElement).value))}
            onTouchEnd={(e) => handleCommitChange('barrelCoolingDurationSeconds', parseFloat((e.target as HTMLInputElement).value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Burst Salvo Cooldown */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Burst Salvo Cooldown</span>
            <span className="text-cyan-400 font-black">{localValues.burstSalvoCooldown ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="1000" step="10"
            value={localValues.burstSalvoCooldown ?? 0}
            onChange={(e) => handleSliderChange('burstSalvoCooldown', parseFloat(e.target.value))}
            onMouseUp={(e) => handleCommitChange('burstSalvoCooldown', parseFloat((e.target as HTMLInputElement).value))}
            onTouchEnd={(e) => handleCommitChange('burstSalvoCooldown', parseFloat((e.target as HTMLInputElement).value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Beam Raycast Duration */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Beam Raycast Duration (s)</span>
            <span className="text-cyan-400 font-black">{localValues.beamRaycastDuration ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="10" step="0.1"
            value={localValues.beamRaycastDuration ?? 0}
            onChange={(e) => handleSliderChange('beamRaycastDuration', parseFloat(e.target.value))}
            onMouseUp={(e) => handleCommitChange('beamRaycastDuration', parseFloat((e.target as HTMLInputElement).value))}
            onTouchEnd={(e) => handleCommitChange('beamRaycastDuration', parseFloat((e.target as HTMLInputElement).value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Max Thermal Capacity */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Max Thermal Capacity</span>
            <span className="text-cyan-400 font-black">{localValues.maxThermalCapacity ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="5000" step="50"
            value={localValues.maxThermalCapacity ?? 0}
            onChange={(e) => handleSliderChange('maxThermalCapacity', parseFloat(e.target.value))}
            onMouseUp={(e) => handleCommitChange('maxThermalCapacity', parseFloat((e.target as HTMLInputElement).value))}
            onTouchEnd={(e) => handleCommitChange('maxThermalCapacity', parseFloat((e.target as HTMLInputElement).value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Thermal Dissipation Rate */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Thermal Dissipation Rate</span>
            <span className="text-cyan-400 font-black">{localValues.thermalDissipationRate ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="250" step="5"
            value={localValues.thermalDissipationRate ?? 0}
            onChange={(e) => handleSliderChange('thermalDissipationRate', parseFloat(e.target.value))}
            onMouseUp={(e) => handleCommitChange('thermalDissipationRate', parseFloat((e.target as HTMLInputElement).value))}
            onTouchEnd={(e) => handleCommitChange('thermalDissipationRate', parseFloat((e.target as HTMLInputElement).value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Power Grid Allocation Weight */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Power Grid Allocation Weight</span>
            <span className="text-cyan-400 font-black">{localValues.powerGridAllocationWeight ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="10" step="0.5"
            value={localValues.powerGridAllocationWeight ?? 0}
            onChange={(e) => handleSliderChange('powerGridAllocationWeight', parseFloat(e.target.value))}
            onMouseUp={(e) => handleCommitChange('powerGridAllocationWeight', parseFloat((e.target as HTMLInputElement).value))}
            onTouchEnd={(e) => handleCommitChange('powerGridAllocationWeight', parseFloat((e.target as HTMLInputElement).value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};
