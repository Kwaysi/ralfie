import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, readdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { stopCommand } from '../stop.js';
import { initCommand } from '../init.js';
import { createBoard } from '../../lib/board.js';
import { saveRunPid } from '../../lib/run-tracker.js';
import { acquireLock } from '../../lib/lock.js';
import { readPrd, writePrd } from '../../lib/prd.js';
import { runsDir, locksDir, prdPath } from '../../lib/paths.js';
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
  tmp = await mkdtemp(join(tmpdir(), 'ralfie-stop-'));
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
  process.exitCode = 0;
});

describe('stop', () => {
  it('prints no active runs when nothing is running', async () => {
    await initCommand(tmp);
    await createBoard('my-board', '# Plan', makePrd(), 'test', tmp);

    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    await stopCommand('my-board', tmp);
    expect(log.mock.calls.map((c) => c[0]).join('\n')).toContain('No active runs for board my-board');
    log.mockRestore();
  });

  it('errors on nonexistent board', async () => {
    await initCommand(tmp);

    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    await stopCommand('nope', tmp);
    expect(process.exitCode).toBe(1);
    expect(err.mock.calls.map((c) => c[0]).join('\n')).toContain('Board not found');
    err.mockRestore();
  });

  it('kills a running process, releases locks, resets items, and deletes PID files', async () => {
    await initCommand(tmp);
    await createBoard('my-board', '# Plan', makePrd(), 'test', tmp);

    // Spawn a long-running child process in its own process group
    const child = spawn('sleep', ['60'], { detached: true, stdio: 'ignore' });
    const pid = child.pid!;
    const sessionId = 'ralfie-test-session';

    // Save PID, create lock, and set item to in_progress for this session
    await saveRunPid('my-board', sessionId, pid, tmp);
    await acquireLock('my-board', 'T-1', sessionId, tmp);
    const prd = await readPrd('my-board', tmp);
    const t1 = prd.items.find((i) => i.id === 'T-1')!;
    t1.status = 'in_progress';
    t1.assigned_to = sessionId;
    await writePrd('my-board', prd, tmp);

    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    await stopCommand('my-board', tmp);

    // Process should be dead
    let alive = false;
    try {
      process.kill(pid, 0);
      alive = true;
    } catch {
      alive = false;
    }
    expect(alive).toBe(false);

    // PID files cleaned up
    const pidFiles = await readdir(runsDir('my-board', tmp)).catch(() => []);
    expect(pidFiles.filter((f: string) => f.endsWith('.pid'))).toHaveLength(0);

    // Lock files cleaned up
    const lockFiles = await readdir(locksDir('my-board', tmp)).catch(() => []);
    expect(lockFiles.filter((f: string) => f.endsWith('.lock'))).toHaveLength(0);

    // PRD item reset to pending
    const updatedPrd = JSON.parse(await readFile(prdPath('my-board', tmp), 'utf-8'));
    const item = updatedPrd.items.find((i: any) => i.id === 'T-1');
    expect(item.status).toBe('pending');
    expect(item.assigned_to).toBeNull();

    // Summary output
    const output = log.mock.calls.map((c) => c[0]).join('\n');
    expect(output).toContain('Stopped 1 process');
    expect(output).toContain('released 1 lock');
    expect(output).toContain('reset 1 item');
    log.mockRestore();
  });
});
