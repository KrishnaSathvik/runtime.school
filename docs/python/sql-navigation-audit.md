# SQL design and workflow parity

The initial navigation-only alignment did not match SQL's actual screens. This revision compares screenshots and reuses the same SQL presentation classes instead of retaining the separate Python notebook layout.

## Shared presentation

- The same `rx-task-split`, `rx-brief`, `rx-work`, and `rx-lesson-work` layout: equal desktop columns, stacked mobile content, sticky work area.
- The same title sizing, spacing, task labels, specification rows, editor card header/footer, help controls, tabs, drawer and status band.
- Python fixture records appear in table cards; their original JSON/CSV text remains available inside each card.
- The editor shows output after Run or Check instead of dedicating half the screen to an empty console. Results support Hide, Show, and Close.
- The existing resizable Python workspace/playground still supports its dedicated console layout.

## Learn

Three tabs match SQL: Challenge 1, Challenge 2, Concept check. Passing a challenge advances to the next tab. Passing the concept check opens the next lesson after 900 ms. The separate Complete tab and completion card were removed. Existing saved `complete` tabs fall back to the concept check; no progress identities changed.

The prompt/specification stays above the editor. Hint, Answer and (only after help) Try without help are in the editor footer. Help confirmation and independent-mastery rules remain intact. The lesson prose, runnable examples, and walkthrough stay in the left column.

## Practice

The brief contains the task, specification, expected output and input data. The right column contains the solution editor and help. No standalone Not solved message, unconditional Start fresh attempt, source download, or verified-summary download appears on a question. Successful checks advance to the next question after 900 ms. Output prediction uses the same card treatment and advancement rules.

## Projects

Projects use a brief → milestone → finding → export flow:

- Brief: title, objective, deliverables, skills, scope, start/continue, report link, milestone list; source data on the right.
- All projects drawer groups Brief, milestones, and Export under each project. Previous moves to the previous stop.
- Milestone: task/data on the left, Program/Finding tabs on the right. A passing check opens Finding. Python milestones have one cumulative program rather than SQL's two queries and concept check; no fake tasks were added.
- Findings save in the existing project record's drafts map.
- Export: readiness list, source download, report preview and Markdown report download. A finished report requires current passing evidence and a finding for every milestone. Editing checked code downgrades the report to draft until rechecked. Older passes without saved source evidence require a new check for a finished report.

The Python execution gate, content/grading definitions, stable refs, SQL source and SQL persistence are unchanged. `runtime-python-v1` stays compatible; findings/evidence use additional keys in the existing project drafts map.

## Validation

- `tests/e2e/python-design-parity.mjs`: desktop/mobile light/dark layouts, accessibility, screenshots, saved findings, draft report, real Python lesson checks, help/reset and assisted practice advancement, full project grading, report download, stale-evidence handling, SQL storage isolation.
- `tests/python-entry.test.ts`, `tests/python-file-preview.test.ts`, `tests/python-progress.test.ts`: 22 checks covering entry/resume, CSV/JSON previews and mastery/storage semantics.
- Scoped application TypeScript, changed-file ESLint, diff checks.
- Screenshots and browser results: `docs/python/screens/sql-parity/`.

Local changes only; no push or deployment.

## Editor balance follow-up

The outer columns were already equal, but the task card and editor minimum height pushed Learn's Run/Check row below the viewport. Python learning workspaces now fit within the visible right column. Long lesson task cards scroll independently, leaving room for the editor and its controls.

As clarified by the user, the internal 50/50 requirement means code above and output below. When output is open, each receives an equal grid row; hiding/closing results gives the space back to code. Output remains keyboard-scrollable. Desktop pages retain equal left/right columns; narrow mobile pages stack naturally.

Removed Preparation lessons from project briefs and the legacy project renderer, together with obsolete preparation copy. The playground and standalone workspace also default to equal columns/panes. The resizable split now subtracts its divider before calculating shares, so a nominal 50% is actually equal; user-adjusted saved ratios remain adjustable/resettable.

Validation: `tests/e2e/python-editor-balance.mjs` measures equal page columns, equal code/output height, visible controls, and accessibility for Learn, Practice, and Projects at 1440px and 1024px widths. Results and screenshots are in `screens/editor-balance/`. The real-Python design/workflow suite also passed again, including grading, saved findings, report export, and mobile layouts.

## Narrow screens and page scrolling (latest request)

This supersedes the viewport-constrained editor layout above. The user explicitly requested the same change in SQL and Python.

- Correction: Learn, Practice and Projects use equal top/bottom rows at widths up to 700px (including 600px, 390px and 360px). Above 700px they retain equal left/right columns. The mobile brief scrolls within its top half; the editor below grows with the page.
- The brief remains independently scrollable; it is sticky beside the editor on desktop and sits above it on small screens. The right work area, task panels, editor and results grow with their content and use the document scroll; their nested vertical scroll areas and fixed-height clipping were removed.
- Python keeps equal code/results grid rows when output is open. Both rows can grow, so long programs are fully accessible without an editor scrollbar.
- Small-screen spacing and wrapping preserve usable controls; the phone header shows the brand icon to keep SQL's additional Tools control from overflowing.
- Prediction/finding text areas grow with their contents. Data tables may still scroll horizontally to preserve columns.

Validation: `tests/e2e/learning-page-scroll.mjs` exercises both languages and all three sections with 80-line programs at 1440, 768, 600, 390 and 360px. It checks equal desktop columns and equal mobile stacked rows, no page horizontal overflow, page growth and absence of nested editor scrollbars. Phone runs also check equal Python code/results height. Screenshots are in `screens/page-scroll/`. Separate phone checks cover accessibility, real SQL/Python challenge grading, left-brief scrolling and long prediction inputs. Only shared presentation CSS and Python presentation CSS changed; SQL grading and stored progress logic did not change.
