// src/services/envService.ts
import { API_BASE_URL } from '../config';
import { ClusterSlotTier } from './clusterService';

export type EnvObjectType =
  | 'major_world'
  | 'mineral_planetoid'
  | 'gas_giant'
  | 'nebula_field'
  | 'singularity_rift'
  | 'moon'
  | 'asteroid_belt'
  | 'asteroid_cluster'
  | 'comet';

export type EnvComponentKind =
  | 'solid_rock'
  | 'resource_node'
  | 'solid_core'
  | 'cave_mouth'
  | 'crater_node'
  | 'gas_core'
  | 'gas_deep'
  | 'gas_outer'
  | 'nebula_blob'
  | 'rift_core'
  | 'rift_field'
  | 'comet_core';

export type ProjectileBehavior = 'block' | 'pass' | 'refract';
export type EnvMotionMode = 'static' | 'drift_wrap' | 'orbital' | 'transient_transit';

export interface EnvComponentSpec {
  id: string;
  kind: EnvComponentKind;
  dx: number;
  dy: number;
  radius: number;
  inner_radius: number;
  is_node: boolean;
  slot_tier: ClusterSlotTier;
  pinned_resource: string | null;
  color_hex: string | null;
  is_destructible: boolean; // Reserved inert metadata
}

export interface OrbitingChildSpec {
  child_blueprint_id: number;
  orbit_radius: number;
  orbit_speed: number;
  start_angle: number;
  scale: number;
}

export interface EnvImpactProfile {
  melt_max_weight?: number;
  heavy_damage?: number;
  shield_absorb_min_weight?: number;
}

export interface EnvPhysicsProfile {
  gravity_strength: number;
  gravity_radius: number;
  repulsion_strength: number;
  repulsion_radius: number;
  drag_factor: number;
  drag_max_weight: number;
  max_passable_weight: number;
  projectile_behavior: ProjectileBehavior;
  refract_angle_rad: number;
  radar_opaque: boolean;
  visual_range_mult: number;
  immune_unit_classes: string[];
  deep_dot_dps?: number;
  deep_pull_weight_max?: number;
  outer_drag_factor?: number;
  outer_drag_min_weight?: number;
  impact_profile?: EnvImpactProfile;
}

export interface EnvMotionProfile {
  mode: EnvMotionMode;
  scale_min: number;
  scale_max: number;
  speed_min: number;
  speed_max: number;
  spin_rate: number;
  min_wraps: number;
  max_wraps: number;
  transit_cooldown_seconds: number;
}

export interface EnvBlueprint {
  blueprintId: number;
  name: string;
  objectType: EnvObjectType;
  components: EnvComponentSpec[];
  orbitingChildren: OrbitingChildSpec[];
  physicsProfile: EnvPhysicsProfile;
  motionProfile: EnvMotionProfile;
  boundingRadius: number;
  isEnabled: boolean;
}

export interface ModeEnvPoolEntry {
  poolId: number;
  gameMode: string;
  rulesetId: number;
  blueprintId: number;
  spawnWeight: number;
  maxConcurrent: number;
  scaleOverride: number | null;
  isEnabled: boolean;
}

export interface SPEnvPoolEntry {
  poolId: number;
  rulesetId: number;
  blueprintId: number;
  spawnWeight: number;
  maxConcurrent: number;
  scaleOverride: number | null;
  speedMin: number | null;
  speedMax: number | null;
  minWraps: number | null;
  maxWraps: number | null;
  isEnabled: boolean;
  blueprint?: EnvBlueprint;
}

export interface MapEnvPlacement {
  placementId: number;
  mapId: number;
  blueprintId: number;
  posX: number;
  posY: number;
  scale: number;
  angle: number;
  velX: number;
  velY: number;
  parentPlacementId: number | null;
  parentIndex?: number | null;
  orbitRadius: number;
  orbitSpeed: number;
  overrides?: Record<string, unknown>;
}

export const ENV_OBJECT_TYPE_META: Record<
  EnvObjectType,
  { label: string; short: string; color: string }
> = {
  asteroid_cluster: { label: 'Asteroid Cluster', short: 'Cluster', color: '#94a3b8' },
  asteroid_belt: { label: 'Dense Belt', short: 'Belt', color: '#64748b' },
  nebula_field: { label: 'Nebula Field', short: 'Nebula', color: '#a855f7' },
  singularity_rift: { label: 'Singularity Rift', short: 'Rift', color: '#38bdf8' },
  mineral_planetoid: { label: 'Mineral Planetoid', short: 'Planetoid', color: '#d97706' },
  major_world: { label: 'Major World', short: 'World', color: '#3b82f6' },
  gas_giant: { label: 'Gas Giant', short: 'Gas Giant', color: '#c084fc' },
  moon: { label: 'Moon', short: 'Moon', color: '#cbd5e1' },
  comet: { label: 'Comet', short: 'Comet', color: '#7dd3fc' },
};

