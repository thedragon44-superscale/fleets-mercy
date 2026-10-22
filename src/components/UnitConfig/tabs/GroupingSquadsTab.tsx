// src/components/UnitConfig/tabs/GroupingSquadsTab.tsx
import React, { useState } from 'react';
import { UnitGroupingPayload } from '../types';
import { SQUAD_COLORS, BATTALION_BORDERS } from '../../../utils/groupingColors';

interface FleetUnitSimple {
  id: string;
  type: string;
  squadId?: number;
  battalionId?: number;
  isLeader?: boolean;
}

interface GroupingSquadsTabProps {
  grouping: UnitGroupingPayload;
  onChange: (field: keyof UnitGroupingPayload, value: string | number | boolean) => void;
  hasCommandShip?: boolean;
  spawnedUnits?: FleetUnitSimple[]; // Live spawned units passed from sandbox state
  onAssignUnitToSquad?: (unitId: string, squadId: number, battalionId: number, isLeader?: boolean) => void;
}

export const GroupingSquadsTab: React.FC<GroupingSquadsTabProps> = ({
  grouping,
  onChange,
  hasCommandShip = true,
  spawnedUnits = [],
  onAssignUnitToSquad,
}) => {
  const [activeBattalionTab, setActiveBattalionTab] = useState<number>(grouping.battalionId || 0);
  const [draggedUnitId, setDraggedUnitId] = useState<string | null>(null);
  const [pickerSlot, setPickerSlot] = useState<{ squadId: number; slotIdx: number } | null>(null);

  // Handle switching battalion echelons
  const handleSelectBattalion = (batId: number) => {
    if (batId > 0 && !hasCommandShip) return; // Locked if no command ship present
    setActiveBattalionTab(batId);
    onChange('battalionId', batId);
  };

  // Dynamic border frame based on active battalion selection
  const activeBattalionBorderClass = activeBattalionTab === 1 
    ? 'border-amber-400 shadow-[0_0_25px_rgba(234,179,8,0.2)]' 
    : activeBattalionTab === 2 
    ? 'border-slate-200 shadow-[0_0_25px_rgba(226,232,240,0.2)]' 
    : 'border-slate-800 shadow-[0_0_15px_rgba(0,0,0,0.5)]';

  // Filter units belonging to the active battalion or sitting in the unassigned pool
  const activeBattalionUnits = spawnedUnits.filter(u => (u.battalionId || 0) === activeBattalionTab);
  const unassignedPool = spawnedUnits.filter(u => (u.squadId || 0) === 0 || (u.battalionId || 0) !== activeBattalionTab);

  // Drag and Drop Event Handlers
  const handleDragStart = (e: React.DragEvent, unitId: string) => {
    e.dataTransfer.setData('text/plain', unitId);
    setDraggedUnitId(unitId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropOnSquad = (e: React.DragEvent, targetSquadId: number) => {
    e.preventDefault();
    const unitId = e.dataTransfer.getData('text/plain') || draggedUnitId;
    if (unitId && onAssignUnitToSquad) {
      onAssignUnitToSquad(unitId, targetSquadId, activeBattalionTab);
    }
    setDraggedUnitId(null);
  };

  const handleDockUnit = (unitId: string, squadId: number) => {
    if (onAssignUnitToSquad) {
      onAssignUnitToSquad(unitId, squadId, activeBattalionTab);
    }
    setPickerSlot(null);
  };

  return (
    <div className="flex flex-col gap-3 font-mono select-none">
      
      {/* 1. BATTALION COMMAND SELECTOR BAR */}
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

      {/* 2. DYNAMICALLY FRAMED CONTAINER MATCHING BATTALION BORDER */}
      <div className={`flex flex-col gap-2 p-3 bg-[#161922] rounded-xl border-2 transition-all ${activeBattalionBorderClass}`}>
        
        <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
          <span className="text-[10px] font-black uppercase tracking-wider text-white">
            {BATTALION_BORDERS[activeBattalionTab]?.name} — Docking Bays
          </span>
          <span className="text-[8px] font-bold text-slate-400">
            Drag unit cards directly into squad bays
          </span>
        </div>

        {/* 3. SQUAD DOCKING BAYS (4 Formation Rows) */}
        <div className="grid grid-cols-1 gap-2">
          {[1, 2, 3, 4].map((sqId) => {
            const sqStyle = SQUAD_COLORS[sqId];
            const squadUnits = activeBattalionUnits.filter(u => u.squadId === sqId);

            return (
              <div
                key={sqId}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDropOnSquad(e, sqId)}
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

                {/* 5 Slot Matrix */}
                <div className="grid grid-cols-5 gap-1">
                  {[0, 1, 2, 3, 4].map((slotIdx) => {
                    const unit = squadUnits[slotIdx];

                    if (unit) {
                      return (
                        <div
                          key={slotIdx}
                          draggable
                          onDragStart={(e) => handleDragStart(e, unit.id)}
                          className="bg-[#0f1115] border rounded p-1 flex flex-col justify-between cursor-grab active:cursor-grabbing hover:border-white transition-all shadow-sm"
                          style={{ borderColor: sqStyle.hex }}
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-[8px] font-black truncate text-white">{unit.id}</span>
                            {unit.isLeader && (
                              <span className="text-[7px] bg-amber-400 text-slate-950 font-black px-1 rounded">LDR</span>
                            )}
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

      {/* 4. UNASSIGNED RESERVE CARGO DRAWER */}
      <div className="bg-[#0f1115] border border-slate-800 rounded-xl p-2.5 flex flex-col gap-1.5">
        <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest">
          📦 Unassigned Sandbox Reserve ({unassignedPool.length} Ready)
        </span>
        <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
          {unassignedPool.map((unit) => (
            <div
              key={unit.id}
              draggable
              onDragStart={(e) => handleDragStart(e, unit.id)}
              className="bg-[#161922] border border-slate-700 hover:border-cyan-400 text-slate-300 px-2 py-1 rounded text-[8px] font-bold uppercase cursor-grab active:cursor-grabbing transition-all flex items-center gap-1 shadow-sm"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              {unit.id} ({unit.type})
            </div>
          ))}

          {unassignedPool.length === 0 && (
            <div className="text-[8px] text-slate-500 font-medium py-1">
              All active sandbox units are docked into tactical squads.
            </div>
          )}
        </div>
      </div>

      {/* QUICK DOCK SELECTOR MODAL */}
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
              {unassignedPool.map((unit) => (
                <button
                  key={unit.id}
                  onClick={() => handleDockUnit(unit.id, pickerSlot.squadId)}
                  className="w-full bg-[#161922] border border-slate-800 hover:border-cyan-400 rounded p-1.5 flex justify-between items-center text-left transition-all"
                >
                  <span className="text-[10px] font-bold text-white">{unit.id}</span>
                  <span className="text-[8px] font-bold text-cyan-400 uppercase">{unit.type}</span>
                </button>
              ))}

              {unassignedPool.length === 0 && (
                <div className="text-red-400 text-[9px] text-center py-2">
                  No unassigned units available in sandbox. Spawn units first.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
