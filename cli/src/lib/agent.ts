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

interface StreamEvent {
  type: string;
  subtype?: string;
  session_id?: string;
  result?: string;
  message?: {
    content?: Array<{
      type: string;
      text?: string;
      name?: string;
      input?: unknown;
    }>;
  };
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
    let buffer = '';
    let sessionId: string | null = null;
    let result = '';
    let resolved = false;

    const handleLine = (line: string): void => {
      if (!line.trim()) return;
      let evt: StreamEvent;
      try {
        evt = JSON.parse(line) as StreamEvent;
      } catch {
        // Not a JSON event line — pass through verbatim so the user still sees it.
        process.stdout.write(line + '\n');
        return;
      }

      if (evt.type === 'system' && evt.subtype === 'init' && evt.session_id) {
        sessionId = evt.session_id;
        process.stdout.write(`[session ${evt.session_id}]\n`);
        return;
      }

      if (evt.type === 'assistant' && evt.message?.content) {
        for (const block of evt.message.content) {
          if (block.type === 'text' && block.text) {
            process.stdout.write(block.text);
            if (!block.text.endsWith('\n')) process.stdout.write('\n');
          } else if (block.type === 'tool_use' && block.name) {
            process.stdout.write(`[tool: ${block.name}]\n`);
          }
        }
        return;
      }

      if (evt.type === 'result') {
        if (evt.session_id) sessionId = evt.session_id;
        if (typeof evt.result === 'string') {
          result = evt.result;
          process.stdout.write(evt.result);
          if (!evt.result.endsWith('\n')) process.stdout.write('\n');
        }
        return;
      }
    };

    const finish = (code: number) => {
      if (resolved) return;
      resolved = true;

      if (buffer.trim()) handleLine(buffer);

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
        result,
        complete: result.includes('<ralfie>COMPLETE</ralfie>'),
        sessionId,
      });
    };

    child.stdout!.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      stdout += text;
      buffer += text;
      let idx: number;
      while ((idx = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 1);
        handleLine(line);
      }
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
  const args = [...baseArgs, '-p', prompt, '--output-format', 'stream-json', '--verbose'];
  return spawnWithJsonOutput(cmd, args, cwd ?? process.cwd());
}

export async function spawnResume(
  sessionId: string,
  prompt: string,
  cwd?: string,
): Promise<SpawnResult> {
  const config = await readConfig(cwd);
  const [cmd, ...baseArgs] = config.agent_command.split(/\s+/);
  const args = [...baseArgs, '--resume', sessionId, '-p', prompt, '--output-format', 'stream-json', '--verbose'];
  return spawnWithJsonOutput(cmd, args, cwd ?? process.cwd());
}
