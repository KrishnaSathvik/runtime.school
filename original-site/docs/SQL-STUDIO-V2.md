# SQL Studio V2: implementation and verification

> The visual design in this historical report is superseded by [Editorial IDE](EDITORIAL-IDE.md). The learning-state and engine details remain applicable.

Implemented in the existing SQL Studio source, October 8, 2026. The SQLite engine, grader contracts, authored curriculum and five project mappings remain in place. This is a static browser-local application, with no newly introduced account, server database or AI tutor.

## Audit findings

| Finding | Responsible code before V2 | V2 change |
|---|---|---|
| First screen opened a SELECT lesson without onboarding | `app.js` initial state and renderer | Home with start, optional diagnostic and browse choices |
| Outer mobile Learn/Write/Results conflicted with inner lesson tabs | `app.js` practice, renderer and responsive styles | One Understand → Practice → Review → Complete stepper |
| Running SQL hid editor/task on mobile | `execute`, `practiceFocus`, `style.css` | Inline results and feedback in the practice workspace |
| SQL drafts lived only in sessionStorage | `persistDraft`, `draftKey` | Versioned localStorage drafts keyed by activity/lesson/challenge, with session-draft recovery |
| Guidance was one transient lesson-wide boolean | `assisted`, example/hint/walk handlers | Persisted per-challenge guidance, exposure history and fresh-data retakes |
| No saved stage or selected challenge per lesson | `save`, navigation | Saved stage, active activity and per-lesson resume selection |
| Projects only linked to lessons | `cases`, `caseStudyGroups` | Dedicated briefs, milestone navigation, independent project completion records and exports |
| Tools competed with learning navigation | Main navigation | Separate expandable Tools group |
| No consistent system/light/dark preference | Original styles | Semantic tokens, early theme initialization and persisted preference |
| No structured diagnostic or spaced-review history | Recommendations and progress | Real six-query diagnostic, deterministic recommendations and transparent review scheduling |

Verified inventory: **88 lessons, 176 challenges, 10 modules, five mapped projects**, seven dataset choices, actual sql.js SQLite execution, authored quizzes and **204 runnable walkthrough steps**. Database writes remain isolated to fresh runs. The original grader still checks output, required syntax, actual database objects and changed fixtures; it was not simplified.

## Architecture

Content stays in `datasets.js`, `curriculum.js`, `advanced.js`, `walkthroughs.js`, `engineering.js` and `warehouse.js`. `engine.js`, `grading.js` and the vendored SQLite WASM runtime remain authoritative for execution and grading.

`app.js` retains reusable tooling, editor input handling and original educational views. `learning-state.js` introduces the version-3 persistence model, migration, guidance classification, recommendations, project records and review scheduling. `ux.js` supplies the new application shell, screens, lesson flow, shared editor/results and guarded execution controller. `ux.css` defines the two themes and deliberate desktop/tablet/mobile arrangements. This incremental approach avoids replacing the course, grader or engine.

Static hosting uses **hash routes** for reliable direct links without server rewrite configuration:

| Destination | Route after the site origin |
|---|---|
| Home | `/#/` |
| Course roadmap / module | `/#/learn`, `/#/learn/0` |
| Unified lesson | `/#/lesson/0` |
| Active practice shortcut | `/#/practice` |
| Projects / project | `/#/projects`, `/#/projects/0` |
| Project milestone | `/#/projects/0/milestone/45` |
| Progress | `/#/progress` |
| Optional assessment | `/#/assessment` |
| Spaced concept review | `/#/review/0` |
| Playground, lab, plans | `/#/playground`, `/#/lab`, `/#/query-plans` |
| Dialect reference / warehouse blueprint | `/#/dialects`, `/#/warehouse` |

Browser history uses pushState/popstate. Practice resumes the saved lesson; it is not a second course catalog. Prerequisites are recommendations rather than hard locks.

## Implemented behavior

