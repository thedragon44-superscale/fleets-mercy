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
  consumeLatestSnapshot: () => SPServerStateSnapshot | null;
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
  const pendingBufferRef = useRef<ArrayBuffer | null>(null);
  const latestStateRef = useRef<SPServerStateSnapshot | null>(null);
  const lastHudSyncMsRef = useRef<number>(0);
  const lastHudSnapshotRef = useRef<SPHudState>(INITIAL_HUD);
  const hudDirtyRef = useRef<boolean>(false);
  const urgentTimerRef = useRef<number | null>(null);
  const tableIdRef = useRef<string>(tableId);
  tableIdRef.current = tableId;

  const [status, setStatus] = useState<SPConnectionStatus>('connecting');
  const [hud, setHud] = useState<SPHudState>({ ...INITIAL_HUD, tableId });

  const syncHudFromDecoded = useCallback((decoded: SPServerStateSnapshot, force = false) => {
    const now = performance.now();
    const prev = lastHudSnapshotRef.current;
    const urgentChange =
      prev.bossActive !== decoded.bossActive ||
      prev.bossMeterCurrent !== decoded.bossMeterCurrent ||
      seatsChangedSignificantly(prev.seats, decoded.seats);

    if (!force && !urgentChange && now - lastHudSyncMsRef.current < 150) {
      hudDirtyRef.current = true;
      return;
    }

    hudDirtyRef.current = false;
    const nextHud: SPHudState = {
      tick: decoded.tick,
      tableId: decoded.tableId || tableIdRef.current,
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
  }, []);

  /**
   * Single-consumer pull decoder invoked at the top of the viewport's render tick.
   * Eliminates competing double-rAF loops while keeping HUD React updates deferred off the render frame.
   */
  const consumeLatestSnapshot = useCallback((): SPServerStateSnapshot | null => {
    const buf = pendingBufferRef.current;
    if (!buf) return latestStateRef.current;
    pendingBufferRef.current = null;

    const decoded = decodeSPServerState(buf);
    if (!decoded) return latestStateRef.current;

    latestStateRef.current = decoded;

    const prev = lastHudSnapshotRef.current;
    const urgentChange =
      prev.bossActive !== decoded.bossActive ||
      prev.bossMeterCurrent !== decoded.bossMeterCurrent ||
      seatsChangedSignificantly(prev.seats, decoded.seats);

    if (urgentChange) {
      if (urgentTimerRef.current === null) {
        urgentTimerRef.current = window.setTimeout(() => {
          urgentTimerRef.current = null;
          if (latestStateRef.current) {
            syncHudFromDecoded(latestStateRef.current, true);
          }
        }, 0);
      }
    } else {
      hudDirtyRef.current = true;
    }

    return decoded;
  }, [syncHudFromDecoded]);

  useEffect(() => {
    let closedByCleanup = false;
    let reconnectTimer: number | null = null;
    pendingBufferRef.current = null;
    latestStateRef.current = null;
    hudDirtyRef.current = false;
    lastHudSyncMsRef.current = 0;

    // Low-frequency HUD sync & fallback decoder when the viewport hasn't started ticking yet
    const hudIntervalId = window.setInterval(() => {
      if (closedByCleanup) return;
      if (pendingBufferRef.current) {
        const buf = pendingBufferRef.current;
        pendingBufferRef.current = null;
        const decoded = decodeSPServerState(buf);
        if (decoded) {
          latestStateRef.current = decoded;
          syncHudFromDecoded(decoded, true);
          return;
        }
      }
      if (hudDirtyRef.current && latestStateRef.current) {
        syncHudFromDecoded(latestStateRef.current, false);
      }
    }, 150);

    const connect = () => {
      if (closedByCleanup) return;
      setStatus('connecting');

      const url = `${WS_BASE_URL}/ws/casino/space-pirates?tableId=${encodeURIComponent(tableId)}`;
      const ws = new WebSocket(url);
      ws.binaryType = 'arraybuffer';
      wsRef.current = ws;

      ws.onopen = () => {
        if (closedByCleanup || wsRef.current !== ws) {
          ws.close();
          return;
        }
        setStatus('connected');
      };

      ws.onmessage = (event: MessageEvent) => {
        if (closedByCleanup || wsRef.current !== ws) return;
        if (!(event.data instanceof ArrayBuffer)) return;
        // O(1) latest-frame coalescing; decoded once per render tick by consumeLatestSnapshot()
        pendingBufferRef.current = event.data;
      };

      ws.onerror = () => {
        if (!closedByCleanup && wsRef.current === ws) {
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
      pendingBufferRef.current = null;
      window.clearInterval(hudIntervalId);
      if (urgentTimerRef.current !== null) {
        window.clearTimeout(urgentTimerRef.current);
        urgentTimerRef.current = null;
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
  }, [tableId, syncHudFromDecoded]);

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
    consumeLatestSnapshot,
    hud,
    mySeat,
    joinSeat,
    leaveSeat,
    setMultiplier,
    deployUnit,
  };
}
