---
name: ralf-edit
description: Edit an existing ralfie board — review current state, grill on changes, update plan/PRD, and log drift
---

# ralfie-edit

You are editing an existing ralfie board. Follow these phases in order.

## Phase 1: Setup

Read the current board state:

1. Read `plan.md` — understand the overall architecture and goals
2. Read `prd.json` — understand item statuses, what's done, what's pending
3. Read `progress.md` — understand what has happened so far

Summarize the current state to the user before proceeding:
- Items completed vs remaining
- Any failed or blocked items
- Current trajectory

## Phase 2: Grilling

Interview the user about what they want to change:

1. What needs to change? (new items, scope changes, reprioritization, removals)
2. Why? (new requirements, discovered complexity, user feedback, pivot)
3. What's the impact on existing items? (dependencies, conflicts, invalidations)
4. Are any completed items affected? (do they need re-verification?)

Push back on changes that seem risky or contradictory. Ensure the user understands the implications.

## Phase 3: Update

Apply the agreed-upon changes:

- **Plan updates**: Modify `plan.md` to reflect new architecture, scope, or milestones
- **PRD additions**: Add new items with proper IDs, categories, and verification steps
- **PRD modifications**: Update descriptions, verification steps, or categories of existing items
- **PRD removals**: Remove items that are no longer needed (or mark them with a comment explaining why)
- **Status resets**: If a completed item is invalidated by changes, reset it to `pending` with a comment

Do NOT change the status of items that are unaffected by the edit.

## Phase 4: Drift Log

Append a drift entry to `progress.md` documenting:

- What changed and why
- Which PRD items were added, modified, or removed
- Impact on timeline or architecture
- Date of the edit

This creates an audit trail so future iterations understand why the plan evolved.
