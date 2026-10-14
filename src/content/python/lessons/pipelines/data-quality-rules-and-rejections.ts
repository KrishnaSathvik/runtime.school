import { py } from "@/engine/python/values";
import type { PyValue } from "@/engine/python/values";
import type { PyLesson } from "../../types";

const s = py.str;
const i = py.int;
const rec = (entries: [string, PyValue][]) => py.dict(entries.map(([k, v]) => [s(k), v] as [PyValue, PyValue]));
const strs = (...xs: string[]) => py.list(...xs.map(s));

const RULES = `def has_customer(r):
    return bool(r.get("customer_id"))


def positive_amount(r):
    return isinstance(r.get("amount_cents"), int) and r["amount_cents"] > 0


def known_currency(r):
    return r.get("currency") in {"GBP", "EUR", "USD"}


RULES = [
    ("missing_customer", has_customer),
    ("non_positive_amount", positive_amount),
    ("unknown_currency", known_currency),
]`;

export const dataQualityRulesAndRejections: PyLesson = {
  slug: "data-quality-rules-and-rejections",
  ref: "python:data-quality-rules-and-rejections",
  module: "pipelines",
  number: 3,
  title: "Data quality rules and rejections",
  level: "advanced",
  summary:
    "Write data-quality rules as small named functions, apply all of them to every record, and split the data into accepted rows and a quarantine of rejected rows, each with every reason it failed. Then summarise the rejections, so data problems are measured instead of hidden.",

  sections: [
    {
      label: "rules as functions",
      blocks: [
        {
          kind: "p",
          text: "Each **quality rule** checks one thing and is easy to read on its own: “has a customer”, “amount is positive”, “currency is one we support”. Writing each as a small function that returns `True` (passes) or `False`, paired with a **reason code**, makes the rule list itself the documentation, and adding a rule is one line.",
        },
        { kind: "code", code: RULES },
      ],
    },
    {
      label: "quarantine, don't delete",
      blocks: [
        {
          kind: "p",
          text: "Records that fail go to a **quarantine** (or “rejected”) output with the reasons attached, not into the bin. Someone can inspect them, fix the source, and reprocess them. Apply **every** rule to every record and keep all the failing reason codes: a record missing a customer **and** with a negative amount has two problems, and both need fixing.",
        },
        {
          kind: "p",
          text: "Every input record ends up in exactly one place: accepted or rejected. That invariant, `len(accepted) + len(rejected) == len(records)`, is the simplest and most valuable check a pipeline can make about itself.",
        },
      ],
    },
    {
      label: "measuring quality",
      blocks: [
        {
          kind: "p",
          text: "Count rejections per reason. A summary like `{\"unknown_currency\": 41, \"missing_customer\": 2}` turns “the data seems off” into a specific, trackable problem, and a sudden jump in one reason is often the first sign that an upstream system changed.",
        },
      ],
    },
  ],

  example: {
    caption: "Applying every rule and quarantining failures with their reasons. Press Run to execute it with real Python; running examples never affects your progress.",
    code: `${RULES}


records = [
    {"order_id": "A1", "customer_id": "C01", "amount_cents": 4000, "currency": "GBP"},
    {"order_id": "A2", "customer_id": "", "amount_cents": -500, "currency": "GBP"},
    {"order_id": "A3", "customer_id": "C02", "amount_cents": 1550, "currency": "JPY"},
]

accepted, rejected = [], []
for r in records:
    reasons = [code for code, rule in RULES if not rule(r)]
    if reasons:
        rejected.append({**r, "reasons": reasons})
    else:
        accepted.append(r)

print("accepted:", [r["order_id"] for r in accepted])
for r in rejected:
    print("rejected:", r["order_id"], r["reasons"])
print(len(accepted) + len(rejected) == len(records))`,
  },

  walkthrough: [
    {
      title: "One rule, one question",
      text: "Each rule answers yes or no about one record.",
      code: `${RULES}

r = {"order_id": "A2", "customer_id": "", "amount_cents": -500, "currency": "GBP"}
for code, rule in RULES:
    print(code, "passes" if rule(r) else "FAILS")`,
    },
    {
      title: "Collect every failing reason",
      text: "A list comprehension over the rules gives all the reasons at once, not just the first.",
      code: `${RULES}

r = {"order_id": "A9", "amount_cents": 0, "currency": "XYZ"}
print([code for code, rule in RULES if not rule(r)])`,
    },
    {
      title: "Counting reasons",
      text: "`Counter` over all the reasons gives a quality summary in one line.",
      code: 'from collections import Counter\nrejected = [{"reasons": ["unknown_currency"]}, {"reasons": ["missing_customer", "non_positive_amount"]}, {"reasons": ["unknown_currency"]}]\nprint(dict(Counter(reason for r in rejected for reason in r["reasons"])))',
    },
    {
      title: "The reconciliation check",
      text: "Every record must be accounted for. If this ever prints `False`, the pipeline lost or duplicated something.",
      code: "records = list(range(10))\naccepted = [r for r in records if r % 3]\nrejected = [r for r in records if not r % 3]\nprint(len(accepted), len(rejected), len(accepted) + len(rejected) == len(records))",
    },
  ],

  mistakes: [
    {
      title: "Stopping at the first failed rule",
      text: "Order A2 has two problems, but `break` records only the first, so fixing it reveals a second rejection on the next run.",
      code: `${RULES}

r = {"order_id": "A2", "customer_id": "", "amount_cents": -500, "currency": "GBP"}
reasons = []
for code, rule in RULES:
    if not rule(r):
        reasons.append(code)
        break
print(reasons)`,
      fix: "Apply every rule and keep every failing reason.",
    },
    {
      title: "Dropping bad rows silently",
      text: "The filter keeps the good rows, but there's no record of what was dropped or why: nobody will ever know that a third of the data vanished.",
      code: `${RULES}

records = [{"customer_id": "C1", "amount_cents": 5, "currency": "GBP"}, {"customer_id": "", "amount_cents": 5, "currency": "GBP"}, {"customer_id": "C2", "amount_cents": 5, "currency": "AUD"}]
clean = [r for r in records if all(rule(r) for _, rule in RULES)]
print(len(records), "in,", len(clean), "out")`,
      fix: "Send failures to a rejected list with their reasons, and report its size.",
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "Split accepted and rejected",
      prompt:
        "Write `apply_rules(records, rules)`. `rules` is a list of `(code, function)` pairs, like `RULES` in the editor. Return `(accepted, rejected)`: accepted records unchanged, and each rejected record as a **new** dictionary with all its fields plus `\"reasons\"`, a list of **every** failing rule's code in rule order. Keep input order in both lists, and don't change the input records.",
      looksFor: [
        "A record that passes every rule is accepted, unchanged.",
        "A rejected record lists every failing reason, in rule order.",
        "Every input lands in exactly one list, and inputs aren't modified.",
      ],
      starter: `${RULES}


def apply_rules(records, rules):
    # Return (accepted, rejected-with-reasons).
    pass
`,
      task: {
        checks: [
          {
            kind: "expr",
            id: "split",
            label: "Accepted and rejected, with every reason",
            show: "apply_rules(records, RULES)",
            expr: 'records = [\n    {"order_id": "A1", "customer_id": "C01", "amount_cents": 4000, "currency": "GBP"},\n    {"order_id": "A2", "customer_id": "", "amount_cents": -500, "currency": "GBP"},\n    {"order_id": "A3", "customer_id": "C02", "amount_cents": 1550, "currency": "JPY"},\n    {"order_id": "A4", "customer_id": "C03", "amount_cents": 99, "currency": "EUR"},\n]\naccepted, rejected = apply_rules(records, RULES)\nresult = ([r["order_id"] for r in accepted], [(r["order_id"], r["reasons"]) for r in rejected])',
            expected: py.tuple(strs("A1", "A4"), py.list(py.tuple(s("A2"), strs("missing_customer", "non_positive_amount")), py.tuple(s("A3"), strs("unknown_currency")))),
            tip: 'reasons = [code for code, rule in rules if not rule(r)]; rejected.append({**r, "reasons": reasons}).',
          },
          {
            kind: "expr",
            id: "unchanged",
            label: "Input records aren't modified",
            show: "the input record after apply_rules",
            expr: 'r = {"order_id": "B1", "customer_id": "", "amount_cents": 5, "currency": "GBP"}\napply_rules([r], RULES)\nresult = "reasons" in r',
            expected: py.bool(false),
            tip: 'Build a new dict for each rejection ({**r, "reasons": ...}) instead of adding a key to r.',
          },
          {
            kind: "expr",
            id: "other-rules",
            label: "Works with other rules",
            hidden: true,
            expr: 'rules = [("even", lambda r: r["n"] % 2 == 0), ("small", lambda r: r["n"] < 10)]\naccepted, rejected = apply_rules([{"n": 4}, {"n": 15}, {"n": 12}], rules)\nresult = (accepted, rejected)',
            expected: py.tuple(py.list(rec([["n", i(4)]])), py.list(rec([["n", i(15)], ["reasons", strs("even", "small")]]), rec([["n", i(12)], ["reasons", strs("small")]]))),
          },
        ],
      },
      hints: [
        "accepted, rejected = [], [] and loop over records.",
        "reasons = [code for code, rule in rules if not rule(r)].",
        'If reasons: rejected.append({**r, "reasons": reasons}); else accepted.append(r).',
      ],
      answer: `${RULES}


def apply_rules(records, rules):
    """Return (accepted records, rejected records with every failing rule's code in "reasons")."""
    accepted, rejected = [], []
    for record in records:
        reasons = [code for code, rule in rules if not rule(record)]
        if reasons:
            rejected.append({**record, "reasons": reasons})
        else:
            accepted.append(record)
    return accepted, rejected`,
      wrong: [
        { code: `${RULES}\n\ndef apply_rules(records, rules):\n    accepted, rejected = [], []\n    for r in records:\n        for code, rule in rules:\n            if not rule(r):\n                rejected.append({**r, "reasons": [code]})\n                break\n        else:\n            accepted.append(r)\n    return accepted, rejected\n`, fails: ["split", "other-rules"], why: "only the first reason" },
        { code: `${RULES}\n\ndef apply_rules(records, rules):\n    accepted, rejected = [], []\n    for r in records:\n        r["reasons"] = [code for code, rule in rules if not rule(r)]\n        (rejected if r["reasons"] else accepted).append(r)\n    return accepted, rejected\n`, fails: ["unchanged", "other-rules"], why: "adds reasons to the input records" },
      ],
    },
    {
      id: "challenge-2",
      title: "Summarise rejections",
      prompt:
        "Write `quality_summary(total, rejected)`, where `total` is the number of input records and `rejected` is a list of rejected records with `\"reasons\"`. Return a dictionary: `\"total\"`, `\"accepted\"` (total minus rejected), `\"rejected\"`, `\"rejection_rate\"` (rejected / total, rounded to 3 places; 0.0 when total is 0) and `\"by_reason\"`: a dictionary of reason → number of rejected records with that reason, with keys in alphabetical order.",
      looksFor: [
        "Counts and the rejection rate are correct, including for an empty run.",
        "`by_reason` counts each reason across the rejected records, keys sorted.",
      ],
      starter: "def quality_summary(total, rejected):\n    # Return the quality summary dict.\n    pass\n",
      task: {
        checks: [
          {
            kind: "expr",
            id: "summary",
            label: "The summary",
            show: "quality_summary(8, rejected)",
            expr: 'rejected = [{"reasons": ["unknown_currency"]}, {"reasons": ["missing_customer", "non_positive_amount"]}, {"reasons": ["unknown_currency"]}]\nout = quality_summary(8, rejected)\nresult = (out, list(out["by_reason"]))',
            expected: py.tuple(
              rec([["total", i(8)], ["accepted", i(5)], ["rejected", i(3)], ["rejection_rate", py.float(0.375)], ["by_reason", rec([["missing_customer", i(1)], ["non_positive_amount", i(1)], ["unknown_currency", i(2)]])]]),
              strs("missing_customer", "non_positive_amount", "unknown_currency"),
            ),
            tip: "Count reasons with a dict or Counter, then rebuild it in sorted key order: {k: counts[k] for k in sorted(counts)}.",
          },
          { kind: "expr", id: "empty", label: "An empty run", show: "quality_summary(0, [])", expr: "quality_summary(0, [])", expected: rec([["total", i(0)], ["accepted", i(0)], ["rejected", i(0)], ["rejection_rate", py.float(0)], ["by_reason", py.dict([])]]), tip: "Guard the division: rejection_rate is 0.0 when total is 0." },
        ],
      },
      hints: [
        "rejected_count = len(rejected); accepted = total - rejected_count.",
        "rate = round(rejected_count / total, 3) if total else 0.0.",
        'Count with counts[reason] = counts.get(reason, 0) + 1 for each reason of each record, then sort the keys.',
      ],
      answer: 'def quality_summary(total, rejected):\n    """Summarise a run: counts, rejection rate and rejections per reason."""\n    counts = {}\n    for record in rejected:\n        for reason in record["reasons"]:\n            counts[reason] = counts.get(reason, 0) + 1\n    return {\n        "total": total,\n        "accepted": total - len(rejected),\n        "rejected": len(rejected),\n        "rejection_rate": round(len(rejected) / total, 3) if total else 0.0,\n        "by_reason": {reason: counts[reason] for reason in sorted(counts)},\n    }',
      wrong: [
        { code: 'def quality_summary(total, rejected):\n    counts = {}\n    for r in rejected:\n        counts[r["reasons"][0]] = counts.get(r["reasons"][0], 0) + 1\n    return {"total": total, "accepted": total - len(rejected), "rejected": len(rejected), "rejection_rate": round(len(rejected) / total, 3) if total else 0.0, "by_reason": dict(sorted(counts.items()))}\n', fails: ["summary"], why: "counts only the first reason" },
        { code: 'def quality_summary(total, rejected):\n    counts = {}\n    for r in rejected:\n        for reason in r["reasons"]:\n            counts[reason] = counts.get(reason, 0) + 1\n    return {"total": total, "accepted": total - len(rejected), "rejected": len(rejected), "rejection_rate": round(len(rejected) / total, 3), "by_reason": counts}\n', fails: ["summary", "empty"], why: "unsorted reasons, and division by zero" },
      ],
    },
  ],

  quiz: [
    {
      id: "invariant",
      prompt: "A run reads 1,000 records, accepts 940 and rejects 55. What does that tell you?",
      options: [
        { text: "5 records were lost somewhere, which is a bug to find before trusting the output", correct: true, why: "940 + 55 = 995. Every record must end up accepted or rejected." },
        { text: "The rejection rate is 5.5%, so all is well", why: "The counts don't add up; something disappeared." },
        { text: "5 records had more than one reason", why: "Multiple reasons don't remove records; each still appears once in rejected." },
        { text: "Nothing: small differences are normal", why: "Records don't vanish in a correct pipeline; any gap is a defect." },
      ],
    },
    {
      id: "quarantine",
      prompt: "Why keep rejected records instead of discarding them?",
      options: [
        { text: "They can be inspected, the source fixed, and the records reprocessed", correct: true, why: "Quarantine turns bad data into a fixable, measurable problem." },
        { text: "Rejected records are usually fine", why: "They failed a rule; the point is to see why." },
        { text: "To make the output larger", why: "Rejected records go to a separate output, not the main one." },
        { text: "Python can't delete records", why: "It can; keeping them is a deliberate design choice." },
      ],
    },
  ],

  outcomes: [
    "Write quality rules as small named functions with reason codes.",
    "Apply every rule, quarantining failures with all their reasons.",
    "Check that accepted plus rejected equals the input.",
    "Summarise rejections by reason and rate.",
  ],
};
