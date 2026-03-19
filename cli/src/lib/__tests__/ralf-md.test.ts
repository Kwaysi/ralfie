import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ensureRalfMd, appendBoardToRalfMd } from '../ralf-md.js';
import { createBoard } from '../board.js';
import { boardsDir, ralfMdPath } from '../paths.js';
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
  tmp = await mkdtemp(join(tmpdir(), 'ralfie-ralf-md-'));
  await mkdir(boardsDir(tmp), { recursive: true });
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

describe('ensureRalfMd', () => {
  it('creates RALF.md with documentation section and empty boards section on empty project', async () => {
    await ensureRalfMd(tmp);

    const content = await readFile(ralfMdPath(tmp), 'utf-8');
    expect(content).toContain('# RALF.md');
    expect(content).toContain('## How Ralfie Works');
    expect(content).toContain('## Active Boards');
    expect(content).toContain('prd.json');
  });

  it('populates board entries when boards exist', async () => {
    await createBoard('alpha', '# Alpha', makePrd(), 'First board', tmp);
    await createBoard('beta', '# Beta', makePrd(), 'Second board', tmp);

    await ensureRalfMd(tmp);

    const content = await readFile(ralfMdPath(tmp), 'utf-8');
    expect(content).toContain('**alpha**');
    expect(content).toContain('First board');
    expect(content).toContain('**beta**');
    expect(content).toContain('Second board');
    expect(content).toContain('progress.md');
  });

  it('is idempotent — running twice does not duplicate content', async () => {
    await createBoard('alpha', '# Alpha', makePrd(), 'First board', tmp);

    await ensureRalfMd(tmp);
    const first = await readFile(ralfMdPath(tmp), 'utf-8');

    await ensureRalfMd(tmp);
    const second = await readFile(ralfMdPath(tmp), 'utf-8');

    expect(second).toBe(first);
  });
});

describe('appendBoardToRalfMd', () => {
  it('adds a new board entry to existing RALF.md', async () => {
    await ensureRalfMd(tmp);

    await appendBoardToRalfMd('new-board', 'A new board', tmp);

    const content = await readFile(ralfMdPath(tmp), 'utf-8');
    expect(content).toContain('**new-board**');
    expect(content).toContain('A new board');
    expect(content).toContain('.ralfie/boards/new-board/progress.md');
  });

  it('does not duplicate if board already listed', async () => {
    await ensureRalfMd(tmp);
    await appendBoardToRalfMd('my-board', 'desc', tmp);
    await appendBoardToRalfMd('my-board', 'desc', tmp);

    const content = await readFile(ralfMdPath(tmp), 'utf-8');
    const matches = content.match(/\*\*my-board\*\*/g);
    expect(matches).toHaveLength(1);
  });

  it('creates RALF.md if it does not exist', async () => {
    await appendBoardToRalfMd('first-board', 'Created from scratch', tmp);

    const content = await readFile(ralfMdPath(tmp), 'utf-8');
    expect(content).toContain('# RALF.md');
    expect(content).toContain('**first-board**');
    expect(content).toContain('Created from scratch');
  });

  it('handles board with empty description', async () => {
    await ensureRalfMd(tmp);
    await appendBoardToRalfMd('no-desc', '', tmp);

    const content = await readFile(ralfMdPath(tmp), 'utf-8');
    expect(content).toContain('**no-desc**');
    expect(content).not.toContain('no-desc** —');
  });
});
