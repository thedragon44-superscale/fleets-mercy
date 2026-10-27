// src/components/UnitConfig/common/ConfigRow.tsx
import React from 'react';
import { VARIABLE_DOCS, VariableDoc } from '../../../constants/variableDocs';

interface ConfigRowProps {
  fieldKey: string;
  label: string;
  value: any;
  type?: 'number' | 'checkbox';
  onChange: (val: any) => void;
  onOpenDoc: (doc: VariableDoc) => void;
}

export const ConfigRow: React.FC<ConfigRowProps> = ({
  fieldKey,
  label,
  value,
  type = 'number',
  onChange,
  onOpenDoc,
}) => {
  const doc = VARIABLE_DOCS[fieldKey];

  return (
    <div className="flex items-center justify-between bg-[#161922] border border-slate-800 rounded-lg p-2.5">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold text-slate-200">{label}</span>
        {doc && (
          <button
            onClick={() => onOpenDoc(doc)}
            type="button"
            className="w-4 h-4 rounded-full bg-cyan-500/10 border border-cyan-500/40 text-cyan-400 hover:bg-cyan-400 hover:text-slate-950 flex items-center justify-center text-[9px] font-black transition-all"
            title="Click for variable documentation & tactical impact"
          >
            ?
          </button>
        )}
      </div>

      {type === 'checkbox' ? (
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
          className="w-4 h-4 accent-cyan-400 cursor-pointer"
        />
      ) : (
        <input
          type="number"
          value={value ?? ''}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="bg-[#0b0e14] text-cyan-400 border border-slate-700 rounded px-2 py-1 text-[10px] font-black w-24 text-right focus:border-cyan-400 focus:outline-none"
        />
      )}
    </div>
  );
};
