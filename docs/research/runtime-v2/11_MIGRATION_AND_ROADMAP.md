# Incremental migration and delivery roadmap

Research date: **2026-10-20**. Every milestone below is a **proposal for future implementation**, not work authorized or performed in this research. No builds, tests, generators, production changes or deployments were executed for this document. Source evidence and known gaps are in [01](01_CURRENT_STATE_AUDIT.md); final architecture is in [10](10_PLATFORM_ARCHITECTURE.md).

## Order and invariant

**Now:** protect working SQL, make learner state/recovery expectations explicit, investigate Python's production isolation and define preservation contracts. **Next:** introduce thin shared contracts, consistent workspaces, safe Python publication and cross-subject progress/catalog views. **Later:** add paths and specialized runtimes only when real content and execution requirements justify them.

Migration is additive and surface-by-surface. Keep current content counts, lesson/question/project definitions, native IDs, SQL semantics and earned progress unchanged. A reviewed fix to a demonstrated defect is distinct from an architectural migration and needs its own compatibility decision. Do not combine a new engine, grader, editor and storage format in one release.

Complexity estimates are qualitative: **S** contained change; **M** coordinated modules and regression work; **L** new infrastructure or broad assurance. These do not imply durations, staffing commitments or measured cost. Risks can move a milestone between categories.

## Now — establish safety and continuity

### N1. Establish the real baseline and preservation inventory — S/M

**Problem/evidence:** source contains multiple active/legacy Python implementations, SQL project state in draft keys, test scripts with generating hooks and differing availability declarations. Directory names and historical reports are not sufficient evidence. See [01](01_CURRENT_STATE_AUDIT.md) and [09](09_PROGRESS_AND_SKILLS.md).

- **Conceptual change:** maintain a reviewed consumer/route/store map and a baseline behavior inventory before extracting shared abstractions. Inventory old progress schemas and exported fixtures without inspecting personal learner data unnecessarily.
- **Affected files:** [`subjects.ts`](../../../src/platform/subjects.ts), [`Shell.tsx`](../../../src/features/rt/Shell.tsx), [`app/page.tsx`](../../../src/app/page.tsx), [`learning-state.ts`](../../../src/lib/learning-state.ts), [`python-progress-v2.ts`](../../../src/lib/python-progress-v2.ts), [`python-progress.ts`](../../../src/lib/python-progress.ts), [`projects-v2/state.ts`](../../../src/features/py/projects-v2/state.ts), route consumers documented in the audit.
- **Dependencies:** explicit implementation authorization after research; identify a clean baseline separate from the pre-existing dirty working tree. Inspect generator effects before any future development/build command.
- **Risks:** deleting still-used `features/py/PyEditor`; exporting only legacy SQL project fields; confusing authored Python content with public launch.
- **Acceptance:** every active route names its source/engine/store; all known storage keys and version rules mapped; SQL reference scenarios and existing test intent cataloged; runtime deployment provenance recorded; baseline test results reported only after they are actually run in a future authorized phase.
- **Explicitly unchanged:** all source/curriculum/runtime behavior during inventory; no dependency upgrades, cleanup or dataset regeneration bundled with it.

### N2. Define honest result and save-state behavior on existing surfaces — M

**Problem/evidence:** SQL has save-failure reporting and project evidence fingerprints; active Python milestone passes are not tied to current files and Python store write failures are less visible. Python Check does not expose the same Stop action as Run. See [01](01_CURRENT_STATE_AUDIT.md), [05](05_EDITOR_WORKSPACE_UX.md), [09](09_PROGRESS_AND_SKILLS.md).

- **Conceptual change:** distinguish preparation, execution, assessment and persistence; preserve old results but label edited source unverified; expose recoverable unsaved state; support cancellation of potentially long checks through existing engine capabilities.
- **Affected files:** [`Workbench.tsx`](../../../src/features/python/Workbench.tsx), [`Results.tsx`](../../../src/features/python/Results.tsx), [`Cells.tsx`](../../../src/features/rt/Cells.tsx), [`ProjectWorkspace.tsx`](../../../src/features/rt/projects/ProjectWorkspace.tsx), [`evidence.ts`](../../../src/features/rt/projects/evidence.ts), both active progress stores.
- **Dependencies:** N1 identifies current semantics; agree on immutable submission identity and [05 lifecycle states](05_EDITOR_WORKSPACE_UX.md). UI feedback may improve before full shared-adapter extraction.
- **Risks:** clearing valid historical credit on edit; marking cancellation as a failed answer; losing edits through delayed reset; announcing “saved” after quota failure.
- **Acceptance:** edit during Check leaves the evaluated snapshot distinct from current code; late/cancelled results cannot award current completion; a blocked save has export/retry recovery; reset/undo preserves current input reliably; Stop leaves a usable next run. Exercise real runtime scenarios in future authorized validation, not only mocked workers.
- **Explicitly unchanged:** installed CodeMirror family, authored answers/tests, existing historical achievements and runtime execution semantics. No mandatory account or storage migration.

