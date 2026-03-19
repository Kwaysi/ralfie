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
    });

    child.on('close', (code) => {
      resolve(code ?? 1);
    });

    child.on('error', () => {
      resolve(1);
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
    });

    let stdout = '';

    child.stdout!.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      stdout += text;
      process.stdout.write(text);
    });

    child.on('close', (code) => {
      resolve({
        exitCode: code ?? 1,
        stdout,
        complete: stdout.includes('<ralfie>COMPLETE</ralfie>'),
      });
    });

    child.on('error', () => {
      resolve({
        exitCode: 1,
        stdout,
        complete: false,
      });
    });
  });
}
