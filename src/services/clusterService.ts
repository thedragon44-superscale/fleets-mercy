// src/services/clusterService.ts
import { API_BASE_URL } from '../config';

// --- SPACE PIRATES CONFIG TYPES (1:1 with backend/internal/models/casino_structs.go) ---

export type SPFactionRole = 'player' | 'house_harvester' | 'house_escort' | 'house_boss';
export type SPResourceTier = 'common' | 'mid' | 'rare';
export type ClusterSlotTier = SPResourceTier | 'any' | null;

export interface SPRulesetConfig {
  rulesetId: number;
  name: string;
  arenaWidth: number;
  arenaHeight: number;
  allowedMultipliers: number[];
  bossExpendedThreshold: number;
  bossEscapeSeconds: number;
  maxActiveHarvesters: number;
  targetClusterCount: number;
}

export interface SPUnitConfig {
  unitClass: string;
  factionRole: SPFactionRole;
  weightClass: number;
  baseCostCents: number; // Integer cents
  baseBountyCents: number; // Integer cents
  maxAmmo: number;
  damagePerShot: number;
  maxCooldown: number;
  shieldBase: number;
  hullBase: number;
  speed: number;
  turnRate: number;
  projectileSpeed: number;
  projectileRange: number;
  optimalRange: number;
  projType: string;
  canFire: boolean;
  fillDurationSeconds: number;
  cryoRadius: number;
  cryoDurationSeconds: number;
  cryoSlowFactor: number;
  isEnabled: boolean;
}

export interface SPResourceConfig {
  resourceKey: string;
  enumCode: number;
  displayName: string;
  tier: SPResourceTier;
  harvesterUnitClass: string;
  maxCargoBountyCents: number; // Integer cents
  spawnWeight: number;
  colorHex: string;
}

export interface SPConfigResponse {
  ruleset: SPRulesetConfig;
  units: Record<string, SPUnitConfig>; // key: `${factionRole}:${unitClass}`
  resources: Record<string, SPResourceConfig>; // key: resourceKey
}

// --- ASTEROID CLUSTER VARIANT TYPES ---

export interface ClusterNodeSpec {
  dx: number;
  dy: number;
  radius: number;
  is_node: boolean;
  slot_tier: ClusterSlotTier;
  pinned_resource: string | null;
}

export interface SPClusterVariant {
  variantId: number; // 0 for unsaved new cluster
  name: string;
  nodesLayout: ClusterNodeSpec[];
  boundingRadius: number;
  scaleMin: number;
  scaleMax: number;
  speedMin: number;
  speedMax: number;
  spinRate: number;
  minWraps: number;
  maxWraps: number;
  spawnWeight: number;
  maxConcurrent: number;
  isEnabled: boolean;
}

export interface SaveClusterVariantResponse {
  success: boolean;
  variantId: number;
  boundingRadius: number;
}

// --- HELPERS ---

/**
 * Mirrors backend db.ComputeBoundingRadius so the Cluster Editor viewport renders
 * the exact enclosing radius used for whole-cluster screen wrapping.
 */
export function computeClusterBoundingRadius(nodes: ClusterNodeSpec[]): number {
  let maxR = 60;
  for (const n of nodes) {
    const edge = Math.hypot(n.dx, n.dy) + n.radius;
    if (edge > maxR) {
      maxR = edge;
    }
  }
  return Math.ceil(maxR);
}

async function parseErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const text = await res.text();
    return text.trim() || `${fallback} (HTTP ${res.status})`;
  } catch {
    return `${fallback} (HTTP ${res.status})`;
  }
}

// --- REST API CALLS ---

/**
 * Fetches live PostgreSQL-backed Space Pirates ruleset, unit configs, and resource tiers.
 */
export async function fetchSPConfig(): Promise<SPConfigResponse> {
  const res = await fetch(`${API_BASE_URL}/api/casino/sp/config`);
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, 'Failed to load Space Pirates config'));
  }
  return (await res.json()) as SPConfigResponse;
}

/**
 * Lists all saved asteroid cluster variants (including disabled ones) for the Cluster Designer.
 */
export async function fetchClusterVariants(): Promise<SPClusterVariant[]> {
  const res = await fetch(`${API_BASE_URL}/api/casino/sp/clusters`);
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, 'Failed to load asteroid cluster variants'));
  }
  const data = await res.json();
  return Array.isArray(data) ? (data as SPClusterVariant[]) : [];
}

/**
 * Creates (variantId === 0) or updates (variantId > 0) an asteroid cluster variant
 * and refreshes the live server SPCache.
 */
export async function saveClusterVariant(variant: SPClusterVariant): Promise<SaveClusterVariantResponse> {
  const res = await fetch(`${API_BASE_URL}/api/casino/sp/clusters`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(variant),
  });
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, 'Failed to save asteroid cluster variant'));
  }
  return (await res.json()) as SaveClusterVariantResponse;
}

/**
 * Deletes an asteroid cluster variant by ID and refreshes the live server SPCache.
 */
export async function deleteClusterVariant(variantId: number): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE_URL}/api/casino/sp/clusters?id=${encodeURIComponent(variantId)}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, 'Failed to delete asteroid cluster variant'));
  }
  return (await res.json()) as { success: boolean };
}
