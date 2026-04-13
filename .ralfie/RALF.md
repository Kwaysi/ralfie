# RALF.md

This project uses Ralfie for agentic task orchestration. Each board below represents a unit of work with its own plan, PRD, and progress log.

## Boards

- **ralfie-bootstrap** — CLI tool that manages agentic coding loops with planning, execution, tracking, and a real-time React dashboard → [progress](.ralfie/boards/ralfie-bootstrap/progress.md)
- **agent-context-ralf-md** — Auto-generate .ralfie/RALF.md and wire it into CLAUDE.md so agents get project context → [progress](.ralfie/boards/agent-context-ralf-md/progress.md)
- **dashboard-progress-ux** — Fix markdown rendering and enhance progress tab with collapsible entries, search, and item drawer integration → [progress](.ralfie/boards/dashboard-progress-ux/progress.md)
- **serve-lifecycle** — Fix ctrl+c shutdown, add daemon mode with -d flag, and dashboard stop button for ralf serve → [progress](.ralfie/boards/serve-lifecycle/progress.md)
- **repo-readme** — Comprehensive, marketing-friendly README.md for the Ralfie repository → [progress](.ralfie/boards/repo-readme/progress.md)
- **ui-sorting** — Sort boards newest-first and PRD kanban items by relevant timestamps across the Ralfie dashboard UI → [progress](.ralfie/boards/ui-sorting/progress.md)
- **ralf-workflow-enhancements** — Conventional commits, auto-branch/PR on run completion, commit-msg hook enforcement, and dashboard item drawer cycling → [progress](.ralfie/boards/ralf-workflow-enhancements/progress.md)
- **ralf-review-loop** — Orchestrator-level code review loop with conversation resumption for ralf run → [progress](.ralfie/boards/ralf-review-loop/progress.md)