- First-time and returning Home, real curriculum previews, mastery metrics, saved activity and one shared recommendation policy.
- Ordered module roadmap, module details, lesson/concept search and difficulty/module/status filters.
- Runnable teaching examples, contextual authored walkthroughs and one lesson stage stepper.
- Desktop task/editor split, stacked tablet/mobile workspace, accessible schema drawer and inline results.
- Real Run Query without grading, separate Check Answer with attempt recording, syntax errors and grounded grader feedback, row/column evidence, expected-output disclosure and SQLite query plans.
- Three progressive assistance levels, explicit solution reveal and persistent per-challenge classification. Normal teaching examples do not mark attempts guided. Revealing expected output after a recorded independent solve never removes the solve.
- Fresh retakes use the existing validated changed fixture plus additional safe value changes. They retain the authored concept/task and require general SQL; they are not a new bank of authored questions. Retake guidance history remains saved.
- Mastery requires two independent challenge solves and a successful concept check. Legacy mastery is explicitly preserved rather than relabeled as a newly passed check.
- Dedicated project briefs and ordered milestones, separate drafts and completion records, bounded checked result snapshots, SQL export and JSON project summaries. All milestone criteria must pass to complete a project.
- Deterministic recommendations prioritize active work, repeated prerequisite difficulties, due reviews, unfinished concepts, eligible projects and next lessons. No AI personalization claim.
- Spaced reviews use the authored concept check: initially one day after mastery, then 3/7/21 days after successful reviews; unsuccessful review returns to one day. Reviews never revoke mastery.
- All five optional tools retain their existing real behavior, including fresh-run labs, plan comparisons, reference-only dialect syntax and educational warehouse lineage/catalog/recovery guidance.
- Light/dark/system themes, coherent outline icons, semantic controls, visible focus, dialog/drawer focus handling, live grading status, reduced motion and safe-area spacing.
- Editor copy, confirmed reset, indentation and execution shortcuts. The same textarea is retained across same-draft workspace rerenders to preserve its native editing history where possible. Theme changes do not recreate the editor.

## Persistence and migration

The existing `sql-studio-v1` localStorage key now contains a version-3 envelope. It separates stats/history, activity, sessions, SQL drafts, attempts/exposures, project deliverables, review schedules and preferences. Existing independent solves, successful checks and grandfathered legacy mastery are preserved. Project milestone credit previously derived from genuinely mastered mapped lessons is migrated as well; no old SQL or result snapshots are invented. Migrated project pages explain that earlier versions did not save deliverables. Existing session SQL drafts are recovered when available; vanished session drafts from a closed browser cannot be reconstructed.

Version-1/2 progress import remains supported. Version-3 import also contains drafts, guidance, projects and reviews, and rejects invalid record containers/drafts or unsupported versions. Partial local records are normalized defensively. Imports are parsed/validated before replacing the active model. Export includes the full envelope. No migration clears storage. The explicit user-confirmed reset affects only SQL Studio’s saved learning work.

Each SQL execution still begins with a fresh database. Project milestones save their SQL and checked result snapshots; they do **not** pretend to retain created tables between runs. Write tasks include their complete setup script. Playground and Engineering Lab drafts are separate from project drafts. Execution serial guards and worker cleanup prevent late results from overwriting a newly opened screen.

## Design

System sans-serif interface and local monospace SQL fallback. Headings 26–28px, body 14–16px, SQL 14px desktop/16px mobile, restrained 12–14px surfaces, 44px touch targets, 8px spacing with 4px refinements.

| Token | Light | Dark |
|---|---|---|
| Background | `#F7F9FC` | `#0B1018` |
| Primary surface | `#FFFFFF` | `#141D29` |
| Secondary surface | `#F1F5F9` | `#1B2634` |
| Primary text | `#101828` | `#F5F7FB` |
| Secondary text | `#667085` | `#A1AEC2` |
| Border | `#E2E8F0` | `#2B394B` |
| Accent | `#405AE5` | `#96A7FF` |
| Soft accent | `#EEF2FF` | `#252F4D` |
| Success | `#16865D` | `#5DD6A6` |
| Error | `#B84040` | `#FF8E8E` |
| Warning | `#B77925` | `#E9B95D` |

