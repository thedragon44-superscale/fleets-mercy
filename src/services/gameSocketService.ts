// src/services/gameSocketService.ts
import {
  unpackServerBinaryMessage,
  serializeClientInput,
  ServerStateSnapshot,
} from '../parsers/binaryCodec';

export interface SandboxCountItem {
  unitType: string;
  count: number;
  ownerId: string;
}

export interface ClientInputParams {
  keys?: { w?: boolean; s?: boolean; a?: boolean; d?: boolean };
  angle?: number;
  isFiring?: boolean;
  currentId?: string | null;
  reset?: boolean;
  deploy?: string;
  sandboxSpawn?: string;
  sandboxSpawnOwner?: string;
  sandboxRemove?: string;
  spawnX?: number;
  spawnY?: number;
  isPaused?: boolean;
  timeScale?: number;
  sandboxCounts?: SandboxCountItem[];
  unitGrouping?: {
    unitId: string;
    battalionId: number;
    squadId: number;
    isSquadLeader: boolean;
  };
}

/**
 * High-performance binary WebSocket client that decouples 60Hz network ingestion
 * from React UI renders and coalesces backlogged frames to always decode only the latest state.
 */
export class GameSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private closed = false;
  private reconnectTimer: number | null = null;

  // Latest-frame coalescing buffer (ws.onmessage never blocks decoding a stale backlog)
  private pendingBuffer: ArrayBuffer | null = null;
  private pendingTimestamp = 0;
  private latestSnapshot: ServerStateSnapshot | null = null;
  private latestSnapshotTimestamp = 0;

  // Rolling average server tick interval (ms)
  private lastMessageTime = 0;
  private avgTickMs = 16.0;

  // Optional callback fired on frame arrival (used to notify low-frequency HUD only)
  private onFrameDecoded: ((snap: ServerStateSnapshot) => void) | null = null;

  constructor(url: string, onFrameDecoded?: (snap: ServerStateSnapshot) => void) {
    this.url = url;
    this.onFrameDecoded = onFrameDecoded ?? null;
    this.connect();
  }

  private connect() {
    if (this.closed) return;
    const ws = new WebSocket(this.url);
    ws.binaryType = 'arraybuffer';
    this.ws = ws;

    ws.onopen = () => {
      if (this.closed) {
        ws.close();
        return;
      }
      console.log(`[NETWORK] Connected to Go Server (Binary Mode) at ${this.url}`);
      this.lastMessageTime = 0;
    };

    ws.onmessage = (event: MessageEvent) => {
      if (!(event.data instanceof ArrayBuffer)) return;

      const now = performance.now();
      if (this.lastMessageTime > 0) {
        const delta = now - this.lastMessageTime;
        if (delta > 0 && delta < 1000) {
          this.avgTickMs = this.avgTickMs * 0.9 + delta * 0.1;
        }
      }
      this.lastMessageTime = now;

      // Coalesce: overwrite any undecoded stale frame in O(1) and record true arrival timestamp
      this.pendingBuffer = event.data;
      this.pendingTimestamp = now;
    };

    ws.onclose = () => {
      if (this.ws === ws) this.ws = null;
      if (!this.closed) {
        console.warn('[NETWORK] Connection lost. Reconnecting in 3s...');
        this.reconnectTimer = window.setTimeout(() => this.connect(), 3000);
      }
    };

    ws.onerror = (error) => {
      if (!this.closed) {
        console.error('[NETWORK] WebSocket error encountered:', error);
      }
    };
  }

  /**
   * Called once per Pixi render frame. Decodes ONLY the newest arrived binary buffer
   * (dropping any stale backlog frames) and returns the updated snapshot if a new frame arrived.
   */
  public consumeLatestSnapshot = (): ServerStateSnapshot | null => {
    const buf = this.pendingBuffer;
    if (!buf) return null;
    const arrivedAt = this.pendingTimestamp;
    this.pendingBuffer = null;

    const decoded = unpackServerBinaryMessage(buf);
    if (!decoded) return null;
    this.latestSnapshot = decoded;
    this.latestSnapshotTimestamp = arrivedAt;
    this.onFrameDecoded?.(decoded);
    return decoded;
  };

  public getLatestSnapshot = (): ServerStateSnapshot | null => {
    return this.latestSnapshot;
  };

  public getLatestSnapshotTimestamp = (): number => {
    return this.latestSnapshotTimestamp;
  };

  public getTickMs = (): number => {
    return this.avgTickMs;
  };

  public close = (): void => {
    this.closed = true;
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore close errors during teardown
      }
      this.ws = null;
    }
    this.pendingBuffer = null;
  };

  // --- PURE BINARY UPSTREAM SENDERS ---

  public sendInput = (actionParams: ClientInputParams): boolean => {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const binaryPayload = serializeClientInput(actionParams);
      this.ws.send(binaryPayload);
      return true;
    }
    return false;
  };

  public updateUnitCount = (counts: SandboxCountItem[]) => {
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
