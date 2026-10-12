// src/services/gameSocketService.ts
import { parseServerMessage, serializePlayerAction, serializeUnitCounts } from '../parsers/jsonParser';

export class GameSocketService {
  private ws: WebSocket | null = null;
  private serverState: any = null;
  private listeners: Set<() => void> = new Set();
  private url: string;

  constructor(url: string) {
    this.url = url;
    this.connect();
  }

  private connect() {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log(`[NETWORK] Connected to Go Server at ${this.url}`);
    };

    this.ws.onmessage = (event: MessageEvent) => {
      const parsedData = parseServerMessage(event.data);
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

  public getSnapshot = () => {
    return this.serverState;
  };

  public sendInput = (actionParams: {
    keys: { w?: boolean; s?: boolean; a?: boolean; d?: boolean };
    angle: number;
    isFiring: boolean;
    currentId: string | null;
    reset?: boolean;
    sandboxCounts?: Record<string, number>;
  }) => {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const payload = serializePlayerAction(actionParams);
      this.ws.send(payload);
    }
  };

  public updateUnitCount = (counts: Record<string, number>) => {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const payload = serializeUnitCounts(counts);
      this.ws.send(payload);
    }
  };

  public sendTemplateOverride = (unitType: string, overrides: any) => {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const payload = JSON.stringify({
        templateOverride: {
          type: unitType,
          config: overrides
        }
      });
      this.ws.send(payload);
    }
  };
}

// Global cache to maintain persistent socket connections per endpoint URL across component mounts
const serviceCache = new Map<string, GameSocketService>();

export function getGameSocketService(url: string): GameSocketService {
  if (!serviceCache.has(url)) {
    serviceCache.set(url, new GameSocketService(url));
  }
  return serviceCache.get(url)!;
}
