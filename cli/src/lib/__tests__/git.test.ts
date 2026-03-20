import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import {
  isDirty,
  getDefaultBranch,
  listBranches,
  nextBranchName,
  createAndCheckoutBranch,
  installCommitMsgHook,
} from '../git.js';

const execFileAsync = promisify(execFile);

let tmp: string;

async function git(args: string[], cwd: string): Promise<string> {
  const { stdout } = await execFileAsync('git', args, { cwd });
  return stdout.trim();
}

async function initRepo(cwd: string): Promise<void> {
  await git(['init'], cwd);
  await git(['config', 'user.email', 'test@test.com'], cwd);
  await git(['config', 'user.name', 'Test'], cwd);
  await git(['config', 'commit.gpgsign', 'false'], cwd);
  // Create initial commit so HEAD exists
  await writeFile(join(cwd, 'README.md'), '# test\n');
  await git(['add', 'README.md'], cwd);
  await git(['commit', '-m', 'initial'], cwd);
}

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'ralfie-git-'));
  await initRepo(tmp);
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

describe('isDirty', () => {
  it('returns false for a clean working tree', async () => {
    expect(await isDirty(tmp)).toBe(false);
  });

  it('returns true when a tracked file has unstaged changes', async () => {
    await writeFile(join(tmp, 'README.md'), '# modified\n');
    expect(await isDirty(tmp)).toBe(true);
  });

  it('returns true when changes are staged', async () => {
    await writeFile(join(tmp, 'README.md'), '# staged\n');
    await git(['add', 'README.md'], tmp);
    expect(await isDirty(tmp)).toBe(true);
  });

  it('returns false for untracked files only', async () => {
    await writeFile(join(tmp, 'untracked.txt'), 'hello\n');
    expect(await isDirty(tmp)).toBe(false);
  });
});

describe('getDefaultBranch', () => {
  it('returns configured default branch', async () => {
    await git(['config', 'init.defaultBranch', 'develop'], tmp);
    expect(await getDefaultBranch(tmp)).toBe('develop');
  });

  it('falls back to main when not configured', async () => {
    try {
      await git(['config', '--unset', 'init.defaultBranch'], tmp);
    } catch {
      // may not be set
    }
    expect(await getDefaultBranch(tmp)).toBe('main');
  });
});

describe('listBranches', () => {
  it('returns empty array when no matching branches exist', async () => {
    const branches = await listBranches('my-board', tmp);
    expect(branches).toEqual([]);
  });

  it('returns local branches matching the prefix', async () => {
    await git(['branch', 'my-board-1'], tmp);
    await git(['branch', 'my-board-2'], tmp);
    await git(['branch', 'other-board-1'], tmp);

    const branches = await listBranches('my-board', tmp);
    expect(branches).toContain('my-board-1');
    expect(branches).toContain('my-board-2');
    expect(branches).not.toContain('other-board-1');
  });
});

describe('nextBranchName', () => {
  it('returns board-1 when no branches exist', async () => {
    expect(await nextBranchName('my-board', tmp)).toBe('my-board-1');
  });

  it('increments past existing branches', async () => {
    await git(['branch', 'my-board-1'], tmp);
    await git(['branch', 'my-board-2'], tmp);
    expect(await nextBranchName('my-board', tmp)).toBe('my-board-3');
  });

  it('finds the max even if numbers are not sequential', async () => {
    await git(['branch', 'my-board-1'], tmp);
    await git(['branch', 'my-board-5'], tmp);
    expect(await nextBranchName('my-board', tmp)).toBe('my-board-6');
  });
});

describe('createAndCheckoutBranch', () => {
  it('creates and checks out the named branch', async () => {
    await createAndCheckoutBranch('feature-1', tmp);
    const current = await git(['branch', '--show-current'], tmp);
    expect(current).toBe('feature-1');
  });
});

describe('installCommitMsgHook', () => {
  it('creates an executable commit-msg hook with ralfie marker', async () => {
    await installCommitMsgHook(tmp);

    const hookPath = join(tmp, '.git', 'hooks', 'commit-msg');
    const content = await readFile(hookPath, 'utf-8');
    expect(content).toContain('# ralfie-managed-hook');
    expect(content).toContain('conventional commit format');
  });

  it('accepts valid conventional commit messages', { timeout: 15000 }, async () => {
    await installCommitMsgHook(tmp);

    await writeFile(join(tmp, 'test.txt'), 'hello\n');
    await git(['add', 'test.txt'], tmp);
    // Should not throw
    await git(['commit', '-m', 'feat(my-board): add feature'], tmp);

    const log = await git(['log', '--oneline', '-1'], tmp);
    expect(log).toContain('feat(my-board): add feature');
  });

  it('rejects non-conventional commit messages', { timeout: 15000 }, async () => {
    await installCommitMsgHook(tmp);

    await writeFile(join(tmp, 'test.txt'), 'hello\n');
    await git(['add', 'test.txt'], tmp);

    await expect(
      git(['commit', '-m', 'bad commit message'], tmp),
    ).rejects.toThrow();
  });

  it('accepts commits without scope', { timeout: 15000 }, async () => {
    await installCommitMsgHook(tmp);

    await writeFile(join(tmp, 'test.txt'), 'hello\n');
    await git(['add', 'test.txt'], tmp);
    await git(['commit', '-m', 'chore: update dependencies'], tmp);

    const log = await git(['log', '--oneline', '-1'], tmp);
    expect(log).toContain('chore: update dependencies');
  });

  it('does not overwrite non-ralfie hooks', async () => {
    const hookPath = join(tmp, '.git', 'hooks', 'commit-msg');
    await writeFile(hookPath, '#!/bin/sh\n# custom hook\nexit 0\n');

    await installCommitMsgHook(tmp);

    const content = await readFile(hookPath, 'utf-8');
    expect(content).toContain('# custom hook');
    expect(content).not.toContain('ralfie-managed-hook');
  });

  it('overwrites existing ralfie-managed hooks', async () => {
    // Install once
    await installCommitMsgHook(tmp);
    // Install again — should overwrite
    await installCommitMsgHook(tmp);

    const hookPath = join(tmp, '.git', 'hooks', 'commit-msg');
    const content = await readFile(hookPath, 'utf-8');
    expect(content).toContain('# ralfie-managed-hook');
  });
});
