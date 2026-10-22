# Current state audit

Investigation: 2026-10-20. Scope: read-only inspection of the supplied local working tree. **Verified** means source inspected, not behavior demonstrated in a browser. Existing working-tree changes are part of the inspected baseline. No builds, tests, generators, installs, or deployment were performed for this audit. Passing test results, deployed revisions, measured accessibility, and production performance remain **unknown**.

**Snapshot caveat:** concurrent Python curriculum/registry edits were detected after inspection; see [verification](VERIFICATION.md). The engine, grading, progress and platform files supporting the main recommendations were not among the detected changed paths. Content details describe inspection-time source, not a frozen repository snapshot.

## Architecture that exists

| Area | Verified source and behavior | Consequence for V2 |
|---|---|---|
| Application | `package.json`: Next 15.5.9, React 19.1, CodeMirror 6 packages, Zustand, sql.js, Pyodide. App Router under `src/app/`. | Extend this application; no evidence justifies replacing framework or introducing services. |
| Subjects | `src/platform/subjects.ts`: typed catalog, availability, destinations, `lessonRef`/`parseLessonRef`; SQL available, Python next, others planned. | Registry is a sound starting point; register capabilities and publication state rather than separate applications. |
| SQL lessons | `src/content/index.ts`: outline mapped through `applyCanonicalLesson`; `lessonFixture` combines versioned canonical database, overlays and mutations. `src/features/rt/pages/Lesson.tsx` renders the lesson flow. | Keep authored lesson identities and canonical fixtures. Content already separates ordering from dataset-bound teaching. |
| SQL practice | `src/content/question-bank/types.ts`: stable bank IDs, versions, topic tags, prerequisites, difficulty rationale, write/predict/debug, equivalent and wrong answers, changed-data fixtures, plan/state/repeat checks. `src/features/rt/pages/Practice.tsx`, `src/features/practice/PredictionWorkspace.tsx`. | Independent practice is already richer than a generic text-and-test form. Preserve its distinctions. |
| SQL projects | `src/content/projects/types.ts`: orientation/checkpoint/exploration/build/synthesis/report stages with requirements, findings and evidence. `src/features/rt/projects/ProjectWorkspace.tsx` uses current evidence, build setup and report exports. | This is already an investigation/report workflow, not merely a list of lesson challenges. |
| SQL labs | Routes `/sql/playground`, `/sql/playground/[dataset]`, `/sql/lab`, `/sql/query-performance`, `/sql/syntax`; implementations in `src/features/rt/pages/`. | Reuse actual tools in a subject labs catalog; avoid inventing an unrelated lab engine. |
| Active Python | `src/app/python/learn/[slug]/page.tsx`, practice and project route counterparts import `src/content/python-v2/content.ts` and `src/features/python/*`. | These are the active content/screens for V2 evaluation. Older `features/py` is not wholly dead: active Workbench imports its `PyEditor`. |
| Python publication | `pythonRunnerEnabled` in `src/platform/python-runner.ts` enables development only and rejects Vercel production/preview. `isVisible` in `src/content/python-v2/content.ts` admits published items, plus sufficiently reviewed statuses in development. Routes call `notFound` when gated. | Locally authored modules and project definitions must not be described as publicly launched. |
| Python workspaces | `src/features/python/Workbench.tsx`: file tabs, editable/read-only content, Run/Check/Stop/Reset, streamed output, files, tests, optional tables/charts/errors, stacked or columns layouts. Lesson/Question/Project screens supply context. | Existing evidence favors specialized page composition around shared workbench components. |
| Python projects | `src/features/python/Project.tsx`: project overview, milestone rail, learner files carried across milestones, help and milestone checks. `src/lib/python-progress-v2.ts` stores file drafts and milestone passes. | Preserve cumulative files; add evidence freshness before treating historic passes as validation of current files. |
| Older Python lineage | `src/content/python/`, `src/features/py/projects-v2/`, `src/lib/python-progress.ts` and separate project state remain present. Older project `state.ts` contains snapshot-bound evidence and `canDeliver`. | Trace consumers before consolidation. Existing useful behavior is not necessarily in the currently routed implementation. |

## Execution and grading

**Verified SQL:** `src/engine/sql-client.ts` exports `executeSql`, `cancelSql`, `databaseSeed`, `databaseOf`, preload and boot-error helpers. It distinguishes boot, dataset-load, run and check budgets (12-second boot, 60-second dataset load, 3-second Run, 8-second Check constants). Its worker protocol lacks request IDs; overlapping execution terminates the previous worker. `public/vendor/engine.js` checks downloaded database SHA-256 and gives databases their own copies. `src/engine/grading.ts::compareResults` preserves SQL output comparison semantics; worker/vendor grading and plan validation also participate. A replacement must preserve the complete call chain, not just the TypeScript comparison helper.

**Verified Python:** `src/engine/python/client.ts::runPython` creates/discards interpreters, prepares package sets and hash-checked file mounts, streams output, exposes structured tables/files/errors, supports stop and timeout, and has a 64 MiB mount limit. `src/engine/python/grading.ts` defines typed checks, function cases, comparison policies, public examples, `probeFor`, `checkPython`, and `gradePython`. Hidden flags control feedback visibility; client-delivered checks are not a confidential assessment boundary.

**Important discrepancy:** the comment in `src/platform/python-runner.ts` says same-origin worker isolation is pending. Current `src/engine/python/client.ts` imports `createSandboxWorker`, and `src/engine/python/sandbox.ts` creates an `iframe sandbox="allow-scripts"`; `src/platform/python-sandbox.ts::sandboxPolicy` defines an opaque-origin runner CSP. This establishes that isolation work exists locally. It does **not** establish that the deployed runner is safe or that browser/network/storage escape tests passed. Keep the launch gate until runtime-specific evidence is collected; do not describe the code as either absent or already proven secure.

