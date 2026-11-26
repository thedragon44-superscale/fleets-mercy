// src/components/viewport/ViewportTopBar.tsx
import React from 'react';

interface ViewportTopBarProps {
  icon?: string;
  title: string;
  subtitle?: string;
  fps: number;
  tickMs?: number;
  playerCount: number;
  enemyCount: number;
  projectileCount?: number;
  // Optional time controls (Sandbox)
  showTimeControls?: boolean;
  simulationSpeed?: number;
  isPaused?: boolean;
  onTimeControl?: (nextPaused: boolean, nextSpeed: number) => void;
  // Optional navigation actions
  onNavigateHome?: () => void;
  onNavigateGarage?: () => void;
  onLogout?: () => void;
  rightSlot?: React.ReactNode;
}

const TIME_SPEEDS = [0.25, 0.5, 1.0, 2.0] as const;

export const ViewportTopBar: React.FC<ViewportTopBarProps> = ({
  icon = '🧪',
  title,
  subtitle,
  fps,
  tickMs,
  playerCount,
  enemyCount,
  projectileCount,
  showTimeControls = false,
  simulationSpeed = 1.0,
  isPaused = false,
  onTimeControl,
  onNavigateHome,
  onNavigateGarage,
  onLogout,
  rightSlot,
}) => {
  return (
    <header
      className="ui-interactive bg-[#0f1115] border border-slate-800/80 rounded-xl px-3 py-2 flex items-center justify-between shadow-lg shrink-0 gap-3 z-50"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Left: Title & Sector */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black text-xs">
          {icon}
        </div>
        <div>
          <h1 className="text-xs font-black tracking-tight text-white uppercase leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[9px] font-bold text-slate-400 tracking-wider uppercase">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Center-Left: Optional Server Time Controls */}
      {showTimeControls && onTimeControl && (
        <div className="flex items-center gap-1.5 bg-[#161922] p-1 rounded-lg border border-slate-800 shrink-0">
          <span className="text-[9px] font-black text-slate-400 px-1 uppercase">Time:</span>
          {TIME_SPEEDS.map((speed) => (
            <button
              key={speed}
              onClick={() => onTimeControl(false, speed)}
              className={`px-2 py-0.5 rounded text-[10px] font-black uppercase transition-all ${
                !isPaused && simulationSpeed === speed
                  ? 'bg-cyan-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {speed}x
            </button>
          ))}
          <button
            onClick={() => onTimeControl(!isPaused, simulationSpeed)}
            className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase transition-all ${
              isPaused
                ? 'bg-red-500 text-white animate-pulse'
                : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            {isPaused ? 'PAUSED' : 'PAUSE'}
          </button>
        </div>
      )}

      {/* Center-Right: Live Measured Telemetry */}
      <div className="flex items-center gap-3 bg-[#161922] px-3 py-1 rounded-lg border border-slate-800 shrink-0">
        <span className="text-[9px] font-bold text-slate-400">
          FPS: <strong className="text-cyan-400">{fps}</strong>
        </span>
        {tickMs !== undefined && (
          <span className="text-[9px] font-bold text-slate-400">
            Tick: <strong className="text-amber-400">{tickMs.toFixed(1)}ms</strong>
          </span>
        )}
        <span className="text-[9px] font-bold text-slate-400">
          Units:{' '}
          <strong className="text-green-400">{playerCount}</strong>
          <span className="text-slate-600 mx-0.5">/</span>
          <strong className="text-red-400">{enemyCount}</strong>
        </span>
        {projectileCount !== undefined && (
          <span className="text-[9px] font-bold text-slate-400">
            Proj: <strong className="text-white">{projectileCount}</strong>
          </span>
        )}
      </div>

      {/* Right: Navigation & Custom Slot */}
      <div className="flex items-center gap-2 shrink-0">
        {rightSlot}
        {onNavigateHome && (
          <button
            onClick={onNavigateHome}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase transition-all"
          >
            Menu
          </button>
        )}
        {onNavigateGarage && (
          <button
            onClick={onNavigateGarage}
            className="bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 px-3 py-1 rounded-lg font-black text-[10px] uppercase transition-all"
          >
            Garage
          </button>
        )}
        {onLogout && (
          <button
            onClick={onLogout}
            className="bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase transition-all"
            title="Log Out"
          >
            ✕
          </button>
        )}
      </div>
    </header>
  );
};
