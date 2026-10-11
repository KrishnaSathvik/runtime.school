# Plan-aware grading

Phase A adds an opt-in `planValidation` contract to lesson challenges, bank questions,
`SqlWorkspace`, and worker requests. Existing questions keep their current grading.
The original six tracks and 224 questions were preserved. Phase B subsequently
added 23 opt-in questions (247 total); existing optimization questions were not
silently retrofitted with performance requirements.

## Contract

```ts
planValidation: {
  indexes: [{ id: "account lookup", table: "events", columns: ["account"] }],
  access: [{ index: "account lookup", strategy: "search" }],
  noFullScans: true,
}
```

- `indexes` checks the main-schema catalog using `pragma_index_list` and
  `pragma_index_xinfo`. The key columns and their order must match exactly.
  Learners choose index names. `unique` optionally requires or forbids uniqueness.
  Full, ordinary B-tree indexes with BINARY key collations are supported. Partial
  and expression indexes need future explicit contracts and are not accepted as
  substitutes. Sort direction is unconstrained (SQLite can traverse an index in
  reverse). TEMP tables/views shadowing a required source table are rejected.
- `access` is optional. Each assertion requires an actual plan node using a
  matching catalog index: `search`, `covering-search`, or `index-scan`. Aliases,
  CTEs, and equivalent predicates need not match the reference SQL text. A search
  using an unrelated table's index cannot satisfy the contract. Primary-key rowid
  searches are outside this initial index contract.
- Access assertions are existential: at least one matching access must occur.
  For tasks requiring an entire query to avoid unindexed scans, use `noFullScans`.
  This strict whole-plan rule also rejects CTE/subquery scans; only use it when the
  task states that requirement and valid alternatives have been tested.
- `noTempSort` rejects temporary B-tree nodes throughout the plan. Use only for
  objectives that explicitly require avoiding them.

## Execution and reproducibility

1. Every submission and reference answer run on separate fresh databases. The
   author's seed supplies a controlled fixture. Learner scripts run only in labs.
2. Compare all output rows and columns (not just the displayed first 200), applying
   the existing ordered/unordered result contract.
3. Check required index definitions on the learner's database. Run full `ANALYZE
   main` after learner DDL and disable automatic indexes for plan inspection.
4. Explain the learner's actual final SELECT/WITH statement. Earlier SELECTs,
   supplied plan text, or trailing DDL cannot replace that statement.
5. Repeat output, index, and plan checks on the authored changed-data fixture.
   A changed-fixture plan failure is presented as an optimization requirement
   failure, not as incorrect output or hardcoding.

The supported bundled runtime is **SQLite 3.49.1**. Tests load the shipped
`public/vendor/sql-wasm.js` and `.wasm`, rather than a potentially newer npm JS
wrapper. A runtime-version assertion forces review when these assets change.
SQLite explicitly warns that [EXPLAIN QUERY PLAN text can change between
releases](https://www.sqlite.org/eqp.html). Index structure comes from the documented
[index PRAGMAs](https://www.sqlite.org/pragma.html#pragma_index_xinfo), not SQL-text
matching.

This is a deterministic teaching contract on controlled data, not a benchmark or
universal claim about the fastest query. No timing threshold or performance score
is produced. On tiny or unselective fixtures, scans may be appropriate; use an
index-only contract unless a task deliberately establishes a stable access plan.

## Authoring the next batch

- Put representative data in the shared practice seed and changed-data fixtures,
  so Run and Check see the same schema and visible data. Keep fixtures small enough
  for the worker's three-second execution limit. Do not use random or current-time
  values.
- State the exact required index keys and any access/sorting constraints in the
  task. Avoid unnecessary `required` keyword checks for optimization tasks.
- Test reference and equivalent solutions, wrong outputs, wrong index definitions,
  unused indexes, unrelated SEARCH nodes, and changed-data behavior before adding
  a question. Test any partial/expression-index objectives only after extending
  the contract to support them.
- Do not retrofit plan requirements silently into existing exercises. The proposed
  23-question expansion is documented in the Phase B integration section below.

`tests/plan-validation.test.ts` exercises selective 12,000-row fixtures, deliberate
selectivity changes, tiny-table index-only checks, covering searches, useful index
scans, sort avoidance, decoy queries, equivalent SQL, and submission isolation
through the exact production worker.

## Phase B integration

Four questions now opt in: qb-0049–qb-0052. Their per-question `setupSql` is included in Run, Check, table previews and generated examples. The UI shows structured output, required-index and access-strategy checks for each original/changed fixture, with actionable explanations and no speed score. Correct submissions also receive the authored conceptual explanation without requiring solution reveal.

The worker now supports `stateQueries` (complete result comparison against the independently executed reference database), `repeatCheck` (run the entire submitted and reference scripts a second time on the same respective databases, then recheck output, validators and state), and `mustSucceed` write probes (rolled back like `mustFail` probes). Engineering questions use these contracts to verify state, valid-write behavior and replay safety. These remain opt-in.

The initial validator limitations above still apply. The 23-question Phase B is now authored; consult [QUESTION_GAPS.md](question-bank/QUESTION_GAPS.md) for the current coverage and remaining work.
