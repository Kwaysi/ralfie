import { readFile, writeFile } from 'node:fs/promises';
import { prdPath } from './paths.js';
import { acquireLock, releaseLock } from './lock.js';
import type { Prd, PrdItem, PrdItemComment } from '@ralfie/shared';

export async function readPrd(boardName: string, cwd?: string): Promise<Prd> {
  const raw = await readFile(prdPath(boardName, cwd), 'utf-8');
  return JSON.parse(raw) as Prd;
}

export async function writePrd(boardName: string, prd: Prd, cwd?: string): Promise<void> {
  await writeFile(prdPath(boardName, cwd), JSON.stringify(prd, null, 2) + '\n');
}

function findItem(prd: Prd, itemId: string): PrdItem {
  const item = prd.items.find((i) => i.id === itemId);
  if (!item) throw new Error(`Item not found: ${itemId}`);
  return item;
}

async function withLock<T>(
  boardName: string,
  itemId: string,
  sessionId: string,
  cwd: string | undefined,
  fn: (prd: Prd, item: PrdItem) => T,
): Promise<T> {
  const locked = await acquireLock(boardName, itemId, sessionId, cwd);
  if (!locked) throw new Error(`Item ${itemId} is locked by another session`);
  try {
    const prd = await readPrd(boardName, cwd);
    const item = findItem(prd, itemId);
    const result = fn(prd, item);
    await writePrd(boardName, prd, cwd);
    return result;
  } finally {
    await releaseLock(boardName, itemId, cwd);
  }
}

export async function claimItem(
  boardName: string,
  itemId: string,
  sessionId: string,
  cwd?: string,
): Promise<void> {
  await withLock(boardName, itemId, sessionId, cwd, (_prd, item) => {
    if (item.status === 'in_progress') {
      throw new Error(`Item ${itemId} is already in_progress`);
    }
    item.status = 'in_progress';
    item.assigned_to = sessionId;
  });
}

export async function completeItem(
  boardName: string,
  itemId: string,
  sessionId: string,
  cwd?: string,
): Promise<void> {
  await withLock(boardName, itemId, sessionId, cwd, (_prd, item) => {
    item.status = 'done';
    item.assigned_to = null;
  });
}

export async function failItem(
  boardName: string,
  itemId: string,
  sessionId: string,
  reason: string,
  cwd?: string,
): Promise<void> {
  await withLock(boardName, itemId, sessionId, cwd, (_prd, item) => {
    item.status = 'failed';
    item.assigned_to = null;
    item.comments.push({
      timestamp: new Date().toISOString(),
      session_id: sessionId,
      message: reason,
    });
  });
}

export async function verifyItem(
  boardName: string,
  itemId: string,
  sessionId: string,
  cwd?: string,
): Promise<void> {
  await withLock(boardName, itemId, sessionId, cwd, (_prd, item) => {
    if (item.status !== 'done') {
      throw new Error(`Item ${itemId} must be 'done' to verify, currently '${item.status}'`);
    }
    item.status = 'verified';
  });
}

export async function resetSessionItems(
  boardName: string,
  sessionId: string,
  cwd?: string,
): Promise<number> {
  const prd = await readPrd(boardName, cwd);
  let count = 0;
  for (const item of prd.items) {
    if (item.status === 'in_progress' && item.assigned_to === sessionId) {
      item.status = 'pending';
      item.assigned_to = null;
      count++;
    }
  }
  if (count > 0) {
    await writePrd(boardName, prd, cwd);
  }
  return count;
}

export async function addComment(
  boardName: string,
  itemId: string,
  sessionId: string,
  message: string,
  cwd?: string,
): Promise<void> {
  await withLock(boardName, itemId, sessionId, cwd, (_prd, item) => {
    const comment: PrdItemComment = {
      timestamp: new Date().toISOString(),
      session_id: sessionId,
      message,
    };
    item.comments.push(comment);
  });
}
