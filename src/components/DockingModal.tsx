// src/components/DockingModal.tsx
import React, { useState } from 'react';
import { SQUAD_COLORS, BATTALION_BORDERS } from '../utils/groupingColors';

interface FleetUnitSimple {
  id: string;
  type: string;
  squadId?: number;
  battalionId?: number;
  isLeader?: boolean;
}

interface DockingModalProps {
  isOpen: boolean;
  onClose: () => void;
  hasCommandShip?: boolean;
  spawnedUnits?: FleetUnitSimple[];
  onAssignUnitToSquad?: (unitId: string, squadId: number, battalionId: number, isLeader?: boolean) => void;
}

export const DockingModal: React.FC<DockingModalProps> = ({
  isOpen,
  onClose,
  hasCommandShip = false,
  spawnedUnits = [],
  onAssignUnitToSquad,
}) => {
  const [activeBattalionTab, setActiveBattalionTab] = useState<number>(0);
  const [pickerSlot, setPickerSlot] = useState<{ squadId: number; slotIdx: number } | null>(null);

  if (!isOpen) return null;

  const handleSelectBattalion = (batId: number) => {
    if (batId > 0 && !hasCommandShip) return;
    setActiveBattalionTab(batId);
  };

  const activeBattalionBorderClass = activeBattalionTab === 1 
    ? 'border-amber-400 shadow-[0_0_25px_rgba(234,179,8,0.2)]' 
    : activeBattalionTab === 2 
    ? 'border-slate-200 shadow-[0_0_25px_rgba(226,232,240,0.2)]' 
    : 'border-slate-800 shadow-[0_0_15px_rgba(0,0,0,0.5)]';

  const activeBattalionUnits = spawnedUnits.filter(u => (u.battalionId || 0) === activeBattalionTab);
  
  // Filter for unassigned units, excluding foundational capital command ships
  const unassignedUnits = spawnedUnits.filter(u => 
    (u.squadId || 0) === 0 && 
    u.type !== 'flagship' && 
    u.type !== 'battalion_command_ship'
  );

  const handleDockUnit = (unitId: string, squadId: number) => {
    if (onAssignUnitToSquad) {
      onAssignUnitToSquad(unitId, squadId, activeBattalionTab, false);
    }
    setPickerSlot(null);
  };

  return (
    <div
      className="ui-interactive absolute top-4 left-[340px] w-[560px] max-h-[calc(100vh-90px)] bg-[#0f1115]/95 border border-amber-500/40 rounded-xl p-4 z-50 flex flex-col shadow-2xl backdrop-blur-md overflow-hidden font-mono select-none"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
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

      <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3">
        {/* 1. Battalion Selector */}
        <div className="flex flex-col gap-1">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
            Command Echelon Tier (Select Detachment)
          </span>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { id: 0, name: 'Main Flagship', color: 'border-slate-800 text-slate-300' },
              { id: 1, name: 'Alpha Cmd (Gold)', color: 'border-amber-400 text-amber-400' },
              { id: 2, name: 'Beta Cmd (Silver)', color: 'border-slate-200 text-slate-200' },
            ].map((bat) => {
              const isSelected = activeBattalionTab === bat.id;
              const isLocked = bat.id > 0 && !hasCommandShip;

              return (
                <button
                  key={bat.id}
                  onClick={() => handleSelectBattalion(bat.id)}
                  disabled={isLocked}
                  className={`py-1.5 px-2 rounded-lg border-2 text-[9px] font-black uppercase transition-all flex flex-col items-center justify-center gap-0.5 ${
                    isSelected 
                      ? 'bg-slate-800 shadow-md scale-[1.02]' 
                      : 'bg-[#161922] opacity-60 hover:opacity-100'
                  } ${isLocked ? 'opacity-30 cursor-not-allowed border-slate-800 text-slate-600' : bat.color}`}
                >
                  <span>{bat.name}</span>
                  {isLocked && <span className="text-[7px] text-red-400">[REQUIRES CMD SHIP]</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Squad Docking Bays */}
        <div className={`flex flex-col gap-2 p-3 bg-[#161922] rounded-xl border-2 transition-all ${activeBattalionBorderClass}`}>
          <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-white">
              {BATTALION_BORDERS[activeBattalionTab]?.name} — Docking Bays
            </span>
            <span className="text-[8px] font-bold text-slate-400">
              Click empty slots to dock units
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {[1, 2, 3, 4].map((sqId) => {
              const sqStyle = SQUAD_COLORS[sqId];
              const squadUnits = activeBattalionUnits.filter(u => u.squadId === sqId);

              return (
                <div
                  key={sqId}
                  className="p-2 rounded-lg border border-slate-800/80 flex flex-col gap-1.5 transition-all"
                  style={{ backgroundColor: sqStyle.hex + '10' }}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: sqStyle.hex }} />
                      <span className="text-[9px] font-black uppercase" style={{ color: sqStyle.hex }}>
                        Formation Bay [{sqId}] — {sqStyle.name}
                      </span>
                    </div>
                    <span className="text-[8px] font-bold text-slate-400 uppercase">
                      {squadUnits.length} / 5 Docked
                    </span>
                  </div>

                  <div className="grid grid-cols-5 gap-1">
                    {[0, 1, 2, 3, 4].map((slotIdx) => {
                      const unit = squadUnits[slotIdx];

                      if (unit) {
                        return (
                          <div
                            key={slotIdx}
                            className="bg-[#0f1115] border rounded p-1 flex flex-col justify-between shadow-sm"
                            style={{ borderColor: sqStyle.hex }}
                          >
                            <div className="flex justify-between items-center">
                              <span className="text-[8px] font-black truncate text-white">{unit.id}</span>
                              <div className="flex items-center gap-0.5">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (onAssignUnitToSquad) {
                                      onAssignUnitToSquad(unit.id, sqId, activeBattalionTab, !unit.isLeader);
                                    }
                                  }}
                                  className={`text-[7px] font-black px-1 rounded transition-all ${
                                    unit.isLeader ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-400 hover:text-white'
                                  }`}
                                  title="Toggle Squad Leader status"
                                >
                                  {unit.isLeader ? 'LDR' : 'SET'}
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (onAssignUnitToSquad) {
                                      // Unassign: reset squadId to 0, battalionId to 0, and clear leader status
                                      onAssignUnitToSquad(unit.id, 0, 0, false);
                                    }
                                  }}
                                  className="text-[7px] bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white font-black px-1 rounded transition-all"
                                  title="Undock / Unassign unit"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                            <span className="text-[7px] text-slate-400 font-bold uppercase">{unit.type}</span>
                          </div>
                        );
                      }

                      return (
                        <button
                          key={slotIdx}
                          onClick={() => setPickerSlot({ squadId: sqId, slotIdx })}
                          className="bg-[#0f1115]/50 border border-dashed border-slate-800/80 rounded p-1 text-[8px] font-bold text-slate-500 hover:border-cyan-400 hover:text-cyan-400 transition-all flex items-center justify-center min-h-[32px]"
                        >
                          + Dock
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Quick Dock Picker */}
      {pickerSlot && (
        <div
          onClick={() => setPickerSlot(null)}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex justify-center items-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-[#0f1115] border border-cyan-400 rounded-xl p-3 flex flex-col gap-2 shadow-2xl"
          >
            <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
              <span className="text-[10px] font-black text-cyan-400 uppercase tracking-wider">
                Select Unit to Dock into Squad [{pickerSlot.squadId}]
              </span>
              <button onClick={() => setPickerSlot(null)} className="text-red-400 text-xs font-bold">✕</button>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
              {unassignedUnits.map((unit) => (
                <button
                  key={unit.id}
                  onClick={() => handleDockUnit(unit.id, pickerSlot.squadId)}
                  className="w-full bg-[#161922] border border-slate-800 hover:border-cyan-400 rounded p-1.5 flex justify-between items-center text-left transition-all"
                >
                  <span className="text-[10px] font-bold text-white">{unit.id}</span>
                  <span className="text-[8px] font-bold text-cyan-400 uppercase">{unit.type}</span>
                </button>
              ))}

              {unassignedUnits.length === 0 && (
                <div className="text-red-400 text-[9px] text-center py-2">
                  No unassigned units available. All units are currently docked.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
