// src/utils/groupingColors.ts

export interface GroupStyle {
  bg: string;
  border: string;
  text: string;
  hexBg: string;
  hexBorder: string;
}

// Squad Base Fill Colors (Hotkey Formations 1–4)
export const SQUAD_COLORS: { [squadId: number]: { bgClass: string; hex: string; textClass: string; name: string } } = {
  0: { bgClass: 'bg-cyan-500/20', hex: '#06b6d4', textClass: 'text-cyan-400', name: 'Unassigned' },
  1: { bgClass: 'bg-red-500/20', hex: '#ef4444', textClass: 'text-red-400', name: 'Squad 1 (Red)' },
  2: { bgClass: 'bg-blue-500/20', hex: '#3b82f6', textClass: 'text-blue-400', name: 'Squad 2 (Blue)' },
  3: { bgClass: 'bg-green-500/20', hex: '#22c55e', textClass: 'text-green-400', name: 'Squad 3 (Green)' },
  4: { bgClass: 'bg-purple-500/20', hex: '#a855f7', textClass: 'text-purple-400', name: 'Squad 4 (Purple)' },
};

// Battalion Border Colors (Command Hierarchy)
export const BATTALION_BORDERS: { [battalionId: number]: { borderClass: string; hex: string; name: string } } = {
  0: { borderClass: 'border-slate-800', hex: '#1e293b', name: 'Main Flagship' },     // Flagship Core
  1: { borderClass: 'border-amber-400', hex: '#eab308', name: 'Alpha Detachment' }, // Gold Battalion 1
  2: { borderClass: 'border-slate-200', hex: '#e2e8f0', name: 'Beta Detachment' },  // Silver Battalion 2
};

export const getGroupingStyle = (squadId: number = 0, battalionId: number = 0): GroupStyle => {
  const squad = SQUAD_COLORS[squadId] || SQUAD_COLORS[0];
  const battalion = BATTALION_BORDERS[battalionId] || BATTALION_BORDERS[0];

  return {
    bg: squad.bgClass,
    border: battalion.borderClass,
    text: squad.textClass,
    hexBg: squad.hex,
    hexBorder: battalion.hex,
  };
};
