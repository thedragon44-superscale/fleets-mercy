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
  const [originalConfigs, setOriginalConfigs] = useState<{ [unitId: string]: UnitConfigConfigPayload }>({});
  const [groupings, setGroupings] = useState<{ [unitId: string]: UnitGroupingPayload }>({});
  const [statusMsg, setStatusMsg] = useState<string>('');

  useEffect(() => {
    if (initialUnitId) {
      setSelectedUnitId(initialUnitId);
    }
  }, [initialUnitId]);

  // Fetch templates from PostgreSQL on mount and establish DB baseline
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
          setUnitConfigs(JSON.parse(JSON.stringify(loadedConfigs)));
          setOriginalConfigs(JSON.parse(JSON.stringify(loadedConfigs))); // Pristine DB Baseline
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

    // Stream live adjustments via WebSocket
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
        {activeTab === 'grouping' && (
          <GroupingSquadsTab grouping={currentGrouping} onChange={handleGroupingChange} />
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
