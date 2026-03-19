import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createBoard, boardExists, getBoard, listBoards, appendProgress } from '../board.js';
import { boardsDir, boardDir, prdPath } from '../paths.js';
import type { Prd } from '@ralfie/shared';

let tmp: string;

function makePrd(): Prd {
  return {
    project: 'test',
    description: 'test project',
    items: [
      {
        id: 'ITEM-1',
        category: 'Test',
        description: 'First item',
        steps_to_verify: ['step 1'],
        status: 'pending',
        assigned_to: null,
        started_at: null,
        completed_at: null,
        comments: [],
      },
    ],
  };
}

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'ralfie-board-'));
  await mkdir(boardsDir(tmp), { recursive: true });
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

describe('board', () => {
  it('createBoard creates board directory with all required files', async () => {
    const prd = makePrd();
    await createBoard('my-board', '# Plan\nDo things', prd, 'A test board', tmp);

    expect(await boardExists('my-board', tmp)).toBe(true);

    const board = await getBoard('my-board', tmp);
    expect(board.meta.name).toBe('my-board');
    expect(board.meta.description).toBe('A test board');
    expect(board.meta.created_at).toBeTruthy();
    expect(board.plan).toBe('# Plan\nDo things');
    expect(board.prd).toEqual(prd);
    expect(board.progress).toBe('');
  });

  it('boardExists returns false for nonexistent board', async () => {
    expect(await boardExists('nope', tmp)).toBe(false);
  });

  it('listBoards returns all boards with meta', async () => {
    expect(await listBoards(tmp)).toEqual([]);

    await createBoard('alpha', '# Alpha', makePrd(), 'First board', tmp);
    await createBoard('beta', '# Beta', makePrd(), 'Second board', tmp);

    const boards = await listBoards(tmp);
    expect(boards).toHaveLength(2);
    const names = boards.map((b) => b.name).sort();
    expect(names).toEqual(['alpha', 'beta']);
  });

  it('appendProgress appends text to progress.md', async () => {
    await createBoard('my-board', '# Plan', makePrd(), 'desc', tmp);
    await appendProgress('my-board', 'Step 1 done\n', tmp);
    await appendProgress('my-board', 'Step 2 done\n', tmp);

    const board = await getBoard('my-board', tmp);
    expect(board.progress).toBe('Step 1 done\nStep 2 done\n');
  });

  it('boardExists returns true when directory exists without meta.json', async () => {
    const dir = boardDir('no-meta', tmp);
    await mkdir(dir, { recursive: true });
    expect(await boardExists('no-meta', tmp)).toBe(true);
  });

  it('getBoard handles missing optional files gracefully', async () => {
    // Create board dir with only prd.json (the one required file)
    const dir = boardDir('partial', tmp);
    await mkdir(dir, { recursive: true });
    await writeFile(prdPath('partial', tmp), JSON.stringify(makePrd(), null, 2));

    const board = await getBoard('partial', tmp);
    expect(board.meta).toEqual({ name: 'partial', created_at: '', description: '' });
    expect(board.plan).toBe('');
    expect(board.progress).toBe('');
    expect(board.prd.project).toBe('test');
  });

  it('listBoards includes boards without meta.json', async () => {
    await createBoard('with-meta', '# Plan', makePrd(), 'Has meta', tmp);

    // Create a board dir with only prd.json, no meta.json
    const dir = boardDir('no-meta', tmp);
    await mkdir(dir, { recursive: true });
    await writeFile(prdPath('no-meta', tmp), JSON.stringify(makePrd(), null, 2));

    const boards = await listBoards(tmp);
    expect(boards).toHaveLength(2);
    const names = boards.map((b) => b.name).sort();
    expect(names).toEqual(['no-meta', 'with-meta']);

    const noMeta = boards.find((b) => b.name === 'no-meta')!;
    expect(noMeta.description).toBe('');
  });
});