Desktop (1200px+) uses a persistent/collapsible sidebar and task/editor split. Tablet (768–1199px) uses a narrower sidebar and stacked workspace. Mobile (<768px) uses top menu, four-item bottom navigation, a compact question directly above the editor and independently scrolling result tables. Viewport-keyboard detection hides bottom navigation during editing when detectable. Actual phone keyboard behavior still requires device testing.

## Verification evidence

Commands executed successfully:

| Command | Evidence |
|---|---|
| `node verify.cjs` | Original curriculum, two-fixture challenges, reference queries and advanced grading edge cases |
| `node verify-engine.cjs` | All 176 answers against original/changed fixtures, 88 references, 204 walkthrough stages, plans, object contracts, isolation and warehouse negatives |
| `node verify-ui.cjs` | Existing state/mastery/navigation regressions retained |
| `node verify-responsive.cjs` | Existing responsive-flow state regressions and CSS structure; not browser layout QA |
| `node verify-v2.cjs` | New Home→example→run→two checks→quiz→complete journey; syntax/result failures; guided/fresh retry; stage/draft isolation; all routes; project work and real completion; diagnostic isolation; reviews; migration/import/export; theme switching; stale result cancellation; every authored answer on the fresh-retake fixture |
| `node verify-design.cjs` | Required responsive CSS structures, early theme bootstrap and primary text/control token contrast |
| `node --check dist/app.js`, `dist/learning-state.js`, `dist/ux.js` | JavaScript syntax |

`verify-v2.cjs` uses a VM DOM harness and the **real sql.js engine**, not mocked SQL output. It is application-logic journey testing, not browser E2E. Main token contrast ratios are light body 17.75:1, light secondary 4.54:1, light primary button 5.51:1, dark body 15.82:1, dark secondary 6.81:1 and dark primary button 7.83:1. These are selected color-pair checks, not a complete WCAG conformance claim.

**Unverified:** rendered desktop/tablet/320/375/390/430px layouts; real mobile keyboards and landscape; screen-reader behavior; visual focus/dialog interactions; complete browser back/forward and native undo/copy behavior; screenshot evidence. The required browser-testing capability was unavailable in this environment. No screenshots or browser results have been fabricated. The acceptance brief’s visual/browser/device evidence therefore remains outstanding.

## Walk through the experience

**New learner:** Home explains the course and offers Start learning, optional assessment or Browse. Start opens SELECT at Understand. Read the idea, inspect schema and run the teaching example. Try it yourself moves to Practice with the question beside/above the editor. Run explores actual output; Check grades. After the first independent solve, move to challenge two. After both, Review asks the concept question. A correct answer reaches Complete with module mastery and the next lesson. Projects and tools remain optional.

**Returning learner:** Home shows the last lesson or project activity, its stage and independent progress. Continue restores that challenge’s SQL draft and stage. Failed checks show actual evidence; hints mark only the current challenge attempt guided. A fresh-data retry offers independent practice. Progress shows recorded mastery, error categories, review dates and project work. A project opens its own brief/milestones and resumes its separate saved SQL. Export transfers the local learning model to another browser.

## Remaining product scope

No cloud sync, AI tutor, non-SQLite execution, persistent project database snapshots or live warehouse pipeline is claimed. Diagnostic uses a fixed small set of actual representative challenges; it is optional placement, not module mastery. Reviews currently assess conceptual recall with existing quizzes rather than a separate spaced SQL exercise bank. Fresh retakes vary data, not the authored task wording. Project summaries are JSON, while SQL deliverables export as `.sql`. Browser/device QA and visual evidence are required before asserting all acceptance criteria are met.
