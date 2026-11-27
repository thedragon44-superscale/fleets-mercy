// src/services/mapService.ts
import { API_BASE_URL } from '../config';
import type { EnvBlueprint, MapEnvPlacement } from './envService';

export interface HydratedMapPlacement extends MapEnvPlacement {
  blueprint?: EnvBlueprint;
}

export interface MapDefinition {
  id: number;
  mapKey: string;
  name: string;
  description: string;
  width: number;
  height: number;
  placementCount?: number;
  updatedAt?: string;
  placements?: HydratedMapPlacement[];
}

export interface SaveUniversalMapPayload {
  id?: number | null;
  name: string;
  description: string;
  width: number;
  height: number;
  placements: MapEnvPlacement[];
}

async function readErr(res: Response, fallback: string): Promise<string> {
  try {
    const text = await res.text();
    return text.trim() || `${fallback} (HTTP ${res.status})`;
  } catch {
    return `${fallback} (HTTP ${res.status})`;
  }
}

export async function fetchMaps(): Promise<MapDefinition[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/maps`);
    if (!response.ok) throw new Error('Failed to fetch maps');
    const data = await response.json();
    return Array.isArray(data) ? (data as MapDefinition[]) : [];
  } catch (err) {
    console.error('Error fetching maps:', err);
    return [];
  }
}

export async function fetchMapDetail(mapId: number): Promise<MapDefinition | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/map-detail?id=${encodeURIComponent(mapId)}`);
    if (!response.ok) throw new Error('Failed to fetch map detail');
    return (await response.json()) as MapDefinition;
  } catch (err) {
    console.error('Error fetching map detail:', err);
    return null;
  }
}

export async function saveUniversalMap(
  payload: SaveUniversalMapPayload
): Promise<{ success: boolean; map: MapDefinition }> {
  const response = await fetch(`${API_BASE_URL}/api/maps`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(await readErr(response, 'Failed to save map'));
  }
  return await response.json();
}

export async function deleteUniversalMap(mapId: number): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE_URL}/api/maps?id=${encodeURIComponent(mapId)}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(await readErr(response, 'Failed to delete map'));
  }
  return await response.json();
}
