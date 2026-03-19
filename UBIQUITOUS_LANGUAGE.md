# Ubiquitous Language

## Board & Planning

| Term | Definition | Aliases to avoid |
|------|-----------|-----------------|
| **Board** | A self-contained unit of work consisting of a plan, PRD, and progress log | Project, workspace, sprint |
| **Plan** | A markdown document describing the implementation strategy for a board | Design doc, spec, architecture |
| **PRD** | A structured JSON document containing the list of items to implement for a board | Backlog, task list, ticket list |
| **Item** | A single unit of work within a PRD, with a description, verification steps, and status | Task, ticket, story, issue |
| **Category** | A grouping label on an item used for organizing related work | Group, tag, label |

## Item Lifecycle

| Term | Definition | Aliases to avoid |
|------|-----------|-----------------|
| **Pending** | An item that has not been started | Todo, queued, backlog |
| **In Progress** | An item currently being worked on by an agent | Active, running, claimed |
| **Done** | An item whose implementation is complete but not yet human-verified | Complete, finished, closed |
| **Failed** | An item that an agent attempted but could not complete | Blocked, errored, broken |
| **Verified** | An item that a human has confirmed meets acceptance criteria | Approved, accepted, signed off |
| **Claim** | The act of an agent setting an item to in_progress and assigning itself | Pick up, take, grab, start |

## Agent Execution

| Term | Definition | Aliases to avoid |
|------|-----------|-----------------|
| **Run** | A series of iterations where an agent works through pending items on a board | Execution, job, session (ambiguous) |
| **Iteration** | A single cycle within a run where the agent picks one item, implements it, and commits | Step, cycle, loop, tick |
| **Session** | A unique identity (session ID) assigned to a run, used to track ownership of items and locks | Agent ID, worker ID, run ID |
| **Agent** | A Claude Code process spawned by ralfie to do implementation work | Worker, bot, process |
| **Feedback Loop** | A command (typecheck, test, lint, or custom) run after implementation to verify correctness | Check, validation, CI step |

## Process Control

| Term | Definition | Aliases to avoid |
|------|-----------|-----------------|
| **Lock** | An atomic file (`O_EXCL`) that prevents concurrent agents from modifying the same item | Mutex, semaphore, guard |
| **PID File** | A file in a board's `runs/` directory that tracks a running ralf process by its OS process ID | Process file, run file |
| **Stop** | The act of killing all running agents for a board, releasing their locks, and resetting their items to pending | Kill, abort, cancel, terminate |
| **Process Group** | The OS-level group containing the ralf run parent process and its spawned claude child processes — stop sends signals to the group | Process tree |

## Configuration

| Term | Definition | Aliases to avoid |
|------|-----------|-----------------|
| **Ralfie Config** | The source-of-truth configuration stored in `.ralfie/config.json` | Settings (ambiguous with Claude settings) |
| **Claude Settings** | The `.claude/settings.json` file that controls Claude Code behavior — synced from ralfie config before runs | Claude config, project settings |
| **Effort Level** | A config option (low/medium/high) controlling Claude Code's `effortLevel` setting | Thoroughness, intensity |
| **Model** | A config option (opus/sonnet/haiku) controlling which Claude model the agent uses | LLM, engine |
| **Sync** | The act of writing ralfie config values (effort, model, permissions) into `.claude/settings.json` | Apply, propagate, push |

## Infrastructure

| Term | Definition | Aliases to avoid |
|------|-----------|-----------------|
| **Dashboard** | The React SPA served by `ralf serve` that displays board status and controls runs | UI, frontend, web app |
| **Skill** | A markdown file installed to `.claude/skills/` that provides instructions to Claude Code for a specific workflow | Prompt, template, recipe |
| **Progress** | A markdown log appended to after each iteration, recording what was done and decisions made | Changelog, activity log, history |

## Relationships

- A **Board** contains exactly one **Plan**, one **PRD**, and one **Progress** log
- A **PRD** contains one or more **Items**
- A **Run** targets exactly one **Board** and executes one or more **Iterations**
- A **Run** is identified by exactly one **Session** ID
- A **Session** can **Claim** at most one **Item** at a time via a **Lock**
- A **Board** can have zero or more concurrent **Runs**, each tracked by a **PID File**
- **Stop** kills all **Runs** on a **Board** and resets their **Items** to **Pending**
- **Ralfie Config** is the source of truth; **Claude Settings** is a derived artifact produced by **Sync**

## Example dialogue

> **Dev:** "When I start a **Run** on a board, does it **Claim** all **Pending** **Items** upfront?"
> **Domain expert:** "No — each **Iteration** picks one **Pending** **Item**, **Claims** it via a **Lock**, implements it, then marks it **Done**. The next **Iteration** picks the next **Item**."
> **Dev:** "What if I **Stop** a board while an **Agent** is mid-**Iteration**?"
> **Domain expert:** "**Stop** kills the **Process Group**, so both the ralf parent and the claude child die. Then it releases the **Lock** for that **Session** and resets the **Item** back to **Pending** so the next **Run** picks it up."
> **Dev:** "And the **Effort Level** — does that change the prompt?"
> **Domain expert:** "No, the prompt always assumes high thoroughness. **Effort Level** only controls Claude's `effortLevel` setting via **Sync** to **Claude Settings** before the **Run** starts."

## Flagged ambiguities

- **"session" vs "run"**: In the codebase, `sessionId` is generated per run and used everywhere (locks, PRD assignment, comments). A **Session** is the identity; a **Run** is the execution. They have a 1:1 relationship but are distinct concepts. Use **Run** when talking about the execution lifecycle, **Session** when talking about ownership and identity.
- **"settings" vs "config"**: The project has two config files. Always qualify: **Ralfie Config** (`.ralfie/config.json`) is the source of truth; **Claude Settings** (`.claude/settings.json`) is the synced derivative. Never use bare "settings" or "config" without the qualifier.
- **"agent" vs "process"**: An **Agent** is the logical concept (Claude Code doing work). A **Process** is the OS-level entity tracked by **PID Files**. A single **Run** is one OS process that spawns multiple child **Agent** processes (one per **Iteration**). When users say "N agents running" in the UI, this actually means N **Runs** (parent processes), each of which spawns sequential **Agent** child processes.
