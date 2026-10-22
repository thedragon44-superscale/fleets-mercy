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
            <span className="text-cyan-400 font-black">{config.dps ?? 50}</span>
          </div>
          <input
            type="range"
            min="0"
            max="1000"
            step="10"
            value={config.dps ?? 50}
            onChange={(e) => onChange('dps', parseFloat(e.target.value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Max Cooldown */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Max Cooldown (Ticks)</span>
            <span className="text-cyan-400 font-black">{config.maxCooldown ?? 20}</span>
          </div>
          <input
            type="range"
            min="1"
            max="120"
            step="1"
            value={config.maxCooldown ?? 20}
            onChange={(e) => onChange('maxCooldown', parseFloat(e.target.value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Projectile Range */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Projectile Range (m)</span>
            <span className="text-cyan-400 font-black">{config.projectileRange ?? 1500}</span>
          </div>
          <input
            type="range"
            min="200"
            max="5000"
            step="100"
            value={config.projectileRange ?? 1500}
            onChange={(e) => onChange('projectileRange', parseFloat(e.target.value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Projectile Speed */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Projectile Speed</span>
            <span className="text-cyan-400 font-black">{config.projectileSpeed ?? 18.0}</span>
          </div>
          <input
            type="range"
            min="5"
            max="60"
            step="1"
            value={config.projectileSpeed ?? 18.0}
            onChange={(e) => onChange('projectileSpeed', parseFloat(e.target.value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Max Thermal Capacity */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Max Thermal Capacity</span>
            <span className="text-cyan-400 font-black">{config.maxThermalCapacity ?? 100}</span>
          </div>
          <input
            type="range"
            min="50"
            max="500"
            step="25"
            value={config.maxThermalCapacity ?? 100}
            onChange={(e) => onChange('maxThermalCapacity', parseFloat(e.target.value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Shield Penetration Factor */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Shield Penetration Factor</span>
            <span className="text-cyan-400 font-black">{config.shieldPenetrationFactor ?? 0.0}</span>
          </div>
          <input
            type="range"
            min="0.0"
            max="1.0"
            step="0.05"
            value={config.shieldPenetrationFactor ?? 0.0}
            onChange={(e) => onChange('shieldPenetrationFactor', parseFloat(e.target.value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};
