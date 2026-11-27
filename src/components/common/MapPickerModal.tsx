// src/components/common/MapPickerModal.tsx
import React, { useEffect, useState } from 'react';
import { MapDefinition, fetchMaps } from '../../services/mapService';

export interface MapPickerModalProps {
  mode: 'sandbox' | 'tdm';
  subtitle?: string;
  backLabel?: string;
  onBack: () => void;
  onLaunch: (mapId: number) => void;
  onOpenMapBuilder: () => void;
}

export const MapPickerModal: React.FC<MapPickerModalProps> = ({
  mode,
  subtitle,
  backLabel,
  onBack,
  onLaunch,
  onOpenMapBuilder,
}) => {
  const [maps, setMaps] = useState<MapDefinition[]>([]);
  const [selectedMapId, setSelectedMapId] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const isTdm = mode === 'tdm';

  const loadMaps = () => {
    setLoading(true);
    fetchMaps()
      .then((data) => {
        setMaps(data);
        if (data.length > 0) {
          setSelectedMapId((prev) => (prev && data.some((m) => m.id === prev) ? prev : data[0].id));
        } else {
          setSelectedMapId(null);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadMaps();
  }, []);

  return (
    <div className="fixed inset-0 w-screen h-screen bg-[#070b14] text-slate-100 font-mono flex flex-col overflow-hidden select-none">
      {/* Header */}
      <header className="shrink-0 flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold uppercase cursor-pointer transition"
          >
            &larr; {backLabel || (isTdm ? 'Back to Unit Select' : 'Command Menu')}
          </button>
          <div>
            <h1
              className={`text-base font-black uppercase tracking-wider ${
                isTdm ? 'text-cyan-400' : 'text-amber-400'
              }`}
            >
              {isTdm
                ? '20v20 Team Deathmatch // Select Battle Sector'
                : 'Unit Testing Sandbox // Select Sector Map'}
            </h1>
            {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadMaps}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold uppercase cursor-pointer"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={onOpenMapBuilder}
            className="px-3.5 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/30 border border-sky-400/40 text-sky-300 text-xs font-black uppercase cursor-pointer transition"
          >
            + Open Map Builder
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-hidden">
        <div
          className={`w-full max-w-4xl bg-slate-900/85 border rounded-2xl p-6 shadow-2xl flex flex-col justify-between max-h-[82vh] ${
            isTdm ? 'border-cyan-500/40' : 'border-amber-500/40'
          }`}
        >
          <div className="min-h-0 flex flex-col">
            <h2 className="text-lg font-black uppercase tracking-wide text-white mb-1">
              Choose Operational Sector
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Select a saved Universal Map Builder sector from PostgreSQL to hydrate the live 60Hz environment.
            </p>

            {loading ? (
              <div className="py-16 text-center text-xs text-slate-500">
                Loading saved maps from PostgreSQL...
              </div>
            ) : maps.length === 0 ? (
              <div className="py-12 px-6 rounded-xl bg-slate-950/80 border border-dashed border-slate-700 text-center flex flex-col items-center gap-3">
                <div className="text-sm font-black uppercase text-amber-300">
                  No Saved Maps Available
                </div>
                <p className="text-xs text-slate-400 max-w-md leading-relaxed">
                  Maps are 100% data-driven — create and save at least one map in the{' '}
                  <span className="text-sky-300 font-bold">Universal Map Builder</span> before
                  launching {isTdm ? '20v20 Team Deathmatch' : 'Unit Testing Sandbox'}.
                </p>
                <button
                  type="button"
                  onClick={onOpenMapBuilder}
                  className="mt-2 px-5 py-2.5 rounded-lg bg-sky-400 hover:bg-sky-300 text-slate-950 font-black text-xs uppercase tracking-wider cursor-pointer transition shadow-lg"
                >
                  Open Universal Map Builder &rarr;
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 overflow-y-auto pr-1 pb-2 max-h-[46vh]">
                {maps.map((m) => {
                  const isSelected = selectedMapId === m.id;
                  const dims = `${Math.round(m.width)} × ${Math.round(m.height)}`;
                  const objCount = m.placementCount ?? 0;

                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedMapId(m.id)}
                      className={`text-left p-4 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between min-h-[136px] ${
                        isSelected
                          ? isTdm
                            ? 'bg-cyan-950/60 border-cyan-400 shadow-lg shadow-cyan-500/20'
                            : 'bg-amber-950/40 border-amber-400 shadow-lg shadow-amber-500/20'
                          : 'bg-slate-950/75 border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between text-[10px] mb-1.5">
                          <span className={isTdm ? 'text-cyan-400 font-bold' : 'text-amber-400 font-bold'}>
                            MAP #{m.id}
                          </span>
                          <span className="text-slate-400">{dims}</span>
                        </div>
                        <div className="text-sm font-black text-white truncate">{m.name}</div>
                        <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                          {m.description || 'Universal blueprint sector'}
                        </p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                        <span>{objCount} placed object{objCount === 1 ? '' : 's'}</span>
                        {isSelected && (
                          <span className={isTdm ? 'text-cyan-300 font-black' : 'text-amber-300 font-black'}>
                            SELECTED
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Action */}
          <div className="pt-4 mt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="text-[11px] text-slate-400">
              STATUS:{' '}
              {selectedMapId !== null ? (
                <span className="text-emerald-400 font-bold">
                  READY TO LAUNCH MAP #{selectedMapId}
                </span>
              ) : (
                <span className="text-amber-400 font-bold">CREATE A MAP TO CONTINUE</span>
              )}
            </div>

            <button
              type="button"
              disabled={selectedMapId === null}
              onClick={() => {
                if (selectedMapId !== null) onLaunch(selectedMapId);
              }}
              className={`px-7 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition shadow-lg cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed ${
                isTdm
                  ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950'
                  : 'bg-amber-400 hover:bg-amber-300 text-slate-950'
              }`}
            >
              {isTdm ? 'Deploy 20v20 Skirmish Match →' : 'Launch Unit Testing Sandbox →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
