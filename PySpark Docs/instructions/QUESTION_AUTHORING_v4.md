# 450-question authoring and grading instructions

## Status of the handed-off spreadsheet

The original workbook + CSV list Q0001–Q0450 with **five IDs per lesson** and a topic-to-dataset assignment. These rows are **draft authoring seeds**, NOT validated programming exercises. Some legacy briefs are nonsensical (for example, Q0001 asks to "implement what is Apache Spark and PySpark" and return a schema). Never publish them verbatim or assert the 450 questions are finished. The v4 planning CSV preserves those seeds and explicitly marks every row `not_authored` and `not_executed`.

## Author from learning objectives, not API names

For each lesson, define a precise learner capability, known prerequisite skills, and the appropriate exercise type. Allocate five slots A–E when educationally meaningful, but redistribute or convert to concept-checks, code tracing, diagnostic plans, or longer labs where necessary. Preserve stable question IDs unless versioned migration is planned.

The five roles are: Foundation, Business task, Edge case, Debugging, Integration. They are **not** five copies of the same operation with different column names. New questions must cover genuinely different reasoning.

### Appropriate question types

- DataFrame coding: return DataFrame, rows/schema/multiplicity asserted.
- Complete/debug code: expected output + runtime behavior asserted.
- Predict output/trace Spark: deterministic code+trace oracle, good for lazy evaluation/RDDs/driver/executor concepts.
- Spark SQL vs DataFrame equivalent operations: compare documented output, not string equality.
- Execution plan interpretation: use pinned plans and evidence, not time folklore.
- Pipeline coding: inspect outputs + intermediate states + rerun idempotency.
- Structured Streaming: controlled micro-batch inputs, watermark/replay/late-event oracles, checkpoint isolation.
- Performance lab: identical input + controlled resource profile + repeated benchmarks + correctness gates; no hard-coded "broadcast is always faster" answers.
- Concept knowledge: short verified checks, optionally appropriate to introduction/deployment. Do not force return-a-DataFrame for purely conceptual topics.

## For each question, create 12 assets

1. `question.yaml`: ID, lesson ID, dataset/version/fixtures, type, difficulty, objective and prerequisites.
2. `problem.md`: independent unambiguous business story; explicit entity and business rules.
3. `input_schema.yaml`: table names, columns, Spark types, nullability, time-zone and decimal rules.
4. `sample`: visible small input and expected output; all named fields actually exist.
5. `starter.py`: narrow public entry point such as `solve(accounts, transactions)`.
6. `reference.py`: private tested reference solution; no untrusted input interpolation.
7. `oracle.py` or expected datasets from a separately checked implementation where possible.
8. `tests/`: 6–10+ meaningful hidden cases; tests cover zeros, nulls, duplicates, ties, missing keys, boundaries and scale as applicable.
9. `hints.md`: graduated hints that do not simply reveal the solution.
10. `explanation.md`: why correct, alternatives, pitfalls, how to interpret Spark plans where relevant.
11. `feedback.yaml`: schema/runtime/row mismatch messages in plain language, with no hidden answer leakage.
12. `provenance.yaml`: author, reviewed Spark version, fixture hash, review/test status.

## Example: L026 D02 anti-join practice group

- Q0126: Find accounts with at least one posted transaction (semi join).
- Q0127: Find all accounts that never appear in transactions (anti join).
- Q0128: Identify orphan transactions including null account IDs; specify that SQL joins do not match null keys by default.
- Q0129: Debug a failed anti-join due to wrong right-side filtering or duplicate expectation.
- Q0130: Match transfer records across two systems; compute a signed balance reconciliation with correct join grain.

For Q0127, a learner can implement:

```python
from pyspark.sql import DataFrame

def solve(accounts: DataFrame, transactions: DataFrame) -> DataFrame:
    return accounts.join(transactions.select('account_id'), 'account_id', 'left_anti')
```

Only grade by expected behavior unless API usage is an explicit concept being tested; avoid rejecting valid alternative implementations. `Run` uses visible fixtures. `Submit` uses hidden fixtures unavailable to user code. Compare multisets ignoring order unless explicitly ordered; assert column names/order/types/nullability according to spec. Avoid silently accepting monetary differences with default float tolerances. Normalize timezone/collation semantics explicitly. Bound `.collect()` and `.toPandas()` by policy. Materialize outputs to enforce lazy evaluation during validation.

## Required authoring and CI gates

- Problem conditions map 1:1 to expected rows/columns and the reference solution.
- All cited table and field names exist in the versioned dataset manifest.
- Reference executes under a pinned classic Spark image; separate test implementation confirms expected outcomes when feasible.
- All hidden fixtures have independently checked oracles and prove intended edge behavior.
- Legitimate alternate solutions pass; known wrong solutions fail; duplicate/row-order behavior is explicit.
- Labels Easy/Medium/Hard are calibrated with actual solver experience, not inherited from placeholder CSV.
- Concepts are only used after being taught or explicitly linked as prerequisites.
- Publish nothing whose tests, wording, legal use, or runtime support are incomplete.

## Production batch strategy

Start with a **25-question pilot** spanning filtering, nulls, joins, windows, nested JSON. Ensure at least D01, D02, D03, D06. Then author in reviewable 25-question batches; keep stable IDs; never bulk-publish AI drafts. Every batch passes actual engine execution + content review + hidden-test adversarial checks + mobile user-flow test.
