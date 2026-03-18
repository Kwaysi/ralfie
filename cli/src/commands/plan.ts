import { skillsInstalled } from '../lib/skills.js';
import { spawnInteractive } from '../lib/agent.js';

export async function planCommand(cwd?: string): Promise<void> {
  const installed = await skillsInstalled(cwd);
  if (!installed) {
    console.error('Skills not installed. Run "ralf init" first.');
    process.exitCode = 1;
    return;
  }

  const prompt = 'Use the /ralfie-plan skill to create a new board with a plan and PRD.';
  const exitCode = await spawnInteractive(prompt, cwd);
  process.exitCode = exitCode;
}
