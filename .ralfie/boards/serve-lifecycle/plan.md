# serve-lifecycle

## Goal

Fix `ralf serve` so ctrl+c cleanly shuts down the process, add a `-d` (daemon) flag to run in the background, and provide both CLI (`--stop`/`-s`) and dashboard UI controls to stop the server. The server PID is stored in `config.json` and displayed in the dashboard.

## Architecture

**Graceful shutdown fix** — The `cleanup` function in `serve.ts` needs to: terminate WebSocket connections, kill background run child processes, call `process.exit()`, and support double ctrl+c for force-kill.

**Daemon mode** — `ralf serve -d` forks a detached child process, writes its PID to `config.json` (`serve_pid` field), and exits the parent. The child runs the server.

**Stop mechanism** — `ralf serve --stop` / `-s` reads `serve_pid` from config, sends SIGTERM, clears the field. The dashboard's Settings page shows the PID and a "Stop Server" button that calls a new `POST /api/server/stop` endpoint.

**Self-shutdown endpoint** — `POST /api/server/stop` triggers the same graceful cleanup and `process.exit()`. This is how the dashboard stops the server.

## Tech Stack

Same as existing — Node.js, Commander, React, Tailwind. Uses `child_process.fork()` for daemonization.

## Milestones

### Milestone 1: Fix graceful shutdown (ctrl+c)
- **User story**: As a developer, I can press ctrl+c and the server exits cleanly so that the port is freed immediately.
- **End state**: ctrl+c logs "Shutting down..." and exits within 2 seconds. Second ctrl+c force-kills immediately. Active WS connections are terminated.
- **Files**: `cli/src/commands/serve.ts`, `cli/src/server/ws.ts`

### Milestone 2: Add `serve_pid` to config and shared types
- **User story**: As a developer, I can see the server PID so I know if it's running and can manage it.
- **End state**: `RalfieConfig` has an optional `serve_pid` field. Server writes PID on start and clears it on stop.
- **Files**: `shared/src/types.ts`, `cli/src/lib/config.ts`, `cli/src/commands/serve.ts`

### Milestone 3: Daemon mode (`-d` flag)
- **User story**: As a developer, I can run `ralf serve -d` to start the server in the background so my terminal stays free.
- **End state**: `ralf serve -d` prints the PID and returns to the shell. The server runs detached. PID is saved to config.
- **Files**: `cli/src/commands/serve.ts`

### Milestone 4: CLI stop (`--stop` / `-s`)
- **User story**: As a developer, I can run `ralf serve --stop` to kill the daemon so I have a simple way to stop it from the terminal.
- **End state**: `ralf serve -s` reads PID from config, sends SIGTERM, clears PID from config, prints confirmation.
- **Files**: `cli/src/commands/serve.ts`

### Milestone 5: Dashboard stop button and PID display
- **User story**: As a developer, I can see the server PID and stop it from the dashboard so I don't need the terminal.
- **End state**: Settings page shows server PID with a red "Stop Server" button. Clicking it calls `POST /api/server/stop`, which triggers graceful shutdown.
- **Files**: `cli/src/server/api.ts`, `ui/src/pages/SettingsPage.tsx`, `ui/src/lib/api.ts`

## Risks

- **Daemon child process might not inherit correct cwd** — mitigated by passing `cwd` explicitly to `fork()`
- **Stale PID in config if server crashes** — mitigated by checking if process is alive before sending signals

## Out of Scope

- Log file output for daemon mode (silent is fine)
- Systemd/launchd service integration
- Auto-restart on crash
