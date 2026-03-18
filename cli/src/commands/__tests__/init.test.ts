import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile, writeFile, stat, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initCommand } from '../init.js';
import { configPath, boardsDir, ralfieDir } from '../../lib/paths.js';

let tmp: string;

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'ralfie-init-'));
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

describe('init', () => {
  it('creates .ralfie directory, config.json, boards/, and installs skills', async () => {
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
});
