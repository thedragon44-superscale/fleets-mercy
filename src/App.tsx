import React, { useState, useEffect } from 'react';
import { LoginScreen } from './components/LoginScreen';
import { GarageDashboard, LoadoutData } from './components/GarageDashboard';
import { GameViewport } from './components/GameViewport';
import { PracticeViewport } from './components/PracticeViewport';

export type AppView = 'login' | 'main-menu' | 'garage' | 'standard-game' | 'sandbox-mode';

export default function App() {
  const [player, setPlayer] = useState<{ id: number; username: string } | null>(null);
  const [view, setView] = useState<AppView>('login');
  const [activeLoadout, setActiveLoadout] = useState<LoadoutData | null>(null);

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
    setView('standard-game');
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
                  setView('standard-game');
                } else {
                  setView('garage');
                }
              }}
              style={{ padding: '12px', background: 'rgba(15, 23, 42, 0.9)', border: '1px solid #00f3ff', color: '#00f3ff', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'monospace', letterSpacing: '1px', textAlign: 'center' }}
            >
              LAUNCH STANDARD GAME
            </button>

            <button 
              onClick={() => setView('sandbox-mode')}
              style={{ padding: '12px', background: 'rgba(168, 85, 247, 0.2)', border: '1px solid #a855f7', color: '#c084fc', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'monospace', letterSpacing: '1px', textAlign: 'center' }}
            >
              UNIT TESTING SANDBOX
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

        <GameViewport activeLoadout={activeLoadout} mode="standard" />
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
          <span style={{ padding: '4px 8px', background: 'rgba(15, 23, 42, 0.9)', border: '1px solid #581c87', fontSize: '0.7rem', color: '#c084fc', fontFamily: 'monospace' }}>
            MODE: UNIT TESTING SANDBOX (NO ENEMIES)
          </span>
        </div>

        <PracticeViewport />
      </div>
    );
  }

  return null;
}
