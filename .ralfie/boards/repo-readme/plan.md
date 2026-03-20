# Board: repo-readme

## Goal

Create a comprehensive, marketing-friendly README.md that helps new users understand what Ralfie does, how to get started, and invites them to contribute. The README should make "agentic coding loops" accessible and exciting rather than intimidating, using clear language, screenshots, and a step-by-step quickstart.

## Architecture

This is a documentation-only board — no code changes. The deliverable is a single `README.md` at the repo root, plus renamed screenshot files for clean URLs.

Structure of the README:
1. Hero section (name, tagline, one-liner pitch)
2. Screenshot showcase (dashboard overview)
3. What is Ralfie? (plain-language explainer)
4. Features list
5. Quick Start (install → init → plan → run → serve)
6. CLI Reference (command table)
7. Dashboard (screenshots with captions)
8. Architecture overview (for contributors)
9. Prerequisites
10. Contributing / Community (early-stage callout, fork/star encouragement)
11. License

## Tech Stack

- Markdown (GitHub-flavored)
- Static images in `docs/images/`

## Milestones

### M1: Image cleanup
- **User story:** As a README reader, I see clean image URLs so the page looks professional
- **End state:** Screenshots renamed to `dashboard.png`, `boards.png`, `kanban.png` in `docs/images/`
- **Files:** `docs/images/`

### M2: Hero & intro sections
- **User story:** As a new visitor, I immediately understand what Ralfie does and why I should care
- **End state:** README.md exists with hero tagline, pitch paragraph, and a dashboard screenshot
- **Files:** `README.md`

### M3: Quick Start guide
- **User story:** As a developer, I can go from zero to running my first board by following the README
- **End state:** Step-by-step instructions covering prerequisites, install, init, plan, run, and serve
- **Files:** `README.md`

### M4: CLI Reference & Dashboard showcase
- **User story:** As a user, I can see all available commands and what the dashboard looks like
- **End state:** CLI command table and dashboard section with all 3 screenshots and captions
- **Files:** `README.md`

### M5: Architecture & Contributing
- **User story:** As a potential contributor, I understand the codebase structure and feel invited to participate
- **End state:** Architecture overview, contributing section with early-stage callout, and license
- **Files:** `README.md`

## Risks

- **Screenshots may go stale** — as the UI evolves, screenshots will need updating. Mitigation: keep image references in one section for easy replacement.
- **Install instructions are temporary** — npm publish isn't set up yet. Mitigation: document the clone-and-build path now, with a note that `npm install -g ralfie` is coming.

## Out of Scope

- Dedicated docs site (e.g., Docusaurus, GitBook)
- Video tutorials or GIFs
- API documentation
- Changelog / release notes
