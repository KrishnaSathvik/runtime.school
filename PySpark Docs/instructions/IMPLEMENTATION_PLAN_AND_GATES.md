# Start building: implementation plan with non-negotiable gates

## Required first repo audit

Before editing source, inspect current runtime.school repository and the existing SQL/Python Learn/Practice/Projects/Tools patterns. Find routing, code editors, cancellation, output renderer, dataset registry, progress, authentication, saved submissions, security model, deployment infrastructure, mobile behavior and tests. Record what exists and what must be new. Do not invent paths or claim a feature is already implemented. Preserve existing SQL/Python functionality; keep changes behind a PySpark feature flag.

## Incremental build sequence

**Phase 0 — Reconcile and lock contracts (no runtime launch)**

- Read `AGENTS.md`, all v4 docs, the complete 90-lesson and 450-question seed CSVs, original v3 workbook, and source audit.
- Record conflicts: old project tab in v3 differs from canonical P01–P10 in v4; old Q briefs are placeholders, some lessons conceptual.
- Create validated question/lesson/project/dataset schemas and typed IDs; curriculum dependency graph; audit checks for missing/cyclic links.
- Map each tool activity and each project milestone to a real dataset fixture and engine mode.
- Output: dependency graph + dataset spec templates + question spec schema + all `not_started` statuses.

**Phase 1 — Build D01 and the smallest real runner**

- Pick a **license-safe D01** version. If Olist license cannot be cleared for shipping, use original deterministic retail generator in product.
- Implement manifest, schema, keys, rows, raw/clean views, fixture builder, checksums, visible sample + hidden fixtures.
- Verify real local Spark job in isolated development environment; implement `solve(...)` contract, correct output/schema and duplicate-sensitive grading.
- Unit + integration test code; demonstrate both correct and intentionally wrong submissions.
- Explicitly do not expose public arbitrary execution until sandboxing passes security review.

**Phase 2 — Vertical slice for learners**

- One realistic D01 lesson → Run → practice challenge → Submit → grader feedback → progress saved → P01 milestone → Playground/SQL Lab/Datasets Explorer link.
- Accessible responsive editor + mobile real-device test. Show datasets, business rules, expected outputs and useful errors.
- Validate end-to-end user journey and prevent editing progress leakage.

**Phase 3 — Multi-dataset and question pilot**

- Add D02 Banking, D03 HR, D06 Clickstream and 25 high-quality reviewed questions (filters, nulls, joins, windows, nested JSON).
- Full hidden/edge tests, cross-dataset schema verification, sandbox quotas, Run/Submit cancellation, durable queue.
- Confirm question writer workflow, human review, and stable content IDs.

**Phase 4 — Expand curricular core**

- Complete D01–D05 contract checks and lessons M01–M06, then D06–D10 M07–M10, then D11–D15 M11–M15 subject to dependencies.
- Fill question slots in batches of 25 after references/tests. Always publish only tested questions.
- Complete beginner/intermediate projects and tool capability gates as needed.

**Phase 5 — Stateful engines and advanced labs**

- Add verified Delta engine with one-user-one-scratch-Delta; stream replay/checkpoint tests; private state reinitialization; CDC/SCD2 idempotency oracles.
- Build P07–P10 incrementally; add benchmark/performance evidence mode.
- Separate distributed Spark on Kubernetes tier for cluster-specific tasks only after cost/security evidence and genuine need.

**Phase 6 — Release readiness**

- Content: all named lessons/questions/projects pass correct code/tests and prerequisite audits; no fake examples.
- Datasets: sources checked for licensing, schema/keys/row counts audited, deterministic fixture hashes, no sensitive data.
- Security: sandbox isolation, no egress, timeout/cancel process tree, no secrets, concurrent learner tests, rate limits.
- Quality: accessibility/mobile/desktop checks, no SQL/Python regression, completion/resume works, link graph complete.
- Operations: queue, p95 latency, cost/job, failure handling, alerting and cleanup measurable.
- No git commit/push/deployment unless explicitly authorized by repo owner or consistent with their current instructions.

## Acceptance-based workflow for coding agents

At each phase: plan → inspect actual code/data → implement smallest coherent patch → run unit/integration/end-to-end tests → report exact files changed, measured results, and still-open blockers. Never paper over a failing check. Do not rewrite an unrelated course. Do not create stub success buttons or sample outputs passed off as live Spark results.

## Release / definition-of-done checklist

- [ ] Dataset manifest + source rights are validated for current build.
- [ ] Every runnable lesson uses precisely the tables and fields it teaches.
- [ ] Every practice challenge has explicit business rules, input/output schema, working reference, hidden tests.
- [ ] Projects have milestone deliverables and safe stateful behavior where relevant.
- [ ] All six tool integrations either really work or are transparently labeled unavailable.
- [ ] No student script runs in frontend, FastAPI API process or other learners' sandbox.
- [ ] Run / Submit / Cancel / Timeout / Crash / Restart are exercised.
- [ ] No performance claim is unsupported by controlled benchmark evidence.
- [ ] Source licenses respected; third-party notes are not republished.
- [ ] SQL/Python existing functionality still passes targeted regressions.
- [ ] Full build passes and mobile is manually validated.
