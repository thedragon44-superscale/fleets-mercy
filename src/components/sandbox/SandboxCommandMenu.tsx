// src/components/sandbox/SandboxCommandMenu.tsx
import React from 'react';
import { SnapshotUnit } from '../../parsers/binaryCodec';
import { DebugOverlayFlags } from '../../renderer/vectorAssets';
import { CanvasToolMode } from '../viewport/CanvasToolBar';
import { UnitConfigModal } from './UnitConfig';
import { DockingModal } from './modals/DockingModal';
import { SCENARIO_PRESETS, ScenarioPreset, formatUnitName } from './constants';

export type SandboxMenuTab = 'battlefield' | 'specs' | 'fleet';

export interface CatalogUnitItem {
  id: string;
  name: string;
  role: string;
  weight: number;
}

interface SandboxCommandMenuProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: SandboxMenuTab;
  onSelectTab: (tab: SandboxMenuTab) => void;
  // Spawner & Active Unit Blueprint
  spawnerFaction: 'player' | 'enemy';
  onChangeFaction: (faction: 'player' | 'enemy') => void;
  catalogSearch: string;
  onChangeSearch: (query: string) => void;
  catalogUnits: CatalogUnitItem[];
  filteredCatalogUnits: CatalogUnitItem[];
  selectedCatalogUnitId: string;
  onSelectCatalogUnit: (unitId: string) => void;
  allUnits: SnapshotUnit[];
  onUpdateUnitCount: (unitType: string, delta: number) => void;
  onApplyPreset: (preset: ScenarioPreset) => void;
  onResetSandbox: () => void;
  // Specs, Piloting & Docking
  playerUnits: SnapshotUnit[];
  controlledUnitId: string;
  hasCommandShip: boolean;
  onSelectControlledUnit: (unitId: string) => void;
  sendTemplateOverride: (unitType: string, override: any) => void;
  sendUnitGrouping: (payload: {
    unitId: string;
    squadId: number;
    battalionId: number;
    isSquadLeader: boolean;
  }) => void;
  // Pinned Utility Strip
  canvasMode: CanvasToolMode;
  onChangeMode: (mode: CanvasToolMode) => void;
  debugFlags: DebugOverlayFlags;
  onToggleDebugFlag: (flag: keyof DebugOverlayFlags) => void;
  isCameraLocked: boolean;
  onToggleCameraLock: () => void;
  zoomPercent: number;
  onResetZoom: () => void;
}

const WORKSPACES: ReadonlyArray<{ id: SandboxMenuTab; keyHint: string; label: string }> = [
  { id: 'battlefield', keyHint: '1', label: 'Battlefield' },
  { id: 'specs', keyHint: '2', label: 'Unit Specs' },
  { id: 'fleet', keyHint: '3', label: 'Docking' },
];

const TOOL_MODES: ReadonlyArray<{ id: CanvasToolMode; label: string }> = [
  { id: 'pilot', label: 'Pilot' },
  { id: 'spawn', label: 'Click-Spawn' },
  { id: 'select', label: 'Pick' },
];

const DEBUG_TOGGLES: ReadonlyArray<{ key: keyof DebugOverlayFlags; label: string }> = [
  { key: 'showRanges', label: 'Ranges' },
  { key: 'showVitals', label: 'Vitals' },
  { key: 'showVelocity', label: 'Vel' },
  { key: 'showHitboxes', label: 'Hitbox' },
];

