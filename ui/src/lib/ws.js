import { useEffect, useRef, useState } from 'react';
export function useWs(onEvent) {
    const [connected, setConnected] = useState(false);
    const callbackRef = useRef(onEvent);
    // Keep callback ref current without causing reconnections
    useEffect(() => {
        callbackRef.current = onEvent;
    }, [onEvent]);
    useEffect(() => {
        let ws = null;
        let reconnectTimer = null;
        let disposed = false;
        function connect() {
            if (disposed)
                return;
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const url = `${protocol}//${window.location.host}/ws`;
            ws = new WebSocket(url);
            ws.addEventListener('open', () => {
                if (!disposed)
                    setConnected(true);
            });
            ws.addEventListener('message', (ev) => {
                try {
                    const event = JSON.parse(ev.data);
                    callbackRef.current(event);
                }
                catch {
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
            if (reconnectTimer)
                clearTimeout(reconnectTimer);
            if (ws)
                ws.close();
        };
    }, []);
    return { connected };
}
//# sourceMappingURL=ws.js.map