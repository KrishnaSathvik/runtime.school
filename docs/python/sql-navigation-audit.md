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
