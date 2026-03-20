## README-1 — Image Cleanup

**Key decisions:**
- Identified screenshots by visual content: 1.26.07 = dashboard overview, 1.26.33 = boards list, 1.26.52 = kanban detail
- Filenames contained Unicode narrow no-break space (U+202F) before "AM" — used Python for reliable rename

**Files changed:**
- `docs/images/dashboard.png` — renamed from `Screenshot 2026-03-20 at 1.26.07 AM.png`
- `docs/images/boards.png` — renamed from `Screenshot 2026-03-20 at 1.26.33 AM.png`
- `docs/images/kanban.png` — renamed from `Screenshot 2026-03-20 at 1.26.52 AM.png`

**Notes:**
- All three images are valid PNGs and visually confirmed before rename

---

## README-2 — Hero, Explainer, and Features

**Key decisions:**
- Led with the pitch line from the PRD: "Ralfie turns a product spec into working code — one task at a time, fully automated."
- "What is Ralfie?" section uses a project-manager analogy to explain the concept without jargon
- Dashboard screenshot placed prominently after the tagline
- Features list covers 6 capabilities: planning, execution, dashboard, file-based tracking, guardrails, and editing

**Files changed:**
- `README.md` — created at repo root with hero section, dashboard screenshot, What is Ralfie? explainer, and features list

**Notes:**
- README is structured so subsequent items (Quick Start, CLI Reference, Dashboard, Architecture) can append sections below Features

---
