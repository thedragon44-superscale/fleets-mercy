// src/components/casino/spacePirates/TableSeatsHUD.tsx
import React from 'react';
import { SPSeatSnapshot } from '../../../parsers/spacePiratesCodec';
import { formatCents } from '../../../services/walletService';
import { SEAT_COLORS } from './SpacePiratesViewport';

export interface TableSeatsHUDProps {
  seats: SPSeatSnapshot[];
  myPlayerId: number;
  isSeated: boolean;
  onJoinSeat: (seatIndex: number) => void;
}

const CORNER_POSITIONS = [
  { label: 'NW · SEAT 1', className: 'top-3 left-3' },
  { label: 'NE · SEAT 2', className: 'top-3 right-3' },
  { label: 'SW · SEAT 3', className: 'bottom-3 left-3' },
  { label: 'SE · SEAT 4', className: 'bottom-3 right-3' },
] as const;

export const TableSeatsHUD: React.FC<TableSeatsHUDProps> = ({
  seats,
  myPlayerId,
  isSeated,
  onJoinSeat,
}) => {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 font-mono">
      {CORNER_POSITIONS.map((corner, idx) => {
        const seat = seats[idx];
        const color = SEAT_COLORS[idx];
        const occupied = !!seat?.occupied;
        const isMe = occupied && seat.playerId === myPlayerId;

        return (
          <div
            key={idx}
            className={`pointer-events-auto absolute ${corner.className} w-52 px-3 py-2 rounded-lg bg-slate-950/85 backdrop-blur-sm border shadow-lg transition`}
            style={{
              borderColor: occupied ? `${color}${isMe ? 'dd' : '77'}` : 'rgba(51, 65, 85, 0.7)',
            }}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: occupied ? color : '#475569' }}
                />
                <span className="text-[11px] font-black truncate text-slate-100">
                  {occupied ? seat.username : corner.label}
                </span>
              </div>
              {isMe && (
                <span
                  className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase text-slate-950 shrink-0"
                  style={{ backgroundColor: color }}
                >
                  YOU
                </span>
              )}
            </div>

            {occupied ? (
              <div className="flex items-center justify-between text-[11px] text-slate-300">
                <span className="font-bold text-emerald-300">
                  {formatCents(seat.balanceCents)}
                </span>
                <div className="flex items-center gap-2 text-[10px]">
                  <span
                    className="px-1.5 py-0.5 rounded font-black"
                    style={{ backgroundColor: `${color}22`, color }}
                  >
                    {seat.activeMultiplier}x
                  </span>
                  <span className="text-slate-400">
                    {seat.activeUnitCount} ship{seat.activeUnitCount === 1 ? '' : 's'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500">Empty Corner</span>
                {!isSeated && (
                  <button
                    type="button"
                    onClick={() => onJoinSeat(idx)}
                    className="px-2 py-0.5 rounded text-[10px] font-black uppercase text-slate-950 cursor-pointer transition hover:brightness-110"
                    style={{ backgroundColor: color }}
                  >
                    Sit Here
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
