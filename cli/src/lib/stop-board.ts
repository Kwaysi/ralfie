import { getActiveRuns, removeRunPid } from './run-tracker.js';
import { releaseSessionLocks } from './lock.js';
import { resetSessionItems } from './prd.js';

export interface StopResult {
  stopped: number;
  locksReleased: number;
  itemsReset: number;
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function killProcess(pid: number): Promise<void> {
  // Send SIGTERM to process group (negative PID)
  try {
    process.kill(-pid, 'SIGTERM');
  } catch {
    // Process or group may already be dead
    return;
  }

  // Wait up to 5 seconds for process to die
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    if (!isProcessAlive(pid)) return;
    await new Promise((r) => setTimeout(r, 250));
  }

  // SIGKILL if still alive
  try {
    process.kill(-pid, 'SIGKILL');
  } catch {
    // Already dead
  }
}

export async function stopBoard(boardName: string, cwd?: string): Promise<StopResult> {
  const runs = await getActiveRuns(boardName, cwd);

  if (runs.length === 0) {
    return { stopped: 0, locksReleased: 0, itemsReset: 0 };
  }

  let locksReleased = 0;
  let itemsReset = 0;

  // Kill all processes
  await Promise.all(runs.map((run) => killProcess(run.pid)));

  // Clean up locks, items, and PID files for each session
  for (const run of runs) {
    locksReleased += await releaseSessionLocks(boardName, run.sessionId, cwd);
    itemsReset += await resetSessionItems(boardName, run.sessionId, cwd);
    await removeRunPid(boardName, run.sessionId, cwd);
  }

  return { stopped: runs.length, locksReleased, itemsReset };
}
