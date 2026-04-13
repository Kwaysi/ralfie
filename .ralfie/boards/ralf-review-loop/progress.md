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
