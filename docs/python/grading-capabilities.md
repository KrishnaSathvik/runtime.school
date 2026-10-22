# Python grading: authoring reference

What the grader can check, which check to use for each question format, and what Pyodide cannot run.
Everything below is exercised in real Pyodide by `tests/python-grading-functions.test.ts`.

Engine: `src/engine/python/grading.ts` (check kinds, judgement). Helpers: `src/content/python-v2/fn-checks.ts`,
re-exported from `src/content/python-v2/checks.ts`, so `import { fn, example, hiddenCase, … } from "../checks"` works.

## How Check works

1. The learner's `main.py` runs once in a fresh interpreter (top-level prints, demo calls and `if __name__ == "__main__":`
   blocks run normally; `__name__` is `"__main__"`).
2. The grader then calls the required functions, evaluates `expr` checks, and re-runs `variant`s **in that same run**.
3. Values come back type-tagged and are compared in TypeScript (`pyEqual`), so a learner's `__eq__` never decides.

Expected values never enter the interpreter. **Hidden test inputs do** (the function has to be called with them), so
hidden tests are learning feedback, not tamper-proof assessment. Don't describe them as secure.

If the program itself crashes at top level, nothing is graded (runtime-error report). If any part runs longer than the
run limit (5 s default, `task.timeoutMs`), the whole report is a timeout, naming the case that was running.

## Which check for which format

| Format | Use |
| --- | --- |
| Function implementation, debugging, validation | `fn(...)` with `example` / `hiddenCase` / `raisesCase`; add a `keepsInput` check when the input must not change |
| In-place functions (`list.sort`-style) | `example(args, null, { argsAfter: [...] })` |
| OOP implementation | `expr` checks that build objects and read attributes or call methods (`fn` can't compare instances) |
| Data transformation (DataFrames) | `frameRows`, `frameColumns` (with `task.packages: ["pandas"]`) |
| File processing (writes CSV/JSON/text) | `csvRows`, `jsonFile`, `fileText`, with `setup` calling the learner's function |
| Testing (learner writes tests) | `learnerTests(prefix, { target, correct, defects })` |
| Refactoring (preserve behaviour) | the same `fn` cases as the original behaviour, plus a structure check only if the refactor *is* the point |
| Performance (explicit constraint) | an operation-count `expr` (deterministic, preferred) or `timeBudget` (wall clock) |
| Program without functions | `output`, `variable`, `variant` (re-runs the program with other input values) |

Never grade by matching an implementation. Structure checks (`usesListComp`, `printCalls`, …) only when the
question is explicitly about that construct.

## Function implementation

```ts
import { example, fn, hiddenCase, keepsInput, raisesCase } from "../checks";
import { py } from "@/engine/python/values";

task: {
  checks: [
    fn("returns", "dedupe", [
      example([["a", "b", "a", "c", "b"]], ["a", "b", "c"]),           // public: shown before and after Check
      example([[]], []),
      example([["x", "x", "x"]], ["x"]),
      hiddenCase("a single item", [["solo"]], ["solo"]),                // hidden: input & answer never shown
      hiddenCase("mixed-case duplicates", [["Apple", "apple", "APPLE", "apple"]], ["Apple", "apple", "APPLE"]),
      hiddenCase("many distinct items", [["pear", "apple", "fig", "kiwi", "date", "banana", "apple", "fig"]], ["pear", "apple", "fig", "kiwi", "date", "banana"]),
      hiddenCase("empty and blank strings", [["", "", " ", ""]], ["", " "]),
      hiddenCase("repeats out of order", [["b", "a", "b", "c", "a", "d"]], ["b", "a", "c", "d"]),
    ]),
    fn("keeps-input", "dedupe", [
      keepsInput([["a", "b", "a"]]),                                    // judges only the argument after the call
      keepsInput([["q", "r"]], { label: "a list with no repeats" }),
    ], { label: "dedupe() leaves the list it is given unchanged" }),
    { kind: "expr", id: "new-list", label: "dedupe() returns a new list, not the one it was given",
      expr: "_x = ['m', 'n']\nresult = dedupe(_x) is not _x", expected: py.bool(true) },
  ],
}
```

- **Values.** Builders take plain JS (`pv`): string → `str`, boolean → `bool`, `null` → `None`, whole number → `int`,
  other number → `float`, array → `list`, object → `dict` with str keys. **`1.0` in JS is the integer 1**: write
  `py.float(1)` for `1.0`, `py.tuple(...)`, `py.set(...)`, `py.dict([[py.int(1), …]])` for non-str keys.
- **Hidden labels** (`hiddenCase("an empty list", …)`) appear in feedback when that case fails:
  "Works for the examples, but not for 1 of 5 other inputs (mixed-case duplicates)." Never put the input in a label.
- **Keyword arguments**: `example([100], 90, { kwargs: { discount: 0.1 } })` shows as `final_price(100, discount=0.1)`.
- **Exceptions**: `raisesCase(["-1"], "ValueError")` (public) or `raisesCase(["abc"], "ValueError", { label: "text that isn't a number" })`
  (hidden). Matched by **exact type name**: a subclass of `ValueError` does not count. To check the message, use an `expr`:
  `expr: "try:\n    parse_age('-1')\n    result = None\nexcept ValueError as e:\n    result = str(e)"`.
- **Comparison** (`fn(id, name, cases, { compare })`):
  - floats use a tolerance by default (rel 1e-9); `{ float: { abs: 0.01 } }` loosens it, `{ float: "exact" }` removes it;
  - `48` and `48.0` differ unless `{ numbers: "int-float-equal" }`; `True` never equals `1`;
  - list/tuple order matters unless `{ order: "any" }`; sets and dicts are always unordered; list ≠ tuple; set ≠ frozenset;
  - `{ strings: "strip" }` ignores surrounding whitespace.
- **Isolation**: every case gets freshly built argument objects, so a function that mutates its argument can't affect
  the next case. Module-level state (a global list, a mutable default argument) **does** persist between calls — that is
  the learner's code and is graded as such (the classic mutable-default bug fails).
- **Mutation**: `unchanged: true` on a case (or `fn(…, { unchanged: true })`) fails the case if any positional or keyword
  argument is different after the call. Prefer a separate `keepsInput` check so a wrong value and a mutated input fail
  different check IDs. In-place functions: `example([[2, 4]], null, { argsAfter: [[0.5, py.float(1)]] })`.
- **Messages the learner gets** (all verified):
  - missing: "There is no function named total_cost. Define it with def total_cost(…):"; near miss: "You defined Total_Cost; the name must match exactly.";
  - not callable: "total_cost is an int, not a function.";
  - wrong parameters: "…raised TypeError: total_cost() missing 1 required positional argument: 'tax'. Check that def total_cost(…) has the parameters the task describes.";
  - crash on a public case: call, exception type, message and line; on a hidden case: type and line only;
  - `pass`/no return: "dedupe([...]) returned None, but should return [...]. Use return to give the result back."; printing instead of returning is named;
  - same value for every input: "Make sure the function calculates from its parameters instead of returning a fixed value."
- Debug prints inside the function and top-level demo code don't affect grading.
- The practice page shows the question's `spec` rows and every public function case under **Examples** (from
  `publicExamples(task)`), so the examples on screen are always the ones being tested. Put the signature and rules in
  `spec`; don't repeat the examples in prose.

