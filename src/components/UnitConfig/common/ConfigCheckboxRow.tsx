// src/components/UnitConfig/common/ConfigCheckboxRow.tsx
import React from 'react';
import { UnitConfigConfigPayload } from '../types';
import { VARIABLE_DOCS, VariableDoc } from '../../../constants/variableDocs';

interface ConfigCheckboxRowProps {
  field: keyof UnitConfigConfigPayload;
  label: string;
  checked: boolean;
  isModified?: boolean;
  onChange: (field: keyof UnitConfigConfigPayload, value: boolean) => void;
  onOpenDoc: (doc: VariableDoc) => void;
}

export const ConfigCheckboxRow: React.FC<ConfigCheckboxRowProps> = ({
  field,
  label,
  checked,
  isModified = false,
  onChange,
  onOpenDoc,
}) => {
  const doc = VARIABLE_DOCS[field];

  return (
    <label
      className={`flex items-center justify-between cursor-pointer text-[9px] font-bold text-slate-300 uppercase bg-[#161922] p-2.5 rounded-xl border transition-colors ${
        isModified ? 'border-amber-500/60 bg-amber-500/[0.04]' : 'border-slate-800'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <input
          type="checkbox"
          checked={!!checked}
          onChange={(e) => onChange(field, e.target.checked)}
          className="accent-cyan-400 w-3.5 h-3.5 cursor-pointer shrink-0"
        />
        {isModified && (
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="Modified from DB baseline" />
        )}
        <span className="truncate">{label}</span>
      </div>

      {doc && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onOpenDoc(doc);
          }}
          className="w-3.5 h-3.5 rounded-full bg-cyan-500/10 border border-cyan-500/40 text-cyan-400 hover:bg-cyan-400 hover:text-slate-950 flex items-center justify-center text-[8px] font-black transition-all shrink-0 ml-2"
          title="Click for variable documentation"
        >
          ?
        </button>
      )}
    </label>
  );
};
