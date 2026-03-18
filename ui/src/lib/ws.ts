import { useEffect, useRef, useState, useCallback } from 'react';
import type { WsEvent } from '@ralfie/shared';

export function useWs(onEvent: (event: WsEvent) => void): { connected: boolean } {
  const [connected, setConnected] = useState(false);
  const callbackRef = useRef(onEvent);

  // Keep callback ref current without causing reconnections
  useEffect(() => {
    callbackRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;

    function connect() {
      if (disposed) return;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const url = `${protocol}//${window.location.host}/ws`;
      ws = new WebSocket(url);

      ws.addEventListener('open', () => {
        if (!disposed) setConnected(true);
      });

      ws.addEventListener('message', (ev) => {
        try {
          const event: WsEvent = JSON.parse(ev.data as string);
          callbackRef.current(event);
        } catch {
          // ignore malformed messages
        }
      });

      ws.addEventListener('close', () => {
        if (!disposed) {
          setConnected(false);
          reconnectTimer = setTimeout(connect, 2000);
        }
      });

      ws.addEventListener('error', () => {
        // error is always followed by close, which triggers reconnect
      });
    }

    connect();

    return () => {
      disposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  }, []);

  return { connected };
}
