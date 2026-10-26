// src/components/UnitConfig/tabs/LogisticsTab.tsx
import React, { useState, useEffect } from 'react';
import { UnitConfigConfigPayload } from '../types';

interface LogisticsTabProps {
  config: UnitConfigConfigPayload;
  onChange: (field: keyof UnitConfigConfigPayload, value: number | boolean) => void;
}

export const LogisticsTab: React.FC<LogisticsTabProps> = ({ config, onChange }) => {
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
        📦 Logistics, Harvesting & Special Systems
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Resource Harvesting Type */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Harvesting Type ID</span>
            <span className="text-cyan-400 font-black">{localValues.resourceHarvestingType ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="10" step="1"
            value={localValues.resourceHarvestingType ?? 0}
            onChange={(e) => handleSliderChange('resourceHarvestingType', parseInt(e.target.value, 10))}
            onMouseUp={(e) => handleCommitChange('resourceHarvestingType', parseInt((e.target as HTMLInputElement).value, 10))}
            onTouchEnd={(e) => handleCommitChange('resourceHarvestingType', parseInt((e.target as HTMLInputElement).value, 10))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Warp Canister Capacity */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Warp Canister Capacity</span>
            <span className="text-cyan-400 font-black">{localValues.warpCanisterCapacity ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="50" step="1"
            value={localValues.warpCanisterCapacity ?? 0}
            onChange={(e) => handleSliderChange('warpCanisterCapacity', parseInt(e.target.value, 10))}
            onMouseUp={(e) => handleCommitChange('warpCanisterCapacity', parseInt((e.target as HTMLInputElement).value, 10))}
            onTouchEnd={(e) => handleCommitChange('warpCanisterCapacity', parseInt((e.target as HTMLInputElement).value, 10))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Cryo Gas Radius */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Cryo Gas Radius</span>
            <span className="text-cyan-400 font-black">{localValues.cryoGasRadius ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="1000" step="50"
            value={localValues.cryoGasRadius ?? 0}
            onChange={(e) => handleSliderChange('cryoGasRadius', parseFloat(e.target.value))}
            onMouseUp={(e) => handleCommitChange('cryoGasRadius', parseFloat((e.target as HTMLInputElement).value))}
            onTouchEnd={(e) => handleCommitChange('cryoGasRadius', parseFloat((e.target as HTMLInputElement).value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Cryo Effect Duration */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Cryo Effect Duration (s)</span>
            <span className="text-cyan-400 font-black">{localValues.cryoEffectDuration ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="30" step="0.5"
            value={localValues.cryoEffectDuration ?? 0}
            onChange={(e) => handleSliderChange('cryoEffectDuration', parseFloat(e.target.value))}
            onMouseUp={(e) => handleCommitChange('cryoEffectDuration', parseFloat((e.target as HTMLInputElement).value))}
            onTouchEnd={(e) => handleCommitChange('cryoEffectDuration', parseFloat((e.target as HTMLInputElement).value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Graviton Vortex Duration */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Graviton Vortex Duration (s)</span>
            <span className="text-cyan-400 font-black">{localValues.gravitonVortexDuration ?? 0}</span>
          </div>
          <input
            type="range" min="0" max="30" step="0.5"
            value={localValues.gravitonVortexDuration ?? 0}
            onChange={(e) => handleSliderChange('gravitonVortexDuration', parseFloat(e.target.value))}
            onMouseUp={(e) => handleCommitChange('gravitonVortexDuration', parseFloat((e.target as HTMLInputElement).value))}
            onTouchEnd={(e) => handleCommitChange('gravitonVortexDuration', parseFloat((e.target as HTMLInputElement).value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Status Flags Grid */}
        <div className="col-span-full grid grid-cols-2 gap-2 bg-[#161922] p-3 rounded-xl border border-slate-800">
          <label className="flex items-center gap-2 cursor-pointer text-[9px] font-bold text-slate-300 uppercase">
            <input
              type="checkbox"
              checked={!!localValues.portDockingBayStatus}
              onChange={(e) => {
                handleSliderChange('portDockingBayStatus', e.target.checked);
                onChange('portDockingBayStatus', e.target.checked);
              }}
              className="accent-cyan-400 w-3.5 h-3.5"
            />
            Port Docking Bay Status
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-[9px] font-bold text-slate-300 uppercase">
            <input
              type="checkbox"
              checked={!!localValues.starboardDeploymentBayStatus}
              onChange={(e) => {
                handleSliderChange('starboardDeploymentBayStatus', e.target.checked);
                onChange('starboardDeploymentBayStatus', e.target.checked);
              }}
              className="accent-cyan-400 w-3.5 h-3.5"
            />
            Starboard Deployment Bay Active
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-[9px] font-bold text-slate-300 uppercase">
            <input
              type="checkbox"
              checked={!!localValues.salvageableUponDestruction}
              onChange={(e) => {
                handleSliderChange('salvageableUponDestruction', e.target.checked);
                onChange('salvageableUponDestruction', e.target.checked);
              }}
              className="accent-cyan-400 w-3.5 h-3.5"
            />
            Salvageable Upon Destruction
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-[9px] font-bold text-slate-300 uppercase">
            <input
              type="checkbox"
              checked={!!localValues.requiresReconTelemetry}
              onChange={(e) => {
                handleSliderChange('requiresReconTelemetry', e.target.checked);
                onChange('requiresReconTelemetry', e.target.checked);
              }}
              className="accent-cyan-400 w-3.5 h-3.5"
            />
            Requires Recon Telemetry
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-[9px] font-bold text-slate-300 uppercase">
            <input
              type="checkbox"
              checked={!!localValues.requiresAnchorDrone}
              onChange={(e) => {
                handleSliderChange('requiresAnchorDrone', e.target.checked);
                onChange('requiresAnchorDrone', e.target.checked);
              }}
              className="accent-cyan-400 w-3.5 h-3.5"
            />
            Requires Anchor Drone
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-[9px] font-bold text-slate-300 uppercase">
            <input
              type="checkbox"
              checked={!!localValues.requiresReconAnchor}
              onChange={(e) => {
                handleSliderChange('requiresReconAnchor', e.target.checked);
                onChange('requiresReconAnchor', e.target.checked);
              }}
              className="accent-cyan-400 w-3.5 h-3.5"
            />
            Requires Recon Anchor
          </label>

          <label className="col-span-full flex items-center gap-2 cursor-pointer text-[9px] font-bold text-slate-300 uppercase">
            <input
              type="checkbox"
              checked={!!localValues.emergencyWarpEvacuationTarget}
              onChange={(e) => {
                handleSliderChange('emergencyWarpEvacuationTarget', e.target.checked);
                onChange('emergencyWarpEvacuationTarget', e.target.checked);
              }}
              className="accent-cyan-400 w-3.5 h-3.5"
            />
            Emergency Warp Evacuation Target Active
          </label>
        </div>
      </div>
    </div>
  );
};
