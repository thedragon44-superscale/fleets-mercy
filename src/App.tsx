// src/App.tsx
import React, { useState, useEffect } from 'react';
import { LoginScreen } from './components/LoginScreen';
import { GarageDashboard, LoadoutData } from './components/GarageDashboard';
import { GameViewport } from './components/GameViewport';
import { PracticeViewport } from './components/PracticeViewport';
import { MapEditorViewport } from './components/MapEditorViewport';
import { DeveloperSettingsDashboard } from './components/DeveloperSettingsDashboard';
import { TdmUnitSelectionScreen } from './components/teamDeathMatch/unitSelection';
import { TdmMapSelectionScreen } from './components/teamDeathMatch/mapSelection';
import { TdmViewport } from './components/teamDeathMatch/tdmViewport';
import { fetchMaps, MapDefinition } from './services/mapService';

export type AppView = 
  | 'login' 
  | 'main-menu' 
  | 'garage' 
  | 'map-select' 
  | 'standard-game' 
  | 'sandbox-mode' 
  | 'map-editor-select' 
  | 'map-editor' 
  | 'developer-settings'
  | 'tdm-unit-select'
  | 'tdm-map-select'
  | 'tdm-viewport';

export default function App() {
  const [player, setPlayer] = useState<{ id: number; username: string } | null>(null);
  const [view, setView] = useState<AppView>('login');
  const [activeLoadout, setActiveLoadout] = useState<LoadoutData | null>(null);
  const [selectedMapId, setSelectedMapId] = useState<number>(1);
  const [editorTargetMapId, setEditorTargetMapId] = useState<number | null>(null);
  const [maps, setMaps] = useState<MapDefinition[]>([]);
  const [isSandboxLaunch, setIsSandboxLaunch] = useState<boolean>(false);

  // TDM State Management
  const [tdmPilotedUnit, setTdmPilotedUnit] = useState<string>('viper_interceptor');
  const [tdmCustomPool, setTdmCustomPool] = useState<string[]>([]);

  useEffect(() => {
    const savedUser = localStorage.getItem('spacetactics_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setPlayer(parsed);
        setView('main-menu');
      } catch (e) {
        localStorage.removeItem('spacetactics_user');
      }
    }

    fetchMaps().then(data => {
      if (data && data.length > 0) {
        setMaps(data);
      }
    });
  }, []);

  const handleLoginSuccess = (user: { id: number; username: string }) => {
    setPlayer(user);
    setView('main-menu');
  };

  const handleLogout = () => {
    localStorage.removeItem('spacetactics_user');
    setPlayer(null);
    setView('login');
  };

  const handleLaunchPractice = (loadout: LoadoutData) => {
    setActiveLoadout(loadout);
    setIsSandboxLaunch(false);
    fetchMaps().then(data => { if (data) setMaps(data); });
    setView('map-select');
  };

  if (view === 'login' || !player) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  // Unified Sci-Fi Main Command Terminal Menu
  if (view === 'main-menu') {
    return (
      <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-[#0b0e14] text-slate-100 flex flex-col justify-center items-center font-mono select-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.04)_0%,rgba(11,14,20,1)_100%)] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center w-[380px] p-6 bg-[#0f1115] border border-cyan-500/40 rounded-xl shadow-2xl">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-black text-base mb-3 shadow-inner">
            ⚡
          </div>
          <h1 className="text-xl font-black tracking-wider text-white uppercase text-center mb-1">
            Space Tactics
          </h1>
          <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-6">
            Command & Testing Terminal
          </p>

          <div className="flex flex-col gap-2.5 w-full">
            {/* TDM Matchmaking Entry */}
            <button 
              onClick={() => setView('tdm-unit-select')}
              className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black py-3 rounded-lg text-xs uppercase tracking-wider transition-all shadow-lg shadow-cyan-900/30"
            >
              ⚔️ 20v20 Team Deathmatch
            </button>

            <button 
              onClick={() => setView('garage')}
              className="w-full bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black py-2.5 rounded-lg text-xs uppercase tracking-wider transition-all shadow-lg"
            >
              Hangar & Loadout Garage
            </button>

            <button 
              onClick={() => {
                fetchMaps().then(data => { if (data) setMaps(data); });
                if (activeLoadout) {
                  setIsSandboxLaunch(false);
                  setView('map-select');
                } else {
                  setView('garage');
                }
              }}
              className="w-full bg-[#161922] hover:bg-slate-800 text-cyan-400 border border-slate-800 hover:border-cyan-500/50 font-black py-2.5 rounded-lg text-xs uppercase tracking-wider transition-all"
            >
              Launch Standard Game
            </button>

            <button 
              onClick={() => {
                fetchMaps().then(data => { if (data) setMaps(data); });
                setIsSandboxLaunch(true);
                setView('map-select');
              }}
              className="w-full bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-slate-950 border border-amber-500/30 font-black py-2.5 rounded-lg text-xs uppercase tracking-wider transition-all"
            >
              Unit Testing Sandbox
            </button>

            <button 
              onClick={() => {
                fetchMaps().then(data => { if (data) setMaps(data); });
                setView('map-editor-select');
              }}
              className="w-full bg-[#161922] hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 font-black py-2.5 rounded-lg text-xs uppercase tracking-wider transition-all"
            >
              Map Creator Studio
            </button>

            <button 
              onClick={() => setView('developer-settings')}
              className="w-full bg-[#161922] hover:bg-slate-800 text-amber-400 border border-slate-800 hover:border-amber-500/50 font-black py-2.5 rounded-lg text-xs uppercase tracking-wider transition-all"
            >
              Developer Settings & Tuning
            </button>

            <button 
              onClick={handleLogout}
              className="mt-3 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 font-bold py-2 rounded-lg text-[10px] uppercase tracking-wider transition-all"
            >
              Log Out Pilot ({player.username})
            </button>
          </div>
        </div>
      </div>
    );
  }

  // TDM Flow: 1. Unit Selection & Spawn Pool Config
  if (view === 'tdm-unit-select') {
    return (
      <TdmUnitSelectionScreen 
        onBack={() => setView('main-menu')}
        onProceedToMapSelect={(pilotedUnit, customPool) => {
          setTdmPilotedUnit(pilotedUnit);
          setTdmCustomPool(customPool);
          setView('tdm-map-select');
        }}
      />
    );
  }

  // TDM Flow: 2. Map Selection Theater
  if (view === 'tdm-map-select') {
    return (
      <TdmMapSelectionScreen 
        pilotedUnit={tdmPilotedUnit}
        customPool={tdmCustomPool}
        onBack={() => setView('tdm-unit-select')}
        onLaunchMatch={(mapId) => {
          setSelectedMapId(mapId);
          setView('tdm-viewport');
        }}
      />
    );
  }

  // TDM Flow: 3. 60 FPS Viewport & End-of-Match Modal
  if (view === 'tdm-viewport') {
    return (
      <TdmViewport 
        mapId={selectedMapId}
        pilotedUnit={tdmPilotedUnit}
        customPool={tdmCustomPool}
        onBackToMenu={() => setView('main-menu')}
        onChangeLoadout={() => setView('tdm-unit-select')}
      />
    );
  }

  // Garage Dashboard View
  if (view === 'garage') {
    return (
      <GarageDashboard 
        player={player} 
        onLaunchPractice={handleLaunchPractice} 
        onLogout={handleLogout} 
        onNavigateHome={() => setView('main-menu')} 
      />
    );
  }

  // Map Selection View for Game / Sandbox
  if (view === 'map-select') {
    return (
      <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-[#0b0e14] text-slate-100 flex flex-col justify-center items-center font-mono select-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.04)_0%,rgba(11,14,20,1)_100%)] pointer-events-none" />
        
        <div className={`relative z-10 flex flex-col items-center w-[460px] p-6 bg-[#0f1115] border rounded-xl shadow-2xl ${isSandboxLaunch ? 'border-amber-500/40' : 'border-cyan-500/40'}`}>
          <h2 className={`text-sm font-black uppercase tracking-wider mb-1 text-center ${isSandboxLaunch ? 'text-amber-400' : 'text-cyan-400'}`}>
            Operational Sector Select
          </h2>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-4">
            Choose Target Theater ({isSandboxLaunch ? 'Sandbox Mode' : 'Standard Mode'})
          </p>

          <div className="w-full flex flex-col gap-1.5 mb-5 max-h-60 overflow-y-auto pr-1">
            {maps.length > 0 ? maps.map(m => {
              const isSelected = selectedMapId === m.id;
              return (
                <div 
                  key={m.id}
                  onClick={() => setSelectedMapId(m.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    isSelected 
                      ? (isSandboxLaunch ? 'bg-amber-500/10 border-amber-400 shadow-md' : 'bg-cyan-500/10 border-cyan-400 shadow-md') 
                      : 'bg-[#161922] border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className={`text-[11px] font-bold mb-0.5 ${isSelected ? (isSandboxLaunch ? 'text-amber-400' : 'text-cyan-400') : 'text-white'}`}>
                    {m.name}
                  </div>
                  <div className="text-[9px] text-slate-400 leading-tight">{m.description}</div>
                </div>
              );
            }) : (
              <div className="text-slate-500 text-center py-6 text-xs">Loading Sectors...</div>
            )}
          </div>

          <div className="flex gap-2 w-full">
            <button 
              onClick={() => setView(isSandboxLaunch ? 'main-menu' : 'garage')}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black py-2 rounded-lg text-[10px] uppercase tracking-wider transition-all"
            >
              &larr; Back
            </button>
            <button 
              onClick={() => setView(isSandboxLaunch ? 'sandbox-mode' : 'standard-game')}
              className={`flex-1 font-black py-2 rounded-lg text-[10px] uppercase tracking-wider transition-all shadow-lg ${
                isSandboxLaunch ? 'bg-amber-500 hover:bg-amber-600 text-slate-950' : 'bg-cyan-400 hover:bg-cyan-300 text-slate-950'
              }`}
            >
              Deploy Match
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Map Editor Target Selection Screen (New vs Load Existing)
  if (view === 'map-editor-select') {
    return (
      <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-[#0b0e14] text-slate-100 flex flex-col justify-center items-center font-mono select-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(234,179,8,0.04)_0%,rgba(11,14,20,1)_100%)] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center w-[460px] p-6 bg-[#0f1115] border border-amber-500/40 rounded-xl shadow-2xl">
          <h2 className="text-sm font-black text-amber-400 uppercase tracking-wider mb-1 text-center">
            Map Creator Studio
          </h2>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-4">
            Select Sector to Edit or Create New
          </p>

          <button 
            onClick={() => {
              setEditorTargetMapId(null);
              setView('map-editor');
            }}
            className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-2.5 rounded-lg text-xs uppercase tracking-wider mb-4 transition-all shadow-lg"
          >
            + Create New Sector
          </button>

          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest w-full mb-1.5">Or Load Existing Sector:</div>
          <div className="w-full flex flex-col gap-1.5 mb-5 max-h-48 overflow-y-auto pr-1">
            {maps.length > 0 ? maps.map(m => (
              <div 
                key={m.id}
                onClick={() => {
                  setEditorTargetMapId(m.id);
                  setView('map-editor');
                }}
                className="bg-[#161922] border border-slate-800 hover:border-amber-500/50 p-2.5 rounded-lg cursor-pointer transition-all"
              >
                <div className="text-[11px] font-bold text-white mb-0.5">{m.name}</div>
                <div className="text-[9px] text-slate-400 leading-tight">{m.description}</div>
              </div>
            )) : (
              <div className="text-slate-500 text-center py-4 text-xs">Loading Sectors...</div>
            )}
          </div>

          <button 
            onClick={() => setView('main-menu')}
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-black py-2 rounded-lg text-[10px] uppercase tracking-wider transition-all"
          >
            &larr; Back to Main Menu
          </button>
        </div>
      </div>
    );
  }

  // Standard Game Viewport
  if (view === 'standard-game' && activeLoadout) {
    return (
      <div className="relative w-screen h-screen overflow-hidden bg-[#0b0e14]">
        <div className="absolute top-2 left-2 z-50 flex gap-2 items-center">
          <button 
            onClick={() => setView('main-menu')}
            className="bg-slate-800 hover:bg-slate-700 text-red-400 border border-red-500/30 px-3 py-1 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all"
          >
            &larr; Exit to Main Menu
          </button>
          <span className="bg-[#161922] border border-slate-800 px-2.5 py-1 rounded-lg text-[9px] font-bold text-slate-400 uppercase">
            Mode: Standard Tactical
          </span>
        </div>

        <GameViewport activeLoadout={activeLoadout} mode="standard" mapId={selectedMapId} />
      </div>
    );
  }

  // Unit Testing Sandbox Viewport
  if (view === 'sandbox-mode') {
    return (
      <PracticeViewport 
        mapId={selectedMapId} 
        onNavigateGarage={() => setView('garage')}
        onNavigateHome={() => setView('main-menu')}
        onLogout={handleLogout}
      />
    );
  }

  // Map Creator Studio View
  if (view === 'map-editor') {
    return <MapEditorViewport mapId={editorTargetMapId} onExit={() => setView('main-menu')} />;
  }

  // Developer Settings Dashboard View
  if (view === 'developer-settings') {
    return <DeveloperSettingsDashboard onNavigateHome={() => setView('main-menu')} />;
  }

  return null;
}
