import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { listCommand } from '../list.js';
import { initCommand } from '../init.js';
import { createBoard } from '../../lib/board.js';
import type { Prd } from '@ralfie/shared';

let tmp: string;

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'ralfie-list-'));
  await initCommand(tmp);
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

describe('list', () => {
  it('shows "No boards found" when no boards exist', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    await listCommand(tmp);
    expect(log).toHaveBeenCalledWith(expect.stringContaining('No boards found'));
    log.mockRestore();
  });

  it('shows boards with progress bars and counts', async () => {
    const prd: Prd = {
      project: 'test',
      description: 'test project',
      items: [
        { id: 'T-1', category: 'A', description: 'd1', steps_to_verify: [], status: 'done', assigned_to: null, comments: [] },
        { id: 'T-2', category: 'A', description: 'd2', steps_to_verify: [], status: 'in_progress', assigned_to: 'sess-1', comments: [] },
        { id: 'T-3', category: 'A', description: 'd3', steps_to_verify: [], status: 'failed', assigned_to: null, comments: [] },
        { id: 'T-4', category: 'A', description: 'd4', steps_to_verify: [], status: 'pending', assigned_to: null, comments: [] },
        { id: 'T-5', category: 'A', description: 'd5', steps_to_verify: [], status: 'verified', assigned_to: null, comments: [] },
      ],
    };
    await createBoard('my-board', '# Plan', prd, 'A test board', tmp);

    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    await listCommand(tmp);

    const output = log.mock.calls.map((c) => c[0]).join('\n');
    expect(output).toContain('my-board');
    expect(output).toContain('2/5 done');
    expect(output).toContain('1 active');
    expect(output).toContain('1 failed');
    log.mockRestore();
  });
});
