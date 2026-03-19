# Config Options, Stop Command, and Init Permissions

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add effort/model config options synced to Claude settings, a `ralf stop` command with PID tracking and cleanup, and have `ralf init` configure Claude Code permissions.

**Architecture:** Config is source of truth in `.ralfie/config.json`, synced to `.claude/settings.json` before each run. PID files live at `.ralfie/boards/{board}/runs/{sessionId}.pid` — one per active run. The tracked PID is the `ralf run` parent process. Stop kills the process group (so child claude processes die too), releases their locks, and resets claimed items to pending.

**Tech Stack:** Node.js, Commander, React + Tailwind (existing stack)

---

## Task 1: Add `effort` and `model` to RalfieConfig

**User story:** As a user, I can configure the effort level (low/medium/high) and model (opus/sonnet/haiku) in my ralfie config so that agent runs use my preferred Claude settings.

**End state:**
- `RalfieConfig` in `shared/src/types.ts` has two new fields: `effort` (union of `'low' | 'medium' | 'high'`) and `model` (union of `'opus' | 'sonnet' | 'haiku'`)
- Export these union types so they can be reused in the UI
- Default config in `cli/src/lib/config.ts` sets `effort: 'medium'` and `model: 'opus'`
- Existing tests continue to pass

**Files:**
- Modify: `shared/src/types.ts`
- Modify: `cli/src/lib/config.ts`

- [ ] Step 1: Add `EffortLevel` and `AgentModel` types and new fields to `RalfieConfig` in shared types
- [ ] Step 2: Update `defaultConfig` in config.ts with the new defaults
- [ ] Step 3: Build and verify no type errors: `npm run build`
- [ ] Step 4: Run existing tests: `npm test`
- [ ] Step 5: Commit

---

## Task 2: Sync config to `.claude/settings.json` before runs

**User story:** As a user, when I run `ralf run`, the effort and model from my ralfie config are automatically applied to Claude Code's settings so the agent uses my preferences without manual setup.

**End state:**
- New module `cli/src/lib/claude-settings.ts` with a `syncClaudeSettings(cwd?)` function
- Reads `.claude/settings.json` if it exists, merges in `effortLevel` and `model` from ralfie config, writes back — preserving all other user settings
- `ralf run` calls `syncClaudeSettings()` before entering the iteration loop
- The server's `runInBackground` also calls `syncClaudeSettings()` before spawning agents
- Maps ralfie model names to Claude model identifiers (opus → `claude-opus-4-6`, sonnet → `claude-sonnet-4-6`, haiku → `claude-haiku-4-5-20251001`)

**Files:**
- Create: `cli/src/lib/claude-settings.ts`
- Modify: `cli/src/commands/run.ts`
- Modify: `cli/src/server/api.ts`

- [ ] Step 1: Write test for `syncClaudeSettings` — verify it merges without clobbering existing settings
- [ ] Step 2: Run test to verify it fails
- [ ] Step 3: Implement `syncClaudeSettings` in claude-settings.ts
- [ ] Step 4: Run test to verify it passes
- [ ] Step 5: Call `syncClaudeSettings()` in `runCommand` before the loop
- [ ] Step 6: Call `syncClaudeSettings()` in `runInBackground` before the loop
- [ ] Step 7: Build and run all tests
- [ ] Step 8: Commit

---

## Task 3: `ralf init` writes Claude Code permissions and defaults

**User story:** As a user, when I run `ralf init`, Claude Code is automatically configured with the permissions it needs (Bash, Edit, Write, Read) and default effort/model settings, so I don't have to set this up manually.

**End state:**
- `ralf init` calls `syncClaudeSettings()` after writing config — this sets effort and model
- `syncClaudeSettings` also ensures `permissions.allow` includes `["Bash", "Edit", "Write", "Read"]`
- If `.claude/settings.json` already exists, it merges — existing permissions and other settings are preserved
- Init output shows `.claude/settings.json` in the list of created/updated files

**Files:**
- Modify: `cli/src/lib/claude-settings.ts` (add permissions merging)
- Modify: `cli/src/commands/init.ts`

- [ ] Step 1: Write test for permissions merging — existing allow entries preserved, new ones added
- [ ] Step 2: Run test to verify it fails
- [ ] Step 3: Update `syncClaudeSettings` to also merge permissions
- [ ] Step 4: Run test to verify it passes
- [ ] Step 5: Call `syncClaudeSettings()` from `initCommand`
- [ ] Step 6: Update init console output to mention `.claude/settings.json`
- [ ] Step 7: Build and run all tests
- [ ] Step 8: Commit

