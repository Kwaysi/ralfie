import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { readConfig } from './config.js';

export interface SpawnResult {
  exitCode: number;
  stdout: string;
  complete: boolean;
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

export async function spawnPrintMode(
  prompt: string,
  cwd?: string,
): Promise<SpawnResult> {
  const config = await readConfig(cwd);
  const [cmd, ...baseArgs] = config.agent_command.split(/\s+/);
  const args = [...baseArgs, '-p', prompt];

  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      stdio: ['inherit', 'pipe', 'inherit'],
      cwd: cwd ?? process.cwd(),
      detached: true,
    });

    let stdout = '';
    let resolved = false;

    const finish = (code: number) => {
      if (resolved) return;
      resolved = true;

      // Kill the entire process group to clean up any orphaned children
      if (child.pid) {
        try {
          process.kill(-child.pid, 'SIGTERM');
        } catch {
          // Process group already gone — ignore
        }
      }

      resolve({
        exitCode: code,
        stdout,
        complete: stdout.includes('<ralfie>COMPLETE</ralfie>'),
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
