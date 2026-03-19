import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { editCommand } from '../edit.js';
import { initCommand } from '../init.js';
import { createBoard } from '../../lib/board.js';
import type { Prd } from '@ralfie/shared';

vi.mock('../../lib/agent.js', () => ({
  spawnInteractive: vi.fn().mockResolvedValue(0),
}));

let tmp: string;

const makePrd = (): Prd => ({
  project: 'test',
  description: 'test project',
  items: [
    { id: 'T-1', category: 'A', description: 'task one', steps_to_verify: [], status: 'pending', assigned_to: null, comments: [] },
  ],
});

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'ralfie-edit-'));
  process.exitCode = 0;
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
  process.exitCode = 0;
});

describe('edit', () => {
  it('errors on nonexistent board', async () => {
    await initCommand(tmp);

    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    await editCommand('nope', tmp);
    expect(process.exitCode).toBe(1);
    expect(err.mock.calls.map((c) => c[0]).join('\n')).toContain('not found');
    err.mockRestore();
  });

  it('spawns interactive agent for existing board', async () => {
    await initCommand(tmp);
    await createBoard('my-board', '# Plan', makePrd(), 'test board', tmp);

    const { spawnInteractive } = await import('../../lib/agent.js');
    await editCommand('my-board', tmp);

    expect(spawnInteractive).toHaveBeenCalledWith(
      expect.stringContaining('/ralf-edit'),
      tmp,
    );
  });

  it('errors when skills not installed', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    await editCommand('my-board', tmp);
    expect(process.exitCode).toBe(1);
    expect(err.mock.calls.map((c) => c[0]).join('\n')).toContain('Skills not installed');
    err.mockRestore();
  });
});
