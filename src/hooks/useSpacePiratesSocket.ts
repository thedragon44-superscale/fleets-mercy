// src/hooks/useSpacePiratesSocket.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { WS_BASE_URL } from '../config';
import {
  SPSeatSnapshot,
  SPServerStateSnapshot,
  decodeSPServerState,
  encodeDeployUnit,
  encodeJoinSeat,
  encodeLeaveSeat,
  encodeSetMultiplier,
} from '../parsers/spacePiratesCodec';

export type SPConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface SPHudState {
  tick: number;
  tableId: string;
  arenaWidth: number;
  arenaHeight: number;
  seats: SPSeatSnapshot[];
  bossMeterCurrent: number;
  bossMeterThreshold: number;
  bossActive: boolean;
  bossEscapeTicksRemaining: number;
}

const INITIAL_HUD: SPHudState = {
  tick: 0,
  tableId: 'sp-table-1',
  arenaWidth: 2400,
  arenaHeight: 1600,
  seats: [],
  bossMeterCurrent: 0,
  bossMeterThreshold: 40,
  bossActive: false,
  bossEscapeTicksRemaining: 0,
};

function seatsChangedSignificantly(prev: SPSeatSnapshot[], next: SPSeatSnapshot[]): boolean {
  if (prev.length !== next.length) return true;
  for (let i = 0; i < next.length; i++) {
    const a = prev[i];
    const b = next[i];
    if (
      a.occupied !== b.occupied ||
      a.playerId !== b.playerId ||
      a.balanceCents !== b.balanceCents ||
      a.activeMultiplier !== b.activeMultiplier ||
      a.activeUnitCount !== b.activeUnitCount
    ) {
      return true;
    }
  }
  return false;
}

export interface UseSpacePiratesSocketResult {
  status: SPConnectionStatus;
  latestStateRef: React.MutableRefObject<SPServerStateSnapshot | null>;
  hud: SPHudState;
  mySeat: SPSeatSnapshot | null;
  joinSeat: (playerId: number, seatIndex?: number) => void;
  leaveSeat: () => void;
  setMultiplier: (multiplier: number) => void;
  deployUnit: (unitType: string) => void;
}

export function useSpacePiratesSocket(
  tableId: string,
  playerId: number
): UseSpacePiratesSocketResult {
  const wsRef = useRef<WebSocket | null>(null);
  const latestStateRef = useRef<SPServerStateSnapshot | null>(null);
  const lastHudSyncMsRef = useRef<number>(0);
  const lastHudSnapshotRef = useRef<SPHudState>(INITIAL_HUD);

  const [status, setStatus] = useState<SPConnectionStatus>('connecting');
  const [hud, setHud] = useState<SPHudState>({ ...INITIAL_HUD, tableId });

  useEffect(() => {
    let closedByCleanup = false;
    let reconnectTimer: number | null = null;
    let pendingBuffer: ArrayBuffer | null = null;
    let decodeRafId: number | null = null;

    const flushPendingBuffer = () => {
      decodeRafId = null;
      const buf = pendingBuffer;
      if (!buf || closedByCleanup) return;
      pendingBuffer = null;

      const decoded = decodeSPServerState(buf);
      if (!decoded) return;

      // Always update 60Hz canvas ref immediately (zero React overhead)
      latestStateRef.current = decoded;

      const now = performance.now();
      const prev = lastHudSnapshotRef.current;
      const urgentChange =
        prev.bossActive !== decoded.bossActive ||
        prev.bossMeterCurrent !== decoded.bossMeterCurrent ||
        seatsChangedSignificantly(prev.seats, decoded.seats);

      if (urgentChange || now - lastHudSyncMsRef.current >= 120) {
        const nextHud: SPHudState = {
          tick: decoded.tick,
          tableId: decoded.tableId || tableId,
          arenaWidth: decoded.arenaWidth,
          arenaHeight: decoded.arenaHeight,
          seats: decoded.seats,
          bossMeterCurrent: decoded.bossMeterCurrent,
          bossMeterThreshold: decoded.bossMeterThreshold,
          bossActive: decoded.bossActive,
          bossEscapeTicksRemaining: decoded.bossEscapeTicksRemaining,
        };
        lastHudSyncMsRef.current = now;
        lastHudSnapshotRef.current = nextHud;
        setHud(nextHud);
      }
    };

    const connect = () => {
      if (closedByCleanup) return;
      setStatus('connecting');

      const url = `${WS_BASE_URL}/ws/casino/space-pirates?tableId=${encodeURIComponent(tableId)}`;
      const ws = new WebSocket(url);
      ws.binaryType = 'arraybuffer';
      wsRef.current = ws;

      ws.onopen = () => {
        if (closedByCleanup) {
          ws.close();
          return;
        }
        setStatus('connected');
      };

      ws.onmessage = (event: MessageEvent) => {
        if (!(event.data instanceof ArrayBuffer)) return;
        // Latest-frame coalescing: drop stale queued packets before decoding
        pendingBuffer = event.data;
        if (decodeRafId === null) {
          decodeRafId = window.requestAnimationFrame(flushPendingBuffer);
        }
      };

      ws.onerror = () => {
        if (!closedByCleanup) {
          setStatus('error');
        }
      };

      ws.onclose = () => {
        if (wsRef.current === ws) {
          wsRef.current = null;
        }
        if (!closedByCleanup) {
          setStatus('disconnected');
          reconnectTimer = window.setTimeout(connect, 2000);
        }
      };
    };

    connect();

    return () => {
      closedByCleanup = true;
      pendingBuffer = null;
      if (decodeRafId !== null) {
        window.cancelAnimationFrame(decodeRafId);
        decodeRafId = null;
      }
      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer);
      }
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {
          // ignore close errors during unmount
        }
        wsRef.current = null;
      }
    };
  }, [tableId]);

  const sendBinary = useCallback((payload: Uint8Array<ArrayBuffer>) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }, []);

  const joinSeat = useCallback(
    (pid: number, seatIndex = -1) => {
      sendBinary(encodeJoinSeat(pid, seatIndex));
    },
    [sendBinary]
  );

  const leaveSeat = useCallback(() => {
    sendBinary(encodeLeaveSeat());
  }, [sendBinary]);

  const setMultiplier = useCallback(
    (multiplier: number) => {
      sendBinary(encodeSetMultiplier(multiplier));
    },
    [sendBinary]
  );

  const deployUnit = useCallback(
    (unitType: string) => {
      sendBinary(encodeDeployUnit(unitType));
    },
    [sendBinary]
  );

  const mySeat =
    hud.seats.find((s) => s.occupied && s.playerId === playerId) || null;

  return {
    status,
    latestStateRef,
    hud,
    mySeat,
    joinSeat,
    leaveSeat,
    setMultiplier,
    deployUnit,
  };
}
