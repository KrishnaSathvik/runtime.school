# Learn + Practice — Phase 1 handoff

This phase is limited to SQL Learn and Practice, including their review/placement compatibility. Projects, Playground, Database Lab, Query Plans and Compare remain frozen at the start of this phase. Shared code changes preserve their prior fixtures; snapshot checks and project execution tests protect that boundary. Python work remains paused. Nothing was deployed or committed.

## Delivered

- Exactly **12 canonical dataset identities**, each with one physical learning snapshot shared by Learn and Practice. Contracts use `datasetId` and `datasetVersion`; neither surface offers editions or size selectors.
- **Sports** is a deterministic, substantive domain: teams, players, games, appearances, cancellations, ties, unused players, reciprocal home/away games and club-training records. Goal totals reconcile to game scores on both base and changed data.
- **88 lessons individually reviewed:** 74 migrated, 14 rewritten, none retired. The rewritten lessons improve domain fit, transfer, frames, denominators, boundaries or correlated reasoning. All 176 challenge IDs remain stable.
- **114 standalone questions:** 110 migrated, two rewritten, two new. The manager exercise now compares two benchmarks; the existing ordered-funnel question now uses native SaaS activation events. The additions cover timed sensor islands and reciprocal league fixtures. Every domain has independent Practice content.
- **290 total exercise records**, of which 275 are independently practiceable; 15 context-dependent lesson challenges remain in their lesson flow. Modalities: 266 Write, 12 Predict, 12 Debug.
- All six track IDs retained; the joins track is reordered to maintain its difficulty progression. Earned progress and old IDs remain stable. Earlier drafts remain accessible, while canonical drafts use separate keys to avoid silently executing old-schema SQL.
- Dataset names, focused tables, schema types/relationships, input previews appear in the workspaces. Autocomplete, examples, graders, review and placement use the same canonical fixture as the task.
- Tables stay visible as row/column grids on narrow screens, with horizontal scrolling when needed; extra dataset-description copy was removed at user request.
- A light-theme string-literal contrast issue found during browser testing is corrected only in Learn/Practice.

## Audit and evidence

- [Dataset inventory, provenance and schemas](DATASETS.md)
- [All 88 lesson decisions](LESSONS.md), including [individual review notes](lesson-review-notes.txt)
- [All 290 exercise decisions](PRACTICE.md)
- [SQL concept and analytical-pattern coverage](COVERAGE.md)
- [Duplication review](DUPLICATION.md)
- [Difficulty, modality and dataset distribution](DISTRIBUTION.md)
- [Six-track review](TRACKS.md)
- [Machine-readable audit, including reviewed lessons and question contracts](audit.json)
- [Browser grading on all twelve domains, review and placement](domain-browser-results.json)

Regenerate the data with `npm run learning:build`. Regenerate context, examples and audit reports with `npm run qb:report`. The original source-pack fixtures are retained only as authored inputs and frozen-tool compatibility data; the exported Learn/Practice contracts are canonical.

## Verification

Final validation evidence is recorded in [VALIDATION.md](VALIDATION.md). The SQL suite checks all lesson and standalone reference solutions on visible and changed data; it also rejects hard-coded standalone outputs and documented wrong approaches, accepts authored equivalents, and verifies DDL/DML state, constraints, plans and replay behavior where the task requires them.

## Remaining limitations

- Retail remains the largest teaching domain (49 lessons) because foundations and the warehouse/ingestion sequence share a coherent model. Advanced lessons use all twelve domains. Distribution is deliberate rather than equal-count sampling.
- Some canonical domains contain both upstream observations and separate modeled operational tables. Their identifiers are not interchangeable. Grain, keys and source status are documented; no join across source groups is implied by matching integers.
- These fixed browser snapshots teach reasoning; they are not live feeds or evidence about current businesses, leagues or populations. SQLite procedure/partition lessons remain explicitly conceptual where the engine lacks the native feature.
- Earlier drafts are preserved for inspection and copying, not automatically rewritten. Previously earned completion remains earned even when an exercise changes. A learner can start a fresh attempt to practice the revised task.
- Full-repository `tsc --noEmit` remains blocked by the pre-existing incomplete `ProjectV2` fixture cast in `tests/python-projects-v2-state.test.ts:5`. The SQL type-check command passes. Lint has zero errors and eight existing warnings in paused Python files. No Python source or Python test was changed in this phase.

Stop here for Learn/Practice review. Projects and other tools are a separate future phase.
