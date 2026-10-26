// src/components/UnitConfig/UnitConfigContainer.tsx
import React, { useState, useEffect } from 'react';
import { UnitConfigHeader } from './UnitConfigHeader';
import { UnitConfigTabs } from './UnitConfigTabs';
import { MovementTab } from './tabs/MovementTab';
import { VitalsTab } from './tabs/VitalsTab';
import { CombatTab } from './tabs/CombatTab';
import { AiSensorTab } from './tabs/AiSensorTab';
import { LogisticsTab } from './tabs/LogisticsTab';
import { ConfigTabType, UnitConfigConfigPayload } from './types';
import { API_BASE_URL } from '../../config';

interface UnitConfigContainerProps {
  isOpen: boolean;
  initialUnitId?: string;
  onClose: () => void;
  sendTemplateOverride?: (unitType: string, override: any) => void;
}

export const UnitConfigContainer: React.FC<UnitConfigContainerProps> = ({
  isOpen,
  initialUnitId = 'flagship',
  onClose,
  sendTemplateOverride,
}) => {
  const [selectedUnitId, setSelectedUnitId] = useState<string>(initialUnitId);
  const [activeTab, setActiveTab] = useState<ConfigTabType>('movement');
  
  const [unitConfigs, setUnitConfigs] = useState<{ [unitId: string]: UnitConfigConfigPayload }>({});
  const [originalConfigs, setOriginalConfigs] = useState<{ [unitId: string]: UnitConfigConfigPayload }>({});
  const [statusMsg, setStatusMsg] = useState<string>('');

  useEffect(() => {
    if (initialUnitId) {
      setSelectedUnitId(initialUnitId);
    }
  }, [initialUnitId]);

  // Fetch templates from PostgreSQL on mount and establish DB baseline using correct camelCase mapping
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/templates`)
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          const loadedConfigs: { [key: string]: UnitConfigConfigPayload } = {};
          Object.keys(data).forEach((key) => {
            const t = data[key];
            loadedConfigs[key] = {
              weightClass: t.weightClass,
              visionRange: t.visionRange,
              aggroRange: t.aggroRange,
              aggroThreatWeight: t.aggroThreatWeight,
              retreatMoraleThreshold: t.retreatMoraleThreshold,
              squadCohesionLeashRange: t.squadCohesionLeashRange,
              
              shieldBase: t.shieldBase,
              hullBase: t.hullBase,
              quadrantShieldingEnabled: t.quadrantShieldingEnabled,
              quadrantShieldPoolsEnabled: t.quadrantShieldPoolsEnabled,
              quadrantHullPoolsEnabled: t.quadrantHullPoolsEnabled,
              shieldRegenRate: t.shieldRegenRate,
              shieldRechargeDelayTicks: t.shieldRechargeDelayTicks,
              directionalShieldArc: t.directionalShieldArc,
              armorMitigation: t.armorMitigation,
              armorHardnessRating: t.armorHardnessRating,
              ablativePlatingDurability: t.ablativePlatingDurability,

              speed: t.speed,
              strafingSpeed: t.strafingSpeed,
              turnRate: t.turnRate,
              angularVelocity: t.angularVelocity,
              lateralThrustPower: t.lateralThrustPower,
              reverseThrustPower: t.reverseThrustPower,
              driftCoefficient: t.driftCoefficient,
              accelerationCurve: t.accelerationCurve,

              dps: t.dps,
              maxCooldown: t.maxCooldown,
              projectileRange: t.projectileRange,
              projectileSpeed: t.projectileSpeed,
              optimalRange: t.optimalRange,
              maxRange: t.maxRange,
              engagementRangeCap: t.engagementRangeCap,
              ammoCapacity: t.ammoCapacity,
              initialOrdnanceCapacity: t.initialOrdnanceCapacity,
              turretTraverseSpeed: t.turretTraverseSpeed,
              weaponDispersionBloom: t.weaponDispersionBloom,
              projectileTrackingCapability: t.projectileTrackingCapability,
              shieldPenetrationFactor: t.shieldPenetrationFactor,
              sustainedFireLimitSeconds: t.sustainedFireLimitSeconds,
              barrelCoolingDurationSeconds: t.barrelCoolingDurationSeconds,
              burstSalvoCooldown: t.burstSalvoCooldown,
              beamRaycastDuration: t.beamRaycastDuration,
              maxThermalCapacity: t.maxThermalCapacity,
              thermalDissipationRate: t.thermalDissipationRate,
              powerGridAllocationWeight: t.powerGridAllocationWeight,

              radarCrossSection: t.radarCrossSection,
              sensorResolutionTier: t.sensorResolutionTier,
              jammingSusceptibility: t.jammingSusceptibility,
              targetLockTime: t.targetLockTime,
              radarImmunityActive: t.radarImmunityActive,
              shieldGatedStealthThreshold: t.shieldGatedStealthThreshold,
              decloakOnActionFlag: t.decloakOnActionFlag,
              stealthRecoveryDelaySeconds: t.stealthRecoveryDelaySeconds,

              resourceHarvestingType: t.resourceHarvestingType,
              requiresReconTelemetry: t.requiresReconTelemetry,
              requiresAnchorDrone: t.requiresAnchorDrone,
              requiresReconAnchor: t.requiresReconAnchor,
              portDockingBayStatus: t.portDockingBayStatus,
              starboardDeploymentBayStatus: t.starboardDeploymentBayStatus,
              salvageableUponDestruction: t.salvageableUponDestruction,
              cryoGasRadius: t.cryoGasRadius,
              cryoEffectDuration: t.cryoEffectDuration,
              gravitonVortexDuration: t.gravitonVortexDuration,
              warpCanisterCapacity: t.warpCanisterCapacity,
              emergencyWarpEvacuationTarget: t.emergencyWarpEvacuationTarget,
            };
          });
          setUnitConfigs(JSON.parse(JSON.stringify(loadedConfigs)));
          setOriginalConfigs(JSON.parse(JSON.stringify(loadedConfigs))); // Pristine DB Baseline
        }
      })
      .catch((err) => console.log('⚠️ Failed to fetch DB templates:', err));
  }, []);

  if (!isOpen) return null;

  const currentConfig: UnitConfigConfigPayload = unitConfigs[selectedUnitId] || {};

  const handleConfigChange = (field: keyof UnitConfigConfigPayload, value: any) => {
    const updatedConfig = { ...currentConfig, [field]: value };
    setUnitConfigs((prev) => ({ ...prev, [selectedUnitId]: updatedConfig }));

    // Stream live adjustments via WebSocket
    if (sendTemplateOverride) {
      sendTemplateOverride(selectedUnitId, updatedConfig);
    }
  };

  // Revert current unit back to its last database / saved configuration state
  const handleResetToDatabase = () => {
    const baseline = originalConfigs[selectedUnitId];
    if (!baseline) return;

    const resetConfig = { ...baseline };
    setUnitConfigs((prev) => ({ ...prev, [selectedUnitId]: resetConfig }));

    // Sync active WebSocket simulation room back to baseline values
    if (sendTemplateOverride) {
      sendTemplateOverride(selectedUnitId, resetConfig);
    }

    setStatusMsg(`Reverted ${selectedUnitId} to DB baseline.`);
    setTimeout(() => setStatusMsg(''), 3000);
  };

  const saveConfigurationToDB = () => {
    fetch(`${API_BASE_URL}/api/templates?type=${selectedUnitId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(currentConfig),
    })
      .then((res) => {
        if (res.ok) {
          // Update the DB baseline so subsequent resets target this new saved state during the session
          setOriginalConfigs((prev) => ({
            ...prev,
            [selectedUnitId]: JSON.parse(JSON.stringify(currentConfig)),
          }));
          setStatusMsg(`Successfully saved ${selectedUnitId} configuration!`);
          setTimeout(() => setStatusMsg(''), 3000);
        } else {
          setStatusMsg('Failed to save configuration.');
        }
      })
      .catch((err) => {
        console.log('⚠️ Save error:', err);
        setStatusMsg('Server error during save.');
      });
  };

  return (
    <div
      className="ui-interactive absolute top-4 left-[340px] w-[520px] max-h-[calc(100vh-90px)] bg-[#0f1115]/95 border border-cyan-500/40 rounded-xl p-4 z-50 flex flex-col shadow-2xl backdrop-blur-md overflow-hidden"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <UnitConfigHeader
        selectedUnitId={selectedUnitId}
        onSelectUnit={setSelectedUnitId}
        onClose={onClose}
      />

      <UnitConfigTabs activeTab={activeTab} onSelectTab={setActiveTab} />

      <div className="flex-1 overflow-y-auto pr-1 mb-2">
        {activeTab === 'movement' && (
          <MovementTab config={currentConfig} onChange={handleConfigChange} />
        )}
        {activeTab === 'vitals' && (
          <VitalsTab config={currentConfig} onChange={handleConfigChange} />
        )}
        {activeTab === 'combat' && (
          <CombatTab config={currentConfig} onChange={handleConfigChange} />
        )}
        {activeTab === 'ai' && (
          <AiSensorTab config={currentConfig} onChange={handleConfigChange} />
        )}
        {activeTab === 'logistics' && (
          <LogisticsTab config={currentConfig} onChange={handleConfigChange} />
        )}
      </div>

      {statusMsg && (
        <div className="text-cyan-400 text-[10px] font-bold text-center py-1 bg-cyan-950/40 border border-cyan-500/30 rounded mb-2">
          {statusMsg}
        </div>
      )}

      <div className="flex flex-col gap-1.5 shrink-0 pt-2 border-t border-slate-800">
        <div className="flex gap-2">
          <button
            onClick={handleResetToDatabase}
            className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold py-2 rounded-lg text-[10px] uppercase tracking-wider transition-all border border-slate-700"
            title="Revert tweaks back to last database save or initial load"
          >
            🔄 Revert to DB / Last Save
          </button>
          <button
            onClick={saveConfigurationToDB}
            className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black py-2 rounded-lg text-[10px] uppercase tracking-widest transition-all shadow-md"
          >
            💾 Save Spec Sheet
          </button>
        </div>
      </div>
    </div>
  );
};