## OOP implementation

```ts
{ kind: "expr", id: "deposit", label: "deposit() adds to the balance", show: "Account(10).deposit(5)",
  expr: "_a = Account(10)\n_a.deposit(5)\nresult = _a.balance", expected: py.int(15) },
{ kind: "expr", id: "overdraw", label: "withdraw() refuses to overdraw", hidden: true,
  expr: "Account(5).withdraw(9)", raises: "ValueError" },
```

## Data transformation (pandas)

```ts
task: {
  packages: ["pandas"],
  checks: [
    frameColumns("cols", "summary() has region and total columns", "summary(_df)", ["region", "total"],
      { setup: "import pandas as _pd\n_df = _pd.DataFrame({'region': ['n', 's', 'n'], 'amount': [5, 2, 10]})" }),
    frameRows("rows", "summary() totals each region", "summary(_df)", [{ region: "n", total: 15 }, { region: "s", total: 2 }],
      { setup: "…same setup…" }),
  ],
}
```

Rows are compared as `{column: value}` dicts; NaN/None/NaT arrive as `None`; numpy scalars become plain values;
row order matters unless `compare: { order: "any" }`. Use a fresh DataFrame in `setup` so hidden data differs from
the example. For a function that should not modify its DataFrame, compare `_records(_df)` before/after in an `expr`.

## File output