export const SandboxCommandMenu: React.FC<SandboxCommandMenuProps> = ({
  isOpen,
  onClose,
  activeTab,
  onSelectTab,
  spawnerFaction,
  onChangeFaction,
  catalogSearch,
  onChangeSearch,
  catalogUnits,
  filteredCatalogUnits,
  selectedCatalogUnitId,
  onSelectCatalogUnit,
  allUnits,
  onUpdateUnitCount,
  onApplyPreset,
  onResetSandbox,
  playerUnits,
  controlledUnitId,
  hasCommandShip,
  onSelectControlledUnit,
  sendTemplateOverride,
  sendUnitGrouping,
  canvasMode,
  onChangeMode,
  debugFlags,
  onToggleDebugFlag,
  isCameraLocked,
  onToggleCameraLock,
  zoomPercent,
  onResetZoom,
}) => {
  if (!isOpen) {
    return (
      <div className="absolute bottom-4 left-4 bg-[#0f1115]/80 border border-slate-800/80 px-3 py-1.5 rounded-lg text-[9px] font-bold text-slate-400 uppercase tracking-widest pointer-events-none z-40">
        Right-Click: <span className="text-cyan-400">Sandbox Menu</span>
        <span className="text-slate-600 mx-1.5">|</span>
        Mode: <span className="text-amber-400">{canvasMode}</span>
      </div>
    );
  }

  const activeUnit =
    catalogUnits.find((u) => u.id === selectedCatalogUnitId) || catalogUnits[0];
  const activeUnitCount = allUnits.filter(
    (u) =>
      u.ownerId === spawnerFaction &&
      u.type === selectedCatalogUnitId &&
      !u.isDestroyed
  ).length;

  const activePilotValue = playerUnits.some((u) => u.id === controlledUnitId)
    ? controlledUnitId
    : '';

  return (
    <div
      className="ui-interactive absolute top-4 left-4 w-[540px] max-w-[calc(100%-32px)] h-[calc(100%-32px)] bg-[#0f1115]/95 border border-cyan-500/40 rounded-xl z-50 flex flex-col shadow-2xl backdrop-blur-md overflow-hidden"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 1. TOP WORKSPACE TABS */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-[#161922] border-b border-slate-800 shrink-0">
        <div className="grid grid-cols-3 gap-1.5 flex-1">
          {WORKSPACES.map((ws) => {
            const isActive = activeTab === ws.id;
            return (
              <button
                key={ws.id}
                onClick={() => onSelectTab(ws.id)}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                  isActive
                    ? 'bg-cyan-500 text-slate-950 shadow-md'
                    : 'bg-[#0f1115]/60 text-slate-400 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <span
                  className={`text-[8px] px-1 rounded font-mono ${
                    isActive ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {ws.keyHint}
                </span>
                <span>{ws.label}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={onClose}
          className="text-[9px] font-bold text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 shrink-0"
          title="Close menu (Esc or Right-Click)"
        >
          ESC
        </button>
      </div>

      {/* 2. PERSISTENT CONTEXT BAR (Single Blueprint Selector + Single Pilot Selector) */}
      <div className="flex flex-col gap-1.5 px-3 py-2 bg-[#11151f] border-b border-slate-800/90 shrink-0">
        {/* Row A: Single Blueprint Selector + Quick Spawn */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="w-12 text-[8px] font-black uppercase tracking-widest text-slate-500 shrink-0">
              Blueprint
            </span>
            <select
              value={selectedCatalogUnitId}
              onChange={(e) => onSelectCatalogUnit(e.target.value)}
              className="bg-[#0b0e14] text-amber-300 border border-slate-700 hover:border-amber-400/60 rounded-md px-2 py-1 text-[10px] font-bold focus:outline-none focus:border-cyan-400 cursor-pointer min-w-0 flex-1 truncate"
              title="Select unit blueprint for spawning and Unit Specs"
            >
              {catalogUnits.map((u) => (
                <option key={u.id} value={u.id} className="bg-[#0f1115] text-slate-100">
                  {u.name} ({u.weight}W)
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center bg-[#0b0e14] p-0.5 rounded-md border border-slate-800 shrink-0">
            <button
              onClick={() => onChangeFaction('player')}
              className={`px-2 py-0.5 rounded text-[8px] font-black uppercase transition-all ${
                spawnerFaction === 'player'
                  ? 'bg-green-500 text-slate-950'
                  : 'text-slate-500 hover:text-slate-200'
              }`}
              title="Spawn as Player faction"
            >
              PLY
            </button>
            <button
              onClick={() => onChangeFaction('enemy')}
              className={`px-2 py-0.5 rounded text-[8px] font-black uppercase transition-all ${
                spawnerFaction === 'enemy'
                  ? 'bg-red-500 text-white'
                  : 'text-slate-500 hover:text-slate-200'
              }`}
              title="Spawn as Enemy faction"
            >
              ENM
            </button>
          </div>

          {activeUnit && (
            <div className="flex items-center gap-1 bg-[#0b0e14] px-1.5 py-0.5 rounded-md border border-slate-800 shrink-0">
              <button
                onClick={() => onUpdateUnitCount(activeUnit.id, -1)}
                className="w-5 h-5 bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 rounded flex items-center justify-center font-black text-[10px] transition-all"
                title="Despawn 1"
              >
                -
              </button>
              <span className="w-5 text-center text-[10px] font-black text-amber-400">
                {activeUnitCount}
              </span>
              <button
                onClick={() => onUpdateUnitCount(activeUnit.id, 1)}
                className="w-5 h-5 bg-slate-800 hover:bg-amber-500/20 text-slate-300 hover:text-amber-400 rounded flex items-center justify-center font-black text-[10px] transition-all"
                title="Spawn 1"
              >
                +
              </button>
            </div>
          )}
        </div>

        {/* Row B: Single Active Pilot Selector */}
        <div className="flex items-center gap-2">
          <span className="w-12 text-[8px] font-black uppercase tracking-widest text-cyan-400/90 shrink-0">
            Piloting
          </span>
          <select
            value={activePilotValue}
            disabled={playerUnits.length === 0}
            onChange={(e) => {
              if (e.target.value) onSelectControlledUnit(e.target.value);
            }}
            className={`rounded-md px-2 py-1 text-[10px] font-bold focus:outline-none min-w-0 flex-1 truncate border transition-all ${
              playerUnits.length > 0
                ? 'bg-[#0b0e14] text-cyan-300 border-cyan-500/40 hover:border-cyan-400 cursor-pointer'
                : 'bg-[#0b0e14]/60 text-slate-600 border-slate-800 cursor-not-allowed'
            }`}
            title="Select which spawned player unit to pilot"
          >
            {playerUnits.length === 0 ? (
              <option value="">No player units spawned</option>
            ) : (
              playerUnits.map((u) => {
                const squadTag = u.squadId ? ` · Sq ${u.squadId}` : '';
                return (
                  <option key={u.id} value={u.id} className="bg-[#0f1115] text-slate-100">
                    {u.id} — {formatUnitName(u.type)}
                    {squadTag}
                  </option>
                );
              })
            )}
          </select>
          <span className="text-[8px] font-mono text-slate-500 shrink-0">
            {playerUnits.length} live
          </span>
        </div>
      </div>

      {/* 3. MAIN WORKSPACE CONTENT */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {activeTab === 'battlefield' && (
          <div className="flex-1 min-h-0 flex flex-col p-3 gap-2.5">
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 shrink-0">
                Presets:
              </span>
              <div className="grid grid-cols-3 gap-1.5 flex-1">
                {SCENARIO_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => onApplyPreset(preset)}
                    title={preset.description}
                    className="bg-[#161922] hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-300 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <input
              type="text"
              value={catalogSearch}
              onChange={(e) => onChangeSearch(e.target.value)}
              placeholder="Filter unit catalog by name or role..."
              className="w-full bg-[#0b0e14] border border-slate-800 focus:border-cyan-500/60 rounded-lg px-2.5 py-1.5 text-[10px] text-slate-200 placeholder-slate-500 outline-none shrink-0"
            />

            <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-1">
              {filteredCatalogUnits.map((unit) => {
                const isSelected = selectedCatalogUnitId === unit.id;
                const unitCount = allUnits.filter(
                  (u) => u.ownerId === spawnerFaction && u.type === unit.id && !u.isDestroyed
                ).length;

                return (
                  <div
                    key={unit.id}
                    onClick={() => onSelectCatalogUnit(unit.id)}
                    onDoubleClick={() => {
                      onSelectCatalogUnit(unit.id);
                      onSelectTab('specs');
                    }}
                    title="Click to select, double-click to edit specs"
                    className={`p-2 rounded-lg border transition-all flex items-center justify-between cursor-pointer shrink-0 ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-400/80 text-white shadow-sm'
                        : 'bg-[#161922] border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <div className="text-[10px] font-bold truncate">{unit.name}</div>
                      <div className="text-[8px] text-slate-400 truncate">
                        {unit.role} | {unit.weight}W
                      </div>
                    </div>

                    <div
                      className="flex items-center gap-1.5 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => {
                          onSelectCatalogUnit(unit.id);
                          onSelectTab('specs');
                        }}
                        className="px-2 py-1 rounded bg-slate-800/80 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-300 border border-slate-700/60 text-[8px] font-black uppercase transition-all"
                        title="Open in Unit Specs"
                      >
                        Tune
                      </button>

                      <div className="flex items-center gap-1 bg-[#0b0e14] px-1.5 py-0.5 rounded-md border border-slate-800">
                        <button
                          onClick={() => onUpdateUnitCount(unit.id, -1)}
                          className="w-5 h-5 bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 rounded flex items-center justify-center font-black text-[10px] transition-all"
                        >
                          -
                        </button>
                        <span className="w-5 text-center text-[10px] font-black text-amber-400">
                          {unitCount}
                        </span>
                        <button
                          onClick={() => onUpdateUnitCount(unit.id, 1)}
                          className="w-5 h-5 bg-slate-800 hover:bg-amber-500/20 text-slate-300 hover:text-amber-400 rounded flex items-center justify-center font-black text-[10px] transition-all"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-800 shrink-0">
              <button
                onClick={onResetSandbox}
                className="w-full bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 font-black py-1.5 rounded-lg text-[10px] uppercase tracking-widest transition-all"
              >
                Reset Sandbox (Clear All Units)
              </button>
            </div>
          </div>
        )}

        {activeTab === 'specs' && (
          <UnitConfigModal
            isOpen={true}
            embedded={true}
            initialUnitId={selectedCatalogUnitId}
            onClose={onClose}
            sendTemplateOverride={sendTemplateOverride}
          />
        )}

        {activeTab === 'fleet' && (
          <DockingModal
            isOpen={true}
            embedded={true}
            onClose={onClose}
            hasCommandShip={hasCommandShip}
            spawnedUnits={playerUnits.map((u) => ({
              id: u.id,
              type: u.type,
              squadId: u.squadId || 0,
              battalionId: u.battalionId || 0,
              isLeader: u.isSquadLeader || false,
            }))}
            onAssignUnitToSquad={(unitId, squadId, battalionId, isLeader) => {
              sendUnitGrouping({
                unitId,
                squadId,
                battalionId,
                isSquadLeader: isLeader || false,
              });
            }}
          />
        )}
      </div>

      {/* 4. PINNED BOTTOM UTILITY STRIP */}
      <div className="flex flex-col gap-1.5 px-3 py-2 bg-[#12151d] border-t border-slate-800 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            {TOOL_MODES.map((mode) => (
              <button
                key={mode.id}
                onClick={() => onChangeMode(mode.id)}
                className={`px-2 py-0.5 rounded text-[8px] font-black uppercase transition-all ${
                  canvasMode === mode.id
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={onToggleCameraLock}
              title="Toggle camera follow (Middle-click drag pans freely)"
              className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase transition-all border ${
                isCameraLocked
                  ? 'bg-green-500/15 text-green-300 border-green-500/40'
                  : 'bg-slate-900 text-amber-300 border-amber-500/40'
              }`}
            >
              {isCameraLocked ? 'Cam: Lock' : 'Cam: Free'}
            </button>
            <button
              onClick={onResetZoom}
              title="Reset zoom to 100%"
              className="px-2 py-0.5 rounded text-[8px] font-bold bg-slate-900 text-slate-300 border border-slate-800 hover:text-white"
            >
              {zoomPercent}%
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-1.5">
          <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">
            Overlays:
          </span>
          <div className="grid grid-cols-4 gap-1 flex-1">
            {DEBUG_TOGGLES.map((item) => (
              <button
                key={item.key}
                onClick={() => onToggleDebugFlag(item.key)}
                className={`py-0.5 rounded text-[8px] font-bold uppercase transition-all border ${
                  debugFlags[item.key]
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                    : 'bg-[#0b0e14] text-slate-500 border-slate-800 hover:text-slate-300'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
