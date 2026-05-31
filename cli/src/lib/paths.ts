import { join } from 'node:path';

export const ralfieDir = (cwd = process.cwd()) => join(cwd, '.ralfie');

export const configPath = (cwd = process.cwd()) => join(ralfieDir(cwd), 'config.json');

export const boardsDir = (cwd = process.cwd()) => join(ralfieDir(cwd), 'boards');

export const boardDir = (boardName: string, cwd = process.cwd()) =>
  join(boardsDir(cwd), boardName);

export const planPath = (boardName: string, cwd = process.cwd()) =>
  join(boardDir(boardName, cwd), 'plan.md');

export const prdPath = (boardName: string, cwd = process.cwd()) =>
  join(boardDir(boardName, cwd), 'prd.json');

export const progressPath = (boardName: string, cwd = process.cwd()) =>
  join(boardDir(boardName, cwd), 'progress.md');

export const locksDir = (boardName: string, cwd = process.cwd()) =>
  join(boardDir(boardName, cwd), 'locks');

export const lockPath = (boardName: string, itemId: string, cwd = process.cwd()) =>
  join(locksDir(boardName, cwd), `${itemId}.lock`);

export const runsDir = (boardName: string, cwd = process.cwd()) =>
  join(boardDir(boardName, cwd), 'runs');

export const runPidPath = (boardName: string, sessionId: string, cwd = process.cwd()) =>
  join(runsDir(boardName, cwd), `${sessionId}.pid`);

export const unresolvedPath = (boardName: string, cwd = process.cwd()) =>
  join(boardDir(boardName, cwd), 'unresolved.md');

export const ralfMdPath = (cwd = process.cwd()) => join(ralfieDir(cwd), 'RALF.md');

export const claudeMdPath = (cwd = process.cwd()) => join(cwd, 'CLAUDE.md');
