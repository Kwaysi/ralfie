import { readConfig } from '../lib/config.js';
import { createHttpServer } from '../server/http.js';
import { createWsServer, broadcast } from '../server/ws.js';
import { startWatcher, type WatchEvent } from '../server/watcher.js';
import type { WsEventType } from '@ralfie/shared';

const EVENT_MAP: Record<WatchEvent['type'], WsEventType> = {
  prd: 'prd:updated',
  progress: 'progress:updated',
  plan: 'board:updated',
  board: 'board:updated',
  'lock:acquired': 'lock:acquired',
  'lock:released': 'lock:released',
};

export async function serveCommand(): Promise<void> {
  const config = await readConfig();
  const port = config.serve_port;

  const server = createHttpServer();
  createWsServer(server);

  const watchers = await startWatcher((event) => {
    const wsType = EVENT_MAP[event.type];
    broadcast({
      type: wsType,
      board: event.board,
      data: { filename: event.filename },
      timestamp: new Date().toISOString(),
    });
  });

  server.listen(port, () => {
    console.log(`ralfie server listening on http://localhost:${port}`);
    console.log(`WebSocket available at ws://localhost:${port}`);
    console.log('Press Ctrl+C to stop');
  });

  // Cleanup on exit
  const cleanup = () => {
    for (const w of watchers) w.close();
    server.close();
  };
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}
