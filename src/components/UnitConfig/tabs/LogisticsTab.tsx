// src/components/UnitConfig/tabs/LogisticsTab.tsx
import React from 'react';
import { UnitConfigConfigPayload } from '../types';

interface LogisticsTabProps {
  config: UnitConfigConfigPayload;
  onChange: (field: keyof UnitConfigConfigPayload, value: number | boolean) => void;
}

export const LogisticsTab: React.FC<LogisticsTabProps> = ({ config, onChange }) => {
  return (
    <div className="flex flex-col gap-3">
      <div className="text-[10px] font-black text-amber-400 uppercase tracking-widest border-b border-slate-800 pb-1">
        📦 Logistics, Harvesting & Special Systems
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Resource Harvesting Type */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Harvesting Type ID</span>
            <span className="text-cyan-400 font-black">{config.resourceHarvestingType ?? 0}</span>
          </div>
          <input
            type="range"
            min="0"
            max="5"
            step="1"
            value={config.resourceHarvestingType ?? 0}
            onChange={(e) => onChange('resourceHarvestingType', parseInt(e.target.value, 10))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Warp Canister Capacity */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Warp Canister Capacity</span>
            <span className="text-cyan-400 font-black">{config.warpCanisterCapacity ?? 0}</span>
          </div>
          <input
            type="range"
            min="0"
            max="20"
            step="1"
            value={config.warpCanisterCapacity ?? 0}
            onChange={(e) => onChange('warpCanisterCapacity', parseInt(e.target.value, 10))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Status Flags Grid */}
        <div className="col-span-full grid grid-cols-2 gap-2 bg-[#161922] p-3 rounded-xl border border-slate-800">
          <label className="flex items-center gap-2 cursor-pointer text-[9px] font-bold text-slate-300 uppercase">
            <input
              type="checkbox"
              checked={!!config.portDockingBayStatus}
              onChange={(e) => onChange('portDockingBayStatus', e.target.checked)}
              className="accent-cyan-400 w-3.5 h-3.5"
            />
            Port Docking Bay Status
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-[9px] font-bold text-slate-300 uppercase">
            <input
              type="checkbox"
              checked={!!config.starboardDeploymentBayStatus}
              onChange={(e) => onChange('starboardDeploymentBayStatus', e.target.checked)}
              className="accent-cyan-400 w-3.5 h-3.5"
            />
            Starboard Deployment Bay Active
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-[9px] font-bold text-slate-300 uppercase">
            <input
              type="checkbox"
              checked={!!config.salvageableUponDestruction}
              onChange={(e) => onChange('salvageableUponDestruction', e.target.checked)}
              className="accent-cyan-400 w-3.5 h-3.5"
            />
            Salvageable Upon Destruction
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-[9px] font-bold text-slate-300 uppercase">
            <input
              type="checkbox"
              checked={!!config.requiresReconTelemetry}
              onChange={(e) => onChange('requiresReconTelemetry', e.target.checked)}
              className="accent-cyan-400 w-3.5 h-3.5"
            />
            Requires Recon Telemetry
          </label>
        </div>
      </div>
    </div>
  );
};
