import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { syncClaudeSettings, claudeSettingsPath } from '../claude-settings.js';
import { writeConfig, defaultConfig } from '../config.js';

let tmp: string;

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'ralfie-claude-settings-'));
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

describe('syncClaudeSettings', () => {
  it('creates .claude/settings.json with effortLevel and model from config defaults', async () => {
    await writeConfig(defaultConfig, tmp);
    await syncClaudeSettings(tmp);

    const raw = await readFile(claudeSettingsPath(tmp), 'utf-8');
    const settings = JSON.parse(raw);
    expect(settings.effortLevel).toBe('medium');
    expect(settings.model).toBe('claude-opus-4-6');
  });

  it('maps model names correctly', async () => {
    await writeConfig({ ...defaultConfig, model: 'sonnet' }, tmp);
    await syncClaudeSettings(tmp);

    const raw = await readFile(claudeSettingsPath(tmp), 'utf-8');
    const settings = JSON.parse(raw);
    expect(settings.model).toBe('claude-sonnet-4-6');
  });

  it('maps haiku model correctly', async () => {
    await writeConfig({ ...defaultConfig, model: 'haiku' }, tmp);
    await syncClaudeSettings(tmp);

    const raw = await readFile(claudeSettingsPath(tmp), 'utf-8');
    const settings = JSON.parse(raw);
    expect(settings.model).toBe('claude-haiku-4-5-20251001');
  });

  it('preserves existing settings when merging', async () => {
    const settingsPath = claudeSettingsPath(tmp);
    await mkdir(join(tmp, '.claude'), { recursive: true });
    await writeFile(settingsPath, JSON.stringify({
      theme: 'dark',
      permissions: { allow: ['Bash', 'Read'] },
      effortLevel: 'low',
    }, null, 2));

    await writeConfig({ ...defaultConfig, effort: 'high', model: 'sonnet' }, tmp);
    await syncClaudeSettings(tmp);

    const raw = await readFile(settingsPath, 'utf-8');
    const settings = JSON.parse(raw);
    expect(settings.theme).toBe('dark');
    expect(settings.permissions).toEqual({ allow: ['Bash', 'Read'] });
    expect(settings.effortLevel).toBe('high');
    expect(settings.model).toBe('claude-sonnet-4-6');
  });

  it('creates .claude/settings.json when it does not exist', async () => {
    await syncClaudeSettings(tmp);

    const raw = await readFile(claudeSettingsPath(tmp), 'utf-8');
    const settings = JSON.parse(raw);
    expect(settings.effortLevel).toBe('medium');
    expect(settings.model).toBe('claude-opus-4-6');
  });
});
