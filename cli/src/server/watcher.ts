import { watch, type FSWatcher } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import { join, basename, extname } from 'node:path';
import { boardsDir } from '../lib/paths.js';

export interface WatchEvent {
  type: 'prd' | 'progress' | 'plan' | 'lock:acquired' | 'lock:released' | 'board';
  board: string;
  filename: string;
}

export type WatchCallback = (event: WatchEvent) => void;

function classifyChange(board: string, filename: string): WatchEvent | null {
  if (filename === 'prd.json') return { type: 'prd', board, filename };
  if (filename === 'progress.md') return { type: 'progress', board, filename };
  if (filename === 'plan.md') return { type: 'plan', board, filename };
  return null;
}

function watchBoard(boardPath: string, boardName: string, cb: WatchCallback): FSWatcher[] {
  const watchers: FSWatcher[] = [];

  // Watch board directory for prd.json, progress.md, plan.md changes
  const boardWatcher = watch(boardPath, (eventType, fn) => {
    if (!fn) return;
    const event = classifyChange(boardName, fn);
    if (event) cb(event);
  });
  watchers.push(boardWatcher);

  // Watch locks/ subdirectory for lock file creation/deletion
  const locksPath = join(boardPath, 'locks');
  try {
    const locksWatcher = watch(locksPath, (eventType, fn) => {
      if (!fn || extname(fn) !== '.lock') return;
      // fs.watch 'rename' fires for both create and delete — report as
      // lock:acquired; consumers can check file existence to distinguish.
      cb({ type: 'lock:acquired', board: boardName, filename: fn });
    });
    watchers.push(locksWatcher);
  } catch {
    // locks dir may not exist yet — that's fine
  }

  return watchers;
}

export async function startWatcher(cb: WatchCallback, cwd = process.cwd()): Promise<FSWatcher[]> {
  const watchers: FSWatcher[] = [];
  const boards = boardsDir(cwd);

  // Watch boards directory for new board creation
  const boardsDirWatcher = watch(boards, (eventType, fn) => {
    if (!fn || eventType !== 'rename') return;
    cb({ type: 'board', board: fn, filename: '' });
  });
  watchers.push(boardsDirWatcher);

  // Watch each existing board directory
  let entries: string[];
  try {
    entries = await readdir(boards);
  } catch {
    entries = [];
  }

  for (const entry of entries) {
    const boardPath = join(boards, entry);
    const s = await stat(boardPath).catch(() => null);
    if (!s?.isDirectory()) continue;
    watchers.push(...watchBoard(boardPath, entry, cb));
  }

  return watchers;
}
