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
import { VariableDoc } from '../../constants/variableDocs';
import { VariableInfoModal } from '../VariableInfoModal';

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
  const [activeDoc, setActiveDoc] = useState<VariableDoc | null>(null);

  useEffect(() => {
    if (initialUnitId) {
      setSelectedUnitId(initialUnitId);
    }
  }, [initialUnitId]);

  // Robust template fetch supporting both camelCase and snake_case backend payloads
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/templates`)
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          const loadedConfigs: { [key: string]: UnitConfigConfigPayload } = {};
          Object.keys(data).forEach((key) => {
            const t = data[key];
            
            // Safe accessor checking both camelCase and snake_case with fallback defaults
            const pick = (camel: string, snake: string, fallback: any = 0) => {
              if (t[camel] !== undefined && t[camel] !== null) return t[camel];
              if (t[snake] !== undefined && t[snake] !== null) return t[snake];
              return fallback;
            };

            loadedConfigs[key] = {
              weightClass: pick('weightClass', 'weight_class', 1),
              visionRange: pick('visionRange', 'vision_range', 1000),
              sensorRange: pick('sensorRange', 'sensor_range', 2500),
              aggroRange: pick('aggroRange', 'aggro_range', 1000),
              aggroThreatWeight: pick('aggroThreatWeight', 'aggro_threat_weight', 1.0),
              retreatMoraleThreshold: pick('retreatMoraleThreshold', 'retreat_morale_threshold', 0.25),
              squadCohesionLeashRange: pick('squadCohesionLeashRange', 'squad_cohesion_leash_range', 500),
              
              shieldBase: pick('shieldBase', 'shield_base', 100),
              hullBase: pick('hullBase', 'hull_base', 100),
              quadrantShieldingEnabled: !!pick('quadrantShieldingEnabled', 'quadrant_shielding_enabled', false),
              quadrantShieldPoolsEnabled: !!pick('quadrantShieldPoolsEnabled', 'quadrant_shield_pools_enabled', false),
              quadrantHullPoolsEnabled: !!pick('quadrantHullPoolsEnabled', 'quadrant_hull_pools_enabled', false),
              shieldRegenRate: pick('shieldRegenRate', 'shield_regen_rate', 1.0),
              shieldRechargeDelayTicks: pick('shieldRechargeDelayTicks', 'shield_recharge_delay_ticks', 60),
              directionalShieldArc: pick('directionalShieldArc', 'directional_shield_arc', 180),
              armorMitigation: pick('armorMitigation', 'armor_mitigation', 0),
              armorHardnessRating: pick('armorHardnessRating', 'armor_hardness_rating', 1),
              ablativePlatingDurability: pick('ablativePlatingDurability', 'ablative_plating_durability', 0),

              speed: pick('speed', 'speed', 5),
              strafingSpeed: pick('strafingSpeed', 'strafing_speed', 2),
              turnRate: pick('turnRate', 'turn_rate', 0.1),
              angularVelocity: pick('angularVelocity', 'angular_velocity', 0.5),
              lateralThrustPower: pick('lateralThrustPower', 'lateral_thrust_power', 1),
              reverseThrustPower: pick('reverseThrustPower', 'reverse_thrust_power', 1),
              driftCoefficient: pick('driftCoefficient', 'drift_coefficient', 0.1),
              accelerationCurve: pick('accelerationCurve', 'acceleration_curve', 1),

              dps: pick('dps', 'dps', 10),
              maxCooldown: pick('maxCooldown', 'max_cooldown', 30),
              projectileRange: pick('projectileRange', 'projectile_range', 1000),
              projectileSpeed: pick('projectileSpeed', 'projectile_speed', 20),
              optimalRange: pick('optimalRange', 'optimal_range', 500),
              maxRange: pick('maxRange', 'max_range', 1500),
              engagementRangeCap: pick('engagementRangeCap', 'engagement_range_cap', 1500),
              ammoCapacity: pick('ammoCapacity', 'ammo_capacity', -1),
              initialOrdnanceCapacity: pick('initialOrdnanceCapacity', 'initial_ordnance_capacity', 100),
              turretTraverseSpeed: pick('turretTraverseSpeed', 'turret_traverse_speed', 1),
              weaponDispersionBloom: pick('weaponDispersionBloom', 'weapon_dispersion_bloom', 0),
              projectileTrackingCapability: pick('projectileTrackingCapability', 'projectile_tracking_capability', 0),
              shieldPenetrationFactor: pick('shieldPenetrationFactor', 'shield_penetration_factor', 0),
              sustainedFireLimitSeconds: pick('sustainedFireLimitSeconds', 'sustained_fire_limit_seconds', 10),
              barrelCoolingDurationSeconds: pick('barrelCoolingDurationSeconds', 'barrel_cooling_duration_seconds', 3),
              burstSalvoCooldown: pick('burstSalvoCooldown', 'burst_salvo_cooldown', 0),
              beamRaycastDuration: pick('beamRaycastDuration', 'beam_raycast_duration', 0),
              maxThermalCapacity: pick('maxThermalCapacity', 'max_thermal_capacity', 100),
              thermalDissipationRate: pick('thermalDissipationRate', 'thermal_dissipation_rate', 10),
              powerGridAllocationWeight: pick('powerGridAllocationWeight', 'power_grid_allocation_weight', 1),

              radarCrossSection: pick('radarCrossSection', 'radar_cross_section', 1),
              sensorResolutionTier: pick('sensorResolutionTier', 'sensor_resolution_tier', 1),
              jammingSusceptibility: pick('jammingSusceptibility', 'jamming_susceptibility', 0),
              targetLockTime: pick('targetLockTime', 'target_lock_time', 1),
              radarImmunityActive: !!pick('radarImmunityActive', 'radar_immunity_active', false),
              shieldGatedStealthThreshold: pick('shieldGatedStealthThreshold', 'shield_gated_stealth_threshold', 0),
              decloakOnActionFlag: !!pick('decloakOnActionFlag', 'decloak_on_action_flag', true),
              stealthRecoveryDelaySeconds: pick('stealthRecoveryDelaySeconds', 'stealth_recovery_delay_seconds', 5),

              resourceHarvestingType: pick('resourceHarvestingType', 'resource_harvesting_type', 0),
              requiresReconTelemetry: !!pick('requiresReconTelemetry', 'requires_recon_telemetry', false),
              requiresAnchorDrone: !!pick('requiresAnchorDrone', 'requires_anchor_drone', false),
              requiresReconAnchor: !!pick('requiresReconAnchor', 'requires_recon_anchor', false),
              portDockingBayStatus: !!pick('portDockingBayStatus', 'port_docking_bay_status', false),
              starboardDeploymentBayStatus: !!pick('starboardDeploymentBayStatus', 'starboard_deployment_bay_status', false),
              salvageableUponDestruction: !!pick('salvageableUponDestruction', 'salvageable_upon_destruction', true),
              cryoGasRadius: pick('cryoGasRadius', 'cryo_gas_radius', 0),
              cryoEffectDuration: pick('cryoEffectDuration', 'cryo_effect_duration', 0),
              gravitonVortexDuration: pick('gravitonVortexDuration', 'graviton_vortex_duration', 0),
              warpCanisterCapacity: pick('warpCanisterCapacity', 'warp_canister_capacity', 0),
              emergencyWarpEvacuationTarget: !!pick('emergencyWarpEvacuationTarget', 'emergency_warp_evacuation_target', false),
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
          <MovementTab config={currentConfig} onChange={handleConfigChange} onOpenDoc={setActiveDoc} />
        )}
        {activeTab === 'vitals' && (
          <VitalsTab config={currentConfig} onChange={handleConfigChange} onOpenDoc={setActiveDoc} />
        )}
        {activeTab === 'combat' && (
          <CombatTab config={currentConfig} onChange={handleConfigChange} onOpenDoc={setActiveDoc} />
        )}
        {activeTab === 'ai' && (
          <AiSensorTab config={currentConfig} onChange={handleConfigChange} onOpenDoc={setActiveDoc} />
        )}
        {activeTab === 'logistics' && (
          <LogisticsTab config={currentConfig} onChange={handleConfigChange} onOpenDoc={setActiveDoc} />
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

      <VariableInfoModal doc={activeDoc} onClose={() => setActiveDoc(null)} />
    </div>
  );
};
