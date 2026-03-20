import { boardExists } from '../lib/board.js';
import { readConfig } from '../lib/config.js';
import { syncClaudeSettings } from '../lib/claude-settings.js';
import { generateSessionId, spawnPrintMode } from '../lib/agent.js';
import { prdPath, progressPath, planPath } from '../lib/paths.js';
import { saveRunPid, removeRunPid } from '../lib/run-tracker.js';
import { isDirty, nextBranchName, createAndCheckoutBranch } from '../lib/git.js';

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

  // Pre-flight: abort if working tree has uncommitted changes
  if (await isDirty(cwd)) {
    console.error(
      'Working tree has uncommitted changes. Please commit or stash them before running.',
    );
    process.exitCode = 1;
    return;
  }

  // Create and checkout a new branch for this run
  const branchName = await nextBranchName(boardName, cwd);
  await createAndCheckoutBranch(branchName, cwd);
  console.log(`Created branch: ${branchName}`);

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
