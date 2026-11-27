// src/components/casino/spacePirates/DeployControlDeck.tsx
import React, { useMemo, useState } from 'react';
import { SPConnectionStatus, SPHudState } from '../../../hooks/useSpacePiratesSocket';
import { SPSeatSnapshot } from '../../../parsers/spacePiratesCodec';
import { SPConfigResponse, SPUnitConfig } from '../../../services/clusterService';
import { formatCents } from '../../../services/walletService';
import { SEAT_COLORS } from './SpacePiratesViewport';

export interface DeployControlDeckProps {
  status: SPConnectionStatus;
  hud: SPHudState;
  mySeat: SPSeatSnapshot | null;
  fallbackBalanceCents: number;
  config: SPConfigResponse | null;
  onJoinAnySeat: () => void;
  onLeaveSeat: () => void;
  onExitToLobby: () => void;
  onSelectMultiplier: (mult: number) => void;
  onDeployUnit: (unitClass: string) => void;
}

const UNIT_DISPLAY_NAMES: Record<string, string> = {
  viper_interceptor: 'Viper',
  assault_gunship: 'Gunship',
  cryo_flak: 'Cryo Flak',
  torpedo_bomber: 'Bomber',
  flagship: 'Flagship',
};

export const DeployControlDeck: React.FC<DeployControlDeckProps> = ({
  status,
  hud,
  mySeat,
  fallbackBalanceCents,
  config,
  onJoinAnySeat,
  onLeaveSeat,
  onExitToLobby,
  onSelectMultiplier,
  onDeployUnit,
}) => {
  const [confirmAction, setConfirmAction] = useState<'leave-seat' | 'exit-lobby' | null>(null);

  const playerUnits = useMemo<SPUnitConfig[]>(() => {
    if (!config?.units) return [];
    return Object.values(config.units)
      .filter((u) => u.factionRole === 'player' && u.isEnabled)
      .sort((a, b) => a.weightClass - b.weightClass);
  }, [config]);

  const multipliers = useMemo<number[]>(() => {
    const allowed = config?.ruleset?.allowedMultipliers;
    return allowed && allowed.length > 0 ? allowed : [1, 2, 5, 10, 25];
  }, [config]);

  const activeMultiplier = mySeat?.activeMultiplier || multipliers[0] || 1;
  const liveBalanceCents = mySeat ? mySeat.balanceCents : fallbackBalanceCents;
  const seatColor = mySeat ? SEAT_COLORS[mySeat.seatIndex] || '#22d3ee' : '#64748b';

  const bossPct =
    hud.bossMeterThreshold > 0
      ? Math.min(100, Math.round((hud.bossMeterCurrent / hud.bossMeterThreshold) * 100))
      : 0;
  const bossSecondsLeft = (hud.bossEscapeTicksRemaining / 60).toFixed(1);

  const requestLeaveSeat = () => {
    if (mySeat && mySeat.activeUnitCount > 0) {
      setConfirmAction('leave-seat');
    } else {
      onLeaveSeat();
    }
  };

  const requestExitLobby = () => {
    if (mySeat && mySeat.activeUnitCount > 0) {
      setConfirmAction('exit-lobby');
    } else {
      if (mySeat) onLeaveSeat();
      onExitToLobby();
    }
  };

  return (
    <>
      <div className="w-full shrink-0 bg-slate-950 border-t border-slate-800 px-4 py-2.5 font-mono text-slate-100 select-none z-30">
        {/* Top Row: Boss Meter / Boss Escape Banner */}
        <div className="flex items-center justify-between gap-4 mb-2.5">
          <div className="flex items-center gap-3">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                status === 'connected'
                  ? 'bg-emerald-400'
                  : status === 'connecting'
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-rose-500'
              }`}
            />
            <span className="text-[11px] font-bold uppercase text-slate-400">
              {hud.tableId} · {status}
            </span>
          </div>

          {hud.bossActive ? (
            <div className="flex-1 max-w-xl px-4 py-1 rounded-full bg-rose-500/20 border border-rose-500 text-rose-300 text-xs font-black uppercase tracking-wider text-center animate-pulse">
              👑 JACKPOT BOSS ACTIVE — ESCAPES IN {bossSecondsLeft}s
            </div>
          ) : (
            <div className="flex-1 max-w-xl flex items-center gap-2.5">
              <span className="text-[10px] font-black uppercase text-amber-400 shrink-0">
                Boss Meter
              </span>
              <div className="flex-1 h-2.5 rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-rose-500 transition-all duration-200"
                  style={{ width: `${bossPct}%` }}
                />
              </div>
              <span className="text-[10px] font-bold text-slate-400 shrink-0 w-14 text-right">
                {hud.bossMeterCurrent}/{hud.bossMeterThreshold}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2">
            {mySeat && (
              <button
                type="button"
                onClick={requestLeaveSeat}
                className="px-2.5 py-1 rounded bg-amber-500/10 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-[10px] font-bold uppercase cursor-pointer"
              >
                Stand Up
              </button>
            )}
            <button
              type="button"
              onClick={requestExitLobby}
              className="px-2.5 py-1 rounded bg-rose-500/15 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-[10px] font-bold uppercase cursor-pointer"
            >
              Leave Table
            </button>
          </div>
        </div>

        {/* Bottom Row: Wallet + Multiplier + 1W-5W Deploy Dock */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Wallet & Seat Status */}
          <div className="flex items-center gap-3 min-w-[200px]">
            <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
              <div className="text-[9px] uppercase text-slate-500 font-bold">Wallet Balance</div>
              <div className="text-lg font-black text-emerald-400 leading-tight">
                {formatCents(liveBalanceCents)}
              </div>
            </div>

            {!mySeat && (
              <button
                type="button"
                disabled={status !== 'connected'}
                onClick={onJoinAnySeat}
                className="px-4 py-2.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 disabled:opacity-40 text-slate-950 font-black text-xs uppercase tracking-wider cursor-pointer transition"
              >
                Take Open Seat
              </button>
            )}
          </div>

          {/* Bet Multiplier Selector */}
          <div className="flex items-center gap-1.5 bg-slate-900 p-1.5 rounded-lg border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-500 px-1.5">Bet</span>
            {multipliers.map((mult) => {
              const selected = activeMultiplier === mult;
              return (
                <button
                  key={mult}
                  type="button"
                  disabled={!mySeat}
                  onClick={() => onSelectMultiplier(mult)}
                  className={`px-2.5 py-1.5 rounded font-black text-xs transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    selected
                      ? 'text-slate-950 shadow'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                  }`}
                  style={selected ? { backgroundColor: seatColor } : undefined}
                >
                  {mult}x
                </button>
              );
            })}
          </div>

          {/* 1W -> 5W Instant Deploy Buttons */}
          <div className="flex items-center gap-2 flex-1 justify-end">
            {playerUnits.map((u) => {
              const costCents = u.baseCostCents * activeMultiplier;
              const canAfford = !!mySeat && mySeat.balanceCents >= costCents && status === 'connected';
              const label = UNIT_DISPLAY_NAMES[u.unitClass] || u.unitClass;

              return (
                <button
                  key={u.unitClass}
                  type="button"
                  disabled={!canAfford}
                  onClick={() => onDeployUnit(u.unitClass)}
                  className="flex flex-col items-start px-3 py-1.5 min-w-[112px] rounded-lg border bg-slate-900 hover:bg-slate-800 disabled:opacity-35 disabled:cursor-not-allowed transition cursor-pointer"
                  style={{
                    borderColor: canAfford ? `${seatColor}88` : '#1e293b',
                  }}
                >
                  <div className="w-full flex items-center justify-between gap-2">
                    <span className="text-[10px] font-black uppercase text-slate-400">
                      {u.weightClass}W
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {u.maxAmmo} rds
                    </span>
                  </div>
                  <div className="text-xs font-black text-slate-100 leading-snug">{label}</div>
                  <div className="text-xs font-black text-emerald-400">
                    {formatCents(costCents)}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Forfeit-on-Exit Warning Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 font-mono">
          <div className="w-full max-w-md p-6 rounded-xl bg-slate-900 border border-rose-500/60 shadow-2xl">
            <h3 className="text-base font-black text-rose-400 uppercase tracking-wider mb-2">
              Forfeit Active Fleet?
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-5">
              You currently have{' '}
              <strong className="text-white">{mySeat?.activeUnitCount || 0} active ship(s)</strong>{' '}
              in the arena. Leaving your seat immediately deletes all active units and in-flight
              projectiles with <strong>no refund</strong>.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold uppercase cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const action = confirmAction;
                  setConfirmAction(null);
                  onLeaveSeat();
                  if (action === 'exit-lobby') {
                    onExitToLobby();
                  }
                }}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-black uppercase cursor-pointer"
              >
                Forfeit &amp; Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