export function computeEnvBoundingRadius(
  bp: Pick<EnvBlueprint, 'components' | 'orbitingChildren'>,
  allBlueprints?: EnvBlueprint[]
): number {
  let maxR = 60;
  for (const c of bp.components) {
    const edge = Math.hypot(c.dx, c.dy) + c.radius;
    if (edge > maxR) maxR = edge;
  }
  const byId = new Map<number, EnvBlueprint>();
  if (allBlueprints) {
    for (const item of allBlueprints) byId.set(item.blueprintId, item);
  }
  for (const ch of bp.orbitingChildren) {
    const childR = byId.get(ch.child_blueprint_id)?.boundingRadius || 45;
    const scale = ch.scale > 0 ? ch.scale : 1;
    const edge = Math.abs(ch.orbit_radius) + childR * scale;
    if (edge > maxR) maxR = edge;
  }
  return Math.ceil(maxR);
}

export function createBlankBlueprint(objectType: EnvObjectType): EnvBlueprint {
  const basePhysics: EnvPhysicsProfile = {
    gravity_strength: 0,
    gravity_radius: 0,
    repulsion_strength: 0,
    repulsion_radius: 0,
    drag_factor: 0,
    drag_max_weight: 0,
    max_passable_weight: 0,
    projectile_behavior: 'block',
    refract_angle_rad: 0,
    radar_opaque: false,
    visual_range_mult: 1.0,
    immune_unit_classes: [],
  };

  const baseMotion: EnvMotionProfile = {
    mode: 'drift_wrap',
    scale_min: 0.85,
    scale_max: 1.2,
    speed_min: 0.2,
    speed_max: 0.5,
    spin_rate: 0.0018,
    min_wraps: 2,
    max_wraps: 3,
    transit_cooldown_seconds: 0,
  };

  let components: EnvComponentSpec[] = [];
  let physics = { ...basePhysics };
  let motion = { ...baseMotion };

  switch (objectType) {
    case 'gas_giant':
      components = [
        { id: 'outer', kind: 'gas_outer', dx: 0, dy: 0, radius: 220, inner_radius: 187, is_node: false, slot_tier: null, pinned_resource: null, color_hex: '#c084fc', is_destructible: false },
        { id: 'deep', kind: 'gas_deep', dx: 0, dy: 0, radius: 187, inner_radius: 132, is_node: false, slot_tier: null, pinned_resource: null, color_hex: '#7e22ce', is_destructible: false },
        { id: 'core', kind: 'gas_core', dx: 0, dy: 0, radius: 132, inner_radius: 0, is_node: false, slot_tier: null, pinned_resource: null, color_hex: '#4c1d95', is_destructible: false },
        { id: 'skim1', kind: 'resource_node', dx: -198, dy: 0, radius: 22, inner_radius: 0, is_node: true, slot_tier: 'mid', pinned_resource: 'plasma_gas', color_hex: '#a855f7', is_destructible: false },
      ];
      physics = {
        ...basePhysics,
        gravity_strength: 0.08,
        gravity_radius: 240,
        drag_factor: 0.3,
        drag_max_weight: 5,
        max_passable_weight: 5,
        projectile_behavior: 'pass',
        radar_opaque: true,
        visual_range_mult: 0.5,
        deep_dot_dps: 600,
        deep_pull_weight_max: 1,
        outer_drag_factor: 0.18,
        outer_drag_min_weight: 2,
      };
      break;
    case 'major_world':
      components = [
        { id: 'core', kind: 'solid_core', dx: 0, dy: 0, radius: 145, inner_radius: 0, is_node: false, slot_tier: null, pinned_resource: null, color_hex: '#2563eb', is_destructible: false },
        { id: 'cave1', kind: 'cave_mouth', dx: -102, dy: -66, radius: 26, inner_radius: 0, is_node: true, slot_tier: 'common', pinned_resource: 'ore', color_hex: '#d97706', is_destructible: false },
      ];
      physics = { ...basePhysics, gravity_strength: 0.11, gravity_radius: 280 };
      break;
    case 'mineral_planetoid':
      components = [
        { id: 'core', kind: 'solid_core', dx: 0, dy: 0, radius: 74, inner_radius: 0, is_node: false, slot_tier: null, pinned_resource: null, color_hex: '#78716c', is_destructible: false },
        { id: 'crater1', kind: 'crater_node', dx: -46, dy: -32, radius: 20, inner_radius: 0, is_node: true, slot_tier: 'common', pinned_resource: null, color_hex: '#d97706', is_destructible: false },
      ];
      physics = { ...basePhysics, gravity_strength: 0.045, gravity_radius: 180 };
      break;
    case 'nebula_field':
      components = [
        { id: 'b1', kind: 'nebula_blob', dx: -75, dy: -15, radius: 85, inner_radius: 0, is_node: false, slot_tier: null, pinned_resource: null, color_hex: '#7c3aed', is_destructible: false },
        { id: 'b2', kind: 'nebula_blob', dx: 20, dy: 10, radius: 96, inner_radius: 0, is_node: true, slot_tier: 'mid', pinned_resource: null, color_hex: '#a855f7', is_destructible: false },
        { id: 'b3', kind: 'nebula_blob', dx: 92, dy: -20, radius: 80, inner_radius: 0, is_node: false, slot_tier: null, pinned_resource: null, color_hex: '#22c55e', is_destructible: false },
      ];
      physics = {
        ...basePhysics,
        drag_factor: 0.35,
        drag_max_weight: 3,
        max_passable_weight: 5,
        projectile_behavior: 'pass',
        radar_opaque: true,
        visual_range_mult: 0.5,
        immune_unit_classes: ['plasma_skimmer'],
      };
      break;
    case 'singularity_rift':
      components = [
        { id: 'field', kind: 'rift_field', dx: 0, dy: 0, radius: 165, inner_radius: 42, is_node: false, slot_tier: null, pinned_resource: null, color_hex: '#38bdf8', is_destructible: false },
        { id: 'core', kind: 'rift_core', dx: 0, dy: 0, radius: 42, inner_radius: 0, is_node: true, slot_tier: 'rare', pinned_resource: 'graviton_core', color_hex: '#0ea5e9', is_destructible: false },
      ];
      physics = {
        ...basePhysics,
        repulsion_strength: 0.14,
        repulsion_radius: 165,
        max_passable_weight: 5,
        projectile_behavior: 'refract',
        refract_angle_rad: 0.45,
        immune_unit_classes: ['grav_extractor'],
      };
      break;
    case 'moon':
      components = [
        { id: 'core', kind: 'solid_core', dx: 0, dy: 0, radius: 40, inner_radius: 0, is_node: false, slot_tier: null, pinned_resource: null, color_hex: '#94a3b8', is_destructible: false },
      ];
      break;
    case 'asteroid_belt':
      components = [
        { id: 'r1', kind: 'solid_rock', dx: -110, dy: -22, radius: 32, inner_radius: 0, is_node: false, slot_tier: null, pinned_resource: null, color_hex: '#64748b', is_destructible: false },
        { id: 'r2', kind: 'solid_rock', dx: -32, dy: 28, radius: 34, inner_radius: 0, is_node: false, slot_tier: null, pinned_resource: null, color_hex: '#64748b', is_destructible: false },
        { id: 'r3', kind: 'solid_rock', dx: 52, dy: -24, radius: 36, inner_radius: 0, is_node: false, slot_tier: null, pinned_resource: null, color_hex: '#64748b', is_destructible: false },
      ];
      physics = { ...basePhysics, max_passable_weight: 2 };
      break;
    case 'comet':
      components = [
        { id: 'core', kind: 'comet_core', dx: 0, dy: 0, radius: 22, inner_radius: 0, is_node: false, slot_tier: null, pinned_resource: null, color_hex: '#e0f2fe', is_destructible: false },
      ];
      physics = {
        ...basePhysics,
        projectile_behavior: 'pass',
        impact_profile: { melt_max_weight: 2, heavy_damage: 3200, shield_absorb_min_weight: 5 },
      };
      motion = {
        ...baseMotion,
        mode: 'transient_transit',
        speed_min: 5.5,
        speed_max: 7.0,
        spin_rate: 0.04,
        min_wraps: 0,
        max_wraps: 0,
        transit_cooldown_seconds: 28,
      };
      break;
    default:
      components = [
        { id: 'c1', kind: 'resource_node', dx: 0, dy: 0, radius: 34, inner_radius: 0, is_node: true, slot_tier: 'common', pinned_resource: null, color_hex: null, is_destructible: false },
        { id: 'c2', kind: 'solid_rock', dx: -75, dy: 24, radius: 32, inner_radius: 0, is_node: false, slot_tier: null, pinned_resource: null, color_hex: null, is_destructible: false },
      ];
  }

  const bp: EnvBlueprint = {
    blueprintId: 0,
    name: `New ${ENV_OBJECT_TYPE_META[objectType].label}`,
    objectType,
    components,
    orbitingChildren: [],
    physicsProfile: physics,
    motionProfile: motion,
    boundingRadius: 120,
    isEnabled: true,
  };
  bp.boundingRadius = computeEnvBoundingRadius(bp);
  return bp;
}

