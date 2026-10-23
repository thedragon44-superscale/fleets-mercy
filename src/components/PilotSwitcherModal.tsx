// src/components/PilotSwitcherModal.tsx
import React from 'react';

interface FleetUnitSimple {
  id: string;
  type: string;
  squadId?: number;
  battalionId?: number;
}

interface PilotSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerUnits: FleetUnitSimple[];
  controlledUnitId: string;
  onSelectUnit: (unitId: string) => void;
}

export const PilotSwitcherModal: React.FC<PilotSwitcherModalProps> = ({
  isOpen,
  onClose,
  playerUnits = [],
  controlledUnitId,
  onSelectUnit,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="ui-interactive absolute top-4 left-[340px] w-[440px] max-h-[calc(100vh-90px)] bg-[#0f1115]/95 border border-cyan-500/40 rounded-xl p-4 z-50 flex flex-col shadow-2xl backdrop-blur-md overflow-hidden font-mono select-none"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Modal Header */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-black text-xs">
            🚀
          </div>
          <div>
            <h2 className="text-xs font-black text-white uppercase tracking-wider">
              Active Units & Pilot Switcher
            </h2>
            <p className="text-[9px] font-bold text-cyan-400 tracking-wider uppercase">
              Direct Cockpit Telemetry & Control Link
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 px-3 py-1.5 rounded-lg font-bold text-xs uppercase transition-all"
        >
          [CLOSE]
        </button>
      </div>

      {/* Unit Selection Roster */}
      <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2">
        <p className="text-[9px] text-slate-400 font-medium">
          Select an active sandbox unit below to take direct manual control of its flight path and weapon systems.
        </p>

        <div className="grid grid-cols-1 gap-1.5 mt-2">
          {playerUnits.map((unit) => {
            const isControlled = controlledUnitId === unit.id;
            const squadId = unit.squadId || 0;
            const battalionId = unit.battalionId || 0;
            const bgHex = squadId === 1 ? '#ef444422' : squadId === 2 ? '#3b82f622' : squadId === 3 ? '#22c55e22' : squadId === 4 ? '#a855f722' : '#161922';
            const borderCol = battalionId === 1 ? 'border-amber-400/60' : battalionId === 2 ? 'border-slate-200/60' : 'border-slate-800';

            return (
              <button
                key={unit.id}
                onClick={() => onSelectUnit(unit.id)}
                style={{ backgroundColor: isControlled ? '#38bdf8' : bgHex }}
                className={`p-2.5 rounded-lg border text-left flex items-center justify-between transition-all ${borderCol} ${
                  isControlled 
                    ? 'text-slate-950 border-white shadow-lg font-black scale-[1.01]' 
                    : 'text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex flex-col gap-0.5">
                  <div className="text-[10px] font-bold tracking-wide flex items-center gap-2">
                    <span>{unit.id}</span>
                    {isControlled && (
                      <span className="text-[7px] bg-slate-950 text-cyan-400 px-1.5 py-0.5 rounded font-black uppercase">
                        PILOTING ACTIVE
                      </span>
                    )}
                  </div>
                  <div className="text-[8px] opacity-80 uppercase flex gap-2">
                    <span>Type: {unit.type}</span>
                    {squadId > 0 && <span>| Squad: [{squadId}]</span>}
                    {battalionId > 0 && <span>| Battalion: [{battalionId === 1 ? 'Alpha' : 'Beta'}]</span>}
                  </div>
                </div>

                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-black/20">
                  {isControlled ? 'Active' : 'Switch ↗'}
                </span>
              </button>
            );
          })}

          {playerUnits.length === 0 && (
            <div className="text-red-400 text-[9px] text-center py-6">
              No active units in the sandbox. Spawn units using the catalog spawner below.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
