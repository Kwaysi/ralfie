# Plan: Agent Context via RALF.md

## Goal

Give ralfie-spawned agents automatic context about the project's ralfie state by creating a `.ralfie/RALF.md` file (referenced from CLAUDE.md). This file documents how ralfie works and lists all boards with links to their progress files, so agents understand the orchestration system and current project state without being told.

## Architecture

Two new behaviors wired into existing code paths:

1. **`ralf init`** — Creates/updates CLAUDE.md to reference `.ralfie/RALF.md`. Creates RALF.md (if missing) with ralfie documentation + entries for any existing boards.
2. **`createBoard`** — After writing board files, appends a board entry to RALF.md.

New module: `cli/src/lib/ralf-md.ts` — handles RALF.md generation and board entry appending. New module: `cli/src/lib/claude-md.ts` — handles CLAUDE.md Ralfie section injection.

### Data flow

```
ralf init
  → ensureClaudeMd()     // adds ## Ralfie section + @reference to CLAUDE.md
  → ensureRalfMd()       // creates .ralfie/RALF.md if missing, populates with existing boards

createBoard()
  → (existing file writes)
  → appendBoardToRalfMd() // adds board entry to RALF.md
```

## Tech Stack

Same as existing: Node.js, TypeScript, fs/promises. No new dependencies.

## Milestones

### M1: RALF.md generation (`ralf-md.ts`)
- **User story**: As a ralfie agent, I can read `.ralfie/RALF.md` to understand how ralfie works and see all active boards with progress links.
- **End state**: `ensureRalfMd(cwd)` creates `.ralfie/RALF.md` with ralfie documentation and entries for all existing boards. `appendBoardToRalfMd(name, description, cwd)` appends a new board entry. Both are tested.
- **Files**: `cli/src/lib/ralf-md.ts`, `cli/src/lib/__tests__/ralf-md.test.ts`

### M2: CLAUDE.md integration (`claude-md.ts`)
- **User story**: As a ralfie user, I can run `ralf init` and have CLAUDE.md automatically reference `.ralfie/RALF.md` so agents get context.
- **End state**: `ensureClaudeMd(cwd)` creates CLAUDE.md with a Ralfie section if it doesn't exist, or appends the section if CLAUDE.md exists but lacks it. Section includes `@.ralfie/RALF.md` reference. Tested for both cases.
- **Files**: `cli/src/lib/claude-md.ts`, `cli/src/lib/__tests__/claude-md.test.ts`

### M3: Wire into `ralf init`
- **User story**: As a ralfie user, `ralf init` sets up CLAUDE.md → RALF.md context chain automatically.
- **End state**: `initCommand` calls `ensureClaudeMd()` then `ensureRalfMd()`. Existing init tests updated, new assertions added.
- **Files**: `cli/src/commands/init.ts`, `cli/src/commands/__tests__/init.test.ts`

### M4: Wire into `createBoard`
- **User story**: As a ralfie user, when I create a board, RALF.md is automatically updated with the new board's progress link.
- **End state**: `createBoard` calls `appendBoardToRalfMd()`. Board test updated. Skill (ralf-plan Phase 4) also calls it or the skill's direct file writes are followed by RALF.md update.
- **Files**: `cli/src/lib/board.ts`, `cli/src/lib/__tests__/board.test.ts`, `cli/src/skills/ralf-plan/SKILL.md`

## Risks

- **Skill writes files directly**: The ralf-plan skill bypasses `createBoard`. We need to update the skill's Phase 4 to include a RALF.md update step.
- **CLAUDE.md formatting**: Users may have varied CLAUDE.md formats. The section injection needs to be conservative — append at end, don't parse structure.

## Out of Scope

- Removing boards from RALF.md when deleted
- Updating RALF.md when board status changes
- Auto-generating RALF.md content from board PRDs beyond the progress link
