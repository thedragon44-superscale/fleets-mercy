// src/components/DeveloperSettingsDashboard.tsx
import React from 'react';
import { useSettingsStore } from '../config/settingsStore';

interface DeveloperSettingsProps {
  onNavigateHome: () => void;
}

export const DeveloperSettingsDashboard: React.FC<DeveloperSettingsProps> = ({ onNavigateHome }) => {
  const {
    renderDelay,
    debugCollisions,
    debugRadarRanges,
    particleDensityMultiplier,
    aiUpdateIntervalTicks,
    netSimulatedLatency,
    setSetting,
    resetToDefaults,
  } = useSettingsStore();

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-[#0b0e14] text-slate-100 flex flex-col p-3 gap-3 font-mono select-none">
      
      {/* Header */}
      <header className="bg-[#0f1115] border border-slate-800/80 rounded-xl px-4 py-2.5 flex items-center justify-between shadow-lg shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black text-sm">
            ⚙️
          </div>
          <div>
            <h1 className="text-xs font-black tracking-tight text-white uppercase leading-tight">Developer Settings & Tuning</h1>
            <p className="text-[9px] font-bold text-amber-400 tracking-wider uppercase">Runtime Engine & Simulation Configuration</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={resetToDefaults}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase transition-all"
          >
            Reset Defaults
          </button>
          <button
            onClick={onNavigateHome}
            className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black px-4 py-1.5 rounded-lg text-[10px] uppercase tracking-wider transition-all shadow-md"
          >
            ← Back to Menu
          </button>
        </div>
      </header>

      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 min-h-0 overflow-y-auto pr-1">
        
        {/* Card 1: Network & Interpolation */}
        <div className="bg-[#0f1115] border border-slate-800/80 rounded-xl p-4 flex flex-col gap-4 shadow-xl">
          <div className="border-b border-slate-800 pb-2">
            <h2 className="text-[11px] font-black uppercase tracking-wider text-cyan-400">Network & Client Interpolation</h2>
            <p className="text-[9px] text-slate-400">Tune buffer latencies and connection parameters.</p>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[10px] font-bold">
                <span className="text-slate-300">Interpolation Render Delay</span>
                <span className="text-cyan-400">{renderDelay} ms</span>
              </div>
              <input
                type="range"
                min="0"
                max="150"
                step="5"
                value={renderDelay}
                onChange={(e) => setSetting('renderDelay', Number(e.target.value))}
                className="accent-cyan-400 bg-slate-900 cursor-pointer"
              />
              <span className="text-[8px] text-slate-500">Buffers client rendering behind server time to smooth jitter.</span>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[10px] font-bold">
                <span className="text-slate-300">Simulated Network Latency</span>
                <span className="text-cyan-400">{netSimulatedLatency} ms</span>
              </div>
              <input
                type="range"
                min="0"
                max="500"
                step="25"
                value={netSimulatedLatency}
                onChange={(e) => setSetting('netSimulatedLatency', Number(e.target.value))}
                className="accent-cyan-400 bg-slate-900 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Card 2: Debug & Visualizers */}
        <div className="bg-[#0f1115] border border-slate-800/80 rounded-xl p-4 flex flex-col gap-4 shadow-xl">
          <div className="border-b border-slate-800 pb-2">
            <h2 className="text-[11px] font-black uppercase tracking-wider text-amber-400">Debug Overlays & Viewports</h2>
            <p className="text-[9px] text-slate-400">Toggle collision bounds and sensor telemetry.</p>
          </div>

          <div className="flex flex-col gap-3">
            <label className="flex items-center justify-between bg-[#161922] p-2.5 rounded-lg border border-slate-800 cursor-pointer hover:border-slate-700 transition-all">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-white">Collision Wireframes</span>
                <span className="text-[8px] text-slate-400">Render bounding boxes for ships and hazards.</span>
              </div>
              <input
                type="checkbox"
                checked={debugCollisions}
                onChange={(e) => setSetting('debugCollisions', e.target.checked)}
                className="w-4 h-4 accent-amber-400 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between bg-[#161922] p-2.5 rounded-lg border border-slate-800 cursor-pointer hover:border-slate-700 transition-all">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-white">Radar & Aggro Ranges</span>
                <span className="text-[8px] text-slate-400">Display vision and engagement circles around units.</span>
              </div>
              <input
                type="checkbox"
                checked={debugRadarRanges}
                onChange={(e) => setSetting('debugRadarRanges', e.target.checked)}
                className="w-4 h-4 accent-amber-400 cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Card 3: Performance & Simulation */}
        <div className="bg-[#0f1115] border border-slate-800/80 rounded-xl p-4 flex flex-col gap-4 shadow-xl">
          <div className="border-b border-slate-800 pb-2">
            <h2 className="text-[11px] font-black uppercase tracking-wider text-purple-400">Simulation & Particles</h2>
            <p className="text-[9px] text-slate-400">Manage particle emitters and AI tick scaling.</p>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[10px] font-bold">
                <span className="text-slate-300">Particle Density Multiplier</span>
                <span className="text-purple-400">{particleDensityMultiplier}x</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="2.0"
                step="0.1"
                value={particleDensityMultiplier}
                onChange={(e) => setSetting('particleDensityMultiplier', Number(e.target.value))}
                className="accent-purple-400 bg-slate-900 cursor-pointer"
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[10px] font-bold">
                <span className="text-slate-300">AI Tick Interval Skip</span>
                <span className="text-purple-400">{aiUpdateIntervalTicks} tick(s)</span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                value={aiUpdateIntervalTicks}
                onChange={(e) => setSetting('aiUpdateIntervalTicks', Number(e.target.value))}
                className="accent-purple-400 bg-slate-900 cursor-pointer"
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
