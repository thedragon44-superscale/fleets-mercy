// src/App.tsx
import { useState, useEffect, useCallback } from 'react';
import { LoginScreen } from './components/system/LoginScreen';
import { GarageDashboard } from './components/garage/GarageDashboard';
import { PracticeViewport } from './components/sandbox/PracticeViewport';
import { DeveloperSettingsDashboard } from './components/system/DeveloperSettingsDashboard';
import { TdmUnitSelectionScreen } from './components/teamDeathMatch/unitSelection';
import { TdmViewport } from './components/teamDeathMatch/tdmViewport';
import { CasinoLobby } from './components/casino/CasinoLobby';
import { SpacePiratesTableView } from './components/casino/spacePirates/SpacePiratesTableView';
import { MapBuilderTab, UniversalMapBuilder } from './components/mapBuilder/UniversalMapBuilder';
import { MapPickerModal } from './components/common/MapPickerModal';
import { fetchWallet, formatCents, PlayerSession } from './services/walletService';
import { refreshUnitTemplates } from './hooks/useUnitTemplates';

export type AppView =
  | 'login'
  | 'main-menu'
  | 'garage'
  | 'sandbox-map-select'
  | 'sandbox-mode'
  | 'developer-settings'
  | 'tdm-unit-select'
  | 'tdm-map-select'
  | 'tdm-viewport'
  | 'casino-lobby'
  | 'space-pirates'
  | 'universal-map-builder';

const formatUnitLabel = (id: string) =>
  id
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

