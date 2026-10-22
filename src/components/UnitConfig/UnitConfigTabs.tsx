// src/components/UnitConfig/UnitConfigTabs.tsx
import React from 'react';
import { ConfigTabType } from './types';

interface UnitConfigTabsProps {
  activeTab: ConfigTabType;
  onSelectTab: (tab: ConfigTabType) => void;
}

const TABS: { id: ConfigTabType; label: string; icon: string }[] = [
  { id: 'movement', label: 'Movement', icon: '🚀' },
  { id: 'vitals', label: 'Vitals', icon: '🛡️' },
  { id: 'combat', label: 'Combat', icon: '⚡' },
  { id: 'ai', label: 'AI & Sensors', icon: '📡' },
  { id: 'logistics', label: 'Logistics', icon: '📦' },
  { id: 'grouping', label: 'Squads & Grouping', icon: '👥' }, // Directly tied to formations.md roadmap[cite: 17]
];

export const UnitConfigTabs: React.FC<UnitConfigTabsProps> = ({ activeTab, onSelectTab }) => {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 bg-[#161922] p-1.5 rounded-xl border border-slate-800 shrink-0 mb-4">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-[10px] font-black uppercase transition-all ${
              isActive
                ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};
