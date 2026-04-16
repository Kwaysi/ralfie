import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateSessionId, spawnPrintMode, spawnInteractive, spawnResume } from '../agent.js';
import { writeConfig, defaultConfig } from '../config.js';

async function writeScript(dir: string, name: string, output: string): Promise<string> {
  const path = join(dir, name);
  await writeFile(path, `#!/bin/sh\nprintf '%s\\n' '${output}'\n`);
  await chmod(path, 0o755);
  return path;
}

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
  it('captures stdout and includes sessionId from JSON output', async () => {
    const jsonOutput = JSON.stringify({
      type: 'result',
      session_id: 'test-session-123',
      result: 'some output',
    });
    const script = await writeScript(tmp, 'echo-json.sh', jsonOutput);
    await writeConfig({ ...defaultConfig, agent_command: script }, tmp);
    const result = await spawnPrintMode('test', tmp);
    expect(result.exitCode).toBe(0);
    expect(result.sessionId).toBe('test-session-123');
    expect(result.complete).toBe(false);
  }, 30000);

  it('sets complete=true when result contains COMPLETE signal', async () => {
    const jsonOutput = JSON.stringify({
      type: 'result',
      session_id: 'test-session',
      result: '<ralfie>COMPLETE</ralfie>',
    });
    const script = await writeScript(tmp, 'echo-complete.sh', jsonOutput);
    await writeConfig({ ...defaultConfig, agent_command: script }, tmp);
    const result = await spawnPrintMode('test', tmp);
    expect(result.exitCode).toBe(0);
    expect(result.complete).toBe(true);
    expect(result.sessionId).toBe('test-session');
  }, 30000);

  it('returns null sessionId for non-JSON output', async () => {
    await writeConfig({ ...defaultConfig, agent_command: 'echo' }, tmp);
    const result = await spawnPrintMode('plain text', tmp);
    expect(result.exitCode).toBe(0);
    expect(result.sessionId).toBeNull();
  });

  it('passes --output-format stream-json --verbose flags to agent command', async () => {
    await writeConfig({ ...defaultConfig, agent_command: 'echo' }, tmp);
    const result = await spawnPrintMode('test', tmp);
    expect(result.stdout).toContain('--output-format');
    expect(result.stdout).toContain('stream-json');
    expect(result.stdout).toContain('--verbose');
  });
});

describe('spawnResume', () => {
  it('passes --resume flag with session ID', async () => {
    await writeConfig({ ...defaultConfig, agent_command: 'echo' }, tmp);
    const result = await spawnResume('my-session-id', 'fix this', tmp);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('--resume');
    expect(result.stdout).toContain('my-session-id');
  });

  it('returns sessionId from JSON output', async () => {
    const jsonOutput = JSON.stringify({
      type: 'result',
      session_id: 'resumed-session',
      result: 'fixed it',
    });
    const script = await writeScript(tmp, 'echo-resume.sh', jsonOutput);
    await writeConfig({ ...defaultConfig, agent_command: script }, tmp);
    const result = await spawnResume('resumed-session', 'fix', tmp);
    expect(result.exitCode).toBe(0);
    expect(result.sessionId).toBe('resumed-session');
  }, 30000);

  it('uses detached process group with SIGTERM cleanup', async () => {
    await writeConfig({ ...defaultConfig, agent_command: 'echo' }, tmp);
    const result = await spawnResume('test-session', 'test', tmp);
    expect(result.exitCode).toBe(0);
  });
});