---

## Task 4: PID tracking for runs

**User story:** As a user, I can see which boards have active agent runs, and the system tracks running processes so they can be stopped later.

**End state:**
- New path helpers: `runsDir(boardName, cwd)` and `runPidPath(boardName, sessionId, cwd)` pointing to `.ralfie/boards/{board}/runs/{sessionId}.pid`
- New module `cli/src/lib/run-tracker.ts` with functions:
  - `saveRunPid(boardName, sessionId, pid, cwd)` — writes PID file (plain writeFile, session IDs are unique so no O_EXCL needed). PID file contains JSON with `{ pid, sessionId }`
  - `removeRunPid(boardName, sessionId, cwd)` — deletes PID file
  - `getActiveRuns(boardName, cwd)` — reads all `.pid` files in `runs/`, checks each PID is still alive via `process.kill(pid, 0)`, returns list of `{ sessionId, pid }`, cleans up stale PID files for dead processes
  - `countActiveRuns(boardName, cwd)` — returns count from `getActiveRuns`
- The tracked PID is `process.pid` — the `ralf run` parent process. The agent spawns child processes with `detached: false` (default), so they belong to the same process group
- `runCommand` saves PID at start (in a finally block removes it on exit, including error paths)
- `runInBackground` in the server saves PID at start and removes on exit
- `spawnPrintMode` in `agent.ts` is modified to spawn with `{ detached: false }` explicitly and use `process.kill(-pid, signal)` pattern in stop so the entire process group is killed

**Files:**
- Modify: `cli/src/lib/paths.ts`
- Create: `cli/src/lib/run-tracker.ts`
- Modify: `cli/src/lib/agent.ts` (ensure child processes use same process group)
- Modify: `cli/src/commands/run.ts`
- Modify: `cli/src/server/api.ts`

- [ ] Step 1: Add `runsDir` and `runPidPath` to paths.ts
- [ ] Step 2: Write tests for run-tracker (save, remove, getActiveRuns stale cleanup)
- [ ] Step 3: Run tests to verify they fail
- [ ] Step 4: Implement run-tracker.ts
- [ ] Step 5: Run tests to verify they pass
- [ ] Step 6: Integrate PID saving/cleanup into `runCommand`
- [ ] Step 7: Integrate PID saving/cleanup into `runInBackground`
- [ ] Step 8: Build and run all tests
- [ ] Step 9: Commit

---

## Task 5: `ralf stop <board>` CLI command

**User story:** As a user, I can run `ralf stop <board>` to stop all agents working on a board. The command kills running processes, releases their locks, and resets in-progress items to pending so they'll be picked up on the next run.

**End state:**
- New command `ralf stop <board>` registered in `cli/src/index.ts`
- New file `cli/src/commands/stop.ts` implementing `stopCommand(boardName, cwd?)`
- Behavior:
  1. Reads all PID files from `.ralfie/boards/{board}/runs/`
  2. For each: sends SIGTERM to the process group (`process.kill(-pid, 'SIGTERM')`), waits up to 5 seconds, sends SIGKILL if still alive
  3. Reads the session IDs from the PID files
  4. Finds all locks held by those sessions and releases them
  5. Resets any PRD items `assigned_to` those sessions and in `in_progress` status back to `pending`. This is safe to do as a direct read-modify-write on the PRD (no per-item locking needed) because the processes that owned those items have already been killed in step 2
  6. Deletes the PID files
  7. Prints summary of what was stopped and cleaned up
- If no runs are active, prints a message saying so

**Files:**
- Create: `cli/src/commands/stop.ts`
- Modify: `cli/src/index.ts`
- Modify: `cli/src/lib/prd.ts` (add `resetSessionItems` function)
- Modify: `cli/src/lib/lock.ts` (add `releaseSessionLocks` function)

- [ ] Step 1: Add `releaseSessionLocks(boardName, sessionId, cwd)` — finds and deletes locks matching a session ID
- [ ] Step 2: Add `resetSessionItems(boardName, sessionId, cwd)` — sets in_progress items assigned to session back to pending
- [ ] Step 3: Write tests for both new functions
- [ ] Step 4: Run tests to verify they pass
- [ ] Step 5: Implement `stopCommand` in stop.ts
- [ ] Step 6: Register `ralf stop <board>` in index.ts
- [ ] Step 7: Build and run all tests
- [ ] Step 8: Commit

---

## Task 6: Stop API endpoint

**User story:** As a user using the dashboard, I can stop a running board via the API, which does the same cleanup as the CLI stop command.

