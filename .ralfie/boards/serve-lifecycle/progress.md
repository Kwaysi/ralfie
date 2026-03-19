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
