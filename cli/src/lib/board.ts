import { readFile, writeFile, mkdir, readdir, stat } from 'node:fs/promises';
import { boardsDir, boardDir, planPath, prdPath, progressPath, locksDir } from './paths.js';
import type { Board, BoardMeta, Prd } from '@ralfie/shared';

async function readFileSafe(path: string, fallback: string): Promise<string> {
  try {
    return await readFile(path, 'utf-8');
  } catch {
    return fallback;
  }
}

export async function createBoard(
  name: string,
  plan: string,
  prd: Prd,
  description: string,
  cwd?: string,
): Promise<void> {
  const dir = boardDir(name, cwd);
  await mkdir(dir, { recursive: true });
  await mkdir(locksDir(name, cwd), { recursive: true });

  const meta: BoardMeta = {
    name,
    created_at: new Date().toISOString(),
    description,
  };

  await Promise.all([
    writeFile(planPath(name, cwd), plan),
    writeFile(prdPath(name, cwd), JSON.stringify(prd, null, 2) + '\n'),
    writeFile(progressPath(name, cwd), ''),
    writeFile(`${dir}/meta.json`, JSON.stringify(meta, null, 2) + '\n'),
  ]);
}

export async function boardExists(name: string, cwd?: string): Promise<boolean> {
  try {
    const s = await stat(boardDir(name, cwd));
    return s.isDirectory();
  } catch {
    return false;
  }
}

export async function getBoard(name: string, cwd?: string): Promise<Board> {
  const dir = boardDir(name, cwd);
  const [metaRaw, plan, prdRaw, progress] = await Promise.all([
    readFileSafe(`${dir}/meta.json`, ''),
    readFileSafe(planPath(name, cwd), ''),
    readFile(prdPath(name, cwd), 'utf-8'),
    readFileSafe(progressPath(name, cwd), ''),
  ]);

  const meta: BoardMeta = metaRaw
    ? (JSON.parse(metaRaw) as BoardMeta)
    : { name, created_at: '', description: '' };

  return {
    meta,
    plan,
    prd: JSON.parse(prdRaw) as Prd,
    progress,
  };
}

export async function listBoards(cwd?: string): Promise<BoardMeta[]> {
  const dir = boardsDir(cwd);
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return [];
  }

  const metas: BoardMeta[] = [];
  for (const entry of entries) {
    try {
      const s = await stat(`${dir}/${entry}`);
      if (!s.isDirectory()) continue;
    } catch {
      continue;
    }
    try {
      const raw = await readFile(`${dir}/${entry}/meta.json`, 'utf-8');
      metas.push(JSON.parse(raw) as BoardMeta);
    } catch {
      // Board directory exists but no meta.json — infer minimal meta
      metas.push({ name: entry, created_at: '', description: '' });
    }
  }
  return metas;
}

export async function appendProgress(
  name: string,
  text: string,
  cwd?: string,
): Promise<void> {
  const path = progressPath(name, cwd);
  const existing = await readFile(path, 'utf-8');
  await writeFile(path, existing + text);
}
