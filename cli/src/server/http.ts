import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleApi } from './api.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const UI_DIR = join(__dirname, '..', 'ui');

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json',
};

async function serveFile(res: ServerResponse, filePath: string): Promise<boolean> {
  try {
    const info = await stat(filePath);
    if (!info.isFile()) return false;
    const data = await readFile(filePath);
    const ext = extname(filePath);
    const mime = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
    return true;
  } catch {
    return false;
  }
}

async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  // API routes first
  const handled = await handleApi(req, res);
  if (handled) return;

  const url = (req.url ?? '/').split('?')[0];

  // Try serving the exact file from UI_DIR
  const filePath = join(UI_DIR, url);

  // Prevent directory traversal
  if (!filePath.startsWith(UI_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  if (await serveFile(res, filePath)) return;

  // SPA fallback: serve index.html for non-file routes
  const indexPath = join(UI_DIR, 'index.html');
  if (await serveFile(res, indexPath)) return;

  // UI build missing
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('UI build not found. Run "npm run build --workspace=ui" first.');
}

export function createHttpServer() {
  return createServer((req, res) => {
    handleRequest(req, res).catch((err) => {
      console.error('Request error:', err);
      res.writeHead(500);
      res.end('Internal Server Error');
    });
  });
}
