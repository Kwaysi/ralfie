import { execFile } from 'node:child_process';
import { chmod, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/**
 * Check if the working tree has staged or unstaged changes to tracked files.
 */
export async function isDirty(cwd = process.cwd()): Promise<boolean> {
  const { stdout } = await execFileAsync('git', ['status', '--porcelain', '-uno'], { cwd });
  return stdout.trim().length > 0;
}

/**
 * Get the default branch from git config, falling back to 'main'.
 */
export async function getDefaultBranch(cwd = process.cwd()): Promise<string> {
  try {
    const { stdout } = await execFileAsync(
      'git',
      ['config', '--get', 'init.defaultBranch'],
      { cwd },
    );
    const branch = stdout.trim();
    return branch || 'main';
  } catch {
    return 'main';
  }
}

/**
 * List local and remote branches matching a prefix.
 */
export async function listBranches(
  prefix: string,
  cwd = process.cwd(),
): Promise<string[]> {
  const { stdout: local } = await execFileAsync(
    'git',
    ['branch', '--list', `${prefix}-*`, '--format=%(refname:short)'],
    { cwd },
  );

  const { stdout: remote } = await execFileAsync(
    'git',
    ['branch', '-r', '--list', `*/${prefix}-*`, '--format=%(refname:short)'],
    { cwd },
  );

  const branches = new Set<string>();

  for (const line of local.split('\n')) {
    const name = line.trim();
    if (name) branches.add(name);
  }

  for (const line of remote.split('\n')) {
    const name = line.trim();
    if (name) {
      // Strip origin/ prefix to get bare branch name
      const bare = name.replace(/^[^/]+\//, '');
      branches.add(bare);
    }
  }

  return [...branches];
}

/**
 * Compute the next branch name for a board by checking existing local+remote branches.
 * Returns `<board>-1` when none exist, increments the highest number otherwise.
 */
export async function nextBranchName(
  board: string,
  cwd = process.cwd(),
): Promise<string> {
  const branches = await listBranches(board, cwd);
  const re = new RegExp(`^${board}-(\\d+)$`);

  let max = 0;
  for (const b of branches) {
    const m = b.match(re);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > max) max = n;
    }
  }

  return `${board}-${max + 1}`;
}

/**
 * Create a new branch and check it out.
 */
export async function createAndCheckoutBranch(
  branchName: string,
  cwd = process.cwd(),
): Promise<void> {
  await execFileAsync('git', ['checkout', '-b', branchName], { cwd });
}

/**
 * Push the current branch to origin.
 */
export async function push(cwd = process.cwd()): Promise<void> {
  const { stdout } = await execFileAsync('git', ['branch', '--show-current'], { cwd });
  const branch = stdout.trim();
  await execFileAsync('git', ['push', '-u', 'origin', branch], { cwd });
}

/**
 * Create a PR via `gh pr create`.
 */
export async function createPr(
  title: string,
  body: string,
  baseBranch: string,
  cwd = process.cwd(),
): Promise<string> {
  const { stdout } = await execFileAsync(
    'gh',
    ['pr', 'create', '--title', title, '--body', body, '--base', baseBranch],
    { cwd },
  );
  return stdout.trim();
}

/**
 * Install a commit-msg hook that validates conventional commit format.
 * If a non-ralfie hook already exists, prints a warning and does not overwrite.
 */
export async function installCommitMsgHook(cwd = process.cwd()): Promise<void> {
  const hookPath = join(cwd, '.git', 'hooks', 'commit-msg');
  const marker = '# ralfie-managed-hook';

  // Check for existing hook
  try {
    const existing = await readFile(hookPath, 'utf-8');
    if (!existing.includes(marker)) {
      console.warn(
        `Warning: existing commit-msg hook is not managed by ralfie — skipping installation.`,
      );
      return;
    }
  } catch {
    // No existing hook — proceed
  }

  const hookContent = `#!/bin/sh
${marker}
# Validates commit messages follow conventional commit format:
#   type(scope): description
#
# Allowed types: feat, fix, test, docs, refactor, chore, style, perf, ci, build, revert

commit_msg_file="$1"
commit_msg=$(head -1 "$commit_msg_file")

# Allow merge commits
if echo "$commit_msg" | grep -qE "^Merge "; then
  exit 0
fi

if ! echo "$commit_msg" | grep -qE "^(feat|fix|test|docs|refactor|chore|style|perf|ci|build|revert)(\\(.+\\))?: .+"; then
  echo ""
  echo "ERROR: Commit message does not follow conventional commit format."
  echo ""
  echo "Expected: type(scope): description"
  echo ""
  echo "Examples:"
  echo "  feat(my-board): add user authentication"
  echo "  fix(my-board): resolve null pointer in parser"
  echo "  docs(my-board): update API documentation"
  echo "  test(my-board): add unit tests for config module"
  echo ""
  echo "Allowed types: feat, fix, test, docs, refactor, chore, style, perf, ci, build, revert"
  exit 1
fi
`;

  await writeFile(hookPath, hookContent);
  await chmod(hookPath, 0o755);
}
