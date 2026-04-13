---
name: ralf-finalize
description: Finalize a completed ralfie board item — update progress, mark done in PRD, commit, and check completion
---

# ralfie-finalize

You are an autonomous coding agent finalizing a completed item from a ralfie board. The implementation and review are already done — your job is to record progress, update the PRD, commit, and check if the board is complete.

You will be resumed in the same conversation that implemented the item, so you have full context of what was done.

## Step 1: Update Progress

Append to `progress.md` using this exact format:

```markdown
## ITEM-ID — Short Description

**Key decisions:**
- Decision or rationale

**Files changed:**
- `path/to/file` — what changed

**Notes:**
- Any notes for future iterations

---
```

Each progress entry MUST:
1. Start with a `## ITEM-ID — Description` heading (using the item's ID from `prd.json`)
2. Include key decisions, files changed, and notes sections
3. End with a `---` horizontal rule separator

This structure allows the UI to parse entries into individual collapsible cards.

## Step 2: Update PRD

Mark the item as `done` in `prd.json`:
- Set `status` to `done`
- Set `passes` to `true`

The `completeItem` function in `prd.ts` automatically sets `completed_at` to the current ISO timestamp when marking done.

## Step 3: Commit

Create a git commit using **conventional commit format**:

```
type(board-name): short description

ITEM-ID
```

- **type** — choose based on the nature of the change:
  - `feat` — new feature or capability
  - `fix` — bug fix
  - `test` — adding or updating tests
  - `docs` — documentation changes
  - `refactor` — code restructuring without behavior change
  - `chore` — maintenance, config, or tooling changes
- **scope** — always use the board name (e.g., `feat(my-board): ...`)
- **body** — include the item ID on its own line in the commit body

Examples:
```
feat(my-board): add user authentication endpoint

AUTH-3
```
```
fix(my-board): handle null response from API

API-7
```

Only commit files relevant to the current item.

## Step 4: Check Completion

Read the updated `prd.json`. If ALL items have status `done` or `verified`, output:

```
<ralfie>COMPLETE</ralfie>
```

This signals the runner to stop the iteration loop.
