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
