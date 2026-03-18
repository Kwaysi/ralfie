import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateSessionId, spawnPrintMode, spawnInteractive } from '../agent.js';
import { writeConfig, defaultConfig } from '../config.js';

let tmp: string;

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'ralfie-agent-'));
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

describe('generateSessionId', () => {
  it('returns a string matching pattern ralfie-<timestamp>-<random>', () => {
    const id = generateSessionId();
    expect(id).toMatch(/^ralfie-\d+-[0-9a-f]{8}$/);
  });

  it('generates unique IDs', () => {
    const ids = new Set(Array.from({ length: 10 }, () => generateSessionId()));
    expect(ids.size).toBe(10);
  });
});

describe('spawnInteractive', () => {
  it('spawns the configured agent_command with inherited stdio and returns exit code', async () => {
    await writeConfig({ ...defaultConfig, agent_command: 'echo hello' }, tmp);
    const exitCode = await spawnInteractive('test prompt', tmp);
    expect(exitCode).toBe(0);
  });
});

describe('spawnPrintMode', () => {
  it('captures stdout and sets complete=false when no COMPLETE signal', async () => {
    await writeConfig({ ...defaultConfig, agent_command: 'echo' }, tmp);
    const result = await spawnPrintMode('some output', tmp);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('some output');
    expect(result.complete).toBe(false);
  });

  it('sets complete=true when output contains <ralfie>COMPLETE</ralfie>', async () => {
    await writeConfig({ ...defaultConfig, agent_command: 'echo' }, tmp);
    const result = await spawnPrintMode('<ralfie>COMPLETE</ralfie>', tmp);
    expect(result.exitCode).toBe(0);
    expect(result.complete).toBe(true);
  });
});
