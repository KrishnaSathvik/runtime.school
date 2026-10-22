# runtime.school V2: research and recommended decisions

Research date: 2026-10-20, America/Chicago (browser artifacts may carry 2026-10-21 UTC). Research and design only. No implementation or production validation is authorized by this report.

## Recommended vision

**Proposal:** runtime.school should be one activity-connected learning platform: understand a concept, practise independently, apply it in a project, explore it in a lab, and return for review. SQL remains fully usable throughout. Python joins when its existing execution and content pass explicit launch gates. Future subjects contribute capabilities and activities to the existing catalog rather than acquiring separate application architectures.

The platform needs **three workspace compositions sharing foundations**, **one capability-aware execution lifecycle with subject-specific adapters**, and **stable references connecting content, fixtures and evidence of learning**. It does not need a replacement editor, a universal language runtime, mandatory accounts or a new backend fleet for V2.

## The three decisions

| Decision | Recommendation | Why | Alternatives and cost |
| --- | --- | --- | --- |
| Workspace | Editorial lessons; challenge workspaces; project workspaces. Share CodeMirror integration, controller state, diagnostics, outputs, dataset/file viewers, shortcuts and draft handling. | Existing SQL/Python already have specialized flows. Reading, isolated problem solving and cumulative engineering have different information needs. See [UX specification](05_EDITOR_WORKSPACE_UX.md). | One configurable giant workspace creates state/configuration complexity; unrelated editors duplicate reliability work. Medium incremental integration; do it next, after explicit state semantics. |
| Engines | Retain sql.js and Pyodide. Add common identifiers, preparation/cancellation lifecycle, typed output and immutable submission identity around existing clients. Keep SQL/Python grading specialized. | Current engines already provide workers, recovery, fixtures and grading. Genuine runtime differences must remain visible. See [engine architecture](06_EXECUTION_ENGINE_ARCHITECTURE.md). | Universal execution semantics obscure correctness; remote-first infrastructure adds unmeasured cost. Medium wrapper work; remote execution later only for demonstrated requirements. |
| Learning graph | Stable activity and skill IDs; versioned content/rubrics; pinned dataset editions; paths reference activities; mastery derives from attempt evidence and assistance. | SQL already distinguishes assisted/independent solves and review. Python version normalization currently discards older records, requiring preservation work. See [learning model](04_LEARNING_MODEL.md) and [progress](09_PROGRESS_AND_SKILLS.md). | Copying activities into each path fragments progress. Replacing all stores at once risks data loss. Medium additive work; preserve/export old records first. |

## What is already good

**Verified in local source:** both subjects use CodeMirror 6; SQL uses a worker-backed SQLite engine with cancellation/recovery and substantive grading; canonical datasets include schema, lineage, checksums and variants; SQL progress includes assistance, review scheduling, export/import and merge behavior. SQL projects contain evidence/report workflows, not merely a completion checkbox. Active Python work includes multi-file editing, rich output, separate Run/Check, tools and an opaque-origin iframe/worker sandbox. See the path/function citations in [current audit](01_CURRENT_STATE_AUDIT.md).

**Verified public observation:** the runtime.school homepage redirected to `www.runtime.school` and exposed a SQL link in this investigation. That limited observation does not establish parity with the dirty local checkout or certify every deployed SQL feature. Python's local gate explicitly denies production execution; production Python safety has not been established here.

These strengths make incremental reuse preferable to a rewrite. The minimum V2 should improve consistency, make state understandable, protect earned progress and launch Python safely.

## What needs improvement

