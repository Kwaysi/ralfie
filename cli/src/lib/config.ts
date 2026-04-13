import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { configPath } from './paths.js';
import type { RalfieConfig } from '@ralfie/shared';

export const defaultConfig: RalfieConfig = {
  agent_command: 'claude',
  default_iterations: 10,
  feedback_loops: [],
  serve_port: 3333,
  effort: 'medium',
  model: 'opus',
  user: '',
  serve_pid: null,
  review_rounds: 3,
  review_enabled: true,
};

export async function readConfig(cwd?: string): Promise<RalfieConfig> {
  try {
    const raw = await readFile(configPath(cwd), 'utf-8');
    const partial = JSON.parse(raw) as Partial<RalfieConfig>;
    return { ...defaultConfig, ...partial };
  } catch {
    return { ...defaultConfig };
  }
}

export async function writeConfig(config: RalfieConfig, cwd?: string): Promise<void> {
  const path = configPath(cwd);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(config, null, 2) + '\n');
}
