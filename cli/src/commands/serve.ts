import { readConfig } from '../lib/config.js';
import { createHttpServer } from '../server/http.js';
import { createWsServer, broadcast, closeAllConnections } from '../server/ws.js';
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

  let shutdownInProgress = false;

  const cleanup = () => {
    if (shutdownInProgress) {
      // Second ctrl+c — force kill immediately
      console.log('Force killing...');
      process.exit(1);
    }
    shutdownInProgress = true;
    console.log('Shutting down...');

    // Close file watchers
    for (const w of watchers) w.close();

    // Terminate all WebSocket connections
    closeAllConnections();

    // Close the HTTP server and exit
    server.close(() => {
      console.log('Server stopped.');
      process.exit(0);
    });

    // Force exit if server.close() takes too long
    setTimeout(() => {
      console.log('Shutdown timed out, force exiting.');
      process.exit(1);
    }, 2000).unref();
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}
