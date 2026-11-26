// src/components/common/TacticalSelect.tsx
import React, { useState, useRef, useEffect } from 'react';

export interface TacticalSelectOption {
  value: string;
  label: string;
  sublabel?: string;
  badge?: string;
}

interface TacticalSelectProps {
  value: string;
  options: TacticalSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  emptyText?: string;
  disabled?: boolean;
  accent?: 'cyan' | 'amber';
  title?: string;
}

export const TacticalSelect: React.FC<TacticalSelectProps> = ({
  value,
  options,
  onChange,
  placeholder = 'Select...',
  emptyText = 'No options available',
  disabled = false,
  accent = 'cyan',
  title,
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;

    // Capture phase ensures outside clicks inside stopPropagation() panels still close the menu
    const handlePointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [open]);

  const accentText = accent === 'amber' ? 'text-amber-300' : 'text-cyan-300';
  const accentRing =
    accent === 'amber'
      ? 'border-amber-400/40'
      : 'border-cyan-400/40';
  const activeOptionBg =
    accent === 'amber'
      ? 'bg-amber-500/15 text-amber-200'
      : 'bg-cyan-500/15 text-cyan-200';

  return (
    <div ref={containerRef} className="relative flex-1 min-w-0">
      <button
        type="button"
        disabled={disabled}
        title={title}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-2 px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${
          disabled
            ? 'bg-[#080a0f]/60 text-slate-500 border-white/5 cursor-not-allowed'
            : open
            ? `bg-[#080a0f] ${accentText} ${accentRing}`
            : `bg-[#080a0f] ${accentText} border-white/10 hover:border-white/20 cursor-pointer`
        }`}
      >
        <span className="truncate">
          {selected ? selected.label : placeholder}
        </span>

        <div className="flex items-center gap-1.5 shrink-0">
          {selected?.badge && (
            <span className="text-[10px] text-slate-400 font-normal">
              {selected.badge}
            </span>
          )}
          <svg
            className={`w-3 h-3 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M3 4.5L6 7.5L9 4.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="absolute left-0 right-0 mt-1 bg-[#0b0e14] border border-white/15 rounded-md shadow-2xl z-[60] py-1 max-h-56 overflow-y-auto sandbox-scroll">
          {options.length === 0 ? (
            <div className="px-2.5 py-2 text-[11px] text-slate-500 text-center">
              {emptyText}
            </div>
          ) : (
            options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`w-full px-2.5 py-1.5 text-left flex items-center justify-between gap-2 transition-colors ${
                    isSelected
                      ? activeOptionBg
                      : 'text-slate-200 hover:bg-white/5'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-medium truncate">{opt.label}</div>
                    {opt.sublabel && (
                      <div className="text-[10px] text-slate-400 truncate">
                        {opt.sublabel}
                      </div>
                    )}
                  </div>
                  {opt.badge && (
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {opt.badge}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
