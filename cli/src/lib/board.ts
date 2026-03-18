import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { boardsDir, boardDir, planPath, prdPath, progressPath, locksDir } from './paths.js';
import type { Board, BoardMeta, Prd } from '@ralfie/shared';

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
    await readFile(`${boardDir(name, cwd)}/meta.json`);
    return true;
  } catch {
    return false;
  }
}

export async function getBoard(name: string, cwd?: string): Promise<Board> {
  const dir = boardDir(name, cwd);
  const [metaRaw, plan, prdRaw, progress] = await Promise.all([
    readFile(`${dir}/meta.json`, 'utf-8'),
    readFile(planPath(name, cwd), 'utf-8'),
    readFile(prdPath(name, cwd), 'utf-8'),
    readFile(progressPath(name, cwd), 'utf-8'),
  ]);

  return {
    meta: JSON.parse(metaRaw) as BoardMeta,
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
      const raw = await readFile(`${dir}/${entry}/meta.json`, 'utf-8');
      metas.push(JSON.parse(raw) as BoardMeta);
    } catch {
      // skip entries without valid meta.json
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
