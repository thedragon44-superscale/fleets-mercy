// src/components/UnitConfig/UnitConfigTabs.tsx
import React from 'react';
import { ConfigTabType, UnitConfigConfigPayload } from './types';

interface UnitConfigTabsProps {
  activeTab: ConfigTabType;
  modifiedFields?: Set<keyof UnitConfigConfigPayload>;
  onSelectTab: (tab: ConfigTabType) => void;
}

const TAB_FIELDS: Record<ConfigTabType, Array<keyof UnitConfigConfigPayload>> = {
  movement: [
    'speed',
    'strafingSpeed',
    'turnRate',
    'angularVelocity',
    'lateralThrustPower',
    'reverseThrustPower',
    'driftCoefficient',
    'accelerationCurve',
    'brakingThrustPower',
    'inertialDamping',
  ],
  vitals: [
    'shieldBase',
    'hullBase',
    'shieldRegenRate',
    'shieldRechargeDelayTicks',
    'armorMitigation',
    'armorHardnessRating',
    'ablativePlatingDurability',
    'directionalShieldArc',
    'quadrantShieldingEnabled',
    'quadrantShieldPoolsEnabled',
    'quadrantHullPoolsEnabled',
  ],
  combat: [
    'dps',
    'maxCooldown',
    'projectileSpeed',
    'projectileRange',
    'optimalRange',
    'maxRange',
    'engagementRangeCap',
    'ammoCapacity',
    'initialOrdnanceCapacity',
    'turretTraverseSpeed',
    'weaponDispersionBloom',
    'projectileTrackingCapability',
    'shieldPenetrationFactor',
    'sustainedFireLimitSeconds',
    'barrelCoolingDurationSeconds',
    'burstSalvoCooldown',
    'beamRaycastDuration',
    'maxThermalCapacity',
    'thermalDissipationRate',
    'powerGridAllocationWeight',
  ],
  ai: [
    'weightClass',
    'visionRange',
    'sensorRange',
    'aggroRange',
    'aggroThreatWeight',
    'retreatMoraleThreshold',
    'squadCohesionLeashRange',
    'radarCrossSection',
    'sensorResolutionTier',
    'jammingSusceptibility',
    'targetLockTime',
    'shieldGatedStealthThreshold',
    'stealthRecoveryDelaySeconds',
    'radarImmunityActive',
    'decloakOnActionFlag',
  ],
  logistics: [
    'resourceHarvestingType',
    'warpCanisterCapacity',
    'cryoGasRadius',
    'cryoEffectDuration',
    'gravitonVortexDuration',
    'portDockingBayStatus',
    'starboardDeploymentBayStatus',
    'salvageableUponDestruction',
    'requiresReconTelemetry',
    'requiresAnchorDrone',
    'requiresReconAnchor',
    'emergencyWarpEvacuationTarget',
  ],
};

const TABS: { id: ConfigTabType; label: string; icon: string }[] = [
  { id: 'movement', label: 'Movement', icon: '🚀' },
  { id: 'vitals', label: 'Vitals', icon: '🛡️' },
  { id: 'combat', label: 'Combat', icon: '⚡' },
  { id: 'ai', label: 'AI & Sensors', icon: '📡' },
  { id: 'logistics', label: 'Logistics', icon: '📦' },
];

export const UnitConfigTabs: React.FC<UnitConfigTabsProps> = ({
  activeTab,
  modifiedFields,
  onSelectTab,
}) => {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 bg-[#161922] p-1.5 rounded-xl border border-slate-800 shrink-0 mb-3">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        const hasEdits =
          !!modifiedFields &&
          TAB_FIELDS[tab.id].some((field) => modifiedFields.has(field));

        return (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={`relative flex items-center justify-center gap-1 py-2 px-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${
              isActive
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <span>{tab.icon}</span>
            <span className="truncate">{tab.label}</span>
            {hasEdits && (
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  isActive ? 'bg-slate-950' : 'bg-amber-400'
                }`}
                title="Contains unsaved edits"
              />
            )}
          </button>
        );
      })}
    </div>
  );
};
