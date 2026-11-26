// src/components/viewport/CanvasToolBar.tsx
import React from 'react';
import { DebugOverlayFlags } from '../../renderer/vectorAssets';

export type CanvasToolMode = 'pilot' | 'spawn' | 'select';

interface CanvasToolBarProps {
  canvasMode: CanvasToolMode;
  onChangeMode: (mode: CanvasToolMode) => void;
  debugFlags: DebugOverlayFlags;
  onToggleDebugFlag: (flag: keyof DebugOverlayFlags) => void;
  isCameraLocked: boolean;
  onToggleCameraLock: () => void;
  zoomPercent: number;
  onResetZoom: () => void;
  // Optional studio drawer toggle buttons
  activeStudioTab?: 'inspector' | 'pilots' | 'docking' | null;
  onSelectStudioTab?: (tab: 'inspector' | 'pilots' | 'docking') => void;
}

const TOOL_MODES: ReadonlyArray<{ id: CanvasToolMode; label: string }> = [
  { id: 'pilot', label: 'Pilot' },
  { id: 'spawn', label: 'Click-Spawn' },
  { id: 'select', label: 'Pick/Inspect' },
];

const DEBUG_TOGGLES: ReadonlyArray<{ key: keyof DebugOverlayFlags; label: string }> = [
  { key: 'showRanges', label: 'Ranges' },
  { key: 'showVitals', label: 'Vitals/AI' },
  { key: 'showVelocity', label: 'Vel' },
  { key: 'showHitboxes', label: 'Box' },
];

export const CanvasToolBar: React.FC<CanvasToolBarProps> = ({
  canvasMode,
  onChangeMode,
  debugFlags,
  onToggleDebugFlag,
  isCameraLocked,
  onToggleCameraLock,
  zoomPercent,
  onResetZoom,
  activeStudioTab,
  onSelectStudioTab,
}) => {
  return (
    <div
      className="ui-interactive absolute top-3 left-1/2 -translate-x-1/2 flex flex-wrap items-center gap-1.5 bg-[#0f1115]/92 border border-slate-800 rounded-xl px-2.5 py-1.5 z-40 backdrop-blur-md shadow-xl"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Interaction Mode */}
      <div className="flex items-center gap-1 pr-2 border-r border-slate-800">
        {TOOL_MODES.map((mode) => (
          <button
            key={mode.id}
            onClick={() => onChangeMode(mode.id)}
            className={`px-2 py-0.5 rounded text-[9px] font-black uppercase transition-all ${
              canvasMode === mode.id
                ? 'bg-amber-400 text-slate-950'
                : 'bg-slate-800/80 text-slate-300 hover:text-white'
            }`}
          >
            {mode.label}
          </button>
        ))}
      </div>

      {/* Debug Overlays */}
      <div className="flex items-center gap-1 pr-2 border-r border-slate-800">
        {DEBUG_TOGGLES.map((item) => (
          <button
            key={item.key}
            onClick={() => onToggleDebugFlag(item.key)}
            className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase transition-all border ${
              debugFlags[item.key]
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Camera Lock & Zoom */}
      <div className={`flex items-center gap-1 ${onSelectStudioTab ? 'pr-2 border-r border-slate-800' : ''}`}>
        <button
          onClick={onToggleCameraLock}
          title="Toggle camera follow (Middle-click drag pans freely)"
          className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase transition-all border ${
            isCameraLocked
              ? 'bg-green-500/20 text-green-300 border-green-500/40'
              : 'bg-slate-900 text-amber-300 border-amber-500/40'
          }`}
        >
          {isCameraLocked ? 'Cam: Lock' : 'Cam: Free'}
        </button>
        <button
          onClick={onResetZoom}
          title="Reset zoom to 100% (Mouse wheel zooms)"
          className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-900 text-slate-300 border border-slate-800 hover:text-white"
        >
          {zoomPercent}%
        </button>
      </div>

      {/* Right-Docked Studio Drawer Triggers */}
      {onSelectStudioTab && (
        <div className="flex items-center gap-1">
          {(
            [
              { id: 'inspector', label: 'Specs ⚙️' },
              { id: 'pilots', label: 'Pilots 🚀' },
              { id: 'docking', label: 'Docking ⚓' },
            ] as const
          ).map((tab) => {
            const isOpen = activeStudioTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectStudioTab(tab.id)}
                className={`px-2 py-0.5 rounded text-[9px] font-black uppercase transition-all border ${
                  isOpen
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                    : 'bg-slate-800/90 text-slate-300 border-slate-700 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
