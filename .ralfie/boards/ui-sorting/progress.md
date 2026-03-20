## SORT-1 — Sort boards newest-first on BoardList page

**Key decisions:**
- Sort applied client-side in the `load` callback after fetching, using `localeCompare` on ISO `created_at` strings (descending)
- Used nullish coalescing (`?? ''`) so boards with missing `created_at` sort to the bottom

**Files changed:**
- `ui/src/pages/BoardListPage.tsx` — Added `.sort()` on fetched boards array by `meta.created_at` descending

**Notes:**
- Same pattern can be reused for SORT-2 (DashboardPage)

---
