// src/components/teamDeathMatch/tdmViewport.tsx
import React, { useEffect, useRef, useState } from 'react';
import { unpackServerBinaryMessage, serializeClientInput, ServerStateSnapshot } from '../../parsers/binaryCodec';

interface TdmViewportProps {
  mapId: number;
  pilotedUnit: string;
  customPool: string[];
  onBackToMenu: () => void;
  onChangeLoadout: () => void;
}

export const TdmViewport: React.FC<TdmViewportProps> = ({
  mapId,
  pilotedUnit,
  customPool,
  onBackToMenu,
  onChangeLoadout,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const [snapshot, setSnapshot] = useState<ServerStateSnapshot | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [fps, setFps] = useState<number>(60);

  // Input state tracking
  const keysRef = useRef<{ w: boolean; s: boolean; a: boolean; d: boolean; isFiring: boolean }>({
    w: false,
    s: false,
    a: false,
    d: false,
    isFiring: false,
  });
  const mouseRef = useRef<{ x: number; y: number; angle: number }>({ x: 0, y: 0, angle: 0 });

  // Connect to WebSocket on mount
  useEffect(() => {
    const poolQuery = customPool.join(',');
    const wsUrl = `ws://localhost:8080/ws/tdm?map=${mapId}&unit=${pilotedUnit}&pool=${encodeURIComponent(poolQuery)}`;
    
    const ws = new WebSocket(wsUrl);
    ws.binaryType = 'arraybuffer';
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('🔌 Connected to TDM Skirmish Room');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      const parsedState = unpackServerBinaryMessage(event.data);
      if (parsedState) {
        setSnapshot(parsedState);
      }
    };

    ws.onclose = () => {
      console.log('❌ Disconnected from TDM Room');
      setIsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [mapId, pilotedUnit, customPool]);

  // Handle keyboard & mouse inputs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'w' || e.key === 'W') keysRef.current.w = true;
      if (e.key === 's' || e.key === 'S') keysRef.current.s = true;
      if (e.key === 'a' || e.key === 'A') keysRef.current.a = true;
      if (e.key === 'd' || e.key === 'D') keysRef.current.d = true;
      if (e.key === ' ') keysRef.current.isFiring = true;
      if (e.key === 'r' || e.key === 'R') {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          const payload = serializeClientInput({ reset: true });
          wsRef.current.send(payload);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'w' || e.key === 'W') keysRef.current.w = false;
      if (e.key === 's' || e.key === 'S') keysRef.current.s = false;
      if (e.key === 'a' || e.key === 'A') keysRef.current.a = false;
      if (e.key === 'd' || e.key === 'D') keysRef.current.d = false;
      if (e.key === ' ') keysRef.current.isFiring = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      mouseRef.current.x = mouseX;
      mouseRef.current.y = mouseY;
      mouseRef.current.angle = Math.atan2(mouseY - centerY, mouseX - centerX);
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) keysRef.current.isFiring = true;
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) keysRef.current.isFiring = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Main Render & Input Loop (60 FPS)
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();
    let frameCount = 0;

    const render = () => {
      const now = performance.now();
      frameCount++;
      if (now - lastTime >= 1000) {
        setFps(Math.round((frameCount * 1000) / (now - lastTime)));
        frameCount = 0;
        lastTime = now;
      }

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx && snapshot) {
          if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
          }

          ctx.fillStyle = '#020617';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          const playerUnit = snapshot.units.find(u => u.ownerId === 'player' && u.type === pilotedUnit && !u.isDestroyed) || snapshot.units.find(u => u.ownerId === 'player' && !u.isDestroyed);
          const cameraX = playerUnit ? playerUnit.pos.x : snapshot.mapBounds.width / 2;
          const cameraY = playerUnit ? playerUnit.pos.y : snapshot.mapBounds.height / 2;

          ctx.save();
          ctx.translate(canvas.width / 2 - cameraX, canvas.height / 2 - cameraY);

          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 2;
          ctx.strokeRect(0, 0, snapshot.mapBounds.width, snapshot.mapBounds.height);

          ctx.fillStyle = '#f59e0b';
          for (const p of snapshot.projectiles) {
            ctx.beginPath();
            ctx.arc(p.pos.x, p.pos.y, 3, 0, Math.PI * 2);
            ctx.fill();
          }

          for (const u of snapshot.units) {
            if (u.isDestroyed) continue;

            ctx.save();
            ctx.translate(u.pos.x, u.pos.y);
            ctx.rotate(u.angle);

            const isPlayer = u.ownerId === 'player';
            ctx.fillStyle = isPlayer ? '#06b6d4' : '#f43f5e';
            ctx.strokeStyle = isPlayer ? '#22d3ee' : '#fb7185';
            ctx.lineWidth = 2;

            ctx.beginPath();
            ctx.moveTo(15, 0);
            ctx.lineTo(-10, -10);
            ctx.lineTo(-5, 0);
            ctx.lineTo(-10, 10);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.restore();
          }

          ctx.restore();

          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            const inputPayload = serializeClientInput({
              keys: keysRef.current,
              angle: mouseRef.current.angle,
              isFiring: keysRef.current.isFiring,
              currentId: playerUnit?.id || null,
            });
            wsRef.current.send(inputPayload);
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [snapshot, pilotedUnit]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 select-none">
      
      <canvas ref={canvasRef} className="w-full h-full block cursor-crosshair" />

      {/* TOP HUD BAR */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
        <div className="bg-slate-900/80 border border-slate-800 px-4 py-2 rounded-lg backdrop-blur flex items-center space-x-4 pointer-events-auto">
          <button 
            onClick={onBackToMenu}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded transition"
          >
            Quit Match
          </button>
          <div className="text-xs font-mono text-cyan-400">
            TDM SKIRMISH // MAP #{mapId}
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 px-4 py-2 rounded-lg backdrop-blur text-xs font-mono text-slate-300">
          FPS: <span className="text-emerald-400">{fps}</span> | Units Active: <span className="text-cyan-400">{snapshot?.units.length || 0}</span>
        </div>
      </div>

      {/* CONNECTION STATUS OVERLAY */}
      {!isConnected && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center">
          <div className="text-xl font-mono text-amber-400 animate-pulse">
            Connecting to TDM Room Server...
          </div>
        </div>
      )}

      {/* MATCH OVER MODAL OVERLAY */}
      {snapshot?.isGameOver && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-md w-full text-center shadow-2xl">
            <div className="text-xs font-mono tracking-widest text-slate-400 mb-2 uppercase">Match Concluded</div>
            
            <h2 className={`text-4xl font-black mb-4 tracking-wider uppercase ${
              snapshot.winningFaction === 'player' ? 'text-cyan-400' : 'text-rose-500'
            }`}>
              {snapshot.winningFaction === 'player' ? 'Victory!' : 'Defeat'}
            </h2>

            <p className="text-sm text-slate-400 mb-8">
              Faction <span className="text-white font-bold uppercase">{snapshot.winningFaction}</span> successfully secured tactical supremacy on the battlefield.
            </p>

            <div className="space-y-3">
              <button
                onClick={() => {
                  if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                    const payload = serializeClientInput({ reset: true });
                    wsRef.current.send(payload);
                  }
                }}
                className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition shadow-lg shadow-cyan-900/40"
              >
                Play Again (Same Loadout)
              </button>
              
              <button
                onClick={onChangeLoadout}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold rounded-xl transition border border-cyan-900/50"
              >
                Change Loadout & Spawn Pool
              </button>

              <button
                onClick={onBackToMenu}
                className="w-full py-3 bg-slate-800/60 hover:bg-slate-800 text-slate-400 font-bold rounded-xl transition"
              >
                Main Menu
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
