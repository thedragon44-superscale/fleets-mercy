// src/components/UnitConfig/tabs/VitalsTab.tsx
import React, { useState, useEffect } from 'react';
import { UnitConfigConfigPayload } from '../types';

interface VitalsTabProps {
  config: UnitConfigConfigPayload;
  onChange: (field: keyof UnitConfigConfigPayload, value: number | boolean) => void;
}

export const VitalsTab: React.FC<VitalsTabProps> = ({ config, onChange }) => {
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
        🛡️ Vitals, Health & Shield Systems
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Shield Base */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Base Shields (HP)</span>
            <span className="text-cyan-400 font-black">{localValues.shieldBase ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="25000" step="100"
            value={localValues.shieldBase ?? 0}
            onChange={(e) => handleSliderChange('shieldBase', parseFloat(e.target.value))}
            onMouseUp={(e) => handleCommitChange('shieldBase', parseFloat((e.target as HTMLInputElement).value))}
            onTouchEnd={(e) => handleCommitChange('shieldBase', parseFloat((e.target as HTMLInputElement).value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Hull Base */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Base Hull (HP)</span>
            <span className="text-cyan-400 font-black">{localValues.hullBase ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="25000" step="100"
            value={localValues.hullBase ?? 0}
            onChange={(e) => handleSliderChange('hullBase', parseFloat(e.target.value))}
            onMouseUp={(e) => handleCommitChange('hullBase', parseFloat((e.target as HTMLInputElement).value))}
            onTouchEnd={(e) => handleCommitChange('hullBase', parseFloat((e.target as HTMLInputElement).value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Shield Regen Rate */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Shield Regen Rate (HP/s)</span>
            <span className="text-cyan-400 font-black">{localValues.shieldRegenRate ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="200" step="1"
            value={localValues.shieldRegenRate ?? 0}
            onChange={(e) => handleSliderChange('shieldRegenRate', parseFloat(e.target.value))}
            onMouseUp={(e) => handleCommitChange('shieldRegenRate', parseFloat((e.target as HTMLInputElement).value))}
            onTouchEnd={(e) => handleCommitChange('shieldRegenRate', parseFloat((e.target as HTMLInputElement).value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Shield Recharge Delay Ticks */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Recharge Delay (Ticks)</span>
            <span className="text-cyan-400 font-black">{localValues.shieldRechargeDelayTicks ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="600" step="10"
            value={localValues.shieldRechargeDelayTicks ?? 0}
            onChange={(e) => handleSliderChange('shieldRechargeDelayTicks', parseInt(e.target.value, 10))}
            onMouseUp={(e) => handleCommitChange('shieldRechargeDelayTicks', parseInt((e.target as HTMLInputElement).value, 10))}
            onTouchEnd={(e) => handleCommitChange('shieldRechargeDelayTicks', parseInt((e.target as HTMLInputElement).value, 10))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Armor Mitigation */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Armor Mitigation</span>
            <span className="text-cyan-400 font-black">{localValues.armorMitigation ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="1.0" step="0.05"
            value={localValues.armorMitigation ?? 0}
            onChange={(e) => handleSliderChange('armorMitigation', parseFloat(e.target.value))}
            onMouseUp={(e) => handleCommitChange('armorMitigation', parseFloat((e.target as HTMLInputElement).value))}
            onTouchEnd={(e) => handleCommitChange('armorMitigation', parseFloat((e.target as HTMLInputElement).value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Armor Hardness Rating */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Armor Hardness Rating</span>
            <span className="text-cyan-400 font-black">{localValues.armorHardnessRating ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="50" step="1"
            value={localValues.armorHardnessRating ?? 0}
            onChange={(e) => handleSliderChange('armorHardnessRating', parseFloat(e.target.value))}
            onMouseUp={(e) => handleCommitChange('armorHardnessRating', parseFloat((e.target as HTMLInputElement).value))}
            onTouchEnd={(e) => handleCommitChange('armorHardnessRating', parseFloat((e.target as HTMLInputElement).value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Ablative Plating Durability */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Ablative Plating Durability</span>
            <span className="text-cyan-400 font-black">{localValues.ablativePlatingDurability ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="2000" step="50"
            value={localValues.ablativePlatingDurability ?? 0}
            onChange={(e) => handleSliderChange('ablativePlatingDurability', parseFloat(e.target.value))}
            onMouseUp={(e) => handleCommitChange('ablativePlatingDurability', parseFloat((e.target as HTMLInputElement).value))}
            onTouchEnd={(e) => handleCommitChange('ablativePlatingDurability', parseFloat((e.target as HTMLInputElement).value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Directional Shield Arc */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Shield Arc (Degrees)</span>
            <span className="text-cyan-400 font-black">{localValues.directionalShieldArc ?? 0}</span>
          </div>
          <input
            type="range" min="45" max="360" step="45"
            value={localValues.directionalShieldArc ?? 0}
            onChange={(e) => handleSliderChange('directionalShieldArc', parseFloat(e.target.value))}
            onMouseUp={(e) => handleCommitChange('directionalShieldArc', parseFloat((e.target as HTMLInputElement).value))}
            onTouchEnd={(e) => handleCommitChange('directionalShieldArc', parseFloat((e.target as HTMLInputElement).value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Toggles */}
        <div className="col-span-full grid grid-cols-3 gap-2 bg-[#161922] p-3 rounded-xl border border-slate-800">
          <label className="flex items-center gap-2 cursor-pointer text-[9px] font-bold text-slate-300 uppercase">
            <input
              type="checkbox"
              checked={!!localValues.quadrantShieldingEnabled}
              onChange={(e) => {
                handleSliderChange('quadrantShieldingEnabled', e.target.checked);
                onChange('quadrantShieldingEnabled', e.target.checked);
              }}
              className="accent-cyan-400 w-3.5 h-3.5"
            />
            Quad Shielding
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-[9px] font-bold text-slate-300 uppercase">
            <input
              type="checkbox"
              checked={!!localValues.quadrantShieldPoolsEnabled}
              onChange={(e) => {
                handleSliderChange('quadrantShieldPoolsEnabled', e.target.checked);
                onChange('quadrantShieldPoolsEnabled', e.target.checked);
              }}
              className="accent-cyan-400 w-3.5 h-3.5"
            />
            Quad Shield Pools
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-[9px] font-bold text-slate-300 uppercase">
            <input
              type="checkbox"
              checked={!!localValues.quadrantHullPoolsEnabled}
              onChange={(e) => {
                handleSliderChange('quadrantHullPoolsEnabled', e.target.checked);
                onChange('quadrantHullPoolsEnabled', e.target.checked);
              }}
              className="accent-cyan-400 w-3.5 h-3.5"
            />
            Quad Hull Pools
          </label>
        </div>
      </div>
    </div>
  );
};
