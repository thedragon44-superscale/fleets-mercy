import React, { useEffect, useRef, useState } from 'react';
import { drawFlagship, drawTargetDummy, drawProjectile, drawHUDDiagnostics } from '../renderer/vectorAssets';
import { UNIT_DB } from './GarageDashboard';
import { WS_BASE_URL } from '../config';

interface FleetUnit {
  id: string; type: string; ownerId: string;
  pos: { x: number; y: number }; vel: { x: number; y: number }; angle: number;
  shields: any; hull: any;
  isFiring: boolean; isDestroyed: boolean; aiState: string;
}

interface ServerState {
  units: FleetUnit[];
  projectiles: { pos: { x: number; y: number }; vel: { x: number; y: number }; type: string }[];
  mapBounds: { width: number; height: number };
}

export const PracticeViewport: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const serverState = useRef<ServerState | null>(null);
  const cameraPos = useRef({ x: 6000, y: 10000 });
  const keys = useRef<{ [key: string]: boolean }>({});
  const mousePos = useRef({ x: 0, y: 0 });
  const isFiring = useRef(false);

  const [selectedSandboxUnit, setSelectedSandboxUnit] = useState<string>(UNIT_DB[0]?.id || 'viper');
  const [controlledUnitId, setControlledUnitId] = useState<string>('player-flagship');
  const [isSidebarVisible, setIsSidebarVisible] = useState<boolean>(true);
  const [, forceRender] = useState({});

  const sendAction = (actionParams: any = {}) => {
    if (wsRef.current?.readyState === WebSocket.OPEN && canvasRef.current && serverState.current) {
      const controlledUnit = serverState.current.units?.find(u => u.id === controlledUnitId) || 
                             serverState.current.units?.find(u => u.id === 'player-flagship');
      let angle = 0;
      if (controlledUnit) {
        const worldMouseX = mousePos.current.x - canvasRef.current.width / 2 + cameraPos.current.x;
        const worldMouseY = mousePos.current.y - canvasRef.current.height / 2 + cameraPos.current.y;
        angle = Math.atan2(worldMouseY - controlledUnit.pos.y, worldMouseX - controlledUnit.pos.x);
      }
      wsRef.current.send(JSON.stringify({
        w: !!keys.current['w'], s: !!keys.current['s'], a: !!keys.current['a'], d: !!keys.current['d'],
        angle, isFiring: isFiring.current && !!controlledUnit, 
        controlledUnitId,
        reset: actionParams.reset || false,
        sandboxSpawn: actionParams.sandboxSpawn || null,
        spawnX: actionParams.spawnX || null,
        spawnY: actionParams.spawnY || null
      }));
    }
  };

  const handleSpawnUnit = (unitId: string) => {
    const spawnX = cameraPos.current.x;
    const spawnY = cameraPos.current.y;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ sandboxSpawn: unitId, spawnX, spawnY }));
    }
  };

  useEffect(() => {
    wsRef.current = new WebSocket(`${WS_BASE_URL}/ws?mode=sandbox`);
    
    wsRef.current.onmessage = (e) => { 
      const state = JSON.parse(e.data);
      serverState.current = state;
      forceRender({});
    };

    const onKeyDown = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = true;
      if (!e.repeat) sendAction();
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = false;
      sendAction();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', () => { keys.current = {}; sendAction(); });
    window.addEventListener('mousemove', (e) => { mousePos.current = { x: e.clientX, y: e.clientY }; sendAction(); });
    window.addEventListener('mousedown', (e) => { if (e.button === 0) { isFiring.current = true; sendAction(); } });
    window.addEventListener('mouseup', (e) => { if (e.button === 0) { isFiring.current = false; sendAction(); } });

    let animId: number;
    const render = () => {
      const ctx = canvasRef.current?.getContext('2d');
      const canvas = canvasRef.current;
      
      if (!ctx || !canvas) { animId = requestAnimationFrame(render); return; }

      ctx.fillStyle = '#050811'; ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (serverState.current) {
        const controlledUnit = serverState.current.units?.find(u => u.id === controlledUnitId);
        if (controlledUnit) {
          cameraPos.current.x += (controlledUnit.pos.x + (mousePos.current.x - canvas.width / 2) * 0.35 - cameraPos.current.x) * 0.1;
          cameraPos.current.y += (controlledUnit.pos.y + (mousePos.current.y - canvas.height / 2) * 0.35 - cameraPos.current.y) * 0.1;
        }

        ctx.save();
        ctx.translate(canvas.width / 2 - cameraPos.current.x, canvas.height / 2 - cameraPos.current.y);

        ctx.strokeStyle = 'rgba(0, 243, 255, 0.05)'; ctx.lineWidth = 1; ctx.beginPath();
        for (let i = 0; i <= serverState.current.mapBounds.width; i += 200) { ctx.moveTo(i, 0); ctx.lineTo(i, serverState.current.mapBounds.height); }
        for (let i = 0; i <= serverState.current.mapBounds.height; i += 200) { ctx.moveTo(0, i); ctx.lineTo(serverState.current.mapBounds.width, i); }
        ctx.stroke();

        ctx.strokeStyle = '#a855f7'; ctx.lineWidth = 4;
        ctx.strokeRect(0, 0, serverState.current.mapBounds.width, serverState.current.mapBounds.height);

        (serverState.current.units || []).forEach((u: any) => {
          if (u.type === 'flagship') drawFlagship(ctx, u.pos.x, u.pos.y, u.angle, u.shields, u.hull, u.isFiring, u.isDestroyed);
          else drawTargetDummy(ctx, u.pos.x, u.pos.y, u.angle, u.shields, u.hull, u.isDestroyed, u.ownerId, u.type);
        });

        (serverState.current.projectiles || []).forEach(p => drawProjectile(ctx, p.pos.x, p.pos.y, p.vel.x, p.vel.y, p.type));
        ctx.restore();
        
        if (controlledUnit) drawHUDDiagnostics(ctx, controlledUnit.shields, controlledUnit.hull);
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => { 
      cancelAnimationFrame(animId); 
      if (wsRef.current) wsRef.current.close(); 
      window.removeEventListener('keydown', onKeyDown); 
      window.removeEventListener('keyup', onKeyUp); 
    };
  }, [controlledUnitId]);

  // Stable, alphabetically/chronologically sorted player units list to prevent flickering
  const playerUnits = serverState.current?.units
    ?.filter(u => u.ownerId === 'player' && !u.isDestroyed)
    ?.sort((a, b) => {
      if (a.id === 'player-flagship') return -1;
      if (b.id === 'player-flagship') return 1;
      return a.id.localeCompare(b.id);
    }) || [];

  return (
    <div 
      style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#000', userSelect: 'none' }}
      onContextMenu={(e) => {
        e.preventDefault();
        setIsSidebarVisible(prev => !prev);
      }}
    >
      <canvas ref={canvasRef} width={window.innerWidth} height={window.innerHeight} />

      {!isSidebarVisible && (
        <div style={{ position: 'absolute', top: 60, left: 15, background: 'rgba(15, 23, 42, 0.8)', border: '1px solid #581c87', padding: '6px 10px', borderRadius: '4px', color: '#c084fc', fontSize: '0.7rem', fontFamily: 'monospace', zIndex: 50, pointerEvents: 'none' }}>
          [Right-Click to Open Unit Catalog]
        </div>
      )}

      {isSidebarVisible && (
        <div style={{ position: 'absolute', top: 60, left: 15, width: '280px', maxHeight: 'calc(100vh - 80px)', background: 'rgba(15, 23, 42, 0.92)', border: '1px solid #a855f7', borderRadius: '4px', padding: '12px', zIndex: 50, overflowY: 'auto', fontFamily: 'monospace', color: '#e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #581c87', paddingBottom: '6px', marginBottom: '10px' }}>
            <h3 style={{ fontSize: '0.9rem', color: '#c084fc', margin: 0, fontWeight: 'bold' }}>
              🧪 UNIT TESTING SANDBOX
            </h3>
            <span style={{ fontSize: '0.65rem', color: '#94a3b8', cursor: 'pointer' }} onClick={() => setIsSidebarVisible(false)}>
              [CLOSE]
            </span>
          </div>
          <p style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: '12px' }}>
            Right-click anywhere to hide panel. Click any spawned unit to manually pilot it.
          </p>

          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '0.7rem', color: '#38bdf8', fontWeight: 'bold', marginBottom: '6px' }}>
              ACTIVE SPAWNED UNITS (PILOT)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '150px', overflowY: 'auto' }}>
              {playerUnits.map(unit => {
                const isControlled = controlledUnitId === unit.id;
                return (
                  <button
                    key={unit.id}
                    onClick={() => setControlledUnitId(unit.id)}
                    style={{
                      textAlign: 'left',
                      padding: '6px 8px',
                      background: isControlled ? 'rgba(56, 189, 248, 0.25)' : 'rgba(30, 41, 59, 0.6)',
                      border: `1px solid ${isControlled ? '#38bdf8' : '#334155'}`,
                      color: isControlled ? '#e0f2fe' : '#cbd5e1',
                      fontSize: '0.7rem',
                      cursor: 'pointer',
                      borderRadius: '3px'
                    }}
                  >
                    <div style={{ fontWeight: 'bold' }}>{unit.id} {isControlled ? '🕹️ (ACTIVE)' : ''}</div>
                    <div style={{ fontSize: '0.6rem', color: '#94a3b8' }}>Type: {unit.type}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ fontSize: '0.7rem', color: '#c084fc', fontWeight: 'bold', marginBottom: '6px' }}>
            SPAWN FROM CATALOG
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
            {UNIT_DB.map(unit => (
              <button
                key={unit.id}
                onClick={() => setSelectedSandboxUnit(unit.id)}
                style={{
                  textAlign: 'left',
                  padding: '8px 10px',
                  background: selectedSandboxUnit === unit.id ? 'rgba(168, 85, 247, 0.25)' : 'rgba(30, 41, 59, 0.6)',
                  border: `1px solid ${selectedSandboxUnit === unit.id ? '#c084fc' : '#334155'}`,
                  color: selectedSandboxUnit === unit.id ? '#f3e8ff' : '#cbd5e1',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  borderRadius: '3px'
                }}
              >
                <div style={{ fontWeight: 'bold' }}>{unit.name}</div>
                <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{unit.category} | Weight: {unit.weight}</div>
              </button>
            ))}
          </div>

          <button
            onClick={() => handleSpawnUnit(selectedSandboxUnit)}
            style={{
              marginTop: '14px', width: '100%', padding: '10px', background: '#9333ea', color: '#fff',
              border: 'none', fontWeight: 'bold', fontSize: '0.8rem', cursor: 'pointer', borderRadius: '3px'
            }}
          >
            SPAWN SELECTED UNIT
          </button>

          <button
            onClick={() => sendAction({ reset: true })}
            style={{
              marginTop: '8px', width: '100%', padding: '8px', background: 'transparent',
              border: '1px solid #ef4444', color: '#ef4444', fontSize: '0.75rem', cursor: 'pointer', borderRadius: '3px'
            }}
          >
            CLEAR / RESET SANDBOX
          </button>
        </div>
      )}
    </div>
  );
};

export default PracticeViewport;