async function readErr(res: Response, fallback: string): Promise<string> {
  try {
    const t = await res.text();
    return t.trim() || `${fallback} (HTTP ${res.status})`;
  } catch {
    return `${fallback} (HTTP ${res.status})`;
  }
}

export async function fetchEnvBlueprints(): Promise<EnvBlueprint[]> {
  const res = await fetch(`${API_BASE_URL}/api/env/blueprints`);
  if (!res.ok) throw new Error(await readErr(res, 'Failed to fetch environment blueprints'));
  const data = await res.json();
  return Array.isArray(data) ? (data as EnvBlueprint[]) : [];
}

export async function saveEnvBlueprint(
  bp: EnvBlueprint
): Promise<{ success: boolean; blueprintId: number; boundingRadius: number }> {
  const res = await fetch(`${API_BASE_URL}/api/env/blueprints`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bp),
  });
  if (!res.ok) throw new Error(await readErr(res, 'Failed to save environment blueprint'));
  return await res.json();
}

export async function deleteEnvBlueprint(blueprintId: number): Promise<{ success: boolean }> {
  const res = await fetch(
    `${API_BASE_URL}/api/env/blueprints?id=${encodeURIComponent(blueprintId)}`,
    { method: 'DELETE' }
  );
  if (!res.ok) throw new Error(await readErr(res, 'Failed to delete environment blueprint'));
  return await res.json();
}

