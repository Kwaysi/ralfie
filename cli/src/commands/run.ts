import { boardExists } from '../lib/board.js';
import { readConfig } from '../lib/config.js';
import { syncClaudeSettings } from '../lib/claude-settings.js';
import { generateSessionId, spawnPrintMode } from '../lib/agent.js';
import { prdPath, progressPath, planPath } from '../lib/paths.js';
import { saveRunPid, removeRunPid } from '../lib/run-tracker.js';

export async function runCommand(
  boardName: string,
  iterations?: number,
  cwd?: string,
): Promise<void> {
  const exists = await boardExists(boardName, cwd);
  if (!exists) {
    console.error(`Board "${boardName}" not found.`);
    process.exitCode = 1;
    return;
  }

  const config = await readConfig(cwd);
  const maxIterations = iterations ?? config.default_iterations;
  const sessionId = generateSessionId();

  await syncClaudeSettings(cwd);
  await saveRunPid(boardName, sessionId, process.pid, cwd);

  console.log(`Starting run for board "${boardName}" (session: ${sessionId})`);
  console.log(`Max iterations: ${maxIterations}`);

  const prd = prdPath(boardName, cwd);
  const progress = progressPath(boardName, cwd);
  const plan = planPath(boardName, cwd);

  try {
    for (let i = 1; i <= maxIterations; i++) {
      console.log(`\nIteration ${i}/${maxIterations}`);

      const prompt = [
        `You are session ${sessionId}.`,
        `Use the /ralf-run skill to execute one iteration.`,
        `Board files: @${prd} @${progress} @${plan}`,
      ].join(' ');

      const result = await spawnPrintMode(prompt, cwd);

      if (result.complete) {
        console.log('\nAll items complete. Stopping run.');
        return;
      }

      if (result.exitCode !== 0) {
        console.error(`\nAgent exited with code ${result.exitCode}. Stopping run.`);
        process.exitCode = 1;
        return;
      }
    }

    console.log(`\nReached max iterations (${maxIterations}).`);
  } finally {
    await removeRunPid(boardName, sessionId, cwd);
  }
}
