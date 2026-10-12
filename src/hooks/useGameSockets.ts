// src/hooks/useGameSockets.ts
import { useMemo } from 'react';
import { useSyncExternalStore } from 'react';
import { getGameSocketService } from '../services/gameSocketService';

export const useGameSocket = (serverUrl: string) => {
  const service = useMemo(() => getGameSocketService(serverUrl), [serverUrl]);

  const state = useSyncExternalStore(
    service.subscribe,
    service.getSnapshot,
    service.getSnapshot
  );

  return {
    state,
    sendInput: service.sendInput,
    updateUnitCount: service.updateUnitCount,
    sendTemplateOverride: service.sendTemplateOverride,
  };
};
