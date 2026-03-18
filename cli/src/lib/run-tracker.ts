import { mkdir, writeFile, unlink, readdir, readFile } from 'node:fs/promises';
import { runsDir, runPidPath } from './paths.js';

export interface RunPidInfo {
  pid: number;
  sessionId: string;
}

export async function saveRunPid(
  boardName: string,
  sessionId: string,
  pid: number,
  cwd?: string,
): Promise<void> {
  const dir = runsDir(boardName, cwd);
  await mkdir(dir, { recursive: true });
  const info: RunPidInfo = { pid, sessionId };
  await writeFile(runPidPath(boardName, sessionId, cwd), JSON.stringify(info, null, 2) + '\n');
}

export async function removeRunPid(
  boardName: string,
  sessionId: string,
  cwd?: string,
): Promise<void> {
  try {
    await unlink(runPidPath(boardName, sessionId, cwd));
  } catch {
    // Silently ignore if missing
  }
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export async function getActiveRuns(
  boardName: string,
  cwd?: string,
): Promise<RunPidInfo[]> {
  const dir = runsDir(boardName, cwd);
  let files: string[];
  try {
    files = await readdir(dir);
  } catch {
    return [];
  }
  const pidFiles = files.filter((f) => f.endsWith('.pid'));
  const active: RunPidInfo[] = [];
  for (const file of pidFiles) {
    try {
      const raw = await readFile(`${dir}/${file}`, 'utf-8');
      const info = JSON.parse(raw) as RunPidInfo;
      if (isProcessAlive(info.pid)) {
        active.push(info);
      } else {
        // Clean up stale PID file for dead process
        try {
          await unlink(`${dir}/${file}`);
        } catch {
          // ignore
        }
      }
    } catch {
      // Malformed PID file — clean up
      try {
        await unlink(`${dir}/${file}`);
      } catch {
        // ignore
      }
    }
  }
  return active;
}

export async function countActiveRuns(
  boardName: string,
  cwd?: string,
): Promise<number> {
  const runs = await getActiveRuns(boardName, cwd);
  return runs.length;
}
