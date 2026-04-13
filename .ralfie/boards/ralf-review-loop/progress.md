## AGENT-1 — Capture session ID from Claude CLI JSON output

**Key decisions:**
- Added `--output-format json` to both `spawnPrintMode` and `spawnResume` args
- Extracted `spawnWithJsonOutput` shared helper to eliminate duplication between `spawnPrintMode` and `spawnResume`
- Made `JsonOutput` interface fields optional (`session_id?`, `result?`) to match runtime defensive behavior in `parseJsonOutput`
- `complete` flag now checks parsed `result` field instead of raw stdout — correct behavior since the COMPLETE signal should be in the semantic result
- Used shell script test helpers (via `writeScript`) for tests that need fixed JSON output, since `echo` appends extra args and `node -e` doesn't handle `--output-format` flag

**Files changed:**
- `cli/src/lib/agent.ts` — Added `sessionId` to `SpawnResult`, `JsonOutput` interface, `parseJsonOutput` function, `spawnWithJsonOutput` shared helper, `spawnResume` function; updated `spawnPrintMode` to use JSON output
- `cli/src/lib/__tests__/agent.test.ts` — Added 5 tests for `parseJsonOutput`, 4 tests for `spawnPrintMode` (JSON output, COMPLETE signal, null sessionId, flags), 3 tests for `spawnResume` (flags, JSON output, cleanup)
- `cli/src/commands/__tests__/run.test.ts` — Added `sessionId: null` to all mock `SpawnResult` values

**Notes:**
- Shell script spawn tests are slow under full test suite load (7-8s each due to process group overhead) but pass reliably with 30s timeout
- `parseJsonOutput` gracefully falls back to raw text for non-JSON output, so non-JSON agent commands won't break

---

## SKILL-1 — Split ralf-run into ralf-run + ralf-finalize

**Key decisions:**
- Trimmed ralf-run SKILL.md to Steps 1-4 only (pick, claim, implement, feedback loops) with explicit stop instruction
- Created ralf-finalize SKILL.md with Steps 1-4 (renumbered from original Steps 6-9: progress, PRD, commit, completion)
- ralf-finalize relies on conversation resumption for context — the preamble states "You will be resumed in the same conversation that implemented the item"
- Added ralf-finalize to SKILL_NAMES array in skills.ts — installSkills and skillsInstalled automatically pick it up
- Updated init.ts output log and init test to include ralf-finalize

**Files changed:**
- `cli/src/skills/ralf-run/SKILL.md` — trimmed to Steps 1-4 only, removed progress/PRD/commit/completion steps
- `cli/src/skills/ralf-finalize/SKILL.md` — new skill covering update progress, update PRD, commit, check completion
- `cli/src/lib/skills.ts` — added 'ralf-finalize' to SKILL_NAMES
- `cli/src/lib/__tests__/skills.test.ts` — updated ralf-run test to assert no Step 5 or Commit; added ralf-finalize test
- `cli/src/commands/init.ts` — added ralf-finalize to console output
- `cli/src/commands/__tests__/init.test.ts` — added ralf-finalize to skills verification loop
- `.claude/skills/ralf-run/SKILL.md` — installed copy updated
- `.claude/skills/ralf-finalize/SKILL.md` — installed copy created

**Notes:**
- ralf-finalize does not include a Failure Protocol section — finalization steps are simpler and failure is less likely
- The installed copies under `.claude/skills/` are synced from source; they get overwritten on every `ralf init`

---
