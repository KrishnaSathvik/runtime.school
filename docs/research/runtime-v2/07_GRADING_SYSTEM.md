# Grading system

Research date: 2026-10-20. **Proposal:** share attempt identity and feedback structure while retaining subject-specific evaluators. Run produces execution evidence; Check evaluates a frozen snapshot against a versioned rubric. Browser-local grades are learning feedback, not tamper-proof certification. No tests were run during this research.

## Verified current strengths

| Source / function | Inspected behavior | Preserve |
| --- | --- | --- |
| `src/engine/grading.ts`, `compareResults` | Column count/order and case-insensitive aliases; exact row count; ordered or sorted-row comparison; numeric relative epsilon `1e-8` | Semantic results rather than reference-query text equality; duplicate row multiplicity matters |
| `public/vendor/engine.js`, message handler, `inspect`, `validate`, `compareState` | Reference solution, original/changed fixtures, required terms, query-plan validation, schema/constraint validation, state queries and repeat execution | SQL correctness extends beyond SELECT output to DDL/DML and idempotence |
| `src/engine/python/grading.ts`, `probeFor`, `checkPython`, `gradePython` | Probe values returned to parent grader; expected answers are excluded from the interpreter probe. Check kinds: output, variable, function, expression, changed-input variant, variable-use AST check | Keep typed grading and separation of observed values from expected values |
| Same file, `judgeCase`, `judgeFunction`, `judgeExpr`, `judgeVariant` | Categories distinguish wrong type/value, printed-vs-returned, missing function, wrong exception, changed inputs and hidden-case failure | Actionable feedback, explicit mutation/exception policies |
| Same file, `interrupted`, `gradePython` | Timeout/stop/crash and missing results do not pass; zero checks cannot pass; all authored checks must pass | Execution success is not correctness; partial/interrupted execution cannot create completion |
| `src/engine/python/values.ts`, `pyEqual`, `sameKind`, `toWire` | Tagged Python values and explicit comparison policy | Avoid JavaScript coercion erasing Python distinctions |

**Verified test inventory, not executed results:** `tests/python-grading.test.ts` covers comparison policies, probe omission of expected values, output/variable/function grading, no-pass interrupted runs and learning-objective checks. `tests/python-grading-functions.test.ts` includes real Pyodide cases for function behavior and authoring helpers. `tests/python-client.test.ts` tests nonce and run-ID rejection using fake workers; these are not adversarial security certification. `tests/sql-client.test.ts` covers execution lifecycle. Existing coverage should be reused rather than replaced by a generic grader suite.

**Inference requiring targeted future verification:** unordered SQL rows are sorted by exact JSON representation before tolerant cell comparison. Nearly equal numeric values can change sort pairing, especially around lexical numeric boundaries or duplicate groups. This is a review/test target, not a demonstrated production bug. Preserve current behavior until examples establish a defect and a compatible fix. Required SQL terms use regex after stripping comments/strings; they enforce narrow pedagogical constraints, not general proof of algorithm or semantic intent.

## Trust model and hidden-test integrity

**Verified:** Python expected values remain outside the learner interpreter, but the task and grader run in the learner-controlled browser. SQL reference answers are supplied to its worker. A hidden label suppresses feedback disclosure; it cannot make shipped client assets secret. The sandbox protects app origin/resources and reduces cross-run contamination; it does not make a user's local grade unforgeable. This is stated in `src/engine/python/grading.ts` and `docs/python/runner-isolation.md`.

**Proposal:** distinguish three assurance levels:

| Level | Meaning | Allowed claim |
| --- | --- | --- |
| Local learning feedback | Browser tests and progress can be inspected/altered | “Passed these practice checks” |
| Controlled remote evaluation, future | Trusted evaluator owns versioned hidden fixtures and accepts no client-supplied pass flag | “Passed this evaluated submission” within documented coverage |
| Human-reviewed assessment, optional | Rubric plus reviewed artifact/evidence; separate identity/proctoring concerns | Specific reviewed competency, never automatic broad expertise |

Server execution alone is insufficient for integrity if test answers are placed beside learner code or a submitted process can forge its own verdict. A future trusted evaluator must retain expected data, verify outputs independently, enforce schema/size limits, and mint the evaluation record outside the sandbox. Tests can still reveal information via repeated feedback; keep hidden-case details coarse and rate-limit only when assessment stakes justify it. Do not introduce accounts or certification infrastructure just to prevent a learner editing local practice progress.

## Run, Check, Submit and feedback

**Proposal:** use **Run** for the learner's chosen inputs and bounded output. Use **Check** for authored rubric fixtures against a fresh immutable source snapshot. Introduce **Submit** only when a project actually has a final deliverable or trusted evaluation workflow; avoid two buttons that perform indistinguishable checks.

A report contains `attemptId`, `runId`, activity/version, source hash and draft revision, runtime/package versions, fixture/test-set version, evaluator version, assurance level, outcome, check results, diagnostics and artifact references. Assistance metadata is attached by the workspace/progress layer. Do not encode hints, reveals or independent-solve judgment into runtime execution.

