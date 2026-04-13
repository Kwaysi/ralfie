import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { readConfig } from './config.js';

export interface SpawnResult {
  exitCode: number;
  stdout: string;
  result: string;
  complete: boolean;
  sessionId: string | null;
}

export interface JsonOutput {
  type: string;
  session_id?: string;
  result?: string;
  stop_reason?: string;
}

export function parseJsonOutput(raw: string): { sessionId: string | null; result: string } {
  try {
    const parsed = JSON.parse(raw) as JsonOutput;
    return {
      sessionId: parsed.session_id ?? null,
      result: parsed.result ?? raw,
    };
  } catch {
    return { sessionId: null, result: raw };
  }
}

export function generateSessionId(): string {
  const timestamp = Date.now();
  const random = randomBytes(4).toString('hex');
  return `ralfie-${timestamp}-${random}`;
}

export async function spawnInteractive(
  prompt: string,
  cwd?: string,
): Promise<number> {
  const config = await readConfig(cwd);
  const [cmd, ...baseArgs] = config.agent_command.split(/\s+/);
  const args = [...baseArgs, prompt];

  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      stdio: 'inherit',
      cwd: cwd ?? process.cwd(),
      detached: true,
    });

    let resolved = false;

    const finish = (code: number) => {
      if (resolved) return;
      resolved = true;

      if (child.pid) {
        try {
          process.kill(-child.pid, 'SIGTERM');
        } catch {
          // Process group already gone — ignore
        }
      }

      resolve(code);
    };

    child.on('close', (code) => {
      finish(code ?? 1);
    });

    child.on('error', () => {
      finish(1);
    });
  });
}

function spawnWithJsonOutput(cmd: string, args: string[], cwd: string): Promise<SpawnResult> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      stdio: ['inherit', 'pipe', 'inherit'],
      cwd,
      detached: true,
    });

    let stdout = '';
    let resolved = false;

    const finish = (code: number) => {
      if (resolved) return;
      resolved = true;

      if (child.pid) {
        try {
          process.kill(-child.pid, 'SIGTERM');
        } catch {
          // Process group already gone — ignore
        }
      }

      const { sessionId, result } = parseJsonOutput(stdout);

      resolve({
        exitCode: code,
        stdout,
        result,
        complete: result.includes('<ralfie>COMPLETE</ralfie>'),
        sessionId,
      });
    };

    child.stdout!.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      stdout += text;
      process.stdout.write(text);
    });

    child.on('close', (code) => {
      finish(code ?? 1);
    });

    child.on('error', () => {
      finish(1);
    });
  });
}

export async function spawnPrintMode(
  prompt: string,
  cwd?: string,
): Promise<SpawnResult> {
  const config = await readConfig(cwd);
  const [cmd, ...baseArgs] = config.agent_command.split(/\s+/);
  const args = [...baseArgs, '-p', prompt, '--output-format', 'json'];
  return spawnWithJsonOutput(cmd, args, cwd ?? process.cwd());
}

export async function spawnResume(
  sessionId: string,
  prompt: string,
  cwd?: string,
): Promise<SpawnResult> {
  const config = await readConfig(cwd);
  const [cmd, ...baseArgs] = config.agent_command.split(/\s+/);
  const args = [...baseArgs, '--resume', sessionId, '-p', prompt, '--output-format', 'json'];
  return spawnWithJsonOutput(cmd, args, cwd ?? process.cwd());
}
