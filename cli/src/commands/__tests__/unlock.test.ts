import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { unlockCommand } from '../unlock.js';
import { initCommand } from '../init.js';
import { createBoard } from '../../lib/board.js';
import { acquireLock } from '../../lib/lock.js';
import type { Prd } from '@ralfie/shared';

let tmp: string;

const makePrd = (): Prd => ({
  project: 'test',
  description: 'test project',
  items: [
    { id: 'T-1', category: 'A', description: 'task one', steps_to_verify: [], status: 'pending', assigned_to: null, started_at: null, completed_at: null, comments: [] },
    { id: 'T-2', category: 'A', description: 'task two', steps_to_verify: [], status: 'pending', assigned_to: null, started_at: null, completed_at: null, comments: [] },
  ],
});

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'ralfie-unlock-'));
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

describe('unlock', () => {
  it('clears all lock files and shows count', async () => {
    await initCommand(tmp);
    await createBoard('my-board', '# Plan', makePrd(), 'test board', tmp);
    await acquireLock('my-board', 'T-1', 'session-1', tmp);
    await acquireLock('my-board', 'T-2', 'session-2', tmp);

    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    await unlockCommand('my-board', tmp);
    expect(log.mock.calls.map((c) => c[0]).join('\n')).toContain('Cleared 2 locks');
    log.mockRestore();
  });

  it('errors on nonexistent board', async () => {
    await initCommand(tmp);

    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    await unlockCommand('nope', tmp);
    expect(process.exitCode).toBe(1);
    expect(err.mock.calls.map((c) => c[0]).join('\n')).toContain('Board not found');
    err.mockRestore();
    process.exitCode = 0;
  });
});
