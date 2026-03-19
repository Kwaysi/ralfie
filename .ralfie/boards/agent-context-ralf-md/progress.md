
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