### N3. Verify Python production isolation before any launch — M/L, blocking gate

**Problem/evidence:** opaque-origin iframe/worker isolation exists locally; development/publication gates remain. Source inspection and fake-worker tests are not production security evidence. Stale same-origin commentary must not be confused with current implementation. [06](06_EXECUTION_ENGINE_ARCHITECTURE.md) defines the complete gate.

- **Conceptual change:** produce deployment-specific evidence for the current isolation design; remediate concrete failures before enabling a public runtime. Keep the gate closed while evidence is incomplete.
- **Affected files:** [`python-runner.ts`](../../../src/platform/python-runner.ts), [`python-sandbox.ts`](../../../src/platform/python-sandbox.ts), [`python/sandbox.ts`](../../../src/engine/python/sandbox.ts), [`python/client.ts`](../../../src/engine/python/client.ts), [`python-sandbox.mjs`](../../../public/vendor/python-sandbox.mjs), [`python-worker.mjs`](../../../public/vendor/python-worker.mjs), [`python-isolation.mjs`](../../../tests/e2e/python-isolation.mjs).
- **Dependencies:** N1; an authorized representative deployment/test environment and explicit supported-browser matrix. Any deployment or environment changes belong to a separately authorized implementation phase.
- **Risks:** browser-specific CSP behavior, JS bridge escape surfaces, storage/network access, worker/process exhaustion, rich-output/file resource limits, package bootstrap regressions. No claimed browser hard-memory boundary where one is unavailable.
- **Acceptance:** actual headers/origins/message validation inspected; storage and exfiltration probes fail safely; output/artifact/preparation budgets recover; stop/timeout/crash cycles do not contaminate later runs; approved packages/files/grading still work; supported desktop and real mobile outcomes recorded; release owner reviews evidence and rollback mechanism. A failed isolation requirement blocks launch, regardless of UI completeness.
- **Explicitly unchanged:** SQL execution and public SQL availability; Python remains unavailable publicly until acceptance. Do not default to remote Python merely because proof takes work.

### N4. Define preservation and reproducibility contracts — S/M

**Problem/evidence:** Python normalization drops old-version records/drafts; existing SQL asset builder can remove historical files; multiple dataset identity forms already exist. [08](08_DATASET_ARCHITECTURE.md), [09](09_PROGRESS_AND_SKILLS.md).

- **Conceptual change:** specify raw-store backup, namespaced aliases, historical/current credit and retention policy; pin source/content/runtime/fixture/rubric identity separately.
- **Affected files:** both active progress stores, legacy Python stores, [`learning-map.ts`](../../../src/data/datasets/learning-map.ts), [`learning.ts`](../../../src/data/datasets/learning.ts), [`python-v2/datasets.ts`](../../../src/content/python-v2/datasets.ts), future use of [`datasets/build.mjs`](../../../datasets/build.mjs).
- **Dependencies:** N1 inventories identities; dataset owners define retention obligations before exact replay is promised.
- **Risks:** assuming similar names imply equivalent data; overwriting raw backups; “migration” silently changing completion policy.
- **Acceptance:** documented mapping for every recognized identity and recoverable archive for unmapped records; raw payload backups cover project draft evidence; old content drafts remain recoverable; historical asset retirement is explicit rather than silently substituted.
- **Explicitly unchanged:** native IDs, fixture bytes, existing dataset formats, lesson counts, grading rules and old storage keys. This milestone does not rebuild datasets.

## Next — integrate proven shared foundations

### X1. Add capability-aware execution and grading wrappers — M

- **Conceptual change:** translate native SQL/Python clients into the shared lifecycle/evidence envelopes in [06](06_EXECUTION_ENGINE_ARCHITECTURE.md) and [07](07_GRADING_SYSTEM.md); preserve specialized evaluation.
- **Affected files:** [`sql-client.ts`](../../../src/engine/sql-client.ts), [`engine.js`](../../../public/vendor/engine.js), [`grading.ts`](../../../src/engine/grading.ts), [`python/client.ts`](../../../src/engine/python/client.ts), [`python/grading.ts`](../../../src/engine/python/grading.ts), consumer controllers in Cells/Workbench.
- **Dependencies:** N1/N2 contracts, N4 version identity. Development-only Python adaptation may proceed before N3 passes, but public launch cannot.
- **Risks:** losing SQL changed-data/state/plan checks; conflating display truncation with graded result limits; mapping unavailable to incorrect; new wrapper defeating cancellation or fresh-run semantics.
- **Acceptance:** reference and known-misconception cases retain their outcomes; valid alternative solutions remain accepted; full results are graded before display truncation; structured Python values/files persist; late responses and cancellation are scoped to run ID; descriptor capabilities match actual adapters; original grading tests plus selected real-runtime integration checks pass in future validation.
- **Explicitly unchanged:** sql.js, Pyodide, installed editor, existing comparison policies and public routes. No universal interpreter or remote service.

