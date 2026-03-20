import { execFile } from 'node:child_process';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';
import { readConfig, writeConfig } from '../lib/config.js';
import { ralfieDir, boardsDir } from '../lib/paths.js';
import { installSkills } from '../lib/skills.js';
import { claudeSettingsPath, syncClaudeSettings } from '../lib/claude-settings.js';
import { ensureClaudeMd } from '../lib/claude-md.js';
import { ensureRalfMd } from '../lib/ralf-md.js';
import { installCommitMsgHook } from '../lib/git.js';

const execFileAsync = promisify(execFile);

const REQUIRED_PERMISSIONS = ['Bash', 'Edit', 'Write', 'Read'];

export async function initCommand(cwd?: string): Promise<void> {
  // Create .ralfie directory structure
  await mkdir(ralfieDir(cwd), { recursive: true });
  await mkdir(boardsDir(cwd), { recursive: true });

  // Write default config, inferring user from git if not already set
  const existingConfig = await readConfig(cwd);
  if (!existingConfig.user) {
    existingConfig.user = await getGitUserName();
  }
  await writeConfig(existingConfig, cwd);

  // Install Claude Code skills
  await installSkills(cwd);

  // Merge permissions into .claude/settings.json
  await mergePermissions(cwd);

  // Sync effort and model settings
  await syncClaudeSettings(cwd);

  // Set up agent context chain: CLAUDE.md → RALF.md
  await ensureClaudeMd(cwd);
  await ensureRalfMd(cwd);

  // Install conventional commit hook (only in git repos)
  await installCommitMsgHookSafe(cwd);

  console.log('Initialized ralfie project.');
  console.log('  .ralfie/config.json');
  console.log('  .ralfie/boards/');
  console.log('  .claude/skills/ralf-plan/SKILL.md');
  console.log('  .claude/skills/ralf-edit/SKILL.md');
  console.log('  .claude/skills/ralf-run/SKILL.md');
  console.log('  .claude/settings.json');
  console.log('  CLAUDE.md');
  console.log('  .ralfie/RALF.md');
}

async function getGitUserName(): Promise<string> {
  try {
    const { stdout } = await execFileAsync('git', ['config', 'user.name']);
    return stdout.trim();
  } catch {
    return '';
  }
}

async function installCommitMsgHookSafe(cwd?: string): Promise<void> {
  const dir = cwd ?? process.cwd();
  try {
    await stat(join(dir, '.git'));
    await installCommitMsgHook(dir);
  } catch {
    // Not a git repo — skip hook installation silently
  }
}

async function mergePermissions(cwd?: string): Promise<void> {
  const settingsPath = claudeSettingsPath(cwd);

  let existing: Record<string, unknown> = {};
  try {
    const raw = await readFile(settingsPath, 'utf-8');
    existing = JSON.parse(raw);
  } catch {
    // File doesn't exist or isn't valid JSON — start fresh
  }

  const permissions = (existing.permissions ?? {}) as Record<string, unknown>;
  const existingAllow = Array.isArray(permissions.allow) ? permissions.allow as string[] : [];

  // Merge required permissions without duplicates
  const merged = [...new Set([...existingAllow, ...REQUIRED_PERMISSIONS])];

  const updated = {
    ...existing,
    permissions: {
      ...permissions,
      allow: merged,
    },
  };

  await mkdir(dirname(settingsPath), { recursive: true });
  await writeFile(settingsPath, JSON.stringify(updated, null, 2) + '\n');
}
