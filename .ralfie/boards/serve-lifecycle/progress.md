## SERVE-1 — Graceful Shutdown

**Key decisions:**
- Used a `shutdownInProgress` flag to detect double ctrl+c — second press calls `process.exit(1)` immediately
- Added a 2-second timeout with `.unref()` as a safety net in case `server.close()` hangs
- Exported `closeAllConnections()` from ws.ts to terminate all WebSocket clients before closing the server
- Cleanup order: close file watchers → terminate WS connections → close HTTP server → exit

**Files changed:**
- `cli/src/commands/serve.ts` — Rewrote cleanup handler with shutdown logging, double ctrl+c force-kill, WS termination, timeout safety net, and `process.exit()`
- `cli/src/server/ws.ts` — Added `closeAllConnections()` export that terminates all WS clients and closes the server

**Notes:**
- The cleanup function is not yet exported — SERVE-5 will need to call the same logic from a POST endpoint, so it may need to be extracted into a shared helper at that point

---

## SERVE-2 — Config & Types (serve_pid)

**Key decisions:**
- Added `serve_pid: number | null` to `RalfieConfig` in shared types — null when no server is running
- Default value is `null` so existing config files merge cleanly via `readConfig`
- PID is written to config inside the `server.listen` callback (after port is successfully bound)
- PID is cleared at the start of the cleanup function, before closing watchers/connections — best-effort with try/catch so a failed write doesn't block shutdown
- Made cleanup function `async` to await `writeConfig` during PID clearing

**Files changed:**
- `shared/src/types.ts` — Added `serve_pid: number | null` to `RalfieConfig`
- `cli/src/lib/config.ts` — Added `serve_pid: null` to `defaultConfig`
- `cli/src/commands/serve.ts` — Imported `writeConfig`, write PID on listen, clear PID on cleanup
- `cli/src/lib/__tests__/config.test.ts` — Updated partial-merge test expectation to include `serve_pid: null`

**Notes:**
- The PID display in the listen log now shows `(pid: <pid>)` which will help with manual verification
- SERVE-3 (daemon mode) will use `writeConfig` to persist the child PID after forking
- SERVE-4 (--stop) will read `serve_pid` from config to find and kill the daemon

---

## SERVE-3 — Daemon Mode (-d flag)

**Key decisions:**
- Used `child_process.fork()` to spawn a detached child process running `ralf serve` (without `-d`) via the CLI entry point (`index.js`)
- The parent writes the child PID to `config.json` immediately after forking, then exits — the child will overwrite with its own `process.pid` once `server.listen` fires
- Used `fileURLToPath(import.meta.url)` to resolve the entry point path relative to the compiled module, ensuring it works regardless of install location
- `stdio: 'ignore'` and `detached: true` ensure the child is fully detached from the parent's terminal
- `child.unref()` allows the parent process to exit without waiting for the child

**Files changed:**
- `cli/src/commands/serve.ts` — Added `startDaemon()` function, added `options` parameter to `serveCommand()`, added imports for `fork`, `fileURLToPath`, `path`
- `cli/src/index.ts` — Added `-d, --daemon` option to the serve command, passes options to `serveCommand()`

**Notes:**
- The child process inherits the parent's `cwd` explicitly so board file paths resolve correctly
- Daemon output goes to `/dev/null` (stdio: 'ignore') — log file support is out of scope per plan.md
- SERVE-4 will add `--stop`/`-s` to read `serve_pid` and send SIGTERM

---

## SERVE-4 — CLI Stop (`--stop` / `-s`)

**Key decisions:**
- Added `stopServer()` function in `serve.ts` alongside `startDaemon()` — keeps all serve-related logic in one file
- Uses `process.kill(pid, 0)` to check if the process is alive before sending SIGTERM — handles stale PIDs gracefully
- Three code paths: no PID in config → "No server running", stale PID → clears config and reports, live PID → sends SIGTERM and clears config
- Reuses existing `readConfig`/`writeConfig` — no new dependencies needed

**Files changed:**
- `cli/src/commands/serve.ts` — Added `stopServer()` function, extended `serveCommand()` options type to include `stop`
- `cli/src/index.ts` — Added `-s, --stop` option to the serve command

**Notes:**
- SERVE-5 will add a `POST /api/server/stop` endpoint that triggers the same graceful shutdown from the dashboard — it can call `process.exit()` directly since the HTTP handler runs in the server process itself

---
