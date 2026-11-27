// src/hooks/useGameSockets.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { ServerStateSnapshot } from '../parsers/binaryCodec';
import { ClientInputParams, GameSocketService, SandboxCountItem } from '../services/gameSocketService';

const UI_SYNC_INTERVAL_MS = 250; // ~4Hz React UI updates (zero 60Hz React re-renders)

function computeUiSignature(snap: ServerStateSnapshot): string {
  const units = snap.units || [];
  let shieldSum = 0;
  let metaHash = 0;
  for (let i = 0; i < units.length; i++) {
    const u = units[i];
    if (u.shields) {
      shieldSum +=
        Math.round(u.shields.front * 10) +
        Math.round(u.shields.rear * 10) +
        Math.round(u.shields.port * 10) +
        Math.round(u.shields.starboard * 10);
    }
    metaHash = (metaHash * 31 + (u.squadId || 0) * 7 + (u.battalionId || 0) * 3 + (u.isSquadLeader ? 1 : 0)) | 0;
  }
  return `${units.length}|${snap.projectiles?.length || 0}|${shieldSum}|${metaHash}`;
}

export const useGameSocket = (serverUrl: string) => {
  const serviceRef = useRef<GameSocketService | null>(null);
  const latestStateRef = useRef<ServerStateSnapshot | null>(null);
  const lastUiSyncRef = useRef<number>(0);
  const lastUnitCountRef = useRef<number>(-1);
  const lastUiSigRef = useRef<string>('');

  const [uiState, setUiState] = useState<ServerStateSnapshot | null>(null);
  const [tickMs, setTickMs] = useState<number>(16.7);

  useEffect(() => {
    let closedByCleanup = false;
    let uiDirty = false;
    let urgentTimer: number | null = null;

    latestStateRef.current = null;
    lastUiSyncRef.current = 0;
    lastUnitCountRef.current = -1;
    lastUiSigRef.current = '';
    setUiState(null);

    const flushUi = (svc: GameSocketService, force = false) => {
      if (closedByCleanup) return;
      const snap = latestStateRef.current;
      if (!snap) return;
      uiDirty = false;
      lastUiSyncRef.current = performance.now();
      lastUnitCountRef.current = snap.units.length;

      const nextSig = computeUiSignature(snap);
      if (force || nextSig !== lastUiSigRef.current) {
        lastUiSigRef.current = nextSig;
        setUiState(snap);
      }

      const nextTickMs = Math.round(svc.getTickMs() * 2) / 2; // 0.5ms quantization avoids noisy HUD re-renders
      setTickMs((prev) => (prev === nextTickMs ? prev : nextTickMs));
    };

    const svc = new GameSocketService(serverUrl, (snap) => {
      if (closedByCleanup) return;
      latestStateRef.current = snap;

      // Never trigger React setState synchronously inside the 60Hz render loop.
      const unitCount = snap.units.length;
      const urgent = lastUnitCountRef.current !== unitCount || lastUiSyncRef.current === 0;
      if (urgent) {
        if (urgentTimer === null) {
          urgentTimer = window.setTimeout(() => {
            urgentTimer = null;
            flushUi(svc, true);
          }, 0);
        }
      } else {
        uiDirty = true;
      }
    });
    serviceRef.current = svc;

    const uiIntervalId = window.setInterval(() => {
      if (closedByCleanup) return;
      if (uiDirty) {
        flushUi(svc, false);
      }
    }, UI_SYNC_INTERVAL_MS);

    return () => {
      closedByCleanup = true;
      window.clearInterval(uiIntervalId);
      if (urgentTimer !== null) {
        window.clearTimeout(urgentTimer);
        urgentTimer = null;
      }
      svc.close();
      if (serviceRef.current === svc) {
        serviceRef.current = null;
      }
    };
  }, [serverUrl]);

  const consumeLatestSnapshot = useCallback((): ServerStateSnapshot | null => {
    return serviceRef.current?.consumeLatestSnapshot() ?? null;
  }, []);

  const getLatestSnapshotTimestamp = useCallback((): number => {
    return serviceRef.current?.getLatestSnapshotTimestamp() ?? 0;
  }, []);

  const sendInput = useCallback((params: ClientInputParams): boolean => {
    return serviceRef.current?.sendInput(params) ?? false;
  }, []);

  const updateUnitCount = useCallback((counts: SandboxCountItem[]) => {
    serviceRef.current?.updateUnitCount(counts);
  }, []);

  const sendTemplateOverride = useCallback((unitType: string, overrides: any) => {
    serviceRef.current?.sendTemplateOverride(unitType, overrides);
  }, []);

  const sendUnitGrouping = useCallback(
    (groupingParams: {
      unitId: string;
      battalionId: number;
      squadId: number;
      isSquadLeader: boolean;
    }) => {
      serviceRef.current?.sendUnitGrouping(groupingParams);
    },
    []
  );

  return {
    state: uiState,
    latestStateRef,
    consumeLatestSnapshot,
    getLatestSnapshotTimestamp,
    tickMs,
    sendInput,
    updateUnitCount,
    sendTemplateOverride,
    sendUnitGrouping,
  };
};
