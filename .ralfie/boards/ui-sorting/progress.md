## SORT-1 — Sort boards newest-first on BoardList page

**Key decisions:**
- Sort applied client-side in the `load` callback after fetching, using `localeCompare` on ISO `created_at` strings (descending)
- Used nullish coalescing (`?? ''`) so boards with missing `created_at` sort to the bottom

**Files changed:**
- `ui/src/pages/BoardListPage.tsx` — Added `.sort()` on fetched boards array by `meta.created_at` descending

**Notes:**
- Same pattern can be reused for SORT-2 (DashboardPage)

---

## SORT-2 — Sort boards newest-first on Dashboard page

**Key decisions:**
- Reused the exact same sort pattern from SORT-1: `localeCompare` on ISO `created_at` strings (descending) with `?? ''` fallback
- Sort applied in the `load` callback's promise chain, before `setBoards`

**Files changed:**
- `ui/src/pages/DashboardPage.tsx` — Added `.sort()` on fetched boards array by `meta.created_at` descending

**Notes:**
- Dashboard and BoardList now have identical sorting behavior

---

## SORT-3 — Sort PRD kanban columns by relevant timestamps

**Key decisions:**
- Added `sortColumnItems` helper in `PrdKanban.tsx` that sorts in-place after filtering by status
- In Progress sorted by `started_at` desc, Done by `completed_at` desc, Verified by `completed_at` desc
- Pending and Failed columns keep original array order (no sort applied)
- Null timestamps sort to the bottom using explicit null checks before `localeCompare`
- Consistent with SORT-1/SORT-2 pattern: `localeCompare` on ISO strings, descending order

**Files changed:**
- `ui/src/components/PrdKanban.tsx` — Added `sortColumnItems` function and call in column rendering

**Notes:**
- All three SORT items are now complete; board should be finished

---
