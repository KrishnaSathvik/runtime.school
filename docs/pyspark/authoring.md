# Authoring PySpark lessons and questions

How lessons, lesson challenges and practice questions are written, tested on real Spark and registered. The reference
lesson is `src/content/pyspark/lessons/PS-L010.json` with challenges `PS-L010-C1`, `PS-L010-C2`; the reference
practice question is `PS-Q0046`. Read those first and match their quality, tone and length.

Nothing here is published. Nothing is committed, pushed or deployed.

## 1. Rules that matter most

1. **Teach only what the learner has seen.** A lesson may use its own new concepts plus everything taught in the
   lessons it builds on (its prerequisite closure). A practice question may use only what its lesson and that
   lesson's closure teach. Print the closure with:
   `node -e "const r=require('./src/content/pyspark/registry.json');const L=new Map(r.lessons.map(l=>[l.id,l]));const seen=new Set();(function v(id){if(seen.has(id))return;seen.add(id);for(const p of L.get(id).prerequisites)v(p)})(process.argv[1]);console.log([...seen].map(id=>id+' '+L.get(id).title).join('\n'))" PS-L026`
   Lesson titles describe what each one teaches. When in doubt, don't use it.
2. **Real Spark only.** Every printed output, expected result and recorded example comes from running the code on the
   runner (`build-expected`, `build-lesson`). Never type an output by hand.
3. **The UI must read like SQL and Python.** Short, plain sentences. No internal IDs, versions, dataset codes or
   "planned/in review" wording in learner text. Prompts are one or two sentences; rules are short; hints are graduated
   and never give the full answer.
4. **Questions test behaviour, not code style.** Any correct approach must pass. Hidden cases cover boundaries, NULLs,
   duplicates, empties and the realistic data edition.
5. **Each of the five roles is a different problem.** Foundation (apply the concept directly), Business task (a
   realistic request), Edge cases (NULLs, ties, boundaries, duplicates), Debugging (the starter is a plausible but
   wrong solution the learner must fix; the bug must be a realistic mistake), Integration (combine the concept with
   earlier lessons only).

## 2. Lessons

File: `src/content/pyspark/lessons/<PS-Lnnn>.json`, same shape as PS-L010:

- `id`, `minutes`, `lede` (one or two sentences, why this matters), `objectives` (3–4, start with a verb),
  `dataset` (`id`, `version`, `edition: "lesson"`, `tables`: only the tables the lesson uses),
- `blocks`: `text` (markdown with `code`) and `example` / `error-example` (`id`, `title`, `code`, `note`, and for an
  error example the exception type in `error`). 4–6 examples. In examples the dataset's tables are predefined
  variables named after the table (`orders`, `learners`, …), `spark` is the SparkSession, and `display(df, name)`
  exists, but prefer `df.show()`, `print(...)` and `printSchema()` as real PySpark does. Start examples with
  `from pyspark.sql import functions as F` when they use `F`.
- `challenges`: two item ids (`PS-Lnnn-C1`, `PS-Lnnn-C2`).
- `concept`: 3 multiple-choice questions (`id`, `prompt`, `choices`, `answer` index, `why`). Every claim must be true
  on Spark 4.0.1; when a claim is about behaviour, prove it in a quick runner job before writing it.
- `review`: 5–6 one-line takeaways. `practice`: practice question ids for this lesson that exist (may be empty).

Concept lessons (how Spark runs, sessions, lazy evaluation, RDDs, execution) may use **predict** challenges (below)
instead of DataFrame ones, and examples like `df.rdd.getNumPartitions()`, `spark.sparkContext.defaultParallelism`,
`df.explain()` — all real on local Spark. Keep claims about clusters honest: the runner is local mode (`local[2]`).

## 3. Items (lesson challenges and practice questions)

Two kinds.

**DataFrame item** (`kind` omitted): public spec `src/content/pyspark/items/<id>.json` like `PS-Q0046.json`
(`id`, `slug`, `lesson`, `role` (practice only), `format: "dataframe_coding"`, `difficulty`, `minutes`, `title`,
`dataset {id, version}`, `prompt`, `rules`, `hints` (3), `explanation` (practice), `entry` (usually `solve`),
`inputs` (table names, in argument order; may be `[]` when the learner builds the data), `starter`, `output
{columns, order_sensitive}`, `visible: [{id: "sample", edition: "lesson"}]`, `limits`).
Private files in `services/spark-runner/private/<id>/`:
`reference.py` (correct answer), `oracle.py` (plain-Python `expected_rows(tables)` where `tables` maps table name →
file path; independent of Spark; same value encoding as the harness: decimals/dates/timestamps as text, NULL as None,
doubles as floats), `hidden.json` (list of `{id, label}` or `{id, label, edition}`; labels describe the case in plain
words without revealing data), `hidden/<case>/<table>.csv|.jsonl` (small hand-made edge fixtures with the dataset's
columns), `wrong.json` (3–5 realistic wrong answers: `{name, code, must_fail: [case ids]}`).
Slugs: short kebab-case from the title, unique across all items.

**Difficulty and minutes come from the work, not the role.** Score four axes 0–2 (rubric from
`proposals/spark-sql-and-coverage.md` §5, as refined here):

