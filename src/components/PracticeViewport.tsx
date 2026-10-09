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

  const sendAction = (actionParams: any = {}) => {
    if (wsRef.current?.readyState === WebSocket.OPEN && canvasRef.current && serverState.current) {
      const flagship = serverState.current.units?.find(u => u.id === 'player-flagship');
      let angle = 0;
      if (flagship) {
        const worldMouseX = mousePos.current.x - canvasRef.current.width / 2 + cameraPos.current.x;
        const worldMouseY = mousePos.current.y - canvasRef.current.height / 2 + cameraPos.current.y;
        angle = Math.atan2(worldMouseY - flagship.pos.y, worldMouseX - flagship.pos.x);
      }
      wsRef.current.send(JSON.stringify({
        w: !!keys.current['w'], s: !!keys.current['s'], a: !!keys.current['a'], d: !!keys.current['d'],
        angle, isFiring: isFiring.current && !!flagship, 
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
    // Pass mode flag or parameter to backend to suppress enemy spawning
    wsRef.current = new WebSocket(`${WS_BASE_URL}/ws?mode=sandbox`);
    
    wsRef.current.onmessage = (e) => { 
      const state = JSON.parse(e.data);
      serverState.current = state;
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
        const flagship = serverState.current.units?.find(u => u.id === 'player-flagship');
        if (flagship) {
          cameraPos.current.x += (flagship.pos.x + (mousePos.current.x - canvas.width / 2) * 0.35 - cameraPos.current.x) * 0.1;
          cameraPos.current.y += (flagship.pos.y + (mousePos.current.y - canvas.height / 2) * 0.35 - cameraPos.current.y) * 0.1;
        }

        ctx.save();
        ctx.translate(canvas.width / 2 - cameraPos.current.x, canvas.height / 2 - cameraPos.current.y);

        // Grid lines
        ctx.strokeStyle = 'rgba(0, 243, 255, 0.05)'; ctx.lineWidth = 1; ctx.beginPath();
        for (let i = 0; i <= serverState.current.mapBounds.width; i += 200) { ctx.moveTo(i, 0); ctx.lineTo(i, serverState.current.mapBounds.height); }
        for (let i = 0; i <= serverState.current.mapBounds.height; i += 200) { ctx.moveTo(0, i); ctx.lineTo(serverState.current.mapBounds.width, i); }
        ctx.stroke();

        ctx.strokeStyle = '#a855f7'; ctx.lineWidth = 4;
        ctx.strokeRect(0, 0, serverState.current.mapBounds.width, serverState.current.mapBounds.height);

        // Render player-side units only (no automated hostile spawns)
        (serverState.current.units || []).forEach((u: any) => {
          if (u.type === 'flagship') drawFlagship(ctx, u.pos.x, u.pos.y, u.angle, u.shields, u.hull, u.isFiring, u.isDestroyed);
          else drawTargetDummy(ctx, u.pos.x, u.pos.y, u.angle, u.shields, u.hull, u.isDestroyed, u.ownerId, u.type);
        });

        (serverState.current.projectiles || []).forEach(p => drawProjectile(ctx, p.pos.x, p.pos.y, p.vel.x, p.vel.y, p.type));
        ctx.restore();
        
        if (flagship) drawHUDDiagnostics(ctx, flagship.shields, flagship.hull);
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
  }, []);

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#000', userSelect: 'none' }}>
      <canvas ref={canvasRef} width={window.innerWidth} height={window.innerHeight} />

      {/* Sandbox Unit Testing Control Sidebar */}
      <div style={{ position: 'absolute', top: 60, left: 15, width: '280px', maxHeight: 'calc(100vh - 80px)', background: 'rgba(15, 23, 42, 0.92)', border: '1px solid #a855f7', borderRadius: '4px', padding: '12px', zIndex: 50, overflowY: 'auto', fontFamily: 'monospace', color: '#e2e8f0' }}>
        <h3 style={{ fontSize: '0.9rem', color: '#c084fc', marginBottom: '10px', fontWeight: 'bold', borderBottom: '1px solid #581c87', paddingBottom: '6px' }}>
          🧪 UNIT TESTING SANDBOX
        </h3>
        <p style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: '12px' }}>
          Zero enemy threats. Select any unit to spawn at camera center.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
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
    </div>
  );
};

export default PracticeViewport;
