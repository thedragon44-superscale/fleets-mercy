// src/components/UnitConfig/UnitConfigHeader.tsx
import React, { useMemo } from 'react';
import { UNIT_DB } from '../GarageDashboard';
import { useUnitTemplates } from '../../hooks/useUnitTemplates';

interface UnitConfigHeaderProps {
  selectedUnitId: string;
  onSelectUnit: (unitId: string) => void;
  onClose: () => void;
}

const formatUnitName = (id: string) =>
  id
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

export const UnitConfigHeader: React.FC<UnitConfigHeaderProps> = ({
  selectedUnitId,
  onSelectUnit,
  onClose,
}) => {
  const { templates } = useUnitTemplates();

  const unitOptions = useMemo(() => {
    const dbMeta = new Map(UNIT_DB.map((u) => [u.id, u]));
    const keys = Object.keys(templates);
    const ids = keys.length > 0 ? keys : UNIT_DB.map((u) => u.id);

    return ids
      .map((id) => {
        const meta = dbMeta.get(id);
        return {
          id,
          name: meta?.name || formatUnitName(id),
          role: meta?.role || 'Combat Unit',
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [templates]);

  const currentTemplate =
    unitOptions.find((u) => u.id === selectedUnitId) ||
    unitOptions[0] || { id: selectedUnitId, name: formatUnitName(selectedUnitId), role: 'Unit' };

  return (
    <div className="flex justify-between items-center gap-3 border-b border-slate-800 pb-3 mb-3 shrink-0">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-black text-xs shrink-0">
          ⚙️
        </div>
        <div className="min-w-0">
          <h2 className="text-xs font-black text-white uppercase tracking-wider truncate">
            Unit Configuration Studio
          </h2>
          <p className="text-[9px] font-bold text-amber-400 tracking-wider uppercase truncate">
            {currentTemplate.role}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <select
          value={selectedUnitId}
          onChange={(e) => onSelectUnit(e.target.value)}
          className="bg-[#161922] text-cyan-300 border border-slate-700 hover:border-cyan-500/60 rounded-lg px-2.5 py-1.5 text-[10px] font-bold uppercase focus:outline-none focus:border-cyan-400 cursor-pointer max-w-[180px]"
          title="Switch inspected unit blueprint"
        >
          {unitOptions.map((u) => (
            <option key={u.id} value={u.id} className="bg-[#0f1115] text-slate-100">
              {u.name}
            </option>
          ))}
        </select>

        <button
          onClick={onClose}
          className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 px-3 py-1.5 rounded-lg font-bold text-xs uppercase transition-all"
        >
          [CLOSE]
        </button>
      </div>
    </div>
  );
};
