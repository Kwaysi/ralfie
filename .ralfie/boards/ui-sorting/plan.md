# UI Sorting Improvements

## Goal

Add consistent sorting across the Ralfie dashboard UI so boards appear newest-first and PRD kanban items are ordered by their relevant timestamps, making it easier to see the most recent activity at a glance.

## Architecture

Frontend-only changes. Sort logic is applied in React components before rendering — no API or backend modifications needed. All required timestamp fields (`created_at`, `started_at`, `completed_at`) already exist in the data model.

## Tech Stack

- React (existing UI components)
- TypeScript (existing)
- No new dependencies

## Milestones

### Milestone 1: Board list sorting
- **User story:** As a user, I see boards sorted newest-first on the BoardList page so I can quickly find my most recent work.
- **End state:** BoardListPage renders boards in descending `created_at` order.
- **Files:** `ui/src/pages/BoardListPage.tsx`

### Milestone 2: Dashboard sorting
- **User story:** As a user, I see boards sorted newest-first on the Dashboard so the most recent boards are prominent.
- **End state:** DashboardPage renders boards in descending `created_at` order.
- **Files:** `ui/src/pages/DashboardPage.tsx`

### Milestone 3: PRD kanban column sorting
- **User story:** As a user, I see in-progress, done, and verified items sorted by most recent activity so I can track what changed last.
- **End state:** PrdKanban sorts In Progress by `started_at` desc, Done by `completed_at` desc, Verified by `completed_at` desc. Pending and Failed columns remain in array order.
- **Files:** `ui/src/components/PrdKanban.tsx`

## Risks

- **Null timestamps:** Items might have null `started_at` or `completed_at` if data was created before timestamps were enforced. Mitigation: null values sort to the bottom.
- Minimal risk overall — purely presentational changes.

## Out of Scope

- Backend/API sorting
- Sorting persistence or user-configurable sort options
- Progress timeline sorting
- Any sorting of Pending or Failed columns
