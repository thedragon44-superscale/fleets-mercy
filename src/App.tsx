import React, { useState, useEffect } from 'react';
import { LoginScreen } from './components/LoginScreen';
import { GarageDashboard, LoadoutData } from './components/GarageDashboard';
import { GameViewport } from './components/GameViewport';
import { PracticeViewport } from './components/PracticeViewport';
import { MapEditorViewport } from './components/MapEditorViewport';
import { fetchMaps, MapDefinition } from './services/mapService';

export type AppView = 'login' | 'main-menu' | 'garage' | 'map-select' | 'standard-game' | 'sandbox-mode' | 'map-editor';

export default function App() {
  const [player, setPlayer] = useState<{ id: number; username: string } | null>(null);
  const [view, setView] = useState<AppView>('login');
  const [activeLoadout, setActiveLoadout] = useState<LoadoutData | null>(null);
  const [selectedMapId, setSelectedMapId] = useState<number>(1);
  const [maps, setMaps] = useState<MapDefinition[]>([]);
  const [isSandboxLaunch, setIsSandboxLaunch] = useState<boolean>(false);

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

    // Fetch available maps from backend API
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
    setView('map-select');
  };

  if (view === 'login' || !player) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  // Unified Sci-Fi Main Command Terminal Menu
  if (view === 'main-menu') {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#050811', color: '#00f3ff', fontFamily: 'monospace', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', userSelect: 'none' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at center, rgba(0,243,255,0.05) 0%, rgba(5,8,17,1) 100%)', pointerEvents: 'none' }} />
        
        <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '360px', padding: '30px', background: 'rgba(15, 23, 42, 0.9)', border: '1px solid #00f3ff', boxShadow: '0 0 25px rgba(0, 243, 255, 0.15)' }}>
          <h1 style={{ margin: '0 0 4px 0', color: '#00f3ff', fontSize: '1.8rem', textShadow: '0 0 10px #00f3ff', letterSpacing: '2px', textAlign: 'center' }}>
            SPACE TACTICS
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.75rem', letterSpacing: '1px', marginBottom: '25px', textTransform: 'uppercase' }}>
            Command & Testing Terminal
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
            <button 
              onClick={() => setView('garage')}
              style={{ padding: '12px', background: '#00f3ff', color: '#050811', border: 'none', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'monospace', letterSpacing: '1px', textAlign: 'center' }}
            >
              HANGAR & LOADOUT GARAGE
            </button>

            <button 
              onClick={() => {
                if (activeLoadout) {
                  setIsSandboxLaunch(false);
                  setView('map-select');
                } else {
                  setView('garage');
                }
              }}
              style={{ padding: '12px', background: 'rgba(15, 23, 42, 0.9)', border: '1px solid #00f3ff', color: '#00f3ff', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'monospace', letterSpacing: '1px', textAlign: 'center' }}
            >
              LAUNCH STANDARD GAME
            </button>

            <button 
              onClick={() => {
                setIsSandboxLaunch(true);
                setView('map-select');
              }}
              style={{ padding: '12px', background: 'rgba(168, 85, 247, 0.2)', border: '1px solid #a855f7', color: '#c084fc', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'monospace', letterSpacing: '1px', textAlign: 'center' }}
            >
              UNIT TESTING SANDBOX
            </button>

            <button 
              onClick={() => setView('map-editor')}
              style={{ padding: '12px', background: 'rgba(234, 179, 8, 0.15)', border: '1px solid #eab308', color: '#facc15', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'monospace', letterSpacing: '1px', textAlign: 'center' }}
            >
              MAP CREATOR STUDIO
            </button>

            <button 
              onClick={handleLogout}
              style={{ marginTop: '10px', padding: '8px', background: 'transparent', border: '1px solid #ff2a6d', color: '#ff2a6d', fontSize: '0.75rem', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'monospace' }}
            >
              Log Out Pilot ({player.username})
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Garage Dashboard View using the onNavigateHome callback prop
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

  // Map Selection View (Between Garage/Menu and Game/Sandbox Viewport)
  if (view === 'map-select') {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#050811', color: '#00f3ff', fontFamily: 'monospace', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', userSelect: 'none' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at center, rgba(0,243,255,0.05) 0%, rgba(5,8,17,1) 100%)', pointerEvents: 'none' }} />
        
        <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '460px', padding: '30px', background: 'rgba(15, 23, 42, 0.95)', border: `1px solid ${isSandboxLaunch ? '#a855f7' : '#00f3ff'}`, boxShadow: `0 0 25px ${isSandboxLaunch ? 'rgba(168, 85, 247, 0.15)' : 'rgba(0, 243, 255, 0.15)'}` }}>
          <h2 style={{ margin: '0 0 4px 0', color: isSandboxLaunch ? '#c084fc' : '#00f3ff', fontSize: '1.4rem', textShadow: `0 0 8px ${isSandboxLaunch ? '#c084fc' : '#00f3ff'}`, letterSpacing: '1px', textAlign: 'center' }}>
            OPERATIONAL SECTOR SELECT
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.75rem', letterSpacing: '1px', marginBottom: '20px', textTransform: 'uppercase' }}>
            Choose Target Theater ({isSandboxLaunch ? 'Sandbox Mode' : 'Standard Mode'})
          </p>

          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px', maxHeight: '280px', overflowY: 'auto' }}>
            {maps.length > 0 ? maps.map(m => (
              <div 
                key={m.id}
                onClick={() => setSelectedMapId(m.id)}
                style={{ 
                  background: selectedMapId === m.id ? (isSandboxLaunch ? 'rgba(168, 85, 247, 0.2)' : 'rgba(0, 243, 255, 0.15)') : '#090d1a', 
                  border: `1px solid ${selectedMapId === m.id ? (isSandboxLaunch ? '#c084fc' : '#00f3ff') : '#334155'}`, 
                  padding: '12px', 
                  cursor: 'pointer',
                  boxSizing: 'border-box'
                }}
              >
                <div style={{ fontSize: '0.85rem', color: isSandboxLaunch ? '#c084fc' : '#00f3ff', fontWeight: 'bold', marginBottom: '4px' }}>{m.name}</div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', lineHeight: '1.4' }}>{m.description}</div>
              </div>
            )) : (
              <div style={{ color: '#64748b', textAlign: 'center', padding: '20px', fontSize: '0.8rem' }}>Loading Sectors...</div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
            <button 
              onClick={() => setView(isSandboxLaunch ? 'main-menu' : 'garage')}
              style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid #64748b', color: '#94a3b8', fontWeight: 'bold', fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'monospace' }}
            >
              &larr; BACK
            </button>
            <button 
              onClick={() => setView(isSandboxLaunch ? 'sandbox-mode' : 'standard-game')}
              style={{ flex: 1, padding: '10px', background: isSandboxLaunch ? '#9333ea' : '#00f3ff', color: '#050811', border: 'none', fontWeight: 'bold', fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'monospace' }}
            >
              DEPLOY MATCH
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Standard Game Viewport
  if (view === 'standard-game' && activeLoadout) {
    return (
      <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#000' }}>
        <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 100, display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button 
            onClick={() => setView('main-menu')}
            style={{ padding: '5px 10px', fontSize: '0.75rem', background: 'rgba(15, 23, 42, 0.9)', border: '1px solid #ff2a6d', color: '#ff2a6d', fontFamily: 'monospace', cursor: 'pointer', fontWeight: 'bold' }}
          >
            &larr; EXIT TO MAIN MENU
          </button>
          <span style={{ padding: '4px 8px', background: 'rgba(15, 23, 42, 0.9)', border: '1px solid #334155', fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'monospace' }}>
            MODE: STANDARD TACTICAL
          </span>
        </div>

        <GameViewport activeLoadout={activeLoadout} mode="standard" mapId={selectedMapId} />
      </div>
    );
  }

  // Unit Testing Sandbox Viewport (No Enemies)
  if (view === 'sandbox-mode') {
    return (
      <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#000' }}>
        <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 100, display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button 
            onClick={() => setView('main-menu')}
            style={{ padding: '5px 10px', fontSize: '0.75rem', background: 'rgba(15, 23, 42, 0.9)', border: '1px solid #a855f7', color: '#c084fc', fontFamily: 'monospace', cursor: 'pointer', fontWeight: 'bold' }}
          >
            &larr; EXIT TO MAIN MENU
          </button>
          <span style={{ padding: '4px 8px', background: 'rgba(15, 23, 42, 0.9)', border: '1px solid #581c87', fontSize: '0.70rem', color: '#c084fc', fontFamily: 'monospace' }}>
            MODE: UNIT TESTING SANDBOX (NO ENEMIES)
          </span>
        </div>

        <PracticeViewport mapId={selectedMapId} />
      </div>
    );
  }

  // Map Creator Studio View
  if (view === 'map-editor') {
    return <MapEditorViewport onExit={() => setView('main-menu')} />;
  }

  return null;
}
