import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { verifyCommand } from '../verify.js';
import { initCommand } from '../init.js';
import { createBoard } from '../../lib/board.js';
import type { Prd } from '@ralfie/shared';

let tmp: string;

const makePrd = (status: 'done' | 'pending' | 'in_progress'): Prd => ({
  project: 'test',
  description: 'test project',
  items: [
    { id: 'T-1', category: 'A', description: 'task one', steps_to_verify: [], status, assigned_to: null, started_at: null, completed_at: null, comments: [] },
  ],
});

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'ralfie-verify-'));
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

describe('verify', () => {
  it('verifies a done item and changes its status to verified', async () => {
    await initCommand(tmp);
    await createBoard('my-board', '# Plan', makePrd('done'), 'test board', tmp);

    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    await verifyCommand('my-board', 'T-1', tmp);
    expect(log.mock.calls.map((c) => c[0]).join('\n')).toContain('Verified');
    log.mockRestore();
  });

  it('errors when verifying a non-done item', async () => {
    await initCommand(tmp);
    await createBoard('my-board', '# Plan', makePrd('pending'), 'test board', tmp);

    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    await verifyCommand('my-board', 'T-1', tmp);
    expect(process.exitCode).toBe(1);
    expect(err.mock.calls.map((c) => c[0]).join('\n')).toContain("must be 'done' to verify");
    err.mockRestore();
    process.exitCode = 0;
  });

  it('errors on nonexistent board', async () => {
    await initCommand(tmp);

    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    await verifyCommand('nope', 'T-1', tmp);
    expect(process.exitCode).toBe(1);
    expect(err.mock.calls.map((c) => c[0]).join('\n')).toContain('Board not found');
    err.mockRestore();
    process.exitCode = 0;
  });
});
