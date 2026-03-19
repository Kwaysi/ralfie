# Ralfie Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a CLI tool that manages agentic coding loops — planning, executing, and tracking work via Claude Code, with a real-time React dashboard.

**Architecture:** Ralfie is a TypeScript CLI (`ralf`) that orchestrates Claude Code sessions. It stores all state in a local `.ralfie/` folder as JSON/markdown files. A built-in HTTP+WebSocket server serves a React UI that watches these files for real-time updates. Three Claude Code skills (`ralfie-plan`, `ralfie-edit`, `ralfie-run`) handle the LLM interaction patterns.

**Tech Stack:** TypeScript, Node.js, Commander (CLI), built-in `http` + `ws` (server), React + Vite (UI), `fs.watch` (file watching), distributed via npm.

---

## File Structure

```
ralfie/
├── package.json                    # monorepo root (workspaces: cli, ui)
├── tsconfig.base.json              # shared TypeScript config
├── CLAUDE.md
│
├── cli/                            # CLI package (@ralfie/cli → "ralf" bin)
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts                # entry point — Commander program definition
│   │   ├── commands/
│   │   │   ├── init.ts             # ralf init
│   │   │   ├── plan.ts             # ralf plan
│   │   │   ├── edit.ts             # ralf edit <board>
│   │   │   ├── run.ts              # ralf run <board> <iterations>
│   │   │   ├── serve.ts            # ralf serve
│   │   │   ├── list.ts             # ralf list
│   │   │   ├── status.ts           # ralf status <board> <status>
│   │   │   ├── verify.ts           # ralf verify <board> <item-id>
│   │   │   └── unlock.ts           # ralf unlock <board>
│   │   ├── lib/
│   │   │   ├── config.ts           # read/write .ralfie/config.json
│   │   │   ├── board.ts            # board CRUD — read/write plan, prd, progress
│   │   │   ├── prd.ts              # PRD data model — item states, comments, read/write
│   │   │   ├── lock.ts             # per-item lockfile management (O_EXCL create)
│   │   │   ├── agent.ts            # spawn Claude Code sessions (interactive + print mode)
│   │   │   ├── skills.ts           # copy bundled skills to .claude/skills/
│   │   │   └── paths.ts            # resolve .ralfie/ paths
│   │   ├── server/
│   │   │   ├── http.ts             # static file server for React build
│   │   │   ├── ws.ts               # WebSocket server — broadcasts file changes
│   │   │   ├── api.ts              # REST API handlers (verify, run, config, etc.)
│   │   │   └── watcher.ts          # fs.watch on .ralfie/ — triggers ws broadcasts
│   │   └── skills/                 # bundled skill files (copied during init)
│   │       ├── ralfie-plan.md
│   │       ├── ralfie-edit.md
│   │       └── ralfie-run.md
│   └── __tests__/
│       ├── config.test.ts
│       ├── board.test.ts
│       ├── prd.test.ts
│       ├── lock.test.ts
│       └── commands/
│           ├── init.test.ts
│           ├── run.test.ts
│           ├── list.test.ts
│           ├── status.test.ts
│           ├── verify.test.ts
│           └── unlock.test.ts
│
├── ui/                             # React dashboard (@ralfie/ui)
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── index.html
│   ├── src/
│   │   ├── main.tsx                # React entry
│   │   ├── App.tsx                 # Router + layout
│   │   ├── lib/
│   │   │   ├── ws.ts              # WebSocket client hook — reconnecting, parses events
│   │   │   ├── api.ts             # REST API client (fetch wrappers)
│   │   │   └── types.ts           # shared types (Board, PrdItem, Config, etc.)
│   │   ├── pages/
│   │   │   ├── DashboardPage.tsx   # project-wide stats, items/day chart, board overview
│   │   │   ├── BoardListPage.tsx   # all boards with progress bars
│   │   │   ├── BoardDetailPage.tsx # plan + PRD + progress + run button + verify
│   │   │   └── SettingsPage.tsx    # config editor
│   │   └── components/
│   │       ├── Layout.tsx          # sidebar + header shell
│   │       ├── PrdKanban.tsx       # kanban columns by item status
│   │       ├── PrdTable.tsx        # table view of items (alternative to kanban)
│   │       ├── ProgressTimeline.tsx # rendered progress.md as timeline
│   │       ├── PlanViewer.tsx      # rendered plan.md (markdown)
│   │       ├── RunDialog.tsx       # trigger ralf run from UI (iteration count input)
│   │       ├── StatsCards.tsx      # KPI cards (total, completed, failed, etc.)
│   │       └── ItemsPerDayChart.tsx # 7-day items worked chart
│   └── __tests__/
│       └── (component tests as needed)
│
└── shared/                         # shared types between cli and ui
    ├── package.json
    ├── tsconfig.json
    └── src/
        └── types.ts                # Board, PrdItem, ItemStatus, Config interfaces
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.base.json`, `.gitignore`
- Create: `cli/package.json`, `cli/tsconfig.json`
- Create: `ui/package.json`, `ui/tsconfig.json`, `ui/vite.config.ts`, `ui/index.html`
- Create: `shared/package.json`, `shared/tsconfig.json`

- [ ] **Step 1: Initialize git repo**

```bash
cd /Users/kilson/projects/ralfie
git init
```

- [ ] **Step 2: Create root package.json with workspaces**

```json
{
  "name": "ralfie",
  "version": "0.0.1",
  "private": true,
  "workspaces": ["cli", "ui", "shared"],
  "scripts": {
    "build": "npm run build --workspaces",
    "test": "npm test --workspace=cli",
    "typecheck": "npm run typecheck --workspaces"
  }
}
```

- [ ] **Step 3: Create tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "declaration": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "outDir": "dist",
    "rootDir": "src"
  }
}
```

- [ ] **Step 4: Create shared package**

`shared/package.json`:
```json
{
  "name": "@ralfie/shared",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "dist/types.js",
  "types": "dist/types.d.ts",
  "scripts": {
    "build": "tsc",
    "typecheck": "tsc --noEmit"
  }
}
```

`shared/tsconfig.json`:
```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

- [ ] **Step 5: Create CLI package**

`cli/package.json`:
```json
{
  "name": "@ralfie/cli",
  "version": "0.0.1",
  "type": "module",
  "bin": {
    "ralf": "dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "commander": "^13.0.0",
    "ws": "^8.18.0",
    "@ralfie/shared": "*"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/ws": "^8.5.0",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  }
}
```

`cli/tsconfig.json`:
```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

- [ ] **Step 6: Create UI package**

`ui/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "noEmit": true
  },
  "include": ["src"]
}
```

`ui/package.json`:
```json
{
  "name": "@ralfie/ui",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.0.0",
    "recharts": "^2.15.0",
    "react-markdown": "^9.0.0",
    "@ralfie/shared": "*"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.4.0",
    "typescript": "^5.7.0",
    "vite": "^6.0.0",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/vite": "^4.0.0"
  }
}
```

`ui/vite.config.ts`:
```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "dist",
  },
  server: {
    // Proxy API and WebSocket to the ralf serve backend during dev
    proxy: {
      "/api": "http://localhost:3333",
      "/ws": { target: "ws://localhost:3333", ws: true },
    },
  },
});
```

- [ ] **Step 7: Create .gitignore**

```
node_modules/
dist/
.ralfie/
```

- [ ] **Step 8: Install dependencies and verify build**

```bash
npm install
npm run typecheck
```

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: scaffold monorepo with cli, ui, and shared workspaces"
```

---

## Task 2: Shared Types

**Files:**
- Create: `shared/src/types.ts`

- [ ] **Step 1: Write the shared type definitions**

```ts
export type ItemStatus = "pending" | "in_progress" | "done" | "failed" | "verified";

export interface PrdItemComment {
  timestamp: string;     // ISO 8601
  session_id: string;
  message: string;
}

export interface PrdItem {
  id: string;
  category: string;
  description: string;
  steps_to_verify: string[];
  status: ItemStatus;
  assigned_to: string | null;  // session ID of the agent working on it
  comments: PrdItemComment[];
}

export interface Prd {
  project: string;
  description: string;
  created: string;       // ISO 8601 date
  items: PrdItem[];
}

export interface BoardMeta {
  name: string;          // auto-generated slug from plan
  created: string;       // ISO 8601
  description: string;   // one-line summary from plan
}

export interface Board {
  meta: BoardMeta;
  prd: Prd;
  plan: string;          // raw markdown
  progress: string;      // raw markdown
}

export interface RalfieConfig {
  agent_command: string;           // default: "claude"
  default_iterations: number;      // default: 10
  feedback_loops: string[];        // e.g. ["npm run typecheck", "npm test", "npm run lint"]
  serve_port: number;              // default: 3333
}

// WebSocket event types for real-time UI
export type WsEventType =
  | "board:updated"
  | "prd:updated"
  | "progress:updated"
  | "lock:acquired"
  | "lock:released"
  | "run:started"
  | "run:iteration"
  | "run:completed";

export interface WsEvent {
  type: WsEventType;
  board: string;         // board name
  data: unknown;         // event-specific payload
  timestamp: string;
}
```

- [ ] **Step 2: Build shared package**

```bash
cd /Users/kilson/projects/ralfie
npm run build --workspace=shared
```

Expected: `shared/dist/types.js` and `shared/dist/types.d.ts` created.

- [ ] **Step 3: Commit**

```bash
git add shared/
git commit -m "feat: add shared type definitions for boards, PRD items, config, and WebSocket events"
```

---

## Task 3: CLI Lib — Paths & Config

**Files:**
- Create: `cli/src/lib/paths.ts`
- Create: `cli/src/lib/config.ts`
- Test: `cli/__tests__/config.test.ts`

- [ ] **Step 1: Write the failing test for config**

```ts
// cli/__tests__/config.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { readConfig, writeConfig, defaultConfig } from "../src/lib/config.js";

describe("config", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ralfie-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns default config when no file exists", () => {
    const config = readConfig(tmpDir);
    expect(config).toEqual(defaultConfig);
  });

  it("writes and reads config", () => {
    const custom = { ...defaultConfig, default_iterations: 20 };
    writeConfig(tmpDir, custom);
    const config = readConfig(tmpDir);
    expect(config.default_iterations).toBe(20);
  });

  it("merges partial config with defaults", () => {
    const configPath = path.join(tmpDir, ".ralfie", "config.json");
    fs.mkdirSync(path.join(tmpDir, ".ralfie"), { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify({ serve_port: 4444 }));
    const config = readConfig(tmpDir);
    expect(config.serve_port).toBe(4444);
    expect(config.agent_command).toBe("claude");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/kilson/projects/ralfie
npm test --workspace=cli -- --run config
```

Expected: FAIL — modules don't exist yet.

- [ ] **Step 3: Implement paths.ts**

```ts
// cli/src/lib/paths.ts
import path from "node:path";

export function ralfieDir(cwd: string): string {
  return path.join(cwd, ".ralfie");
}

export function configPath(cwd: string): string {
  return path.join(ralfieDir(cwd), "config.json");
}

export function boardsDir(cwd: string): string {
  return path.join(ralfieDir(cwd), "boards");
}

export function boardDir(cwd: string, boardName: string): string {
  return path.join(boardsDir(cwd), boardName);
}

export function planPath(cwd: string, boardName: string): string {
  return path.join(boardDir(cwd, boardName), "plan.md");
}

export function prdPath(cwd: string, boardName: string): string {
  return path.join(boardDir(cwd, boardName), "prd.json");
}

export function progressPath(cwd: string, boardName: string): string {
  return path.join(boardDir(cwd, boardName), "progress.md");
}

export function locksDir(cwd: string, boardName: string): string {
  return path.join(boardDir(cwd, boardName), "locks");
}

export function lockPath(cwd: string, boardName: string, itemId: string): string {
  return path.join(locksDir(cwd, boardName), `${itemId}.lock`);
}
```

