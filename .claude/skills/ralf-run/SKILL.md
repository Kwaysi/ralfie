---
name: ralf-run
description: Execute a ralfie board iteration — pick a task, implement it, run feedback loops, update progress, and commit
---

# ralfie-run

## When to Use

This skill MUST be used whenever implementing items from a ralfie board. If a board exists in `.ralfie/boards/` and the task involves implementing, running, or executing PRD items from that board, invoke this skill. This includes when:
- The user says "run the board", "implement the board", or "spin up an agent to implement"
- A sub-agent is dispatched to implement ralfie board items
- Any PRD items need to be picked up, implemented, and tracked

Do NOT implement ralfie board items without following this workflow — it ensures proper task claiming, feedback loops, code review, progress tracking, and commit conventions.

## Workflow

You are an autonomous coding agent executing work from a ralfie board. Follow this workflow exactly.

## Step 1: Pick Task

Read `prd.json` and select the next item to work on:

1. Skip items with status `in_progress`, `done`, `verified`, or `failed`
2. Prioritize in this order:
   1. Architectural decisions and core abstractions
   2. Integration points between modules
   3. Unknown unknowns and spike work
   4. Standard features and implementation
   5. Polish, cleanup, and quick wins
3. Within the same priority tier, prefer dependency order — items that unblock others come first
4. Within the same tier and dependency level, finish related items together (category grouping)
5. When in doubt, pick the item with the lowest ID within the highest-priority tier

Fail fast on risky work. Save easy wins for later.

## Step 2: Claim Item

Claim the selected item **before starting any implementation work**:

1. Set `status` to `in_progress`
2. Set `assigned_to` to your session ID
3. Set `started_at` to the current ISO timestamp (e.g., `new Date().toISOString()`)

The `claimItem` function in `prd.ts` handles all three automatically. You MUST call this before writing any code — it timestamps when work began and prevents other agents from picking the same item.

## Step 3: Implement

Implement the item according to its description and `steps_to_verify`:

- Read existing code before making changes
- Follow the patterns established in the codebase
- Write tests alongside implementation (not after)
- Keep changes minimal and focused on the single item

## Step 4: Run Feedback Loops

Run all configured feedback loops to verify your work:

1. TypeScript typecheck (`npm run typecheck`)
2. Tests (`npm run test`)
3. Lint (`npm run lint`)
4. Any custom feedback loops from config

If any feedback loop fails:
- Fix the issue immediately
- Re-run ALL feedback loops (not just the failing one)
- Do not proceed until all loops pass

## Step 5: Code Review

After all feedback loops pass, dispatch a **code-reviewer** agent (subagent_type: `superpowers:code-reviewer`) to perform a thorough review of all changes made during implementation. The review is scoped strictly to files changed for the current PRD item.

### Review Criteria

The reviewer MUST evaluate against all three pillars:

**1. Security**
- No command injection, XSS, SQL injection, or other OWASP Top 10 vulnerabilities
- Secrets are not hardcoded; user input is validated at system boundaries
- Auth/authz checks are present where required

**2. Code Quality**
- **DRY** — no duplicated logic; if near-identical functions exist, the reviewer flags them for consolidation rather than accepting parallel variants
- **Cyclomatic complexity** — no function exceeds a complexity of 10; deeply nested branches must be refactored
- **File size** — files should not exceed ~300 lines; files with more than 8 exported members should be split
- **One component per file** — each React component MUST live in its own file. No file should export multiple components. Nested or child components go in a subfolder under the general components directory (e.g., `components/TransactionList/TransactionItem.tsx`)
- **Collocation** — utility functions belong next to the code that uses them, not in a distant `utils/` grab bag
- **Expand, don't duplicate** — when an existing function can be extended to cover a new case, the reviewer rejects a second near-identical function and requires the original to be expanded

**3. Completeness**
- Walk through every design branch in the PRD item's description and `steps_to_verify`
- Confirm the implementation covers all branches, edge cases, and error paths described
- Flag any unhandled branches or missing behavior

### Review Loop

1. Dispatch the reviewer agent with the list of changed files and the PRD item context (ID, description, steps_to_verify)
2. The reviewer returns findings as a structured list: `{ file, line, severity (critical|warning|nit), pillar (security|quality|completeness), finding, suggestion }`
3. If there are **critical** or **warning** findings:
   - Fix all critical and warning findings immediately
   - Re-run ALL feedback loops (Step 4) to ensure fixes don't break anything
   - Re-dispatch the reviewer agent for a focused re-review of only the fixed files
4. Repeat until the reviewer returns **zero critical or warning findings**
5. Nits are logged in the progress entry but do not block completion

The review loop MUST converge — limit to **3 rounds maximum**. If critical/warning findings persist after 3 rounds, log the remaining findings in progress.md and proceed (do not get stuck).

## Step 6: Update Progress

Append to `progress.md` using this exact format:

```markdown
## ITEM-ID — Short Description

**Key decisions:**
- Decision or rationale

**Files changed:**
- `path/to/file` — what changed

**Notes:**
- Any notes for future iterations

---
```

Each progress entry MUST:
1. Start with a `## ITEM-ID — Description` heading (using the item's ID from `prd.json`)
2. Include key decisions, files changed, and notes sections
3. End with a `---` horizontal rule separator

This structure allows the UI to parse entries into individual collapsible cards.

## Step 7: Update PRD

Mark the item as `done` in `prd.json`:
- Set `status` to `done`
- Set `passes` to `true`

The `completeItem` function in `prd.ts` automatically sets `completed_at` to the current ISO timestamp when marking done.

## Step 8: Commit

Create a git commit using **conventional commit format**:

```
type(board-name): short description

ITEM-ID
```

- **type** — choose based on the nature of the change:
  - `feat` — new feature or capability
  - `fix` — bug fix
  - `test` — adding or updating tests
  - `docs` — documentation changes
  - `refactor` — code restructuring without behavior change
  - `chore` — maintenance, config, or tooling changes
- **scope** — always use the board name (e.g., `feat(my-board): ...`)
- **body** — include the item ID on its own line in the commit body

Examples:
```
feat(my-board): add user authentication endpoint

AUTH-3
```
```
fix(my-board): handle null response from API

API-7
```
```
test(my-board): add integration tests for payment flow

PAY-2
```
```
docs(my-board): update API reference with new endpoints

DOC-1
```

Only commit files relevant to the current item.

## Step 9: Check Completion

Read the updated `prd.json`. If ALL items have status `done` or `verified`, output:

```
<ralfie>COMPLETE</ralfie>
```

This signals the runner to stop the iteration loop.

## Failure Protocol

If you cannot complete an item:

1. Set its status to `failed` in `prd.json`
2. Add a comment explaining what went wrong and what you tried
3. Clear `assigned_to`
4. Append failure details to `progress.md`
5. Move on to the next item — do NOT get stuck retrying

Fail fast. It's better to mark an item as failed and move on than to waste iterations on a blocker.
