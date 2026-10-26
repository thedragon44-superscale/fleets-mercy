// src/components/UnitConfig/tabs/MovementTab.tsx
import React from 'react';
import { UnitConfigConfigPayload } from '../types';

interface MovementTabProps {
  config: UnitConfigConfigPayload;
  onChange: (field: keyof UnitConfigConfigPayload, value: number) => void;
}

export const MovementTab: React.FC<MovementTabProps> = ({ config, onChange }) => {
  return (
    <div className="flex flex-col gap-3">
      <div className="text-[10px] font-black text-amber-400 uppercase tracking-widest border-b border-slate-800 pb-1">
        🚀 Movement & Physics Dynamics
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Speed */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Base Speed</span>
            <span className="text-cyan-400 font-black">{config.speed ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="25" step="0.5"
            value={config.speed ?? 0}
            onChange={(e) => onChange('speed', parseFloat(e.target.value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Strafing Speed */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Strafing Speed</span>
            <span className="text-cyan-400 font-black">{config.strafingSpeed ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="20" step="0.5"
            value={config.strafingSpeed ?? 0}
            onChange={(e) => onChange('strafingSpeed', parseFloat(e.target.value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Turn Rate */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Turn Rate</span>
            <span className="text-cyan-400 font-black">{config.turnRate ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="1.0" step="0.01"
            value={config.turnRate ?? 0}
            onChange={(e) => onChange('turnRate', parseFloat(e.target.value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Angular Velocity */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Angular Velocity</span>
            <span className="text-cyan-400 font-black">{config.angularVelocity ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="2.0" step="0.02"
            value={config.angularVelocity ?? 0}
            onChange={(e) => onChange('angularVelocity', parseFloat(e.target.value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Lateral Thrust Power */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Lateral Thrust Power</span>
            <span className="text-cyan-400 font-black">{config.lateralThrustPower ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="10" step="0.2"
            value={config.lateralThrustPower ?? 0}
            onChange={(e) => onChange('lateralThrustPower', parseFloat(e.target.value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Reverse Thrust Power */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Reverse Thrust Power</span>
            <span className="text-cyan-400 font-black">{config.reverseThrustPower ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="10" step="0.2"
            value={config.reverseThrustPower ?? 0}
            onChange={(e) => onChange('reverseThrustPower', parseFloat(e.target.value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Drift Coefficient */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Drift Coefficient</span>
            <span className="text-cyan-400 font-black">{config.driftCoefficient ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="2.0" step="0.05"
            value={config.driftCoefficient ?? 0}
            onChange={(e) => onChange('driftCoefficient', parseFloat(e.target.value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Acceleration Curve */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Acceleration Curve</span>
            <span className="text-cyan-400 font-black">{config.accelerationCurve ?? 0}</span>
          </div>
          <input
            type="range" min="0.1" max="5.0" step="0.1"
            value={config.accelerationCurve ?? 0}
            onChange={(e) => onChange('accelerationCurve', parseFloat(e.target.value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};
