# SQL rebuild implementation log

## Scope and baseline — 2026-10-14

User supplied the complete SQL rebuild brief and execution addendum. Python work is paused. No publication, deployment, paid services, or production infrastructure changes are authorized.

Repository baseline: local `main`, commit `7f5596e`. Existing uncommitted Python workspace/layout changes are outside this work.

Canonical SQL curriculum is `src/content/content-pack.json`; original-site is a historical parity reference. Independent questions and their seeds are authored in `src/content/question-bank/*.ts`. `scripts/question-bank-report.gen.ts` generates manifests, examples, input previews, and question-bank reports through `npm run qb:report`; these outputs must not be edited manually.

Baseline inventory: 10 modules, 88 lessons, 176 lesson challenges, 88 independent questions, 264 total exercises, 249 practice eligible, 252 Write SQL, 6 Predict Output, 6 Debug Query, 11 datasets, 6 tracks, 5 projects, 30 milestone mappings. QUESTION_GAPS contains an older phase narrative (247 exercises) despite the newer canonical inventory; reporting needs reconciliation.

## Architecture findings

- Learn uses the curriculum-wide seed; Practice combines curriculum and bank seeds.
- Playground dataset selection currently filters displayed schema only; all tables remain in one database.
- SQL executes in a Web Worker with a 3-second execution budget and separate boot budget.
- Every request creates disposable databases. Grading executes student/reference queries on independent visible and changed fixtures. DML supports state comparison and repeat checks.
- Table previews are static and keyed by globally unique table names. Isolated datasets must support dataset-specific previews to avoid collisions.
- Existing IDs and draft keys should remain stable; specialized legacy fixtures remain until their replacements pass validation.

## Execution sequence

1. Baseline verification and versioned dataset contracts.
2. Reproducible flagship editions, provenance, quality checks, and isolated loading.
3. Integrate first datasets into workspaces and benchmark in the browser.
4. Classify and migrate curriculum, practice and projects; expand reasoning patterns.
5. Integrate labs and query plans, regenerate documentation, complete product QA.

## Validation

Baseline SQL suite passed: 557 checks across curriculum, question bank, parity, projects, plan validation and SQL client.

## Completion status

Implemented locally; no deployment or publication performed.

- Eleven flagship domains, 33 deterministic/versioned editions, three real licensed source subsets and eight explicitly synthetic packages.
- Dataset-specific execution and previews, lazy large editions, source cards and actual usage links.
- Lessons 13, 24 and 27 migrated; all 88 lessons and 288 exercises have recorded decisions. Original IDs, progress and five guided project sequences retained. Earlier migrated-lesson drafts remain readable and exported; current dataset editions use separate draft keys.
- Twenty-four new bank exercises: 12 Write SQL, six Predict Output, six Debug Query. Total: 288 exercises, 273 practice eligible, 112 independent questions; 264 Write, 12 Predict, 12 Debug. Predict expected-output leakage removed; per-question fixture previews corrected.
- Three open investigations: retail revenue quality, product activation/retention, regional grid balance. Findings, SQL and executed evidence persist; edits invalidate evidence; Markdown export includes provenance and limitations.
- Dataset Lab has isolated, rerunnable staging, constraints, reconciliation and rollback scripts. Two flagship comparisons use real SQLite plans and check equivalent results. Scans are no longer automatically marked bad.
- All 33 editions benchmarked in Chromium with selects, aggregates, windows and joins; every measured query below 3 seconds (maximum approximately 332 ms in the recorded run). Project retention improved from 16 seconds to comfortably below the budget by aggregating once per account.

Validation: 52 SQL/shared test files, 1,310 tests passed; SQL-scoped TypeScript check passed; production build passed; lint passed with eight pre-existing Python warnings and no errors. Dataset browser flows, failed-load recovery, mobile overflow, light/dark screenshots, persistence/export and query plans passed. Project page accessibility scans found no WCAG A/AA violations in the checked states.

Repository-wide `tsc --noEmit` still reports the pre-existing incomplete fixture cast in `tests/python-projects-v2-state.test.ts:5`. `typecheck:sql` explicitly excludes only Python test files; application code remains checked. Python source and the user's existing Python workspace changes were not modified. A shell-quoting mistake briefly included Python tests in a test run; the run was stopped and the exclusion was quoted.

No claim of physical-phone performance or complete accessibility conformance: browser measurements used desktop Chromium with desktop/mobile viewports, and page heap does not include worker WASM memory. No sports dataset was added solely to reach twelve; synthetic replacements are labeled, not represented as BTS, NYC, EIA or Synthea observations. Legacy small fixtures remain intentionally for foundations and specialized project/engineering contracts.

See HANDOFF.md for entry points, reproducibility and remaining repository-wide limitation.
