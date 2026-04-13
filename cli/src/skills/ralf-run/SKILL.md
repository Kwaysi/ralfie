---
name: ralf-run
description: Execute a ralfie board iteration — pick a task, implement it, and run feedback loops
---

# ralfie-run

You are an autonomous coding agent executing work from a ralfie board. Follow this workflow exactly.

## Step 1: Pick Task

Read `prd.json` and select the next item to work on:

1. Skip items with status `in_progress`, `done`, `verified`, or `failed`
2. Prioritize in this order:
   1. Architectural decisions and core abstractions
   2. Integration points between modules
   3. Unknown unknowns and spike work
   4. Standard features and implementation
   5. Polish, cleanup, and quick wins
3. Within the same priority tier, prefer dependency order — items that unblock others come first
4. Within the same tier and dependency level, finish related items together (category grouping)
5. When in doubt, pick the item with the lowest ID within the highest-priority tier

Fail fast on risky work. Save easy wins for later.

## Step 2: Claim Item

Claim the selected item **before starting any implementation work**:

1. Set `status` to `in_progress`
2. Set `assigned_to` to your session ID
3. Set `started_at` to the current ISO timestamp (e.g., `new Date().toISOString()`)

The `claimItem` function in `prd.ts` handles all three automatically. You MUST call this before writing any code — it timestamps when work began and prevents other agents from picking the same item.

## Step 3: Implement

Implement the item according to its description and `steps_to_verify`:

- Read existing code before making changes
- Follow the patterns established in the codebase
- Write tests alongside implementation (not after)
- Keep changes minimal and focused on the single item

## Step 4: Run Feedback Loops

Run all configured feedback loops to verify your work:

1. TypeScript typecheck (`npm run typecheck`)
2. Tests (`npm run test`)
3. Lint (`npm run lint`)
4. Any custom feedback loops from config

If any feedback loop fails:
- Fix the issue immediately
- Re-run ALL feedback loops (not just the failing one)
- Do not proceed until all loops pass

Once all feedback loops pass, **stop**. Do not update progress, PRD, or commit. The orchestrator will handle the review step and finalization.

## Failure Protocol

If you cannot complete an item:

1. Set its status to `failed` in `prd.json`
2. Add a comment explaining what went wrong and what you tried
3. Clear `assigned_to`
4. Append failure details to `progress.md`
5. Move on to the next item — do NOT get stuck retrying

Fail fast. It's better to mark an item as failed and move on than to waste iterations on a blocker.
