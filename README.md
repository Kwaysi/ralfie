# Ralfie

**Autonomous coding, managed.**

Ralfie turns a product spec into working code — one task at a time, fully automated.

<p align="center">
  <img src="docs/images/dashboard.png" alt="Ralfie Dashboard" width="800" />
</p>

## What is Ralfie?

You describe what you want built. Ralfie breaks it into tasks, writes a plan, and then executes each task using an AI coding agent — committing real code to your repo along the way.

Think of it as a project manager for your AI coding assistant. Instead of babysitting a single prompt, you define a board (a set of tasks with acceptance criteria), and Ralfie works through them one by one. It claims a task, implements it, runs your test suite and linter to check its work, logs what it did, and moves on to the next one.

You stay in control: every task has clear verification steps, progress is tracked in your repo, and a live dashboard lets you watch work happen in real time.

## Features

- **Plan from conversation** — Describe what you want in plain English. Ralfie grills you on requirements, then generates a structured plan and task list.
- **Autonomous execution** — Each task is claimed, implemented, verified against feedback loops (tests, typecheck, lint), and committed — no manual intervention needed.
- **Live dashboard** — A real-time web UI shows board progress, task status, and detailed logs. Updates instantly via WebSocket as work happens.
- **File-based tracking** — All state lives in your repo under `.ralfie/`. Plans, task lists, and progress logs are plain Markdown and JSON — easy to review in PRs.
- **Built-in guardrails** — File locking prevents conflicts when multiple agents run. Failed tasks are logged and skipped, not retried in an infinite loop.
- **Edit and iterate** — Change your plan mid-stream. `ralf edit` lets you restructure the board, add items, or adjust scope without starting over.

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) installed and authenticated

### Installation

> `npm install -g ralfie` is coming soon. For now, build from source:

```bash
git clone https://github.com/anthropics/ralfie.git
cd ralfie
npm install
npm run build
npm link --workspace=cli
```

### Create your first board

**1. Initialize Ralfie in your project**

```bash
cd your-project
ralf init
```

This creates a `.ralfie/` directory with configuration and skills.

**2. Plan a board**

```bash
ralf plan
```

Ralfie opens an interactive session where you describe what you want built. It asks clarifying questions, then generates a structured plan (`plan.md`) and task list (`prd.json`).

**3. Run the board**

```bash
ralf run <board-name>
```

Ralfie works through tasks one by one — claiming each task, implementing it, running your feedback loops (tests, typecheck, lint), and committing the result.

**4. Watch progress in the dashboard**

```bash
ralf serve
```

Opens a live web dashboard at `http://localhost:3333` where you can see board progress, task status, and detailed logs updating in real time.