### X2. Compose lesson, challenge and project surfaces from shared primitives — M

- **Conceptual change:** adopt [05](05_EDITOR_WORKSPACE_UX.md) purpose-specific layouts, sharing editor, result, dataset, save-status and lifecycle behavior only where proven common. Keep editorial lessons readable.
- **Affected files:** [`rt/pages/Lesson.tsx`](../../../src/features/rt/pages/Lesson.tsx), [`rt/pages/Practice.tsx`](../../../src/features/rt/pages/Practice.tsx), [`rt/projects/ProjectWorkspace.tsx`](../../../src/features/rt/projects/ProjectWorkspace.tsx), [`python/Lesson.tsx`](../../../src/features/python/Lesson.tsx), [`Question.tsx`](../../../src/features/python/Question.tsx), [`Project.tsx`](../../../src/features/python/Project.tsx), Workbench, both editor wrappers and subject CSS.
- **Dependencies:** N2, X1 lifecycle; use one bounded surface first and compare before expanding.
- **Risks:** over-generalized configuration; changing task content while changing layout; keyboard focus loss; mobile viewport/IME regressions; eager loading of Python into SQL.
- **Acceptance:** all specified lifecycle states have meaningful recoverable UI; keyboard-only Run/Check/data access and editor escape work; screen-reader results use concise announcements; real iOS/Android keyboard and selection tested; desktop/tablet layouts preserve task context; refresh resumes draft without rerunning code; SQL pages do not require Python runtime assets.
- **Explicitly unchanged:** lesson counts and two-challenge requirements for current content, question banks, authored projects, SQL routes, CodeMirror and available engine capabilities. Wireframe dimensions remain hypotheses until validated.

### X3. Introduce catalog, dataset and progress read adapters — M

- **Conceptual change:** one readiness-aware catalog view; stable namespaced references; common dataset metadata view; My Learning selectors over existing stores; then bounded new writes with recoverable migration.
- **Affected files:** [`subjects.ts`](../../../src/platform/subjects.ts), [`Shell.tsx`](../../../src/features/rt/Shell.tsx), [`app/page.tsx`](../../../src/app/page.tsx), [`Landing.tsx`](../../../src/features/rt/pages/Landing.tsx), SQL/Python content registries, dataset views and progress stores named above.
- **Dependencies:** N4 preservation; N1 route/visibility inventory; X1 evidence identity. Do not require physical store unification.
- **Risks:** exposing unready Python routes, granting duplicate credit through paths, forgetting legacy project findings, changing review dates, silently overwriting another tab's draft.
- **Acceptance:** Explore displays only usable destinations; My Learning resumes existing SQL and eligible Python work without login; one activity referenced twice produces one achievement; import/export round-trips historical drafts/assistance/reviews/project evidence; migration is idempotent and leaves original keys intact; conflicting drafts are recoverable; catalog and actual runtime gate agree.
- **Explicitly unchanged:** SQL destination priority, canonical dataset bytes, IDs and historical credit. No empty future-subject tools or mandatory account.

### X4. Verify project evidence and integrate existing labs — M

- **Conceptual change:** source-bound current milestone evidence and cumulative checks for executable deliverables; preserve stage-specific writing/exploration completion; organize existing tools through the subject catalog.
- **Affected files:** SQL project workspace/evidence/build helpers, Python [`Project.tsx`](../../../src/features/python/Project.tsx), active Python project state, existing SQL tools and Python [`Playground.tsx`](../../../src/features/python/Playground.tsx), [`PerformanceLab.tsx`](../../../src/features/python/PerformanceLab.tsx), [`DatabaseLab.tsx`](../../../src/features/python/DatabaseLab.tsx), [`Comparator.tsx`](../../../src/features/python/Comparator.tsx).
- **Dependencies:** X1 snapshot/grade envelopes, N4 preservation, X3 dataset views.
- **Risks:** requiring code checks for orientation/report stages; confusing old passes with current verification; tool handoffs overwriting assessed drafts; performance claims based on a single timing.
- **Acceptance:** editing a shared file marks affected current verification stale but preserves history; current executable deliverable replays from its pinned fixture; report/synthesis requirements retain their authored rules; export includes source and provenance; lab handoff is reversible and does not award mastery for arbitrary Run; simulated capabilities are labeled.
- **Explicitly unchanged:** project definitions, milestone counts and existing tools' genuine execution boundaries; no requirement that every project use multiple files.

### X5. Publish Python as the second integrated subject — M, gated release

