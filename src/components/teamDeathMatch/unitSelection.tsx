// src/components/teamDeathMatch/unitSelection.tsx
import React, { useState, useMemo } from 'react';
import { useUnitTemplates } from '../../hooks/useUnitTemplates';
import viperImg from '../../assets/viper.png';
import reconImg from '../../assets/recon.png';
import ionImg from '../../assets/ion.png';
import assaultImg from '../../assets/assault.png';
import lancerImg from '../../assets/lancer.png';
import cryoImg from '../../assets/cryo.png';
import torpedoImg from '../../assets/torpedo.png';
import wallImg from '../../assets/wall.png';

const TDM_AVAILABLE_UNITS = [
  { id: 'viper_interceptor', name: 'Viper Interceptor', role: 'Light Interceptor', sprite: viperImg, desc: 'Fast, highly maneuverable dogfighter specialized in hit-and-run strikes.' },
  { id: 'recon_probe', name: 'Recon Probe', role: 'Sensor Scout', sprite: reconImg, desc: 'Provides critical telemetry and radar vision across distant sectors.' },
  { id: 'ion_interceptor', name: 'Ion Interceptor', role: 'Shield Disruptor', sprite: ionImg, desc: 'Fires focused ion beams designed to strip enemy energy shields rapidly.' },
  { id: 'assault_gunship', name: 'Assault Gunship', role: 'Brawler', sprite: assaultImg, desc: 'Armored front-line combatant packing heavy ballistic output.' },
  { id: 'lancer_corvette', name: 'Lancer Corvette', role: 'Capital Destroyer', sprite: lancerImg, desc: 'Slow, heavy hull capable of unleashing devastating sustained salvoes.' },
  { id: 'cryo_flak', name: 'Cryo Flak', role: 'Area Denial', sprite: cryoImg, desc: 'Deploys freezing spatial ordinance to slow and disrupt enemy formations.' },
  { id: 'torpedo_bomber', name: 'Torpedo Bomber', role: 'Siege Strike', sprite: torpedoImg, desc: 'Heavy payload delivery vessel targeting structural armor and large units.' },
  { id: 'aegis_wall', name: 'Aegis Wall', role: 'Mobile Bastion', sprite: wallImg, desc: 'Massive defensive anchor projecting forward shielding for squadmates.' },
];

interface TdmUnitSelectionScreenProps {
  onProceedToMapSelect: (pilotedUnit: string, customPool: string[]) => void;
  onBack: () => void;
}

