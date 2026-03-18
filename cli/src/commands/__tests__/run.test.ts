import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runCommand } from '../run.js';
import { initCommand } from '../init.js';
import { createBoard } from '../../lib/board.js';
import type { Prd } from '@ralfie/shared';

vi.mock('../../lib/agent.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/agent.js')>();
  return {
    ...actual,
    spawnPrintMode: vi.fn().mockResolvedValue({ exitCode: 0, stdout: '', complete: false }),
  };
});

let tmp: string;

const makePrd = (): Prd => ({
  project: 'test',
  description: 'test project',
  items: [
    { id: 'T-1', category: 'A', description: 'task one', steps_to_verify: [], status: 'pending', assigned_to: null, comments: [] },
  ],
});

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'ralfie-run-'));
  process.exitCode = 0;
  vi.clearAllMocks();
  const { spawnPrintMode } = await import('../../lib/agent.js');
  (spawnPrintMode as ReturnType<typeof vi.fn>).mockResolvedValue({ exitCode: 0, stdout: '', complete: false });
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
  process.exitCode = 0;
});

describe('run', () => {
  it('errors on nonexistent board', async () => {
    await initCommand(tmp);

    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    await runCommand('nope', undefined, tmp);
    expect(process.exitCode).toBe(1);
    expect(err.mock.calls.map((c) => c[0]).join('\n')).toContain('not found');
    err.mockRestore();
  });

  it('uses default_iterations from config when not specified', async () => {
    await initCommand(tmp);
    await createBoard('my-board', '# Plan', makePrd(), 'test board', tmp);

    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    await runCommand('my-board', undefined, tmp);

    const allOutput = log.mock.calls.map((c) => c[0]).join('\n');
    expect(allOutput).toContain('Max iterations: 10');
    log.mockRestore();
  });

  it('respects custom iteration count', async () => {
    await initCommand(tmp);
    await createBoard('my-board', '# Plan', makePrd(), 'test board', tmp);

    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    await runCommand('my-board', 3, tmp);

    const allOutput = log.mock.calls.map((c) => c[0]).join('\n');
    expect(allOutput).toContain('Max iterations: 3');
    expect(allOutput).toContain('Iteration 1/3');
    expect(allOutput).toContain('Iteration 3/3');
    log.mockRestore();
  });

  it('sends prompt with prd, progress, plan refs and session id', async () => {
    await initCommand(tmp);
    await createBoard('my-board', '# Plan', makePrd(), 'test board', tmp);

    const { spawnPrintMode } = await import('../../lib/agent.js');
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    await runCommand('my-board', 1, tmp);

    expect(spawnPrintMode).toHaveBeenCalledWith(
      expect.stringMatching(/ralfie-\d+-[a-f0-9]+/),
      tmp,
    );
    const prompt = (spawnPrintMode as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(prompt).toContain('prd.json');
    expect(prompt).toContain('progress.md');
    expect(prompt).toContain('plan.md');
    expect(prompt).toContain('/ralfie-run');
    log.mockRestore();
  });

  it('exits early when agent signals COMPLETE', async () => {
    await initCommand(tmp);
    await createBoard('my-board', '# Plan', makePrd(), 'test board', tmp);

    const { spawnPrintMode } = await import('../../lib/agent.js');
    (spawnPrintMode as ReturnType<typeof vi.fn>).mockResolvedValue({
      exitCode: 0,
      stdout: '<ralfie>COMPLETE</ralfie>',
      complete: true,
    });

    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    await runCommand('my-board', 5, tmp);

    expect(spawnPrintMode).toHaveBeenCalledTimes(1);
    const allOutput = log.mock.calls.map((c) => c[0]).join('\n');
    expect(allOutput).toContain('All items complete');
    log.mockRestore();
  });

  it('prints iteration counter for each iteration', async () => {
    await initCommand(tmp);
    await createBoard('my-board', '# Plan', makePrd(), 'test board', tmp);

    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    await runCommand('my-board', 3, tmp);

    const allOutput = log.mock.calls.map((c) => c[0]).join('\n');
    expect(allOutput).toContain('Iteration 1/3');
    expect(allOutput).toContain('Iteration 2/3');
    expect(allOutput).toContain('Iteration 3/3');
    log.mockRestore();
  });
});
