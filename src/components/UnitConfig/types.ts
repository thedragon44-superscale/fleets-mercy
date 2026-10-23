// src/components/UnitConfig/types.ts

export interface UnitConfigConfigPayload {
  weightClass?: number;
  visionRange?: number;
  aggroRange?: number;
  aggroThreatWeight?: number;
  retreatMoraleThreshold?: number;
  squadCohesionLeashRange?: number;
  
  shieldBase?: number;
  hullBase?: number;
  quadrantShieldingEnabled?: boolean;
  quadrantShieldPoolsEnabled?: boolean;
  quadrantHullPoolsEnabled?: boolean;
  shieldRegenRate?: number;
  shieldRechargeDelayTicks?: number;
  directionalShieldArc?: number;
  armorMitigation?: number;
  armorHardnessRating?: number;
  ablativePlatingDurability?: number;

  speed?: number;
  strafingSpeed?: number;
  turnRate?: number;
  angularVelocity?: number;
  lateralThrustPower?: number;
  reverseThrustPower?: number;
  driftCoefficient?: number;
  accelerationCurve?: number;

  dps?: number;
  maxCooldown?: number;
  projectileRange?: number;
  projectileSpeed?: number;
  optimalRange?: number;
  maxRange?: number;
  engagementRangeCap?: number;
  ammoCapacity?: number;
  initialOrdnanceCapacity?: number;
  turretTraverseSpeed?: number;
  weaponDispersionBloom?: number;
  projectileTrackingCapability?: number;
  shieldPenetrationFactor?: number;
  sustainedFireLimitSeconds?: number;
  barrelCoolingDurationSeconds?: number;
  burstSalvoCooldown?: number;
  beamRaycastDuration?: number;
  maxThermalCapacity?: number;
  thermalDissipationRate?: number;
  powerGridAllocationWeight?: number;

  radarCrossSection?: number;
  sensorResolutionTier?: number;
  jammingSusceptibility?: number;
  targetLockTime?: number;
  radarImmunityActive?: boolean;
  shieldGatedStealthThreshold?: boolean;
  decloakOnActionFlag?: boolean;
  stealthRecoveryDelaySeconds?: number;

  resourceHarvestingType?: number;
  requiresReconTelemetry?: boolean;
  requiresAnchorDrone?: boolean;
  requiresReconAnchor?: boolean;
  portDockingBayStatus?: boolean;
  starboardDeploymentBayStatus?: boolean;
  salvageableUponDestruction?: boolean;
  cryoGasRadius?: number;
  cryoEffectDuration?: number;
  gravitonVortexDuration?: number;
  warpCanisterCapacity?: number;
  emergencyWarpEvacuationTarget?: boolean;
}

export interface UnitTemplateOverride {
  type: string;
  config: UnitConfigConfigPayload;
}

// Squad and Battalion Grouping Payload extensions (per formations.md)
export interface UnitGroupingPayload {
  unitId: string;
  battalionId: number;       // e.g., 5W Command context
  squadId: number;           // Hotkey group 1–4 (0 for unassigned/flagship)
  isLeader: boolean;         // Cascading retreat & telemetry leader flag
  buddyId?: string;          // Exclusive 1-to-1 support tether (e.g., Repair Corvette anchor)
}

export type ConfigTabType = 'movement' | 'vitals' | 'combat' | 'ai' | 'logistics';
