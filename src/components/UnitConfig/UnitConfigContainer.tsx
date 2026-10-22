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
  initialUnitId = 'flagship',
  onClose,
  sendTemplateOverride,
}) => {
  const [selectedUnitId, setSelectedUnitId] = useState<string>(initialUnitId);
  const [activeTab, setActiveTab] = useState<ConfigTabType>('movement');
  const [unitConfigs, setUnitConfigs] = useState<{ [unitId: string]: UnitConfigConfigPayload }>({});
  const [groupings, setGroupings] = useState<{ [unitId: string]: UnitGroupingPayload }>({});

  useEffect(() => {
    if (initialUnitId) {
      setSelectedUnitId(initialUnitId);
    }
  }, [initialUnitId]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/templates`)
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          const loadedConfigs: { [key: string]: UnitConfigConfigPayload } = {};
          Object.keys(data).forEach((key) => {
            const t = data[key];
            loadedConfigs[key] = {
              speed: t.speed,
              strafingSpeed: t.strafing_speed,
              turnRate: t.turn_rate,
              angularVelocity: t.angular_velocity,
              accelerationCurve: t.acceleration_curve,
              dps: t.dps,
              maxCooldown: t.max_cooldown,
              projectileRange: t.projectile_range,
              projectileSpeed: t.projectile_speed,
              maxThermalCapacity: t.max_thermal_capacity,
              shieldBase: t.shield_base,
              hullBase: t.hull_base,
              shieldRegenRate: t.shield_regen_rate,
              shieldRechargeDelayTicks: t.shield_recharge_delay_ticks,
              armorMitigation: t.armor_mitigation,
              visionRange: t.vision_range,
              aggroRange: t.aggro_range,
              retreatMoraleThreshold: t.retreat_morale_threshold,
              squadCohesionLeashRange: t.squad_cohesion_leash_range,
              resourceHarvestingType: t.resource_harvesting_type,
              warpCanisterCapacity: t.warp_canister_capacity,
            };
          });
          setUnitConfigs(loadedConfigs);
        }
      })
      .catch((err) => console.log('⚠️ Failed to fetch DB templates:', err));
  }, []);

  if (!isOpen) return null;

  const currentConfig: UnitConfigConfigPayload = unitConfigs[selectedUnitId] || {};

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
        if (res.ok) alert(`Successfully saved configuration for ${selectedUnitId} to DB!`);
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
        onSelectUnit={setSelectedUnitId}
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
