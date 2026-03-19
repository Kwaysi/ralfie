# ralph.sh
# Usage: ./ralph.sh <iterations>

set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <iterations>"
  exit 1
fi

# For each iteration, run Claude Code with the following prompt.
# This prompt is basic, we'll expand it later.
for ((i=1; i<=$1; i++)); do
  result=$(claude -p \
"@prd.json @progress.txt \
1. Decide which task to work on next.\
This should be the one YOU decide has the highest priority,\
- not necessarily the first in the list.\
2. Check any feedback loops, such as types and tests.\
3. Append your progress to the progress.txt file.\
4. Make a git commit of that feature.\
ONLY WORK ON A SINGLE FEATURE.\
If, while implementing the feature, you notice that all work\
is complete, output <promise>COMPLETE</promise>.\
\
When choosing the next task, prioritize in this order:\
1. Architectural decisions and core abstractions\
2. Integration points between modules\
3. Unknown unknowns and spike work\
4. Standard features and implementation\
5. Polish, cleanup, and quick wins\
Fail fast on risky work. Save easy wins for later.\
\
Keep changes small and focused:\
- One logical change per commit\
- If a task feels too large, break it into subtasks\
- Prefer multiple small commits over one large commit\
- Run feedback loops after each change, not at the end\
Quality over speed. Small steps compound into big progress.\
\
After completing each task, append to progress.txt:\
- Task completed and PRD item reference\
- Key decisions made and reasoning\
- Files changed\
- Any blockers or notes for next iteration\
Keep entries concise. Sacrifice grammar for the sake of concision. This file helps future iterations skip exploration.\
\
Before committing, run ALL feedback loops:\
1. TypeScript: npm run typecheck (must pass with no errors)\
2. Tests: npm run test (must pass)\
3. Lint: npm run lint (must pass)\
Do NOT commit if any feedback loop fails. Fix issues first.\
\
This codebase will outlive you. Every shortcut you take becomes\
someone else's burden. Every hack compounds into technical debt\
that slows the whole team down.\
\
You are not just writing code. You are shaping the future of this\
project. The patterns you establish will be copied. The corners\
you cut will be cut again.\
\
Fight entropy. Leave the codebase better than you found it.\
\
MAKE SURE YOU UPDATE EACH PRD ITEM WITH PASSES TRUE WHEN YOU'RE DONE WITH AN ITEM.\
")

  echo "$result"

  if [[ "$result" == *"<promise>COMPLETE</promise>"* ]]; then
    echo "PRD complete, exiting."
    exit 0
  fi

  printf '\n\nIteration %s complete. Moving to next iteration...\n\n' "$i"
  say "Iteration $i complete. Moving to next iteration"
done
