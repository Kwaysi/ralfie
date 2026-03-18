import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile, writeFile, stat, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initCommand } from '../init.js';
import { configPath, boardsDir, ralfieDir } from '../../lib/paths.js';
import { claudeSettingsPath } from '../../lib/claude-settings.js';

let tmp: string;

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'ralfie-init-'));
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

describe('init', () => {
  it('creates .ralfie directory, config.json, boards/, installs skills, and writes settings.json', async () => {
    await initCommand(tmp);

    // .ralfie/config.json exists with defaults
    const config = JSON.parse(await readFile(configPath(tmp), 'utf-8'));
    expect(config.agent_command).toBe('claude');
    expect(config.default_iterations).toBe(10);
    expect(config.serve_port).toBe(3333);

    // .ralfie/boards/ exists
    const boardsStat = await stat(boardsDir(tmp));
    expect(boardsStat.isDirectory()).toBe(true);

    // .claude/skills/ files exist
    const skillsDir = join(tmp, '.claude', 'skills');
    for (const file of ['ralfie-plan.md', 'ralfie-edit.md', 'ralfie-run.md']) {
      const content = await readFile(join(skillsDir, file), 'utf-8');
      expect(content.length).toBeGreaterThan(0);
    }

    // .claude/settings.json has permissions and effort/model
    const settings = JSON.parse(await readFile(claudeSettingsPath(tmp), 'utf-8'));
    expect(settings.permissions.allow).toEqual(
      expect.arrayContaining(['Bash', 'Edit', 'Write', 'Read']),
    );
    expect(settings.effortLevel).toBe('medium');
    expect(settings.model).toBe('claude-opus-4-6');
  });

  it('does not overwrite modified config.json on second init', async () => {
    await initCommand(tmp);

    // Modify config
    const customConfig = {
      agent_command: 'custom-agent',
      default_iterations: 20,
      feedback_loops: ['npm test'],
      serve_port: 4444,
    };
    await writeFile(configPath(tmp), JSON.stringify(customConfig, null, 2) + '\n');

    // Run init again
    await initCommand(tmp);

    // Config should still have custom values
    const config = JSON.parse(await readFile(configPath(tmp), 'utf-8'));
    expect(config.agent_command).toBe('custom-agent');
    expect(config.default_iterations).toBe(20);
    expect(config.serve_port).toBe(4444);
  });

  it('preserves existing permissions and settings in .claude/settings.json', async () => {
    // Pre-create settings with extra permissions and settings
    const settingsPath = claudeSettingsPath(tmp);
    await mkdir(join(tmp, '.claude'), { recursive: true });
    await writeFile(
      settingsPath,
      JSON.stringify({
        permissions: { allow: ['WebSearch', 'Bash'] },
        theme: 'dark',
      }, null, 2) + '\n',
    );

    await initCommand(tmp);

    const settings = JSON.parse(await readFile(settingsPath, 'utf-8'));
    // Existing permissions preserved + required ones added
    expect(settings.permissions.allow).toEqual(
      expect.arrayContaining(['WebSearch', 'Bash', 'Edit', 'Write', 'Read']),
    );
    // Existing settings preserved
    expect(settings.theme).toBe('dark');
    // Effort/model still set
    expect(settings.effortLevel).toBe('medium');
    expect(settings.model).toBe('claude-opus-4-6');
  });

  it('is idempotent — running twice produces the same settings', async () => {
    await initCommand(tmp);
    const first = await readFile(claudeSettingsPath(tmp), 'utf-8');

    await initCommand(tmp);
    const second = await readFile(claudeSettingsPath(tmp), 'utf-8');

    expect(JSON.parse(first)).toEqual(JSON.parse(second));
  });
});