## Editors, layout and observable limitations

`src/features/rt/Editor.tsx` provides schema-aware SQLite completion, line wrapping, shared theme, aria label, Mod+Enter Run and Shift+Mod+Enter Check. Automatic completion is suppressed on coarse-pointer devices. `src/features/py/PyEditor.tsx` shares CodeMirror/theme, adds Python indentation, error-line decorations cleared on edit, focus/go-to-line/replace-all APIs, and Escape then Tab focus escape. This is meaningful reusable infrastructure; no inspected evidence motivates an immediate Monaco migration.

`src/app/sql/rt.css` contains responsive project layouts and narrow-screen stacking; `src/app/python/p2.css` supplies Python layout rules. Source-level media queries are **not** a mobile usability test. Virtual keyboard occlusion, drag target usability, screen reader announcements, focus after completion and all-browser tab behavior remain unknown.

`Workbench` stores `ran` and `report` separately from files. Its inspected render/run/check flow does not bind these results to a source snapshot or clear them on each edit. **Inference:** an old successful check can remain visible beside edited code. SQL project evidence is more explicit: `ProjectWorkspace` compares fingerprints and labels saved findings from earlier queries. Prefer bringing this proven concept to shared result presentation, not discarding saved evidence.

Python Workbench exposes Stop during Run; Check disables Run and does not render the same Stop action. Engine cancellation exists below it. **Proposal:** expose cancellation consistently for potentially long grading; assess cancellation as incomplete assessment rather than learner failure.

## Persistence is already sophisticated, but inconsistent

- SQL `src/lib/learning-state.ts`: `sql-studio-v1`, hydration write guard, `mergeStorageWrite`, save-failure signal, migration/import/export, assistance exposures, independent questions, review sessions and tracks. `isMastered` and `milestoneDone` require two independent solved variants and a check/legacy flag.
- Current SQL project workflow persists stage drafts/evidence/findings through keys derived by `src/features/rt/projects/evidence.ts`; do not infer its state exclusively from the older numeric `LearningState.projects` structure.
- Active Python `src/lib/python-progress-v2.ts`: separate `runtime-python-v2`, typed IDs, lesson/question versions, drafts, assisted/independent outcomes, project files, playground state and hydration guard. Old-version lessons/questions are omitted by normalization, including their contained drafts.
- Earlier Python keys `runtime-python-v1` and `runtime-python-projects-v2` require explicit preservation/inventory during any eventual migration. Active store documentation explicitly says it does not read them.

## Test inventory and what it proves

Source tests exist for grading, content contracts, progress, SQL projects, Python sandbox/runtime, dataset contracts and UI journeys. Relevant examples: `tests/python-progress-v2.test.ts`, `tests/python-sandbox.test.ts`, `tests/python-grading.test.ts`, `tests/projects-contract.test.ts`, `tests/projects-canonical.test.ts`, `tests/canonical/`; browser scripts include `tests/e2e/axe.mjs`, `layout.mjs`, `python-isolation.mjs`, `python-project-cumulative.mjs`, `canonical-network.mjs`, `dataset-benchmarks.mjs`. They establish validation intent, not a green baseline. No coverage percentage or passing claim is made.

Do not run the development/build scripts merely to inspect: `package.json` hooks run dataset builders and copy Pyodide files; `datasets/build.mjs` writes generated metadata/assets and removes older per-domain asset files. Such commands would violate this research-only boundary.

## Decision-ready recommendations

| Recommendation | Problem/evidence | Alternative and tradeoff | Compatibility / complexity / timing |
|---|---|---|---|
| Keep three workspace compositions on shared primitives | Lessons, independent problems and investigation projects already have different structures; shared CodeMirror/theme and Workbench exist. | One universal page reduces superficial duplication but creates mode-condition complexity; completely separate editors repeat keyboard/state bugs. | Retain current routes and editors. Medium; next, after UX state specification. |
| Wrap engines with lifecycle/result contracts | SQL and Python both support cancellation, but have different worker, output and check models. | Full rewrite adds regression risk; wrapper adds a small mapping layer. | Existing engines remain authoritative. Medium; now define, next migrate consumers. |
| Preserve old progress and label current evidence | Python normalization drops old versions; Workbench result state lacks snapshot binding. | Resetting progress is simpler but loses user work; keeping old credit as current can misrepresent learning. | Archive versions and preserve drafts while marking reassessment separately. Medium; now requirement. |
| Audit active versus legacy consumers before deduplication | Two Python trees, shared old editor, multiple persistence keys, old and new SQL project shapes. | Directory-name-based cleanup risks deleting live dependencies. | No deletion in V2 preparation without consumer map. Low research / medium eventual consolidation; now. |
| Verify Python isolation before enabling publication | Source contains opaque-origin runner and dev-only gate, with stale explanatory comment. | Assume local tests imply deployment safety: unacceptable evidence gap. | Keep gate; verify actual headers, origin, worker, JS bridge, network, storage, cancellation. Medium-high; launch blocker. |
| Reuse datasets through common manifest views | SQL/Python already have provenance, checksums and versioned manifests. | Replace both registries with a new database service: unsupported operational cost. | Adapter views first, immutable IDs preserved. Medium; next. |

See [dataset architecture](08_DATASET_ARCHITECTURE.md) and [progress model](09_PROGRESS_AND_SKILLS.md) for preservation and contract details.
