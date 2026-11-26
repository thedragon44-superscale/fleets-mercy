// src/components/sandbox/SandboxCommandMenu.tsx
import React from 'react';
import { SnapshotUnit } from '../../parsers/binaryCodec';
import { DebugOverlayFlags } from '../../renderer/vectorAssets';
import { CanvasToolMode } from '../viewport/CanvasToolBar';
import { TacticalSelect, TacticalSelectOption } from '../common/TacticalSelect';
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
  catalogUnits,
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
      <div className="absolute bottom-4 left-4 bg-[#0d1017]/85 border border-white/10 px-3 py-1.5 rounded-md text-[10px] font-medium text-slate-400 uppercase tracking-wider pointer-events-none z-40">
        Right-Click <span className="text-cyan-300">Menu</span>
        <span className="text-slate-600 mx-1.5">/</span>
        Mode <span className="text-slate-200">{canvasMode}</span>
      </div>
    );
  }

  const activeUnit =
    catalogUnits.find((u) => u.id === selectedCatalogUnitId) || catalogUnits[0];

  const activeUnitPlayerCount = allUnits.filter(
    (u) => u.ownerId === 'player' && u.type === selectedCatalogUnitId && !u.isDestroyed
  ).length;
  const activeUnitEnemyCount = allUnits.filter(
    (u) => u.ownerId !== 'player' && u.type === selectedCatalogUnitId && !u.isDestroyed
  ).length;
  const activeUnitCount =
    spawnerFaction === 'player' ? activeUnitPlayerCount : activeUnitEnemyCount;

  const activePilotValue = playerUnits.some((u) => u.id === controlledUnitId)
    ? controlledUnitId
    : '';

  const blueprintOptions: TacticalSelectOption[] = catalogUnits.map((u) => ({
    value: u.id,
    label: u.name,
    sublabel: u.role,
    badge: `${u.weight}W`,
  }));

  const pilotOptions: TacticalSelectOption[] = playerUnits.map((u) => ({
    value: u.id,
    label: u.id,
    sublabel: formatUnitName(u.type),
    badge: u.squadId ? `Sq ${u.squadId}` : undefined,
  }));

  const expandHeight = activeTab === 'specs' || activeTab === 'fleet';

  return (
    <div
      className={`ui-interactive absolute top-4 left-4 w-[440px] max-w-[calc(100%-32px)] max-h-[calc(100%-32px)] ${
        expandHeight ? 'h-[calc(100%-32px)]' : ''
      } bg-[#0d1017]/92 border border-white/10 rounded-lg z-50 flex flex-col shadow-2xl backdrop-blur-md overflow-hidden font-mono select-none`}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 1. WORKSPACE HEADER */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-white/10 shrink-0">
        <div className="grid grid-cols-3 gap-1 flex-1">
          {WORKSPACES.map((ws) => {
            const isActive = activeTab === ws.id;
            return (
              <button
                key={ws.id}
                onClick={() => onSelectTab(ws.id)}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-[11px] font-medium border transition-colors ${
                  isActive
                    ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/35'
                    : 'bg-transparent text-slate-400 border-transparent hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <span className="text-[10px] text-slate-500">{ws.keyHint}</span>
                <span>{ws.label}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={onClose}
          className="text-[10px] font-medium text-slate-400 hover:text-slate-100 px-2 py-1.5 rounded-md border border-white/10 hover:border-white/20 transition-colors shrink-0"
          title="Close menu (Esc or Right-Click)"
        >
          ESC
        </button>
      </div>

      {/* 2. PERSISTENT CONTEXT BAR (Single Blueprint + Single Pilot) */}
      <div className="flex flex-col gap-2 px-3 py-2.5 border-b border-white/10 shrink-0">
        {/* Row A: Blueprint + Faction + Quick Stepper */}
        <div className="flex items-center gap-2">
          <span className="w-14 text-[10px] font-semibold uppercase tracking-wider text-slate-400 shrink-0">
            Blueprint
          </span>

          <TacticalSelect
            value={selectedCatalogUnitId}
            options={blueprintOptions}
            onChange={onSelectCatalogUnit}
            accent="amber"
            title="Select active unit blueprint"
          />

          <div className="flex items-center bg-[#080a0f] p-0.5 rounded-md border border-white/10 shrink-0">
            <button
              onClick={() => onChangeFaction('player')}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                spawnerFaction === 'player'
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Spawn as Player faction"
            >
              PLY
            </button>
            <button
              onClick={() => onChangeFaction('enemy')}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                spawnerFaction === 'enemy'
                  ? 'bg-rose-500/20 text-rose-300'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Spawn as Enemy faction"
            >
              ENM
            </button>
          </div>

          {activeUnit && (
            <div className="flex items-center gap-0.5 bg-[#080a0f] px-1 py-0.5 rounded-md border border-white/10 shrink-0">
              <button
                onClick={() => onUpdateUnitCount(activeUnit.id, -1)}
                className="w-5 h-5 hover:bg-white/10 text-slate-400 hover:text-rose-300 rounded flex items-center justify-center text-[11px] transition-colors"
                title="Despawn 1"
              >
                -
              </button>
              <span className="w-5 text-center text-[11px] font-medium text-slate-100">
                {activeUnitCount}
              </span>
              <button
                onClick={() => onUpdateUnitCount(activeUnit.id, 1)}
                className="w-5 h-5 hover:bg-white/10 text-slate-400 hover:text-amber-300 rounded flex items-center justify-center text-[11px] transition-colors"
                title="Spawn 1"
              >
                +
              </button>
            </div>
          )}
        </div>

        {/* Row B: Active Pilot Selector */}
        <div className="flex items-center gap-2">
          <span className="w-14 text-[10px] font-semibold uppercase tracking-wider text-slate-400 shrink-0">
            Piloting
          </span>

          <TacticalSelect
            value={activePilotValue}
            options={pilotOptions}
            onChange={(id) => id && onSelectControlledUnit(id)}
            placeholder="No player units spawned"
            emptyText="Spawn a player unit to pilot"
            disabled={playerUnits.length === 0}
            accent="cyan"
            title="Select spawned player unit to pilot"
          />

          <span className="text-[10px] text-slate-500 shrink-0">
            {playerUnits.length} live
          </span>
        </div>
      </div>

      {/* 3. WORKSPACE BODY */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {activeTab === 'battlefield' && (
          <div className="flex flex-col p-3 gap-3">
            {/* Active Blueprint Readout */}
            {activeUnit && (
              <div className="flex items-center justify-between px-2.5 py-2 rounded-md bg-[#080a0f] border border-white/10">
                <div className="min-w-0 pr-2">
                  <div className="text-[11px] font-medium text-slate-100 truncate">
                    {activeUnit.name}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {activeUnit.role} · Weight {activeUnit.weight}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[10px] shrink-0">
                  <span className="text-emerald-300/90">PLY {activeUnitPlayerCount}</span>
                  <span className="text-slate-600">/</span>
                  <span className="text-rose-300/90">ENM {activeUnitEnemyCount}</span>
                </div>
              </div>
            )}

            {/* Quick Scenario Presets */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Scenario Presets
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {SCENARIO_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => onApplyPreset(preset)}
                    title={preset.description}
                    className="bg-[#080a0f] hover:bg-white/5 border border-white/10 hover:border-cyan-500/35 text-slate-200 hover:text-cyan-300 py-1.5 px-2 rounded-md text-[11px] font-medium transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Reset Action */}
            <button
              onClick={onResetSandbox}
              className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/25 font-medium py-1.5 rounded-md text-[11px] tracking-wide transition-colors"
            >
              Reset Sandbox (Clear All Units)
            </button>
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

      {/* 4. PINNED UTILITY STRIP */}
      <div className="flex flex-col gap-2 px-3 py-2 border-t border-white/10 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 bg-[#080a0f] p-0.5 rounded-md border border-white/10">
            {TOOL_MODES.map((mode) => (
              <button
                key={mode.id}
                onClick={() => onChangeMode(mode.id)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                  canvasMode === mode.id
                    ? 'bg-cyan-500/20 text-cyan-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onToggleCameraLock}
              title="Toggle camera follow (Middle-click drag pans freely)"
              className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors border ${
                isCameraLocked
                  ? 'bg-[#080a0f] text-slate-200 border-white/10 hover:border-white/20'
                  : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
              }`}
            >
              {isCameraLocked ? 'Cam: Lock' : 'Cam: Free'}
            </button>
            <button
              onClick={onResetZoom}
              title="Reset zoom to 100%"
              className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#080a0f] text-slate-300 border border-white/10 hover:border-white/20 transition-colors"
            >
              {zoomPercent}%
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-14 text-[10px] font-semibold uppercase tracking-wider text-slate-400 shrink-0">
            Overlays
          </span>
          <div className="grid grid-cols-4 gap-1 flex-1">
            {DEBUG_TOGGLES.map((item) => (
              <button
                key={item.key}
                onClick={() => onToggleDebugFlag(item.key)}
                className={`py-0.5 rounded-md text-[10px] font-medium transition-colors border ${
                  debugFlags[item.key]
                    ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/35'
                    : 'bg-[#080a0f] text-slate-500 border-white/10 hover:text-slate-300'
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
