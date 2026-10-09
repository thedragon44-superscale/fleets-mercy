// src/hooks/useGameSocket.ts
import { useEffect, useRef } from 'react';

export const useGameSocket = (serverUrl: string, onStateUpdate: (data: ArrayBuffer) => void) => {
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Connect to Raspberry Pi 5 Go Backend
    ws.current = new WebSocket(serverUrl);
    ws.current.binaryType = 'arraybuffer'; // Fast binary stream for network syncing

    ws.current.onopen = () => {
      console.log(`[NETWORK] Connected to Go Server at ${serverUrl}`);
    };

    ws.current.onmessage = (event: MessageEvent) => {
      onStateUpdate(event.data);
    };

    ws.current.onclose = () => {
      console.warn('[NETWORK] Connection lost. Reconnecting...');
    };

    return () => {
      ws.current?.close();
    };
  }, [serverUrl, onStateUpdate]);

  const sendInput = (inputPayload: object) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(inputPayload));
    }
  };

  return { sendInput };
};