- [ ] **Step 4: Implement config.ts**

```ts
// cli/src/lib/config.ts
import fs from "node:fs";
import type { RalfieConfig } from "@ralfie/shared";
import { configPath, ralfieDir } from "./paths.js";

export const defaultConfig: RalfieConfig = {
  agent_command: "claude",
  default_iterations: 10,
  feedback_loops: [],
  serve_port: 3333,
};

export function readConfig(cwd: string): RalfieConfig {
  const cfgPath = configPath(cwd);
  if (!fs.existsSync(cfgPath)) {
    return { ...defaultConfig };
  }
  const raw = JSON.parse(fs.readFileSync(cfgPath, "utf-8"));
  return { ...defaultConfig, ...raw };
}

export function writeConfig(cwd: string, config: RalfieConfig): void {
  const dir = ralfieDir(cwd);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(configPath(cwd), JSON.stringify(config, null, 2) + "\n");
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npm test --workspace=cli -- --run config
```

Expected: PASS — all 3 tests green.

- [ ] **Step 6: Commit**

```bash
git add cli/
git commit -m "feat: add paths and config modules with tests"
```

---

## Task 4: CLI Lib — PRD Data Model (with Board-Level File Locking)

**Files:**
- Create: `cli/src/lib/prd.ts`
- Test: `cli/__tests__/prd.test.ts`

> **IMPORTANT:** Since multiple agents can work on the same board concurrently, and all PRD state lives in a single `prd.json` file, every read-modify-write operation on the PRD must hold a board-level file lock. Without this, concurrent agents will clobber each other's changes. The locking is implemented using `O_EXCL` on a `.ralfie/boards/<board>/prd.lock` file. All PRD mutation functions accept a `boardLockDir` parameter and acquire/release the lock internally.

- [ ] **Step 1: Write the failing test**

```ts
// cli/__tests__/prd.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { readPrd, writePrd, claimItem, completeItem, failItem, verifyItem, addComment } from "../src/lib/prd.js";
import type { Prd } from "@ralfie/shared";

function makePrd(): Prd {
  return {
    project: "test",
    description: "test project",
    created: "2026-01-01",
    items: [
      {
        id: "T1",
        category: "Core",
        description: "First task",
        steps_to_verify: ["check it works"],
        status: "pending",
        assigned_to: null,
        comments: [],
      },
      {
        id: "T2",
        category: "Core",
        description: "Second task",
        steps_to_verify: [],
        status: "pending",
        assigned_to: null,
        comments: [],
      },
    ],
  };
}

describe("prd", () => {
  let tmpDir: string;
  let prdFile: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ralfie-prd-"));
    prdFile = path.join(tmpDir, "prd.json");
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("writes and reads a PRD", () => {
    const prd = makePrd();
    writePrd(prdFile, prd);
    const read = readPrd(prdFile);
    expect(read.items).toHaveLength(2);
    expect(read.items[0].id).toBe("T1");
  });

  it("claims an item for a session", () => {
    const prd = makePrd();
    writePrd(prdFile, prd);
    claimItem(prdFile, "T1", "session-abc");
    const read = readPrd(prdFile);
    expect(read.items[0].status).toBe("in_progress");
    expect(read.items[0].assigned_to).toBe("session-abc");
  });

  it("rejects claiming an already in_progress item", () => {
    const prd = makePrd();
    prd.items[0].status = "in_progress";
    prd.items[0].assigned_to = "session-other";
    writePrd(prdFile, prd);
    expect(() => claimItem(prdFile, "T1", "session-abc")).toThrow();
  });

  it("completes an item", () => {
    const prd = makePrd();
    prd.items[0].status = "in_progress";
    prd.items[0].assigned_to = "session-abc";
    writePrd(prdFile, prd);
    completeItem(prdFile, "T1");
    const read = readPrd(prdFile);
    expect(read.items[0].status).toBe("done");
    expect(read.items[0].assigned_to).toBeNull();
  });

  it("fails an item with a comment", () => {
    const prd = makePrd();
    prd.items[0].status = "in_progress";
    writePrd(prdFile, prd);
    failItem(prdFile, "T1", "session-abc", "Tests failed: type error in X");
    const read = readPrd(prdFile);
    expect(read.items[0].status).toBe("failed");
    expect(read.items[0].comments).toHaveLength(1);
    expect(read.items[0].comments[0].message).toContain("Tests failed");
  });

  it("verifies an item", () => {
    const prd = makePrd();
    prd.items[0].status = "done";
    writePrd(prdFile, prd);
    verifyItem(prdFile, "T1");
    const read = readPrd(prdFile);
    expect(read.items[0].status).toBe("verified");
  });

  it("rejects verifying an item that is not done", () => {
    const prd = makePrd();
    writePrd(prdFile, prd);
    expect(() => verifyItem(prdFile, "T1")).toThrow();
  });

  it("adds a comment to an item", () => {
    const prd = makePrd();
    writePrd(prdFile, prd);
    addComment(prdFile, "T1", "session-abc", "Started investigating");
    const read = readPrd(prdFile);
    expect(read.items[0].comments).toHaveLength(1);
    expect(read.items[0].comments[0].session_id).toBe("session-abc");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test --workspace=cli -- --run prd
```

Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement prd.ts**

```ts
// cli/src/lib/prd.ts
import fs from "node:fs";
import path from "node:path";
import type { Prd, PrdItem } from "@ralfie/shared";

export function readPrd(filePath: string): Prd {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

export function writePrd(filePath: string, prd: Prd): void {
  fs.writeFileSync(filePath, JSON.stringify(prd, null, 2) + "\n");
}

function findItem(prd: Prd, itemId: string): PrdItem {
  const item = prd.items.find((i) => i.id === itemId);
  if (!item) throw new Error(`Item "${itemId}" not found in PRD`);
  return item;
}

// Board-level file lock for safe concurrent PRD mutations.
// Uses O_EXCL to atomically create a lock file; spins with backoff if locked.
function acquirePrdLock(prdFilePath: string, timeoutMs = 10000): string {
  const lockFile = prdFilePath + ".lock";
  const start = Date.now();
  let delay = 10;
  while (Date.now() - start < timeoutMs) {
    try {
      const fd = fs.openSync(lockFile, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL);
      fs.writeSync(fd, JSON.stringify({ pid: process.pid, acquired: new Date().toISOString() }));
      fs.closeSync(fd);
      return lockFile;
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code !== "EEXIST") throw err;
      // Spin with exponential backoff (cap at 200ms)
      const jitter = Math.random() * delay;
      const waitMs = delay + jitter;
      const waitUntil = Date.now() + waitMs;
      while (Date.now() < waitUntil) { /* busy wait */ }
      delay = Math.min(delay * 2, 200);
    }
  }
  throw new Error(`Timed out acquiring PRD lock after ${timeoutMs}ms`);
}

function releasePrdLock(lockFile: string): void {
  try { fs.unlinkSync(lockFile); } catch { /* ignore if already removed */ }
}

// Helper: run a read-modify-write operation on the PRD under a file lock
function withPrdLock<T>(filePath: string, fn: (prd: Prd) => T): T {
  const lockFile = acquirePrdLock(filePath);
  try {
    const prd = readPrd(filePath);
    const result = fn(prd);
    writePrd(filePath, prd);
    return result;
  } finally {
    releasePrdLock(lockFile);
  }
}

export function claimItem(filePath: string, itemId: string, sessionId: string): void {
  withPrdLock(filePath, (prd) => {
    const item = findItem(prd, itemId);
    if (item.status === "in_progress") {
      throw new Error(`Item "${itemId}" is already in progress (assigned to ${item.assigned_to})`);
    }
    if (item.status === "done" || item.status === "verified") {
      throw new Error(`Item "${itemId}" is already ${item.status}`);
    }
    item.status = "in_progress";
    item.assigned_to = sessionId;
  });
}

export function completeItem(filePath: string, itemId: string): void {
  withPrdLock(filePath, (prd) => {
    const item = findItem(prd, itemId);
    item.status = "done";
    item.assigned_to = null;
  });
}

export function failItem(filePath: string, itemId: string, sessionId: string, reason: string): void {
  withPrdLock(filePath, (prd) => {
    const item = findItem(prd, itemId);
    item.status = "failed";
    item.assigned_to = null;
    item.comments.push({
      timestamp: new Date().toISOString(),
      session_id: sessionId,
      message: reason,
    });
  });
}

export function verifyItem(filePath: string, itemId: string): void {
  withPrdLock(filePath, (prd) => {
    const item = findItem(prd, itemId);
    if (item.status !== "done") {
      throw new Error(`Cannot verify item "${itemId}" — status is "${item.status}", must be "done"`);
    }
    item.status = "verified";
  });
}

export function addComment(filePath: string, itemId: string, sessionId: string, message: string): void {
  withPrdLock(filePath, (prd) => {
    const item = findItem(prd, itemId);
    item.comments.push({
      timestamp: new Date().toISOString(),
      session_id: sessionId,
      message,
    });
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test --workspace=cli -- --run prd
```

Expected: PASS — all 8 tests green.

- [ ] **Step 5: Commit**

```bash
git add cli/
git commit -m "feat: add PRD data model with item state transitions and comments"
```

---

## Task 5: CLI Lib — Board Operations

**Files:**
- Create: `cli/src/lib/board.ts`
- Test: `cli/__tests__/board.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// cli/__tests__/board.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createBoard, listBoards, getBoard, boardExists } from "../src/lib/board.js";

describe("board", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ralfie-board-"));
    fs.mkdirSync(path.join(tmpDir, ".ralfie", "boards"), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("creates a board with plan, prd, and progress files", () => {
    createBoard(tmpDir, "auth-system", "# Auth System Plan", {
      project: "auth",
      description: "Auth system",
      created: "2026-01-01",
      items: [],
    });
    expect(boardExists(tmpDir, "auth-system")).toBe(true);
    const board = getBoard(tmpDir, "auth-system");
    expect(board.meta.name).toBe("auth-system");
    expect(board.plan).toContain("# Auth System Plan");
    expect(board.prd.project).toBe("auth");
    expect(board.progress).toBe("");
  });

  it("lists all boards", () => {
    createBoard(tmpDir, "feature-a", "# A", { project: "a", description: "", created: "2026-01-01", items: [] });
    createBoard(tmpDir, "feature-b", "# B", { project: "b", description: "", created: "2026-01-01", items: [] });
    const boards = listBoards(tmpDir);
    expect(boards).toHaveLength(2);
    expect(boards.map((b) => b.name).sort()).toEqual(["feature-a", "feature-b"]);
  });

  it("returns false for non-existent board", () => {
    expect(boardExists(tmpDir, "nope")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test --workspace=cli -- --run board
```

- [ ] **Step 3: Implement board.ts**

