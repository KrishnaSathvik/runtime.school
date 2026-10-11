# SQL Studio (Next.js)

Standalone rebuild of the ChatGPT Sites SQL Studio product. Editorial IDE UI, real browser SQLite execution, preserved curriculum and grading, local-first progress.

Original ChatGPT Site files remain untouched under `original-site/` and the zip at the workspace root.

## Learn-first navigation

Learn is now the starting point: `/` redirects to `/learn`, the logo links there, and its main action opens or resumes a course lesson directly. Practice and Projects retain their own continuation; Progress summarizes all activity. [Refinement report](docs/v5/LEARN_MAIN_REFINEMENT.md).

## V5 product experience

V5 connects focused Learn, Practice, Projects and Progress screens with a paginated question browser, real table previews, a clearer project workflow and updated SQL tools. Existing curriculum, grading, saved work and themes are preserved.

[Implementation and verification report](docs/v5/V5_IMPLEMENTATION_REPORT.md) · [Approved specification](docs/v5/SQL_STUDIO_V5_IMPLEMENTATION_SPEC.md). Local preview: **http://127.0.0.1:3232**. No deployment or cloud service is required.

## UX language pass

Reviewed 622 learner-facing text locations and corrected 205 documented wording issues. Progress labels distinguish practicing with help from solved work; SQL feedback explains recovery and preserves technical details. The curriculum, grading and visual design remain intact.

[Language audit and screenshots](docs/ux/CONTENT_LANGUAGE_AUDIT.md) · [Writing guidelines](docs/ux/UX_WRITING_GUIDELINES.md) · [Verification](docs/TEST_REPORT.md). The current local production preview uses port 3232.

## Verified content

| Item | Count |
| --- | --- |
| Modules | 10 |
| Lessons | 88 |
| Challenges | 176 |
| Projects | 5 |
| Curriculum datasets | 7 |
| Additional practice datasets | 4 |
| Total unique exercises | 264 |
| Write SQL / Predict Output / Debug Query | 252 / 6 / 6 |
| Practice-ready exercises | 249 |
| Independent bank problems | 88 |
| Curated practice tracks | 6 |
| Walkthrough stages | 204 |
| Concept quizzes | 88 |

## Setup

```bash
cd /path/to/sqlstudio
npm install
npm run dev -- --port 3232
```

Open [http://localhost:3232](http://localhost:3232).

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Local development (Turbopack) |
| `npm run build` | Production build |
| `npm start` | Serve production build |
| `npm test` | Vitest: content/grading parity with original, learning state, SQL client, projects |
| `npm run test:language` | Copy clarity, honest progress labels, diagnostics, backups, responsive screens and axe (local server required; set `BASE`) |
| `npm run test:learning` | Placement retakes, review cycles, formatter/undo, learning links, interactive demos and accessibility (local server required) |
| `npm run test:e2e` | Playwright acceptance journeys (set `BASE=http://127.0.0.1:3232` for the current preview) |
| `npm run test:sweep` | Responsive screenshots, 21 routes × 8 widths × 2 themes |
| `npm run test:learner` | Full learner simulations, track/project resume, two-tab progress and mobile tap checks |
| `npm run qb:report` | Regenerate question inventory, examples and coverage reports |
| `npm run lint` | ESLint |

No required environment variables for V1. SQL runs entirely in the browser via sql.js.

## Project structure

```
src/app/           Next.js App Router screens
src/components/    Shell, editor, shared UI
src/content/       Migrated curriculum content-pack.json
src/engine/        Grading + SQL worker client
src/features/      Lesson workspace and feature modules
src/lib/           Learning state + theme
public/vendor/     sql.js WASM worker (engine + grading)
public/fonts/      Geist Sans / Mono
docs/              Audits, vision, parity, gaps
tests/             Automated checks
```

## Feature status

Working: Home, Learn, lesson flow (Understand → Practice → Review → Complete), Practice browser and six tracks, 23 Phase B questions with optimization feedback and an independent five-stage checkout case study, Projects + milestones, Progress, Playground, Database Lab, Query Performance, Compare SQL Syntax, Settings (theme/import/export), local persistence, light/dark/system.

Learning experience: six-question placement with clean retakes and no mastery credit; spaced reviews with due reasons and exact interrupted-stage restoration with fresh recall drafts each cycle; schema-aware autocomplete, SQL formatting with undo, and editor shortcuts; interactive JOIN, GROUP BY and window demonstrations backed by SQLite; completed lessons link to relevant practice, tracks and projects. V4 retains the original nine datasets, 247 questions and six tracks, and adds two synthetic datasets and 17 exercises. The original SQL grading contracts and lesson mastery rules are preserved.

Not in V1: accounts/sync, AI tutor, non-SQLite execution. Acceptance audit: `docs/audit/LAUNCH_READINESS.md`.

## Docs

See `docs/` for product vision, UX architecture, design system, migration map, feature parity, gaps, and test report.

Local learner quality pass: [findings](docs/audit/UX_FINDINGS.md), [final assessment](docs/audit/LEARNER_EXPERIENCE_FINAL.md), [verification](docs/TEST_REPORT.md). Changes preserve the content inventory and grading architecture; 42 concept checks now match the lessons they assess. No deployment or publication.

## V4 local learning upgrade

Practice supports Write SQL, Predict Output and Debug Query. Six original predictions use typed row entry and real SQLite results; six debugging tasks use broken starters, alternative solutions and changed fixtures. Infrastructure Capacity Planning adds five independent Practice stages. JOIN, grouping and frame demos are extended, with optional engineering reasoning in relevant project lessons.

Run `npm run test:v4` against the local production server (`BASE=http://127.0.0.1:3232`). Full audit, source decisions, screenshots, limitations and actual verification results: [V4 implementation report](docs/v4/V4_IMPLEMENTATION_REPORT.md). Sources remain private under ignored `reference/`, outside public assets. Everything stays local.
