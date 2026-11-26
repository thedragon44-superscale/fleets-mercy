// src/components/common/TacticalRadar.tsx
import React from 'react';

interface TacticalRadarProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  size?: number;
  label?: string;
  accent?: 'amber' | 'cyan';
  positionClass?: string;
}

export const TacticalRadar: React.FC<TacticalRadarProps> = ({
  canvasRef,
  size = 180,
  label = 'Tactical Radar',
  accent = 'amber',
  positionClass = 'bottom-4 right-4',
}) => {
  const borderColor = accent === 'cyan' ? 'border-cyan-500/40' : 'border-amber-500/40';
  const labelColor = accent === 'cyan' ? 'text-cyan-400' : 'text-amber-400';

  return (
    <div
      style={{ width: size, height: size }}
      className={`ui-interactive absolute ${positionClass} bg-[#0f1115]/90 border ${borderColor} rounded-lg overflow-hidden shadow-2xl z-40 backdrop-blur-md`}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className={`absolute top-1 left-2 text-[8px] font-black ${labelColor} uppercase tracking-widest pointer-events-none z-10`}
      >
        {label}
      </div>
      <canvas ref={canvasRef} width={size} height={size} className="block w-full h-full" />
    </div>
  );
};
