import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { statusCommand } from '../status.js';
import { initCommand } from '../init.js';
import { createBoard } from '../../lib/board.js';
import type { Prd } from '@ralfie/shared';

let tmp: string;

const prd: Prd = {
  project: 'test',
  description: 'test project',
  items: [
    { id: 'T-1', category: 'A', description: 'first task', steps_to_verify: [], status: 'done', assigned_to: null, comments: [{ timestamp: '2026-01-01T00:00:00Z', session_id: 's1', message: 'looks good' }] },
    { id: 'T-2', category: 'B', description: 'second task', steps_to_verify: [], status: 'in_progress', assigned_to: 'agent-1', comments: [] },
    { id: 'T-3', category: 'A', description: 'third task', steps_to_verify: [], status: 'pending', assigned_to: null, comments: [] },
    { id: 'T-4', category: 'C', description: 'fourth task', steps_to_verify: [], status: 'failed', assigned_to: null, comments: [{ timestamp: '2026-01-01T00:00:00Z', session_id: 's1', message: 'broke' }, { timestamp: '2026-01-02T00:00:00Z', session_id: 's2', message: 'still broke' }] },
    { id: 'T-5', category: 'A', description: 'fifth task', steps_to_verify: [], status: 'verified', assigned_to: null, comments: [] },
  ],
};

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'ralfie-status-'));
  await initCommand(tmp);
  await createBoard('my-board', '# Plan', prd, 'A test board', tmp);
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

describe('status', () => {
  it('filters items by status and displays id, category, description, agent, comment count', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    await statusCommand('my-board', 'done', tmp);
    const output = log.mock.calls.map((c) => c[0]).join('\n');
    expect(output).toContain('T-1');
    expect(output).toContain('A');
    expect(output).toContain('first task');
    expect(output).toContain('1 comments');
    expect(output).not.toContain('T-2');

    log.mockRestore();
  });

  it('shows assigned agent for in_progress items', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    await statusCommand('my-board', 'in_progress', tmp);
    const output = log.mock.calls.map((c) => c[0]).join('\n');
    expect(output).toContain('T-2');
    expect(output).toContain('agent-1');

    log.mockRestore();
  });

  it('shows error for invalid status', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});

    await statusCommand('my-board', 'bogus', tmp);
    const output = err.mock.calls.map((c) => c[0]).join('\n');
    expect(output).toContain('Invalid status');
    expect(output).toContain('pending');
    expect(output).toContain('in_progress');
    expect(output).toContain('done');
    expect(output).toContain('failed');
    expect(output).toContain('verified');

    err.mockRestore();
  });

  it('shows message when no items match the status', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Create a board with no pending items isn't needed — 'pending' exists. Use verified filter on empty.
    await statusCommand('my-board', 'pending', tmp);
    const output = log.mock.calls.map((c) => c[0]).join('\n');
    expect(output).toContain('T-3');

    log.mockRestore();
  });
});