```ts
// cli/src/lib/board.ts
import fs from "node:fs";
import type { Prd, BoardMeta } from "@ralfie/shared";
import { boardDir, boardsDir, planPath, prdPath, progressPath, locksDir } from "./paths.js";
import { readPrd, writePrd } from "./prd.js";

export function createBoard(cwd: string, name: string, plan: string, prd: Prd): void {
  const dir = boardDir(cwd, name);
  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(locksDir(cwd, name), { recursive: true });

  fs.writeFileSync(planPath(cwd, name), plan);
  writePrd(prdPath(cwd, name), prd);
  fs.writeFileSync(progressPath(cwd, name), "");

  const meta: BoardMeta = {
    name,
    created: new Date().toISOString(),
    description: prd.description,
  };
  fs.writeFileSync(`${dir}/meta.json`, JSON.stringify(meta, null, 2) + "\n");
}

export function boardExists(cwd: string, name: string): boolean {
  return fs.existsSync(boardDir(cwd, name));
}

export function getBoard(cwd: string, name: string) {
  const dir = boardDir(cwd, name);
  const meta: BoardMeta = JSON.parse(fs.readFileSync(`${dir}/meta.json`, "utf-8"));
  const plan = fs.readFileSync(planPath(cwd, name), "utf-8");
  const prd = readPrd(prdPath(cwd, name));
  const progress = fs.readFileSync(progressPath(cwd, name), "utf-8");
  return { meta, plan, prd, progress };
}

export function listBoards(cwd: string): BoardMeta[] {
  const dir = boardsDir(cwd);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => {
      const metaPath = `${dir}/${d.name}/meta.json`;
      if (!fs.existsSync(metaPath)) return null;
      return JSON.parse(fs.readFileSync(metaPath, "utf-8")) as BoardMeta;
    })
    .filter((m): m is BoardMeta => m !== null);
}

export function appendProgress(cwd: string, name: string, entry: string): void {
  const p = progressPath(cwd, name);
  const existing = fs.readFileSync(p, "utf-8");
  fs.writeFileSync(p, existing + entry + "\n");
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test --workspace=cli -- --run board
```

- [ ] **Step 5: Commit**

```bash
git add cli/
git commit -m "feat: add board CRUD operations with tests"
```

---

## Task 6: CLI Lib — Per-Item Lockfiles

**Files:**
- Create: `cli/src/lib/lock.ts`
- Test: `cli/__tests__/lock.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// cli/__tests__/lock.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { acquireLock, releaseLock, isLocked, getLockInfo, clearStaleLocks } from "../src/lib/lock.js";

describe("lock", () => {
  let tmpDir: string;
  let locksPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ralfie-lock-"));
    locksPath = path.join(tmpDir, ".ralfie", "boards", "test-board", "locks");
    fs.mkdirSync(locksPath, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("acquires a lock", () => {
    const result = acquireLock(tmpDir, "test-board", "T1", "session-abc");
    expect(result).toBe(true);
    expect(isLocked(tmpDir, "test-board", "T1")).toBe(true);
  });

  it("rejects acquiring an existing lock", () => {
    acquireLock(tmpDir, "test-board", "T1", "session-abc");
    const result = acquireLock(tmpDir, "test-board", "T1", "session-def");
    expect(result).toBe(false);
  });

  it("releases a lock", () => {
    acquireLock(tmpDir, "test-board", "T1", "session-abc");
    releaseLock(tmpDir, "test-board", "T1");
    expect(isLocked(tmpDir, "test-board", "T1")).toBe(false);
  });

  it("returns lock info with session ID", () => {
    acquireLock(tmpDir, "test-board", "T1", "session-abc");
    const info = getLockInfo(tmpDir, "test-board", "T1");
    expect(info?.session_id).toBe("session-abc");
  });

  it("clears all locks for a board", () => {
    acquireLock(tmpDir, "test-board", "T1", "session-abc");
    acquireLock(tmpDir, "test-board", "T2", "session-def");
    const cleared = clearStaleLocks(tmpDir, "test-board");
    expect(cleared).toBe(2);
    expect(isLocked(tmpDir, "test-board", "T1")).toBe(false);
    expect(isLocked(tmpDir, "test-board", "T2")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test --workspace=cli -- --run lock
```

- [ ] **Step 3: Implement lock.ts**

```ts
// cli/src/lib/lock.ts
import fs from "node:fs";
import { lockPath, locksDir } from "./paths.js";

interface LockInfo {
  session_id: string;
  acquired_at: string;
  pid: number;
}

export function acquireLock(cwd: string, board: string, itemId: string, sessionId: string): boolean {
  const lp = lockPath(cwd, board, itemId);
  const dir = locksDir(cwd, board);
  fs.mkdirSync(dir, { recursive: true });

  const info: LockInfo = {
    session_id: sessionId,
    acquired_at: new Date().toISOString(),
    pid: process.pid,
  };

  try {
    // O_EXCL ensures atomic create — fails if file exists
    const fd = fs.openSync(lp, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL);
    fs.writeSync(fd, JSON.stringify(info, null, 2));
    fs.closeSync(fd);
    return true;
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "EEXIST") return false;
    throw err;
  }
}

export function releaseLock(cwd: string, board: string, itemId: string): void {
  const lp = lockPath(cwd, board, itemId);
  if (fs.existsSync(lp)) fs.unlinkSync(lp);
}

export function isLocked(cwd: string, board: string, itemId: string): boolean {
  return fs.existsSync(lockPath(cwd, board, itemId));
}

export function getLockInfo(cwd: string, board: string, itemId: string): LockInfo | null {
  const lp = lockPath(cwd, board, itemId);
  if (!fs.existsSync(lp)) return null;
  return JSON.parse(fs.readFileSync(lp, "utf-8"));
}

export function clearStaleLocks(cwd: string, board: string): number {
  const dir = locksDir(cwd, board);
  if (!fs.existsSync(dir)) return 0;
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".lock"));
  for (const f of files) fs.unlinkSync(`${dir}/${f}`);
  return files.length;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test --workspace=cli -- --run lock
```

- [ ] **Step 5: Commit**

```bash
git add cli/
git commit -m "feat: add per-item lockfile management with O_EXCL atomic create"
```

---

## Task 7: CLI Lib — Agent Spawner

**Files:**
- Create: `cli/src/lib/agent.ts`

- [ ] **Step 1: Implement agent.ts**

This module wraps `child_process.spawn` to invoke Claude Code in two modes:
- **Interactive** (`ralf plan`, `ralf edit`): spawns `claude` with stdin/stdout inherited so the user interacts directly.
- **Print mode** (`ralf run`): spawns `claude -p "<prompt>"` and captures stdout, checking for completion signal.

```ts
// cli/src/lib/agent.ts
import { spawn } from "node:child_process";
import { readConfig } from "./config.js";

export interface AgentResult {
  output: string;
  exitCode: number;
  complete: boolean;  // true if output contains <ralfie>COMPLETE</ralfie>
}

export function spawnInteractive(cwd: string, args: string[]): Promise<number> {
  const config = readConfig(cwd);
  return new Promise((resolve, reject) => {
    const child = spawn(config.agent_command, args, {
      cwd,
      stdio: "inherit",
    });
    child.on("close", (code) => resolve(code ?? 1));
    child.on("error", reject);
  });
}

export function spawnPrintMode(cwd: string, prompt: string): Promise<AgentResult> {
  const config = readConfig(cwd);
  return new Promise((resolve, reject) => {
    const child = spawn(config.agent_command, ["-p", prompt], {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      stdout += text;
      process.stdout.write(text);
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on("close", (code) => {
      resolve({
        output: stdout,
        exitCode: code ?? 1,
        complete: stdout.includes("<ralfie>COMPLETE</ralfie>"),
      });
    });

    child.on("error", reject);
  });
}

export function generateSessionId(): string {
  return `ralfie-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
```

- [ ] **Step 2: Commit**

```bash
git add cli/src/lib/agent.ts
git commit -m "feat: add agent spawner for interactive and print-mode Claude Code sessions"
```

---

## Task 8: CLI Lib — Skills

**Files:**
- Create: `cli/src/lib/skills.ts`
- Create: `cli/src/skills/ralfie-plan.md`
- Create: `cli/src/skills/ralfie-edit.md`
- Create: `cli/src/skills/ralfie-run.md`

- [ ] **Step 1: Write the ralfie-plan skill**

```markdown
<!-- cli/src/skills/ralfie-plan.md -->
---
name: ralfie-plan
description: Interactive planning skill — grills the user about their feature, generates a plan (RFC), then a PRD
---

# Ralfie Plan

You are Ralfie's planning agent. Your job is to help the user define a feature by interrogating them about every aspect of it, then generating structured output.

## Phase 1: Grilling

Interview the user relentlessly about the feature they want to build. Walk down each branch of the design tree, resolving dependencies one by one. Do NOT accept vague answers. Push for specifics.

If a question can be answered by exploring the codebase, explore it instead of asking.

Cover:
- What exactly the feature does (user stories, edge cases)
- How it integrates with existing code
- Data model changes
- API/edge function requirements
- UI/UX requirements
- Security considerations
- Performance implications

When YOU decide you have enough information, announce: "I have enough context. Generating the plan now."

## Phase 2: Plan Generation

Generate a comprehensive plan document (RFC-style) in markdown. Write it to `.ralfie/boards/<board-name>/plan.md` where `<board-name>` is a kebab-case slug derived from the feature name.

The plan should include:
- Overview and motivation
- Detailed design (data model, APIs, UI, security)
- End state description
- Open questions (if any)

After writing the plan, present it to the user and ask: "Does this plan look good? Say 'approved' to proceed to PRD generation, or tell me what to change."

## Phase 3: PRD Generation

Once the plan is approved, generate a PRD in JSON format at `.ralfie/boards/<board-name>/prd.json`.

The PRD must follow this exact schema:
```json
{
  "project": "<project name>",
  "description": "<one-line description>",
  "created": "<YYYY-MM-DD>",
  "items": [
    {
      "id": "<category-prefix><number>",
      "category": "<category name>",
      "description": "<what to implement>",
      "steps_to_verify": ["<step 1>", "<step 2>"],
      "status": "pending",
      "assigned_to": null,
      "comments": []
    }
  ]
}
```

Also create an empty progress file at `.ralfie/boards/<board-name>/progress.md`.

Also create `meta.json` at `.ralfie/boards/<board-name>/meta.json`:
```json
{
  "name": "<board-name>",
  "created": "<ISO 8601>",
  "description": "<one-line from PRD>"
}
```

Items should be ordered by implementation priority:
1. Architectural decisions and core abstractions
2. Integration points between modules
3. Unknown unknowns and spike work
4. Standard features and implementation
5. Polish, cleanup, and quick wins

After generating, tell the user: "Board '<board-name>' created with X items. Run `ralf run <board-name>` to start implementation."
```

- [ ] **Step 2: Write the ralfie-edit skill**

```markdown
<!-- cli/src/skills/ralfie-edit.md -->
---
name: ralfie-edit
description: Interactive editing skill — grills the user about changes to an existing board, updates plan and PRD, logs drift
---

# Ralfie Edit

You are Ralfie's editing agent. The user wants to modify an existing board.

## Setup

Read the current state:
- `.ralfie/boards/<board>/plan.md` — the current plan
- `.ralfie/boards/<board>/prd.json` — the current PRD
- `.ralfie/boards/<board>/progress.md` — work done so far

## Phase 1: Grilling

Ask the user what they want to change and why. Push for specifics:
- Which items are affected?
- Are there new items to add?
- Should any items be removed or re-scoped?
- Does this change the plan/architecture?
- How does this interact with work already completed (check progress.md)?

## Phase 2: Update

Update `plan.md` and `prd.json` to reflect the changes. For modified items, preserve their current status if work has been done. New items start as `pending`.

## Phase 3: Drift Log

Append a drift entry to `progress.md`:

