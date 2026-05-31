import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { readConfig } from './config.js';
import type { AgentModel, EffortLevel } from '@ralfie/shared';

const MODEL_MAP: Record<AgentModel, string> = {
  opus: 'claude-opus-4-6',
  sonnet: 'claude-sonnet-4-6',
  haiku: 'claude-haiku-4-5-20251001',
};

export function claudeSettingsPath(cwd = process.cwd()): string {
  return join(cwd, '.claude', 'settings.json');
}

export async function syncClaudeSettings(
  cwd?: string,
  overrides?: { model?: AgentModel; effort?: EffortLevel },
): Promise<void> {
  const config = await readConfig(cwd);
  const settingsPath = claudeSettingsPath(cwd);

  let existing: Record<string, unknown> = {};
  try {
    const raw = await readFile(settingsPath, 'utf-8');
    existing = JSON.parse(raw);
  } catch {
    // File doesn't exist or isn't valid JSON — start fresh
  }

  const merged = {
    ...existing,
    effortLevel: overrides?.effort ?? config.effort,
    model: MODEL_MAP[overrides?.model ?? config.model],
  };

  await mkdir(dirname(settingsPath), { recursive: true });
  await writeFile(settingsPath, JSON.stringify(merged, null, 2) + '\n');
}