Check outcomes: `pass`, `fail`, `not-run`, `error`. Attempt outcomes distinguish incorrect work from syntax/runtime failure, timeout, cancelled, superseded and infrastructure unavailable. Each failure identifies the requirement, observable mismatch, appropriate location and one useful next action. Hidden cases show category (“empty input”, “duplicate keys”) and aggregate count, not secret values. Passing reports state scope and source revision. A subsequent edit makes the report stale while preserving it for comparison.

**Proposal feedback sequence:** compilation/syntax first; program runtime failure next; first useful visible behavioral mismatch; hidden-category feedback after visible examples; optional hint after retry; solution reveal as explicit assistance. Avoid dumping dozens of equivalent failures. A retry of unchanged code after an infrastructure failure is not evidence of poorer mastery. Cancelled and superseded attempts should not count as incorrect attempts.

## Subject-specific assessment strategies

All entries below are **proposals**, informed by current graders and the primary documentation listed below.

| Subject / task | Observable evidence | Appropriate checks | Limits and genuine-execution requirement |
| --- | --- | --- | --- |
| SQL query | Full result schema/multiset or ordered rows | Original and changed fixtures; NULL, ties, duplicates, empty groups, boundary dates; explicit alias/type/tolerance/order policy | Do not grade only displayed 200-row preview; SQLite semantics must be named |
| SQL writes and schema | Result plus resulting database state | Constraints accepting valid/rejecting invalid writes, required objects, unaffected tables, transactions, repeat load idempotence | Output-only grading misses destructive or incomplete writes |
| SQL optimize | Result equivalence plus plan evidence | Pinned engine/data/index fixture; relevant plan property; multiple fixture sizes | Wall-clock browser speed varies; do not grade speed from one run or require one exact plan text |
| Python / JavaScript functions | Typed values, exceptions, input mutation, output | Visible examples + boundary cases + declared invariants; file outputs where required | No source-template matching; AST checks only for stated learning objectives |
| Predict / trace | Selected prediction or typed structured answer | Deterministic execution-derived expected state/output; explanation optional | No need to run learner-authored code for every prediction task |
| Debug | Corrected code and resulting behavior | Previously failing case plus regression cases; optionally concise cause explanation | Passing one repaired example is insufficient |
| Investigate | Queries/experiments, artifacts, explanation | Evidence checklist and reproducible experiment; objective claims tested where possible | Reasoning quality needs rubric review, not exact text equality |
| PySpark | Schema, types, unordered rows and pipeline invariants | Run on actual pinned Spark for genuine Spark activities; handle null/order/partition effects explicitly | DuckDB Spark API checks are simulation checks, never evidence about shuffles/distributed performance |
| Power BI | PBIP model/report definitions, supplied outputs, design evidence | Relationship/measure presence, schema validation, declared calculations against genuine engine when available, visual explanation rubric | Metadata presence does not prove DAX semantics, refresh or accessible visual design |
| ML | Preprocessing pipeline, split IDs, metrics, predictions and reproducibility | Held-out evaluation, leakage checks, baseline, appropriate metric, bounded tolerance across seeded repetitions | A single accuracy threshold invites overfit; statistical claims require sample context |
| RAG | Retrieved document IDs, citations, grounded answers, latency/cost | Retrieval recall/ranking on labeled corpus; citation validity; unsupported-answer abstention; answer rubric | Embedding/model/corpus changes invalidate direct comparisons; exact prose matching is unsuitable |
| Agents | Tool trace, state transitions, terminal artifact, budgets | Successful final state, forbidden side effects absent, recovery, max calls/time/cost; multiple valid trajectories | Simulated tools test logic; live tools need brokered isolated evaluation. One prescribed tool order is often too strict |

