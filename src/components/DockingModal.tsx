// src/components/DockingModal.tsx
import React from 'react';
import { GroupingSquadsTab } from './UnitConfig/tabs/GroupingSquadsTab';

interface DockingModalProps {
  isOpen: boolean;
  onClose: () => void;
  hasCommandShip?: boolean;
  spawnedUnits?: Array<{ id: string; type: string; squadId?: number; battalionId?: number; isLeader?: boolean }>;
  onAssignUnitToSquad?: (unitId: string, squadId: number, battalionId: number, isLeader?: boolean) => void;
}

export const DockingModal: React.FC<DockingModalProps> = ({
  isOpen,
  onClose,
  hasCommandShip = false,
  spawnedUnits = [],
  onAssignUnitToSquad,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="ui-interactive absolute top-4 left-[340px] w-[560px] max-h-[calc(100vh-90px)] bg-[#0f1115]/95 border border-amber-500/40 rounded-xl p-4 z-50 flex flex-col shadow-2xl backdrop-blur-md overflow-hidden font-mono"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Modal Header */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black text-xs">
            ⚓
          </div>
          <div>
            <h2 className="text-xs font-black text-white uppercase tracking-wider">
              Fleet Docking & Grouping Studio
            </h2>
            <p className="text-[9px] font-bold text-amber-400 tracking-wider uppercase">
              Command Hierarchy & Detachment Management
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

      {/* Embedded Docking Panel */}
      <div className="flex-1 overflow-y-auto pr-1">
        <GroupingSquadsTab
          grouping={{ unitId: '', battalionId: 0, squadId: 0, isLeader: false }}
          onChange={() => {}}
          hasCommandShip={hasCommandShip}
          spawnedUnits={spawnedUnits}
          onAssignUnitToSquad={onAssignUnitToSquad}
        />
      </div>
    </div>
  );
};
