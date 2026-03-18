---
name: ralfie-plan
description: Plan a new ralfie board — grill the user on requirements, generate a plan and PRD, then create the board
---

# ralfie-plan

You are creating a new ralfie board. Follow these phases in order.

## Phase 1: Grilling

Before generating anything, interview the user about their project:

1. What is the project? What problem does it solve?
2. What is the tech stack? (languages, frameworks, databases)
3. What are the key constraints? (timeline, budget, team size, existing code)
4. What are the known unknowns? What are you most uncertain about?
5. Who are the users? What are the core user flows?

Push back on vague answers. Ask follow-up questions until you have a concrete understanding of scope, constraints, and priorities. Do not proceed until the user confirms you have enough context.

## Phase 2: Plan Generation

Write a `plan.md` that covers:

- **Goal**: One-paragraph summary of what we're building and why
- **Architecture**: High-level system design, key components, data flow
- **Tech Stack**: Languages, frameworks, libraries with rationale
- **Milestones**: Ordered list of implementation phases
- **Risks**: Known risks and mitigation strategies
- **Out of Scope**: What we are explicitly NOT building

Keep it concise. The plan is a living document — it will be edited later.

## Phase 3: PRD Generation

Generate a `prd.json` with granular, testable items:

- Each item must have a unique ID (e.g., `AUTH-1`, `DB-2`)
- Each item must have concrete `steps_to_verify` — specific, observable checks
- Group items by `category` (e.g., "Authentication", "Database", "API")
- Order items by dependency — items that block others come first
- All items start with `status: "pending"`, `assigned_to: null`, `comments: []`

Guidelines for good PRD items:
- Small enough to complete in one coding session
- Verifiable without human judgment ("tests pass" not "code is clean")
- Independent where possible — minimize cross-item dependencies
- Include both the implementation and its tests in the same item

## Phase 4: Board Creation

Once the user approves the plan and PRD, create the board:

```
ralf init  (if not already done)
```

Then write the plan.md and prd.json files to `.ralfie/boards/<board-name>/`.
