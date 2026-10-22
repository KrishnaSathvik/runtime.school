# runtime.school V2 research and design specification

Research completed 2026-10-20 America/Chicago. **Research only: no application implementation, build, refactoring, test execution, migration or deployment.** Local checkout baseline: `a0842778ffac594e23a2ca8676c1a0a511bc1633`, plus pre-existing tracked and untracked Python work. Do not interpret the commit alone as the inspected tree.

Start with [executive summary](00_EXECUTIVE_SUMMARY.md), then [workspace specification](05_EDITOR_WORKSPACE_UX.md), [platform architecture](10_PLATFORM_ARCHITECTURE.md), and [roadmap](11_MIGRATION_AND_ROADMAP.md).

## Deliverables

| Document | Purpose |
| --- | --- |
| [00 — Executive summary](00_EXECUTIVE_SUMMARY.md) | Three central decisions, strongest findings, vision and implementation order |
| [01 — Current-state audit](01_CURRENT_STATE_AUDIT.md) | Verified local architecture, strengths, coupling, active versus legacy code |
| [02 — REA evidence](02_REA_RESEARCH_EVIDENCE.md) | Actual scenarios, screenshots, access limits, toolchain and provenance |
| [03 — Competitive comparison](03_COMPETITIVE_COMPARISON.md) | All requested platforms and twelve workflow areas with evidence labels |
| [04 — Learning model](04_LEARNING_MODEL.md) | Lessons, independent practice, projects, labs, paths and mastery |
| [05 — Editor/workspace UX](05_EDITOR_WORKSPACE_UX.md) | Three compositions, lifecycle states, responsive wireframes, keyboard/accessibility |
| [06 — Execution architecture](06_EXECUTION_ENGINE_ARCHITECTURE.md) | Capabilities, contracts, cancellation, security and future runtime boundaries |
| [07 — Grading](07_GRADING_SYSTEM.md) | Subject grading, feedback, reproducibility and assessment integrity |
| [08 — Datasets](08_DATASET_ARCHITECTURE.md) | Existing registries, editions, formats, fixtures and cross-subject reuse |
| [09 — Progress and skills](09_PROGRESS_AND_SKILLS.md) | Attempts, assistance, mastery, review and lossless migration |
| [10 — Platform architecture](10_PLATFORM_ARCHITECTURE.md) | Logical modules, dependencies, content identity and navigation |
| [11 — Roadmap](11_MIGRATION_AND_ROADMAP.md) | Now/Next/Later milestones with dependencies, risks and acceptance criteria |
| [12 — Decisions and risks](12_DECISIONS_RISKS_AND_GAPS.md) | Final decision table, alternatives, independent review and open evidence gaps |

Supporting evidence: [REA manifest and reproducible inputs](EVIDENCE_MANIFEST.md), [file baseline](BASELINE.md), and [final verification](VERIFICATION.md). Screenshots are linked from the evidence ledger and carry hashes in the manifest. Raw REA captures and all tooling are ignored locally; they are not part of the portable Git deliverable.

## Evidence vocabulary

- **Verified source / browser observation:** directly inspected code or an actual bounded interaction. Source existence is not deployed behavior.
- **Documented:** retrieved primary documentation; not an independently executed product feature.
- **Reported:** historical repository validation, not rerun here.
- **Inference:** supported interpretation that remains unproven.
- **Proposal:** recommended future design, not implemented functionality.
- **Unknown:** access, tooling or investigation limits prevent a conclusion.

Some specialist chapters use “verified documentation” to mean the document was retrieved, not its runtime behavior independently tested. The competitive matrix uses B/D/U explicitly. External source access dates are 2026-10-20; machine capture timestamps can be 2026-10-21 UTC.

## Recommendations to carry forward

Keep CodeMirror, sql.js, Pyodide and current SQL content/semantics. Use distinct lesson/challenge/project compositions with common reliable controls and output/persistence foundations. Add capability-aware adapters and versioned activity/fixture/attempt identities incrementally. Preserve earned progress and original migration inputs. Keep Python closed in production until deployed isolation and normal-functionality gates pass. Defer remote fleets, accounts and advanced subjects until concrete learning needs justify them.

## Research boundaries

The user approved Node v24.11.0 and official REA 6.7.0 only as isolated research tooling. `tooling/.gitignore` excludes binaries, dependencies, caches, profiles and raw captures. No agent configuration changed. The first browser tool emitted task-generated logs outside the requested directory; cleanup relocated them into ignored tooling, as disclosed in [02](02_REA_RESEARCH_EVIDENCE.md). Existing application edits were preserved. Concurrent Python/content changes were detected and are listed in verification; the whole working tree was not static during research.

This dossier is ready for architecture and scoped implementation planning. It does not certify production Python safety, universal mobile/accessibility behavior, authenticated competitor workflows or measured runtime performance. Those release/investigation gates remain explicit in the roadmap and risk register.
