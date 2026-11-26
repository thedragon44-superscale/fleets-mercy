// src/components/UnitConfig/common/ConfigSliderCard.tsx
import React, { useState, useEffect } from 'react';
import { UnitConfigConfigPayload } from '../types';
import { VARIABLE_DOCS, VariableDoc } from '../../../../constants/variableDocs';

interface ConfigSliderCardProps {
  field: keyof UnitConfigConfigPayload;
  label: string;
  value: number;
  min: number | string;
  max: number | string;
  step: number | string;
  isModified?: boolean;
  onChange: (field: keyof UnitConfigConfigPayload, value: number) => void;
  onOpenDoc: (doc: VariableDoc) => void;
}

export const ConfigSliderCard: React.FC<ConfigSliderCardProps> = ({
  field,
  label,
  value,
  min,
  max,
  step,
  isModified = false,
  onChange,
  onOpenDoc,
}) => {
  const [localVal, setLocalVal] = useState<number>(value ?? 0);
  const [inputText, setInputText] = useState<string>(String(value ?? 0));

  useEffect(() => {
    const safeVal = value ?? 0;
    setLocalVal(safeVal);
    setInputText(String(safeVal));
  }, [value]);

  const doc = VARIABLE_DOCS[field];

  const commitValue = (nextVal: number) => {
    if (Number.isNaN(nextVal)) return;
    setLocalVal(nextVal);
    setInputText(String(nextVal));
    if (nextVal !== value) {
      onChange(field, nextVal);
    }
  };

  return (
    <div
      className={`flex flex-col gap-1.5 bg-[#161922] p-2.5 rounded-xl border transition-colors ${
        isModified ? 'border-amber-500/60 bg-amber-500/[0.04]' : 'border-slate-800'
      }`}
    >
      <div className="flex justify-between items-center gap-2 text-[9px] font-bold text-slate-300 uppercase">
        <div className="flex items-center gap-1.5 min-w-0">
          {isModified && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="Modified from DB baseline" />
          )}
          <span className="truncate">{label}</span>
          {doc && (
            <button
              type="button"
              onClick={() => onOpenDoc(doc)}
              className="w-3.5 h-3.5 rounded-full bg-cyan-500/10 border border-cyan-500/40 text-cyan-400 hover:bg-cyan-400 hover:text-slate-950 flex items-center justify-center text-[8px] font-black transition-all shrink-0"
              title="Click for variable documentation"
            >
              ?
            </button>
          )}
        </div>

        <input
          type="number"
          step={step}
          value={inputText}
          onChange={(e) => {
            setInputText(e.target.value);
            const parsed = parseFloat(e.target.value);
            if (!Number.isNaN(parsed)) {
              setLocalVal(parsed);
            }
          }}
          onBlur={() => {
            const parsed = parseFloat(inputText);
            if (Number.isNaN(parsed)) {
              setInputText(String(value ?? 0));
              setLocalVal(value ?? 0);
            } else {
              commitValue(parsed);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              (e.target as HTMLInputElement).blur();
            }
          }}
          className={`bg-[#0b0e14] border rounded px-1.5 py-0.5 text-[10px] font-black w-16 text-right focus:outline-none shrink-0 ${
            isModified
              ? 'text-amber-300 border-amber-500/50 focus:border-amber-400'
              : 'text-cyan-400 border-slate-700/80 focus:border-cyan-400'
          }`}
        />
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={localVal}
        onChange={(e) => {
          const parsed = parseFloat(e.target.value);
          setLocalVal(parsed);
          setInputText(String(parsed));
        }}
        onMouseUp={(e) => commitValue(parseFloat((e.target as HTMLInputElement).value))}
        onTouchEnd={(e) => commitValue(parseFloat((e.target as HTMLInputElement).value))}
        onKeyUp={(e) => commitValue(parseFloat((e.target as HTMLInputElement).value))}
        className="accent-cyan-400 cursor-pointer"
      />
    </div>
  );
};
