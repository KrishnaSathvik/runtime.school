import { py } from "@/engine/python/values";
import type { PyValue } from "@/engine/python/values";
import type { PyLesson } from "../../types";
import { mutationCheck } from "../../checks";

const s = py.str;
const i = py.int;
const rec = (entries: [string, PyValue][]) => py.dict(entries.map(([k, v]) => [s(k), v] as [PyValue, PyValue]));
const strs = (...xs: string[]) => py.list(...xs.map(s));

const PIPELINE = `def run_pipeline(raw_rows):
    """Clean raw rows: keep those with an id and a positive amount; amounts in cents."""
    accepted, rejected = [], []
    for row in raw_rows:
        if not row.get("id"):
            rejected.append({**row, "reason": "missing_id"})
        elif not isinstance(row.get("amount_cents"), int) or row["amount_cents"] <= 0:
            rejected.append({**row, "reason": "bad_amount"})
        else:
            accepted.append({"id": row["id"], "amount_cents": row["amount_cents"]})
    return accepted, rejected`;

const PIPELINE_DROPS = PIPELINE.replace('            rejected.append({**row, "reason": "bad_amount"})', "            pass");
const PIPELINE_KEEPS_BAD = PIPELINE.replace('row["amount_cents"] <= 0', 'row["amount_cents"] < 0');
const PIPELINE_DUPLICATES = PIPELINE.replace(
  '            accepted.append({"id": row["id"], "amount_cents": row["amount_cents"]})',
  '            accepted.append({"id": row["id"], "amount_cents": row["amount_cents"]})\n            if row["amount_cents"] > 1000:\n                accepted.append({"id": row["id"], "amount_cents": row["amount_cents"]})',
);

