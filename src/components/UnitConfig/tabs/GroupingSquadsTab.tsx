// src/components/UnitConfig/tabs/GroupingSquadsTab.tsx
import React from 'react';
import { UnitGroupingPayload } from '../types';

interface GroupingSquadsTabProps {
  grouping: UnitGroupingPayload;
  onChange: (field: keyof UnitGroupingPayload, value: string | number | boolean) => void;
}

export const GroupingSquadsTab: React.FC<GroupingSquadsTabProps> = ({ grouping, onChange }) => {
  return (
    <div className="flex flex-col gap-3">
      <div className="text-[10px] font-black text-amber-400 uppercase tracking-widest border-b border-slate-800 pb-1">
        👥 Squad Hotkey Grouping & Buddy Tethers[cite: 5, 17]
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Hotkey Squad Assignment (1-4) */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Hotkey Squad Group (1–4, 0 = Unassigned)[cite: 17]</span>
            <span className="text-cyan-400 font-black">{grouping.squadId}</span>
          </div>
          <div className="flex gap-2 mt-1">
            {[0, 1, 2, 3, 4].map((id) => (
              <button
                key={id}
                onClick={() => onChange('squadId', id)}
                className={`flex-1 py-1 rounded font-black text-[10px] uppercase transition-all border ${
                  grouping.squadId === id
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                {id === 0 ? 'None' : `Squad ${id}`}
              </button>
            ))}
          </div>
        </div>

        {/* Battalion ID */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase">
            <span>Battalion Tier ID</span>
            <span className="text-cyan-400 font-black">{grouping.battalionId}</span>
          </div>
          <input
            type="number"
            min="0"
            max="5"
            value={grouping.battalionId}
            onChange={(e) => onChange('battalionId', parseInt(e.target.value, 10) || 0)}
            className="bg-[#0b0e14] border border-slate-700 text-slate-200 text-xs font-bold rounded px-2 py-1 focus:outline-none focus:border-cyan-400"
          />
        </div>

        {/* Buddy ID Tether for support units */}
        <div className="flex flex-col gap-1 bg-[#161922] p-2.5 rounded-xl border border-slate-800">
          <label className="text-[9px] font-bold text-slate-300 uppercase">
            Exclusive Buddy Tether ID (e.g. Repair Anchor)[cite: 5, 17]
          </label>
          <input
            type="text"
            placeholder="e.g., player-flagship"
            value={grouping.buddyId || ''}
            onChange={(e) => onChange('buddyId', e.target.value)}
            className="bg-[#0b0e14] border border-slate-700 text-slate-200 text-xs font-bold rounded px-2 py-1 focus:outline-none focus:border-cyan-400"
          />
        </div>

        {/* Leader Toggle Flag */}
        <div className="flex items-center bg-[#161922] p-3 rounded-xl border border-slate-800">
          <label className="flex items-center gap-2 cursor-pointer text-[9px] font-bold text-slate-300 uppercase">
            <input
              type="checkbox"
              checked={grouping.isLeader}
              onChange={(e) => onChange('isLeader', e.target.checked)}
              className="accent-cyan-400 w-3.5 h-3.5"
            />
            Designate as Squad/Battalion Leader[cite: 17]
          </label>
        </div>
      </div>
    </div>
  );
};
