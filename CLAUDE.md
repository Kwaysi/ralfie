# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Ralfie — CLI tool that manages agentic coding loops with planning, execution, tracking, and a real-time React dashboard. It orchestrates Claude Code sessions to plan work, execute tasks from a PRD, and track progress across boards.

## Build & Run

- **Build all**: `npm run build` (shared → ui → cli)
- **Test**: `npm test` (builds shared first, runs cli tests via vitest)
- **Single test**: `npm test --workspace=cli -- --run <name>` (e.g. `config`, `prd`, `board`)
- **Typecheck**: `npm run typecheck`
- **Lint**: `npm run lint`
- **Dev UI**: `npm run dev --workspace=ui` (Vite dev server with proxy to localhost:3333)
- **Serve dashboard**: `ralf serve` (HTTP + WebSocket on port 3333)

## Architecture

Monorepo with three workspaces:

- **shared/** — TypeScript types (`ItemStatus`, `PrdItem`, `Prd`, `Board`, `BoardMeta`, `RalfieConfig`, `WsEvent`) used by both cli and ui
- **cli/** — Node CLI (`ralf`) built with Commander. Contains:
  - `src/lib/` — Core modules: paths, config, prd (with O_EXCL file locking), board, lock, agent (spawns Claude Code), skills (installs .md skill files)
  - `src/commands/` — CLI commands: init, plan, edit, run, list, status, verify, unlock, serve
  - `src/server/` — HTTP static server (serves ui build with SPA fallback), REST API, WebSocket broadcaster, file watcher
  - `src/skills/` — Bundled skill markdown files (ralf-plan, ralf-edit, ralf-run)
- **ui/** — React SPA (Vite + Tailwind v4 + recharts + react-markdown). Dark theme, monospace font. Pages: Dashboard, BoardList, BoardDetail (tabbed kanban/plan/progress), Settings. Auto-refreshes via WebSocket.

### Data flow

1. `ralf init` creates `.ralfie/` dir with config and skills
2. `ralf plan` spawns interactive Claude Code to generate a board (plan.md + prd.json)
3. `ralf run <board>` runs serial agent loop: each iteration picks a PRD item, claims it via lock, implements, updates progress
4. `ralf serve` watches `.ralfie/boards/` for changes, broadcasts WsEvents to the React dashboard

### CLI Commands

| Command | Description |
|---------|-------------|
| `ralf init` | Create `.ralfie/` structure and install skills |
| `ralf plan` | Spawn interactive agent to create a new board |
| `ralf edit <board>` | Spawn interactive agent to edit a board |
| `ralf run <board> [iterations]` | Run agent loop (default iterations from config) |
| `ralf list` | Show all boards with progress bars |
| `ralf status <board> <status>` | Filter PRD items by status |
| `ralf verify <board> <item-id>` | Mark a done item as verified |
| `ralf unlock <board>` | Clear all lockfiles for a board |
| `ralf serve` | Start HTTP + WebSocket dashboard server |
