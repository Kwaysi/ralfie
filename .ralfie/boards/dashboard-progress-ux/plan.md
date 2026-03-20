# Dashboard Progress UX

## Goal

Fix unreadable markdown rendering on the Plan and Progress tabs by adding GFM support and proper dark-theme styling, then enhance the Progress tab with collapsible entries, text search, and show matching progress entries in the PRD item drawer.

## Architecture

- **Markdown fix** — Add `remark-gfm` plugin to `react-markdown` for tables, strikethrough, task lists. Add custom CSS targeting `prose` elements (tables, code blocks, blockquotes, hr) for the dark theme.
- **Progress entry separator** — Update the `ralf-run` skill to emit a `---` (horizontal rule) between progress entries, with each entry starting with a `## ITEM-ID — Description` heading. This gives a parseable structure.
- **Collapsible progress items** — Parse the progress markdown by splitting on `---` separators. Each chunk becomes a collapsible card with the `##` heading as the summary. Collapsed by default, click to expand.
- **Search** — A text input above the progress list that filters collapsible items by matching against both the heading and body content (case-insensitive).
- **Item drawer integration** — The ItemDrawer component finds the matching progress entry by item ID and renders it as a markdown section.

## Tech Stack

- `remark-gfm` — GFM plugin for react-markdown (tables, strikethrough, task lists, autolinks)
- Existing: react-markdown, Tailwind v4, React 19
- No additional UI libraries needed — collapsible sections use simple React state

## Milestones

1. **Markdown rendering fix** — As a user viewing a board, I can read plan and progress content with properly rendered tables, code blocks, and GFM elements so that the content is legible. *End state: Tables render as styled HTML tables (no pipes visible), code blocks have background styling, headings/lists are properly spaced.* Key files: `PlanViewer.tsx`, `ProgressTimeline.tsx`, `index.css`, `package.json`

2. **Progress entry separator in ralf-run** — As a developer running `ralf run`, progress entries are written with `---` separators and `## ITEM-ID` headings so the UI can parse them into discrete items. *End state: The ralf-run skill specifies the separator format.* Key files: `cli/src/skills/ralf-run/SKILL.md`

3. **Collapsible progress items** — As a user viewing the progress tab, I see each progress entry as a collapsible card that I can expand/collapse. *End state: Progress entries render as individual collapsible cards, collapsed by default.* Key files: `ProgressTimeline.tsx`

4. **Progress search** — As a user viewing the progress tab, I can type in a search box to filter progress entries by title or body content. *End state: A search input filters the collapsible list in real-time.* Key files: `ProgressTimeline.tsx`

5. **Progress entry in ItemDrawer** — When viewing a PRD item in the drawer, show its matching progress entry as a rendered markdown section. *End state: ItemDrawer shows a Progress section matched by item ID.* Key files: `ItemDrawer.tsx`, `BoardDetailPage.tsx`

## Risks

- Existing progress.md files without separators won't parse into collapsible items → **Mitigation:** Fall back to rendering as a single markdown block if no `---` separators found
- Item ID in progress heading must exactly match the PRD item ID for drawer matching → **Mitigation:** Match with a prefix check (heading starts with `## ITEM-ID`) so trailing description text doesn't break it
- `remark-gfm` may need type stubs → **Mitigation:** Minor, add declaration file if needed

## Out of Scope

- Plan tab search/collapse
- Editing progress entries from the UI
- Syntax highlighting for code blocks (e.g., `rehype-highlight`)