```
## DRIFT — <date>

**Changed by:** Human (via ralf edit)
**Reason:** <user's reason>

**Items modified:** <list of item IDs and what changed>
**Items added:** <list of new item IDs>
**Items removed:** <list of removed item IDs>

**Impact on in-progress work:** <assessment of whether running agents need to be aware>
```

After updating, tell the user: "Board '<board>' updated. X items modified, Y added, Z removed. Drift logged."
```

- [ ] **Step 3: Write the ralfie-run skill**

```markdown
<!-- cli/src/skills/ralfie-run.md -->
---
name: ralfie-run
description: Execution skill — implements PRD items one at a time with feedback loops and progress tracking
---

# Ralfie Run

You are Ralfie's execution agent. You implement PRD items one at a time.

## Context Files

You have been given:
- The PRD (`.ralfie/boards/<board>/prd.json`) — your task list
- The plan (`.ralfie/boards/<board>/plan.md`) — architectural context
- The progress file (`.ralfie/boards/<board>/progress.md`) — what's been done

## Workflow

### 1. Pick a Task

Read the PRD and choose the highest-priority `pending` or `failed` item. Priority order:
1. Architectural decisions and core abstractions
2. Integration points between modules
3. Unknown unknowns and spike work
4. Standard features and implementation
5. Polish, cleanup, and quick wins

Skip items with status `in_progress` (another agent is on it), `done`, or `verified`.

If a `failed` item has comments explaining previous failures, read them. Only pick it up if you believe you can resolve the issues.

### 2. Claim the Item

Update the item in prd.json: set `status` to `"in_progress"` and `assigned_to` to your session ID.

### 3. Implement

Implement the item. Keep changes small and focused:
- One logical change per commit
- If a task feels too large, break it into subtasks
- Prefer multiple small commits over one large commit

### 4. Run Feedback Loops

Before committing, run ALL configured feedback loops. Check `.ralfie/config.json` for the `feedback_loops` array. If empty, look for common patterns:
- TypeScript: `npm run typecheck`
- Tests: `npm test`
- Lint: `npm run lint`

Do NOT commit if any feedback loop fails. Fix issues first.

### 5. Update Progress

Append to progress.md:
- Task completed and PRD item reference
- Key decisions made and reasoning
- Files changed
- Any blockers or notes for next iteration

Keep entries concise.

### 6. Update PRD Item

Set the item's `status` to `"done"` in prd.json. Clear `assigned_to`.

### 7. Commit

Make a git commit with a clear message referencing the item ID.

### 8. Check Completion

If ALL items in the PRD are `done` or `verified`, output:

<ralfie>COMPLETE</ralfie>

### Failure Protocol

If you cannot complete an item after a genuine attempt:
1. Set the item's `status` to `"failed"` in prd.json
2. Add a comment to the item explaining what went wrong and what you tried
3. Append to progress.md noting the failure
4. Move on to the next item

DO NOT burn tokens going in circles. If you're stuck after 2-3 attempts at a fix, mark it failed and move on. A future agent (or human) can pick it up with context from your comments.

### Code Quality

This codebase will outlive you. Every shortcut you take becomes someone else's burden.
- Follow existing patterns in the codebase
- Leave the codebase better than you found it
- Fight entropy
```

- [ ] **Step 4: Implement skills.ts**

```ts
// cli/src/lib/skills.ts
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SKILL_FILES = ["ralfie-plan.md", "ralfie-edit.md", "ralfie-run.md"];

export function installSkills(cwd: string): void {
  const targetDir = path.join(cwd, ".claude", "skills");
  fs.mkdirSync(targetDir, { recursive: true });

  // This file lives at cli/dist/lib/skills.js after build.
  // Skills are copied to cli/dist/skills/ by the build step.
  const sourceDir = path.join(__dirname, "..", "skills");

  for (const file of SKILL_FILES) {
    const src = path.join(sourceDir, file);
    const dest = path.join(targetDir, file);
    fs.copyFileSync(src, dest);
  }
}

export function getSkillsSourceDir(): string {
  return path.join(__dirname, "skills");
}
```

- [ ] **Step 5: Commit**

```bash
git add cli/src/lib/skills.ts cli/src/skills/
git commit -m "feat: add bundled Claude Code skills (plan, edit, run) and installer"
```

---

## Task 9: CLI Commands — `ralf init`

**Files:**
- Create: `cli/src/commands/init.ts`
- Create: `cli/src/index.ts`
- Test: `cli/__tests__/commands/init.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// cli/__tests__/commands/init.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { runInit } from "../src/commands/init.js";

describe("ralf init", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ralfie-init-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("creates .ralfie directory with config and boards", () => {
    runInit(tmpDir);
    expect(fs.existsSync(path.join(tmpDir, ".ralfie"))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, ".ralfie", "config.json"))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, ".ralfie", "boards"))).toBe(true);
  });

  it("does not overwrite existing config", () => {
    runInit(tmpDir);
    // modify config
    const cfgPath = path.join(tmpDir, ".ralfie", "config.json");
    const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf-8"));
    cfg.default_iterations = 50;
    fs.writeFileSync(cfgPath, JSON.stringify(cfg));
    // re-init
    runInit(tmpDir);
    const reread = JSON.parse(fs.readFileSync(cfgPath, "utf-8"));
    expect(reread.default_iterations).toBe(50);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test --workspace=cli -- --run init
```

- [ ] **Step 3: Implement init command**

```ts
// cli/src/commands/init.ts
import fs from "node:fs";
import { ralfieDir, boardsDir, configPath } from "../lib/paths.js";
import { defaultConfig, writeConfig } from "../lib/config.js";
import { installSkills } from "../lib/skills.js";

export function runInit(cwd: string): void {
  const dir = ralfieDir(cwd);
  fs.mkdirSync(boardsDir(cwd), { recursive: true });

  // Only write config if it doesn't exist
  if (!fs.existsSync(configPath(cwd))) {
    writeConfig(cwd, defaultConfig);
  }

  // Install Claude Code skills
  installSkills(cwd);

  console.log("Ralfie initialized in .ralfie/");
  console.log("Skills installed to .claude/skills/");
  console.log("Run `ralf plan` to create your first board.");
}
```

- [ ] **Step 4: Implement CLI entry point**

```ts
// cli/src/index.ts
// Note: tsc strips shebangs. The build step prepends #!/usr/bin/env node
// to dist/index.js via the postbuild script.
import { Command } from "commander";
import { runInit } from "./commands/init.js";

const program = new Command();

program
  .name("ralf")
  .description("Ralfie — agentic coding loop manager")
  .version("0.0.1");

program
  .command("init")
  .description("Initialize Ralfie in the current directory")
  .action(() => {
    runInit(process.cwd());
  });

program.parse();
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npm test --workspace=cli -- --run init
```

- [ ] **Step 6: Commit**

```bash
git add cli/
git commit -m "feat: add ralf init command with config scaffolding and skill installation"
```

---

## Task 10: CLI Commands — `ralf plan`

**Files:**
- Create: `cli/src/commands/plan.ts`
- Modify: `cli/src/index.ts`

- [ ] **Step 1: Implement plan command**

```ts
// cli/src/commands/plan.ts
import fs from "node:fs";
import path from "node:path";
import { spawnInteractive } from "../lib/agent.js";

export async function runPlan(cwd: string): Promise<void> {
  // Verify the skill is installed
  const skillPath = path.join(cwd, ".claude", "skills", "ralfie-plan.md");
  if (!fs.existsSync(skillPath)) {
    console.error("Ralfie skills not installed. Run `ralf init` first.");
    process.exit(1);
  }

  console.log("Starting Ralfie planning session...");
  console.log("The agent will grill you about your feature, then generate a plan and PRD.\n");

  // Claude Code skills are invoked via /skill-name in the chat.
  // We launch an interactive session and let the user interact directly.
  // The initial prompt tells Claude to use the skill.
  const exitCode = await spawnInteractive(cwd, [
    "--prompt", "Use the /ralfie-plan skill to start an interactive planning session. Follow the skill's instructions exactly.",
  ]);

  if (exitCode !== 0) {
    console.error(`Planning session exited with code ${exitCode}`);
    process.exit(exitCode);
  }
}
```

> **Note:** Claude Code does not have a `--skill` CLI flag. Skills are invoked via `/skill-name` inside a session. The `--prompt` flag sends an initial message to kick off the session, which then runs interactively with `stdio: "inherit"`.

- [ ] **Step 2: Wire into CLI entry point**

Add to `cli/src/index.ts`:

```ts
import { runPlan } from "./commands/plan.js";

program
  .command("plan")
  .description("Start an interactive planning session to create a new board")
  .action(async () => {
    await runPlan(process.cwd());
  });
```

- [ ] **Step 3: Commit**

```bash
git add cli/src/commands/plan.ts cli/src/index.ts
git commit -m "feat: add ralf plan command — spawns interactive Claude Code planning session"
```

---

## Task 11: CLI Commands — `ralf edit`

**Files:**
- Create: `cli/src/commands/edit.ts`
- Modify: `cli/src/index.ts`

- [ ] **Step 1: Implement edit command**

```ts
// cli/src/commands/edit.ts
import fs from "node:fs";
import path from "node:path";
import { boardExists } from "../lib/board.js";
import { spawnInteractive } from "../lib/agent.js";

export async function runEdit(cwd: string, boardName: string): Promise<void> {
  if (!boardExists(cwd, boardName)) {
    console.error(`Board "${boardName}" not found. Run \`ralf list\` to see available boards.`);
    process.exit(1);
  }

  const skillPath = path.join(cwd, ".claude", "skills", "ralfie-edit.md");
  if (!fs.existsSync(skillPath)) {
    console.error("Ralfie skills not installed. Run `ralf init` first.");
    process.exit(1);
  }

  console.log(`Starting edit session for board "${boardName}"...\n`);

  // Launch interactive session — the initial prompt tells Claude which board to edit
  // and to use the ralfie-edit skill. The session runs with inherited stdio.
  const exitCode = await spawnInteractive(cwd, [
    "--prompt", `Use the /ralfie-edit skill to edit board "${boardName}". Board files are at .ralfie/boards/${boardName}/. Follow the skill's instructions exactly.`,
  ]);

  if (exitCode !== 0) {
    console.error(`Edit session exited with code ${exitCode}`);
    process.exit(exitCode);
  }
}
```

- [ ] **Step 2: Wire into CLI entry point**

Add to `cli/src/index.ts`:

```ts
import { runEdit } from "./commands/edit.js";

program
  .command("edit <board>")
  .description("Start an interactive session to edit an existing board")
  .action(async (board: string) => {
    await runEdit(process.cwd(), board);
  });
```

- [ ] **Step 3: Commit**

```bash
git add cli/src/commands/edit.ts cli/src/index.ts
git commit -m "feat: add ralf edit command — interactive board editing with drift logging"
```

---

## Task 12: CLI Commands — `ralf run`

**Files:**
- Create: `cli/src/commands/run.ts`
- Modify: `cli/src/index.ts`

- [ ] **Step 1: Implement run command**

```ts
// cli/src/commands/run.ts
import fs from "node:fs";
import { boardExists } from "../lib/board.js";
import { readConfig } from "../lib/config.js";
import { spawnPrintMode, generateSessionId } from "../lib/agent.js";
import { prdPath, progressPath, planPath, configPath } from "../lib/paths.js";

export async function runRun(cwd: string, boardName: string, iterations?: number): Promise<void> {
  if (!boardExists(cwd, boardName)) {
    console.error(`Board "${boardName}" not found. Run \`ralf list\` to see available boards.`);
    process.exit(1);
  }

  const config = readConfig(cwd);
  const maxIter = iterations ?? config.default_iterations;
  const sessionId = generateSessionId();

  console.log(`Starting Ralfie run on board "${boardName}"`);
  console.log(`Session: ${sessionId}`);
  console.log(`Max iterations: ${maxIter}\n`);

  const prd = prdPath(cwd, boardName);
  const progress = progressPath(cwd, boardName);
  const plan = planPath(cwd, boardName);

  for (let i = 1; i <= maxIter; i++) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`Iteration ${i}/${maxIter}`);
    console.log(`${"=".repeat(60)}\n`);

    const feedbackLoopInstructions = config.feedback_loops.length > 0
      ? `Before committing, run ALL feedback loops:\n${config.feedback_loops.map((cmd, j) => `${j + 1}. ${cmd}`).join("\n")}\nDo NOT commit if any feedback loop fails. Fix issues first.`
      : "Look for common feedback loops in the project (typecheck, test, lint) and run them before committing.";

    const prompt = [
      `@${prd} @${progress} @${plan}`,
      ``,
      `You are Ralfie session ${sessionId}, iteration ${i}/${maxIter}.`,
      ``,
      `Use the /ralfie-run skill to guide your work.`,
      ``,
      `${feedbackLoopInstructions}`,
      ``,
      `ONLY WORK ON A SINGLE ITEM. If all items are done/verified, output <ralfie>COMPLETE</ralfie>.`,
    ].join("\n");

    const result = await spawnPrintMode(cwd, prompt);

    if (result.complete) {
      console.log("\nAll PRD items complete. Exiting.");
      return;
    }

    console.log(`\nIteration ${i} complete.`);
  }

  console.log(`\nReached max iterations (${maxIter}). Run again to continue.`);
}
```

- [ ] **Step 2: Wire into CLI entry point**

Add to `cli/src/index.ts`:

```ts
import { runRun } from "./commands/run.js";