export async function fetchModeEnvPools(
  gameMode = 'space_pirates',
  rulesetId = 0
): Promise<ModeEnvPoolEntry[]> {
  const qs = new URLSearchParams({ gameMode });
  if (rulesetId > 0) qs.set('rulesetId', String(rulesetId));
  const res = await fetch(`${API_BASE_URL}/api/env/pools?${qs.toString()}`);
  if (!res.ok) throw new Error(await readErr(res, 'Failed to fetch mode env pools'));
  const data = await res.json();
  return Array.isArray(data) ? (data as ModeEnvPoolEntry[]) : [];
}

export async function saveModeEnvPool(
  entry: Omit<ModeEnvPoolEntry, 'poolId'> & { poolId?: number }
): Promise<{ success: boolean; poolId: number }> {
  const res = await fetch(`${API_BASE_URL}/api/env/pools`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  });
  if (!res.ok) throw new Error(await readErr(res, 'Failed to save mode env pool entry'));
  return await res.json();
}

export async function fetchMapEnvPlacements(mapId: number): Promise<MapEnvPlacement[]> {
  const res = await fetch(
    `${API_BASE_URL}/api/env/placements?mapId=${encodeURIComponent(mapId)}`
  );
  if (!res.ok) throw new Error(await readErr(res, 'Failed to fetch map placements'));
  const data = await res.json();
  return Array.isArray(data) ? (data as MapEnvPlacement[]) : [];
}

export async function saveMapEnvPlacements(
  mapId: number,
  placements: MapEnvPlacement[]
): Promise<{ success: boolean; placements: MapEnvPlacement[] }> {
  const res = await fetch(`${API_BASE_URL}/api/env/placements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mapId, placements }),
  });
  if (!res.ok) throw new Error(await readErr(res, 'Failed to save map placements'));
  return await res.json();
}

export async function fetchSPEnvPool(rulesetId = 0): Promise<SPEnvPoolEntry[]> {
  const qs = rulesetId > 0 ? `?rulesetId=${encodeURIComponent(rulesetId)}` : '';
  const res = await fetch(`${API_BASE_URL}/api/casino/sp/pool${qs}`);
  if (!res.ok) throw new Error(await readErr(res, 'Failed to fetch Space Pirates spawn pool'));
  const data = await res.json();
  return Array.isArray(data) ? (data as SPEnvPoolEntry[]) : [];
}

export async function saveSPEnvPoolEntry(
  entry: Omit<SPEnvPoolEntry, 'poolId' | 'blueprint'> & { poolId?: number }
): Promise<{ success: boolean; poolId: number; entry: SPEnvPoolEntry }> {
  const res = await fetch(`${API_BASE_URL}/api/casino/sp/pool`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  });
  if (!res.ok) throw new Error(await readErr(res, 'Failed to save Space Pirates pool entry'));
  return await res.json();
}

export async function deleteSPEnvPoolEntry(poolId: number): Promise<{ success: boolean }> {
  const res = await fetch(
    `${API_BASE_URL}/api/casino/sp/pool?id=${encodeURIComponent(poolId)}`,
    { method: 'DELETE' }
  );
  if (!res.ok) throw new Error(await readErr(res, 'Failed to delete Space Pirates pool entry'));
  return await res.json();
}
