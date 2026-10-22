# Decisions, risks and evidence gaps

Research date: 2026-10-20. This register separates design decisions from release validation. **Verified** denotes direct source/browser evidence; **Documented** denotes retrieved primary documentation; **Reported** denotes historical repository reports; **Inference**, **Proposal**, and **Unknown** have their ordinary explicit meanings throughout this dossier.

## Final decision table

| ID | Current problem / evidence | Recommended approach | Alternative considered / tradeoff | Compatibility; complexity; timing |
| --- | --- | --- | --- | --- |
| D01 | Reading, problem solving and cumulative projects have different needs; current specialized components exist ([01](01_CURRENT_STATE_AUDIT.md), [05](05_EDITOR_WORKSPACE_UX.md)). | Three compositions on shared workspace foundations. | Universal configurable screen saves apparent duplication but creates mode/state complexity; wholly separate stacks repeat bugs. | Retain current routes/content; medium; next. |
| D02 | CodeMirror already supports both subjects; no measured editor deficit justifies replacement ([05](05_EDITOR_WORKSPACE_UX.md)). | Retain CodeMirror 6 and consolidate configuration/accessibility where beneficial. | Monaco adds ecosystem features but mobile support limitations and migration cost; notebook UI useful selectively. | Preserve editor contracts; low/medium; now/next. |
| D03 | SQL/Python execution differences are real, while lifecycle needs overlap ([06](06_EXECUTION_ENGINE_ARCHITECTURE.md)). | Capability-aware envelope over native adapters, not one interpreter. | Remote-first or universal runtime broadens cost/correctness risk. | Keep sql.js/Pyodide; medium; next. |
| D04 | Local Python sandbox exists; historical cross-browser report is not deployed proof ([06](06_EXECUTION_ENGINE_ARCHITECTURE.md)). | Keep production gate until explicit adversarial and positive validation passes. | Immediate hosting redesign is premature; skipping verification violates launch requirement. | Preserve disabled production execution; medium validation, remediation unknown; now. |
| D05 | Result A can become detached from editable B; milestone evidence varies ([01](01_CURRENT_STATE_AUDIT.md), [07](07_GRADING_SYSTEM.md)). | Immutable attempt snapshots, stale-current-result indicator, stage-specific completion policies. | Erasing historical passes is lossy; carrying passes to new code is misleading. | Additive records around native grading; medium; next. |
| D06 | Browser-hidden fixtures can be inspected by the learner ([07](07_GRADING_SYSTEM.md)). | Describe them as additional formative checks; reserve secret/high-stakes grading for a trusted boundary. | Encrypting keys in the client does not establish secrecy; server assessment adds cost and privacy obligations. | No change to current formative grading; low copy/spec work, high later service; now/later. |
| D07 | Rich but separate SQL/Python data catalogs; old built assets can be pruned ([08](08_DATASET_ARCHITECTURE.md)). | Shared semantic identity with explicit editions/format mappings, integrity and retention policy. | Five subject copies drift; a single byte format cannot suit every runtime. | Adapt current manifests, do not rebuild now; medium; next. |
| D08 | Python version normalization drops historical records; SQL already has stronger learning evidence ([09](09_PROGRESS_AND_SKILLS.md)). | Preserve raw legacy state, append compatibility/migration metadata; derive current progress separately. | Destructive version resets simplify code but erase earned work. | Existing storage keys/export stay readable; medium; now/next. |
| D09 | Fixed challenge counts reflect present curriculum, not every future objective ([04](04_LEARNING_MODEL.md)). | Keep current content/counts; future lesson schema permits objective-appropriate blocks and assessments. | Global fixed counts constrain teaching; immediate curriculum overhaul risks SQL and expands scope. | Current mastery thresholds remain until explicit curriculum migration; medium; later schema/authoring work. |
| D10 | Tools already exist; future subjects are cataloged ([10](10_PLATFORM_ARCHITECTURE.md)). | Subject-local available Labs/Tools; global Explore/My Learning; hide empty destinations. | Seven top-level tabs fragment navigation and advertise unavailable functionality. | Keep SQL deep links; low/medium; next. |
| D11 | Genuine distributed/OS/vendor execution exceeds browser subsets ([06](06_EXECUTION_ENGINE_ARCHITECTURE.md)). | Explicit simulation labels; real remote/hybrid adapters when curriculum needs them. | Pretending API compatibility equals Spark/Power BI would teach incorrect models. | No current engine replacement; high and optional; later. |
| D12 | No evidence accounts, certificates, AI tutoring or subscriptions are minimum V2 needs. | Defer them; optional synchronization must preserve local usability and evidence. | Building them now adds security, operating and product cost without resolving workspace issues. | Current local-first flow retained; high if added; later. |

## Decision criteria review

Scores would imply precision unsupported by this investigation. The following qualitative check states the mechanism and the remaining measurement rather than inventing a weighted numeric ranking.

