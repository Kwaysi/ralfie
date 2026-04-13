# Plan: ralf-workflow-enhancements

## Goal

Enhance ralfie's workflow with conventional commits, automatic branch/PR creation on run completion, a commit-msg git hook for enforcement, and prev/next item cycling in the dashboard's item drawer — making the plan-run-review loop more automated and the dashboard more navigable.

## Architecture

### CLI changes (cli/)

- **ralf-run skill** — Update Step 7 with conventional commit format guidance (type from agent judgment, scope = board name, item ID in body)
- **run command** — Add pre-flight check for uncommitted changes (abort with message if dirty). On start, create and checkout an incremented branch (`<board>-N`, checking local+remote). On completion, push branch and run `gh pr create` with checklist description.
- **git helpers** — New `cli/src/lib/git.ts` module for: checking dirty state, listing branches (local+remote), creating/checking out branches, pushing, creating PRs via `gh`, installing commit-msg hook
- **init command** — Install conventional commit `commit-msg` git hook during `ralf init`

### UI changes (ui/)

- **Item drawer** — Add prev/next chevron buttons (up/down). Wire keyboard arrow up/down. Cycle within the same status column. Wrap at boundaries.

## Tech Stack

No new dependencies. Uses `child_process` for git/gh commands (same pattern as existing `execFileAsync` usage). UI uses existing React + Tailwind stack.

## Milestones

### 1. Conventional commits in skill
- *User story*: As an agent running `ralf run`, I follow conventional commit format so that the git history is structured and readable
- *End state*: Skill file contains clear conventional commit guidance with examples
- *Files*: `cli/src/skills/ralf-run/SKILL.md`

### 2. Git helper module
- *User story*: As the CLI, I can perform git operations reliably so that branch/PR automation and hook management work correctly
- *End state*: Module exports functions for all needed git operations with proper error handling and tests
- *Files*: `cli/src/lib/git.ts`

### 3. Conventional commit git hook
- *User story*: As a developer, my commits are validated against conventional commit format so the repo stays consistent
- *End state*: `ralf init` installs a `commit-msg` hook; invalid commits rejected with helpful error; existing non-ralfie hooks preserved
- *Files*: `cli/src/commands/init.ts`, `cli/src/lib/git.ts`

### 4. Branch creation on run start
- *User story*: As a user running `ralf run`, my work is automatically isolated on a new branch so I don't pollute the default branch
- *End state*: `ralf run my-board` creates `my-board-1` (or next increment) and checks it out; aborts if dirty
- *Files*: `cli/src/commands/run.ts`, `cli/src/lib/git.ts`

### 5. Auto-PR on completion
- *User story*: As a user, when a board's work is complete I get a ready-for-review PR automatically so I can go straight to code review
- *End state*: Branch pushed, PR created via `gh pr create` with checklist body, URL printed
- *Files*: `cli/src/commands/run.ts`, `cli/src/lib/git.ts`

### 6. Dashboard item drawer cycling
- *User story*: As a dashboard user, I can cycle through items of the same status without closing the drawer so I can review items faster
- *End state*: Chevron up/down buttons and arrow keys navigate between items in the same status, wrapping around
- *Files*: UI item drawer components

## Risks

- **`gh` CLI not installed** — PR creation will fail. Mitigation: check for `gh` at run start, warn early.
- **Branch conflicts** — Manual branch creation matching the pattern. Mitigation: incrementing logic checks both local and remote.
- **Dirty state false positives** — Untracked files in `.ralfie/` could trigger the guard. Mitigation: only check staged/unstaged changes to tracked files.
- **Existing commit-msg hook** — User may already have one. Mitigation: use a ralfie marker comment to identify owned hooks; warn and skip if non-ralfie hook exists.

## Out of Scope

- Standalone `ralf pr` command
- Multi-board PR aggregation
- Draft PR option
- Interactive rebase or squash workflows
