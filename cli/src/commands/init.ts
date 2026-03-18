import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { readConfig, writeConfig } from '../lib/config.js';
import { ralfieDir, boardsDir } from '../lib/paths.js';
import { installSkills } from '../lib/skills.js';
import { claudeSettingsPath, syncClaudeSettings } from '../lib/claude-settings.js';

const REQUIRED_PERMISSIONS = ['Bash', 'Edit', 'Write', 'Read'];

export async function initCommand(cwd?: string): Promise<void> {
  // Create .ralfie directory structure
  await mkdir(ralfieDir(cwd), { recursive: true });
  await mkdir(boardsDir(cwd), { recursive: true });

  // Write default config only if it doesn't exist
  const existingConfig = await readConfig(cwd);
  await writeConfig(existingConfig, cwd);

  // Install Claude Code skills
  await installSkills(cwd);

  // Merge permissions into .claude/settings.json
  await mergePermissions(cwd);

  // Sync effort and model settings
  await syncClaudeSettings(cwd);

  console.log('Initialized ralfie project.');
  console.log('  .ralfie/config.json');
  console.log('  .ralfie/boards/');
  console.log('  .claude/skills/ralfie-plan.md');
  console.log('  .claude/skills/ralfie-edit.md');
  console.log('  .claude/skills/ralfie-run.md');
  console.log('  .claude/settings.json');
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
