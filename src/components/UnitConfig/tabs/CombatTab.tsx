// src/components/UnitConfig/tabs/CombatTab.tsx
import React from 'react';
import { UnitConfigConfigPayload } from '../types';

interface CombatTabProps {
  config: UnitConfigConfigPayload;
  onChange: (field: keyof UnitConfigConfigPayload, value: number) => void;
}

export const CombatTab: React.FC<CombatTabProps> = ({ config, onChange }) => {
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
            <span className="text-cyan-400 font-black">{config.dps ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="5000" step="50"
            value={config.dps ?? 0}
            onChange={(e) => onChange('dps', parseFloat(e.target.value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Max Cooldown */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Max Cooldown (Ticks)</span>
            <span className="text-cyan-400 font-black">{config.maxCooldown ?? 0}</span>
          </div>
          <input
            type="range" min="1" max="120" step="1"
            value={config.maxCooldown ?? 0}
            onChange={(e) => onChange('maxCooldown', parseInt(e.target.value, 10))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Projectile Speed */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Projectile Speed</span>
            <span className="text-cyan-400 font-black">{config.projectileSpeed ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="100" step="1"
            value={config.projectileSpeed ?? 0}
            onChange={(e) => onChange('projectileSpeed', parseFloat(e.target.value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Projectile Range */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Projectile Range (m)</span>
            <span className="text-cyan-400 font-black">{config.projectileRange ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="10000" step="100"
            value={config.projectileRange ?? 0}
            onChange={(e) => onChange('projectileRange', parseFloat(e.target.value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Optimal Range */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Optimal Range (m)</span>
            <span className="text-cyan-400 font-black">{config.optimalRange ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="10000" step="100"
            value={config.optimalRange ?? 0}
            onChange={(e) => onChange('optimalRange', parseFloat(e.target.value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Max Range */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Max Range (m)</span>
            <span className="text-cyan-400 font-black">{config.maxRange ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="10000" step="100"
            value={config.maxRange ?? 0}
            onChange={(e) => onChange('maxRange', parseFloat(e.target.value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Engagement Range Cap */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Engagement Range Cap (m)</span>
            <span className="text-cyan-400 font-black">{config.engagementRangeCap ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="10000" step="100"
            value={config.engagementRangeCap ?? 0}
            onChange={(e) => onChange('engagementRangeCap', parseFloat(e.target.value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Ammo Capacity */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Ammo Capacity (-1 = Infinite)</span>
            <span className="text-cyan-400 font-black">{config.ammoCapacity ?? -1}</span>
          </div>
          <input
            type="range" min="-1" max="1000" step="10"
            value={config.ammoCapacity ?? -1}
            onChange={(e) => onChange('ammoCapacity', parseInt(e.target.value, 10))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Initial Ordnance Capacity */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Initial Ordnance Capacity</span>
            <span className="text-cyan-400 font-black">{config.initialOrdnanceCapacity ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="500" step="10"
            value={config.initialOrdnanceCapacity ?? 0}
            onChange={(e) => onChange('initialOrdnanceCapacity', parseInt(e.target.value, 10))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Turret Traverse Speed */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Turret Traverse Speed</span>
            <span className="text-cyan-400 font-black">{config.turretTraverseSpeed ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="10" step="0.1"
            value={config.turretTraverseSpeed ?? 0}
            onChange={(e) => onChange('turretTraverseSpeed', parseFloat(e.target.value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Weapon Dispersion Bloom */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Weapon Dispersion Bloom</span>
            <span className="text-cyan-400 font-black">{config.weaponDispersionBloom ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="5.0" step="0.1"
            value={config.weaponDispersionBloom ?? 0}
            onChange={(e) => onChange('weaponDispersionBloom', parseFloat(e.target.value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Projectile Tracking Capability */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Projectile Tracking Capability</span>
            <span className="text-cyan-400 font-black">{config.projectileTrackingCapability ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="5.0" step="0.1"
            value={config.projectileTrackingCapability ?? 0}
            onChange={(e) => onChange('projectileTrackingCapability', parseFloat(e.target.value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Shield Penetration Factor */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Shield Penetration Factor</span>
            <span className="text-cyan-400 font-black">{config.shieldPenetrationFactor ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="1.0" step="0.05"
            value={config.shieldPenetrationFactor ?? 0}
            onChange={(e) => onChange('shieldPenetrationFactor', parseFloat(e.target.value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Sustained Fire Limit (Seconds) */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Sustained Fire Limit (s)</span>
            <span className="text-cyan-400 font-black">{config.sustainedFireLimitSeconds ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="60" step="1"
            value={config.sustainedFireLimitSeconds ?? 0}
            onChange={(e) => onChange('sustainedFireLimitSeconds', parseFloat(e.target.value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Barrel Cooling Duration (Seconds) */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Barrel Cooling Duration (s)</span>
            <span className="text-cyan-400 font-black">{config.barrelCoolingDurationSeconds ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="30" step="0.5"
            value={config.barrelCoolingDurationSeconds ?? 0}
            onChange={(e) => onChange('barrelCoolingDurationSeconds', parseFloat(e.target.value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Burst Salvo Cooldown */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Burst Salvo Cooldown</span>
            <span className="text-cyan-400 font-black">{config.burstSalvoCooldown ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="1000" step="10"
            value={config.burstSalvoCooldown ?? 0}
            onChange={(e) => onChange('burstSalvoCooldown', parseFloat(e.target.value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Beam Raycast Duration */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Beam Raycast Duration (s)</span>
            <span className="text-cyan-400 font-black">{config.beamRaycastDuration ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="10" step="0.1"
            value={config.beamRaycastDuration ?? 0}
            onChange={(e) => onChange('beamRaycastDuration', parseFloat(e.target.value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Max Thermal Capacity */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Max Thermal Capacity</span>
            <span className="text-cyan-400 font-black">{config.maxThermalCapacity ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="5000" step="50"
            value={config.maxThermalCapacity ?? 0}
            onChange={(e) => onChange('maxThermalCapacity', parseFloat(e.target.value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Thermal Dissipation Rate */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Thermal Dissipation Rate</span>
            <span className="text-cyan-400 font-black">{config.thermalDissipationRate ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="250" step="5"
            value={config.thermalDissipationRate ?? 0}
            onChange={(e) => onChange('thermalDissipationRate', parseFloat(e.target.value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Power Grid Allocation Weight */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Power Grid Allocation Weight</span>
            <span className="text-cyan-400 font-black">{config.powerGridAllocationWeight ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="10" step="0.5"
            value={config.powerGridAllocationWeight ?? 0}
            onChange={(e) => onChange('powerGridAllocationWeight', parseFloat(e.target.value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};
