import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readConfig, writeConfig, defaultConfig } from '../config.js';

let tmp: string;

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'ralfie-config-'));
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

describe('config', () => {
  it('readConfig returns defaultConfig when no config file exists', async () => {
    const config = await readConfig(tmp);
    expect(config).toEqual(defaultConfig);
  });

  it('writeConfig creates .ralfie directory and writes config.json', async () => {
    await writeConfig(defaultConfig, tmp);
    const config = await readConfig(tmp);
    expect(config).toEqual(defaultConfig);
  });

  it('readConfig merges partial saved config with defaults', async () => {
    const partial = { agent_command: 'custom-agent', serve_port: 4444 };
    await writeConfig(partial as any, tmp);
    const config = await readConfig(tmp);
    expect(config).toEqual({
      agent_command: 'custom-agent',
      default_iterations: 10,
      feedback_loops: [],
      serve_port: 4444,
      effort: 'medium',
      model: 'opus',
      user: '',
    });
  });
});
