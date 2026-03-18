import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { acquireLock, releaseLock, isLocked, getLockInfo, clearStaleLocks } from '../lock.js';
import { locksDir } from '../paths.js';

let tmp: string;
const board = 'test-board';
const item = 'ITEM-1';
const session = 'ralfie-123-abc';

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'ralfie-lock-'));
  await mkdir(locksDir(board, tmp), { recursive: true });
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

describe('lock', () => {
  it('acquireLock creates a lock file atomically and returns true', async () => {
    const result = await acquireLock(board, item, session, tmp);
    expect(result).toBe(true);
    const info = await getLockInfo(board, item, tmp);
    expect(info).not.toBeNull();
    expect(info!.session_id).toBe(session);
    expect(info!.acquired_at).toBeTruthy();
  });

  it('acquireLock returns false when lock already exists', async () => {
    await acquireLock(board, item, session, tmp);
    const result = await acquireLock(board, item, 'other-session', tmp);
    expect(result).toBe(false);
  });

  it('releaseLock deletes the lock file', async () => {
    await acquireLock(board, item, session, tmp);
    expect(await isLocked(board, item, tmp)).toBe(true);
    await releaseLock(board, item, tmp);
    expect(await isLocked(board, item, tmp)).toBe(false);
  });

  it('getLockInfo returns session_id and acquired_at from lock file', async () => {
    await acquireLock(board, item, session, tmp);
    const info = await getLockInfo(board, item, tmp);
    expect(info).toEqual({
      session_id: session,
      acquired_at: expect.any(String),
    });
  });

  it('clearStaleLocks removes all lock files and returns count', async () => {
    await acquireLock(board, 'ITEM-1', session, tmp);
    await acquireLock(board, 'ITEM-2', session, tmp);
    await acquireLock(board, 'ITEM-3', session, tmp);
    const count = await clearStaleLocks(board, tmp);
    expect(count).toBe(3);
    expect(await isLocked(board, 'ITEM-1', tmp)).toBe(false);
    expect(await isLocked(board, 'ITEM-2', tmp)).toBe(false);
    expect(await isLocked(board, 'ITEM-3', tmp)).toBe(false);
  });
});
