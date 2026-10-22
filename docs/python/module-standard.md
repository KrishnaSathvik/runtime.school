# Python module standard (derived from M12)

M12 *Collection Algorithms* is the reference module for rebuilding M13 onward. Copy its shape, not its
topics. Files: `src/content/python-v2/lessons/M12.ts`, `src/content/python-v2/questions/M12.ts`.
The rules behind it are in the owner's brief (§1 teaching, §3 challenge gate, §4 practice, §5 grading),
`docs/python/content-rules.md` and `docs/python/grading-capabilities.md`.

## 1. Lesson skeleton

One lesson teaches one idea (`focus`). Its blocks answer, in order: what is it, why does it exist, how
does it work, when do you use it, and what mistakes to avoid.

| Part | What M12 does |
| --- | --- |
| text | The problem the idea solves, in a real setting. Then the pattern in plain words. |
| Example A (understand) | A short runnable program with real output. A note explains each step. |
| text + error-example | A real mistake, run for real: `KeyError`, `AttributeError`, and so on. |
| Example B (apply) | A different, more realistic context, usually a function over a list of dicts. It is not Example A with new constants. |
| text | When to use it, and the mistakes to avoid. |
| tryIt | Change one thing in a working starter. It is graded by `fn` checks with 2–3 hidden cases. |
| c1 | An original problem that uses the same concept. It is a function with a contract and hidden cases. |
| c2 | A transfer problem: the concept plus earlier skills, with a new decision to make. It often adds a `keepsInput` check. |
| concept | One real output prediction, one common-mistake program, one "which job is this" usage question. |
| review | 3–4 lines. The last line links forward to the next lesson or module. |

Excerpt (PY-L12-03, trimmed):

```ts
{
  id: "PY-L12-03",
  version: 2,
  slug: "group-by-key",
  title: "Count, total and group by key",
  focus: "Build a dictionary that collects a count, a total or a list for each key.",
  requires: [/* every concept the code uses; the beginner test lists what is missing */],
  teaches: ["dict-accumulate", "dict-group"],
  blocks: [
    { kind: "text", md: "Questions like *how many orders came from each channel?* need one answer per category…" },
    { kind: "example", title: "Orders per channel", code: src`
channels = ["web", "app", "web", "phone", "app", "web"]
counts = {}
for channel in channels:
    if channel not in counts:
        counts[channel] = 0
    counts[channel] += 1
print(counts)
`, output: "{'web': 3, 'app': 2, 'phone': 1}\n", note: "`counts[channel] += 1` is short for …" },
    { kind: "error-example", title: "Forgetting the starting value", code: src`…counts[channel] += 1…`, error: "KeyError", output: "" },
    { kind: "example", title: "Order IDs per customer", code: src`def orders_by_customer(orders): …` /* R01 rows */ },
  ],
  challenges: [
    { id: "c1", title: "Average rating per product", /* two dicts (sum, count), then a second loop */ },
    { id: "c2", title: "The busiest customer", /* count, then running best; tie rule; None for [] */ },
  ],
}
```

Write code in template literals with the `src` tag. It drops the first newline, so the Python starts at
column 0 and stays readable:
`const src = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\n/, "");`

Lesson UI note: the lesson page shows `spec` rows but not function examples. Put the signature, the input
shape, the return value and one **Example** row in `spec`. The practice page shows public examples by
itself, so don't repeat them in a question's spec.

## 2. Challenge gate (brief §3)

A challenge fails review if a learner can pass it by copying an example and changing a constant or a word.
M12's c1/c2 pairs:

| Lesson | Examples | c1 | c2 (transfer) |
| --- | --- | --- | --- |
| filter | totals ≥ 50; who passed | returned **and** total ≥ minimum → ids | city search, cleaned on both sides (M11), full names |
| transform | °C → °F; line amounts as new dicts | discounted line totals (precedence) | tidy a supplier feed (strip, upper, float) without mutating it |
| group | count per channel; ids per customer | average rating (two dicts, then divide) | top customer: count, running best, tie rule, `None` |
| index/merge | join through an index; `update` on a copy | emails via index, skip unknown | apply changes to known SKUs only (`update` would be wrong) |
| dedupe | cities once; first payment per order | first order per customer (dict as seen-set) | clean mailing list: normalise, skip blanks, dedupe, no mutation |

