// src/services/gameSocketService.ts
import { unpackServerBinaryMessage, serializeClientInput, ServerStateSnapshot } from '../parsers/binaryCodec';
import { useSettingsStore } from '../config/settingsStore';

export class GameSocketService {
  private ws: WebSocket | null = null;
  private serverState: ServerStateSnapshot | null = null;
  private listeners: Set<() => void> = new Set();
  private url: string;

  constructor(url: string) {
    this.url = url;
    this.connect();
  }

  private connect() {
    this.ws = new WebSocket(this.url);
    this.ws.binaryType = 'arraybuffer';

    this.ws.onopen = () => {
      console.log(`[NETWORK] Connected to Go Server (Binary Mode) at ${this.url}`);
    };

    this.ws.onmessage = (event: MessageEvent) => {
      let parsedData = null;
      if (event.data instanceof ArrayBuffer) {
        parsedData = unpackServerBinaryMessage(event.data);
      }
      if (parsedData !== null) {
        this.serverState = parsedData;
        this.notifyListeners();
      }
    };

    this.ws.onclose = () => {
      console.warn('[NETWORK] Connection lost. Reconnecting in 3s...');
      setTimeout(() => this.connect(), 3000);
    };

    this.ws.onerror = (error) => {
      console.error('[NETWORK] WebSocket error encountered:', error);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener());
  }

  public subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  public getSnapshot = (): ServerStateSnapshot | null => {
    return this.serverState;
  };

  // --- PURE BINARY UPSTREAM SENDERS ---

  public sendInput = (actionParams: {
    keys?: { w?: boolean; s?: boolean; a?: boolean; d?: boolean };
    angle?: number;
    isFiring?: boolean;
    currentId?: string | null;
    reset?: boolean;
    deploy?: string;
    sandboxSpawn?: string;
    sandboxRemove?: string;
    spawnX?: number;
    spawnY?: number;
    sandboxCounts?: Record<string, number>;
  }) => {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const binaryPayload = serializeClientInput(actionParams);
      this.ws.send(binaryPayload);
    }
  };

  public updateUnitCount = (counts: Record<string, number>) => {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const binaryPayload = serializeClientInput({ sandboxCounts: counts });
      this.ws.send(binaryPayload);
    }
  };

  public sendTemplateOverride = (unitType: string, overrides: any) => {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const binaryPayload = serializeClientInput({
        templateOverride: {
          type: unitType,
          config: overrides,
        },
      });
      this.ws.send(binaryPayload);
    }
  };

  public sendUnitGrouping = (groupingParams: {
    unitId: string;
    battalionId: number;
    squadId: number;
    isSquadLeader: boolean;
  }) => {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const binaryPayload = serializeClientInput({
        unitGrouping: groupingParams,
      });
      this.ws.send(binaryPayload);
    }
  };
}

// Global cache to maintain persistent socket connections across component mounts
const serviceCache = new Map<string, GameSocketService>();

export function getGameSocketService(url: string): GameSocketService {
  if (!serviceCache.has(url)) {
    serviceCache.set(url, new GameSocketService(url));
  }
  return serviceCache.get(url)!;
}
