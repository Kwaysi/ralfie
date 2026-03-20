---
name: ralf-plan
description: Plan a new ralfie board — grill the user on requirements, generate a plan and PRD, then create the board
---

# ralfie-plan

You are creating a new ralfie board. Follow these phases in order. **You MUST wait for explicit user approval before advancing to the next phase.** Do NOT proceed to the next phase until the user says to continue.

## Phase 1: Grilling

Before generating anything, interview the user about their project:

1. What is the project? What problem does it solve?
2. What is the tech stack? (languages, frameworks, databases)
3. What are the key constraints? (timeline, budget, team size, existing code)
4. What are the known unknowns? What are you most uncertain about?
5. Who are the users? What are the core user flows?

INTERVIEW THE USER RELENTLESSLY ABOUT EVERY ASPECT OF THIS PLAN UNTIL WE REACH A SHARED UNDERSTANDING. WALK DOWN EACH BRANCH OF THE DESIGN TREE, RESOLVING DEPENDENCIES BETWEEN DECISIONS ONE-BY-ONE.

If a question can be answered by exploring the codebase, explore the codebase instead.

## Phase 2: Plan Generation

Write a `plan.md` that covers:

- **Goal**: One-paragraph summary of what we're building and why
- **Architecture**: High-level system design, key components, data flow
- **Tech Stack**: Languages, frameworks, libraries with rationale
- **Milestones**: Ordered list of implementation phases. Each milestone should include:
  - A **user story** ("As a [user], I can [action] so that [benefit]")
  - An **end state** describing the observable result when the milestone is complete
  - Key files or modules involved
- **Risks**: Known risks and mitigation strategies
- **Out of Scope**: What we are explicitly NOT building

Keep it concise. The plan is a living document — it will be edited later.

**STOP. Present the plan to the user and ask for approval before continuing.** Do not generate the PRD until the user explicitly approves the plan.

## Phase 3: PRD Generation

Generate a `prd.json` matching this exact schema:

```json
{
  "project": "<project-name>",
  "description": "<one-line project description>",
  "items": [
    {
      "id": "CATEGORY-1",
      "category": "Category Name",
      "user_story": "As a [user], I can [action] so that [benefit]",
      "description": "What this item implements",
      "end_state": "Observable result when complete — what the agent should see when done",
      "steps_to_verify": [
        "Specific, observable verification step"
      ],
      "status": "pending",
      "assigned_to": null,
      "started_at": null,
      "completed_at": null,
      "comments": []
    }
  ]
}
```

**Required fields — use these exact names:**
- Root: `project` (string), `description` (string), `items` (array)
- Item: `id` (string), `category` (string), `user_story` (string — who benefits and why), `description` (string — NOT "title"), `end_state` (string — what "done" looks like), `steps_to_verify` (string[]), `status` (ItemStatus), `assigned_to` (string | null), `started_at` (string | null), `completed_at` (string | null), `comments` (PrdItemComment[])

Guidelines for good PRD items:
- Each item must have a unique ID (e.g., `AUTH-1`, `DB-2`)
- **user_story** explains the motivation — who wants this and why. Gives the agent context for design decisions
- **end_state** describes what the world looks like when done — files that exist, behaviors that work, outputs visible. This is the agent's north star during implementation
- Each item must have concrete `steps_to_verify` — specific, observable checks
- Group items by `category` (e.g., "Authentication", "Database", "API")
- Order items by dependency — items that block others come first
- All items start with `status: "pending"`, `assigned_to: null`, `started_at: null`, `completed_at: null`, `comments: []`
- Small enough to complete in one coding session
- Verifiable without human judgment ("tests pass" not "code is clean")
- Independent where possible — minimize cross-item dependencies
- Include both the implementation and its tests in the same item

**STOP. Present the PRD to the user and ask for approval before continuing.** Do not create the board until the user explicitly approves the PRD.

## Phase 4: Board Creation

Once the user approves the plan and PRD, create the board.

Run `ralf init` first if not already done.

Then write **all 4 required files** to `.ralfie/boards/<board-name>/`:

1. **meta.json** — Board metadata:
   ```json
   {
     "name": "<board-name>",
     "created_at": "<ISO 8601 timestamp>",
     "description": "<board description>"
   }
   ```
2. **plan.md** — The plan from Phase 2
3. **prd.json** — The PRD from Phase 3
4. **progress.md** — Create as an empty file

All 4 files must exist for the board to work correctly with `ralf` commands.

5. **Update RALF.md** — Append the new board entry to `.ralfie/RALF.md` so agents can discover it:
   ```
   - **<board-name>** — <description> → [progress](.ralfie/boards/<board-name>/progress.md)
   ```
   If `.ralfie/RALF.md` doesn't exist, create it first with `ensureRalfMd()` or by writing the full template.
