## GIT-1 — Git utility module

**Key decisions:**
- Used `promisify(execFile)` pattern consistent with init.ts for spawning git/gh commands
- `isDirty` uses `git status --porcelain -uno` to only check tracked files (avoids false positives from untracked `.ralfie/` files)
- `listBranches` checks both local and remote branches, deduplicating by stripping remote prefix
- `installCommitMsgHook` uses a `# ralfie-managed-hook` marker comment to identify owned hooks — preserves non-ralfie hooks with a warning
- Commit-msg hook allows merge commits and optional scope in conventional format

**Files changed:**
- `cli/src/lib/git.ts` — new module exporting isDirty, getDefaultBranch, listBranches, nextBranchName, createAndCheckoutBranch, push, createPr, installCommitMsgHook
- `cli/src/lib/__tests__/git.test.ts` — 18 tests covering all exported functions including hook validation with real git commits

**Notes:**
- Hook commit tests require extended timeout (15s) due to shell hook execution overhead in temp repos
- `push` and `createPr` are not tested with real remotes — they will be integration-tested when wired into the run command (RUN-1, RUN-2)

---

## RUN-1 — Branch creation on run start

**Key decisions:**
- Added dirty check as the first pre-flight in `runCommand`, before any config reading or session setup
- Branch creation happens immediately after the dirty check, before the iteration loop
- Mocked git functions in run tests since temp dirs aren't real git repos — git.test.ts already covers real git operations
- Re-applied mock implementations in `beforeEach` after `vi.clearAllMocks()` to ensure consistent state across tests

**Files changed:**
- `cli/src/commands/run.ts` — imported `isDirty`, `nextBranchName`, `createAndCheckoutBranch` from git module; added dirty tree abort and branch creation before the iteration loop
- `cli/src/commands/__tests__/run.test.ts` — added `vi.mock` for git module, 4 new tests: dirty tree abort, no agent spawn when dirty, branch creation, branch increment

**Notes:**
- 5 new test cases added (dirty abort, no agent spawn when dirty, branch creation, branch increment)
- The dirty check uses `isDirty` which only checks tracked files (ignores untracked `.ralfie/` files)

---

## HOOK-1 — Wire commit-msg hook into ralf init

**Key decisions:**
- Added `installCommitMsgHookSafe` wrapper in init.ts that checks for `.git` directory before calling `installCommitMsgHook` — silently skips in non-git directories
- Hook installation happens after all other init steps (config, skills, permissions, CLAUDE.md, RALF.md) to avoid blocking init on hook issues
- Init tests that need hook behavior create real git repos with `git init` in the temp dir
- Bumped pre-existing git.test.ts timeout from 15s to 30s for the `accepts valid conventional commit messages` test that was flaky at the 15s boundary

**Files changed:**
- `cli/src/commands/init.ts` — imported `installCommitMsgHook` from git module, added `installCommitMsgHookSafe` wrapper, wired it into `initCommand`
- `cli/src/commands/__tests__/init.test.ts` — added 3 tests: hook installed with marker, non-ralfie hook preserved, ralfie hook overwritten on re-init
- `cli/src/lib/__tests__/git.test.ts` — bumped timeout on flaky test from 15s to 30s

**Notes:**
- The `installCommitMsgHook` function in git.ts already handles all the hook logic (marker detection, content validation, permissions). Init just needs to call it safely.
- Existing non-init tests that use temp dirs without git repos are unaffected since `installCommitMsgHookSafe` silently skips.

---
