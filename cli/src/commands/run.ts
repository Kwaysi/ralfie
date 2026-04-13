import { boardExists } from '../lib/board.js';
import { readConfig } from '../lib/config.js';
import { syncClaudeSettings } from '../lib/claude-settings.js';
import { generateSessionId, spawnPrintMode, spawnResume } from '../lib/agent.js';
import { prdPath, progressPath, planPath } from '../lib/paths.js';
import { saveRunPid, removeRunPid } from '../lib/run-tracker.js';
import {
  isDirty,
  nextBranchName,
  createAndCheckoutBranch,
  isGhInstalled,
  push,
  createPr,
  getDefaultBranch,
} from '../lib/git.js';
import { readPrd } from '../lib/prd.js';

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

  // Pre-flight: check that gh CLI is available for PR creation
  if (!(await isGhInstalled(cwd))) {
    console.error(
      'The GitHub CLI (gh) is not installed. It is required for automatic PR creation.\nInstall it from https://cli.github.com/',
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

      // Step 1: Spawn implementor with ralf-run
      const implementPrompt = [
        `You are session ${sessionId}.`,
        `Use the /ralf-run skill to execute one iteration.`,
        `Board files: @${prd} @${progress} @${plan}`,
      ].join(' ');

      const implResult = await spawnPrintMode(implementPrompt, cwd);

      if (implResult.exitCode !== 0) {
        console.error(`\nAgent exited with code ${implResult.exitCode}. Stopping run.`);
        process.exitCode = 1;
        return;
      }

      if (implResult.complete) {
        console.log('\nAll items complete. Creating PR...');
        await pushAndCreatePr(boardName, cwd);
        return;
      }

      const implSessionId = implResult.sessionId;

      // Step 2: Review loop (if enabled)
      let reviewPassed = !config.review_enabled;

      if (config.review_enabled && implSessionId) {
        for (let round = 1; round <= config.review_rounds; round++) {
          console.log(`\nReview round ${round}/${config.review_rounds}`);

          // Spawn independent reviewer
          const reviewPrompt = [
            `Use the /ralf-review skill to review uncommitted changes.`,
            `PRD item context: @${prd}`,
          ].join(' ');

          const reviewResult = await spawnPrintMode(reviewPrompt, cwd);

          if (reviewResult.exitCode !== 0) {
            console.error(`\nReviewer exited with code ${reviewResult.exitCode}. Skipping review.`);
            reviewPassed = true;
            break;
          }

          // Check for LGTM
          const resultText = reviewResult.stdout;
          if (resultText.includes('<ralfie>LGTM</ralfie>')) {
            console.log('\nReview passed: LGTM');
            reviewPassed = true;
            break;
          }

          // Not LGTM — resume implementor with findings
          if (round < config.review_rounds) {
            console.log('\nReview found issues. Resuming implementor with findings...');
            const fixPrompt = [
              `The code reviewer found issues with your implementation. Please fix them:`,
              resultText,
              `After fixing, re-run all feedback loops (typecheck, test, lint) to verify.`,
            ].join('\n\n');

            const fixResult = await spawnResume(implSessionId, fixPrompt, cwd);

            if (fixResult.exitCode !== 0) {
              console.error(`\nImplementor fix round exited with code ${fixResult.exitCode}. Proceeding to finalize.`);
              reviewPassed = true;
              break;
            }
          } else {
            console.log(`\nMax review rounds (${config.review_rounds}) reached. Proceeding to finalize.`);
            reviewPassed = true;
          }
        }
      }

      if (!reviewPassed) {
        reviewPassed = true; // Fallback: always proceed to finalize
      }

      // Step 3: Finalize — resume implementor with ralf-finalize
      const finalizePrompt = [
        `Use the /ralf-finalize skill to finalize the completed item.`,
        `Board files: @${prd} @${progress} @${plan}`,
      ].join(' ');

      let finalizeResult;
      if (implSessionId) {
        finalizeResult = await spawnResume(implSessionId, finalizePrompt, cwd);
      } else {
        // No session ID available (e.g. review disabled and no JSON output) — spawn fresh
        finalizeResult = await spawnPrintMode(finalizePrompt, cwd);
      }

      if (finalizeResult.complete) {
        console.log('\nAll items complete. Creating PR...');
        await pushAndCreatePr(boardName, cwd);
        return;
      }

      if (finalizeResult.exitCode !== 0) {
        console.error(`\nFinalize exited with code ${finalizeResult.exitCode}. Stopping run.`);
        process.exitCode = 1;
        return;
      }
    }

    console.log(`\nReached max iterations (${maxIterations}).`);
  } finally {
    await removeRunPid(boardName, sessionId, cwd);
  }
}

async function pushAndCreatePr(boardName: string, cwd?: string): Promise<void> {
  const prdData = await readPrd(boardName, cwd);
  const title = prdData.description;
  const checklist = prdData.items
    .map((item) => `- [x] ${item.id}: ${item.description}`)
    .join('\n');
  const body = `## Completed Items\n\n${checklist}`;

  const baseBranch = await getDefaultBranch(cwd);

  await push(cwd);
  console.log('Pushed branch to origin.');

  const prUrl = await createPr(title, body, baseBranch, cwd);
  console.log(`PR created: ${prUrl}`);
}
