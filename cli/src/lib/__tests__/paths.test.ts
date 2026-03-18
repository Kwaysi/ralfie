import { describe, it, expect } from 'vitest';
import {
  ralfieDir, configPath, boardsDir, boardDir,
  planPath, prdPath, progressPath, locksDir, lockPath,
} from '../paths.js';

const cwd = '/fake/project';

describe('paths', () => {
  it('ralfieDir returns <cwd>/.ralfie', () => {
    expect(ralfieDir(cwd)).toBe('/fake/project/.ralfie');
  });

  it('configPath returns <cwd>/.ralfie/config.json', () => {
    expect(configPath(cwd)).toBe('/fake/project/.ralfie/config.json');
  });

  it('boardsDir returns <cwd>/.ralfie/boards', () => {
    expect(boardsDir(cwd)).toBe('/fake/project/.ralfie/boards');
  });

  it('boardDir returns <cwd>/.ralfie/boards/<boardName>', () => {
    expect(boardDir('my-board', cwd)).toBe('/fake/project/.ralfie/boards/my-board');
  });

  it('planPath returns board dir + plan.md', () => {
    expect(planPath('b', cwd)).toBe('/fake/project/.ralfie/boards/b/plan.md');
  });

  it('prdPath returns board dir + prd.json', () => {
    expect(prdPath('b', cwd)).toBe('/fake/project/.ralfie/boards/b/prd.json');
  });

  it('progressPath returns board dir + progress.md', () => {
    expect(progressPath('b', cwd)).toBe('/fake/project/.ralfie/boards/b/progress.md');
  });

  it('locksDir returns board dir + locks', () => {
    expect(locksDir('b', cwd)).toBe('/fake/project/.ralfie/boards/b/locks');
  });

  it('lockPath returns locks dir + <itemId>.lock', () => {
    expect(lockPath('b', 'ITEM-1', cwd)).toBe('/fake/project/.ralfie/boards/b/locks/ITEM-1.lock');
  });
});
