// src/components/sandbox/constants.ts
export const GRID_SPACING = 200;
export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 2.5;

export interface ScenarioPreset {
  id: string;
  label: string;
  description: string;
  units: Array<{ unitType: string; count: number; ownerId: 'player' | 'enemy' }>;
}

export const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: 'duel',
    label: '1v1 Duel',
    description: 'Player Viper vs Enemy Viper',
    units: [
      { unitType: 'viper_interceptor', count: 1, ownerId: 'player' },
      { unitType: 'viper_interceptor', count: 1, ownerId: 'enemy' },
    ],
  },
  {
    id: 'recon_fow',
    label: 'Recon FoW',
    description: 'Flagship + 2 Recon Probes vs 3 Enemy Corvettes',
    units: [
      { unitType: 'flagship', count: 1, ownerId: 'player' },
      { unitType: 'recon_probe', count: 2, ownerId: 'player' },
      { unitType: 'lancer_corvette', count: 3, ownerId: 'enemy' },
    ],
  },
  {
    id: 'squad_skirmish',
    label: 'Skirmish',
    description: 'Balanced 6v6 tactical engagement',
    units: [
      { unitType: 'flagship', count: 1, ownerId: 'player' },
      { unitType: 'viper_interceptor', count: 3, ownerId: 'player' },
      { unitType: 'lancer_corvette', count: 1, ownerId: 'player' },
      { unitType: 'aegis_repair', count: 1, ownerId: 'player' },
      { unitType: 'flagship', count: 1, ownerId: 'enemy' },
      { unitType: 'viper_interceptor', count: 3, ownerId: 'enemy' },
      { unitType: 'assault_gunship', count: 2, ownerId: 'enemy' },
    ],
  },
];

export const formatUnitName = (unitId: string): string =>
  unitId
    .split('_')
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : ''))
    .join(' ');
