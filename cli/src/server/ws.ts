import { type Server } from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';
import type { WsEvent } from '@ralfie/shared';

let wss: WebSocketServer | null = null;

export function createWsServer(server: Server): WebSocketServer {
  wss = new WebSocketServer({ server });
  return wss;
}

export function broadcast(event: WsEvent): void {
  if (!wss) return;
  const payload = JSON.stringify(event);
  for (const client of wss.clients) {
    if (client.readyState === 1 /* WebSocket.OPEN */) {
      client.send(payload);
    }
  }
}
