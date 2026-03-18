import type { IncomingMessage, ServerResponse } from 'node:http';
import { listBoards, getBoard, boardExists } from '../lib/board.js';
import { verifyItem } from '../lib/prd.js';
import { readConfig, writeConfig } from '../lib/config.js';
import { generateSessionId, spawnPrintMode } from '../lib/agent.js';
import { syncClaudeSettings } from '../lib/claude-settings.js';
import { broadcast } from './ws.js';
import { saveRunPid, removeRunPid } from '../lib/run-tracker.js';
import type { RalfieConfig } from '@ralfie/shared';

function json(res: ServerResponse, data: unknown, status = 200): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function notFound(res: ServerResponse, message = 'Not found'): void {
  json(res, { error: message }, 404);
}

function badRequest(res: ServerResponse, message: string): void {
  json(res, { error: message }, 400);
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk: Buffer) => {
      body += chunk.toString();
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function matchRoute(
  url: string,
  pattern: string,
): Record<string, string> | null {
  const urlParts = url.split('/');
  const patternParts = pattern.split('/');

  if (urlParts.length !== patternParts.length) return null;

  const params: Record<string, string> = {};
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(':')) {
      params[patternParts[i].slice(1)] = urlParts[i];
    } else if (patternParts[i] !== urlParts[i]) {
      return null;
    }
  }
  return params;
}

export async function handleApi(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<boolean> {
  const url = req.url?.split('?')[0];
  const method = req.method ?? 'GET';

  if (!url?.startsWith('/api/')) return false;

  try {
    // GET /api/boards
    if (method === 'GET' && url === '/api/boards') {
      const metas = await listBoards();
      const boards = await Promise.all(
        metas.map((m) => getBoard(m.name)),
      );
      json(res, boards);
      return true;
    }

    // GET /api/config
    if (method === 'GET' && url === '/api/config') {
      const config = await readConfig();
      json(res, config);
      return true;
    }

    // PUT /api/config
    if (method === 'PUT' && url === '/api/config') {
      const body = await readBody(req);
      const config = JSON.parse(body) as RalfieConfig;
      await writeConfig(config);
      json(res, { ok: true });
      return true;
    }

    // POST /api/boards/:name/verify/:itemId
    const verifyParams = matchRoute(
      url,
      '/api/boards/:name/verify/:itemId',
    );
    if (method === 'POST' && verifyParams) {
      const { name, itemId } = verifyParams;
      if (!(await boardExists(name))) {
        return notFound(res, `Board '${name}' not found`), true;
      }
      const sessionId = generateSessionId();
      await verifyItem(name, itemId, sessionId);
      json(res, { ok: true });
      return true;
    }

    // POST /api/boards/:name/run
    const runParams = matchRoute(url, '/api/boards/:name/run');
    if (method === 'POST' && runParams) {
      const { name } = runParams;
      if (!(await boardExists(name))) {
        return notFound(res, `Board '${name}' not found`), true;
      }
      const body = await readBody(req);
      const { iterations } = JSON.parse(body || '{}') as {
        iterations?: number;
      };
      const config = await readConfig();
      const maxIterations = iterations ?? config.default_iterations;
      const sessionId = generateSessionId();

      // Start run in background — don't await
      runInBackground(name, maxIterations, sessionId);

      json(res, { ok: true, sessionId, iterations: maxIterations });
      return true;
    }

    // GET /api/boards/:name
    const boardParams = matchRoute(url, '/api/boards/:name');
    if (method === 'GET' && boardParams) {
      const { name } = boardParams;
      if (!(await boardExists(name))) {
        return notFound(res, `Board '${name}' not found`), true;
      }
      const board = await getBoard(name);
      json(res, board);
      return true;
    }

    notFound(res);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    json(res, { error: message }, 500);
  }
  return true;
}

async function runInBackground(
  boardName: string,
  maxIterations: number,
  sessionId: string,
): Promise<void> {
  await syncClaudeSettings();
  await saveRunPid(boardName, sessionId, process.pid);

  broadcast({
    type: 'run:started',
    board: boardName,
    data: { sessionId, maxIterations },
    timestamp: new Date().toISOString(),
  });

  try {
    for (let i = 1; i <= maxIterations; i++) {
      const prompt = [
        `You are ralfie session ${sessionId}, iteration ${i}/${maxIterations}.`,
        `Board: ${boardName}`,
        `Read @.ralfie/boards/${boardName}/prd.json @.ralfie/boards/${boardName}/progress.md @.ralfie/boards/${boardName}/plan.md`,
        'Pick the next pending item, implement it, run feedback loops, update progress and PRD.',
        'If all items are done, output <ralfie>COMPLETE</ralfie>.',
      ].join('\n');

      broadcast({
        type: 'run:iteration',
        board: boardName,
        data: { iteration: i, maxIterations, sessionId },
        timestamp: new Date().toISOString(),
      });

      const result = await spawnPrintMode(prompt);

      if (result.complete || result.exitCode !== 0) break;
    }
  } finally {
    await removeRunPid(boardName, sessionId);

    broadcast({
      type: 'run:completed',
      board: boardName,
      data: { sessionId },
      timestamp: new Date().toISOString(),
    });
  }
}
