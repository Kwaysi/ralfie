import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile, writeFile, stat, mkdir, chmod } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { initCommand } from '../init.js';
import { configPath, boardsDir, ralfieDir, ralfMdPath, claudeMdPath } from '../../lib/paths.js';
import { claudeSettingsPath } from '../../lib/claude-settings.js';

const execFileAsync = promisify(execFile);

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

    // .claude/skills/ folders exist with SKILL.md
    const skillsDir = join(tmp, '.claude', 'skills');
    for (const name of ['ralf-plan', 'ralf-edit', 'ralf-run', 'ralf-finalize', 'ralf-review']) {
      const content = await readFile(join(skillsDir, name, 'SKILL.md'), 'utf-8');
      expect(content.length).toBeGreaterThan(0);
    }

    // .claude/settings.json has permissions and effort/model
    const settings = JSON.parse(await readFile(claudeSettingsPath(tmp), 'utf-8'));
    expect(settings.permissions.allow).toEqual(
      expect.arrayContaining(['Bash', 'Edit', 'Write', 'Read']),
    );
    expect(settings.effortLevel).toBe('medium');
    expect(settings.model).toBe('claude-opus-4-6');

    // CLAUDE.md exists with Ralfie section
    const claudeMd = await readFile(claudeMdPath(tmp), 'utf-8');
    expect(claudeMd).toContain('## Ralfie');
    expect(claudeMd).toContain('@.ralfie/RALF.md');

    // .ralfie/RALF.md exists with documentation
    const ralfMd = await readFile(ralfMdPath(tmp), 'utf-8');
    expect(ralfMd).toContain('## How Ralfie Works');
    expect(ralfMd).toContain('## Active Boards');
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

  it('running init twice does not duplicate CLAUDE.md section or regenerate RALF.md', async () => {
    await initCommand(tmp);
    const claudeFirst = await readFile(claudeMdPath(tmp), 'utf-8');
    const ralfFirst = await readFile(ralfMdPath(tmp), 'utf-8');

    await initCommand(tmp);
    const claudeSecond = await readFile(claudeMdPath(tmp), 'utf-8');
    const ralfSecond = await readFile(ralfMdPath(tmp), 'utf-8');

    expect(claudeSecond).toBe(claudeFirst);
    expect(ralfSecond).toBe(ralfFirst);
  });

  it('running init with existing boards populates RALF.md board entries', async () => {
    // Create a board before running init
    const boardPath = join(tmp, '.ralfie', 'boards', 'test-board');
    await mkdir(boardPath, { recursive: true });
    await writeFile(join(boardPath, 'meta.json'), JSON.stringify({ name: 'test-board', description: 'A test board' }));
    await writeFile(join(boardPath, 'prd.json'), JSON.stringify({ project: 'test-board', description: 'A test board', items: [] }));
    await writeFile(join(boardPath, 'plan.md'), '# Plan');
    await writeFile(join(boardPath, 'progress.md'), '');

    await initCommand(tmp);

    const ralfMd = await readFile(ralfMdPath(tmp), 'utf-8');
    expect(ralfMd).toContain('**test-board**');
    expect(ralfMd).toContain('A test board');
  });

  it('is idempotent — running twice produces the same settings', async () => {
    await initCommand(tmp);
    const first = await readFile(claudeSettingsPath(tmp), 'utf-8');

    await initCommand(tmp);
    const second = await readFile(claudeSettingsPath(tmp), 'utf-8');

    expect(JSON.parse(first)).toEqual(JSON.parse(second));
  });

  describe('commit-msg hook', () => {
    beforeEach(async () => {
      // Make tmp a git repo so the hook can be installed
      await execFileAsync('git', ['init'], { cwd: tmp });
      await execFileAsync('git', ['config', 'user.email', 'test@test.com'], { cwd: tmp });
      await execFileAsync('git', ['config', 'user.name', 'Test'], { cwd: tmp });
    });

    it('installs commit-msg hook with ralfie marker', async () => {
      await initCommand(tmp);

      const hookPath = join(tmp, '.git', 'hooks', 'commit-msg');
      const content = await readFile(hookPath, 'utf-8');
      expect(content).toContain('# ralfie-managed-hook');

      // Hook should be executable
      const hookStat = await stat(hookPath);
      const isExecutable = (hookStat.mode & 0o111) !== 0;
      expect(isExecutable).toBe(true);
    });

    it('does not overwrite a non-ralfie commit-msg hook', async () => {
      const hookPath = join(tmp, '.git', 'hooks', 'commit-msg');
      await mkdir(join(tmp, '.git', 'hooks'), { recursive: true });
      await writeFile(hookPath, '#!/bin/sh\n# custom user hook\nexit 0\n');
      await chmod(hookPath, 0o755);

      await initCommand(tmp);

      const content = await readFile(hookPath, 'utf-8');
      expect(content).toContain('# custom user hook');
      expect(content).not.toContain('# ralfie-managed-hook');
    });

    it('overwrites an existing ralfie-managed hook on re-init', async () => {
      await initCommand(tmp);
      const hookPath = join(tmp, '.git', 'hooks', 'commit-msg');

      // Corrupt the hook content but keep the marker
      await writeFile(hookPath, '#!/bin/sh\n# ralfie-managed-hook\n# corrupted\n');

      await initCommand(tmp);

      const content = await readFile(hookPath, 'utf-8');
      expect(content).toContain('# ralfie-managed-hook');
      expect(content).toContain('conventional commit format');
      expect(content).not.toContain('# corrupted');
    });
  });
});
