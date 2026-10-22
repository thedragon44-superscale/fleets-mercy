// src/components/UnitConfig/UnitConfigContainer.tsx
import React, { useState, useEffect } from 'react';
import { UnitConfigHeader } from './UnitConfigHeader';
import { UnitConfigTabs } from './UnitConfigTabs';
import { MovementTab } from './tabs/MovementTab';
import { VitalsTab } from './tabs/VitalsTab';
import { CombatTab } from './tabs/CombatTab';
import { AiSensorTab } from './tabs/AiSensorTab';
import { LogisticsTab } from './tabs/LogisticsTab';
import { GroupingSquadsTab } from './tabs/GroupingSquadsTab';
import { ConfigTabType, UnitConfigConfigPayload, UnitGroupingPayload } from './types';
import { API_BASE_URL } from '../../config';

interface UnitConfigContainerProps {
  isOpen: boolean;
  initialUnitId?: string;
  onClose: () => void;
  sendTemplateOverride?: (unitType: string, override: any) => void;
}

export const UnitConfigContainer: React.FC<UnitConfigContainerProps> = ({
  isOpen,
  initialUnitId = 'viper_interceptor',
  onClose,
  sendTemplateOverride,
}) => {
  const [selectedUnitId, setSelectedUnitId] = useState<string>(initialUnitId);
  const [activeTab, setActiveTab] = useState<ConfigTabType>('movement');

  // Keep internal selection synchronized with whatever unit is clicked/highlighted in the spawner
  useEffect(() => {
    if (initialUnitId) {
      setSelectedUnitId(initialUnitId);
    }
  }, [initialUnitId]);

  const [unitConfigs, setUnitConfigs] = useState<{ [unitId: string]: UnitConfigConfigPayload }>({});
  const [groupings, setGroupings] = useState<{ [unitId: string]: UnitGroupingPayload }>({});

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/templates`)
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          const loadedConfigs: { [key: string]: UnitConfigConfigPayload } = {};
          Object.keys(data).forEach((key) => {
            const t = data[key];
            loadedConfigs[key] = {
              speed: t.speed ?? 4.0,
              strafingSpeed: t.strafing_speed ?? 3.0,
              turnRate: t.turn_rate ?? 0.05,
              angularVelocity: t.angular_velocity ?? 0.1,
              accelerationCurve: t.acceleration_curve ?? 1.0,
              dps: t.dps ?? 50.0,
              maxCooldown: t.max_cooldown ?? 20,
              projectileRange: t.projectile_range ?? 1500,
              projectileSpeed: t.projectile_speed ?? 18.0,
              maxThermalCapacity: t.max_thermal_capacity ?? 100.0,
              shieldBase: t.shield_base ?? 100.0,
              hullBase: t.hull_base ?? 100.0,
              shieldRegenRate: t.shield_regen_rate ?? 0.5,
              shieldRechargeDelayTicks: t.shield_recharge_delay_ticks ?? 180,
              armorMitigation: t.armor_mitigation ?? 10.0,
              visionRange: t.vision_range ?? 2500.0,
              aggroRange: t.aggro_range ?? 1500.0,
              retreatMoraleThreshold: t.retreat_morale_threshold ?? 0.15,
              squadCohesionLeashRange: t.squad_cohesion_leash_range ?? 300.0,
              resourceHarvestingType: t.resource_harvesting_type ?? 0,
              warpCanisterCapacity: t.warp_canister_capacity ?? 0,
            };
          });
          setUnitConfigs(loadedConfigs);
        }
      })
      .catch((err) => console.log('⚠️ Failed to fetch DB templates:', err));
  }, []);

  if (!isOpen) return null;

  const currentConfig: UnitConfigConfigPayload = unitConfigs[selectedUnitId] || {
    speed: 4.0,
    strafingSpeed: 3.0,
    turnRate: 0.05,
    angularVelocity: 0.1,
    accelerationCurve: 1.0,
    dps: 50.0,
    maxCooldown: 20,
    projectileRange: 1500,
    projectileSpeed: 18.0,
    maxThermalCapacity: 100.0,
    shieldBase: 100.0,
    hullBase: 100.0,
    shieldRegenRate: 0.5,
    shieldRechargeDelayTicks: 180,
    armorMitigation: 10.0,
    visionRange: 2500.0,
    aggroRange: 1500.0,
    retreatMoraleThreshold: 0.15,
    squadCohesionLeashRange: 300.0,
  };

  const currentGrouping: UnitGroupingPayload = groupings[selectedUnitId] || {
    unitId: selectedUnitId,
    battalionId: 1,
    squadId: 0,
    isLeader: false,
    buddyId: '',
  };

  const handleConfigChange = (field: keyof UnitConfigConfigPayload, value: any) => {
    const updatedConfig = { ...currentConfig, [field]: value };
    setUnitConfigs((prev) => ({ ...prev, [selectedUnitId]: updatedConfig }));

    if (sendTemplateOverride) {
      sendTemplateOverride(selectedUnitId, updatedConfig);
    }
  };

  const handleGroupingChange = (field: keyof UnitGroupingPayload, value: any) => {
    setGroupings((prev) => ({
      ...prev,
      [selectedUnitId]: { ...currentGrouping, [field]: value },
    }));
  };

  const saveConfigurationToDB = () => {
    fetch(`${API_BASE_URL}/api/templates?type=${selectedUnitId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(currentConfig),
    })
      .then((res) => {
        if (res.ok) alert(`Successfully saved configuration for ${selectedUnitId}!`);
        else alert('Failed to save configuration.');
      })
      .catch((err) => console.log('⚠️ Save error:', err));
  };

  return (
    <div
      className="ui-interactive absolute top-4 left-[340px] w-[520px] max-h-[calc(100vh-90px)] bg-[#0f1115]/95 border border-cyan-500/40 rounded-xl p-4 z-50 flex flex-col shadow-2xl backdrop-blur-md overflow-hidden"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <UnitConfigHeader
        selectedUnitId={selectedUnitId}
        onClose={onClose}
      />

      <UnitConfigTabs activeTab={activeTab} onSelectTab={setActiveTab} />

      <div className="flex-1 overflow-y-auto pr-1 mb-3">
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
        {activeTab === 'grouping' && (
          <GroupingSquadsTab grouping={currentGrouping} onChange={handleGroupingChange} />
        )}
      </div>

      <div className="flex flex-col gap-1.5 shrink-0 pt-3 border-t border-slate-800">
        <button
          onClick={saveConfigurationToDB}
          className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black py-2 rounded-lg text-[10px] uppercase tracking-widest transition-all shadow-md"
        >
          💾 Save Spec Sheet to Database (All Modes)
        </button>
      </div>
    </div>
  );
};