```ts
csvRows("csv", "export_rows() writes a header and one row per order", "out.csv",
  [["id", "amount"], ["1", "5"], ["2", "10"]], { setup: "export_rows([(1, 5), (2, 10)], 'out.csv')" }),
jsonFile("json", "save_totals() writes the totals", "totals.json", { north: 15, south: 0 },
  { setup: "save_totals({'north': 15, 'south': 0}, 'totals.json')" }),
fileText("txt", "write_report() writes the summary line", "report.txt", "2 orders, total 15\n",
  { setup: "write_report([5, 10], 'report.txt')" }),
```

`csvRows` accepts any valid quoting and `\n`/`\r\n`; `jsonFile` ignores key order and indentation; `fileText` is exact.
Input fixtures go in `task.files` (`{ "orders.csv": "id,amount\n1,5\n" }`), or dataset `mounts`.

## Learner-written tests

```ts
checks: learnerTests("tests", {
  target: "dedupe",
  correct: "def dedupe(items):\n    return list(dict.fromkeys(items))\n",
  defects: [
    { label: "an implementation that loses the order", code: "def dedupe(items):\n    return sorted(set(items))\n" },
    { label: "an implementation that ignores case", code: "…" },
  ],
}),
```

Produces `tests-correct` (all the learner's tests pass on the correct implementation) and `tests-1`, `tests-2`, …
(at least one test fails on that defect). Tests are top-level `test*` functions with `assert`, or `unittest.TestCase`
classes; `pytest` is not available. The implementation is swapped in under `target`'s name, so the learner's file
should define (or import) `target` and the tests call it by that name. A learner who calls a failing test at top level
crashes the whole run, so tell them to leave the calls to Check. With no tests: "Got 'no tests', but expected 'pass'."

## Performance

Prefer a deterministic **operation budget**: count comparisons with an instrumented value.

```ts
{ kind: "expr", id: "ops", label: "dedupe() doesn't compare each item with every earlier item",
  expr: ["_n = [0]", "class _Item(str):", "    def __eq__(self, other):", "        _n[0] += 1",
         "        return str.__eq__(self, other)", "    __hash__ = str.__hash__",
         "dedupe([_Item(i % 1500) for i in range(3000)])", "result = _n[0] <= 6000"].join("\n"),
  expected: py.bool(true) },
```

`timeBudget(id, label, call, seconds, { setup })` measures wall clock. Measured in tests: 12,000 items, `dict.fromkeys`
7 ms vs list-membership loop 900 ms (budget 0.25 s). Only use it when the gap is ≥100× and the slow version still
finishes well inside 5 s on a slow device; otherwise the whole Check times out. Phones are several times slower.

## Not supported in the runner (verified in Pyodide 314.0.7, the worker's harness)

| Feature | Result |
| --- | --- |
| `threading.Thread(...).start()`, `ThreadPoolExecutor` | `RuntimeError: can't start new thread` |
| `multiprocessing.Process` | `ModuleNotFoundError: No module named '_multiprocessing'` |
| `ProcessPoolExecutor` | `NotImplementedError` (no `multiprocessing.synchronize`) |
| `subprocess.run`, any process | `OSError: [Errno 138] emscripten does not support processes` |
| `asyncio.run` / `run_until_complete` | `RuntimeError` (needs WebAssembly stack switching; the harness calls the program synchronously, so it fails even in browsers with JSPI). `async def` + `await` still work if you drive the coroutine yourself: `c.send(None)` / `StopIteration.value` |
| `urllib.request.urlopen` (https) | `RuntimeError: TLS not supported`; http times out. The sandbox CSP also blocks every origin except the Pyodide files |
| `socket` | `socket()` and `connect()` don't raise, but `send`/`recv` give `BlockingIOError`: no real network |
| `requests`, `pytest`, `seaborn`, `tkinter` | `ModuleNotFoundError` (not shipped) |
| `signal.alarm` | `AttributeError` |
| `input()` | reads `task.stdin`; with none, `EOFError` |
| `zoneinfo` | needs `packages: ["tzdata"]`; without it `ZoneInfoNotFoundError` |
| `scipy` | only with `packages: ["scikit-learn"]` (it is a dependency) |

Works: `time.sleep` (blocks), `sqlite3`, `csv`/`json`/file I/O in the working folder, `tracemalloc`, `timeit`,
`unittest`, `doctest`, `dataclasses`, `typing`, `random` (seedable), `ctypes`; with `packages`: numpy, pandas,
matplotlib (`plt.show()` renders a figure), duckdb, `pyspark` (DuckDB's Spark-compatible API, not Apache Spark),
scikit-learn, polars, pyarrow. Lessons that teach threads, processes, `asyncio.run`, HTTP requests or sockets
cannot be run or graded here: teach them as read-only examples or not at all.