**Verified primary sources, accessed 2026-10-20:** [Spark cluster overview](https://spark.apache.org/docs/latest/cluster-overview.html) describes drivers/executors, supporting the distinction from compatible local APIs. [Microsoft PBIP](https://learn.microsoft.com/en-us/power-bi/developer/projects/projects-overview) describes text report/model definitions, supporting artifact inspection but not equivalence to execution. [scikit-learn common pitfalls](https://scikit-learn.org/stable/common_pitfalls.html) discusses leakage and randomness, informing split/reproducibility safeguards. [Google evaluation overview](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/evaluation-overview) documents model-based and computation-based evaluation; this is a methodological source, not a provider recommendation or evidence that one judge is authoritative.

**Proposal for ML/RAG/agent judgment:** show objective checks separately from subjective rubric scores. Calibrate any model judge against reviewed examples and record judge/model/prompt versions; treat disagreement as review-needed. Never make an unvalidated LLM judgment the sole gate for correctness or learner mastery. Deterministic recorded tool fixtures permit repeatable teaching; live evaluation is a separate, costed mode with stated variability.

## Fixtures, reproducibility and grading data

**Proposal:** reuse the canonical dataset registry. A rubric references an immutable edition and a deterministic variant generator or explicit fixture assets. Each fixture records hash, schema, seed and purpose. Separate visible practice datasets from changed-data checks, and separate both from truly server-private assessment fixtures if those ever exist. A client-delivered variant is not secret.

Test manifests pin activity version, rubric version, runtime/dialect, package locks, timezone/locale, random seed and comparator policy. Keep checks scoped to declared objectives and avoid silently changing passing criteria for existing versions. Dataset evolution creates a new edition, not a rewritten file at the same integrity identity. Replay stores source and fixture references subject to user storage/export choices; a hash alone identifies code but cannot reconstruct it.

For SQL, preserve relational semantics: row order is required only when requested; duplicates matter; NULL differs from strings; numeric tolerance is declared; schema/type expectations are separate from display formatting. For Python, preserve int/float/bool/list/tuple/set/dict distinctions unless the activity explicitly accepts an equivalence. Comparisons should describe their policy in author tooling.

## Project grading and progress relationship

**Proposal:** each milestone identifies requirements, input checkpoint and deliverables. A later change reruns prerequisites whose dependencies changed. For executable project deliverables, final completion requires a clean reconstruction from the pinned starter/fixture and current source/files, followed by all required cumulative checks. Orientation, exploration and written deliverables retain their stage-specific completion policies. Never trust “milestone 1 passed last week” if current code now breaks it.

Do not require all milestones to grade from one growing source file: SQL may grade state transitions; Python may grade multiple files; a Power BI project may include reviewed artifacts. Shared identity and dependency metadata connect these forms without pretending they are identical.

Objective checks and engineering/design rubric criteria remain separate. A beginner project can have mostly executable checks and explicit hints. Advanced projects add tradeoff notes, tests and documentation with review/self-review criteria. Labs produce experiment history and artifacts; running arbitrary code does not itself earn mastery credit. An authored assessment reached from a lab can create a regular versioned attempt.

Progress retains settled evaluated checks, including both passes and failures, against the captured submitted snapshot and its activity, source, fixture and rubric versions. A pass for submitted revision A remains historical evidence even if the learner has edited revision B before the result arrives; B remains unverified. Completion credit applies to the evaluated snapshot, never automatically to the current editor contents. Cancelled, superseded and infrastructure-failed runs may be retained as operational history but are not incorrect evaluated answers. Progress records independent vs assisted solves, hint/reveal history and later review evidence separately from pass/fail. Historical passes survive curriculum updates as historical evidence; a changed rubric may require review without deleting prior progress. See [progress and skills](09_PROGRESS_AND_SKILLS.md).

## Validation plan, to be implemented later

1. **Author validation:** reference answer passes all fixtures; representative misconceptions fail; at least one alternative correct solution passes. Every check maps to a requirement; zero-check activities cannot silently pass.
2. **Comparator tests:** NULL/NaN/infinity where supported, empty results, duplicate rows, near-tolerance numeric ordering, large integers, Unicode, dataframe schema and file encodings. Use adversarial examples, not tests that merely repeat implementation logic.
3. **Lifecycle tests:** error, timeout, cancellation, stale response, edited source and fixture-load failure never mark success; grading and display consume the same run snapshot.
4. **Runtime verification:** exercise real sql.js/Pyodide in supported browsers after adapter changes, alongside existing unit suites. Package/runtime upgrades replay pinned reference and misconception corpora.
5. **Security verification:** use the production Python launch gate in [execution architecture](06_EXECUTION_ENGINE_ARCHITECTURE.md); no grade-quality result substitutes for sandbox verification.
6. **Future remote assurance:** malicious outputs, path traversal, forged verdicts, secret reads and runaway processes are tested against the real trusted evaluator/sandbox boundary. Deployment results require independent evidence retention.

Acceptance means reproducible report identity, useful feedback for known mistakes, acceptance of valid alternatives and no accidental completion from infrastructure failures. It does not mean exhaustive proof for all possible learner programs.

## Decision record

| Recommendation | Current need / evidence | Alternatives and tradeoffs | Compatibility / complexity / timing |
| --- | --- | --- | --- |
| Keep subject graders, share report envelope | Existing SQL state/plan checks and Python typed probes have different semantics | One generic compare function loses domain correctness; fully separate progress repeats logic | Additive wrapper; medium; next |
| Keep local grades as learning evidence | Expected answers/grader live in browser | Trusted remote checks add cost/security obligations without current assessment need | Preserves SQL/Python; low policy work; now |
| Expand fixture/comparator validation selectively | Changed-data and typed comparison already exist; edge cases remain | More fixtures improve reliability but increase authoring/run cost | Preserve semantics until justified; medium; now/next |
| Make cumulative grading snapshot-based | Milestone successes can become stale as files evolve | Last-pass-only completion is simpler but unreliable | Additive metadata/dependencies; medium; next |
| Defer model judging and remote grading | No core SQL/Python requirement | Early adoption creates uncertainty, privacy and operating cost | No runtime replacement; high for trusted service; later |
