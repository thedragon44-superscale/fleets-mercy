import React, { useEffect, useRef, useState } from 'react';
import { renderEnvironmentVector } from '../renderer/vectorAssets';
import { saveCustomMap, MapDefinition } from '../services/mapService';

interface PlacedStructure {
  id: string;
  type: string;
  x: number;
  y: number;
  radius: number;
}

const STRUCTURE_CATALOG = [
  { type: 'gas_giant', name: 'Gas Giant', defaultRadius: 800 },
  { type: 'asteroid_belt', name: 'Asteroid Belt', defaultRadius: 600 },
  { type: 'nebula', name: 'Nebula Cloud', defaultRadius: 1000 },
  { type: 'moon', name: 'Planetary Moon', defaultRadius: 400 },
  { type: 'singularity', name: 'Singularity', defaultRadius: 300 },
  { type: 'comet', name: 'Comet', defaultRadius: 250 }
];

export const MapEditorViewport: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const radarCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Map Metadata & Dimensions State
  const [mapName, setMapName] = useState<string>('Custom Sector Alpha');
  const [mapDesc, setMapDesc] = useState<string>('User-designed tactical theater.');
  const [mapWidth, setMapWidth] = useState<number>(12000);
  const [mapHeight, setMapHeight] = useState<number>(12000);

  // Editor Placement & Camera State
  const cameraPos = useRef({ x: 6000, y: 10000 });
  const renderPos = useRef({ x: 6000, y: 10000 });
  const keys = useRef<{ [key: string]: boolean }>({});
  const mousePos = useRef({ x: 0, y: 0 });

  const [structures, setStructures] = useState<PlacedStructure[]>([]);
  const [selectedToolType, setSelectedToolType] = useState<string>('asteroid_belt');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [, forceRender] = useState({});

  // WASD Flight & Mouse Handlers
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = true; };
    const onKeyUp = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = false; };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousemove', (e) => { mousePos.current = { x: e.clientX, y: e.clientY }; });

    let animId: number;
    const render = () => {
      const ctx = canvasRef.current?.getContext('2d');
      const canvas = canvasRef.current;
      const radarCtx = radarCanvasRef.current?.getContext('2d');
      const radarCanvas = radarCanvasRef.current;

      if (!ctx || !canvas) { animId = requestAnimationFrame(render); return; }

      ctx.fillStyle = '#050811';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Smooth camera movement via WASD
      const moveSpeed = 15;
      if (keys.current['w'] || keys.current['arrowup']) renderPos.current.y -= moveSpeed;
      if (keys.current['s'] || keys.current['arrowdown']) renderPos.current.y += moveSpeed;
      if (keys.current['a'] || keys.current['arrowleft']) renderPos.current.x -= moveSpeed;
      if (keys.current['d'] || keys.current['arrowright']) renderPos.current.x += moveSpeed;

      // Clamp camera within map bounds
      renderPos.current.x = Math.max(0, Math.min(mapWidth, renderPos.current.x));
      renderPos.current.y = Math.max(0, Math.min(mapHeight, renderPos.current.y));

      cameraPos.current.x += (renderPos.current.x - cameraPos.current.x) * 0.2;
      cameraPos.current.y += (renderPos.current.y - cameraPos.current.y) * 0.2;

      ctx.save();
      ctx.translate(canvas.width / 2 - cameraPos.current.x, canvas.height / 2 - cameraPos.current.y);

      // Draw Grid & Map Bounds
      ctx.strokeStyle = 'rgba(0, 243, 255, 0.05)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i <= mapWidth; i += 400) { ctx.moveTo(i, 0); ctx.lineTo(i, mapHeight); }
      for (let i = 0; i <= mapHeight; i += 400) { ctx.moveTo(0, i); ctx.lineTo(mapWidth, i); }
      ctx.stroke();

      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 4;
      ctx.strokeRect(0, 0, mapWidth, mapHeight);

      // Render Placed Structures
      structures.forEach(s => {
        ctx.save();
        ctx.translate(s.x, s.y);
        renderEnvironmentVector(ctx, s.type, s.radius);
        ctx.restore();
      });

      // Render Active Ghost Preview at Cursor World Position
      const worldMouseX = mousePos.current.x - canvas.width / 2 + cameraPos.current.x;
      const worldMouseY = mousePos.current.y - canvas.height / 2 + cameraPos.current.y;
      
      const activeCatalogItem = STRUCTURE_CATALOG.find(c => c.type === selectedToolType) || STRUCTURE_CATALOG[0];

      ctx.save();
      ctx.translate(worldMouseX, worldMouseY);
      ctx.globalAlpha = 0.5;
      renderEnvironmentVector(ctx, activeCatalogItem.type, activeCatalogItem.defaultRadius);
      ctx.restore();

      ctx.restore();

      // Render Proportional Radar Minimap
      if (radarCtx && radarCanvas) {
        const rw = radarCanvas.width;
        const rh = radarCanvas.height;

        radarCtx.fillStyle = 'rgba(5, 8, 17, 0.9)';
        radarCtx.fillRect(0, 0, rw, rh);
        radarCtx.strokeStyle = '#a855f7';
        radarCtx.lineWidth = 1.5;
        radarCtx.strokeRect(0, 0, rw, rh);

        const scaleX = rw / mapWidth;
        const scaleY = rh / mapHeight;

        structures.forEach(s => {
          const rx = s.x * scaleX;
          const ry = s.y * scaleY;
          const rr = Math.max(2, s.radius * scaleX);
          radarCtx.fillStyle = 'rgba(168, 85, 247, 0.6)';
          radarCtx.beginPath();
          radarCtx.arc(rx, ry, rr, 0, Math.PI * 2);
          radarCtx.fill();
        });

        // Viewport Box on Radar
        const camRx = (cameraPos.current.x - canvas.width / 2) * scaleX;
        const camRy = (cameraPos.current.y - canvas.height / 2) * scaleY;
        const camRw = canvas.width * scaleX;
        const camRh = canvas.height * scaleY;
        radarCtx.strokeStyle = 'rgba(0, 243, 255, 0.8)';
        radarCtx.lineWidth = 1;
        radarCtx.strokeRect(camRx, camRy, camRw, camRh);
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [mapWidth, mapHeight, structures, selectedToolType]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).tagName !== 'CANVAS') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const worldMouseX = e.clientX - canvas.width / 2 + cameraPos.current.x;
    const worldMouseY = e.clientY - canvas.height / 2 + cameraPos.current.y;
    const activeCatalogItem = STRUCTURE_CATALOG.find(c => c.type === selectedToolType) || STRUCTURE_CATALOG[0];

    const newStructure: PlacedStructure = {
      id: `struct_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      type: selectedToolType,
      x: worldMouseX,
      y: worldMouseY,
      radius: activeCatalogItem.defaultRadius
    };

    setStructures(prev => [...prev, newStructure]);
  };

  const handleSaveMap = async () => {
    setIsSaving(true);
    const mapPayload = {
      name: mapName,
      description: mapDesc,
      width: mapWidth,
      height: mapHeight,
      structures: structures
    };

    const success = await saveCustomMap(mapPayload);
    setIsSaving(false);
    if (success) {
      alert(`Sector "${mapName}" saved successfully and is now live in game modes!`);
      onExit();
    } else {
      alert('Failed to save map configuration to backend.');
    }
  };

  return (
    <div 
      style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#000', userSelect: 'none' }}
      onClick={handleCanvasClick}
    >
      <canvas ref={canvasRef} width={window.innerWidth} height={window.innerHeight} />

      {/* Top Bar Navigation & Controls */}
      <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 100, display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button 
          onClick={onExit}
          style={{ padding: '6px 12px', fontSize: '0.75rem', background: 'rgba(15, 23, 42, 0.9)', border: '1px solid #ff2a6d', color: '#ff2a6d', fontFamily: 'monospace', cursor: 'pointer', fontWeight: 'bold' }}
        >
          &larr; EXIT EDITOR
        </button>
        <span style={{ padding: '6px 12px', background: 'rgba(15, 23, 42, 0.9)', border: '1px solid #a855f7', fontSize: '0.7rem', color: '#c084fc', fontFamily: 'monospace' }}>
          MODE: TACTICAL MAP CREATOR [WASD to Fly, Click to Place]
        </span>
      </div>

      {/* Proportional Tactical Radar */}
      <div style={{ position: 'absolute', bottom: 20, right: 20, width: '180px', height: '180px', background: 'rgba(15, 23, 42, 0.9)', border: '1px solid #a855f7', borderRadius: '6px', overflow: 'hidden', zIndex: 50, boxShadow: '0 0 15px rgba(168, 85, 247, 0.2)' }}>
        <div style={{ position: 'absolute', top: 4, left: 6, fontSize: '0.6rem', color: '#c084fc', fontFamily: 'monospace', fontWeight: 'bold', pointerEvents: 'none', zIndex: 2 }}>
          SECTOR RADAR ({mapWidth}M)
        </div>
        <canvas ref={radarCanvasRef} width={180} height={180} style={{ display: 'block' }} />
      </div>

      {/* Editor Sidebar Catalog & Config */}
      <div style={{ position: 'absolute', top: 60, left: 15, width: '300px', maxHeight: 'calc(100vh - 80px)', background: 'rgba(15, 23, 42, 0.95)', border: '1px solid #a855f7', borderRadius: '4px', padding: '14px', zIndex: 50, overflowY: 'auto', fontFamily: 'monospace', color: '#e2e8f0' }}>
        <h3 style={{ fontSize: '0.9rem', color: '#c084fc', margin: '0 0 10px 0', fontWeight: 'bold', borderBottom: '1px solid #581c87', paddingBottom: '6px' }}>
          🗺️ MAP CREATOR STUDIO
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
          <div>
            <label style={{ fontSize: '0.65rem', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>MAP NAME</label>
            <input 
              type="text" 
              value={mapName} 
              onChange={e => setMapName(e.target.value)}
              style={{ width: '100%', background: '#090d1a', border: '1px solid #334155', color: '#fff', padding: '6px', fontSize: '0.75rem', fontFamily: 'monospace', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.65rem', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>DESCRIPTION</label>
            <input 
              type="text" 
              value={mapDesc} 
              onChange={e => setMapDesc(e.target.value)}
              style={{ width: '100%', background: '#090d1a', border: '1px solid #334155', color: '#fff', padding: '6px', fontSize: '0.75rem', fontFamily: 'monospace', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.65rem', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>WIDTH (M)</label>
              <input 
                type="number" 
                value={mapWidth} 
                onChange={e => setMapWidth(parseInt(e.target.value) || 12000)}
                style={{ width: '100%', background: '#090d1a', border: '1px solid #334155', color: '#fff', padding: '6px', fontSize: '0.75rem', fontFamily: 'monospace', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.65rem', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>HEIGHT (M)</label>
              <input 
                type="number" 
                value={mapHeight} 
                onChange={e => setMapHeight(parseInt(e.target.value) || 12000)}
                style={{ width: '100%', background: '#090d1a', border: '1px solid #334155', color: '#fff', padding: '6px', fontSize: '0.75rem', fontFamily: 'monospace', boxSizing: 'border-box' }}
              />
            </div>
          </div>
        </div>

        <div style={{ fontSize: '0.7rem', color: '#c084fc', fontWeight: 'bold', marginBottom: '6px' }}>
          STRUCTURE PALETTE (CLICK TO SELECT)
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
          {STRUCTURE_CATALOG.map(item => (
            <button
              type="button"
              key={item.type}
              onClick={() => setSelectedToolType(item.type)}
              style={{
                textAlign: 'left',
                padding: '8px 10px',
                background: selectedToolType === item.type ? 'rgba(168, 85, 247, 0.25)' : 'rgba(30, 41, 59, 0.6)',
                border: `1px solid ${selectedToolType === item.type ? '#c084fc' : '#334155'}`,
                color: selectedToolType === item.type ? '#f3e8ff' : '#cbd5e1',
                fontSize: '0.75rem',
                cursor: 'pointer',
                borderRadius: '3px'
              }}
            >
              <div style={{ fontWeight: 'bold' }}>{item.name}</div>
              <div style={{ fontSize: '0.6rem', color: '#94a3b8' }}>Default Radius: {item.defaultRadius}m</div>
            </button>
          ))}
        </div>

        <div style={{ fontSize: '0.7rem', color: '#38bdf8', fontWeight: 'bold', marginBottom: '6px' }}>
          PLACED STRUCTURES ({structures.length})
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '120px', overflowY: 'auto', marginBottom: '14px' }}>
          {structures.map((s, idx) => (
            <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#090d1a', padding: '4px 8px', fontSize: '0.65rem', border: '1px solid #334155' }}>
              <span>{idx + 1}. {s.type} ({Math.round(s.x)}, {Math.round(s.y)})</span>
              <button 
                onClick={() => setStructures(prev => prev.filter(item => item.id !== s.id))}
                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.65rem' }}
              >
                [X]
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={handleSaveMap}
          disabled={isSaving}
          style={{
            width: '100%', padding: '10px', background: '#9333ea', color: '#fff',
            border: 'none', fontWeight: 'bold', fontSize: '0.8rem', cursor: 'pointer', borderRadius: '3px'
          }}
        >
          {isSaving ? 'SAVING SECTOR...' : 'SAVE & EXPORT MAP'}
        </button>

        <button
          type="button"
          onClick={() => setStructures([])}
          style={{
            marginTop: '8px', width: '100%', padding: '8px', background: 'transparent',
            border: '1px solid #ef4444', color: '#ef4444', fontSize: '0.75rem', cursor: 'pointer', borderRadius: '3px'
          }}
        >
          CLEAR ALL STRUCTURES
        </button>
      </div>
    </div>
  );
};
