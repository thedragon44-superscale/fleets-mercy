// src/config/settingsStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface DeveloperSettings {
  renderDelay: number;              // Replaces hardcoded 35ms interpolation lag
  debugCollisions: boolean;         // Toggle bounding box wireframes
  debugRadarRanges: boolean;        // Toggle sensor and aggro circles
  particleDensityMultiplier: number;// Scale explosion/exhaust particles
  aiUpdateIntervalTicks: number;    // Simulation frequency tuning
  netSimulatedLatency: number;      // Test network lag locally
  
  setSetting: <K extends keyof DeveloperSettings>(key: K, value: DeveloperSettings[K]) => void;
  resetToDefaults: () => void;
}

const DEFAULT_SETTINGS = {
  renderDelay: 35,
  debugCollisions: false,
  debugRadarRanges: false,
  particleDensityMultiplier: 1.0,
  aiUpdateIntervalTicks: 1,
  netSimulatedLatency: 0,
};

export const useSettingsStore = create<DeveloperSettings>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      setSetting: (key, value) => set({ [key]: value }),
      resetToDefaults: () => set(DEFAULT_SETTINGS),
    }),
    {
      name: 'space-tactics-dev-settings',
    }
  )
);
