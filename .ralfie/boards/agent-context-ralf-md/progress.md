
## RALF-1: RALF.md Generation

**Status**: done
**Session**: ralfie-1773917945561-b92fa8b1

### What was done
- Created `cli/src/lib/ralf-md.ts` with two exports:
  - `ensureRalfMd(cwd)` — generates `.ralfie/RALF.md` with ralfie documentation and entries for all existing boards. Idempotent (skips if file exists).
  - `appendBoardToRalfMd(name, description, cwd)` — appends a board entry to RALF.md. Creates RALF.md if missing. Skips duplicates.
- Added `ralfMdPath()` helper to `cli/src/lib/paths.ts`
- Created comprehensive test suite (`cli/src/lib/__tests__/ralf-md.test.ts`) with 7 tests covering all `steps_to_verify`

### Key decisions
- RALF.md includes a "How Ralfie Works" section explaining the orchestration system, board structure, and workflow
- Board entries use relative paths for portability: `.ralfie/boards/<name>/progress.md`
- `ensureRalfMd` is a one-shot: it creates the file with current board state but won't overwrite if it already exists (idempotent)
- `appendBoardToRalfMd` checks for duplicate entries by matching `**<name>**` in existing content

### Files changed
- `cli/src/lib/paths.ts` — added `ralfMdPath` export
- `cli/src/lib/ralf-md.ts` — new module
- `cli/src/lib/__tests__/ralf-md.test.ts` — new test file

---

## RALF-2: CLAUDE.md Integration

**Session**: ralfie-1773918134806-74f1139b
**Status**: done

### What was done
- Created `cli/src/lib/claude-md.ts` with `ensureClaudeMd(cwd)`:
  - When CLAUDE.md doesn't exist: creates it with `## Ralfie` section and `@.ralfie/RALF.md` reference
  - When CLAUDE.md exists without Ralfie section: appends the section, preserving existing content
  - When CLAUDE.md already has the Ralfie section: no-op (idempotent)
- Added `claudeMdPath()` helper to `cli/src/lib/paths.ts`
- Created test suite (`cli/src/lib/__tests__/claude-md.test.ts`) with 4 tests covering all `steps_to_verify`

### Key decisions
- `claudeMdPath` points to `CLAUDE.md` in project root (not `.ralfie/`)
- Same patterns as `ralf-md.ts`: try/catch readFile for existence, string includes for idempotence
- Ralfie section uses `@.ralfie/RALF.md` syntax for Claude Code file inclusion

### Files changed
- `cli/src/lib/paths.ts` — added `claudeMdPath` export
- `cli/src/lib/claude-md.ts` — new module
- `cli/src/lib/__tests__/claude-md.test.ts` — new test file

---

## RALF-4: Board Creation Wiring

**Status**: done
**Session**: ralfie-1773917945561-b92fa8b1

### What was done
- Updated `createBoard()` in `cli/src/lib/board.ts` to call `appendBoardToRalfMd()` after writing board files
- Updated `ralf-plan` SKILL.md Phase 4 to include a step for updating RALF.md when creating boards via the skill's direct-write path
- Added 2 tests to `cli/src/lib/__tests__/board.test.ts`:
  - `createBoard adds a board entry to RALF.md`
  - `creating a board that already exists in RALF.md does not duplicate the entry`

### Key decisions
- `appendBoardToRalfMd` is called after the board file writes complete (not in parallel), since RALF.md may not exist yet
- The skill Phase 4 instructions tell agents to manually append a board entry when using the direct file write path (since `createBoard()` isn't called in that flow)

### Files changed
- `cli/src/lib/board.ts` — import and call `appendBoardToRalfMd` in `createBoard`
- `cli/src/lib/__tests__/board.test.ts` — 2 new tests for RALF.md integration
- `cli/src/skills/ralf-plan/SKILL.md` — Phase 4 updated with RALF.md step

---

## RALF-3: Init Wiring

**Status**: done
**Session**: ralfie-1773918134806-74f1139b

### What was done
- Updated `initCommand` in `cli/src/commands/init.ts` to call `ensureClaudeMd()` and `ensureRalfMd()` during initialization
- Added console output lines for `CLAUDE.md` and `.ralfie/RALF.md`
- Added 2 new tests to `cli/src/commands/__tests__/init.test.ts`:
  - `running init twice does not duplicate CLAUDE.md section or regenerate RALF.md`
  - `running init with existing boards populates RALF.md board entries`
- Updated existing first test to assert CLAUDE.md and RALF.md are created

### Key decisions
- `ensureClaudeMd` runs before `ensureRalfMd` so CLAUDE.md references RALF.md which then exists
- Both calls happen after `syncClaudeSettings` since they're independent of settings

### Files changed
- `cli/src/commands/init.ts` — import and call `ensureClaudeMd` + `ensureRalfMd`
- `cli/src/commands/__tests__/init.test.ts` — 2 new tests + assertions in existing test

---

## RALF-5: Fix board entries to use @ references

**Status**: done
**Date**: 2026-03-20

### What was done
- Fixed `boardEntry()` in `cli/src/lib/ralf-md.ts` to output `@.ralfie/boards/<name>/progress.md` instead of `[progress](.ralfie/boards/<name>/progress.md)`
- Updated existing `.ralfie/RALF.md` to use the new format

### Why (drift log)
- **What changed**: Board entry format in RALF.md switched from markdown links to `@` references
- **Why**: Markdown links are just navigable text — they don't cause Claude Code to auto-load the file into context. The `@` reference syntax is what Claude Code uses to include files (same as `@.ralfie/RALF.md` in CLAUDE.md). Without this, agents don't get automatic visibility into board progress.
- **Items affected**: RALF-5 added as a bug fix to RALF-1's implementation
- **Impact**: No architectural change. One-line fix in `boardEntry()`. All existing tests pass unchanged.

### Files changed
- `cli/src/lib/ralf-md.ts` — `boardEntry()` format fix
- `.ralfie/RALF.md` — updated existing entries to new format
