import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runCommand } from '../run.js';
import { initCommand } from '../init.js';
import { createBoard } from '../../lib/board.js';
import { runsDir } from '../../lib/paths.js';
import type { Prd } from '@ralfie/shared';

vi.mock('../../lib/agent.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/agent.js')>();
  return {
    ...actual,
    spawnPrintMode: vi.fn().mockResolvedValue({ exitCode: 0, stdout: '', result: '', complete: false, sessionId: null }),
    spawnResume: vi.fn().mockResolvedValue({ exitCode: 0, stdout: '', result: '', complete: false, sessionId: null }),
  };
});

vi.mock('../../lib/git.js', () => ({
  isDirty: vi.fn().mockResolvedValue(false),
  isGhInstalled: vi.fn().mockResolvedValue(true),
  nextBranchName: vi.fn().mockResolvedValue('my-board-1'),
  createAndCheckoutBranch: vi.fn().mockResolvedValue(undefined),
  push: vi.fn().mockResolvedValue(undefined),
  createPr: vi.fn().mockResolvedValue('https://github.com/test/repo/pull/1'),
  getDefaultBranch: vi.fn().mockResolvedValue('main'),
}));

vi.mock('../../lib/prd.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/prd.js')>();
  return {
    ...actual,
    readPrd: vi.fn().mockResolvedValue({
      project: 'test',
      description: 'test project description',
      items: [
        { id: 'T-1', category: 'A', description: 'task one', steps_to_verify: [], status: 'done', assigned_to: null, started_at: null, completed_at: null, comments: [] },
      ],
    }),
  };
});

let tmp: string;

