// src/components/GameViewport.tsx
import React, { useEffect, useRef, useState } from 'react';
import { useGameSocket } from '../../hooks/useGameSockets';
import { useUnitTemplates } from '../../hooks/useUnitTemplates';
import { useFlightControls } from '../../hooks/useFlightControls';
import {
  drawFlagship,
  drawUnitAsset,
  drawProjectile,
  drawHUDDiagnostics,
  renderEnvironmentVector,
} from '../../renderer/vectorAssets';
import { getInterpolatedUnits } from '../../renderer/interpolation';
import { SnapshotUnit, ServerStateSnapshot } from '../../parsers/binaryCodec';
import { LoadoutData, UNIT_DB } from '../garage/GarageDashboard';
import { WS_BASE_URL } from '../../config';
import { fetchMapDetail, MapDefinition } from '../../services/mapService';

interface GameViewportProps {
  activeLoadout?: LoadoutData;
  mapId?: number;
}

export const GameViewport: React.FC<GameViewportProps> = ({ activeLoadout, mapId = 1 }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const serverState = useRef<ServerStateSnapshot | null>(null);
  const serverHistoryRef = useRef<{ timestamp: number; units: SnapshotUnit[] }[]>([]);
  const cameraPos = useRef({ x: 6000, y: 10000 });

  const [mapDetails, setMapDetails] = useState<MapDefinition | null>(null);
  const gameOverLatched = useRef<{ winner: string; x: number; y: number } | null>(null);

  const { templatesRef } = useUnitTemplates();
  const { state: socketState, sendInput } = useGameSocket(`${WS_BASE_URL}/ws`);

  const defaultLoadout: LoadoutData = activeLoadout || {
    id: 0,
    playerId: 0,
    loadoutIndex: 0,
    name: 'Standard Default',
    fleetComposition: Object.fromEntries(UNIT_DB.map((u) => [u.id, 99])),
    squad1: ['viper_interceptor', 'assault_gunship', 'command_escort'],
    squad2: ['lancer_corvette'],
    squad3: ['supply_tender'],
    squad4: ['battalion_command_ship'],
  };

  const [reserves, setReserves] = useState<{ [unitId: string]: number }>(() => ({
    ...defaultLoadout.fleetComposition,
  }));

  const squadMap = useRef<{ [key: number]: string[] }>({
    1: defaultLoadout.squad1,
    2: defaultLoadout.squad2,
    3: defaultLoadout.squad3,
    4: defaultLoadout.squad4,
  });

  const [radial, setRadial] = useState<{
    active: boolean;
    x: number;
    y: number;
    highlightedId: string | null;
  }>({ active: false, x: 0, y: 0, highlightedId: null });

  const reservesRef = useRef(reserves);
  useEffect(() => {
    reservesRef.current = reserves;
  }, [reserves]);

  useEffect(() => {
    if (!mapId) return;
    fetchMapDetail(mapId).then((data) => {
      if (data) setMapDetails(data);
    });
  }, [mapId]);

  // Sync incoming binary WebSocket state safely inside useEffect
  useEffect(() => {
    if (!socketState) return;
    serverState.current = socketState;

    if (socketState.units && socketState.units.length > 0) {
      const now = performance.now();
      serverHistoryRef.current.push({ timestamp: now, units: socketState.units });
      if (serverHistoryRef.current.length > 20) {
        serverHistoryRef.current.shift();
      }
    }
  }, [socketState]);

  // Keep canvas pixel dimensions synced with container size
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const syncSize = () => {
      const rect = container.getBoundingClientRect();
      const w = Math.max(1, Math.floor(rect.width));
      const h = Math.max(1, Math.floor(rect.height));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    };

    syncSize();
    const observer = new ResizeObserver(syncSize);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const { keysRef, mouseCanvasPosRef, tickFlightInput, sendImmediate } = useFlightControls({
    canvasRef,
    cameraPosRef: cameraPos,
    resolvePilotedUnit: (units) =>
      units.find(
        (u) =>
          (u.id === 'player-flagship' ||
            (u.ownerId === 'player' && u.type === 'battalion_command_ship')) &&
          !u.isDestroyed
      ),
    onSendInput: sendInput,
    onCustomKeyDown: (e) => {
      if (e.repeat) return false;
      const k = e.key.toLowerCase();
      if (['1', '2', '3', '4'].includes(k)) {
        queueSquadDeploy(parseInt(k, 10));
        return true;
      }
      if (k === 'r') {
        handleResetMatch();
        return true;
      }
      return false;
    },
  });

  const handleResetMatch = () => {
    serverHistoryRef.current = [];
    sendImmediate(serverState.current?.units || [], { reset: true });
    const freshReserves = { ...defaultLoadout.fleetComposition };
    reservesRef.current = freshReserves;
    setReserves(freshReserves);
  };

  const queueDeployUnit = (unitId: string) => {
    if ((reservesRef.current[unitId] || 0) > 0) {
      reservesRef.current[unitId] -= 1;
      setReserves((prev) => ({ ...prev, [unitId]: reservesRef.current[unitId] }));
      sendInput({
        keys: keysRef.current,
        deploy: unitId,
      });
    }
  };

  const queueSquadDeploy = (squadKey: number) => {
    const squadList = squadMap.current[squadKey] || [];
    squadList.forEach((unitId) => queueDeployUnit(unitId));
  };

  useEffect(() => {
    let animId: number;

    const render = (currentTime: number) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!ctx || !canvas) {
        animId = requestAnimationFrame(render);
        return;
      }

      ctx.fillStyle = '#050811';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (serverState.current) {
        const liveUnits = serverState.current.units || [];
        const flagship = tickFlightInput(currentTime, liveUnits);

        if (flagship) {
          cameraPos.current.x +=
            (flagship.pos.x + (mouseCanvasPosRef.current.x - canvas.width / 2) * 0.35 - cameraPos.current.x) * 0.1;
          cameraPos.current.y +=
            (flagship.pos.y + (mouseCanvasPosRef.current.y - canvas.height / 2) * 0.35 - cameraPos.current.y) * 0.1;
        }

        const mapW = mapDetails?.width ?? serverState.current.mapBounds.width ?? 12000;
        const mapH = mapDetails?.height ?? serverState.current.mapBounds.height ?? 12000;

        // Victory/Defeat state tracking
        const hasLiveFlagships =
          liveUnits.filter(
            (u) => (u.type === 'flagship' || u.type === 'battalion_command_ship') && !u.isDestroyed
          ).length >= 2;

        if (hasLiveFlagships && gameOverLatched.current) {
          gameOverLatched.current = null;
          const freshReserves = { ...defaultLoadout.fleetComposition };
          reservesRef.current = freshReserves;
          setReserves(freshReserves);
        }

        liveUnits.forEach((u) => {
          if (
            (u.type === 'flagship' || u.type === 'battalion_command_ship') &&
            u.isDestroyed &&
            !gameOverLatched.current
          ) {
            gameOverLatched.current = {
              winner: u.ownerId === 'player' ? 'enemy' : 'player',
              x: u.pos.x,
              y: u.pos.y,
            };
          }
        });

        // --- WORLD SPACE RENDER ---
        ctx.save();
        ctx.translate(canvas.width / 2 - cameraPos.current.x, canvas.height / 2 - cameraPos.current.y);

        // Grid
        ctx.strokeStyle = 'rgba(0, 243, 255, 0.05)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i <= mapW; i += 200) {
          ctx.moveTo(i, 0);
          ctx.lineTo(i, mapH);
        }
        for (let i = 0; i <= mapH; i += 200) {
          ctx.moveTo(0, i);
          ctx.lineTo(mapW, i);
        }
        ctx.stroke();

        // Map boundary
        ctx.strokeStyle = '#ff2a6d';
        ctx.lineWidth = 4;
        ctx.strokeRect(0, 0, mapW, mapH);

        // Environmental structures
        if (mapDetails?.structures) {
          mapDetails.structures.forEach((s) => {
            ctx.save();
            ctx.translate(s.posX, s.posY);
            renderEnvironmentVector(ctx, s.structureType, s.radius);
            ctx.restore();
          });
        }

        // Interpolated units
        const interpolatedUnits = getInterpolatedUnits(serverHistoryRef.current, currentTime);
        const unitsToDraw = interpolatedUnits.length > 0 ? interpolatedUnits : liveUnits;

        unitsToDraw.forEach((u) => {
          const isAccelerating = u.id === flagship?.id && !!keysRef.current['w'];
          if (u.type === 'flagship' || u.type === 'battalion_command_ship') {
            drawFlagship(ctx, u.pos.x, u.pos.y, u.angle, u.shields, u.hull, u.isFiring, u.isDestroyed, isAccelerating);
          } else {
            drawUnitAsset(ctx, u.pos.x, u.pos.y, u.angle, u.type, u.ownerId, u.isDestroyed);
          }
        });

        // Projectiles
        (serverState.current.projectiles || []).forEach((p) =>
          drawProjectile(ctx, p.pos.x, p.pos.y, p.vel.x, p.vel.y, p.type)
        );

        // Capital ship destruction explosion (drawn in world space)
        if (gameOverLatched.current) {
          const go = gameOverLatched.current;
          ctx.fillStyle = 'rgba(255, 60, 0, 0.4)';
          ctx.beginPath();
          ctx.arc(go.x, go.y, 180 + Math.random() * 60, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(255, 200, 0, 0.8)';
          ctx.beginPath();
          ctx.arc(go.x, go.y, 90 + Math.random() * 40, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();

        // --- SCREEN SPACE OVERLAYS ---
        if (gameOverLatched.current) {
          const go = gameOverLatched.current;
          ctx.save();
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          if (go.winner === 'enemy') {
            ctx.fillStyle = '#ff2a6d';
            ctx.font = 'bold 48px monospace';
            ctx.fillText('CRITICAL FAILURE', canvas.width / 2, canvas.height / 2 - 20);
            ctx.font = '24px monospace';
            ctx.fillText('Your Command Capital was destroyed.', canvas.width / 2, canvas.height / 2 + 30);
          } else {
            ctx.fillStyle = '#00f3ff';
            ctx.font = 'bold 48px monospace';
            ctx.fillText('VICTORY ACHIEVED', canvas.width / 2, canvas.height / 2 - 20);
            ctx.font = '24px monospace';
            ctx.fillText('Enemy Command Capital eliminated.', canvas.width / 2, canvas.height / 2 + 30);
          }
          ctx.fillStyle = '#f59e0b';
          ctx.font = '16px monospace';
          ctx.fillText('STAND BY FOR COMBAT RESET...', canvas.width / 2, canvas.height / 2 + 80);
          ctx.restore();
        }

        if (flagship) drawHUDDiagnostics(ctx, flagship.shields, flagship.hull);

        // Tactical Radar with sensor-range fog-of-war
        const radarSize = 160;
        const radarX = canvas.width - radarSize - 15;
        const radarY = canvas.height - radarSize - 15;

        const isVisibleToPlayer = (x: number, y: number): boolean => {
          for (const u of liveUnits) {
            if (u.ownerId === 'player' && !u.isDestroyed) {
              const sensorRange = templatesRef.current[u.type]?.sensorRange ?? 2500;
              if (Math.hypot(u.pos.x - x, u.pos.y - y) <= sensorRange) {
                return true;
              }
            }
          }
          return false;
        };

        ctx.save();
        ctx.fillStyle = 'rgba(5, 8, 17, 0.85)';
        ctx.fillRect(radarX, radarY, radarSize, radarSize);
        ctx.strokeStyle = '#00f3ff';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(radarX, radarY, radarSize, radarSize);

        ctx.strokeStyle = 'rgba(0, 243, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(radarX + radarSize / 2, radarY);
        ctx.lineTo(radarX + radarSize / 2, radarY + radarSize);
        ctx.moveTo(radarX, radarY + radarSize / 2);
        ctx.lineTo(radarX + radarSize, radarY + radarSize / 2);
        ctx.stroke();

        if (mapDetails?.structures) {
          const scaleX = radarSize / mapW;
          mapDetails.structures.forEach((s) => {
            if (!isVisibleToPlayer(s.posX, s.posY)) return;
            const rx = radarX + (s.posX / mapW) * radarSize;
            const ry = radarY + (s.posY / mapH) * radarSize;
            const rr = Math.max(2, s.radius * scaleX);

            if (s.structureType === 'asteroid_belt') {
              ctx.fillStyle = 'rgba(100, 116, 139, 0.7)';
              ctx.strokeStyle = 'rgba(148, 163, 184, 0.9)';
              ctx.lineWidth = 0.5;
              for (let i = 0; i < 12; i++) {
                const angle = (i / 12) * Math.PI * 2;
                const dist = s.radius * (0.6 + Math.sin(i) * 0.3) * scaleX;
                const nodeX = rx + Math.cos(angle) * dist;
                const nodeY = ry + Math.sin(angle) * dist;
                const nodeR = Math.max(1.5, (3 + (i % 3) * 2) * scaleX);
                ctx.beginPath();
                ctx.arc(nodeX, nodeY, nodeR, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
              }
            } else {
              ctx.fillStyle =
                s.structureType === 'gas_giant' ? 'rgba(100, 150, 255, 0.25)' : 'rgba(0, 243, 255, 0.3)';
              ctx.beginPath();
              ctx.arc(rx, ry, rr, 0, Math.PI * 2);
              ctx.fill();
            }
          });
        }

        liveUnits.forEach((u) => {
          if (u.isDestroyed) return;
          if (u.ownerId !== 'player' && !isVisibleToPlayer(u.pos.x, u.pos.y)) return;

          const px = radarX + (u.pos.x / mapW) * radarSize;
          const py = radarY + (u.pos.y / mapH) * radarSize;

          if (u.type === 'asteroid') {
            ctx.fillStyle = '#475569';
            ctx.fillRect(px - 1, py - 1, 3, 3);
          } else if (u.id === 'player-flagship' || (u.ownerId === 'player' && u.type === 'battalion_command_ship')) {
            ctx.fillStyle = '#00f3ff';
            ctx.beginPath();
            ctx.arc(px, py, 4, 0, Math.PI * 2);
            ctx.fill();
          } else if (u.ownerId === 'player') {
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(px - 1, py - 1, 2, 2);
          } else {
            ctx.fillStyle = '#ff2a6d';
            ctx.fillRect(px - 1, py - 1, 3, 3);
          }
        });

        const camRx = radarX + ((cameraPos.current.x - canvas.width / 2) / mapW) * radarSize;
        const camRy = radarY + ((cameraPos.current.y - canvas.height / 2) / mapH) * radarSize;
        const camRw = (canvas.width / mapW) * radarSize;
        const camRh = (canvas.height / mapH) * radarSize;

        ctx.strokeStyle = 'rgba(245, 158, 11, 0.8)';
        ctx.strokeRect(camRx, camRy, camRw, camRh);

        ctx.fillStyle = '#00f3ff';
        ctx.font = '9px monospace';
        ctx.fillText(`RADAR ${Math.round(mapW).toLocaleString()}M`, radarX + 5, radarY + 12);
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
    };
  }, [mapDetails, templatesRef, tickFlightInput]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 2) {
      e.preventDefault();
      setRadial({ active: true, x: e.clientX, y: e.clientY, highlightedId: null });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!radial.active) return;
    const dx = e.clientX - radial.x;
    const dy = e.clientY - radial.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 40) {
      if (radial.highlightedId !== null) setRadial((prev) => ({ ...prev, highlightedId: null }));
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
      setRadial((prev) => ({ ...prev, highlightedId: targetUnitId }));
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (e.button === 2 && radial.active) {
      e.preventDefault();
      if (radial.highlightedId) queueDeployUnit(radial.highlightedId);
      setRadial({ active: false, x: 0, y: 0, highlightedId: null });
    }
  };

  const availableReserves = Object.entries(reserves).filter(([_, count]) => count > 0);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: '#000',
        userSelect: 'none',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Standard Mode Top Controls */}
      <div
        className="ui-interactive"
        style={{
          position: 'absolute',
          top: 10,
          left: 160,
          display: 'flex',
          gap: '6px',
          zIndex: 50,
          maxWidth: 'calc(100vw - 280px)',
          overflowX: 'auto',
        }}
      >
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            handleResetMatch();
          }}
          style={{
            padding: '6px 12px',
            background: 'rgba(15, 23, 42, 0.9)',
            border: '1px solid #ff2a6d',
            color: '#ff2a6d',
            fontFamily: 'monospace',
            cursor: 'pointer',
            fontSize: '0.8rem',
            fontWeight: 'bold',
          }}
        >
          🚩 RESET [R]
        </button>

        {[1, 2, 3, 4].map((k) => {
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
                fontFamily: 'monospace',
                fontSize: '0.8rem',
              }}
            >
              [{k}] SQUAD: {sqList.length} UNITS ({remainingCount} READY)
            </div>
          );
        })}
      </div>

      {/* Standard Mode Radial Menu */}
      {radial.active && (
        <div
          style={{
            position: 'absolute',
            top: radial.y - 120,
            left: radial.x - 120,
            width: '240px',
            height: '240px',
            pointerEvents: 'none',
            zIndex: 200,
          }}
        >
          <svg width="240" height="240" viewBox="-120 -120 240 240">
            <circle cx="0" cy="0" r="110" fill="rgba(5, 8, 17, 0.85)" stroke="#00f3ff" strokeWidth="1.5" />

            {availableReserves.length > 0 ? (
              availableReserves.map(([uId, count], idx) => {
                const total = availableReserves.length;
                const sliceAngle = (2 * Math.PI) / total;
                const startAngle = idx * sliceAngle - Math.PI / 2;
                const endAngle = startAngle + sliceAngle;

                const x1 = 110 * Math.cos(startAngle);
                const y1 = 110 * Math.sin(startAngle);
                const x2 = 110 * Math.cos(endAngle);
                const y2 = 110 * Math.sin(endAngle);

                const isHighlighted = radial.highlightedId === uId;
                const unitObj = UNIT_DB.find((u) => u.id === uId);

                const midAngle = startAngle + sliceAngle / 2;
                const lx = 75 * Math.cos(midAngle);
                const ly = 75 * Math.sin(midAngle);

                const pathData = `M 0 0 L ${x1} ${y1} A 110 110 0 ${total > 1 && sliceAngle > Math.PI ? 1 : 0} 1 ${x2} ${y2} Z`;

                return (
                  <g key={uId}>
                    <path
                      d={pathData}
                      fill={isHighlighted ? 'rgba(0, 243, 255, 0.35)' : 'transparent'}
                      stroke="#1e293b"
                      strokeWidth="1"
                    />
                    <text
                      x={lx}
                      y={ly}
                      fill={isHighlighted ? '#00f3ff' : '#e2e8f0'}
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      {unitObj?.shortName || unitObj?.name.split(' ')[0]} ({count})
                    </text>
                  </g>
                );
              })
            ) : (
              <text x="0" y="0" fill="#ff2a6d" fontSize="10" fontFamily="monospace" textAnchor="middle">
                NO RESERVES
              </text>
            )}

            <circle
              cx="0"
              cy="0"
              r="40"
              fill={radial.highlightedId === null ? '#090d1a' : '#050811'}
              stroke={radial.highlightedId === null ? '#f59e0b' : '#334155'}
              strokeWidth="2"
            />
            <text
              x="0"
              y="2"
              fill={radial.highlightedId === null ? '#f59e0b' : '#64748b'}
              fontSize="8"
              fontFamily="monospace"
              textAnchor="middle"
            >
              {radial.highlightedId === null ? 'CANCEL' : 'RELEASE'}
            </text>
          </svg>
        </div>
      )}
    </div>
  );
};

export default GameViewport;
