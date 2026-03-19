---
name: ralf-run
description: Execute a ralfie board iteration — pick a task, implement it, run feedback loops, update progress, and commit
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

Claim the selected item by setting its status to `in_progress` and `assigned_to` to your session ID. This prevents other agents from working on the same item. The `claimItem` function in `prd.ts` automatically sets `started_at` to the current ISO timestamp when claiming.

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

## Step 5: Update Progress

Append to `progress.md`:
- Item ID and description
- Key decisions made
- Files changed
- Any notes for future iterations

## Step 6: Update PRD

Mark the item as `done` in `prd.json`:
- Set `status` to `done`
- Set `passes` to `true`

The `completeItem` function in `prd.ts` automatically sets `completed_at` to the current ISO timestamp when marking done.

## Step 7: Commit

Create a git commit with:
- A descriptive message referencing the item ID
- Only the files relevant to this item

## Step 8: Check Completion

Read the updated `prd.json`. If ALL items have status `done` or `verified`, output:

```
<ralfie>COMPLETE</ralfie>
```

This signals the runner to stop the iteration loop.

## Failure Protocol

If you cannot complete an item:

1. Set its status to `failed` in `prd.json`
2. Add a comment explaining what went wrong and what you tried
3. Clear `assigned_to`
4. Append failure details to `progress.md`
5. Move on to the next item — do NOT get stuck retrying

Fail fast. It's better to mark an item as failed and move on than to waste iterations on a blocker.
