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
