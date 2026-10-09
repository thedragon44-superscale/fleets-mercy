import React, { useEffect, useRef, useState } from 'react';
import { drawFlagship, drawTargetDummy, drawProjectile, drawHUDDiagnostics } from '../renderer/vectorAssets';
import { LoadoutData, UNIT_DB } from './GarageDashboard';
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

interface GameViewportProps {
  activeLoadout?: LoadoutData;
  mode?: 'standard' | 'sandbox';
}

export const GameViewport: React.FC<GameViewportProps> = ({ activeLoadout, mode = 'standard' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const serverState = useRef<ServerState | null>(null);
  const cameraPos = useRef({ x: 6000, y: 10000 });
  const keys = useRef<{ [key: string]: boolean }>({});
  const mousePos = useRef({ x: 0, y: 0 });
  const isFiring = useRef(false);
  
  const gameOverLatched = useRef<{winner: string, x: number, y: number} | null>(null);

  // Default dummy loadout if none provided (useful for sandbox mode)
  const defaultLoadout: LoadoutData = activeLoadout || {
    id: 0, name: 'Sandbox Default',
    fleetComposition: Object.fromEntries(UNIT_DB.map(u => [u.id, 99])),
    squad1: ['viper', 'assault-gunship'], squad2: ['lancer-corvette'], squad3: ['supply-tender'], squad4: ['flagship']
  };

  const [reserves, setReserves] = useState<{ [unitId: string]: number }>(() => ({ ...defaultLoadout.fleetComposition }));
  const [selectedSandboxUnit, setSelectedSandboxUnit] = useState<string>(UNIT_DB[0]?.id || 'viper');
  
  const squadMap = useRef<{ [key: number]: string[] }>({
    1: defaultLoadout.squad1,
    2: defaultLoadout.squad2,
    3: defaultLoadout.squad3,
    4: defaultLoadout.squad4,
  });

  const [radial, setRadial] = useState<{
    active: boolean; x: number; y: number; highlightedId: string | null;
  }>({ active: false, x: 0, y: 0, highlightedId: null });

  const reservesRef = useRef(reserves);
  useEffect(() => { reservesRef.current = reserves; }, [reserves]);

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
        deploy: actionParams.deploy || "",
        reset: actionParams.reset || false,
        sandboxSpawn: actionParams.sandboxSpawn || null,
        spawnX: actionParams.spawnX || null,
        spawnY: actionParams.spawnY || null
      }));
    }
  };

  const queueDeployUnit = (unitId: string) => {
    if (mode === 'sandbox') {
      // In sandbox mode, spawn at world center or camera view center
      const spawnX = cameraPos.current.x;
      const spawnY = cameraPos.current.y;
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ sandboxSpawn: unitId, spawnX, spawnY }));
      }
      return;
    }

    if ((reservesRef.current[unitId] || 0) > 0) {
      reservesRef.current[unitId] -= 1;
      setReserves(prev => ({ ...prev, [unitId]: reservesRef.current[unitId] }));
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ deploy: unitId }));
      }
    }
  };

  const queueSquadDeploy = (squadKey: number) => {
    const squadList = squadMap.current[squadKey] || [];
    squadList.forEach(unitId => queueDeployUnit(unitId));
  };

  useEffect(() => {
    wsRef.current = new WebSocket(`${WS_BASE_URL}/ws`);
    
    wsRef.current.onmessage = (e) => { 
      const state = JSON.parse(e.data);
      serverState.current = state;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = true;
      if (!e.repeat) {
        if (['1', '2', '3', '4'].includes(e.key) && mode === 'standard') { 
          queueSquadDeploy(parseInt(e.key)); 
        } else {
          sendAction();
        }
      }
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

        ctx.strokeStyle = 'rgba(0, 243, 255, 0.05)'; ctx.lineWidth = 1; ctx.beginPath();
        for (let i = 0; i <= serverState.current.mapBounds.width; i += 200) { ctx.moveTo(i, 0); ctx.lineTo(i, serverState.current.mapBounds.height); }
        for (let i = 0; i <= serverState.current.mapBounds.height; i += 200) { ctx.moveTo(0, i); ctx.lineTo(serverState.current.mapBounds.width, i); }
        ctx.stroke();

        ctx.strokeStyle = '#ff2a6d'; ctx.lineWidth = 4;
        ctx.strokeRect(0, 0, serverState.current.mapBounds.width, serverState.current.mapBounds.height);

        (serverState.current.units || []).forEach((u: any) => {
          if (u.type === 'flagship') drawFlagship(ctx, u.pos.x, u.pos.y, u.angle, u.shields, u.hull, u.isFiring, u.isDestroyed);
          else drawTargetDummy(ctx, u.pos.x, u.pos.y, u.angle, u.shields, u.hull, u.isDestroyed, u.ownerId, u.type);
        });

        (serverState.current.projectiles || []).forEach(p => drawProjectile(ctx, p.pos.x, p.pos.y, p.vel.x, p.vel.y, p.type));
        ctx.restore();

        // Standard Mode Victory/Defeat Check
        if (mode === 'standard') {
          const units = serverState.current.units || [];
          const hasDeadFlagship = units.some(u => u.type === 'flagship' && u.isDestroyed);
          const hasLiveFlagships = units.filter(u => u.type === 'flagship' && !u.isDestroyed).length === 2;

          if (hasLiveFlagships && gameOverLatched.current) {
            gameOverLatched.current = null;
            setReserves({ ...defaultLoadout.fleetComposition });
            reservesRef.current = { ...defaultLoadout.fleetComposition };
          }

          units.forEach((u: any) => {
            if (u.type === 'flagship' && u.isDestroyed && !gameOverLatched.current) {
               gameOverLatched.current = { winner: u.ownerId === 'player' ? 'enemy' : 'player', x: u.pos.x, y: u.pos.y };
            }
          });

          if (gameOverLatched.current) {
            const go = gameOverLatched.current;
            
            ctx.fillStyle = 'rgba(255, 60, 0, 0.4)';
            ctx.beginPath(); ctx.arc(go.x, go.y, 180 + Math.random() * 60, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(255, 200, 0, 0.8)';
            ctx.beginPath(); ctx.arc(go.x, go.y, 90 + Math.random() * 40, 0, Math.PI * 2); ctx.fill();

            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            
            if (go.winner === 'enemy') {
              ctx.fillStyle = '#ff2a6d'; ctx.font = 'bold 48px monospace';
              ctx.fillText('CRITICAL FAILURE', canvas.width / 2, canvas.height / 2 - 20);
              ctx.font = '24px monospace'; ctx.fillText('Your Dreadnought was destroyed.', canvas.width / 2, canvas.height / 2 + 30);
            } else {
              ctx.fillStyle = '#00f3ff'; ctx.font = 'bold 48px monospace';
              ctx.fillText('VICTORY ACHIEVED', canvas.width / 2, canvas.height / 2 - 20);
              ctx.font = '24px monospace'; ctx.fillText('Enemy Dreadnought eliminated.', canvas.width / 2, canvas.height / 2 + 30);
            }
            ctx.fillStyle = '#f59e0b'; ctx.font = '16px monospace';
            ctx.fillText('STAND BY FOR COMBAT RESET...', canvas.width / 2, canvas.height / 2 + 80);
            ctx.restore();
          }
        }
        
        if (flagship) drawHUDDiagnostics(ctx, flagship.shields, flagship.hull);

        const radarSize = 160;
        const radarX = canvas.width - radarSize - 15;
        const radarY = canvas.height - radarSize - 15;
        const mapW = serverState.current.mapBounds.width || 12000;
        const mapH = serverState.current.mapBounds.height || 12000;

        ctx.save();
        ctx.fillStyle = 'rgba(5, 8, 17, 0.85)';
        ctx.fillRect(radarX, radarY, radarSize, radarSize);
        ctx.strokeStyle = '#00f3ff'; ctx.lineWidth = 1.5;
        ctx.strokeRect(radarX, radarY, radarSize, radarSize);

        ctx.strokeStyle = 'rgba(0, 243, 255, 0.15)'; ctx.lineWidth = 1; ctx.beginPath();
        ctx.moveTo(radarX + radarSize / 2, radarY); ctx.lineTo(radarX + radarSize / 2, radarY + radarSize);
        ctx.moveTo(radarX, radarY + radarSize / 2); ctx.lineTo(radarX + radarSize, radarY + radarSize / 2);
        ctx.stroke();

        (serverState.current.units || []).forEach((u: any) => {
          if (u.isDestroyed) return;
          const px = radarX + (u.pos.x / mapW) * radarSize;
          const py = radarY + (u.pos.y / mapH) * radarSize;

          if (u.type === 'asteroid') {
            ctx.fillStyle = '#475569'; ctx.fillRect(px - 1, py - 1, 3, 3);
          } else if (u.id === 'player-flagship') {
            ctx.fillStyle = '#00f3ff'; ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2); ctx.fill();
          } else if (u.ownerId === 'player') {
            ctx.fillStyle = '#38bdf8'; ctx.fillRect(px - 1, py - 1, 2, 2);
          } else {
            ctx.fillStyle = '#ff2a6d'; ctx.fillRect(px - 1, py - 1, 3, 3);
          }
        });

        const camRx = radarX + ((cameraPos.current.x - canvas.width / 2) / mapW) * radarSize;
        const camRy = radarY + ((cameraPos.current.y - canvas.height / 2) / mapH) * radarSize;
        const camRw = (canvas.width / mapW) * radarSize;
        const camRh = (canvas.height / mapH) * radarSize;

        ctx.strokeStyle = 'rgba(245, 158, 11, 0.8)';
        ctx.strokeRect(camRx, camRy, camRw, camRh);

        ctx.fillStyle = '#00f3ff'; ctx.font = '9px monospace';
        ctx.fillText('RADAR 12,000M', radarX + 5, radarY + 12);
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => { cancelAnimationFrame(animId); if (wsRef.current) wsRef.current.close(); window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); };
  }, [mode]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 2 && mode === 'standard') {
      e.preventDefault();
      setRadial({ active: true, x: e.clientX, y: e.clientY, highlightedId: null });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!radial.active || mode !== 'standard') return;
    const dx = e.clientX - radial.x;
    const dy = e.clientY - radial.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 40) {
      if (radial.highlightedId !== null) setRadial(prev => ({ ...prev, highlightedId: null }));
      return;
    }

    const available = Object.entries(reserves).filter(([_, count]) => count > 0);
    if (available.length === 0) return;

    let angle = Math.atan2(dy, dx) * (180 / Math.PI);
    if (angle < 0) angle += 360;

    const adjustedAngle = (angle + 90) % 360;
    const sliceAngle = 360 / available.length;
    const sliceIdx = Math.floor(adjustedAngle / sliceAngle);

    const targetUnitId = available[sliceIdx]?.[0] || null;
    if (radial.highlightedId !== targetUnitId) {
      setRadial(prev => ({ ...prev, highlightedId: targetUnitId }));
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (e.button === 2 && radial.active && mode === 'standard') {
      e.preventDefault();
      if (radial.highlightedId) queueDeployUnit(radial.highlightedId);
      setRadial({ active: false, x: 0, y: 0, highlightedId: null });
    }
  };

  const availableReserves = Object.entries(reserves).filter(([_, count]) => count > 0);

  return (
    <div 
      style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#000', userSelect: 'none' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      <canvas ref={canvasRef} width={window.innerWidth} height={window.innerHeight} />
      
      {/* Standard Mode Top Controls */}
      {mode === 'standard' && (
        <div style={{ position: 'absolute', top: 10, left: 160, display: 'flex', gap: '6px', zIndex: 50, maxWidth: 'calc(100vw - 280px)', overflowX: 'auto' }}>
          <button 
            onMouseDown={(e) => { e.preventDefault(); sendAction({ reset: true }); setReserves({ ...defaultLoadout.fleetComposition }); }} 
            style={{ padding: '6px 12px', background: 'rgba(15, 23, 42, 0.9)', border: '1px solid #ff2a6d', color: '#ff2a6d', fontFamily: 'monospace', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
          >
            🚩 RESET [R]
          </button>

          {[1, 2, 3, 4].map(k => {
            const sqList = squadMap.current[k] || [];
            const uniqueUnits = Array.from(new Set(sqList));
            const remainingCount = uniqueUnits.reduce((sum, uId) => sum + (reserves[uId] || 0), 0);

            return (
              <div 
                key={k} 
                style={{ 
                  padding: '6px 12px', 
                  background: 'rgba(15, 23, 42, 0.9)', 
                  border: `1px solid ${remainingCount > 0 ? '#00f3ff' : '#334155'}`, 
                  color: remainingCount > 0 ? '#00f3ff' : '#64748b', 
                  fontFamily: 'monospace', fontSize: '0.8rem' 
                }}
              >
                [{k}] SQUAD: {sqList.length} UNITS ({remainingCount} READY)
              </div>
            );
          })}
        </div>
      )}

      {/* Sandbox Unit Testing Control Sidebar */}
      {mode === 'sandbox' && (
        <div style={{ position: 'absolute', top: 60, left: 15, width: '280px', maxHeight: 'calc(100vh - 80px)', background: 'rgba(15, 23, 42, 0.92)', border: '1px solid #a855f7', borderRadius: '4px', padding: '12px', zIndex: 50, overflowY: 'auto', fontFamily: 'monospace', color: '#e2e8f0' }}>
          <h3 style={{ fontSize: '0.9rem', color: '#c084fc', marginBottom: '10px', fontWeight: 'bold', borderBottom: '1px solid #581c87', paddingBottom: '6px' }}>
            🧪 UNIT TESTING SANDBOX
          </h3>
          <p style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: '12px' }}>
            Select any unit from the master catalog to spawn directly into the testing viewport.
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
            onClick={() => queueDeployUnit(selectedSandboxUnit)}
            style={{
              marginTop: '14px',
              width: '100%',
              padding: '10px',
              background: '#9333ea',
              hover: { background: '#a855f7' },
              color: '#fff',
              border: 'none',
              fontWeight: 'bold',
              fontSize: '0.8rem',
              cursor: 'pointer',
              borderRadius: '3px'
            }}
          >
            SPAWN SELECTED UNIT
          </button>

          <button
            onMouseDown={(e) => { e.preventDefault(); sendAction({ reset: true }); }}
            style={{
              marginTop: '8px',
              width: '100%',
              padding: '8px',
              background: 'transparent',
              border: '1px solid #ef4444',
              color: '#ef4444',
              fontSize: '0.75rem',
              cursor: 'pointer',
              borderRadius: '3px'
            }}
          >
            CLEAR / RESET SANDBOX
          </button>
        </div>
      )}

      {/* Standard Mode Radial Menu */}
      {mode === 'standard' && radial.active && (
        <div style={{ position: 'absolute', top: radial.y - 120, left: radial.x - 120, width: '240px', height: '240px', pointerEvents: 'none', zIndex: 200 }}>
          <svg width="240" height="240" viewBox="-120 -120 240 240">
            <circle cx="0" cy="0" r="110" fill="rgba(5, 8, 17, 0.85)" stroke="#00f3ff" strokeWidth="1.5" />
            
            {availableReserves.length > 0 ? availableReserves.map(([uId, count], idx) => {
              const total = availableReserves.length;
              const sliceAngle = (2 * Math.PI) / total;
              const startAngle = idx * sliceAngle - Math.PI / 2;
              const endAngle = startAngle + sliceAngle;

              const x1 = 110 * Math.cos(startAngle);
              const y1 = 110 * Math.sin(startAngle);
              const x2 = 110 * Math.cos(endAngle);
              const y2 = 110 * Math.sin(endAngle);

              const isHighlighted = radial.highlightedId === uId;
              const unitObj = UNIT_DB.find(u => u.id === uId);

              const midAngle = startAngle + sliceAngle / 2;
              const lx = 75 * Math.cos(midAngle);
              const ly = 75 * Math.sin(midAngle);

              const pathData = `M 0 0 L ${x1} ${y1} A 110 110 0 ${total > 1 && sliceAngle > Math.PI ? 1 : 0} 1 ${x2} ${y2} Z`;

              return (
                <g key={uId}>
                  <path d={pathData} fill={isHighlighted ? 'rgba(0, 243, 255, 0.35)' : 'transparent'} stroke="#1e293b" strokeWidth="1" />
                  <text x={lx} y={ly} fill={isHighlighted ? '#00f3ff' : '#e2e8f0'} fontSize="9" fontFamily="monospace" fontWeight="bold" textAnchor="middle" dominantBaseline="middle">
                    {unitObj?.shortName || unitObj?.name.split(' ')[0]} ({count})
                  </text>
                </g>
              );
            }) : (
              <text x="0" y="0" fill="#ff2a6d" fontSize="10" fontFamily="monospace" textAnchor="middle">NO RESERVES</text>
            )}

            <circle cx="0" cy="0" r="40" fill={radial.highlightedId === null ? '#090d1a' : '#050811'} stroke={radial.highlightedId === null ? '#f59e0b' : '#334155'} strokeWidth="2" />
            <text x="0" y="2" fill={radial.highlightedId === null ? '#f59e0b' : '#64748b'} fontSize="8" fontFamily="monospace" textAnchor="middle">
              {radial.highlightedId === null ? 'CANCEL' : 'RELEASE'}
            </text>
          </svg>
        </div>
      )}
    </div>
  );
};
