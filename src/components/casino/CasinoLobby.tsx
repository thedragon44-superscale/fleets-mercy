// src/components/casino/CasinoLobby.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SPConfigResponse, fetchSPConfig } from '../../services/clusterService';
import {
  LedgerEntry,
  PlayerSession,
  WalletSummary,
  adminAdjustWallet,
  adminListPlayers,
  fetchWallet,
  formatCents,
} from '../../services/walletService';
import { SpawnPoolManagerPanel } from './SpawnPoolManagerPanel';

export interface CasinoLobbyProps {
  player: PlayerSession;
  onBalanceSync: (balanceCents: number) => void;
  onOpenSpacePirates: (tableId: string) => void;
  onOpenMapBuilder: () => void;
  onBackToMenu: () => void;
}

const QUICK_MINT_PRESETS_CENTS = [1000, 5000, 10000, 50000];

export const CasinoLobby: React.FC<CasinoLobbyProps> = ({
  player,
  onBalanceSync,
  onOpenSpacePirates,
  onOpenMapBuilder,
  onBackToMenu,
}) => {
  const [config, setConfig] = useState<SPConfigResponse | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [balanceCents, setBalanceCents] = useState<number>(player.balanceCents);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // house_admin Minting Drawer state
  const [adminDrawerOpen, setAdminDrawerOpen] = useState<boolean>(false);
  const [allPlayers, setAllPlayers] = useState<WalletSummary[]>([]);
  const [targetUsername, setTargetUsername] = useState<string>(player.username);
  const [amountDollars, setAmountDollars] = useState<string>('50.00');
  const [adminNote, setAdminNote] = useState<string>('House credit issue');
  const [adminBusy, setAdminBusy] = useState<boolean>(false);
  const [adminStatus, setAdminStatus] = useState<string | null>(null);
  const [adminError, setAdminError] = useState<string | null>(null);

  const isAdmin = player.role === 'house_admin';

  const refreshLobbyData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [walletRes, spCfg] = await Promise.all([
        fetchWallet(player.id),
        fetchSPConfig(),
      ]);
      setBalanceCents(walletRes.wallet.balanceCents);
      onBalanceSync(walletRes.wallet.balanceCents);
      setLedger(walletRes.ledger);
      setConfig(spCfg);

      if (isAdmin) {
        const list = await adminListPlayers(player.id);
        setAllPlayers(list);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load casino hub data');
    } finally {
      setLoading(false);
    }
  }, [player.id, isAdmin, onBalanceSync]);

  useEffect(() => {
    refreshLobbyData();
  }, [refreshLobbyData]);

  const maxBossPayoutCents = useMemo(() => {
    if (!config) return 0;
    const boss = config.units['house_boss:flagship'];
    const maxMult = Math.max(...(config.ruleset.allowedMultipliers || [1]));
    return boss ? boss.baseBountyCents * maxMult : 0;
  }, [config]);

  const parseDollarsToCents = (raw: string): number => {
    const cleaned = raw.replace(/[^0-9.]/g, '');
    if (!cleaned) return 0;
    const parts = cleaned.split('.');
    const whole = parseInt(parts[0] || '0', 10) || 0;
    const fracStr = (parts[1] || '').padEnd(2, '0').slice(0, 2);
    const frac = parseInt(fracStr, 10) || 0;
    return whole * 100 + frac;
  };

  const handleAdminAdjust = async (direction: 1 | -1, overrideCents?: number) => {
    setAdminError(null);
    setAdminStatus(null);
    const cents = overrideCents ?? parseDollarsToCents(amountDollars);
    if (cents <= 0) {
      setAdminError('Enter a positive dollar amount.');
      return;
    }
    const target = targetUsername.trim();
    if (!target) {
      setAdminError('Select or enter a target username.');
      return;
    }

    setAdminBusy(true);
    try {
      const res = await adminAdjustWallet({
        adminPlayerId: player.id,
        targetUsername: target,
        deltaCents: direction * cents,
        note: adminNote.trim() || (direction > 0 ? 'House mint' : 'House revoke'),
      });
      setAdminStatus(
        `${direction > 0 ? 'Minted' : 'Revoked'} ${formatCents(cents)} for ${target} → New balance: ${formatCents(res.balanceCents)}`
      );
      await refreshLobbyData();
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : 'Adjustment failed');
    } finally {
      setAdminBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 w-screen h-screen bg-[#070b14] text-slate-100 font-mono flex flex-col overflow-hidden select-none">
      {/* Top Header */}
      <header className="shrink-0 px-6 py-4 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBackToMenu}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold uppercase cursor-pointer"
          >
            &larr; Command Menu
          </button>
          <div>
            <h1 className="text-lg font-black uppercase tracking-wider text-amber-400 leading-tight">
              Fleet&apos;s Mercy — Casino Suite
            </h1>
            <p className="text-[11px] text-slate-400">
              Everyone vs. The House · Live PostgreSQL Wallets
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-right">
            <div className="flex items-center justify-end gap-2">
              <span className="text-[10px] text-slate-400 font-bold">{player.username}</span>
              {isAdmin && (
                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/50 text-amber-300 text-[9px] font-black uppercase">
                  HOUSE ADMIN
                </span>
              )}
            </div>
            <div className="text-base font-black text-emerald-400">
              {formatCents(balanceCents)}
            </div>
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={() => setAdminDrawerOpen((o) => !o)}
              className={`px-3.5 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider border cursor-pointer transition ${
                adminDrawerOpen
                  ? 'bg-amber-400 text-slate-950 border-amber-300'
                  : 'bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border-amber-500/50'
              }`}
            >
              House Treasury
            </button>
          )}

          <button
            type="button"
            onClick={refreshLobbyData}
            className="px-3 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold uppercase cursor-pointer"
          >
            Refresh
          </button>
        </div>
      </header>

      {/* Main Content + Optional Admin Drawer */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/50 text-rose-300 text-xs">
              {error}
            </div>
          )}

          {/* Space Pirates Pit #1 Card */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Space Pirates Pit #1 */}
            <div className="p-5 rounded-xl bg-gradient-to-br from-slate-900 to-slate-950 border border-cyan-500/40 shadow-xl flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded bg-cyan-500/15 border border-cyan-400/40 text-cyan-300 text-[10px] font-black uppercase">
                    60Hz Multiplayer Raid · 4 Seats
                  </span>
                  <span className="text-[11px] font-bold text-emerald-400">LIVE</span>
                </div>
                <h2 className="text-xl font-black text-white uppercase tracking-wide mb-1">
                  Space Pirates — Pit #1
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  Deploy autonomous 1W–5W strike fleets from your corner base, use drifting
                  celestial hazards as cover, and land the killing blow on cargo-laden House
                  harvesters and the Jackpot Flagship Boss.
                </p>

                {config && (
                  <div className="grid grid-cols-3 gap-2 p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-center text-xs">
                    <div>
                      <div className="text-[9px] uppercase text-slate-500">Multipliers</div>
                      <div className="font-bold text-cyan-300">
                        {config.ruleset.allowedMultipliers.map((m) => `${m}x`).join(' · ')}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] uppercase text-slate-500">Arena</div>
                      <div className="font-bold text-slate-200">
                        {config.ruleset.arenaWidth}×{config.ruleset.arenaHeight}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] uppercase text-slate-500">Max Boss Payout</div>
                      <div className="font-bold text-amber-300">
                        {formatCents(maxBossPayoutCents)}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => onOpenSpacePirates('sp-table-1')}
                className="w-full py-3 rounded-lg bg-gradient-to-r from-cyan-400 to-sky-500 hover:from-cyan-300 hover:to-sky-400 text-slate-950 font-black text-sm uppercase tracking-wider cursor-pointer transition shadow-lg"
              >
                Enter Space Pirates Pit #1 &rarr;
              </button>
            </div>

            {/* Bounty Resource Reference & Quick Link to Universal Map Builder */}
            <div className="p-5 rounded-xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 shadow-xl flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded bg-sky-500/15 border border-sky-400/40 text-sky-300 text-[10px] font-black uppercase">
                    Resource Bounty Table
                  </span>
                </div>
                <h2 className="text-lg font-black text-white uppercase tracking-wide mb-1">
                  Harvestable Cargo Bounties
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  House harvesters scale their live bounty as they mine unlimited celestial nodes.
                  Customize active drifting blueprints below or author new objects in the Universal Map Builder.
                </p>

                {config && (
                  <div className="flex flex-wrap gap-2">
                    {Object.values(config.resources)
                      .sort((a, b) => a.enumCode - b.enumCode)
                      .map((r) => (
                        <span
                          key={r.resourceKey}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-[11px]"
                        >
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: r.colorHex }}
                          />
                          <span className="text-slate-200 font-bold">{r.displayName}</span>
                          <span className="text-emerald-400">
                            {formatCents(r.maxCargoBountyCents)}
                          </span>
                        </span>
                      ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={onOpenMapBuilder}
                className="w-full py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-sky-500/40 text-sky-300 font-black text-xs uppercase tracking-wider cursor-pointer transition"
              >
                Open Universal Map Builder (Blueprints) &rarr;
              </button>
            </div>
          </section>

          {/* Lightweight Customizable Spawn Pool Manager (sp_env_pool) */}
          <SpawnPoolManagerPanel
            rulesetId={config?.ruleset?.rulesetId || 1}
            onOpenUniversalMapBuilder={onOpenMapBuilder}
          />

          {/* Recent Wallet Audit Ledger */}
          <section className="rounded-xl bg-slate-950 border border-slate-800 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">
                Recent Wallet Ledger ({ledger.length})
              </h3>
              <span className="text-[10px] text-slate-500">Immutable PostgreSQL Audit Trail</span>
            </div>

            {loading ? (
              <div className="p-6 text-center text-xs text-slate-500">Loading wallet ledger...</div>
            ) : ledger.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                No ledger transactions yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/80 text-[10px] uppercase text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-2">Type</th>
                      <th className="px-4 py-2">Delta</th>
                      <th className="px-4 py-2">Balance After</th>
                      <th className="px-4 py-2">Note</th>
                      <th className="px-4 py-2 text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {ledger.map((row) => (
                      <tr key={row.ledgerId} className="hover:bg-slate-900/40">
                        <td className="px-4 py-2 font-bold text-slate-200">{row.entryType}</td>
                        <td
                          className={`px-4 py-2 font-black ${
                            row.deltaCents > 0
                              ? 'text-emerald-400'
                              : row.deltaCents < 0
                              ? 'text-rose-400'
                              : 'text-amber-300'
                          }`}
                        >
                          {row.deltaCents > 0 ? '+' : ''}
                          {formatCents(row.deltaCents)}
                        </td>
                        <td className="px-4 py-2 text-slate-300">
                          {formatCents(row.balanceAfterCents)}
                        </td>
                        <td className="px-4 py-2 text-slate-400">{row.note || '—'}</td>
                        <td className="px-4 py-2 text-right text-slate-500 text-[11px]">
                          {new Date(row.createdAt).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>

        {/* House Admin Minting & Revoking Drawer */}
        {isAdmin && adminDrawerOpen && (
          <aside className="w-96 shrink-0 h-full bg-slate-950 border-l border-amber-500/40 flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-amber-400">
                  House Admin Treasury
                </h3>
                <p className="text-[10px] text-slate-500">
                  Mint or revoke real wallet funds (atomic ledger)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAdminDrawerOpen(false)}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="p-4 border-b border-slate-800 flex flex-col gap-3 text-xs">
              <div>
                <label className="block text-[10px] uppercase text-slate-400 font-bold mb-1">
                  Target Username
                </label>
                <input
                  type="text"
                  value={targetUsername}
                  onChange={(e) => setTargetUsername(e.target.value)}
                  className="w-full px-2.5 py-2 rounded bg-slate-900 border border-slate-700 text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-slate-400 font-bold mb-1">
                  Amount (USD)
                </label>
                <input
                  type="text"
                  value={amountDollars}
                  onChange={(e) => setAmountDollars(e.target.value)}
                  placeholder="50.00"
                  className="w-full px-2.5 py-2 rounded bg-slate-900 border border-slate-700 text-emerald-300 font-bold"
                />
                <div className="grid grid-cols-4 gap-1.5 mt-2">
                  {QUICK_MINT_PRESETS_CENTS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      disabled={adminBusy}
                      onClick={() => handleAdminAdjust(1, preset)}
                      className="py-1 rounded bg-emerald-500/15 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold cursor-pointer"
                    >
                      +{formatCents(preset)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase text-slate-400 font-bold mb-1">
                  Audit Note
                </label>
                <input
                  type="text"
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={adminBusy}
                  onClick={() => handleAdminAdjust(1)}
                  className="py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-black uppercase text-xs cursor-pointer"
                >
                  Mint Funds
                </button>
                <button
                  type="button"
                  disabled={adminBusy}
                  onClick={() => handleAdminAdjust(-1)}
                  className="py-2 rounded-lg bg-rose-600/20 hover:bg-rose-600/40 disabled:opacity-40 border border-rose-500/50 text-rose-300 font-black uppercase text-xs cursor-pointer"
                >
                  Revoke Funds
                </button>
              </div>

              {adminError && (
                <div className="p-2 rounded bg-rose-500/15 border border-rose-500/50 text-rose-300 text-[11px]">
                  {adminError}
                </div>
              )}
              {adminStatus && (
                <div className="p-2 rounded bg-emerald-500/15 border border-emerald-500/50 text-emerald-300 text-[11px]">
                  {adminStatus}
                </div>
              )}
            </div>

            {/* All Player Wallets List */}
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1.5">
              <div className="text-[10px] uppercase font-bold text-slate-500 px-1 mb-1">
                Registered Accounts ({allPlayers.length}) — Click to Target
              </div>
              {allPlayers.map((w) => {
                const selected = w.username === targetUsername;
                return (
                  <button
                    key={w.playerId}
                    type="button"
                    onClick={() => setTargetUsername(w.username)}
                    className={`w-full text-left px-3 py-2 rounded-lg border flex items-center justify-between cursor-pointer transition ${
                      selected
                        ? 'bg-amber-500/15 border-amber-400'
                        : 'bg-slate-900/70 border-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-100">{w.username}</div>
                      <div className="text-[10px] text-slate-500">
                        ID #{w.playerId} · {w.role}
                      </div>
                    </div>
                    <div className="text-xs font-black text-emerald-400">
                      {formatCents(w.balanceCents)}
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};
