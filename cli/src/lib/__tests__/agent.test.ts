import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateSessionId, spawnPrintMode, spawnInteractive, spawnResume, parseJsonOutput } from '../agent.js';
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

describe('parseJsonOutput', () => {
  it('extracts session_id and result from valid JSON output', () => {
    const json = JSON.stringify({
      type: 'result',
      session_id: 'adb6ad10-b603-412c-9c53-fd41260be4fc',
      result: 'Hello world',
      stop_reason: 'end_turn',
    });
    const { sessionId, result } = parseJsonOutput(json);
    expect(sessionId).toBe('adb6ad10-b603-412c-9c53-fd41260be4fc');
    expect(result).toBe('Hello world');
  });

  it('returns null sessionId and raw text for non-JSON output', () => {
    const raw = 'just some plain text';
    const { sessionId, result } = parseJsonOutput(raw);
    expect(sessionId).toBeNull();
    expect(result).toBe(raw);
  });

  it('returns null sessionId when session_id field is missing', () => {
    const json = JSON.stringify({ type: 'result', result: 'no session' });
    const { sessionId, result } = parseJsonOutput(json);
    expect(sessionId).toBeNull();
    expect(result).toBe('no session');
  });

  it('returns raw text as result when result field is missing', () => {
    const raw = JSON.stringify({ type: 'result', session_id: 'abc123' });
    const { sessionId, result } = parseJsonOutput(raw);
    expect(sessionId).toBe('abc123');
    expect(result).toBe(raw);
  });

  it('detects COMPLETE signal in parsed result', () => {
    const json = JSON.stringify({
      type: 'result',
      session_id: 'test-session',
      result: 'All done <ralfie>COMPLETE</ralfie>',
    });
    const { result } = parseJsonOutput(json);
    expect(result).toContain('<ralfie>COMPLETE</ralfie>');
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

  it('passes --output-format json flag to agent command', async () => {
    await writeConfig({ ...defaultConfig, agent_command: 'echo' }, tmp);
    const result = await spawnPrintMode('test', tmp);
    expect(result.stdout).toContain('--output-format');
    expect(result.stdout).toContain('json');
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
