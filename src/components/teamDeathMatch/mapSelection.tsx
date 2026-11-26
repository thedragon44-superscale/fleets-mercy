// src/components/teamDeathMatch/mapSelection.tsx
import React, { useEffect, useState } from 'react';
import { fetchMaps } from '../../services/mapService';

interface MapPreset {
  id: number;
  name: string;
  description?: string;
  width?: number;
  height?: number;
}

interface TdmMapSelectionProps {
  pilotedUnit: string;
  customPool: string[];
  onLaunchMatch: (mapId: number) => void;
  onBack: () => void;
}

const formatUnitName = (id: string) =>
  id
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

export const TdmMapSelectionScreen: React.FC<TdmMapSelectionProps> = ({
  pilotedUnit,
  customPool,
  onLaunchMatch,
  onBack,
}) => {
  const [maps, setMaps] = useState<MapPreset[]>([]);
  const [selectedMapId, setSelectedMapId] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [fallbackWarning, setFallbackWarning] = useState<string | null>(null);

  useEffect(() => {
    fetchMaps()
      .then((data) => {
        if (data && data.length > 0) {
          setMaps(data);
          setSelectedMapId(data[0].id);
        } else {
          setFallbackWarning('No saved maps returned from server — using default Sector Prime.');
          setMaps([{ id: 1, name: 'Sector Prime (Default Skirmish)', width: 12000, height: 12000 }]);
        }
      })
      .catch((err) => {
        console.error('Failed to load map presets for TDM:', err);
        setFallbackWarning('Unable to reach map API — falling back to default Sector Prime.');
        setMaps([{ id: 1, name: 'Sector Prime (Default Skirmish)', width: 12000, height: 12000 }]);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 font-sans select-none overflow-hidden">
      {/* HEADER */}
      <div className="flex items-center justify-between px-8 py-4 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-semibold text-sm transition"
          >
            ← Back to Unit Select
          </button>
          <h1 className="text-xl font-black tracking-wider uppercase text-cyan-400">
            TDM Match Configuration // Select Battle Sector
          </h1>
        </div>
        <div className="text-xs font-mono text-slate-400">
          Piloted Hull: <span className="text-cyan-300">{formatUnitName(pilotedUnit)}</span> | Spawn Pool:{' '}
          <span className="text-amber-300">{customPool.length} Classes</span>
        </div>
      </div>

      {/* BODY */}
      <div className="flex flex-1 p-8 gap-8 overflow-hidden items-center justify-center">
        <div className="w-full max-w-4xl bg-slate-900/80 border border-slate-800 rounded-2xl p-8 shadow-2xl flex flex-col justify-between h-[80vh]">
          <div>
            <h2 className="text-2xl font-black mb-2 text-white">Choose Engagement Theater</h2>
            <p className="text-sm text-slate-400 mb-4">
              Select the orbital sector environment where the 20v20 skirmish will take place.
            </p>

            {fallbackWarning && (
              <div className="mb-4 px-3 py-2 rounded-lg bg-amber-950/60 border border-amber-500/40 text-amber-300 text-xs font-mono">
                ⚠ {fallbackWarning}
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-20 text-slate-500 font-mono">
                Loading available map grids from database...
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4 max-h-[420px] overflow-y-auto pr-2">
                {maps.map((m) => {
                  const isSelected = selectedMapId === m.id;
                  const dims =
                    m.width && m.height
                      ? `${Math.round(m.width)} × ${Math.round(m.height)}`
                      : '12000 × 12000';

                  return (
                    <div
                      key={m.id}
                      onClick={() => setSelectedMapId(m.id)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between h-40 ${
                        isSelected
                          ? 'bg-cyan-950/60 border-cyan-400 shadow-lg shadow-cyan-500/20'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between text-[11px] font-mono text-cyan-400 mb-1">
                          <span>MAP ID #{m.id}</span>
                          <span className="text-slate-500">{dims}</span>
                        </div>
                        <div className="text-base font-bold text-white truncate">{m.name}</div>
                      </div>
                      <div className="text-xs text-slate-400 line-clamp-2">
                        {m.description ||
                          'Standard tactical environment with asteroid clusters & environmental hazards.'}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* LAUNCH ACTION */}
          <div className="pt-6 border-t border-slate-800 flex items-center justify-between">
            <div className="text-xs font-mono text-slate-400">
              STATUS: <span className="text-emerald-400">READY TO INITIALIZE WEBSOCKET ROOM</span>
            </div>
            <button
              onClick={() => onLaunchMatch(selectedMapId)}
              className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-black tracking-wider uppercase rounded-xl shadow-lg shadow-emerald-900/40 transition transform active:scale-[0.99]"
            >
              Deploy 20v20 Skirmish Match →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
