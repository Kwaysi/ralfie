import { skillsInstalled } from '../lib/skills.js';
import { spawnInteractive } from '../lib/agent.js';

export async function planCommand(context?: string, cwd?: string): Promise<void> {
  const installed = await skillsInstalled(cwd);
  if (!installed) {
    console.error('Skills not installed. Run "ralf init" first.');
    process.exitCode = 1;
    return;
  }

  let prompt = 'Use the /ralf-plan skill to create a new board with a plan and PRD.';
  if (context) {
    prompt += `\n\nContext:\n${context}`;
  }
  const exitCode = await spawnInteractive(prompt, cwd);
  process.exitCode = exitCode;
}