| Criterion | How the recommended design addresses it | Evidence still needed |
| --- | --- | --- |
| Learner usability | Specialized information layouts, clear Run/Check, drafts and recovery | Representative novice/experienced task studies |
| Educational effectiveness | Explain → predict/trace → modify → independent work → application/review | Delayed transfer outcomes, assistance-aware cohorts |
| Execution correctness | Keep genuine runtimes, explicit versions and capabilities | Adapter conformance against existing engines |
| Grading reliability | Snapshot-bound checks, full-result comparison, fixture variants | False-pass/false-fail corpus and cumulative project regressions |
| Security | Production Python gate; explicit sandbox limits; no client-secret claims | Authorized deployment/device attack tests |
| Accessibility | Keyboard-operable panes, focus/announcements, accessible tables, alternative mobile controls | Screen-reader and real keyboard testing, not only DOM inspection |
| Performance | Lazy subject loading, bounded preparation/output and retained current workers | Cold/warm p50/p95 by device/package/data size |
| Maintenance | Thin adapters, shared primitives, native subject graders | Change-cost review after SQL/Python pilot |
| Cost | Browser execution retained; no mandatory service fleet | Bandwidth/storage budgets; remote unit economics only when selected |
| Future subjects | Capability descriptors and versioned activity references | One concrete future-subject vertical slice before generalizing further |

## Independent challenge and resolutions

The current-state auditor independently reviewed learning, engine and grading drafts, rather than only reviewing their own audit. Four issues were corrected:

1. Python has **one global prewarmed spare**, replaced for the selected package set, not a pool per set.
2. Progress must record evaluated failures as well as passes; it binds to the captured submission. Editing B while A finishes does not erase A or validate B.
3. SQL project stages use different completion policies. Exploration, orientation and writing are not universally equivalent to passing current code.
4. Cross-subject dataset equivalence is a future proposal, not a verified property of the existing two catalogs.

**Challenge:** is a new platform abstraction necessary at all? **Resolution:** only common identity/lifecycle/view primitives are proposed. Existing stores and clients remain behind adapters until a pilot proves value. Do not construct a plugin marketplace, generalized DAG scheduler, event bus or microservice architecture.

**Challenge:** are competitor interactions proof of better learning? **Resolution:** no. Observations identify patterns and failure modes; educational effectiveness needs learner outcomes. Do not adopt punitive XP, grading opacity or competition because another platform uses it.

**Challenge:** does the proposed Python gate ignore work already completed? **Resolution:** no. The opaque-origin implementation and historical isolation reports are credited. Production header/runtime behavior and the current supported-device matrix remain unverified.

**Challenge:** is a full notebook required for Python? **Resolution:** no. Current file workspaces already support multiple files and rich output. Notebook state is a selective lab capability with explicit restart/replay semantics, not a default grading model.

## Risk register and closure evidence

| Risk | Severity / trigger | Mitigation and closure evidence | Intended owner in future implementation |
| --- | --- | --- | --- |
| Python origin/egress escape | Critical before public launch | Deployed CSP/origin/message/egress probes plus normal package/data flows; review current browser-specific mitigations | Runtime/security owner |
| Lost progress on curriculum change | High on version mismatch | Preserve original payload; idempotent migration fixtures; restore/export round trip with earned evidence intact | Progress owner |
| SQL regression from shared abstractions | High on wrapper rollout | Golden SQL grade/result/route fixtures; preserve existing thresholds and worker semantics; reversible rollout | SQL maintainer |
| Stale report marks changed code as passed | High on asynchronous editing/check completion | Snapshot ID/hash visible in records; A/B race scenario; failed attempts retained | Workspace owner |
| Unbounded preparation/output | High on large data, offline fetch, output storms | Per-phase deadline and byte tests, cancellation during loading, bounded artifacts | Runtime owner |
| Dataset history unavailable | Medium/high on rebuild | Retention policy and old-edition replay test; checksum mismatch fails explicitly | Dataset owner |
| Simulation mistaken for genuine system | High on PySpark/Power BI publication | Learner-visible execution labels; capability tests; curriculum reviewed for genuine guarantees | Subject owner |
| Mobile UI appears usable only in desktop emulation | Medium/high on release | Real virtual-keyboard, focus, scroll and screen-reader task evidence | UX/accessibility owner |
| Overgeneralization delays Python | Medium on contract design | Limit initial adapter contract to observed SQL/Python needs; defer optional fields | Platform owner |
| Research tooling enters commits | Medium during handoff | Tooling-local ignore rule; `git check-ignore` for binaries/dependencies/caches | Research maintainer |

## Explicit unknowns and next investigations

- Authenticated competitor draft restoration, hidden-test workflows, actual screen-reader behavior and project transitions were not comprehensively exercised. Use authorized accounts only; public documentation does not prove current UI behavior.
- REA LeetCode capture reached security verification; no bypass attempted. The normal browser exposed some controls, which does not establish successful execution.
- JupyterLite's exploratory save/reload attempt was inconclusive: beforeunload intervened and code did not reappear. Do not infer that its persistence is universally broken or verified reliable.
- SQLBolt's mobile-width overflow is measured for one lesson and viewport, not every browser/device. A viewport capture does not reproduce a real on-screen keyboard.
- Source inspection and historical test inventory are not fresh test passes. No local app server, application test suite or build was run.
- No empirical hardware memory ceilings, browser startup latency, learner retention improvement, remote-provider price or projected operating cost was measured.
- No account/subscription requirement, remote execution provider, confidential grading service or AI-provider integration was selected or provisioned.

For implementation planning, settle the supported browser/device floor, initial Python package/fixture policy, assessment trust level and dataset retention policy first. Product defaults recommended here remain local-first formative learning, retained SQL semantics and no mandatory accounts.

## Review checklist

The dossier covers lessons, independent practice, projects, existing labs, paths, editors, all requested workspace states, engines, grading, datasets, progress and navigation. Major recommendations identify evidence, alternatives, compatibility, timing and qualitative complexity in their local decision tables. Browser and REA claims link to [02](02_REA_RESEARCH_EVIDENCE.md); source claims link to actual repository files. [README](README.md) indexes the complete deliverable and records final link/boundary verification.