program
  .command("run <board> [iterations]")
  .description("Run the agentic loop on a board")
  .action(async (board: string, iterations?: string) => {
    await runRun(process.cwd(), board, iterations ? parseInt(iterations, 10) : undefined);
  });
```

- [ ] **Step 3: Commit**

```bash
git add cli/src/commands/run.ts cli/src/index.ts
git commit -m "feat: add ralf run command — serial agent loop with lockfiles and completion detection"
```

---

## Task 13: CLI Commands — `ralf list`, `ralf status`, `ralf verify`, `ralf unlock`

**Files:**
- Create: `cli/src/commands/list.ts`
- Create: `cli/src/commands/status.ts`
- Create: `cli/src/commands/verify.ts`
- Create: `cli/src/commands/unlock.ts`
- Modify: `cli/src/index.ts`
- Test: `cli/__tests__/commands/list.test.ts`, `cli/__tests__/commands/status.test.ts`, `cli/__tests__/commands/verify.test.ts`, `cli/__tests__/commands/unlock.test.ts`

- [ ] **Step 1: Write failing tests for list**

```ts
// cli/__tests__/commands/list.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createBoard } from "../src/lib/board.js";
import { formatBoardList } from "../src/commands/list.js";
import type { Prd } from "@ralfie/shared";

describe("ralf list", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ralfie-list-"));
    fs.mkdirSync(path.join(tmpDir, ".ralfie", "boards"), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("formats board list with progress", () => {
    const prd: Prd = {
      project: "test",
      description: "Test",
      created: "2026-01-01",
      items: [
        { id: "T1", category: "A", description: "a", steps_to_verify: [], status: "done", assigned_to: null, comments: [] },
        { id: "T2", category: "A", description: "b", steps_to_verify: [], status: "pending", assigned_to: null, comments: [] },
      ],
    };
    createBoard(tmpDir, "test-board", "# plan", prd);
    const output = formatBoardList(tmpDir);
    expect(output).toContain("test-board");
    expect(output).toContain("1/2");
  });
});
```

- [ ] **Step 2: Write failing tests for status**

```ts
// cli/__tests__/commands/status.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createBoard } from "../src/lib/board.js";
import { formatStatus } from "../src/commands/status.js";
import type { Prd } from "@ralfie/shared";

describe("ralf status", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ralfie-status-"));
    fs.mkdirSync(path.join(tmpDir, ".ralfie", "boards"), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("filters items by status", () => {
    const prd: Prd = {
      project: "test",
      description: "Test",
      created: "2026-01-01",
      items: [
        { id: "T1", category: "A", description: "done task", steps_to_verify: [], status: "done", assigned_to: null, comments: [] },
        { id: "T2", category: "A", description: "pending task", steps_to_verify: [], status: "pending", assigned_to: null, comments: [] },
        { id: "T3", category: "B", description: "failed task", steps_to_verify: [], status: "failed", assigned_to: null, comments: [] },
      ],
    };
    createBoard(tmpDir, "test-board", "# plan", prd);
    const output = formatStatus(tmpDir, "test-board", "pending");
    expect(output).toContain("T2");
    expect(output).not.toContain("T1");
    expect(output).not.toContain("T3");
  });
});
```

- [ ] **Step 3: Write failing tests for verify and unlock**

```ts
// cli/__tests__/commands/verify.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createBoard } from "../src/lib/board.js";
import { runVerify } from "../src/commands/verify.js";
import { readPrd } from "../src/lib/prd.js";
import { prdPath } from "../src/lib/paths.js";
import type { Prd } from "@ralfie/shared";

describe("ralf verify", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ralfie-verify-"));
    fs.mkdirSync(path.join(tmpDir, ".ralfie", "boards"), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("marks a done item as verified", () => {
    const prd: Prd = {
      project: "test",
      description: "Test",
      created: "2026-01-01",
      items: [
        { id: "T1", category: "A", description: "a", steps_to_verify: [], status: "done", assigned_to: null, comments: [] },
      ],
    };
    createBoard(tmpDir, "test-board", "# plan", prd);
    runVerify(tmpDir, "test-board", "T1");
    const result = readPrd(prdPath(tmpDir, "test-board"));
    expect(result.items[0].status).toBe("verified");
  });
});
```

```ts
// cli/__tests__/commands/unlock.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createBoard } from "../src/lib/board.js";
import { acquireLock, isLocked } from "../src/lib/lock.js";
import { runUnlock } from "../src/commands/unlock.js";

describe("ralf unlock", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ralfie-unlock-"));
    fs.mkdirSync(path.join(tmpDir, ".ralfie", "boards"), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("clears all locks for a board", () => {
    createBoard(tmpDir, "test-board", "# plan", { project: "t", description: "", created: "2026-01-01", items: [] });
    acquireLock(tmpDir, "test-board", "T1", "session-a");
    runUnlock(tmpDir, "test-board");
    expect(isLocked(tmpDir, "test-board", "T1")).toBe(false);
  });
});
```

- [ ] **Step 4: Run tests to verify they fail**

```bash
npm test --workspace=cli -- --run list status verify unlock
```

- [ ] **Step 5: Implement all four commands**

```ts
// cli/src/commands/list.ts
import { listBoards, getBoard } from "../lib/board.js";
import type { ItemStatus } from "@ralfie/shared";

export function formatBoardList(cwd: string): string {
  const boards = listBoards(cwd);
  if (boards.length === 0) return "No boards found. Run `ralf plan` to create one.";

  const lines: string[] = [];
  for (const meta of boards) {
    const board = getBoard(cwd, meta.name);
    const total = board.prd.items.length;
    const done = board.prd.items.filter((i) => i.status === "done" || i.status === "verified").length;
    const failed = board.prd.items.filter((i) => i.status === "failed").length;
    const inProgress = board.prd.items.filter((i) => i.status === "in_progress").length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;

    const bar = renderProgressBar(pct, 20);
    lines.push(`${meta.name}  ${bar}  ${done}/${total} done  ${inProgress} active  ${failed} failed`);
  }

  return lines.join("\n");
}

function renderProgressBar(pct: number, width: number): string {
  const filled = Math.round((pct / 100) * width);
  return `[${"█".repeat(filled)}${"░".repeat(width - filled)}] ${pct}%`;
}

export function runList(cwd: string): void {
  console.log(formatBoardList(cwd));
}
```

```ts
// cli/src/commands/status.ts
import { boardExists, getBoard } from "../lib/board.js";
import type { ItemStatus } from "@ralfie/shared";

const VALID_STATUSES: ItemStatus[] = ["pending", "in_progress", "done", "failed", "verified"];

export function formatStatus(cwd: string, boardName: string, status: string): string {
  if (!VALID_STATUSES.includes(status as ItemStatus)) {
    return `Invalid status "${status}". Valid: ${VALID_STATUSES.join(", ")}`;
  }

  const board = getBoard(cwd, boardName);
  const items = board.prd.items.filter((i) => i.status === status);

  if (items.length === 0) return `No "${status}" items in board "${boardName}".`;

  const lines = items.map((i) => {
    let line = `  ${i.id}  [${i.category}]  ${i.description}`;
    if (i.assigned_to) line += `  (assigned: ${i.assigned_to})`;
    if (i.comments.length > 0) line += `  (${i.comments.length} comment${i.comments.length > 1 ? "s" : ""})`;
    return line;
  });

  return `${status.toUpperCase()} items in "${boardName}" (${items.length}):\n\n${lines.join("\n")}`;
}

export function runStatus(cwd: string, boardName: string, status: string): void {
  if (!boardExists(cwd, boardName)) {
    console.error(`Board "${boardName}" not found.`);
    process.exit(1);
  }
  console.log(formatStatus(cwd, boardName, status));
}
```

```ts
// cli/src/commands/verify.ts
import { boardExists } from "../lib/board.js";
import { verifyItem } from "../lib/prd.js";
import { prdPath } from "../lib/paths.js";

export function runVerify(cwd: string, boardName: string, itemId: string): void {
  if (!boardExists(cwd, boardName)) {
    console.error(`Board "${boardName}" not found.`);
    process.exit(1);
  }

  try {
    verifyItem(prdPath(cwd, boardName), itemId);
    console.log(`Item "${itemId}" marked as verified.`);
  } catch (err: unknown) {
    console.error((err as Error).message);
    process.exit(1);
  }
}
```

```ts
// cli/src/commands/unlock.ts
import { boardExists } from "../lib/board.js";
import { clearStaleLocks } from "../lib/lock.js";

export function runUnlock(cwd: string, boardName: string): void {
  if (!boardExists(cwd, boardName)) {
    console.error(`Board "${boardName}" not found.`);
    process.exit(1);
  }

  const cleared = clearStaleLocks(cwd, boardName);
  console.log(`Cleared ${cleared} lock${cleared !== 1 ? "s" : ""} for board "${boardName}".`);
}
```

- [ ] **Step 6: Wire all four into CLI entry point**

Add to `cli/src/index.ts`:

```ts
import { runList } from "./commands/list.js";
import { runStatus } from "./commands/status.js";
import { runVerify } from "./commands/verify.js";
import { runUnlock } from "./commands/unlock.js";

program
  .command("list")
  .description("List all boards with progress")
  .action(() => {
    runList(process.cwd());
  });

program
  .command("status <board> <status>")
  .description("List items in a specific status (pending, in_progress, done, failed, verified)")
  .action((board: string, status: string) => {
    runStatus(process.cwd(), board, status);
  });

program
  .command("verify <board> <item-id>")
  .description("Mark a done item as verified")
  .action((board: string, itemId: string) => {
    runVerify(process.cwd(), board, itemId);
  });

program
  .command("unlock <board>")
  .description("Clear all lockfiles for a board")
  .action((board: string) => {
    runUnlock(process.cwd(), board);
  });
