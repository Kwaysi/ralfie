# ralf-review-loop

## Goal

Add orchestrator-level code review to `ralf run` by splitting the current ralf-run skill into three discrete phases (implement, review, finalize), each running as a separate Claude process. The orchestrator (`run.ts`) manages the review loop between implementor and reviewer, resuming the implementor's conversation to apply fixes or finalize. Max 3 review rounds per item.

## Architecture

```
run.ts (orchestrator loop, per PRD item)
│
├─ spawnPrintMode("ralf-run", --output-format json) → implementor
│   returns: { exitCode, stdout, sessionId, result }
│
├─ spawnPrintMode("ralf-review", --output-format json) → reviewer
│   input: git diff + PRD item context
│   returns: { exitCode, stdout, sessionId, result, lgtm }
│
├─ if not LGTM: spawnResume(sessionId, findings, --output-format json) → implementor fixes
│   loop back to reviewer (max 3 rounds)
│
├─ spawnResume(sessionId, "finalize", --output-format json) → implementor
│   runs ralf-finalize: progress, PRD, commit, completion check
│
└─ next iteration
```

## Key Discovery: Claude CLI JSON Output

Verified that `claude -p <prompt> --output-format json` returns structured JSON including `session_id`:

```json
{
  "type": "result",
  "session_id": "adb6ad10-b603-412c-9c53-fd41260be4fc",
  "result": "...agent text output...",
  "stop_reason": "end_turn",
  ...
}
```

And `claude --resume <session_id> -p <prompt> --output-format json` resumes the conversation with full context preserved, returning the same `session_id`.

**Implementation approach for agent.ts:**
- Add `--output-format json` to spawn args
- Parse the JSON response to extract `session_id` and `result`
- Stream raw stdout chunks to the console for real-time output, then parse the full JSON at the end
- `spawnResume(sessionId, prompt)` uses `--resume <session_id> -p <prompt> --output-format json`

## Tech Stack

Same as existing — Node.js, Commander, `child_process.spawn`, Claude Code CLI with `--resume` and `--output-format json` flags.

## Milestones

### 1. Capture session ID from implementor output (AGENT-1)

- **User story:** As the orchestrator, I can capture the session ID from a Claude print-mode session so I can resume it later.
- **End state:** `spawnPrintMode()` adds `--output-format json` to args, parses the JSON response, and returns `sessionId` alongside `exitCode`, `stdout`, and `complete`. A new `spawnResume(sessionId, prompt)` function exists that uses `--resume <id> -p <prompt> --output-format json`.
- **Key files:** `cli/src/lib/agent.ts`

### 2. Split ralf-run into ralf-run + ralf-finalize (SKILL-1)

- **User story:** As a run agent, I implement and verify but don't commit, so the orchestrator can insert a review step before finalization.
- **End state:** ralf-run covers Steps 1-4 only (pick, claim, implement, feedback loops). ralf-finalize covers Steps 6-9 (update progress, update PRD, commit, check completion). Both installed by `ralf init`.
- **Key files:** `.claude/skills/ralf-run/SKILL.md`, `.claude/skills/ralf-finalize/SKILL.md`, `cli/src/skills/`

### 3. Create ralf-review skill (SKILL-2)

- **User story:** As a reviewer agent, I receive a git diff and PRD item context and output structured findings or LGTM.
- **End state:** ralf-review skill exists. Outputs `<ralfie>LGTM</ralfie>` when clean, or structured findings otherwise. Installed by `ralf init`.
- **Key files:** `.claude/skills/ralf-review/SKILL.md`, `cli/src/skills/`

### 4. Wire review loop into run.ts (ORCH-1)

- **User story:** As a user running `ralf run`, each PRD item is automatically reviewed by an independent agent before being committed, with up to 3 fix rounds.
- **End state:** `run.ts` orchestrates implement → review → fix → finalize per item. Review findings sent back via `--resume`. Max rounds enforced by orchestrator.
- **Key files:** `cli/src/commands/run.ts`

### 5. Config knobs (CFG-1)

- **User story:** As a user, I can configure the max review rounds and disable review if needed.
- **End state:** `review_rounds: number` (default 3) and `review_enabled: boolean` (default true) in config.
- **Key files:** `shared/src/types.ts`, `cli/src/lib/config.ts`

## Risks

- **JSON output streaming** — `--output-format json` may buffer the entire response (no streaming). If so, the user won't see real-time output during long agent runs. Mitigation: test this; if buffered, stream raw chunks for display and parse JSON only from the final output.
- **Session ID stability** — session IDs must persist across resumes. Verified this works in spike.
- **Review output parsing** — LLM output isn't guaranteed structured. Mitigation: check for `<ralfie>LGTM</ralfie>` tag; treat anything else as "has findings" and pass it through verbatim.

## Out of Scope

- Parallel review of multiple items
- UI changes for the review loop
- Custom review criteria in config
