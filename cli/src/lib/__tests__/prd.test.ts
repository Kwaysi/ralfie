import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readPrd, writePrd, claimItem, completeItem, failItem, verifyItem, resetItem, addComment } from '../prd.js';
import { prdPath, locksDir } from '../paths.js';
import type { Prd } from '@ralfie/shared';

let tmp: string;
const board = 'test-board';
const session = 'ralfie-123-abc';

function makePrd(overrides: Partial<Prd['items'][0]> = {}): Prd {
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
        ...overrides,
      },
    ],
  };
}

async function seedPrd(prd: Prd): Promise<void> {
  await writeFile(prdPath(board, tmp), JSON.stringify(prd, null, 2) + '\n');
}

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'ralfie-prd-'));
  const boardDir = join(tmp, '.ralfie', 'boards', board);
  await mkdir(boardDir, { recursive: true });
  await mkdir(locksDir(board, tmp), { recursive: true });
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

describe('prd', () => {
  it('readPrd and writePrd round-trip', async () => {
    const prd = makePrd();
    await writePrd(board, prd, tmp);
    const read = await readPrd(board, tmp);
    expect(read).toEqual(prd);
  });

  it('claimItem sets status to in_progress, assigned_to, and started_at', async () => {
    await seedPrd(makePrd());
    await claimItem(board, 'ITEM-1', session, tmp);
    const prd = await readPrd(board, tmp);
    expect(prd.items[0].status).toBe('in_progress');
    expect(prd.items[0].assigned_to).toBe(session);
    expect(prd.items[0].started_at).toEqual(expect.any(String));
  });

  it('claimItem throws when item is already in_progress', async () => {
    await seedPrd(makePrd({ status: 'in_progress', assigned_to: 'other-session' }));
    await expect(claimItem(board, 'ITEM-1', session, tmp)).rejects.toThrow('already in_progress');
  });

  it('completeItem sets status to done, clears assigned_to, and sets completed_at', async () => {
    await seedPrd(makePrd({ status: 'in_progress', assigned_to: session }));
    await completeItem(board, 'ITEM-1', session, tmp);
    const prd = await readPrd(board, tmp);
    expect(prd.items[0].status).toBe('done');
    expect(prd.items[0].assigned_to).toBeNull();
    expect(prd.items[0].completed_at).toEqual(expect.any(String));
  });

  it('failItem sets status to failed, clears assigned_to, and adds comment', async () => {
    await seedPrd(makePrd({ status: 'in_progress', assigned_to: session }));
    await failItem(board, 'ITEM-1', session, 'something broke', tmp);
    const prd = await readPrd(board, tmp);
    expect(prd.items[0].status).toBe('failed');
    expect(prd.items[0].assigned_to).toBeNull();
    expect(prd.items[0].comments).toHaveLength(1);
    expect(prd.items[0].comments[0].message).toBe('something broke');
    expect(prd.items[0].comments[0].session_id).toBe(session);
  });

  it('verifyItem sets status to verified only when done', async () => {
    await seedPrd(makePrd({ status: 'done' }));
    await verifyItem(board, 'ITEM-1', session, tmp);
    const prd = await readPrd(board, tmp);
    expect(prd.items[0].status).toBe('verified');
  });

  it('verifyItem throws when status is not done', async () => {
    await seedPrd(makePrd({ status: 'pending' }));
    await expect(verifyItem(board, 'ITEM-1', session, tmp)).rejects.toThrow("must be 'done' to verify");
  });

  it('resetItem sets status to pending and clears assigned_to, started_at, completed_at', async () => {
    await seedPrd(makePrd({ status: 'done', assigned_to: null, started_at: '2026-03-19T00:00:00Z', completed_at: '2026-03-19T01:00:00Z' }));
    await resetItem(board, 'ITEM-1', session, tmp);
    const prd = await readPrd(board, tmp);
    expect(prd.items[0].status).toBe('pending');
    expect(prd.items[0].assigned_to).toBeNull();
    expect(prd.items[0].started_at).toBeNull();
    expect(prd.items[0].completed_at).toBeNull();
  });

  it('addComment appends a comment with timestamp, session_id, and message', async () => {
    await seedPrd(makePrd());
    await addComment(board, 'ITEM-1', session, 'looks good', tmp);
    const prd = await readPrd(board, tmp);
    expect(prd.items[0].comments).toHaveLength(1);
    expect(prd.items[0].comments[0]).toEqual({
      timestamp: expect.any(String),
      session_id: session,
      message: 'looks good',
    });
  });
});
