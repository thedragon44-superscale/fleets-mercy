// src/components/teamDeathMatch/unitSelection.tsx
import React, { useState } from 'react';

// Standard TDM unit pool options matching backend definitions
const TDM_AVAILABLE_UNITS = [
  { id: 'viper_interceptor', name: 'Viper Interceptor', role: 'Light Interceptor', speed: 'High', dps: 'Medium', desc: 'Fast, highly maneuverable dogfighter specialized in hit-and-run strikes.' },
  { id: 'recon_probe', name: 'Recon Probe', role: 'Sensor Scout', speed: 'Maximum', dps: 'Low', desc: 'Provides critical telemetry and radar vision across distant sectors.' },
  { id: 'ion_interceptor', name: 'Ion Interceptor', role: 'Shield Disruptor', speed: 'High', dps: 'Medium', desc: 'Fires focused ion beams designed to strip enemy energy shields rapidly.' },
  { id: 'assault_gunship', name: 'Assault Gunship', role: 'Brawler', speed: 'Moderate', dps: 'High', desc: 'Armored front-line combatant packing heavy ballistic output.' },
  { id: 'lancer_corvette', name: 'Lancer Corvette', role: 'Capital Destroyer', speed: 'Low', dps: 'Maximum', desc: 'Slow, heavy hull capable of unleashing devastating sustained salvoes.' },
  { id: 'cryo_flak', name: 'Cryo Flak', role: 'Area Denial', speed: 'Moderate', dps: 'Medium', desc: 'Deploys freezing spatial ordinance to slow and disrupt enemy formations.' },
  { id: 'torpedo_bomber', name: 'Torpedo Bomber', role: 'Siege Strike', speed: 'Low', dps: 'High', desc: 'Heavy payload delivery vessel targeting structural armor and large units.' },
  { id: 'aegis_wall', name: 'Aegis Wall', role: 'Mobile Bastion', speed: 'Very Low', dps: 'Low', desc: 'Massive defensive anchor projecting forward shielding for squadmates.' },
];

interface TdmUnitSelectionScreenProps {
  onProceedToMapSelect: (pilotedUnit: string, customPool: string[]) => void;
  onBack: () => void;
}