```

- [ ] **Step 7: Run tests to verify they pass**

```bash
npm test --workspace=cli -- --run list status verify unlock
```

- [ ] **Step 8: Commit**

```bash
git add cli/
git commit -m "feat: add ralf list, status, verify, and unlock commands with tests"
```

---

## Task 14: Server — HTTP, WebSocket, and File Watcher

**Files:**
- Create: `cli/src/server/http.ts`
- Create: `cli/src/server/ws.ts`
- Create: `cli/src/server/api.ts`
- Create: `cli/src/server/watcher.ts`
- Create: `cli/src/commands/serve.ts`
- Modify: `cli/src/index.ts`

- [ ] **Step 1: Implement the file watcher**

```ts
// cli/src/server/watcher.ts
import fs from "node:fs";
import path from "node:path";
import { ralfieDir } from "../lib/paths.js";

export type FileChangeCallback = (event: string, boardName: string | null, fileName: string) => void;

export function watchRalfieDir(cwd: string, onChange: FileChangeCallback): fs.FSWatcher[] {
  const watchers: fs.FSWatcher[] = [];
  const boardsPath = path.join(ralfieDir(cwd), "boards");

  if (!fs.existsSync(boardsPath)) return watchers;

  // Watch the boards directory for new boards
  const boardsWatcher = fs.watch(boardsPath, (eventType, filename) => {
    if (filename) onChange("boards", null, filename);
  });
  watchers.push(boardsWatcher);

  // Watch each board directory
  const boards = fs.readdirSync(boardsPath, { withFileTypes: true }).filter((d) => d.isDirectory());
  for (const board of boards) {
    const boardPath = path.join(boardsPath, board.name);
    const watcher = fs.watch(boardPath, (eventType, filename) => {
      if (filename) onChange(eventType, board.name, filename);
    });
    watchers.push(watcher);

    // Watch locks dir
    const locksPath = path.join(boardPath, "locks");
    if (fs.existsSync(locksPath)) {
      const lockWatcher = fs.watch(locksPath, (eventType, filename) => {
        if (filename) onChange("lock", board.name, filename);
      });
      watchers.push(lockWatcher);
    }
  }

  return watchers;
}
```

- [ ] **Step 2: Implement the WebSocket server**

```ts
// cli/src/server/ws.ts
import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "node:http";
import type { WsEvent, WsEventType } from "@ralfie/shared";

let wss: WebSocketServer;

export function createWsServer(server: Server): WebSocketServer {
  wss = new WebSocketServer({ server });
  return wss;
}

export function broadcast(type: WsEventType, board: string, data: unknown): void {
  if (!wss) return;

  const event: WsEvent = {
    type,
    board,
    data,
    timestamp: new Date().toISOString(),
  };

  const msg = JSON.stringify(event);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  }
}
```

- [ ] **Step 3: Implement the REST API**

```ts
// cli/src/server/api.ts
import type { IncomingMessage, ServerResponse } from "node:http";
import { listBoards, getBoard, boardExists } from "../lib/board.js";
import { readConfig, writeConfig } from "../lib/config.js";
import { verifyItem } from "../lib/prd.js";
import { prdPath } from "../lib/paths.js";
import { runRun } from "../commands/run.js";
import type { RalfieConfig } from "@ralfie/shared";

export function handleApi(cwd: string, req: IncomingMessage, res: ServerResponse): boolean {
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
  const parts = url.pathname.split("/").filter(Boolean); // ["api", ...]

  if (parts[0] !== "api") return false;

  res.setHeader("Content-Type", "application/json");

  // GET /api/boards
  if (req.method === "GET" && parts[1] === "boards" && !parts[2]) {
    const boards = listBoards(cwd);
    const detailed = boards.map((meta) => {
      const board = getBoard(cwd, meta.name);
      return { ...meta, prd: board.prd, progress: board.progress };
    });
    res.end(JSON.stringify(detailed));
    return true;
  }

  // GET /api/boards/:name
  if (req.method === "GET" && parts[1] === "boards" && parts[2] && !parts[3]) {
    if (!boardExists(cwd, parts[2])) {
      res.statusCode = 404;
      res.end(JSON.stringify({ error: "Board not found" }));
      return true;
    }
    const board = getBoard(cwd, parts[2]);
    res.end(JSON.stringify(board));
    return true;
  }

  // POST /api/boards/:name/verify/:itemId
  if (req.method === "POST" && parts[1] === "boards" && parts[3] === "verify" && parts[4]) {
    try {
      verifyItem(prdPath(cwd, parts[2]), parts[4]);
      res.end(JSON.stringify({ ok: true }));
    } catch (err: unknown) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: (err as Error).message }));
    }
    return true;
  }

  // POST /api/boards/:name/run
  if (req.method === "POST" && parts[1] === "boards" && parts[3] === "run") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const { iterations } = JSON.parse(body || "{}");
        res.end(JSON.stringify({ ok: true, message: "Run started" }));
        // Fire and forget — the run happens in the background
        runRun(cwd, parts[2], iterations).catch(console.error);
      } catch {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: "Invalid JSON body" }));
      }
    });
    return true;
  }

  // GET /api/config
  if (req.method === "GET" && parts[1] === "config") {
    res.end(JSON.stringify(readConfig(cwd)));
    return true;
  }

  // PUT /api/config
  if (req.method === "PUT" && parts[1] === "config") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const config = JSON.parse(body) as RalfieConfig;
        writeConfig(cwd, config);
        res.end(JSON.stringify({ ok: true }));
      } catch {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: "Invalid JSON body" }));
      }
    });
    return true;
  }

  res.statusCode = 404;
  res.end(JSON.stringify({ error: "Not found" }));
  return true;
}
```

- [ ] **Step 4: Implement the HTTP server**

```ts
// cli/src/server/http.ts
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { handleApi } from "./api.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

export function createHttpServer(cwd: string): http.Server {
  // UI build is copied into cli/dist/ui/ during build (see Task 19).
  // This path works both in dev (monorepo) and when installed via npm.
  const uiDistDir = path.resolve(__dirname, "..", "ui");

  return http.createServer((req, res) => {
    // API routes first
    if (handleApi(cwd, req, res)) return;

    // Static file serving for the React app
    const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
    let filePath = path.join(uiDistDir, url.pathname === "/" ? "index.html" : url.pathname);

    // SPA fallback — serve index.html for non-file routes
    if (!fs.existsSync(filePath)) {
      filePath = path.join(uiDistDir, "index.html");
    }

    if (!fs.existsSync(filePath)) {
      res.statusCode = 404;
      res.end("UI not built. Run `npm run build --workspace=ui` first.");
      return;
    }

    const ext = path.extname(filePath);
    res.setHeader("Content-Type", MIME_TYPES[ext] || "application/octet-stream");
    fs.createReadStream(filePath).pipe(res);
  });
}
```

- [ ] **Step 5: Implement the serve command**

```ts
// cli/src/commands/serve.ts
import fs from "node:fs";
import path from "node:path";
import { createHttpServer } from "../server/http.js";
import { createWsServer, broadcast } from "../server/ws.js";
import { watchRalfieDir } from "../server/watcher.js";
import { readConfig } from "../lib/config.js";
import type { WsEventType } from "@ralfie/shared";

export function runServe(cwd: string): void {
  const config = readConfig(cwd);
  const port = config.serve_port;

  const server = createHttpServer(cwd);
  createWsServer(server);

  // Map file changes to WebSocket events
  watchRalfieDir(cwd, (event, boardName, fileName) => {
    if (!boardName) return;

    let wsType: WsEventType;
    if (fileName === "prd.json") wsType = "prd:updated";
    else if (fileName === "progress.md") wsType = "progress:updated";
    else if (event === "lock" && fileName.endsWith(".lock")) {
      // fs.watch gives "rename" for both create and delete — check if the file still exists
      const { locksDir } = await import("../lib/paths.js");
      const lockFile = path.join(locksDir(cwd, boardName), fileName);
      wsType = fs.existsSync(lockFile) ? "lock:acquired" : "lock:released";
    }
    else wsType = "board:updated";

    broadcast(wsType, boardName, { fileName });
  });

  server.listen(port, () => {
    console.log(`Ralfie UI running at http://localhost:${port}`);
    console.log(`WebSocket available at ws://localhost:${port}`);
    console.log("Press Ctrl+C to stop.\n");
  });
}
```

- [ ] **Step 6: Wire into CLI entry point**

Add to `cli/src/index.ts`:

```ts
import { runServe } from "./commands/serve.js";

program
  .command("serve")
  .description("Start the Ralfie UI server")
  .action(() => {
    runServe(process.cwd());
  });
```

- [ ] **Step 7: Commit**

```bash
git add cli/src/server/ cli/src/commands/serve.ts cli/src/index.ts
git commit -m "feat: add ralf serve with HTTP server, WebSocket broadcasts, and file watcher"
```

---

## Task 15: UI — React App Shell

**Files:**
- Create: `ui/src/main.tsx`, `ui/src/App.tsx`, `ui/index.html`
- Create: `ui/src/index.css`
- Create: `ui/src/lib/types.ts`, `ui/src/lib/api.ts`, `ui/src/lib/ws.ts`
- Create: `ui/src/components/Layout.tsx`

- [ ] **Step 1: Create index.html**

```html
<!-- ui/index.html -->
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Ralfie</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Create entry point and CSS**

```css
/* ui/src/index.css */
@import "tailwindcss";

:root {
  --bg: #0a0a0b;
  --bg-card: #141416;
  --bg-card-hover: #1c1c1f;
  --border: #27272a;
  --text: #fafafa;
  --text-muted: #71717a;
  --accent: #6366f1;
  --accent-hover: #818cf8;
  --success: #22c55e;
  --warning: #eab308;
  --danger: #ef4444;
}

body {
  background: var(--bg);
  color: var(--text);
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace;
}
```

```tsx
// ui/src/main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
```

- [ ] **Step 3: Create API client**

```ts
// ui/src/lib/api.ts
const BASE = "";

export async function fetchBoards() {
  const res = await fetch(`${BASE}/api/boards`);
  return res.json();
}

export async function fetchBoard(name: string) {
  const res = await fetch(`${BASE}/api/boards/${name}`);
  return res.json();
}

export async function verifyItem(board: string, itemId: string) {
  const res = await fetch(`${BASE}/api/boards/${board}/verify/${itemId}`, { method: "POST" });
  return res.json();
}

export async function triggerRun(board: string, iterations: number) {
  const res = await fetch(`${BASE}/api/boards/${board}/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ iterations }),
  });
  return res.json();
}

export async function fetchConfig() {
  const res = await fetch(`${BASE}/api/config`);
  return res.json();
}

export async function updateConfig(config: Record<string, unknown>) {
  const res = await fetch(`${BASE}/api/config`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  return res.json();
}
```

- [ ] **Step 4: Create WebSocket hook**

```ts
// ui/src/lib/ws.ts
import { useEffect, useRef, useState } from "react";

interface WsEvent {
  type: string;
  board: string;
  data: unknown;
  timestamp: string;
}

export function useWs(onEvent: (event: WsEvent) => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const onEventRef = useRef(onEvent);
  const [connected, setConnected] = useState(false);

  // Keep ref in sync without triggering reconnections
  onEventRef.current = onEvent;

  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout>;

    function connect() {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const ws = new WebSocket(`${protocol}//${window.location.host}`);

      ws.onopen = () => setConnected(true);
      ws.onclose = () => {
        setConnected(false);
        reconnectTimer = setTimeout(connect, 2000);
      };
      ws.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data) as WsEvent;
          onEventRef.current(event);
        } catch {
          // ignore malformed messages
        }
      };

      wsRef.current = ws;
    }

    connect();
    return () => {
      clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, []);

  return { connected };
}
```

- [ ] **Step 5: Create Layout component**

```tsx
// ui/src/components/Layout.tsx
import { Link, useLocation } from "react-router-dom";