**End state:**
- New endpoint `POST /api/boards/:name/stop` in `cli/src/server/api.ts`
- Calls the same stop logic as the CLI command (reuse `stopCommand` or extract shared logic)
- Returns `{ ok: true, stopped: number }` with count of processes stopped
- Broadcasts a new `run:stopped` WebSocket event so the UI refreshes

**Files:**
- Modify: `cli/src/server/api.ts`
- Modify: `shared/src/types.ts` (add `'run:stopped'` to `WsEventType`)

- [ ] Step 1: Add `'run:stopped'` to the `WsEventType` union
- [ ] Step 2: Add the stop endpoint to api.ts, reusing stop logic from Task 5
- [ ] Step 3: Build and run all tests
- [ ] Step 4: Commit

---

## Task 7: Board API returns `activeRuns` count

**User story:** As a dashboard user, I can see how many agents are actively running on each board, so I know which boards are being worked on.

**End state:**
- Board API responses include an `activeRuns` number field
- New type in shared: `BoardWithStatus` extends `Board` with `activeRuns: number`
- `GET /api/boards` and `GET /api/boards/:name` return `BoardWithStatus`
- The count comes from `countActiveRuns` in run-tracker

**Files:**
- Modify: `shared/src/types.ts`
- Modify: `cli/src/server/api.ts`

- [ ] Step 1: Add `BoardWithStatus` type to shared types
- [ ] Step 2: Update board API endpoints to call `countActiveRuns` and include it in responses
- [ ] Step 3: Build and run all tests
- [ ] Step 4: Commit

---

## Task 8: Settings page — effort and model controls

**User story:** As a dashboard user, I can change the effort level and model from the Settings page so I don't need to edit config files manually.

**End state:**
- Settings page has two new form controls:
  - Effort level: select dropdown with options Low, Medium, High
  - Model: select dropdown with options Opus, Sonnet, Haiku
- Saving settings writes to `.ralfie/config.json` via the existing `PUT /api/config` endpoint
- When config is saved, the server also calls `syncClaudeSettings()` to update `.claude/settings.json`

**Files:**
- Modify: `ui/src/pages/SettingsPage.tsx`
- Modify: `cli/src/server/api.ts` (sync claude settings on config save)

- [ ] Step 1: Add effort and model dropdowns to SettingsPage
- [ ] Step 2: Update `PUT /api/config` handler to call `syncClaudeSettings()` after writing config
- [ ] Step 3: Build UI and verify it renders correctly: `npm run build`
- [ ] Step 4: Commit

---

## Task 9: Stop button on Board Detail page

**User story:** As a dashboard user, when a board has active runs, I see a stop button showing the number of running agents. Clicking it stops all agents on the board.

**End state:**
- Board detail page shows a "Stop (N)" button next to the "Run" button when `activeRuns > 0`
- Button is styled with a danger/red color to distinguish from Run
- Clicking calls `POST /api/boards/:name/stop`
- New `stopBoard(name)` function in `ui/src/lib/api.ts`
- After stopping, the page refreshes automatically via WebSocket `run:stopped` event

**Files:**
- Modify: `ui/src/lib/api.ts`
- Modify: `ui/src/pages/BoardDetailPage.tsx`

- [ ] Step 1: Add `stopBoard` API function in api.ts
- [ ] Step 2: Update `BoardDetailPage` to use `BoardWithStatus` type and show the stop button
- [ ] Step 3: Wire up the stop button to call the API
- [ ] Step 4: Build and verify: `npm run build`
- [ ] Step 5: Commit

---

## Task 10: Board list shows active run indicators

**User story:** As a dashboard user, I can see at a glance which boards have active runs from the board list page.

**End state:**
- Board list page shows an "N agents running" badge next to boards with active runs
- Uses `activeRuns` from the `BoardWithStatus` API response

**Files:**
- Modify: `ui/src/pages/BoardListPage.tsx`

- [ ] Step 1: Update BoardListPage to read `activeRuns` and display indicator
- [ ] Step 2: Build and verify: `npm run build`
- [ ] Step 3: Commit

---

## Task 11: End-to-end verification

**User story:** As a developer, I'm confident everything works together after all changes.

- [ ] Step 1: Run full build: `npm run build`
- [ ] Step 2: Run full test suite: `npm test`
- [ ] Step 3: Run typecheck: `npm run typecheck`
- [ ] Step 4: Run lint: `npm run lint`
- [ ] Step 5: Manual smoke test: `ralf init` creates `.claude/settings.json` with permissions, effort, model
- [ ] Step 6: Verify `.ralfie/config.json` has effort and model fields
