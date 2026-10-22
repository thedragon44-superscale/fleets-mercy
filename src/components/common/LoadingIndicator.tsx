// src/components/common/LoadingIndicator.tsx
import React from 'react';

interface LoadingIndicatorProps {
  message?: string;
  fullScreen?: boolean;
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  message = 'SYNCHRONIZING TELEMETRY...',
  fullScreen = true,
}) => {
  const dragonLogoUrl = new URL('../../assets/dragon_logo.png', import.meta.url).href;

  const containerStyle = fullScreen
    ? 'fixed inset-0 bg-[#050811]/95 backdrop-blur-xl z-[9999] flex flex-col items-center justify-center gap-4 select-none'
    : 'w-full py-12 flex flex-col items-center justify-center gap-4';

  return (
    <div className={containerStyle}>
      {/* Tactical framing elements */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-950/20 via-[#050811]/80 to-[#050811] pointer-events-none" />
      
      <div className="relative flex flex-col items-center justify-center p-8 bg-[#0f1115] border-2 border-cyan-500/50 rounded-2xl shadow-[0_0_50px_rgba(34,211,238,0.2)]">
        {/* Outer rotating tactical targeting ring */}
        <div className="relative flex items-center justify-center mb-4">
          <div className="absolute w-20 h-20 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin" />
          <div className="absolute w-14 h-14 rounded-full border border-amber-500/30 border-b-amber-400 animate-ping opacity-40" />
          
          {/* Pulsing dragon emblem */}
          <img
            src={dragonLogoUrl}
            alt="Loading Emblem"
            className="w-10 h-10 object-contain animate-pulse drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]"
          />
        </div>

        <h2 className="text-xs font-black text-white tracking-[0.3em] uppercase mb-1">
          Tactical Command
        </h2>
        <span className="text-[10px] font-black text-cyan-400 tracking-widest uppercase animate-pulse">
          {message}
        </span>
      </div>
    </div>
  );
};