const NAV_ITEMS = [
  { path: "/", label: "Dashboard", icon: "◉" },
  { path: "/boards", label: "Boards", icon: "▦" },
  { path: "/settings", label: "Settings", icon: "⚙" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  return (
    <div className="flex h-screen">
      <nav className="w-56 border-r border-[var(--border)] p-4 flex flex-col gap-1">
        <div className="text-lg font-bold mb-6 px-3">ralfie</div>
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`px-3 py-2 rounded text-sm flex items-center gap-2 transition-colors ${
              location.pathname === item.path
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-card-hover)]"
            }`}
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
```

- [ ] **Step 6: Create App with routing**

```tsx
// ui/src/App.tsx
import { Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { DashboardPage } from "./pages/DashboardPage";
import { BoardListPage } from "./pages/BoardListPage";
import { BoardDetailPage } from "./pages/BoardDetailPage";
import { SettingsPage } from "./pages/SettingsPage";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/boards" element={<BoardListPage />} />
        <Route path="/boards/:name" element={<BoardDetailPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </Layout>
  );
}
```

- [ ] **Step 7: Create placeholder pages** (just enough to compile)

Create minimal placeholder exports for `DashboardPage`, `BoardListPage`, `BoardDetailPage`, and `SettingsPage` — each returning a `<div>` with the page name. These will be fully implemented in subsequent tasks.

- [ ] **Step 8: Verify build**

```bash
npm run build --workspace=ui
```

Expected: Successful build, output in `ui/dist/`.

- [ ] **Step 9: Commit**

```bash
git add ui/
git commit -m "feat: add React UI shell with routing, WebSocket hook, API client, and layout"
```

---

## Task 16: UI — Dashboard Page

**Files:**
- Create: `ui/src/pages/DashboardPage.tsx`
- Create: `ui/src/components/StatsCards.tsx`
- Create: `ui/src/components/ItemsPerDayChart.tsx`

- [ ] **Step 1: Implement StatsCards**

```tsx
// ui/src/components/StatsCards.tsx
interface StatsCardsProps {
  total: number;
  done: number;
  failed: number;
  inProgress: number;
  verified: number;
}

export function StatsCards({ total, done, failed, inProgress, verified }: StatsCardsProps) {
  const cards = [
    { label: "Total Items", value: total, color: "var(--text)" },
    { label: "Completed", value: done + verified, color: "var(--success)" },
    { label: "In Progress", value: inProgress, color: "var(--accent)" },
    { label: "Failed", value: failed, color: "var(--danger)" },
    { label: "Verified", value: verified, color: "var(--success)" },
  ];

  return (
    <div className="grid grid-cols-5 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4">
          <div className="text-xs text-[var(--text-muted)] mb-1">{card.label}</div>
          <div className="text-2xl font-bold" style={{ color: card.color }}>
            {card.value}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Implement ItemsPerDayChart**

```tsx
// ui/src/components/ItemsPerDayChart.tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface ItemsPerDayChartProps {
  data: { date: string; count: number }[];
}

export function ItemsPerDayChart({ data }: ItemsPerDayChartProps) {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4">
      <h3 className="text-sm text-[var(--text-muted)] mb-4">Items Completed (Last 7 Days)</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 11 }} />
          <YAxis tick={{ fill: "#71717a", fontSize: 11 }} allowDecimals={false} />
          <Tooltip
            contentStyle={{ background: "#141416", border: "1px solid #27272a", borderRadius: 8, fontSize: 12 }}
          />
          <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 3: Implement DashboardPage**

The dashboard fetches all boards, aggregates stats across all PRD items, and computes items-per-day from PRD item comments (which have timestamps). It uses the WebSocket hook to refetch on changes.

```tsx
// ui/src/pages/DashboardPage.tsx
import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { fetchBoards } from "../lib/api";
import { useWs } from "../lib/ws";
import { StatsCards } from "../components/StatsCards";
import { ItemsPerDayChart } from "../components/ItemsPerDayChart";

export function DashboardPage() {
  const [boards, setBoards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const data = await fetchBoards();
    setBoards(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useWs(useCallback(() => { load(); }, [load]));

  if (loading) return <div className="text-[var(--text-muted)]">Loading...</div>;

  const allItems = boards.flatMap((b: any) => b.prd.items);
  const total = allItems.length;
  const done = allItems.filter((i: any) => i.status === "done").length;
  const failed = allItems.filter((i: any) => i.status === "failed").length;
  const inProgress = allItems.filter((i: any) => i.status === "in_progress").length;
  const verified = allItems.filter((i: any) => i.status === "verified").length;
  const pct = total > 0 ? Math.round(((done + verified) / total) * 100) : 0;

  // Items per day (last 7 days) — derived from comments timestamps on done/verified items
  const now = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });
  // Count items whose most recent status-change comment falls on each day
  // For simplicity, count items with any comment on that day
  const itemsPerDay = days.map((date) => ({
    date: date.slice(5), // MM-DD
    count: allItems.filter((item: any) =>
      item.comments?.some((c: any) => c.timestamp?.startsWith(date))
    ).length,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Dashboard</h1>
        <p className="text-sm text-[var(--text-muted)]">Overall progress: {pct}%</p>
      </div>
      <StatsCards total={total} done={done} failed={failed} inProgress={inProgress} verified={verified} />
      <ItemsPerDayChart data={itemsPerDay} />
      <div>
        <h2 className="text-sm font-semibold text-[var(--text-muted)] mb-3">Boards</h2>
        <div className="space-y-2">
          {boards.map((b: any) => {
            const bt = b.prd.items.length;
            const bd = b.prd.items.filter((i: any) => i.status === "done" || i.status === "verified").length;
            const bp = bt > 0 ? Math.round((bd / bt) * 100) : 0;
            return (
              <Link
                key={b.name}
                to={`/boards/${b.name}`}
                className="block bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4 hover:bg-[var(--bg-card-hover)] transition-colors"
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium">{b.name}</span>
                  <span className="text-sm text-[var(--text-muted)]">{bd}/{bt} done ({bp}%)</span>
                </div>
                <div className="mt-2 h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
                  <div className="h-full bg-[var(--accent)] rounded-full" style={{ width: `${bp}%` }} />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify build**

```bash
npm run build --workspace=ui
```

- [ ] **Step 5: Commit**

```bash
git add ui/src/pages/DashboardPage.tsx ui/src/components/StatsCards.tsx ui/src/components/ItemsPerDayChart.tsx
git commit -m "feat: add dashboard page with stats cards, items-per-day chart, and board overview"
```

---

## Task 17: UI — Board List & Board Detail Pages

**Files:**
- Modify: `ui/src/pages/BoardListPage.tsx`
- Modify: `ui/src/pages/BoardDetailPage.tsx`
- Create: `ui/src/components/PrdKanban.tsx`
- Create: `ui/src/components/ProgressTimeline.tsx`
- Create: `ui/src/components/PlanViewer.tsx`
- Create: `ui/src/components/RunDialog.tsx`

- [ ] **Step 1: Implement BoardListPage**

```tsx
// ui/src/pages/BoardListPage.tsx
import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { fetchBoards } from "../lib/api";
import { useWs } from "../lib/ws";

export function BoardListPage() {
  const [boards, setBoards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const data = await fetchBoards();
    setBoards(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useWs(useCallback(() => { load(); }, [load]));

  if (loading) return <div className="text-[var(--text-muted)]">Loading...</div>;
  if (boards.length === 0) return <div className="text-[var(--text-muted)]">No boards. Run <code>ralf plan</code> to create one.</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Boards</h1>
      {boards.map((b: any) => {
        const items = b.prd.items;
        const statusCounts = { pending: 0, in_progress: 0, done: 0, failed: 0, verified: 0 };
        items.forEach((i: any) => { statusCounts[i.status as keyof typeof statusCounts]++; });

        return (
          <Link
            key={b.name}
            to={`/boards/${b.name}`}
            className="block bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5 hover:bg-[var(--bg-card-hover)] transition-colors"
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="font-semibold text-lg">{b.name}</div>
                <div className="text-sm text-[var(--text-muted)]">{b.description}</div>
              </div>
              <div className="text-sm text-[var(--text-muted)]">{items.length} items</div>
            </div>
            <div className="flex gap-3 text-xs">
              {statusCounts.pending > 0 && <span className="text-[var(--text-muted)]">{statusCounts.pending} pending</span>}
              {statusCounts.in_progress > 0 && <span className="text-[var(--accent)]">{statusCounts.in_progress} active</span>}
              {statusCounts.done > 0 && <span className="text-[var(--success)]">{statusCounts.done} done</span>}
              {statusCounts.failed > 0 && <span className="text-[var(--danger)]">{statusCounts.failed} failed</span>}
              {statusCounts.verified > 0 && <span className="text-[var(--success)]">{statusCounts.verified} verified</span>}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Implement PrdKanban**

```tsx
// ui/src/components/PrdKanban.tsx
import type { ItemStatus } from "@ralfie/shared";

interface PrdItem {
  id: string;
  category: string;
  description: string;
  status: ItemStatus;
  assigned_to: string | null;
  comments: { timestamp: string; session_id: string; message: string }[];
}

interface PrdKanbanProps {
  items: PrdItem[];
  onVerify: (itemId: string) => void;
}

const COLUMNS: { status: ItemStatus; label: string; color: string }[] = [
  { status: "pending", label: "Pending", color: "var(--text-muted)" },
  { status: "in_progress", label: "In Progress", color: "var(--accent)" },
  { status: "done", label: "Done", color: "var(--success)" },
  { status: "failed", label: "Failed", color: "var(--danger)" },
  { status: "verified", label: "Verified", color: "var(--success)" },
];

export function PrdKanban({ items, onVerify }: PrdKanbanProps) {
  return (
    <div className="grid grid-cols-5 gap-3 min-h-[300px]">
      {COLUMNS.map((col) => {
        const colItems = items.filter((i) => i.status === col.status);
        return (
          <div key={col.status} className="space-y-2">
            <div className="text-xs font-semibold px-2 py-1 rounded" style={{ color: col.color }}>
              {col.label} ({colItems.length})
            </div>
            {colItems.map((item) => (
              <div
                key={item.id}
                className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-3 text-xs space-y-1"
              >
                <div className="flex justify-between items-start">
                  <span className="font-mono font-bold">{item.id}</span>
                  <span className="text-[var(--text-muted)]">{item.category}</span>
                </div>
                <div className="text-[var(--text-muted)]">{item.description}</div>
                {item.assigned_to && (
                  <div className="text-[var(--accent)] text-[10px]">Agent: {item.assigned_to}</div>
                )}
                {item.comments.length > 0 && (
                  <div className="text-[var(--warning)] text-[10px]">{item.comments.length} comment(s)</div>
                )}
                {item.status === "done" && (
                  <button
                    onClick={() => onVerify(item.id)}
                    className="mt-1 px-2 py-0.5 text-[10px] bg-[var(--success)] text-white rounded hover:opacity-80"
                  >
                    Verify
                  </button>
                )}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Implement PlanViewer and ProgressTimeline**

```tsx
// ui/src/components/PlanViewer.tsx
import ReactMarkdown from "react-markdown";

export function PlanViewer({ markdown }: { markdown: string }) {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6 prose prose-invert prose-sm max-w-none">
      <ReactMarkdown>{markdown}</ReactMarkdown>
    </div>
  );
}
```

```tsx
// ui/src/components/ProgressTimeline.tsx
import ReactMarkdown from "react-markdown";

export function ProgressTimeline({ markdown }: { markdown: string }) {
  if (!markdown.trim()) {
    return <div className="text-[var(--text-muted)] text-sm">No progress logged yet.</div>;
  }

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6 prose prose-invert prose-sm max-w-none">
      <ReactMarkdown>{markdown}</ReactMarkdown>
    </div>
  );
}
```

- [ ] **Step 4: Implement RunDialog**

```tsx
// ui/src/components/RunDialog.tsx
import { useState } from "react";
import { triggerRun } from "../lib/api";

interface RunDialogProps {
  boardName: string;
  open: boolean;
  onClose: () => void;
}

export function RunDialog({ boardName, open, onClose }: RunDialogProps) {
  const [iterations, setIterations] = useState(10);
  const [started, setStarted] = useState(false);

  if (!open) return null;

  const handleRun = async () => {
    await triggerRun(boardName, iterations);
    setStarted(true);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6 w-96" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold mb-4">Run "{boardName}"</h3>
        {started ? (
          <div className="space-y-3">
            <p className="text-sm text-[var(--success)]">Run started! Watch progress in the board detail view.</p>
            <button onClick={onClose} className="w-full py-2 bg-[var(--border)] rounded text-sm hover:bg-[var(--bg-card-hover)]">
              Close
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-xs text-[var(--text-muted)] block mb-1">Max Iterations</label>
              <input
                type="number"
                min={1}
                max={100}
                value={iterations}
                onChange={(e) => setIterations(parseInt(e.target.value, 10))}
                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 py-2 bg-[var(--border)] rounded text-sm hover:bg-[var(--bg-card-hover)]">
                Cancel
              </button>
              <button onClick={handleRun} className="flex-1 py-2 bg-[var(--accent)] rounded text-sm text-white hover:bg-[var(--accent-hover)]">
                Start Run
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Implement BoardDetailPage**

```tsx
// ui/src/pages/BoardDetailPage.tsx
import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { fetchBoard, verifyItem as apiVerify } from "../lib/api";
import { useWs } from "../lib/ws";
import { PrdKanban } from "../components/PrdKanban";
import { PlanViewer } from "../components/PlanViewer";
import { ProgressTimeline } from "../components/ProgressTimeline";
import { RunDialog } from "../components/RunDialog";

type Tab = "kanban" | "plan" | "progress";

export function BoardDetailPage() {
  const { name } = useParams<{ name: string }>();
  const [board, setBoard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("kanban");
  const [runOpen, setRunOpen] = useState(false);

  const load = useCallback(async () => {
    if (!name) return;
    const data = await fetchBoard(name);
    setBoard(data);
    setLoading(false);
  }, [name]);

  useEffect(() => { load(); }, [load]);
  useWs(useCallback((event) => {
    if (event.board === name) load();
  }, [name, load]));

  if (loading || !board) return <div className="text-[var(--text-muted)]">Loading...</div>;

  const handleVerify = async (itemId: string) => {
    await apiVerify(name!, itemId);
    load();
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "kanban", label: "PRD Items" },
    { key: "plan", label: "Plan" },
    { key: "progress", label: "Progress" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">{name}</h1>
        <button
          onClick={() => setRunOpen(true)}
          className="px-4 py-2 bg-[var(--accent)] text-white rounded text-sm hover:bg-[var(--accent-hover)]"
        >
          Run
        </button>
      </div>

      <div className="flex gap-1 border-b border-[var(--border)]">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm transition-colors ${
              tab === t.key
                ? "border-b-2 border-[var(--accent)] text-[var(--text)]"
                : "text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "kanban" && <PrdKanban items={board.prd.items} onVerify={handleVerify} />}
      {tab === "plan" && <PlanViewer markdown={board.plan} />}
      {tab === "progress" && <ProgressTimeline markdown={board.progress} />}

      <RunDialog boardName={name!} open={runOpen} onClose={() => setRunOpen(false)} />
    </div>
  );
}
```

- [ ] **Step 6: Verify build**

```bash
npm run build --workspace=ui
```

- [ ] **Step 7: Commit**

```bash
git add ui/
git commit -m "feat: add board list, board detail with kanban/plan/progress tabs, and run dialog"
```

---

## Task 18: UI — Settings Page

**Files:**
- Modify: `ui/src/pages/SettingsPage.tsx`

- [ ] **Step 1: Implement SettingsPage**

```tsx
// ui/src/pages/SettingsPage.tsx
import { useState, useEffect } from "react";
import { fetchConfig, updateConfig } from "../lib/api";

export function SettingsPage() {
  const [config, setConfig] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchConfig().then(setConfig);
  }, []);

  if (!config) return <div className="text-[var(--text-muted)]">Loading...</div>;

  const handleSave = async () => {
    setSaving(true);
    await updateConfig(config);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-xl font-bold">Settings</h1>

      <div className="space-y-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6">
        <div>
          <label className="text-xs text-[var(--text-muted)] block mb-1">Agent Command</label>
          <input
            value={config.agent_command}
            onChange={(e) => setConfig({ ...config, agent_command: e.target.value })}
            className="w-full bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="text-xs text-[var(--text-muted)] block mb-1">Default Iterations</label>
          <input
            type="number"
            min={1}
            value={config.default_iterations}
            onChange={(e) => setConfig({ ...config, default_iterations: parseInt(e.target.value, 10) })}
            className="w-full bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="text-xs text-[var(--text-muted)] block mb-1">Serve Port</label>
          <input
            type="number"
            value={config.serve_port}
            onChange={(e) => setConfig({ ...config, serve_port: parseInt(e.target.value, 10) })}
            className="w-full bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="text-xs text-[var(--text-muted)] block mb-1">Feedback Loops (one per line)</label>
          <textarea
            value={(config.feedback_loops || []).join("\n")}
            onChange={(e) => setConfig({ ...config, feedback_loops: e.target.value.split("\n").filter(Boolean) })}
            rows={4}
            className="w-full bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-2 text-sm font-mono"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-[var(--accent)] text-white rounded text-sm hover:bg-[var(--accent-hover)] disabled:opacity-50"
        >
          {saving ? "Saving..." : saved ? "Saved!" : "Save"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build --workspace=ui
```

- [ ] **Step 3: Commit**

```bash
git add ui/src/pages/SettingsPage.tsx
git commit -m "feat: add settings page for config editing"
```

---

## Task 19: Build Pipeline & npm Packaging

**Files:**
- Modify: `cli/package.json` (add postbuild script to copy skills + UI dist)
- Modify: `package.json` (add prepublish scripts)

- [ ] **Step 1: Add build scripts to copy skills, UI dist, and prepend shebang**

TypeScript doesn't copy non-TS files or preserve shebangs. The build step must:
1. Copy skill `.md` files to `dist/skills/`
2. Copy the UI build output to `dist/ui/`
3. Prepend `#!/usr/bin/env node` to `dist/index.js`

Add to `cli/package.json` scripts:

```json
{
  "scripts": {
    "build": "tsc && npm run postbuild",
    "postbuild": "npm run copy-skills && npm run copy-ui && npm run add-shebang",
    "copy-skills": "mkdir -p dist/skills && cp src/skills/*.md dist/skills/",
    "copy-ui": "mkdir -p dist/ui && cp -r ../ui/dist/* dist/ui/ 2>/dev/null || echo 'UI not built yet, skipping copy'",
    "add-shebang": "echo '#!/usr/bin/env node' | cat - dist/index.js > dist/index.tmp && mv dist/index.tmp dist/index.js && chmod +x dist/index.js",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  }
}
```

- [ ] **Step 2: Update root package.json build order**

The UI must build before the CLI so that the CLI can copy the UI dist. Update root `package.json`:

```json
{
  "scripts": {
    "build": "npm run build --workspace=shared && npm run build --workspace=ui && npm run build --workspace=cli",
    "test": "npm run build --workspace=shared && npm test --workspace=cli",
    "typecheck": "npm run typecheck --workspaces"
  }
}
```

> **Note:** `test` script builds shared first because CLI tests import from `@ralfie/shared`.

- [ ] **Step 3: Verify full build**

```bash
npm run build
```

Expected: `shared/dist/`, `ui/dist/`, `cli/dist/` all populated. `cli/dist/skills/` contains the 3 skill markdown files. `cli/dist/ui/` contains the React build. `cli/dist/index.js` starts with `#!/usr/bin/env node`.

- [ ] **Step 4: Test the CLI locally**

```bash
node cli/dist/index.js --help
node cli/dist/index.js init
ls -la .ralfie/
```

Expected: Help output shows all commands. Init creates `.ralfie/` with `config.json` and `boards/`.

- [ ] **Step 5: Commit**

```bash
git add package.json cli/package.json
git commit -m "chore: add build pipeline with skill copying and correct workspace build order"
```

---

## Task 20: End-to-End Smoke Test

**Files:** No new files — this is a manual verification task.

- [ ] **Step 1: Clean slate**

```bash
rm -rf .ralfie/ .claude/skills/ralfie-*
npm run build
```

- [ ] **Step 2: Test init**

```bash
node cli/dist/index.js init
```

Verify:
- `.ralfie/config.json` exists with defaults
- `.ralfie/boards/` directory exists
- `.claude/skills/ralfie-plan.md`, `ralfie-edit.md`, `ralfie-run.md` exist

- [ ] **Step 3: Test list (empty)**

```bash
node cli/dist/index.js list
```

Expected: "No boards found."

- [ ] **Step 4: Test serve**

```bash
node cli/dist/index.js serve &
curl http://localhost:3333
kill %1
```

Expected: HTML response from the React app.

- [ ] **Step 5: Run all tests**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 6: Commit any fixes**

If any issues were found, fix and commit:

```bash
git add -A
git commit -m "fix: address issues found during smoke testing"
```

---

## Task 21: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update CLAUDE.md with project details**

Now that the project exists, update `CLAUDE.md` with actual build commands, architecture, and conventions.

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with project architecture and build commands"
```

---

## Known Issues & Future Improvements

Items identified during plan review that are acceptable for MVP but should be addressed later:

1. **`fs.watch` limitations:** Does not watch recursively by default and won't detect new board directories created after the server starts. Consider adding a mechanism to start watching new boards when they appear, or switch to `fs.watch` with `recursive: true` (supported on macOS/Windows).

2. **No graceful shutdown for `ralf serve`:** The server has no SIGINT/SIGTERM handler. File watchers are created but never cleaned up on shutdown. Add signal handlers in a follow-up.

3. **No test for `ralf run` command:** The run command is the most complex piece but has no unit test. It's covered by the smoke test (Task 20) but should get proper tests with a mocked agent spawner.

4. **Items-per-day chart is approximate:** The dashboard counts items with "any comment on that day" rather than items that transitioned to `done` on that day. A more accurate approach would track status transition timestamps.

5. **No PRD schema validation:** `readPrd` does raw `JSON.parse` with no validation. If a skill writes malformed JSON, errors will be unhelpful. Consider adding runtime validation (e.g., with zod) later.

6. **`PrdTable.tsx` not implemented:** The file structure lists a table view alternative to kanban, but no task implements it. Add as a future enhancement.

7. **Circular dependency risk:** The API server imports `runRun` from commands, creating a dependency from server → commands. Consider extracting the run logic into a lib function that both the command and API import.
