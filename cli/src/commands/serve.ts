import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { readConfig, writeConfig } from '../lib/config.js';
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

export async function serveCommand(options: { daemon?: boolean } = {}): Promise<void> {
  if (options.daemon) {
    return startDaemon();
  }

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

  server.listen(port, async () => {
    // Write PID to config so other processes can find us
    config.serve_pid = process.pid;
    await writeConfig(config);

    console.log(`ralfie server listening on http://localhost:${port} (pid: ${process.pid})`);
    console.log(`WebSocket available at ws://localhost:${port}`);
    console.log('Press Ctrl+C to stop');
  });

  let shutdownInProgress = false;

  const cleanup = async () => {
    if (shutdownInProgress) {
      // Second ctrl+c — force kill immediately
      console.log('Force killing...');
      process.exit(1);
    }
    shutdownInProgress = true;
    console.log('Shutting down...');

    // Clear PID from config
    try {
      config.serve_pid = null;
      await writeConfig(config);
    } catch {
      // Best effort — don't block shutdown if config write fails
    }

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

async function startDaemon(): Promise<void> {
  const config = await readConfig();
  const port = config.serve_port;

  // Fork a detached child running this same module without the --daemon flag
  const modulePath = fileURLToPath(import.meta.url);
  const entryPath = path.resolve(path.dirname(modulePath), '..', 'index.js');

  const child = fork(entryPath, ['serve'], {
    detached: true,
    stdio: 'ignore',
    cwd: process.cwd(),
  });

  // Wait briefly for the child to start and write its PID to config
  child.unref();

  // Write the child PID to config
  config.serve_pid = child.pid ?? null;
  await writeConfig(config);

  console.log(`ralfie server started in background (pid: ${child.pid}, port: ${port})`);
}