1. **Execution feedback must identify its source snapshot.** A result for revision A can remain useful when the editor contains B, but B must visibly remain unchecked. Failed checks remain meaningful attempt history. Project completion rules vary by stage; a prose reflection must not be forced through a code-pass test.
2. **Drafts, completion, mastery and review are different records.** Preserve historical achievements and older drafts across curriculum revisions; mark compatibility or reassessment separately. Do not copy Python's current version-dropping normalization into the shared model.
3. **Preparation is part of the run lifecycle.** Engine/package/data loading, timeout, Stop and worker failure deserve distinct states. Source inspection identifies Python mount-download budget gaps; implementation and measurement remain future work.
4. **Python production isolation remains a launch blocker.** Local sandbox source and historical reports are useful evidence, not a deployed security proof. Verify actual headers/origin/egress/message/output boundaries and device recovery before opening the gate.
5. **Dataset identity must outlive a build.** Checksums alone do not preserve old editions; the current builder's cleanup policy needs an eventual retention strategy before historical replay is promised.
6. **Client-hidden tests are not confidential tests.** Keep formative browser assessment honest. High-stakes assessment would require a distinct trusted grading boundary and is outside minimum V2.

## What other platforms taught us

Actual REA SQLBolt scenarios reproduced automatic execution, a task success marker and invalid-column feedback. SQLZoo exposed explicit Submit SQL and separate correct-answer/SQL-error feedback. Public JupyterLite browser interaction demonstrated cell execution, next-cell keyboard progression and traceback output. These are useful interaction patterns, not evidence of competitors' private backend architecture. See [evidence](02_REA_RESEARCH_EVIDENCE.md).

The comparison also uses primary platform documentation: DataCamp's guided feedback, Exercism's test-before-submit workflow, LeetCode's Run/Submit distinction, CodeCrafters' cumulative stage checks, Boot.dev's debugging guidance, and WebContainers' runtime/support constraints. Several interactive areas require login or were blocked. No universal accessibility, persistence or mobile-quality ranking is justified. See the per-workflow evidence labels in [comparison](03_COMPETITIVE_COMPARISON.md).

**Proposal:** borrow clarity, not incentives or visual skins. Make Run exploratory and Check evaluative; allow retries without punitive mastery deductions; expose relevant fixtures beside the work; preserve honest failure categories. Notebook execution is valuable for exploratory labs, but hidden cell state is a poor default for reproducible grading.

## How the product fits together

Subject navigation contains Learn, Practice, Projects and currently available Labs/Tools. Global Explore selects available subjects; My Learning aggregates continuation/review when cross-subject progress is ready. Paths appear only when curated paths exist. Do not create seven empty top-level destinations or make planned subjects look runnable.

An activity references objectives, skills, runtime requirements, fixtures and related activities. A project references milestone activities and artifacts; a lab reuses engines and fixtures but does not award automatic mastery. Paths sequence stable references without copying content. A dataset can offer format-specific editions for SQL/Python and later systems only when semantic parity has been verified; current catalogs are not presumed interchangeable.

Future subjects are capability additions. Real PySpark claims require real Spark execution; DuckDB's compatible Spark API is a labeled teaching subset. Power BI authoring cannot be represented as a generic Python exercise. Small ML can use supported browser packages; larger ML and live agents need separately justified compute, secrets and cost controls. These later requirements should not destabilize SQL now.

## Recommended order

**Now:** preserve progress and current SQL contracts; clarify stale-result/assistance semantics; establish Python isolation acceptance evidence; measure preparation and recovery on representative devices. **Next:** add stable activity/fixture identities and adapter envelopes, share workspace primitives, integrate Python after its launch gate, then aggregate cross-subject continuation. **Later:** curated paths, richer projects, specialized labs, optional synchronization and real advanced runtimes when content and demand justify them.

The [roadmap](11_MIGRATION_AND_ROADMAP.md) provides dependencies, affected components, risks, acceptance criteria and preserved behavior per milestone. The [decision and risk register](12_DECISIONS_RISKS_AND_GAPS.md) records rejected alternatives and unresolved validation. Complexity estimates are qualitative; no benchmark, delivery date or infrastructure cost has been invented.

## Confidence and completion boundary

High confidence: local implementation inventory and the observed bounded browser flows. Moderate confidence: recommended shared architecture, based on existing commonality and documented alternatives. Unresolved: production Python isolation, real mobile keyboard/screen-reader usability, cross-subject data equivalence, performance budgets, and authenticated competitor behavior.

The documentation is decision-ready for a scoped implementation plan, not evidence that the proposed features exist or that release gates have passed. No application builds, tests, migrations, refactoring or deployment were performed for this assignment.
