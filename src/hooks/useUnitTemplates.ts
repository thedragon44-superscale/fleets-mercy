// src/hooks/useUnitTemplates.ts
import { useEffect, useSyncExternalStore } from 'react';
import { API_BASE_URL } from '../config';
import { UnitConfigConfigPayload } from '../components/sandbox/UnitConfig/types';

export type TemplateMap = Record<string, UnitConfigConfigPayload>;

interface TemplateStoreSnapshot {
  templates: TemplateMap;
  originalTemplates: TemplateMap;
  isLoaded: boolean;
}

const listeners = new Set<() => void>();

let snapshot: TemplateStoreSnapshot = {
  templates: {},
  originalTemplates: {},
  isLoaded: false,
};

let fetchInFlight: Promise<void> | null = null;

// Direct ref-style accessor for 60fps canvas render loops without React re-renders
export const liveTemplatesRef: { current: TemplateMap } = { current: {} };

function emitChange() {
  liveTemplatesRef.current = snapshot.templates;
  listeners.forEach((l) => l());
}

function normalizeTemplate(t: any): UnitConfigConfigPayload {
  const pick = (camel: string, snake: string, fallback: any = 0) => {
    if (t?.[camel] !== undefined && t?.[camel] !== null) return t[camel];
    if (t?.[snake] !== undefined && t?.[snake] !== null) return t[snake];
    return fallback;
  };

  return {
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
}

export async function refreshUnitTemplates(): Promise<void> {
  if (fetchInFlight) return fetchInFlight;

  fetchInFlight = fetch(`${API_BASE_URL}/api/templates`)
    .then((res) => res.json())
    .then((data) => {
      if (!data) return;
      const normalized: TemplateMap = {};
      Object.keys(data).forEach((key) => {
        normalized[key] = normalizeTemplate(data[key]);
      });

      snapshot = {
        templates: JSON.parse(JSON.stringify(normalized)),
        originalTemplates: JSON.parse(JSON.stringify(normalized)),
        isLoaded: true,
      };
      emitChange();
    })
    .catch((err) => {
      console.warn('⚠️ Failed to fetch unit templates:', err);
    })
    .finally(() => {
      fetchInFlight = null;
    });

  return fetchInFlight;
}

export function updateLiveTemplate(
  unitId: string,
  field: keyof UnitConfigConfigPayload,
  value: any
): UnitConfigConfigPayload {
  const current = snapshot.templates[unitId] || {};
  const updated: UnitConfigConfigPayload = { ...current, [field]: value };

  snapshot = {
    ...snapshot,
    templates: {
      ...snapshot.templates,
      [unitId]: updated,
    },
  };
  emitChange();
  return updated;
}

export function revertUnitTemplate(unitId: string): UnitConfigConfigPayload | null {
  const baseline = snapshot.originalTemplates[unitId];
  if (!baseline) return null;

  const resetCopy: UnitConfigConfigPayload = JSON.parse(JSON.stringify(baseline));
  snapshot = {
    ...snapshot,
    templates: {
      ...snapshot.templates,
      [unitId]: resetCopy,
    },
  };
  emitChange();
  return resetCopy;
}

export async function saveUnitTemplateToDB(unitId: string): Promise<boolean> {
  const current = snapshot.templates[unitId];
  if (!current) return false;

  try {
    const res = await fetch(`${API_BASE_URL}/api/templates?type=${unitId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(current),
    });
    if (!res.ok) return false;

    snapshot = {
      ...snapshot,
      originalTemplates: {
        ...snapshot.originalTemplates,
        [unitId]: JSON.parse(JSON.stringify(current)),
      },
    };
    emitChange();
    return true;
  } catch (err) {
    console.warn('⚠️ Failed to save unit template:', err);
    return false;
  }
}

export function getModifiedFields(unitId: string): Set<keyof UnitConfigConfigPayload> {
  const modified = new Set<keyof UnitConfigConfigPayload>();
  const current = snapshot.templates[unitId];
  const baseline = snapshot.originalTemplates[unitId];
  if (!current || !baseline) return modified;

  (Object.keys(current) as Array<keyof UnitConfigConfigPayload>).forEach((key) => {
    if (current[key] !== baseline[key]) {
      modified.add(key);
    }
  });
  return modified;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return snapshot;
}

export function useUnitTemplates() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    if (!state.isLoaded && !fetchInFlight) {
      refreshUnitTemplates();
    }
  }, [state.isLoaded]);

  return {
    templates: state.templates,
    originalTemplates: state.originalTemplates,
    isLoaded: state.isLoaded,
    templatesRef: liveTemplatesRef,
    updateLiveTemplate,
    revertUnitTemplate,
    saveUnitTemplateToDB,
    refreshUnitTemplates,
    getModifiedFields,
  };
}
