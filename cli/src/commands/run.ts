import { boardExists } from '../lib/board.js';
import { readConfig } from '../lib/config.js';
import { syncClaudeSettings } from '../lib/claude-settings.js';
import { type SpawnResult, generateSessionId, spawnPrintMode, spawnResume } from '../lib/agent.js';
import { prdPath, progressPath, planPath, unresolvedPath } from '../lib/paths.js';
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
import { readFile, appendFile, writeFile } from 'node:fs/promises';
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

  const initialConfig = await readConfig(cwd);
  const maxIterations = iterations ?? initialConfig.default_iterations;
  const sessionId = generateSessionId();

  await saveRunPid(boardName, sessionId, process.pid, cwd);

  console.log(`Starting run for board "${boardName}" (session: ${sessionId})`);
  console.log(`Max iterations: ${maxIterations}`);

  const prd = prdPath(boardName, cwd);
  const progress = progressPath(boardName, cwd);
  const plan = planPath(boardName, cwd);

  try {
    let prevImplSessionId: string | null = null;
    let reviewerSessionId: string | null = null;

    for (let i = 1; i <= maxIterations; i++) {
      const config = await readConfig(cwd);
      console.log(`\nIteration ${i}/${maxIterations}`);

      // Step 1: Spawn implementor with ralf-run
      // Reuse the previous implementor session when possible to benefit from
      // prompt caching — the system prompt, skills, and prior messages become
      // a cached prefix, reducing cost and latency.
      await syncClaudeSettings(cwd);
      const implementPrompt = [
        `You are session ${sessionId}.`,
        `Use the /ralf-run skill to execute one iteration.`,
        `Board files: @${prd} @${plan}`,
        `If you need context on prior iterations, read ${progress} directly.`,
      ].join(' ');

      const implResult: SpawnResult = prevImplSessionId
        ? await spawnResume(prevImplSessionId, implementPrompt, cwd)
        : await spawnPrintMode(implementPrompt, cwd);

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

      const implSessionId: string | null = implResult.sessionId ?? prevImplSessionId;
      if (implSessionId) prevImplSessionId = implSessionId;

      // Step 2: Review loop (if enabled)
      let reviewPassed = !config.review_enabled;

      if (config.review_enabled && implSessionId) {
        for (let round = 1; round <= config.review_rounds; round++) {
          console.log(`\nReview round ${round}/${config.review_rounds}`);

          // Reuse reviewer session across rounds/iterations for prompt caching
          await syncClaudeSettings(cwd, { model: config.review_model, effort: config.review_effort });
          const reviewPrompt = [
            `Use the /ralf-review skill to review uncommitted changes.`,
            `PRD item context: @${prd}`,
          ].join(' ');

          const reviewResult: SpawnResult = reviewerSessionId
            ? await spawnResume(reviewerSessionId, reviewPrompt, cwd)
            : await spawnPrintMode(reviewPrompt, cwd);

          if (reviewResult.sessionId) reviewerSessionId = reviewResult.sessionId;

          if (reviewResult.exitCode !== 0) {
            console.error(`\nReviewer exited with code ${reviewResult.exitCode}. Skipping review.`);
            reviewPassed = true;
            break;
          }

          // Check for LGTM
          const resultText = reviewResult.result;
          if (resultText.includes('<ralfie>LGTM</ralfie>')) {
            console.log('\nReview passed: LGTM');
            reviewPassed = true;
            break;
          }

          // Not LGTM — resume implementor with findings
          if (round < config.review_rounds) {
            console.log('\nReview found issues. Resuming implementor with findings...');
            await syncClaudeSettings(cwd);
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
            const currentPrd = await readPrd(boardName, cwd);
            const activeItem = currentPrd.items.find((item) => item.status === 'in_progress');
            await appendUnresolved(boardName, activeItem?.id ?? 'unknown', resultText, cwd);
            reviewPassed = true;
          }
        }
      }

      if (!reviewPassed) {
        reviewPassed = true; // Fallback: always proceed to finalize
      }

      // Step 3: Finalize — resume implementor with ralf-finalize
      await syncClaudeSettings(cwd, { model: config.finalize_model, effort: config.finalize_effort });
      const finalizePrompt = [
        `Use the /ralf-finalize skill to finalize the completed item.`,
        `Board files: @${prd} @${plan}`,
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

      // Step 4: Compact implementor session to keep context lean for next iteration
      if (prevImplSessionId && i < maxIterations) {
        console.log('\nCompacting implementor session...');
        await syncClaudeSettings(cwd);
        const compactResult = await spawnResume(prevImplSessionId, '/compact', cwd);
        if (compactResult.exitCode !== 0) {
          console.warn(`Compaction exited with code ${compactResult.exitCode}. Continuing anyway.`);
        }
      }
    }

    console.log(`\nReached max iterations (${maxIterations}).`);
  } finally {
    await removeRunPid(boardName, sessionId, cwd);
  }
}

async function appendUnresolved(boardName: string, itemId: string, findings: string, cwd?: string): Promise<void> {
  const filePath = unresolvedPath(boardName, cwd);
  const timestamp = new Date().toISOString();
  const entry = `\n## ${itemId} — ${timestamp}\n\n${findings.trim()}\n`;

  let existing = '';
  try {
    existing = await readFile(filePath, 'utf-8');
  } catch {
    // File doesn't exist yet
  }

  if (!existing) {
    await writeFile(filePath, `# Unresolved Review Findings\n${entry}`);
  } else {
    await appendFile(filePath, entry);
  }
  console.log(`Saved unresolved findings to ${filePath}`);
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
