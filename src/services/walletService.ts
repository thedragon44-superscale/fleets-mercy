// src/services/walletService.ts
import { API_BASE_URL } from '../config';

export type PlayerRole = 'player' | 'house_admin';

export interface PlayerSession {
  id: number;
  username: string;
  role: PlayerRole;
  walletId?: number;
  balanceCents: number; // Strictly integer cents
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  playerId?: number;
  username?: string;
  role?: PlayerRole;
  walletId?: number;
  balanceCents: number;
}

export interface WalletSummary {
  walletId: number;
  playerId: number;
  username: string;
  role: PlayerRole;
  balanceCents: number; // Integer cents
  version: number;
  updatedAt: string;
}

export interface LedgerEntry {
  ledgerId: number;
  walletId: number;
  entryType: 'HOUSE_MINT' | 'HOUSE_REVOKE' | 'UNIT_DEPLOY' | 'KILL_PAYOUT' | 'SESSION_FORFEIT';
  deltaCents: number;
  balanceAfterCents: number;
  gameMode?: string | null;
  sessionId?: number | null;
  issuedByPlayerId?: number | null;
  note?: string | null;
  createdAt: string;
}

export interface WalletAndLedgerResponse {
  wallet: WalletSummary;
  ledger: LedgerEntry[];
}

export interface AdminAdjustWalletResponse {
  success: boolean;
  targetId: number;
  balanceCents: number;
}

/**
 * Formats integer cents cleanly as USD without ever introducing float money arithmetic bugs.
 * Examples: 1250 -> "$12.50", 0 -> "$0.00", -50 -> "-$0.50"
 */
export function formatCents(cents: number): string {
  const safe = Math.trunc(Number.isFinite(cents) ? cents : 0);
  const neg = safe < 0;
  const abs = Math.abs(safe);
  const dollars = Math.floor(abs / 100);
  const rem = abs % 100;
  const formattedDollars = dollars.toLocaleString('en-US');
  const remStr = rem < 10 ? `0${rem}` : `${rem}`;
  return `${neg ? '-' : ''}$${formattedDollars}.${remStr}`;
}

export async function loginPlayer(username: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    throw new Error(`Login request failed (HTTP ${res.status})`);
  }
  return (await res.json()) as AuthResponse;
}

export async function registerPlayer(username: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    throw new Error(`Registration request failed (HTTP ${res.status})`);
  }
  return (await res.json()) as AuthResponse;
}

export async function fetchWallet(playerId: number): Promise<WalletAndLedgerResponse> {
  const res = await fetch(`${API_BASE_URL}/api/wallet?playerId=${encodeURIComponent(playerId)}`);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text.trim() || `Failed to load wallet (HTTP ${res.status})`);
  }
  const data = (await res.json()) as WalletAndLedgerResponse;
  return {
    wallet: data.wallet,
    ledger: Array.isArray(data.ledger) ? data.ledger : [],
  };
}

export async function adminListPlayers(adminPlayerId: number): Promise<WalletSummary[]> {
  const res = await fetch(
    `${API_BASE_URL}/api/admin/players?adminPlayerId=${encodeURIComponent(adminPlayerId)}`
  );
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text.trim() || `Failed to list players (HTTP ${res.status})`);
  }
  const data = await res.json();
  return Array.isArray(data) ? (data as WalletSummary[]) : [];
}

export async function adminAdjustWallet(params: {
  adminPlayerId: number;
  targetUsername: string;
  deltaCents: number; // Positive = HOUSE_MINT, Negative = HOUSE_REVOKE
  note?: string;
}): Promise<AdminAdjustWalletResponse> {
  const res = await fetch(`${API_BASE_URL}/api/admin/wallet/adjust`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      adminPlayerId: params.adminPlayerId,
      targetUsername: params.targetUsername,
      deltaCents: Math.trunc(params.deltaCents),
      note: params.note || '',
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text.trim() || `Wallet adjustment failed (HTTP ${res.status})`);
  }
  return (await res.json()) as AdminAdjustWalletResponse;
}
