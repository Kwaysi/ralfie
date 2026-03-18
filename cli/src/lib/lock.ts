import { mkdir, readFile, unlink, readdir, open } from 'node:fs/promises';
import { lockPath, locksDir } from './paths.js';

export interface LockInfo {
  session_id: string;
  acquired_at: string;
}

export async function acquireLock(
  boardName: string,
  itemId: string,
  sessionId: string,
  cwd?: string,
): Promise<boolean> {
  const path = lockPath(boardName, itemId, cwd);
  await mkdir(locksDir(boardName, cwd), { recursive: true });
  const info: LockInfo = { session_id: sessionId, acquired_at: new Date().toISOString() };
  try {
    const fh = await open(path, 'wx');
    await fh.writeFile(JSON.stringify(info, null, 2) + '\n');
    await fh.close();
    return true;
  } catch (err: any) {
    if (err.code === 'EEXIST') return false;
    throw err;
  }
}

export async function releaseLock(
  boardName: string,
  itemId: string,
  cwd?: string,
): Promise<void> {
  await unlink(lockPath(boardName, itemId, cwd));
}

export async function isLocked(
  boardName: string,
  itemId: string,
  cwd?: string,
): Promise<boolean> {
  try {
    await readFile(lockPath(boardName, itemId, cwd));
    return true;
  } catch {
    return false;
  }
}

export async function getLockInfo(
  boardName: string,
  itemId: string,
  cwd?: string,
): Promise<LockInfo | null> {
  try {
    const raw = await readFile(lockPath(boardName, itemId, cwd), 'utf-8');
    return JSON.parse(raw) as LockInfo;
  } catch {
    return null;
  }
}

export async function clearStaleLocks(
  boardName: string,
  cwd?: string,
): Promise<number> {
  const dir = locksDir(boardName, cwd);
  let files: string[];
  try {
    files = await readdir(dir);
  } catch {
    return 0;
  }
  const lockFiles = files.filter((f) => f.endsWith('.lock'));
  await Promise.all(lockFiles.map((f) => unlink(`${dir}/${f}`)));
  return lockFiles.length;
}

export async function releaseSessionLocks(
  boardName: string,
  sessionId: string,
  cwd?: string,
): Promise<number> {
  const dir = locksDir(boardName, cwd);
  let files: string[];
  try {
    files = await readdir(dir);
  } catch {
    return 0;
  }
  const lockFiles = files.filter((f) => f.endsWith('.lock'));
  let count = 0;
  await Promise.all(
    lockFiles.map(async (f) => {
      try {
        const raw = await readFile(`${dir}/${f}`, 'utf-8');
        const info = JSON.parse(raw) as LockInfo;
        if (info.session_id === sessionId) {
          await unlink(`${dir}/${f}`);
          count++;
        }
      } catch {
        // lock file gone or unreadable, skip
      }
    }),
  );
  return count;
}