export const TdmUnitSelectionScreen: React.FC<TdmUnitSelectionScreenProps> = ({
  onProceedToMapSelect,
  onBack,
}) => {
  const { templates } = useUnitTemplates();
  const [selectedUnitId, setSelectedUnitId] = useState<string>('viper_interceptor');

  const [spawnPool, setSpawnPool] = useState<Record<string, boolean>>(
    TDM_AVAILABLE_UNITS.reduce((acc, unit) => {
      acc[unit.id] = true;
      return acc;
    }, {} as Record<string, boolean>)
  );

  const selectedUnit =
    TDM_AVAILABLE_UNITS.find((u) => u.id === selectedUnitId) || TDM_AVAILABLE_UNITS[0];
  const liveStats = templates[selectedUnit.id];

  const activePool = useMemo(
    () =>
      Object.entries(spawnPool)
        .filter(([_, isChecked]) => isChecked)
        .map(([id]) => id),
    [spawnPool]
  );

  const isPoolEmpty = activePool.length === 0;

  const handleToggleSpawnPool = (id: string) => {
    setSpawnPool((prev) => ({
      ...prev,
      [id]: !prev[id],
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
    if (isPoolEmpty) return;
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
        <div className="w-1/2 bg-slate-900/80 border border-slate-800 rounded-xl p-6 flex flex-col justify-between relative shadow-2xl overflow-y-auto">
          <div className="absolute top-4 right-4 px-3 py-1 bg-cyan-950 border border-cyan-800/60 rounded text-xs text-cyan-300 font-mono">
            ROLE: {selectedUnit.role.toUpperCase()}
          </div>

          <div>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-20 h-20 rounded-xl bg-slate-950/90 border border-cyan-500/30 flex items-center justify-center p-2 shrink-0 shadow-inner">
                <img
                  src={selectedUnit.sprite}
                  alt={selectedUnit.name}
                  className="w-full h-full object-contain drop-shadow-[0_0_8px_rgba(34,211,238,0.35)]"
                />
              </div>
              <div className="pr-24">
                <h2 className="text-3xl font-black tracking-wide text-white mb-1">
                  {selectedUnit.name}
                </h2>
                <p className="text-slate-400 text-sm leading-relaxed">{selectedUnit.desc}</p>
              </div>
            </div>

            {/* Live PostgreSQL Spec Breakdown */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 bg-slate-950/60 p-4 rounded-lg border border-slate-800/80">
              <h3 className="col-span-2 text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">
                Live Blueprint Telemetry (PostgreSQL)
              </h3>
              <div className="flex justify-between text-sm border-b border-slate-800/60 pb-1.5">
                <span className="text-slate-400">Speed:</span>
                <span className="font-mono text-cyan-300">
                  {liveStats?.speed != null ? liveStats.speed.toFixed(1) : '—'}
                </span>
              </div>
              <div className="flex justify-between text-sm border-b border-slate-800/60 pb-1.5">
                <span className="text-slate-400">DPS:</span>
                <span className="font-mono text-amber-300">
                  {liveStats?.dps != null ? Math.round(liveStats.dps) : '—'}
                </span>
              </div>
              <div className="flex justify-between text-sm border-b border-slate-800/60 pb-1.5">
                <span className="text-slate-400">Shields (Base):</span>
                <span className="font-mono text-sky-300">
                  {liveStats?.shieldBase != null ? Math.round(liveStats.shieldBase) : '—'} HP
                </span>
              </div>
              <div className="flex justify-between text-sm border-b border-slate-800/60 pb-1.5">
                <span className="text-slate-400">Hull (Base):</span>
                <span className="font-mono text-emerald-300">
                  {liveStats?.hullBase != null ? Math.round(liveStats.hullBase) : '—'} HP
                </span>
              </div>
              <div className="flex justify-between text-sm pb-1">
                <span className="text-slate-400">Sensor Range:</span>
                <span className="font-mono text-purple-300">
                  {liveStats?.sensorRange != null ? `${Math.round(liveStats.sensorRange)}m` : '—'}
                </span>
              </div>
              <div className="flex justify-between text-sm pb-1">
                <span className="text-slate-400">Weight Class:</span>
                <span className="font-mono text-slate-200">
                  {liveStats?.weightClass != null ? `Tier ${liveStats.weightClass}` : '—'}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-mono">STATUS: READY FOR DEPLOYMENT</span>
            <div className="text-xs text-cyan-400 font-mono animate-pulse">
              ● LOCKED AS PILOTED HULL
            </div>
          </div>
        </div>

        {/* Right: Spawn Pool Configuration Panel */}
        <div className="w-1/2 bg-slate-900/80 border border-slate-800 rounded-xl p-6 flex flex-col justify-between shadow-2xl">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-300">
                Procedural Spawn Pool Config ({activePool.length}/{TDM_AVAILABLE_UNITS.length})
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

            <div className="grid grid-cols-2 gap-3 max-h-[280px] overflow-y-auto pr-2">
              {TDM_AVAILABLE_UNITS.map((unit) => (
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
                    className="w-4 h-4 rounded border-slate-700 text-cyan-500 focus:ring-cyan-500 bg-slate-900 accent-cyan-400"
                  />
                  <img
                    src={unit.sprite}
                    alt=""
                    className="w-5 h-5 object-contain opacity-90 shrink-0"
                  />
                  <span className="text-sm font-medium truncate">{unit.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {isPoolEmpty && (
              <div className="px-3 py-2 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs font-mono text-center">
                ⚠ Enable at least one unit class in the spawn pool to proceed.
              </div>
            )}

            <button
              onClick={handleDeploy}
              disabled={isPoolEmpty}
              className={`w-full py-4 font-black tracking-wider uppercase rounded-xl transition ${
                isPoolEmpty
                  ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                  : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-900/40 transform active:scale-[0.99]'
              }`}
            >
              Confirm Loadout & Select Map →
            </button>
          </div>
        </div>
      </div>

      {/* BOTTOM HALF: FIGHTER-BOX STYLE GRID */}
      <div className="h-44 bg-slate-900 border-t border-slate-800 px-6 py-4 flex flex-col justify-center">
        <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
          Select Your Piloted Hull (Fighter Grid)
        </div>

        <div className="flex space-x-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-700">
          {TDM_AVAILABLE_UNITS.map((unit) => {
            const isSelected = selectedUnitId === unit.id;
            return (
              <div
                key={unit.id}
                onClick={() => setSelectedUnitId(unit.id)}
                className={`flex-shrink-0 w-36 h-28 rounded-lg border-2 cursor-pointer flex flex-col items-center justify-between p-2.5 transition transform hover:-translate-y-1 ${
                  isSelected
                    ? 'bg-cyan-950/80 border-cyan-400 shadow-lg shadow-cyan-500/20 scale-105'
                    : 'bg-slate-950/80 border-slate-800 hover:border-slate-600'
                }`}
              >
                <img
                  src={unit.sprite}
                  alt={unit.name}
                  className="w-11 h-11 object-contain"
                />
                <div className="text-center">
                  <div
                    className={`text-xs font-bold truncate w-28 ${
                      isSelected ? 'text-cyan-300' : 'text-slate-300'
                    }`}
                  >
                    {unit.name}
                  </div>
                  <div className="text-[10px] text-slate-500 uppercase truncate w-28">
                    {unit.role}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
