// src/components/UnitConfig/UnitConfigHeader.tsx
import React from 'react';
import { UNIT_DB } from '../GarageDashboard';

interface UnitConfigHeaderProps {
  selectedUnitId: string;
  onSelectUnit: (unitId: string) => void;
  onClose: () => void;
}

export const UnitConfigHeader: React.FC<UnitConfigHeaderProps> = ({
  selectedUnitId,
  onClose,
}) => {
  const currentTemplate = UNIT_DB.find((u) => u.id === selectedUnitId) || UNIT_DB[0];

  return (
    <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4 shrink-0">
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-black text-xs">⚙️</div>
        <div>
          <h2 className="text-xs font-black text-white uppercase tracking-wider">Unit Configuration Studio</h2>
          <p className="text-[9px] font-bold text-amber-400 tracking-wider uppercase">Active: {currentTemplate.name} ({currentTemplate.role})</p>
        </div>
      </div>

      <button
        onClick={onClose}
        className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 px-3 py-1.5 rounded-lg font-bold text-xs uppercase transition-all"
      >
        [CLOSE]
      </button>
    </div>
  );
};