- **Conceptual change:** make Python available through the catalog/homepage/subject shell only when execution and content gates pass. This is a release decision, not a request to remove a feature flag now.
- **Affected files:** runtime gate, `subjects.ts`, `app/page.tsx`, Shell navigation, Python route visibility in [`content.ts`](../../../src/content/python-v2/content.ts), and associated publication metadata.
- **Dependencies:** N3 security gate, N2 recovery, X1/X2 applicable behavior, X3 availability and preservation, representative lesson/practice/project content review. X4 cumulative current-evidence behavior is required wherever the launch advertises verified project completion.
- **Risks:** assuming implementation presence equals readiness; enabling preview/production without actual header/package tests; broad launch of unreviewed items.
- **Acceptance:** published activities open through intended routes; real run/check/reset/cancel/refresh journeys pass in supported browsers; content reference and misconception cases validated; save failures are explicit; monitored rollout has a tested rollback gate; SQL behavior and saved progress unchanged. Only reviewed usable content becomes available.
- **Explicitly unchanged:** future subjects remain planned; no mandatory cloud runtime, account, subscription or AI tutor. SQL remains fully available throughout rollback.

## Later — require a demonstrated learning or execution need

| Milestone | Concept and affected boundaries | Dependencies / risk | Acceptance / explicitly unchanged | Complexity |
| --- | --- | --- | --- | --- |
| L1. Cross-subject paths and richer skill review | Catalog/path references; SQL topics/Python concepts; progress selectors | X3 and two usable subjects; risk duplicated content/overstated mastery | Paths reuse existing IDs; delayed transfer evidence distinguishes subjects; old review history/achievements retained; no curriculum cloning | M |
| L2. Notebook and advanced labs | New composition over controller, dataset and execution adapters | Concrete stateful exploration need; execution-order, trust and reproducibility risk | Explicit kernel/session/restart behavior; clean Run All reproduces assessed artifacts; safe output rendering; lessons/challenges remain unchanged | L |
| L3. Larger analytical SQL | Optional DuckDB-Wasm adapter and separately labeled fixtures | Measured SQLite limitation; dialect/semantic drift | Documented gain on representative workload; compatible activities replay; existing SQLite path stays authoritative | M/L |
| L4. Genuine remote runtimes | Isolated executor adapter, trusted grader where required, resource/cost policy | Actual Spark/OS/GPU/live-agent requirement; tenant security and operating cost | Denied-by-default egress, cleanup and enforced budgets; honest runtime labels; trusted evaluator owns verdicts; local SQL/Python remain usable | L |
| L5. BI/ML/RAG/agent assessment | Artifact evaluators, dataset splits, objective checks and reviewed rubrics | Real authoring/evaluation tools and reference corpus; subjective scoring/calibration risk | Claims name tested behavior and environment; simulations separated from live execution; existing local practice not rebranded as certification | L |
| L6. Optional account synchronization | State sync adapter, conflict recovery and export/delete | User need demonstrated; privacy/operational obligations | Anonymous local use still works; conflicts retain recoverable versions; no forced migration of SQL users | L |

Each later milestone requires a fresh decision against usability, learning effectiveness, correctness, grading reliability, security, accessibility, performance, maintenance, cost and extensibility. “Future-proofing” alone is insufficient justification.

## Validation, rollback and measurements

Future implementation should run appropriate existing checks after each bounded change, followed by specific integration/device scenarios justified by that change. The current research neither ran nor claims those tests passed. Do not rerun generating scripts casually: current `predev`/`prebuild` hooks write dataset/runtime assets.

Observe separately: preparation latency, execution latency, check completion, cancellation recovery, save failures, draft recovery, visible error clarity and delayed independent transfer. Establish baseline distributions on representative devices before setting numerical performance targets. Immediate pass rate alone can reward easier tests or excessive hints.

Rollback keeps old routes, engines and storage keys available while a new surface is introduced. Back up migration inputs; do not delete historical assets or records during initial rollout. Stop a rollout on data loss, incorrect completion, isolation failure or material SQL regression. Cosmetic parity is not a release gate when learner correctness or preservation is unresolved.

## Internal consistency and final scope check

- Three compositions remain consistent with [05](05_EDITOR_WORKSPACE_UX.md); CodeMirror is retained.
- Existing sql.js/Pyodide are wrapped, not replaced; Python remains launch-blocked until N3 passes.
- Cumulative execution checking applies to executable requirements, not all SQL orientation/exploration/report stages.
- Cross-catalog dataset equivalence requires validation; no dataset rebuild or curriculum rewrite is scheduled implicitly.
- Completion history survives source/content changes; current verification can become stale without deleting achievement.
- Paths, accounts, remote services and advanced subjects are Later, not prerequisites for improving SQL or preparing Python.
- All listed file changes, tests and deployments belong to future authorized work. This assignment produces research documentation only.