export default function App() {
  const [player, setPlayer] = useState<PlayerSession | null>(null);
  const [view, setView] = useState<AppView>('login');
  const [selectedMapId, setSelectedMapId] = useState<number>(0);
  const [activeCasinoTableId, setActiveCasinoTableId] = useState<string>('sp-table-1');
  const [mapBuilderInitialTab, setMapBuilderInitialTab] = useState<MapBuilderTab>('composer');

  // TDM State Management
  const [tdmPilotedUnit, setTdmPilotedUnit] = useState<string>('viper_interceptor');
  const [tdmCustomPool, setTdmCustomPool] = useState<string[]>([]);

  useEffect(() => {
    const savedUser = localStorage.getItem('spacetactics_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        const restored: PlayerSession = {
          id: parsed.id,
          username: parsed.username,
          role: parsed.role === 'house_admin' ? 'house_admin' : 'player',
          walletId: parsed.walletId,
          balanceCents: typeof parsed.balanceCents === 'number' ? parsed.balanceCents : 0,
        };
        setPlayer(restored);
        setView('main-menu');

        // Refresh real role & balance from PostgreSQL on restore
        fetchWallet(restored.id)
          .then(({ wallet }) => {
            const synced: PlayerSession = {
              id: wallet.playerId,
              username: wallet.username,
              role: wallet.role,
              walletId: wallet.walletId,
              balanceCents: wallet.balanceCents,
            };
            localStorage.setItem('spacetactics_user', JSON.stringify(synced));
            setPlayer(synced);
          })
          .catch(() => {
            // Keep restored session if backend is temporarily unreachable
          });
      } catch {
        localStorage.removeItem('spacetactics_user');
      }
    }
  }, []);

  // Pre-warm shared PostgreSQL unit templates once logged in
  useEffect(() => {
    if (player) {
      refreshUnitTemplates();
    }
  }, [player]);

  const handleLoginSuccess = (user: PlayerSession) => {
    setPlayer(user);
    setView('main-menu');
  };

  const handleBalanceSync = useCallback((balanceCents: number) => {
    setPlayer((prev) => {
      if (!prev || prev.balanceCents === balanceCents) return prev;
      const next = { ...prev, balanceCents };
      localStorage.setItem('spacetactics_user', JSON.stringify(next));
      return next;
    });
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('spacetactics_user');
    setPlayer(null);
    setView('login');
  };

  const openMapBuilder = (tab: MapBuilderTab = 'composer') => {
    setMapBuilderInitialTab(tab);
    setView('universal-map-builder');
  };

  if (view === 'login' || !player) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  // Unified Sci-Fi Main Command Terminal Menu
  if (view === 'main-menu') {
    return (
      <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-[#0b0e14] text-slate-100 flex flex-col justify-center items-center font-mono select-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.04)_0%,rgba(11,14,20,1)_100%)] pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center w-[400px] p-6 bg-[#0f1115] border border-cyan-500/40 rounded-xl shadow-2xl">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-black text-base mb-3 shadow-inner">
            ⚡
          </div>
          <h1 className="text-xl font-black tracking-wider text-white uppercase text-center mb-1">
            Fleet&apos;s Mercy
          </h1>
          <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-6">
            Command &amp; Testing Terminal
          </p>

          <div className="flex flex-col gap-2.5 w-full">
            {/* 1. Casino / Space Pirates */}
            <button
              onClick={() => setView('casino-lobby')}
              className="w-full bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-black py-3 rounded-lg text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-900/30 cursor-pointer"
            >
              🏴‍☠️ Casino / Space Pirates ({formatCents(player.balanceCents)})
            </button>

            {/* 2. 20v20 Team Deathmatch */}
            <button
              onClick={() => setView('tdm-unit-select')}
              className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black py-3 rounded-lg text-xs uppercase tracking-wider transition-all shadow-lg shadow-cyan-900/30 cursor-pointer"
            >
              ⚔️ 20v20 Team Deathmatch
            </button>

            {/* 3. Unit Testing Sandbox */}
            <button
              onClick={() => setView('sandbox-map-select')}
              className="w-full bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-slate-950 border border-amber-500/30 font-black py-3 rounded-lg text-xs uppercase tracking-wider transition-all cursor-pointer"
            >
              🧪 Unit Testing Sandbox
            </button>

            {/* 4. Universal Map Builder (2-Tab Studio: Blueprints + Map Composer) */}
            <button
              onClick={() => openMapBuilder('composer')}
              className="w-full bg-[#161922] hover:bg-slate-800 text-sky-300 border border-sky-500/35 hover:border-sky-400 font-black py-3 rounded-lg text-xs uppercase tracking-wider transition-all cursor-pointer"
            >
              🌌 Universal Map Builder
            </button>

            {/* Secondary Utilities: Hangar & Developer Settings */}
            <div className="grid grid-cols-2 gap-2 pt-2 mt-1 border-t border-slate-800">
              <button
                onClick={() => setView('garage')}
                className="bg-[#161922] hover:bg-slate-800 text-cyan-300 border border-slate-800 hover:border-cyan-500/40 font-bold py-2 rounded-lg text-[10px] uppercase tracking-wider transition-all cursor-pointer"
              >
                Hangar Garage
              </button>
              <button
                onClick={() => setView('developer-settings')}
                className="bg-[#161922] hover:bg-slate-800 text-amber-300 border border-slate-800 hover:border-amber-500/40 font-bold py-2 rounded-lg text-[10px] uppercase tracking-wider transition-all cursor-pointer"
              >
                Dev Tuning
              </button>
            </div>

            <button
              onClick={handleLogout}
              className="mt-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 font-bold py-2 rounded-lg text-[10px] uppercase tracking-wider transition-all cursor-pointer"
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

  // TDM Flow: 2. Shared Pre-Launch Map Picker
  if (view === 'tdm-map-select') {
    return (
      <MapPickerModal
        mode="tdm"
        subtitle={`Piloted Hull: ${formatUnitLabel(tdmPilotedUnit)} · Spawn Pool: ${tdmCustomPool.length} Classes`}
        onBack={() => setView('tdm-unit-select')}
        onLaunch={(mapId) => {
          setSelectedMapId(mapId);
          setView('tdm-viewport');
        }}
        onOpenMapBuilder={() => openMapBuilder('composer')}
      />
    );
  }

  // TDM Flow: 3. 60Hz Viewport & End-of-Match Modal
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

  // Unit Testing Sandbox Flow: 1. Shared Pre-Launch Map Picker
  if (view === 'sandbox-map-select') {
    return (
      <MapPickerModal
        mode="sandbox"
        onBack={() => setView('main-menu')}
        onLaunch={(mapId) => {
          setSelectedMapId(mapId);
          setView('sandbox-mode');
        }}
        onOpenMapBuilder={() => openMapBuilder('composer')}
      />
    );
  }

  // Unit Testing Sandbox Flow: 2. 60Hz Sandbox Viewport
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

  // Garage Dashboard View
  if (view === 'garage') {
    return (
      <GarageDashboard
        player={player}
        onLaunchPractice={() => setView('sandbox-map-select')}
        onLogout={handleLogout}
        onNavigateHome={() => setView('main-menu')}
      />
    );
  }

  // Developer Settings Dashboard View
  if (view === 'developer-settings') {
    return <DeveloperSettingsDashboard onNavigateHome={() => setView('main-menu')} />;
  }

  // Casino Suite Lobby (Space Pirates + Spawn Pool Manager + House Admin Treasury)
  if (view === 'casino-lobby') {
    return (
      <CasinoLobby
        player={player}
        onBalanceSync={handleBalanceSync}
        onOpenSpacePirates={(tableId) => {
          setActiveCasinoTableId(tableId);
          setView('space-pirates');
        }}
        onOpenMapBuilder={() => openMapBuilder('blueprints')}
        onBackToMenu={() => setView('main-menu')}
      />
    );
  }

  // Space Pirates 60Hz Multiplayer Casino Table
  if (view === 'space-pirates') {
    return (
      <SpacePiratesTableView
        tableId={activeCasinoTableId}
        player={player}
        onBalanceSync={handleBalanceSync}
        onExitToLobby={() => setView('casino-lobby')}
      />
    );
  }

  // Universal Map Builder (2-Tab Studio: Object Blueprints + Map Composer)
  if (view === 'universal-map-builder') {
    return (
      <UniversalMapBuilder
        initialTab={mapBuilderInitialTab}
        onExit={() => setView('main-menu')}
      />
    );
  }

  return null;
}