| Axis | 0 | 1 | 2 |
|---|---|---|---|
| A. Concepts beyond the lesson's own | none | one | two or more |
| B. Steps the learner writes (DataFrame/RDD/stream calls; debugging: the whole pipeline to read) | ≤ 2 | 3–5 | ≥ 6 |
| C. Edge reasoning (NULL, ties, duplicates, boundaries, lateness, types) | none | one or two, named in the rules | three or more, or an unnamed trap |
| D. Lines the learner writes (reference minus starter) | ≤ 6 | 7–15 | > 15 |

Modifiers: debugging −1 when the fix is one or two lines; +1 when two advanced mechanisms interact (stream + join,
window + join, merge + window). Predict items: B = prints, C = how much the worked answer must explain, D = program
lines without the stream helpers, −1 (reading, not writing). Small tie-breakers (more input tables, more lines, more
steps, more hidden cases) add 0.2 each. Bands: **easy ≤ 1.4, medium 1.6–3.2, hard ≥ 3.4** (lesson challenges ≥ 3.6).
Then: a one- or two-line debugging fix is at most medium; a coding item with D = 0 and B < 2 is hard only at ≥ 5; a
predict item is hard only at ≥ 5 or when read as such; a lesson's foundation question is never harder than its easiest
other practice question, and no lesson's practice set is all hard. Read the borderline items rather than trusting the
script: a short answer that needs a reader option, a cast rule or exact decimals nobody named is medium, not easy.
Minutes: coding 6/8 easy, 10/12 medium, 14 + 3 per point above 4 hard; predict 4–5 / 6–7 / 8–9. Target mix across the
course: about a third easy, 40–45% medium, 20–30% hard (`tests/pyspark-registry.test.ts` checks the shape).

**The visible sample must show the behaviour the item tests.** Every main mistake (most of `wrong.json`) should fail
the `sample` case, and `must_fail` should list `sample` where it does. If the lesson edition has no rows that show it
(no unsold product, no NULL, no tie), don't edit the shared dataset: give the item its own sample with
`"visible": [{"id": "sample", "sample": true}]` and files `services/spark-runner/samples/<id>/sample/<table>.csv|jsonl|txt`
(the dataset's columns and schema; at most 12 rows per table, usually the lesson rows plus the few that show the
behaviour). `build-expected` copies those tables into the public `<id>.expected.json`, and the page shows all their rows
in place of the edition's. Reference: `PS-L025-C2`. Check with the self-check below that the main wrong answers fail
`sample`.

**Every item needs hidden cases** that differ from the sample, so returning the sample's (public) expected rows as a
literal fails. Hidden cases run in their own container and report only pass/fail and fixed wording, so the label is
all a learner learns about a failing one: make each label name one behaviour. If what varies isn't a dataset table
(config overrides, size targets, boundary values), give the item its own small table: `"own_tables": {"overrides":
"key STRING, value STRING"}`, list it in `inputs`, and put a file for it in every case folder (`samples/<id>/<case>/`,
`private/<id>/hidden/<case>/`; for an edition case, the same folders hold just the own table).

**A required technique must be graded.** If the prompt says "use X" (a pandas UDF, mapInPandas, RDD functions, a
broadcast join, a Delta merge, a stream), add `"technique": {"name": "...", "plan": [<operator>]}` (or
`"streams": true`) and, when the plan operator isn't in `api.TECHNIQUE_CALLS`, `"source": ["<api name>", ...]`: the
check needs both the operator in Spark's plan and the call in the learner's source. Otherwise say "any approach passes".

**Predict item** (`"kind": "predict"`): `id`, `slug`, `lesson`, `difficulty`, `minutes`, `title`, `prompt` ("What does
this program print?"-style), `program` (short; uses the dataset's predefined tables), `dataset {id, version}`,
`edition`, `hints` (3). Private: `services/spark-runner/private/<id>/wrong.json` = list of plausible wrong predictions
(strings). No reference or hidden cases.

## 4. Commands (run from the repo root; one Spark job at a time — the Docker VM is shared)

```
python3 services/spark-runner/run.py build-expected <item-id>     # records expected results (and public file)
python3 services/spark-runner/run.py build-lesson <PS-Lnnn>       # records every example's output
python3 services/spark-runner/run.py check <item-id> <file.py>    # grade any solution, e.g. a wrong one
node scripts/pyspark/build-index.mjs                              # register files with the app (coordinator runs it too)
```

Self-check for your own items before finishing (sequential, in Python):

```python
import sys, json; sys.path.insert(0, "services/spark-runner")
from runner import api
r = api.check("<id>", open("services/spark-runner/private/<id>/reference.py").read()); print(r["score"], r["passed"])
for w in json.load(open("services/spark-runner/private/<id>/wrong.json")):
    r = api.check("<id>", w["code"]); print(w["name"], r["score"], [c["id"] for c in r["checks"] if not c["passed"]])
```

The reference must pass every case; each wrong answer must fail at least its `must_fail` cases; the oracle must agree
with the recorded expected rows (`services/spark-runner/private/<id>/expected/*.json`) for every case. The coordinator
runs `services/spark-runner/tests/test_items.py` over everything at the end.

## 5. Don't

- Edit `src/content/pyspark/registry.json`, `content.ts`, `generated.ts`, runner code, UI code or other agents' files.
  Report the ids you wrote; the coordinator registers statuses.
- Use concepts beyond the closure, real company/person names, or outputs that weren't produced by the runner.