const makePrd = (): Prd => ({
  project: 'test',
  description: 'test project',
  items: [
    { id: 'T-1', category: 'A', description: 'task one', steps_to_verify: [], status: 'pending', assigned_to: null, started_at: null, completed_at: null, comments: [] },
  ],
});

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'ralfie-run-'));
  process.exitCode = 0;
  vi.clearAllMocks();
  const { spawnPrintMode, spawnResume } = await import('../../lib/agent.js');
  // Default: implementor succeeds, reviewer returns LGTM — review passes on first round
  (spawnPrintMode as ReturnType<typeof vi.fn>).mockResolvedValue({ exitCode: 0, stdout: '', result: '<ralfie>LGTM</ralfie>', complete: false, sessionId: 'test-session-1' });
  (spawnResume as ReturnType<typeof vi.fn>).mockResolvedValue({ exitCode: 0, stdout: '', result: '', complete: false, sessionId: 'test-session-1' });
  const { isDirty, isGhInstalled, nextBranchName, createAndCheckoutBranch, push, createPr, getDefaultBranch } = await import('../../lib/git.js');
  (isDirty as ReturnType<typeof vi.fn>).mockResolvedValue(false);
  (isGhInstalled as ReturnType<typeof vi.fn>).mockResolvedValue(true);
  (nextBranchName as ReturnType<typeof vi.fn>).mockResolvedValue('my-board-1');
  (createAndCheckoutBranch as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  (push as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  (createPr as ReturnType<typeof vi.fn>).mockResolvedValue('https://github.com/test/repo/pull/1');
  (getDefaultBranch as ReturnType<typeof vi.fn>).mockResolvedValue('main');
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

  it('sends implementor prompt with prd, progress, plan refs and session id', async () => {
    await initCommand(tmp);
    await createBoard('my-board', '# Plan', makePrd(), 'test board', tmp);

    const { spawnPrintMode } = await import('../../lib/agent.js');
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    await runCommand('my-board', 1, tmp);

    // First call is the implementor
    const implPrompt = (spawnPrintMode as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(implPrompt).toContain('prd.json');
    expect(implPrompt).toContain('progress.md');
    expect(implPrompt).toContain('plan.md');
    expect(implPrompt).toContain('/ralf-run');
    expect(implPrompt).toMatch(/ralfie-\d+-[a-f0-9]+/);
    log.mockRestore();
  });

  it('exits early when agent signals COMPLETE', async () => {
    await initCommand(tmp);
    await createBoard('my-board', '# Plan', makePrd(), 'test board', tmp);

    const { spawnPrintMode } = await import('../../lib/agent.js');
    (spawnPrintMode as ReturnType<typeof vi.fn>).mockResolvedValue({
      exitCode: 0,
      stdout: '',
      result: '<ralfie>COMPLETE</ralfie>',
      complete: true,
      sessionId: null,
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

  it('creates PID file at start and removes on completion', async () => {
    await initCommand(tmp);
    await createBoard('my-board', '# Plan', makePrd(), 'test board', tmp);

    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    await runCommand('my-board', 1, tmp);

    // PID file should be cleaned up after run completes
    const dir = runsDir('my-board', tmp);
    let files: string[];
    try {
      files = await readdir(dir);
    } catch {
      files = [];
    }
    const pidFiles = files.filter((f) => f.endsWith('.pid'));
    expect(pidFiles).toHaveLength(0);
    log.mockRestore();
  });

  it('removes PID file when agent exits with error', async () => {
    await initCommand(tmp);
    await createBoard('my-board', '# Plan', makePrd(), 'test board', tmp);

    const { spawnPrintMode } = await import('../../lib/agent.js');
    (spawnPrintMode as ReturnType<typeof vi.fn>).mockResolvedValue({
      exitCode: 1,
      stdout: '',
      result: '',
      complete: false,
      sessionId: null,
    });

    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    await runCommand('my-board', 5, tmp);

    // PID file should be cleaned up even on error
    const dir = runsDir('my-board', tmp);
    let files: string[];
    try {
      files = await readdir(dir);
    } catch {
      files = [];
    }
    const pidFiles = files.filter((f) => f.endsWith('.pid'));
    expect(pidFiles).toHaveLength(0);
    err.mockRestore();
    log.mockRestore();
  });

  it('aborts with error when working tree is dirty', async () => {
    await initCommand(tmp);
    await createBoard('my-board', '# Plan', makePrd(), 'test board', tmp);

    const { isDirty } = await import('../../lib/git.js');
    (isDirty as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    await runCommand('my-board', 1, tmp);

    expect(process.exitCode).toBe(1);
    const allErr = err.mock.calls.map((c) => c[0]).join('\n');
    expect(allErr).toContain('uncommitted changes');
    err.mockRestore();
    log.mockRestore();
  });

  it('does not spawn agent when working tree is dirty', async () => {
    await initCommand(tmp);
    await createBoard('my-board', '# Plan', makePrd(), 'test board', tmp);

    const { isDirty } = await import('../../lib/git.js');
    (isDirty as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    const { spawnPrintMode } = await import('../../lib/agent.js');
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    await runCommand('my-board', 1, tmp);

    expect(spawnPrintMode).not.toHaveBeenCalled();
    err.mockRestore();
    log.mockRestore();
  });

  it('creates a new branch before starting the run', async () => {
    await initCommand(tmp);
    await createBoard('my-board', '# Plan', makePrd(), 'test board', tmp);

    const { nextBranchName, createAndCheckoutBranch } = await import('../../lib/git.js');
    (nextBranchName as ReturnType<typeof vi.fn>).mockResolvedValue('my-board-1');

    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    await runCommand('my-board', 1, tmp);

    expect(nextBranchName).toHaveBeenCalledWith('my-board', tmp);
    expect(createAndCheckoutBranch).toHaveBeenCalledWith('my-board-1', tmp);
    const allOutput = log.mock.calls.map((c) => c[0]).join('\n');
    expect(allOutput).toContain('Created branch: my-board-1');
    log.mockRestore();
  });

  it('increments branch number when prior branches exist', async () => {
    await initCommand(tmp);
    await createBoard('my-board', '# Plan', makePrd(), 'test board', tmp);

    const { nextBranchName, createAndCheckoutBranch } = await import('../../lib/git.js');
    (nextBranchName as ReturnType<typeof vi.fn>).mockResolvedValue('my-board-3');

    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    await runCommand('my-board', 1, tmp);

    expect(createAndCheckoutBranch).toHaveBeenCalledWith('my-board-3', tmp);
    const allOutput = log.mock.calls.map((c) => c[0]).join('\n');
    expect(allOutput).toContain('Created branch: my-board-3');
    log.mockRestore();
  });

  it('aborts with error when gh CLI is not installed', async () => {
    await initCommand(tmp);
    await createBoard('my-board', '# Plan', makePrd(), 'test board', tmp);

    const { isGhInstalled } = await import('../../lib/git.js');
    (isGhInstalled as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    await runCommand('my-board', 1, tmp);

    expect(process.exitCode).toBe(1);
    const allErr = err.mock.calls.map((c) => c[0]).join('\n');
    expect(allErr).toContain('gh');
    err.mockRestore();
    log.mockRestore();
  });

  it('does not spawn agent when gh CLI is not installed', async () => {
    await initCommand(tmp);
    await createBoard('my-board', '# Plan', makePrd(), 'test board', tmp);

    const { isGhInstalled } = await import('../../lib/git.js');
    (isGhInstalled as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    const { spawnPrintMode } = await import('../../lib/agent.js');
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    await runCommand('my-board', 1, tmp);

    expect(spawnPrintMode).not.toHaveBeenCalled();
    err.mockRestore();
    log.mockRestore();
  });

  it('pushes branch and creates PR when agent signals COMPLETE', async () => {
    await initCommand(tmp);
    await createBoard('my-board', '# Plan', makePrd(), 'test board', tmp);

    const { spawnPrintMode } = await import('../../lib/agent.js');
    (spawnPrintMode as ReturnType<typeof vi.fn>).mockResolvedValue({
      exitCode: 0,
      stdout: '',
      result: '<ralfie>COMPLETE</ralfie>',
      complete: true,
      sessionId: null,
    });

    const { push, createPr, getDefaultBranch } = await import('../../lib/git.js');

    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    await runCommand('my-board', 5, tmp);

    expect(push).toHaveBeenCalledWith(tmp);
    expect(getDefaultBranch).toHaveBeenCalledWith(tmp);
    expect(createPr).toHaveBeenCalledWith(
      'test project description',
      expect.stringContaining('T-1'),
      'main',
      tmp,
    );
    const allOutput = log.mock.calls.map((c) => c[0]).join('\n');
    expect(allOutput).toContain('PR created');
    expect(allOutput).toContain('https://github.com/test/repo/pull/1');
    log.mockRestore();
  });

  it('PR body contains checklist of all items', async () => {
    await initCommand(tmp);
    await createBoard('my-board', '# Plan', makePrd(), 'test board', tmp);

    const { spawnPrintMode } = await import('../../lib/agent.js');
    (spawnPrintMode as ReturnType<typeof vi.fn>).mockResolvedValue({
      exitCode: 0,
      stdout: '',
      result: '<ralfie>COMPLETE</ralfie>',
      complete: true,
      sessionId: null,
    });

    const { createPr } = await import('../../lib/git.js');

    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    await runCommand('my-board', 5, tmp);

    const body = (createPr as ReturnType<typeof vi.fn>).mock.calls[0][1] as string;
    expect(body).toContain('- [x] T-1: task one');
    log.mockRestore();
  });

  it('spawns reviewer after implementor and checks for LGTM', async () => {
    await initCommand(tmp);
    await createBoard('my-board', '# Plan', makePrd(), 'test board', tmp);

    const { spawnPrintMode } = await import('../../lib/agent.js');
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    await runCommand('my-board', 1, tmp);

    // Call 1: implementor, Call 2: reviewer
    expect(spawnPrintMode).toHaveBeenCalledTimes(2);
    const reviewPrompt = (spawnPrintMode as ReturnType<typeof vi.fn>).mock.calls[1][0] as string;
    expect(reviewPrompt).toContain('/ralf-review');

    const allOutput = log.mock.calls.map((c) => c[0]).join('\n');
    expect(allOutput).toContain('Review passed: LGTM');
    log.mockRestore();
  });

  it('resumes implementor with findings when review does not LGTM', async () => {
    await initCommand(tmp);
    await createBoard('my-board', '# Plan', makePrd(), 'test board', tmp);

    const { spawnPrintMode, spawnResume } = await import('../../lib/agent.js');
    let printCount = 0;
    (spawnPrintMode as ReturnType<typeof vi.fn>).mockImplementation(() => {
      printCount++;
      if (printCount === 1) {
        // Implementor
        return Promise.resolve({ exitCode: 0, stdout: '', result: '', complete: false, sessionId: 'impl-123' });
      }
      // Reviewer round 1 — findings
      const findings = '## Review Findings\n### [CRITICAL] — Bug';
      return Promise.resolve({ exitCode: 0, stdout: '', result: findings, complete: false, sessionId: 'rev-1' });
    });

    (spawnResume as ReturnType<typeof vi.fn>).mockImplementation((_sid: string, prompt: string) => {
      // Reviewer round 2 (resumed) — LGTM
      if (prompt.includes('/ralf-review')) {
        return Promise.resolve({ exitCode: 0, stdout: '', result: '<ralfie>LGTM</ralfie>', complete: false, sessionId: 'rev-1' });
      }
      // Fix or finalize
      return Promise.resolve({ exitCode: 0, stdout: '', result: '', complete: false, sessionId: 'impl-123' });
    });

    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    await runCommand('my-board', 1, tmp);

    // spawnPrintMode: implementor(1) + reviewer-round-1(1) = 2
    expect(spawnPrintMode).toHaveBeenCalledTimes(2);

    // spawnResume: fix(1) + reviewer-round-2(1) + finalize(1) = 3
    expect(spawnResume).toHaveBeenCalledTimes(3);

    // Fix resume contains findings
    const fixCall = (spawnResume as ReturnType<typeof vi.fn>).mock.calls.find(
      (c: string[]) => (c[1] as string).includes('reviewer found issues'),
    );
    expect(fixCall).toBeDefined();
    expect(fixCall![1]).toContain('CRITICAL');

    // Finalize resume
    const finalizeCall = (spawnResume as ReturnType<typeof vi.fn>).mock.calls.find(
      (c: string[]) => (c[1] as string).includes('/ralf-finalize'),
    );
    expect(finalizeCall).toBeDefined();

    const allOutput = log.mock.calls.map((c) => c[0]).join('\n');
    expect(allOutput).toContain('Review round 1/3');
    expect(allOutput).toContain('Review found issues');
    expect(allOutput).toContain('Review round 2/3');
    expect(allOutput).toContain('Review passed: LGTM');
    log.mockRestore();
  });

  it('caps review rounds at config.review_rounds', async () => {
    await initCommand(tmp);
    await createBoard('my-board', '# Plan', makePrd(), 'test board', tmp);

    const { spawnPrintMode, spawnResume } = await import('../../lib/agent.js');
    (spawnPrintMode as ReturnType<typeof vi.fn>).mockImplementation(() => {
      // Implementor (first call) or reviewer round 1 (second call)
      return Promise.resolve({ exitCode: 0, stdout: '', result: '## Findings', complete: false, sessionId: 'impl-123' });
    });

    (spawnResume as ReturnType<typeof vi.fn>).mockImplementation(() => {
      // Reviewer rounds 2-3 (resumed) and fix rounds all return findings
      return Promise.resolve({ exitCode: 0, stdout: '', result: '## Findings', complete: false, sessionId: 'impl-123' });
    });

    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    await runCommand('my-board', 1, tmp);

    // spawnPrintMode: implementor(1) + reviewer-round-1(1) = 2
    expect(spawnPrintMode).toHaveBeenCalledTimes(2);

    // spawnResume: reviewer-round-2(1) + reviewer-round-3(1) + fix-round-1(1) + fix-round-2(1) + finalize(1) = 5
    expect(spawnResume).toHaveBeenCalledTimes(5);

    const allOutput = log.mock.calls.map((c) => c[0]).join('\n');
    expect(allOutput).toContain('Max review rounds (3) reached');
    log.mockRestore();
  });

  it('skips review when review_enabled is false', async () => {
    await initCommand(tmp);
    await createBoard('my-board', '# Plan', makePrd(), 'test board', tmp);

    // Write config with review_enabled: false
    const { writeConfig, readConfig } = await import('../../lib/config.js');
    const cfg = await readConfig(tmp);
    await writeConfig({ ...cfg, review_enabled: false }, tmp);

    const { spawnPrintMode, spawnResume } = await import('../../lib/agent.js');
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    await runCommand('my-board', 1, tmp);

    // Only implementor + no reviewer calls
    expect(spawnPrintMode).toHaveBeenCalledTimes(1);

    // Finalize via spawnResume (since implementor returns sessionId)
    expect(spawnResume).toHaveBeenCalledTimes(1);
    const finalizePrompt = (spawnResume as ReturnType<typeof vi.fn>).mock.calls[0][1] as string;
    expect(finalizePrompt).toContain('/ralf-finalize');
    log.mockRestore();
  });

  it('finalizes via spawnResume with implementor session', async () => {
    await initCommand(tmp);
    await createBoard('my-board', '# Plan', makePrd(), 'test board', tmp);

    const { spawnResume } = await import('../../lib/agent.js');
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    await runCommand('my-board', 1, tmp);

    // Finalize should resume the implementor session
    expect(spawnResume).toHaveBeenCalledWith(
      'test-session-1',
      expect.stringContaining('/ralf-finalize'),
      tmp,
    );
    log.mockRestore();
  });

  it('creates PR when finalize signals COMPLETE', async () => {
    await initCommand(tmp);
    await createBoard('my-board', '# Plan', makePrd(), 'test board', tmp);

    const { spawnResume } = await import('../../lib/agent.js');
    (spawnResume as ReturnType<typeof vi.fn>).mockResolvedValue({
      exitCode: 0,
      stdout: '',
      result: '<ralfie>COMPLETE</ralfie>',
      complete: true,
      sessionId: 'test-session-1',
    });

    const { push, createPr } = await import('../../lib/git.js');

    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    await runCommand('my-board', 5, tmp);

    expect(push).toHaveBeenCalled();
    expect(createPr).toHaveBeenCalled();
    const allOutput = log.mock.calls.map((c) => c[0]).join('\n');
    expect(allOutput).toContain('All items complete');
    log.mockRestore();
  });
});
