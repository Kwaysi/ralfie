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
