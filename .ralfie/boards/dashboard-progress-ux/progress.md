## MDFIX-1 — Markdown Rendering with GFM and Dark Theme

**Key decisions:**
- Installed `remark-gfm` as a dependency in the `ui` workspace
- Added `remarkGfm` plugin to `ReactMarkdown` in both `PlanViewer.tsx` and `ProgressTimeline.tsx`
- Added comprehensive dark-theme CSS overrides in `index.css` targeting `.prose` elements

**Files changed:**
- `ui/package.json` — added `remark-gfm` dependency
- `ui/src/components/PlanViewer.tsx` — imported and wired `remarkGfm` plugin
- `ui/src/components/ProgressTimeline.tsx` — imported and wired `remarkGfm` plugin
- `ui/src/index.css` — added dark-theme styles for tables (borders, padding, alternating rows), code blocks (dark background), blockquotes (accent left border), horizontal rules, checkboxes, and strikethrough

**Notes:**
- Tables now render as styled HTML tables with borders and alternating row backgrounds
- Code blocks get a distinct dark background (#13151d) separate from card background
- Inline code gets subtle background highlight
- GFM elements (task lists, strikethrough, autolinks) all render correctly

---

## MDFIX-2 — Progress Entry Format Specification in ralf-run Skill

**Key decisions:**
- Updated Step 5 of ralf-run SKILL.md to specify the exact progress entry format
- Added a markdown code block example showing the `## ITEM-ID — Description` heading and `---` separator structure
- Added numbered requirements list for clarity

**Files changed:**
- `cli/src/skills/ralf-run/SKILL.md` — rewrote Step 5 with structured format specification, example template, and requirements

**Notes:**
- This format enables the UI to split progress.md on `---` separators and use `##` headings as card titles
- Existing MDFIX-1 entry already follows this format, so no retroactive changes needed

---

## PROG-1 — Collapsible Progress Entries

**Key decisions:**
- Rewrote `ProgressTimeline.tsx` to parse progress markdown by splitting on `\n---\n` separators
- Each chunk becomes a `CollapsibleCard` component with the `##` heading as the clickable summary
- Cards are collapsed by default; clicking toggles expanded state with a rotating arrow indicator
- Falls back to rendering the entire content as a single markdown block when no separators are found (backward compatible)

**Files changed:**
- `ui/src/components/ProgressTimeline.tsx` — full rewrite with `parseEntries()` function and `CollapsibleCard` component

**Notes:**
- `parseEntries` returns `null` when content has no `---` separators, triggering the fallback path
- Each card border and background uses existing CSS custom properties (`--bg-card`, `--border`)
- Expanded card body renders through ReactMarkdown with remarkGfm for full GFM support

---

## PROG-2 — Progress Search Filter

**Key decisions:**
- Added a search input above the collapsible progress entries list
- Search filters entries in real-time by case-insensitive match against both heading and body content
- Empty search shows all entries; shows "No entries match your search" when filter yields zero results
- Search input only appears when entries are parseable (not in the single-block fallback mode)

**Files changed:**
- `ui/src/components/ProgressTimeline.tsx` — added `search` state, search input element, and filtering logic

**Notes:**
- Search input uses existing CSS custom properties (`--bg-card`, `--border`, `--text`) for dark theme consistency
- Filtering is done with simple `toLowerCase().includes()` for both heading and body fields

---

## PROG-3 — Progress Entry in Item Drawer

**Key decisions:**
- Exported `parseEntries` from `ProgressTimeline.tsx` so it can be reused by `ItemDrawer`
- Added `progressContent` prop threaded from `BoardDetailPage` → `PrdKanban` → `ItemDrawer`
- Matching uses prefix check: `entry.heading.startsWith(item.id)` to find the progress entry for a given PRD item
- Progress section placed between "Steps to Verify" and "Comments" in the drawer layout
- Used `useMemo` to avoid re-parsing progress content on every render

**Files changed:**
- `ui/src/components/ProgressTimeline.tsx` — exported `parseEntries` function
- `ui/src/components/ItemDrawer.tsx` — added `progressContent` prop, progress matching logic, and Progress section with ReactMarkdown rendering
- `ui/src/components/PrdKanban.tsx` — added `progressContent` prop and threaded it to `ItemDrawer`
- `ui/src/pages/BoardDetailPage.tsx` — passed `board.progress` to `PrdKanban`

**Notes:**
- Shows "No progress entry yet" when no matching entry is found
- Progress body renders with `ReactMarkdown` + `remarkGfm` for full GFM support (tables, code blocks, etc.)

---