export const TdmUnitSelectionScreen: React.FC<TdmUnitSelectionScreenProps> = ({ onProceedToMapSelect, onBack }) => {
  const [selectedUnitId, setSelectedUnitId] = useState<string>('viper_interceptor');
  
  // Track spawn pool checkbox states (all enabled by default)
  const [spawnPool, setSpawnPool] = useState<Record<string, boolean>>(
    TDM_AVAILABLE_UNITS.reduce((acc, unit) => {
      acc[unit.id] = true;
      return acc;
    }, {} as Record<string, boolean>)
  );

  const selectedUnit = TDM_AVAILABLE_UNITS.find(u => u.id === selectedUnitId) || TDM_AVAILABLE_UNITS[0];

  const handleToggleSpawnPool = (id: string) => {
    setSpawnPool(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleSelectAll = (select: boolean) => {
    setSpawnPool(
      TDM_AVAILABLE_UNITS.reduce((acc, unit) => {
        acc[unit.id] = select;
        return acc;
      }, {} as Record<string, boolean>)
    );
  };

  const handleDeploy = () => {
    // Gather all units checked in the spawn pool
    const activePool = Object.entries(spawnPool)
      .filter(([_, isChecked]) => isChecked)
      .map(([id]) => id);

    if (activePool.length === 0) {
      alert("⚠️ Error: Your procedural spawn pool cannot be empty! Enable at least one unit class.");
      return;
    }

    onProceedToMapSelect(selectedUnitId, activePool);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 font-sans select-none overflow-hidden">
      
      {/* HEADER BAR */}
      <div className="flex items-center justify-between px-8 py-4 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center space-x-4">
          <button 
            onClick={onBack}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-semibold text-sm transition"
          >
            ← Back to Menu
          </button>
          <h1 className="text-xl font-black tracking-wider uppercase text-cyan-400">
            TDM Match Configuration // Select Piloted Hull & Spawn Pool
          </h1>
        </div>
        <div className="text-xs text-slate-400">
          Mode: <span className="text-amber-400 font-bold">20v20 Team Deathmatch</span>
        </div>
      </div>

      {/* TOP HALF: HERO DISPLAY & SPECS + SPAWN POOL CHECKBOXES */}
      <div className="flex flex-1 p-6 gap-6 bg-slate-950 overflow-hidden">
        
        {/* Left: Blown-Up Hero Showcase */}
        <div className="w-1/2 bg-slate-900/80 border border-slate-800 rounded-xl p-6 flex flex-col justify-between relative shadow-2xl">
          <div className="absolute top-4 right-4 px-3 py-1 bg-cyan-950 border border-cyan-800/60 rounded text-xs text-cyan-300 font-mono">
            ROLE: {selectedUnit.role.toUpperCase()}
          </div>

          <div>
            <h2 className="text-3xl font-black tracking-wide text-white mb-2">{selectedUnit.name}</h2>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">{selectedUnit.desc}</p>

            {/* Garage-style Spec Breakdown */}
            <div className="space-y-3 bg-slate-950/60 p-4 rounded-lg border border-slate-800/80">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Vitals & Dynamics</h3>
              <div className="flex justify-between text-sm border-b border-slate-800/60 pb-2">
                <span className="text-slate-400">Engine Velocity Profile:</span>
                <span className="font-mono text-cyan-300">{selectedUnit.speed}</span>
              </div>
              <div className="flex justify-between text-sm border-b border-slate-800/60 pb-2">
                <span className="text-slate-400">Ballistic Output (DPS):</span>
                <span className="font-mono text-amber-300">{selectedUnit.dps}</span>
              </div>
              <div className="flex justify-between text-sm pb-1">
                <span className="text-slate-400">AI Behavior FSM:</span>
                <span className="font-mono text-emerald-300">Autonomous Squadron Link</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-mono">STATUS: READY FOR DEPLOYMENT</span>
            <div className="text-xs text-cyan-400 font-mono animate-pulse">● LOCKED AS PILOTED HULL</div>
          </div>
        </div>

        {/* Right: Spawn Pool Configuration Panel (Checkboxes) */}
        <div className="w-1/2 bg-slate-900/80 border border-slate-800 rounded-xl p-6 flex flex-col justify-between shadow-2xl">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-300">
                Procedural Spawn Pool Config
              </h3>
              <div className="space-x-2">
                <button 
                  onClick={() => handleSelectAll(true)}
                  className="text-xs px-2 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded transition"
                >
                  Select All
                </button>
                <button 
                  onClick={() => handleSelectAll(false)}
                  className="text-xs px-2 py-1 bg-slate-800 hover:bg-slate-700 text-rose-300 rounded transition"
                >
                  Clear All
                </button>
              </div>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Checked units will be randomly spawned across the 40-unit TDM battlefield rosters.
            </p>

            {/* Checkbox Grid */}
            <div className="grid grid-cols-2 gap-3 max-h-[280px] overflow-y-auto pr-2">
              {TDM_AVAILABLE_UNITS.map(unit => (
                <label 
                  key={unit.id}
                  className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition ${
                    spawnPool[unit.id] 
                      ? 'bg-cyan-950/30 border-cyan-700/60 text-white' 
                      : 'bg-slate-950/40 border-slate-800 text-slate-500'
                  }`}
                >
                  <input 
                    type="checkbox"
                    checked={!!spawnPool[unit.id]}
                    onChange={() => handleToggleSpawnPool(unit.id)}
                    className="w-4 h-4 rounded border-slate-700 text-cyan-500 focus:ring-cyan-500 bg-slate-900"
                  />
                  <span className="text-sm font-medium">{unit.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Proceed Button */}
          <button 
            onClick={handleDeploy}
            className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black tracking-wider uppercase rounded-xl shadow-lg shadow-cyan-900/40 transition transform active:scale-[0.99]"
          >
            Confirm Loadout & Select Map →
          </button>
        </div>

      </div>

      {/* BOTTOM HALF: FIGHTER-BOX STYLE GRID (Character Select) */}
      <div className="h-44 bg-slate-900 border-t border-slate-800 px-6 py-4 flex flex-col justify-center">
        <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
          Select Your Piloted Hull (Fighter Grid)
        </div>
        
        <div className="flex space-x-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-700">
          {TDM_AVAILABLE_UNITS.map(unit => {
            const isSelected = selectedUnitId === unit.id;
            return (
              <div 
                key={unit.id}
                onClick={() => setSelectedUnitId(unit.id)}
                className={`flex-shrink-0 w-36 h-28 rounded-lg border-2 cursor-pointer flex flex-col items-center justify-between p-3 transition transform hover:-translate-y-1 ${
                  isSelected 
                    ? 'bg-cyan-950/80 border-cyan-400 shadow-lg shadow-cyan-500/20 scale-105' 
                    : 'bg-slate-950/80 border-slate-800 hover:border-slate-600'
                }`}
              >
                <div className="text-2xl">🚀</div>
                <div className="text-center">
                  <div className={`text-xs font-bold truncate w-28 ${isSelected ? 'text-cyan-300' : 'text-slate-300'}`}>
                    {unit.name}
                  </div>
                  <div className="text-[10px] text-slate-500 uppercase">{unit.role}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
