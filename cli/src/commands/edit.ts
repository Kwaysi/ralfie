import { skillsInstalled } from '../lib/skills.js';
import { boardExists } from '../lib/board.js';
import { spawnInteractive } from '../lib/agent.js';
import { boardDir } from '../lib/paths.js';

export async function editCommand(boardName: string, cwd?: string): Promise<void> {
  const installed = await skillsInstalled(cwd);
  if (!installed) {
    console.error('Skills not installed. Run "ralf init" first.');
    process.exitCode = 1;
    return;
  }

  const exists = await boardExists(boardName, cwd);
  if (!exists) {
    console.error(`Board "${boardName}" not found.`);
    process.exitCode = 1;
    return;
  }

  const dir = boardDir(boardName, cwd);
  const prompt = `Use the /ralf-edit skill to edit the board at ${dir}.`;
  const exitCode = await spawnInteractive(prompt, cwd);
  process.exitCode = exitCode;
}
