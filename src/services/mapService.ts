import { WS_BASE_URL } from '../config';

export interface MapStructure {
  id: number;
  mapId: number;
  structureType: string;
  posX: number;
  posY: number;
  radius: number;
  customProps?: any;
}

export interface MapDefinition {
  id: number;
  mapKey: string;
  name: string;
  description: string;
  width: number;
  height: number;
  structures?: MapStructure[];
}

const API_BASE = WS_BASE_URL.replace('ws://', 'http://').replace('wss://', 'https://');

export async function fetchMaps(): Promise<MapDefinition[]> {
  try {
    const res = `${API_BASE}/api/maps`;
    const response = await fetch(res);
    if (!response.ok) throw new Error('Failed to fetch maps');
    return await response.json();
  } catch (err) {
    console.error('Error fetching maps:', err);
    return [];
  }
}

export async function fetchMapDetail(mapId: number): Promise<MapDefinition | null> {
  try {
    const response = await fetch(`${API_BASE}/api/map-detail?id=${mapId}`);
    if (!response.ok) throw new Error('Failed to fetch map detail');
    return await response.json();
  } catch (err) {
    console.error('Error fetching map detail:', err);
    return null;
  }
}

export async function saveCustomMap(mapPayload: {
  name: string;
  description: string;
  width: number;
  height: number;
  structures: { id: string; type: string; x: number; y: number; radius: number }[];
}): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/api/maps`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mapPayload)
    });
    return response.ok;
  } catch (err) {
    console.error('Error saving custom map:', err);
    return false;
  }
}
