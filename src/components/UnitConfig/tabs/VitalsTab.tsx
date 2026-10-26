// src/components/UnitConfig/tabs/VitalsTab.tsx
import React from 'react';
import { UnitConfigConfigPayload } from '../types';

interface VitalsTabProps {
  config: UnitConfigConfigPayload;
  onChange: (field: keyof UnitConfigConfigPayload, value: number | boolean) => void;
}

export const VitalsTab: React.FC<VitalsTabProps> = ({ config, onChange }) => {
  return (
    <div className="flex flex-col gap-3">
      <div className="text-[10px] font-black text-amber-400 uppercase tracking-widest border-b border-slate-800 pb-1">
        🛡️ Vitals, Health & Shield Systems
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Shield Base */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Base Shields (HP)</span>
            <span className="text-cyan-400 font-black">{config.shieldBase ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="25000" step="100"
            value={config.shieldBase ?? 0}
            onChange={(e) => onChange('shieldBase', parseFloat(e.target.value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Hull Base */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Base Hull (HP)</span>
            <span className="text-cyan-400 font-black">{config.hullBase ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="25000" step="100"
            value={config.hullBase ?? 0}
            onChange={(e) => onChange('hullBase', parseFloat(e.target.value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Shield Regen Rate */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Shield Regen Rate (HP/s)</span>
            <span className="text-cyan-400 font-black">{config.shieldRegenRate ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="200" step="1"
            value={config.shieldRegenRate ?? 0}
            onChange={(e) => onChange('shieldRegenRate', parseFloat(e.target.value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Shield Recharge Delay Ticks */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Recharge Delay (Ticks)</span>
            <span className="text-cyan-400 font-black">{config.shieldRechargeDelayTicks ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="600" step="10"
            value={config.shieldRechargeDelayTicks ?? 0}
            onChange={(e) => onChange('shieldRechargeDelayTicks', parseInt(e.target.value, 10))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Armor Mitigation */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Armor Mitigation</span>
            <span className="text-cyan-400 font-black">{config.armorMitigation ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="1.0" step="0.05"
            value={config.armorMitigation ?? 0}
            onChange={(e) => onChange('armorMitigation', parseFloat(e.target.value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Armor Hardness Rating */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Armor Hardness Rating</span>
            <span className="text-cyan-400 font-black">{config.armorHardnessRating ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="50" step="1"
            value={config.armorHardnessRating ?? 0}
            onChange={(e) => onChange('armorHardnessRating', parseFloat(e.target.value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Ablative Plating Durability */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Ablative Plating Durability</span>
            <span className="text-cyan-400 font-black">{config.ablativePlatingDurability ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="2000" step="50"
            value={config.ablativePlatingDurability ?? 0}
            onChange={(e) => onChange('ablativePlatingDurability', parseFloat(e.target.value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Directional Shield Arc */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Shield Arc (Degrees)</span>
            <span className="text-cyan-400 font-black">{config.directionalShieldArc ?? 0}</span>
          </div>
          <input
            type="range" min="45" max="360" step="45"
            value={config.directionalShieldArc ?? 0}
            onChange={(e) => onChange('directionalShieldArc', parseFloat(e.target.value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Toggles */}
        <div className="col-span-full grid grid-cols-3 gap-2 bg-[#161922] p-3 rounded-xl border border-slate-800">
          <label className="flex items-center gap-2 cursor-pointer text-[9px] font-bold text-slate-300 uppercase">
            <input
              type="checkbox"
              checked={!!config.quadrantShieldingEnabled}
              onChange={(e) => onChange('quadrantShieldingEnabled', e.target.checked)}
              className="accent-cyan-400 w-3.5 h-3.5"
            />
            Quad Shielding
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-[9px] font-bold text-slate-300 uppercase">
            <input
              type="checkbox"
              checked={!!config.quadrantShieldPoolsEnabled}
              onChange={(e) => onChange('quadrantShieldPoolsEnabled', e.target.checked)}
              className="accent-cyan-400 w-3.5 h-3.5"
            />
            Quad Shield Pools
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-[9px] font-bold text-slate-300 uppercase">
            <input
              type="checkbox"
              checked={!!config.quadrantHullPoolsEnabled}
              onChange={(e) => onChange('quadrantHullPoolsEnabled', e.target.checked)}
              className="accent-cyan-400 w-3.5 h-3.5"
            />
            Quad Hull Pools
          </label>
        </div>
      </div>
    </div>
  );
};
