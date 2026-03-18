import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  saveRunPid,
  removeRunPid,
  getActiveRuns,
  countActiveRuns,
} from '../run-tracker.js';
import { runsDir, runPidPath } from '../paths.js';

let tmp: string;
const board = 'test-board';
const session = 'ralfie-123-abc';

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'ralfie-run-tracker-'));
  await mkdir(runsDir(board, tmp), { recursive: true });
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

describe('run-tracker', () => {
  it('saveRunPid creates the runs directory and writes a PID file', async () => {
    const pid = process.pid;
    await saveRunPid(board, session, pid, tmp);
    const raw = await readFile(runPidPath(board, session, tmp), 'utf-8');
    const info = JSON.parse(raw);
    expect(info).toEqual({ pid, sessionId: session });
  });

  it('removeRunPid deletes the PID file, silently ignores if missing', async () => {
    await saveRunPid(board, session, process.pid, tmp);
    await removeRunPid(board, session, tmp);
    // File should be gone
    const files = await readdir(runsDir(board, tmp));
    expect(files.filter((f) => f.endsWith('.pid'))).toHaveLength(0);
    // Should not throw when called again
    await expect(removeRunPid(board, session, tmp)).resolves.toBeUndefined();
  });

  it('getActiveRuns returns alive processes and cleans up stale PIDs', async () => {
    // Save current process PID (alive)
    await saveRunPid(board, session, process.pid, tmp);
    // Save a definitely-dead PID
    const deadSession = 'ralfie-dead-session';
    await saveRunPid(board, deadSession, 999999, tmp);

    const active = await getActiveRuns(board, tmp);
    expect(active).toHaveLength(1);
    expect(active[0]).toEqual({ pid: process.pid, sessionId: session });

    // Stale PID file should have been cleaned up
    const files = await readdir(runsDir(board, tmp));
    const pidFiles = files.filter((f) => f.endsWith('.pid'));
    expect(pidFiles).toHaveLength(1);
    expect(pidFiles[0]).toBe(`${session}.pid`);
  });

  it('getActiveRuns returns empty array when no runs directory exists', async () => {
    const active = await getActiveRuns('nonexistent-board', tmp);
    expect(active).toEqual([]);
  });

  it('countActiveRuns returns the count from getActiveRuns', async () => {
    await saveRunPid(board, session, process.pid, tmp);
    await saveRunPid(board, 'ralfie-456-def', process.pid, tmp);
    const count = await countActiveRuns(board, tmp);
    expect(count).toBe(2);
  });
});
