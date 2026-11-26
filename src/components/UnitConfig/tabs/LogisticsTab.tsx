// src/components/UnitConfig/tabs/LogisticsTab.tsx
import React from 'react';
import { UnitConfigConfigPayload } from '../types';
import { VariableDoc } from '../../../constants/variableDocs';
import { ConfigSliderCard } from '../common/ConfigSliderCard';
import { ConfigCheckboxRow } from '../common/ConfigCheckboxRow';

interface LogisticsTabProps {
  config: UnitConfigConfigPayload;
  modifiedFields?: Set<keyof UnitConfigConfigPayload>;
  onChange: (field: keyof UnitConfigConfigPayload, value: number | boolean) => void;
  onOpenDoc: (doc: VariableDoc) => void;
}

const LOGISTICS_SLIDERS: Array<{
  field: keyof UnitConfigConfigPayload;
  label: string;
  min: number;
  max: number;
  step: number;
}> = [
  { field: 'resourceHarvestingType', label: 'Harvesting Type ID', min: 0, max: 10, step: 1 },
  { field: 'warpCanisterCapacity', label: 'Warp Canister Capacity', min: 0, max: 50, step: 1 },
  { field: 'cryoGasRadius', label: 'Cryo Gas Radius', min: 0, max: 1000, step: 50 },
  { field: 'cryoEffectDuration', label: 'Cryo Effect Duration (s)', min: 0, max: 30, step: 0.5 },
  { field: 'gravitonVortexDuration', label: 'Graviton Vortex Duration (s)', min: 0, max: 30, step: 0.5 },
];

export const LogisticsTab: React.FC<LogisticsTabProps> = ({
  config,
  modifiedFields,
  onChange,
  onOpenDoc,
}) => {
  return (
    <div className="flex flex-col gap-3">
      <div className="text-[10px] font-black text-amber-400 uppercase tracking-widest border-b border-slate-800 pb-1">
        📦 Logistics, Harvesting & Special Systems
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {LOGISTICS_SLIDERS.map(({ field, label, min, max, step }) => (
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

        <div className="col-span-full grid grid-cols-1 sm:grid-cols-2 gap-2">
          <ConfigCheckboxRow
            field="portDockingBayStatus"
            label="Port Docking Bay Status"
            checked={!!config.portDockingBayStatus}
            isModified={modifiedFields?.has('portDockingBayStatus')}
            onChange={onChange}
            onOpenDoc={onOpenDoc}
          />
          <ConfigCheckboxRow
            field="starboardDeploymentBayStatus"
            label="Starboard Deployment Bay Active"
            checked={!!config.starboardDeploymentBayStatus}
            isModified={modifiedFields?.has('starboardDeploymentBayStatus')}
            onChange={onChange}
            onOpenDoc={onOpenDoc}
          />
          <ConfigCheckboxRow
            field="salvageableUponDestruction"
            label="Salvageable Upon Destruction"
            checked={!!config.salvageableUponDestruction}
            isModified={modifiedFields?.has('salvageableUponDestruction')}
            onChange={onChange}
            onOpenDoc={onOpenDoc}
          />
          <ConfigCheckboxRow
            field="requiresReconTelemetry"
            label="Requires Recon Telemetry"
            checked={!!config.requiresReconTelemetry}
            isModified={modifiedFields?.has('requiresReconTelemetry')}
            onChange={onChange}
            onOpenDoc={onOpenDoc}
          />
          <ConfigCheckboxRow
            field="requiresAnchorDrone"
            label="Requires Anchor Drone"
            checked={!!config.requiresAnchorDrone}
            isModified={modifiedFields?.has('requiresAnchorDrone')}
            onChange={onChange}
            onOpenDoc={onOpenDoc}
          />
          <ConfigCheckboxRow
            field="requiresReconAnchor"
            label="Requires Recon Anchor"
            checked={!!config.requiresReconAnchor}
            isModified={modifiedFields?.has('requiresReconAnchor')}
            onChange={onChange}
            onOpenDoc={onOpenDoc}
          />
          <div className="col-span-full">
            <ConfigCheckboxRow
              field="emergencyWarpEvacuationTarget"
              label="Emergency Warp Evacuation Target Active"
              checked={!!config.emergencyWarpEvacuationTarget}
              isModified={modifiedFields?.has('emergencyWarpEvacuationTarget')}
              onChange={onChange}
              onOpenDoc={onOpenDoc}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
