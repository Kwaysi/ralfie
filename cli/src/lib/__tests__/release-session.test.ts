import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { acquireLock, isLocked, releaseSessionLocks } from '../lock.js';
import { readPrd, resetSessionItems } from '../prd.js';
import { locksDir, prdPath } from '../paths.js';
import type { Prd } from '@ralfie/shared';

let tmp: string;
const board = 'test-board';
const sessionA = 'ralfie-111-aaa';
const sessionB = 'ralfie-222-bbb';

function makePrd(): Prd {
  return {
    project: 'test',
    description: 'test project',
    items: [
      { id: 'ITEM-1', category: 'A', description: 'one', steps_to_verify: [], status: 'in_progress', assigned_to: sessionA, comments: [] },
      { id: 'ITEM-2', category: 'A', description: 'two', steps_to_verify: [], status: 'in_progress', assigned_to: sessionB, comments: [] },
      { id: 'ITEM-3', category: 'A', description: 'three', steps_to_verify: [], status: 'in_progress', assigned_to: sessionA, comments: [] },
      { id: 'ITEM-4', category: 'A', description: 'four', steps_to_verify: [], status: 'done', assigned_to: null, comments: [] },
    ],
  };
}

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'ralfie-release-'));
  const boardDir = join(tmp, '.ralfie', 'boards', board);
  await mkdir(boardDir, { recursive: true });
  await mkdir(locksDir(board, tmp), { recursive: true });
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

describe('releaseSessionLocks', () => {
  it('deletes only locks matching the given sessionId and returns count', async () => {
    await acquireLock(board, 'ITEM-1', sessionA, tmp);
    await acquireLock(board, 'ITEM-2', sessionB, tmp);
    await acquireLock(board, 'ITEM-3', sessionA, tmp);

    const count = await releaseSessionLocks(board, sessionA, tmp);
    expect(count).toBe(2);
    expect(await isLocked(board, 'ITEM-1', tmp)).toBe(false);
    expect(await isLocked(board, 'ITEM-2', tmp)).toBe(true);
    expect(await isLocked(board, 'ITEM-3', tmp)).toBe(false);
  });

  it('returns 0 when no locks exist', async () => {
    const count = await releaseSessionLocks(board, sessionA, tmp);
    expect(count).toBe(0);
  });
});

describe('resetSessionItems', () => {
  it('resets in_progress items assigned to sessionId back to pending', async () => {
    await writeFile(prdPath(board, tmp), JSON.stringify(makePrd(), null, 2) + '\n');

    const count = await resetSessionItems(board, sessionA, tmp);
    expect(count).toBe(2);

    const prd = await readPrd(board, tmp);
    expect(prd.items[0].status).toBe('pending');
    expect(prd.items[0].assigned_to).toBeNull();
    expect(prd.items[2].status).toBe('pending');
    expect(prd.items[2].assigned_to).toBeNull();
    // sessionB item unchanged
    expect(prd.items[1].status).toBe('in_progress');
    expect(prd.items[1].assigned_to).toBe(sessionB);
    // done item unchanged
    expect(prd.items[3].status).toBe('done');
  });

  it('returns 0 and does not write when no items match', async () => {
    await writeFile(prdPath(board, tmp), JSON.stringify(makePrd(), null, 2) + '\n');
    const count = await resetSessionItems(board, 'ralfie-999-zzz', tmp);
    expect(count).toBe(0);
  });
});