## 3. Practice question (full excerpt)

```ts
{
  id: "PY-Q12-10",
  version: 2,
  slug: "duplicate-stock-codes",
  title: "Duplicate stock codes in a catalogue",
  format: "validation",
  difficulty: "easy",
  minutes: 10,
  requires: [...fnBase, "else-clause", "nested-condition", "logical", "arithmetic", "comparison"],
  prompt: "Every product in a catalogue should have its own stock code. Before importing a catalogue, report the codes that break that rule.",
  spec: [
    ["Function", "`repeated_codes(products)`"],
    ["products", "a list of dictionaries with `\"stock_code\"` and `\"description\"`"],
    ["Returns", "each stock code that appears more than once, reported **once**, in the order the repeats are found"],
    ["Rules", "codes are compared exactly: `84031a` and `84031A` are different codes; no repeats gives `[]`"],
  ],
  hiddenKinds: ["no repeated codes", "a code repeated three times", "repeats found in a different order from first appearance", "codes that differ only in capital letters", "an empty catalogue"],
  hints: ["what to remember", "the decision", "the subtle rule (never a line of the answer)"],
  explanation: "Why the reference works, and why the usual wrong answers fail.",
  code: {
    starter: src`def repeated_codes(products):\n    repeated = []\n    return repeated\n…demo data + print…`,
    answer: src`…verified reference…`,
    alternatives: [src`…count dict, report when the count reaches 2…`],
    wrong: [
      { code: src`…reports every extra copy…`, fails: ["returns"], why: "a code with three copies is reported twice" },
      { code: src`…counts, then lists count > 1…`, fails: ["returns"], why: "first-seen order, not the order the repeats are found" },
      { code: src`…upper()…`, fails: ["returns"], why: "upper-casing treats two different codes as one" },
    ],
    task: {
      checks: [
        fn("returns", "repeated_codes", [
          example([codes("21329", "84031A", "21329", "22139", "84031A")], ["21329", "84031A"]),
          example([codes("21329", "84031A")], []),
          example([codes("85048", "85048")], ["85048"]),
          hiddenCase("a code repeated three times", [codes("X", "X", "Y", "X")], ["X"]),
          hiddenCase("repeats found in a different order from first appearance", [codes("B", "A", "A", "B")], ["A", "B"]),
          hiddenCase("codes that differ only in capital letters", [codes("84031a", "84031A")], []),
          hiddenCase("an empty catalogue", [[]], []),
        ], { label: "repeated_codes() reports each repeated code once, in the order found" }),
      ],
    },
  },
}
```

Other check patterns in M12:

- **Mutation:** a separate `fn("keeps-input", name, [keepsInput([...]), keepsInput([...], { label })])`. A
  wrong answer that mutates its input fails only `keeps-input`, so the feedback names the real problem
  (L12-02 c2, L12-04 c2, L12-05 c2, Q12-20).
- **"Returns a new object":** an `expr` check such as `apply_changes(_p, {...}) is not _p`, with
  `expected: py.bool(true)` (L12-04 c2).
- **Refactoring:** the same `fn` cases as the original behaviour, plus a hidden operation budget. Q12-19
  counts `==` calls with an instrumented `str` subclass, so a nested-loop join (90,000 comparisons) fails and
  an index (about 600) passes. The starter is the slow original. It passes `returns` and fails only `lookups`.
- **Debugging:** the starter is genuinely broken code, the prompt describes the symptom, and the wrong
  answers are plausible half-fixes (Q12-13: a shared-list alias bug).
- **Prediction:** at most 2 per module, and only with real reasoning (Q12-22: index overwrite, then `update`,
  then key order).

M12 mix: 4 function_implementation, 2 data_transformation, 1 debugging, 1 validation, 1 refactoring and
1 output_prediction. Difficulty: 3 easy, 4 medium, 3 hard. Every function question has at least 3 public and
at least 4 hidden cases, at least 2 wrong answers that fail for the intended reason, and at least 1
alternative style.

## 4. Gates and commands (run all, paste real output)

```sh
npx vitest run tests/python-v2-content.test.ts -t "PY-L12|PY-Q12|registry agrees"  # real Pyodide: outputs, answers, alternatives, starter fails, wrongs fail exactly `fails`
npx vitest run tests/python-v2-beginner.test.ts       # prerequisites: lists every concept missing from `requires`; hint leaks
npx vitest run tests/python-v2-registry.test.ts
npx vitest run tests/python-v2-versions.test.ts tests/python-progress-v2.test.ts
PYQ_MODULES=M12 PYQ_STRICT=1 PYQ_VERBOSE=1 npx vitest run tests/python-v2-quality.test.ts   # must be 0 findings
PYQ_MODULES=M12 PYQ_BASELINE=prune npx vitest run tests/python-v2-quality.test.ts
npx vitest run tests/python-v2-quality.test.ts        # default mode: no NEW findings anywhere (M+1 practice is compared with your lessons)
npx tsc --noEmit -p . 2>&1 | grep -E "M12|versions|python-progress"   # other files have pre-existing errors
```

Registry: edit only your module's entries, with targeted text replacement (format, difficulty, concept,
prerequisites, datasets). Don't re-serialise the whole JSON, because other agents edit other parts of it. The
registry test asserts dataset counts (R01 = 248 questions), so swapping a question to or from R01 breaks it.
Use `F00` for inline fixtures that don't come from a dataset.

## 5. Content versions (saved progress)

When a lesson's or question's assessment changes meaning, add it to `src/content/python-v2/versions.ts`
and set the same `version` on the item. `tests/python-v2-versions.test.ts` checks that the two agree. On load,
`src/lib/python-progress-v2.ts` retires saved records older than the current version, and new records are
stamped with the current version. Don't bump for wording fixes.

## 6. Pitfalls hit while building M12

- **`1.0` becomes an int.** `pv(18.0)` is the JS number 18, so it becomes `int`. Write `py.float(18)`, or pass
  `compare: { numbers: "int-float-equal" }` when the int/float type doesn't matter (line totals).
- Float sums in **printed** examples must match exactly. Choose values that add up cleanly (35.5 + 22.25).
  Function checks compare floats with a tolerance, so `27.900000000000002` is fine there.
- The concept detector is regex-based and greedy:
  - `.add(` tags `once-add` (M46), so you can't use `set.add` before M46. Use a list `not in`, or a dict
    `seen[k] = True`.
  - `"key": int(x)` matches `field-ann` (M28). Assign `row["key"] = int(x)` instead.
  - The names `tally`, `trace`, `checkpoint` and `pins` tag M46–M49 concepts.
  - `.get(` is `dict-get` (M17), and `.sum(` is a NumPy concept.
- `round`, `str.join` and list `+` concatenation are not taught before M12. Avoid them, or teach them.
- Data the starter prints doesn't have to be the data in the checks. Put the fixtures in TS constants and
  reuse them in `example(...)`, and keep the starter's demo data identical to the first public example.
- A wrong answer must fail **exactly** the check IDs in `fails`. When you add a structural/`expr` check
  (`new-dict`, `lookups`), re-check which wrong answers now fail it too.
- The quality validator compares practice answers with this module's **and the previous module's** lessons
  (4-token shingles, Jaccard ≥ 0.8), and with every earlier question. Same-shape loops over different data
  pass. A copy with renamed variables does not.
- Hints are checked for leaks: no hint may contain a line (12+ characters) of the answer that isn't in the
  starter. Describe the idea instead.
- Don't preview later features in prose ("`get` comes in M17", "`sorted(key=)` is M14"). A forward link in
  the review is fine.
- The lesson page doesn't render function examples. Put an Example row in `spec`.