export const pipelineTestsAndObservability: PyLesson = {
  slug: "pipeline-tests-and-observability",
  ref: "python:pipeline-tests-and-observability",
  module: "pipelines",
  number: 5,
  title: "Pipeline tests and observability",
  level: "advanced",
  summary:
    "Make a pipeline check itself and report what it did: reconcile counts between stages, record run metrics, log at the right level, and write tests that run the whole pipeline on a small fixed input, so a silent data loss can't slip through.",

  sections: [
    {
      label: "reconciliation",
      blocks: [
        {
          kind: "p",
          text: "**Reconciliation** compares counts (and sometimes totals) between stages: rows read = rows accepted + rows rejected; the sum of amounts in = the sum out plus the sum rejected. These checks are cheap and catch the worst kind of bug: data that quietly disappears or doubles. When one fails, the pipeline should **fail loudly** (raise) rather than publish wrong results.",
        },
      ],
    },
    {
      label: "metrics and logs",
      blocks: [
        {
          kind: "p",
          text: "**Observability** means being able to tell what a run did without reading the code. Return (or write) a small **metrics** dictionary every run: rows in, accepted, rejected per reason, totals, the schema version, and how long it took. Log progress at `INFO`, rejections at `WARNING` and failures at `ERROR`. Over time, metrics show trends: a rejection rate creeping up is a warning before it becomes an incident.",
        },
      ],
    },
    {
      label: "pipeline tests",
      blocks: [
        {
          kind: "p",
          text: "Unit tests check each rule; a **pipeline test** runs the whole flow on a small, fixed **fixture** (a handful of rows that exercise each path: valid, each kind of invalid, a boundary value) and asserts the outputs and the metrics. Keep fixtures in the repository, deterministic and tiny, so the test is fast and its expected results are obvious by eye.",
        },
      ],
    },
  ],

  example: {
    caption: "Running a pipeline, reconciling it and reporting metrics. Press Run to execute it with real Python; running examples never affects your progress.",
    code: `${PIPELINE}


raw = [
    {"id": "A1", "amount_cents": 4000},
    {"id": "", "amount_cents": 1500},
    {"id": "A3", "amount_cents": -200},
    {"id": "A4", "amount_cents": 1200},
]
accepted, rejected = run_pipeline(raw)

metrics = {
    "rows_in": len(raw),
    "accepted": len(accepted),
    "rejected": len(rejected),
    "cents_in": sum(r["amount_cents"] for r in raw),
    "cents_accepted": sum(r["amount_cents"] for r in accepted),
}
assert metrics["accepted"] + metrics["rejected"] == metrics["rows_in"], "rows lost or duplicated"
print(metrics)`,
  },

  walkthrough: [
    {
      title: "Counts that must add up",
      text: "Every row is accounted for, and the amounts reconcile too: what came in is either accepted or rejected.",
      code: `${PIPELINE}

raw = [{"id": "A1", "amount_cents": 4000}, {"id": "", "amount_cents": 1500}, {"id": "A3", "amount_cents": -200}]
accepted, rejected = run_pipeline(raw)
print(len(raw) == len(accepted) + len(rejected))
print(sum(r["amount_cents"] for r in raw) == sum(r["amount_cents"] for r in accepted) + sum(r["amount_cents"] for r in rejected))`,
    },
    {
      title: "A check that fails loudly",
      text: "This broken version drops bad amounts instead of rejecting them. The reconciliation catches it and stops the run.",
      code: `${PIPELINE_DROPS}

raw = [{"id": "A1", "amount_cents": 4000}, {"id": "A3", "amount_cents": -200}]
accepted, rejected = run_pipeline(raw)
missing = len(raw) - len(accepted) - len(rejected)
if missing:
    raise RuntimeError(f"reconciliation failed: {missing} row(s) unaccounted for")`,
    },
    {
      title: "Metrics per reason",
      text: "Counting rejections by reason makes the run's quality visible at a glance.",
      code: `from collections import Counter
${PIPELINE}

raw = [{"id": "", "amount_cents": 1}, {"id": "B", "amount_cents": 0}, {"id": "C", "amount_cents": None}, {"id": "D", "amount_cents": 5}]
accepted, rejected = run_pipeline(raw)
print(dict(Counter(r["reason"] for r in rejected)), len(accepted))`,
    },
    {
      title: "A pipeline test on a fixture",
      text: "A tiny fixed input with one row per path, and assertions on outputs and counts.",
      code: `${PIPELINE}


def test_pipeline():
    fixture = [
        {"id": "OK", "amount_cents": 100},
        {"id": "", "amount_cents": 100},
        {"id": "ZERO", "amount_cents": 0},
    ]
    accepted, rejected = run_pipeline(fixture)
    assert [r["id"] for r in accepted] == ["OK"]
    assert sorted(r["reason"] for r in rejected) == ["bad_amount", "missing_id"]
    assert len(accepted) + len(rejected) == len(fixture)


test_pipeline()
print("test_pipeline passed")`,
    },
  ],

  mistakes: [
    {
      title: "Publishing without reconciling",
      text: "The broken pipeline silently drops a row, and nothing notices: the output looks plausible.",
      code: `${PIPELINE_DROPS}

raw = [{"id": "A1", "amount_cents": 4000}, {"id": "A3", "amount_cents": -200}]
accepted, rejected = run_pipeline(raw)
print("published", len(accepted), "rows; rejected", len(rejected))`,
      fix: "Check `len(accepted) + len(rejected) == len(raw)` before publishing, and raise if it fails.",
    },
    {
      title: "A test fixture that only has good rows",
      text: "The test passes, but it never exercises a rejection path, so the dropped-rows bug above would pass it too.",
      code: `${PIPELINE_DROPS}

accepted, rejected = run_pipeline([{"id": "A1", "amount_cents": 100}])
assert len(accepted) == 1
print("passed, but no bad row was ever tested")`,
      fix: "Include at least one row for every path: each rejection reason and a boundary value.",
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "Reconcile and report a run",
      prompt:
        "Write `run_with_metrics(raw_rows)`, which calls `run_pipeline` (in the editor) and returns `(accepted, metrics)`. `metrics` is a dictionary with `rows_in`, `accepted`, `rejected`, `rejected_by_reason` (reason → count, keys sorted) and `cents_accepted`. Before returning, reconcile: if `accepted + rejected != rows_in`, raise `RuntimeError`. (Check answer also runs your function with a broken `run_pipeline` swapped in.)",
      looksFor: [
        "Metrics are correct, with `rejected_by_reason` keys sorted.",
        "The function raises `RuntimeError` when rows don't reconcile.",
      ],
      starter: `${PIPELINE}


def run_with_metrics(raw_rows):
    # Return (accepted, metrics); raise RuntimeError if rows don't reconcile.
    pass
`,
      task: {
        checks: [
          {
            kind: "expr",
            id: "metrics",
            label: "Correct metrics",
            show: "run_with_metrics(raw)[1]",
            expr: 'raw = [{"id": "A1", "amount_cents": 4000}, {"id": "", "amount_cents": 1500}, {"id": "A3", "amount_cents": -200}, {"id": "A4", "amount_cents": 1200}, {"id": "A5", "amount_cents": 0}]\naccepted, metrics = run_with_metrics(raw)\nresult = (metrics, list(metrics["rejected_by_reason"]))',
            expected: py.tuple(
              rec([["rows_in", i(5)], ["accepted", i(2)], ["rejected", i(3)], ["rejected_by_reason", rec([["bad_amount", i(2)], ["missing_id", i(1)]])], ["cents_accepted", i(5200)]]),
              strs("bad_amount", "missing_id"),
            ),
          },
          {
            kind: "expr",
            id: "reconcile",
            label: "Raises when a broken pipeline loses rows",
            show: "run_with_metrics with a run_pipeline that drops bad amounts",
            expr: `${PIPELINE_DROPS}\n_g = run_with_metrics.__globals__\n_saved = _g["run_pipeline"]\n_g["run_pipeline"] = run_pipeline\ntry:\n    run_with_metrics([{"id": "A1", "amount_cents": 5}, {"id": "A2", "amount_cents": -1}])\n    result = "no error"\nexcept RuntimeError:\n    result = "RuntimeError"\nfinally:\n    _g["run_pipeline"] = _saved`,
            expected: s("RuntimeError"),
            tip: 'if metrics["accepted"] + metrics["rejected"] != metrics["rows_in"]: raise RuntimeError(...).',
          },
        ],
      },
      hints: [
        "accepted, rejected = run_pipeline(raw_rows).",
        'Count reasons into a dict, then sort its keys: {k: counts[k] for k in sorted(counts)}.',
        "Compare len(accepted) + len(rejected) with len(raw_rows) and raise RuntimeError if they differ.",
      ],
      answer: `${PIPELINE}


def run_with_metrics(raw_rows):
    """Run the pipeline, reconcile row counts, and return (accepted, metrics)."""
    accepted, rejected = run_pipeline(raw_rows)
    counts = {}
    for row in rejected:
        counts[row["reason"]] = counts.get(row["reason"], 0) + 1
    metrics = {
        "rows_in": len(raw_rows),
        "accepted": len(accepted),
        "rejected": len(rejected),
        "rejected_by_reason": {reason: counts[reason] for reason in sorted(counts)},
        "cents_accepted": sum(row["amount_cents"] for row in accepted),
    }
    if metrics["accepted"] + metrics["rejected"] != metrics["rows_in"]:
        raise RuntimeError(f"reconciliation failed: {metrics}")
    return accepted, metrics`,
      wrong: [
        { code: `${PIPELINE}\n\ndef run_with_metrics(raw_rows):\n    accepted, rejected = run_pipeline(raw_rows)\n    counts = {}\n    for row in rejected:\n        counts[row["reason"]] = counts.get(row["reason"], 0) + 1\n    return accepted, {"rows_in": len(raw_rows), "accepted": len(accepted), "rejected": len(rejected), "rejected_by_reason": dict(sorted(counts.items())), "cents_accepted": sum(r["amount_cents"] for r in accepted)}\n`, fails: ["reconcile"], why: "no reconciliation" },
        { code: `${PIPELINE}\n\ndef run_with_metrics(raw_rows):\n    accepted, rejected = run_pipeline(raw_rows)\n    metrics = {"rows_in": len(raw_rows), "accepted": len(accepted), "rejected": len(raw_rows) - len(accepted), "rejected_by_reason": {}, "cents_accepted": sum(r["amount_cents"] for r in accepted)}\n    if metrics["accepted"] + metrics["rejected"] != metrics["rows_in"]:\n        raise RuntimeError("mismatch")\n    return accepted, metrics\n`, fails: ["metrics", "reconcile"], why: "rejected derived from the others, so it always reconciles" },
      ],
    },
    {
      id: "challenge-2",
      title: "Write a pipeline test that catches real bugs",
      prompt:
        "Write `test_run_pipeline()` with `assert` statements. It must pass for the `run_pipeline` in the editor, and fail for three broken versions that Check answer swaps in: one that drops bad-amount rows instead of rejecting them, one that accepts an amount of 0, and one that accidentally duplicates large orders. Use a small fixture that exercises every path.",
      looksFor: [
        "The test passes for the correct pipeline.",
        "It fails for each of the three broken versions.",
      ],
      starter: `${PIPELINE}


def test_run_pipeline():
    # A small fixture, then assertions on accepted, rejected and the counts.
    pass


test_run_pipeline()
print("test_run_pipeline passed")
`,
      task: {
        checks: [
          { kind: "output", id: "output", label: "The test passes for the correct pipeline", expected: "test_run_pipeline passed\n" },
          {
            kind: "expr",
            id: "catches",
            label: "The test fails for each broken pipeline",
            show: "test_run_pipeline() with the correct pipeline, then three broken ones",
            expr: mutationCheck("test_run_pipeline", "run_pipeline", [PIPELINE, PIPELINE_DROPS, PIPELINE_KEEPS_BAD, PIPELINE_DUPLICATES]),
            expected: py.list(py.bool(true), py.bool(false), py.bool(false), py.bool(false)),
            tip: "Include a zero amount, a negative amount, a missing id and a large valid amount (over 1000 cents), and assert both lists and the reconciliation.",
          },
        ],
      },
      hints: [
        'A fixture with one row per path: valid, missing id, negative, zero, and a large valid amount such as 5000.',
        "Assert the accepted IDs exactly, and the rejected reasons.",
        "Also assert len(accepted) + len(rejected) == len(fixture).",
      ],
      answer: `${PIPELINE}


def test_run_pipeline():
    fixture = [
        {"id": "OK", "amount_cents": 100},
        {"id": "BIG", "amount_cents": 5000},
        {"id": "", "amount_cents": 100},
        {"id": "NEG", "amount_cents": -1},
        {"id": "ZERO", "amount_cents": 0},
    ]
    accepted, rejected = run_pipeline(fixture)
    assert [r["id"] for r in accepted] == ["OK", "BIG"]
    assert sorted(r["reason"] for r in rejected) == ["bad_amount", "bad_amount", "missing_id"]
    assert len(accepted) + len(rejected) == len(fixture)


test_run_pipeline()
print("test_run_pipeline passed")`,
      wrong: [
        { code: `${PIPELINE}\n\ndef test_run_pipeline():\n    accepted, rejected = run_pipeline([{"id": "OK", "amount_cents": 100}, {"id": "", "amount_cents": 5}])\n    assert len(accepted) == 1\n\ntest_run_pipeline()\nprint("test_run_pipeline passed")\n`, fails: ["catches"], why: "fixture misses the zero, negative and large cases" },
      ],
    },
  ],

  quiz: [
    {
      id: "reconcile",
      prompt: "Which check would catch a pipeline that silently drops rows?",
      options: [
        { text: "`len(accepted) + len(rejected) == len(rows_in)`", correct: true, why: "Every row must end up in one of the two outputs; dropped rows make the sum smaller." },
        { text: "`len(accepted) > 0`", why: "A pipeline can drop rows and still accept some." },
        { text: "`all(r[\"amount_cents\"] > 0 for r in accepted)`", why: "That checks the accepted rows are valid, not that none went missing." },
        { text: "Checking that the output file exists", why: "A file can exist and still be missing rows." },
      ],
    },
    {
      id: "fixture",
      prompt: "What makes a good pipeline test fixture?",
      options: [
        { text: "A few rows covering every path: valid, each rejection reason, and boundary values", correct: true, why: "Small enough to read, complete enough that each bug changes the result." },
        { text: "A copy of yesterday's full production file", why: "Large, changing data makes tests slow and their expected results unclear." },
        { text: "Only valid rows, so the test is simple", why: "Then bugs in the rejection paths go untested." },
        { text: "Random rows generated each run", why: "Random input makes failures hard to reproduce; seed it, or use fixed rows." },
      ],
    },
  ],

  outcomes: [
    "Reconcile row counts and totals between stages, and fail loudly when they don't match.",
    "Report run metrics, including rejections per reason.",
    "Write pipeline tests on small fixtures that exercise every path.",
    "Check that tests would actually catch realistic bugs.",
  ],
};
