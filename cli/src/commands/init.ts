import { mkdir } from 'node:fs/promises';
import { readConfig, writeConfig } from '../lib/config.js';
import { ralfieDir, boardsDir } from '../lib/paths.js';
import { installSkills } from '../lib/skills.js';

export async function initCommand(cwd?: string): Promise<void> {
  // Create .ralfie directory structure
  await mkdir(ralfieDir(cwd), { recursive: true });
  await mkdir(boardsDir(cwd), { recursive: true });

  // Write default config only if it doesn't exist
  const existingConfig = await readConfig(cwd);
  await writeConfig(existingConfig, cwd);

  // Install Claude Code skills
  await installSkills(cwd);

  console.log('Initialized ralfie project.');
  console.log('  .ralfie/config.json');
  console.log('  .ralfie/boards/');
  console.log('  .claude/skills/ralfie-plan.md');
  console.log('  .claude/skills/ralfie-edit.md');
  console.log('  .claude/skills/ralfie-run.md');
}
