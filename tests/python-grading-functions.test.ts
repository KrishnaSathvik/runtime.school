// Function-implementation grading, end to end in real Pyodide (the worker's own harness, tests/helpers/python-fast.ts):
// multiple and hidden cases, keyword arguments, expected exceptions, comparison policies, mutation rules, signature
// mistakes, top-level prints, per-case isolation, and the fn-checks authoring helpers. Includes the worked
// "Remove Duplicate Items" (dedupe) question from the rebuild brief.
import { describe, expect, it } from "vitest";
import { gradePython, probeFor, publicExamples, type PyGradeReport, type PyTask } from "@/engine/python/grading";
import { py } from "@/engine/python/values";
import { csvRows, example, keepsInput, fileText, fn, frameColumns, frameRows, hiddenCase, jsonFile, learnerTests, pv, raisesCase, timeBudget } from "@/content/python-v2/checks";
import { checkFast, runFast } from "./helpers/python-fast";

const failing = (r: PyGradeReport) => r.checks.filter((c) => c.status !== "pass").map((c) => c.id).sort();
const explain = (r: PyGradeReport) => `${r.outcome}: ${r.summary} ${JSON.stringify(r.checks.map((c) => [c.id, c.status, c.detail]))}`;
const check = (r: PyGradeReport, id: string) => r.checks.find((c) => c.id === id)!;

// ---- the worked sample: Remove Duplicate Items ----

const DEDUPE_HIDDEN_INPUTS = [["solo"], ["Apple", "apple", "APPLE", "apple"], ["pear", "apple", "fig", "kiwi", "date", "banana", "apple", "fig"], ["", "", " ", ""], ["b", "a", "b", "c", "a", "d"]];
export const dedupeTask: PyTask = {
  checks: [
    fn("returns", "dedupe", [
      example([["a", "b", "a", "c", "b"]], ["a", "b", "c"]),
      example([[]], []),
      example([["x", "x", "x"]], ["x"]),
      hiddenCase("a single item", [["solo"]], ["solo"]),
      hiddenCase("mixed-case duplicates", [["Apple", "apple", "APPLE", "apple"]], ["Apple", "apple", "APPLE"]),
      hiddenCase("many distinct items", [["pear", "apple", "fig", "kiwi", "date", "banana", "apple", "fig"]], ["pear", "apple", "fig", "kiwi", "date", "banana"]),
      hiddenCase("empty and blank strings", [["", "", " ", ""]], ["", " "]),
      hiddenCase("repeats out of order", [["b", "a", "b", "c", "a", "d"]], ["b", "a", "c", "d"]),
    ]),
    fn(
      "keeps-input",
      "dedupe",
      [
        keepsInput([["a", "b", "a"]]),
        keepsInput([["q", "r"]], { label: "a list with no repeats" }),
        keepsInput([["z", "z", "z"]], { label: "a list that is all repeats" }),
      ],
      { label: "dedupe() leaves the list it is given unchanged" },
    ),
    { kind: "expr", id: "new-list", label: "dedupe() returns a new list, not the one it was given", expr: "_x = ['m', 'n']\nresult = dedupe(_x) is not _x", expected: py.bool(true) },
  ],
};

const DEDUPE = {
  starter: "def dedupe(items):\n    # Return a new list with each value once, in first-seen order.\n    pass\n",
  answer: "def dedupe(items: list[str]) -> list[str]:\n    seen = set()\n    result = []\n    for item in items:\n        if item not in seen:\n            seen.add(item)\n            result.append(item)\n    return result\n",
  alternatives: [
    // dict.fromkeys keeps first-seen order.
    "def dedupe(items):\n    return list(dict.fromkeys(items))\n",
    // A plain loop checking the result list, with debug prints and a top-level demo call.
    "def dedupe(items):\n    out = []\n    for x in items:\n        if x not in out:\n            out.append(x)\n    print('debug:', out)\n    return out\n\nprint(dedupe(['a', 'a', 'b']))\n",
    // Comprehension with a seen-set.
    "def dedupe(items):\n    seen = set()\n    return [x for x in items if not (x in seen or seen.add(x))]\n",
  ],
  wrong: [
    { why: "uses set() and loses the order", code: "def dedupe(items):\n    return list(set(items))\n", fails: ["returns"] },
    { why: "consumes the input list while building the result", code: "def dedupe(items):\n    result = []\n    while items:\n        x = items.pop(0)\n        if x not in result:\n            result.append(x)\n    return result\n", fails: ["keeps-input"] },
    { why: "removes duplicates in place and returns the same list", code: "def dedupe(items):\n    seen = set()\n    i = 0\n    while i < len(items):\n        if items[i] in seen:\n            items.pop(i)\n        else:\n            seen.add(items[i])\n            i += 1\n    return items\n", fails: ["keeps-input", "new-list"] },
    { why: "treats 'Apple' and 'apple' as the same value", code: "def dedupe(items):\n    seen = set()\n    out = []\n    for x in items:\n        if x.lower() not in seen:\n            seen.add(x.lower())\n            out.append(x)\n    return out\n", fails: ["returns"] },
    { why: "hard-codes the first example", code: "def dedupe(items):\n    return ['a', 'b', 'c']\n", fails: ["returns"] },
  ],
};

describe("worked sample: dedupe(items)", () => {
  it("has ≥3 public and ≥5 hidden cases, and shows only the public ones", () => {
    const returns = dedupeTask.checks[0];
    if (returns.kind !== "function") throw new Error("expected a function check");
    expect(returns.cases.filter((k) => !k.hidden).length).toBeGreaterThanOrEqual(3);
    expect(returns.cases.filter((k) => k.hidden).length).toBeGreaterThanOrEqual(5);
    expect(publicExamples(dedupeTask)).toEqual([
      { call: "dedupe(['a', 'b', 'a', 'c', 'b'])", kind: "returns", result: "['a', 'b', 'c']" },
      { call: "dedupe([])", kind: "returns", result: "[]" },
      { call: "dedupe(['x', 'x', 'x'])", kind: "returns", result: "['x']" },
    ]);
  });

  it("the reference passes", async () => {
    const r = await checkFast(dedupeTask, DEDUPE.answer);
    expect(r.ok, explain(r)).toBe(true);
  });

  it.each(DEDUPE.alternatives.map((code, i) => [i, code]))("alternative style %i passes", async (_, code) => {
    const r = await checkFast(dedupeTask, code as string);
    expect(r.ok, explain(r)).toBe(true);
  });

  it("the starter fails", async () => {
    const r = await checkFast(dedupeTask, DEDUPE.starter);
    expect(r.ok).toBe(false);
    expect(check(r, "returns")).toMatchObject({ category: "wrong-type", detail: "dedupe(['a', 'b', 'a', 'c', 'b']) returned None, but should return ['a', 'b', 'c']. Use return to give the result back." });
  });

  it.each(DEDUPE.wrong.map((w) => [w.why, w]))("wrong: %s fails the intended checks", async (_, w) => {
    const { code, fails } = w as (typeof DEDUPE.wrong)[number];
    const r = await checkFast(dedupeTask, code);
    expect(failing(r), explain(r)).toEqual([...fails].sort());
  });

  it("feedback is specific and never leaks hidden inputs or answers", async () => {
    const caseless = await checkFast(dedupeTask, DEDUPE.wrong[3].code);
    expect(check(caseless, "returns")).toMatchObject({ category: "fails-hidden-cases" });
    expect(check(caseless, "returns").detail).toBe("Works for the examples, but not for 1 of 5 other inputs (mixed-case duplicates). Re-read the requirements and try inputs the examples don't cover.");
    const consumed = await checkFast(dedupeTask, DEDUPE.wrong[1].code);
    expect(check(consumed, "keeps-input")).toMatchObject({ category: "changed-input" });
    expect(check(consumed, "keeps-input").detail).toBe("dedupe(['a', 'b', 'a']) changed its input: argument 1 was ['a', 'b', 'a'] and is [] after the call. Leave the input as it is and build a new value to return.");
    const hardcoded = await checkFast(dedupeTask, DEDUPE.wrong[4].code);
    expect(check(hardcoded, "returns").detail).toMatch(/dedupe\(\[\]\) returned \['a', 'b', 'c'\], but should return \[\]/);
    for (const r of [caseless, consumed, hardcoded]) {
      const text = JSON.stringify(r.checks);
      for (const input of DEDUPE_HIDDEN_INPUTS.flat().filter((s) => s.length > 1)) expect(text).not.toContain(`'${input}'`);
      for (const c of r.checks) for (const k of c.cases ?? []) if (k.hidden) expect(k).not.toHaveProperty("call");
    }
    // Hidden expected values never enter the interpreter either.
    expect(JSON.stringify(probeFor(dedupeTask))).not.toMatch(/expected|"label"/);
  });
});

// ---- capabilities, each in real Pyodide ----

describe("function checks in real Pyodide", () => {
  it("keyword arguments, defaults and keyword-only parameters", async () => {
    const task: PyTask = {
      checks: [
        fn("price", "final_price", [
          example([100], 100),
          example([100], 90, { kwargs: { discount: 0.1 } }),
          hiddenCase("a discount and a minimum", [40], 40, { kwargs: { discount: 0.5, minimum: 50 } }),
        ], { compare: { numbers: "int-float-equal" } }),
      ],
    };
    const answer = "def final_price(amount, discount=0.0, *, minimum=0):\n    if amount < minimum:\n        return amount\n    return amount * (1 - discount)\n";
    expect((await checkFast(task, answer)).ok).toBe(true);
    const noKw = await checkFast(task, "def final_price(amount, discount=0.0):\n    return amount * (1 - discount)\n");
    expect(check(noKw, "price").category).toBe("fails-hidden-cases");
    expect(check(noKw, "price").detail).toMatch(/Raised TypeError for another input.*Check that def final_price\(…\) has the parameters the task describes/);
    expect(publicExamples(task)[1].call).toBe("final_price(100, discount=0.1)");
  });

  it("expected exceptions: right type passes; wrong type, none, or the wrong case fail with clear feedback", async () => {
    const task: PyTask = {
      checks: [
        fn("parse", "parse_age", [
          example(["42"], 42),
          raisesCase(["-1"], "ValueError"),
          raisesCase(["abc"], "ValueError", { label: "text that isn't a number" }),
        ]),
      ],
    };
    const answer = "def parse_age(text):\n    age = int(text)\n    if age < 0:\n        raise ValueError('age must not be negative')\n    return age\n";
    expect((await checkFast(task, answer)).ok).toBe(true);
    const noRaise = await checkFast(task, "def parse_age(text):\n    return int(text)\n");
    expect(check(noRaise, "parse")).toMatchObject({ category: "wrong-exception", detail: "parse_age('-1') should raise ValueError, but it returned -1." });
    const wrongType = await checkFast(task, "def parse_age(text):\n    if not text.isdigit():\n        raise TypeError('bad')\n    return int(text)\n");
    expect(check(wrongType, "parse").detail).toBe("parse_age('-1') should raise ValueError, but it raised TypeError: bad.");
    // The hidden raise case: input stays hidden, the kind of input is named.
    const hiddenOnly = await checkFast(task, "def parse_age(text):\n    if text.startswith('-'):\n        raise ValueError('neg')\n    return int(text) if text.isdigit() else 0\n");
    expect(check(hiddenOnly, "parse").detail).toBe("Works for the examples, but not for 1 of 1 other input (text that isn't a number). For another invalid input, the function should raise ValueError, but it returned a value.");
    expect(JSON.stringify(hiddenOnly.checks)).not.toContain("abc");
  });

  it("comparison policies: float tolerance, exact floats, int/float, unordered lists, stripped strings", async () => {
    const avg = "def mean(xs):\n    return sum(xs) / len(xs)\n";
    const tol: PyTask = { checks: [fn("mean", "mean", [example([[0.1, 0.2]], 0.15), example([[1, 2]], 1.5)])] };
    expect((await checkFast(tol, avg)).ok).toBe(true);
    const exact: PyTask = { checks: [fn("mean", "mean", [example([[0.1, 0.2]], 0.15)], { compare: { float: "exact" } })] };
    expect((await checkFast(exact, avg)).ok).toBe(false); // 0.15000000000000002
    const loose: PyTask = { checks: [fn("mean", "mean", [example([[1, 2, 2]], 1.67)], { compare: { float: { abs: 0.01 } } })] };
    expect((await checkFast(loose, avg)).ok).toBe(true);
    const intFloat: PyTask = { checks: [fn("half", "half", [example([4], 2)], { compare: { numbers: "int-float-equal" } })] };
    expect((await checkFast(intFloat, "def half(n):\n    return n / 2\n")).ok).toBe(true);
    const strict: PyTask = { checks: [fn("half", "half", [example([4], 2)])] };
    const s = await checkFast(strict, "def half(n):\n    return n / 2\n");
    expect(check(s, "half")).toMatchObject({ category: "wrong-type", detail: "half(4) returned a float (2.0), but should return an int (2)." });
    const anyOrder: PyTask = { checks: [fn("tags", "tags", [example([["b", "a", "b"]], ["a", "b"])], { compare: { order: "any" } })] };
    expect((await checkFast(anyOrder, "def tags(xs):\n    return list(set(xs))\n")).ok).toBe(true);
    const sets: PyTask = { checks: [fn("tags", "tags", [example([["b", "a", "b"]], py.set(py.str("a"), py.str("b")))])] };
    expect((await checkFast(sets, "def tags(xs):\n    return set(xs)\n")).ok).toBe(true);
    expect((await checkFast(sets, "def tags(xs):\n    return sorted(set(xs))\n")).ok).toBe(false);
    const strip: PyTask = { checks: [fn("label", "label", [example(["ada"], "Ada")], { compare: { strings: "strip" } })] };
    expect((await checkFast(strip, "def label(s):\n    return s.title() + ' '\n")).ok).toBe(true);
    const tuples: PyTask = { checks: [fn("pair", "min_max", [example([[3, 1, 2]], py.tuple(py.int(1), py.int(3)))])] };
    expect((await checkFast(tuples, "def min_max(xs):\n    return min(xs), max(xs)\n")).ok).toBe(true);
    expect(check(await checkFast(tuples, "def min_max(xs):\n    return [min(xs), max(xs)]\n"), "pair").category).toBe("wrong-type");
    const dicts: PyTask = { checks: [fn("count", "count_words", [example(["b a b"], { a: 1, b: 2 })])] };
    expect((await checkFast(dicts, "def count_words(t):\n    d = {}\n    for w in t.split():\n        d[w] = d.get(w, 0) + 1\n    return d\n")).ok).toBe(true);
  });

  it("missing, misnamed, non-callable, wrong arity, and raising functions get actionable messages", async () => {
    const task: PyTask = { checks: [fn("f", "total_cost", [example([[1, 2]], 3), hiddenCase("an empty basket", [[]], 0)])] };
    expect(check(await checkFast(task, "x = 1\n"), "f")).toMatchObject({ category: "missing-name", detail: "There is no function named total_cost. Define it with def total_cost(…):" });
    expect(check(await checkFast(task, "def Total_Cost(xs):\n    return sum(xs)\n"), "f").detail).toBe("There is no function named total_cost. You defined Total_Cost; the name must match exactly.");
    expect(check(await checkFast(task, "def totl_cost(xs):\n    return sum(xs)\n"), "f").detail).toMatch(/You defined totl_cost/);
    expect(check(await checkFast(task, "total_cost = 3\n"), "f")).toMatchObject({ category: "not-callable", detail: "total_cost is an int, not a function. Define it with def total_cost(…):" });
    const arity = await checkFast(task, "def total_cost(xs, tax):\n    return sum(xs) + tax\n");
    expect(check(arity, "f").detail).toBe("total_cost([1, 2]) raised TypeError: total_cost() missing 1 required positional argument: 'tax'. Check that def total_cost(…) has the parameters the task describes.");
    const noParams = await checkFast(task, "def total_cost():\n    return 3\n");
    expect(check(noParams, "f").detail).toMatch(/takes 0 positional arguments but 1 was given\. Check that def total_cost/);
    const crash = await checkFast(task, "def total_cost(xs):\n    return sum(xs) + 0 // len(xs)\n");
    expect(check(crash, "f")).toMatchObject({ category: "fails-hidden-cases", line: 2 });
    expect(check(crash, "f").detail).toBe("Works for the examples, but not for 1 of 1 other input (an empty basket). Raised ZeroDivisionError for another input (line 2).");
    const visibleCrash = await checkFast(task, "def total_cost(xs):\n    return xs[5]\n");
    expect(check(visibleCrash, "f").detail).toBe("total_cost([1, 2]) raised IndexError: list index out of range (line 2).");
  });

  it("top-level prints, demo calls and __main__ blocks don't affect return-value grading; printing instead of returning is named", async () => {
    const task: PyTask = { checks: [fn("sq", "square", [example([3], 9), hiddenCase("zero", [0], 0)])] };
    const noisy = "print('start')\ndef square(n):\n    print('squaring', n)\n    return n * n\nprint(square(3))\nif __name__ == '__main__':\n    print('demo', square(4))\n";
    const r = await checkFast(task, noisy);
    expect(r.ok, explain(r)).toBe(true);
    expect(r.stdout).toBe("start\nsquaring 3\n9\nsquaring 4\ndemo 16\n");
    const printer = await checkFast(task, "def square(n):\n    print(n * n)\n");
    expect(check(printer, "sq")).toMatchObject({ category: "returned-none-printed" });
  });

  it("each case gets fresh arguments; state a function keeps between calls is still the learner's", async () => {
    const task: PyTask = { checks: [fn("add", "add_item", [example([[], "a"], ["a"]), example([[], "b"], ["b"]), hiddenCase("a third basket", [[], "c"], ["c"])])] };
    // Mutating the argument is fine here: every case gets its own new list.
    expect((await checkFast(task, "def add_item(basket, item):\n    basket.append(item)\n    return basket\n")).ok).toBe(true);
    // The classic mutable-default bug keeps state across calls, and is caught.
    const shared = await checkFast(task, "_all = []\ndef add_item(basket, item):\n    _all.append(item)\n    return list(_all)\n");
    expect(check(shared, "add").detail).toBe("add_item([], 'b') returned ['a', 'b'], but should return ['b'].");
  });

  it("in-place functions: argsAfter checks the argument after the call", async () => {
    const task: PyTask = {
      checks: [
        fn("norm", "normalize", [
          example([[2, 4]], null, { argsAfter: [[0.5, py.float(1)]] }),
          hiddenCase("one score", [[5]], null, { argsAfter: [[py.float(1)]] }),
        ]),
      ],
    };
    // The required after-state is judged on this side: only the inputs go into the interpreter.
    expect(JSON.stringify(probeFor(task))).not.toMatch(/0\.5|1\.0/);
    expect((await checkFast(task, "def normalize(scores):\n    top = max(scores)\n    for i in range(len(scores)):\n        scores[i] = scores[i] / top\n")).ok).toBe(true);
    const copy = await checkFast(task, "def normalize(scores):\n    top = max(scores)\n    return [s / top for s in scores]\n");
    expect(check(copy, "norm")).toMatchObject({ category: "changed-input", detail: "After normalize([2, 4]), argument 1 should be [0.5, 1.0], but it is [2, 4]. This function should change its argument in place." });
  });

  it("unchanged also covers keyword arguments and dicts", async () => {
    const task: PyTask = { checks: [fn("w", "with_tax", [example([], { a: 1.1 }, { kwargs: { prices: { a: py.float(1) } }, unchanged: true })], { compare: { float: { abs: 1e-9 } } })] };
    expect((await checkFast(task, "def with_tax(prices):\n    return {k: round(v * 1.1, 2) for k, v in prices.items()}\n")).ok).toBe(true);
    const mut = await checkFast(task, "def with_tax(prices):\n    for k in prices:\n        prices[k] = round(prices[k] * 1.1, 2)\n    return prices\n");
    expect(check(mut, "w").detail).toBe("with_tax(prices={'a': 1.0}) changed its input: the keyword argument prices was {'a': 1.0} and is {'a': 1.1} after the call. Leave the input as it is and build a new value to return.");
  });

  it("a hard-coded answer is named as such", async () => {
    const task: PyTask = { checks: [fn("t", "double", [example([2], 4), hiddenCase("a negative number", [-3], -6), hiddenCase("zero", [0], 0)])] };
    const r = await checkFast(task, "def double(n):\n    return 4\n");
    expect(check(r, "t").detail).toBe("Works for the examples, but not for 2 of 2 other inputs (a negative number; zero). Make sure the function calculates from its parameters instead of returning a fixed value.");
  });

  it("an infinite loop in one case times out and names the case without revealing hidden inputs", async () => {
    const task: PyTask = { checks: [fn("a", "countdown", [example([3], 0)]), fn("b", "countdown", [hiddenCase("a negative start", [-1], 0)])] };
    const r = await runFast("def countdown(n):\n    while n != 0:\n        n -= 1\n    return n\n", { task, timeoutS: 1 });
    expect(r.status).toBe("timeout");
    // The browser worker reports which case was running; the second check's case is index 1 of countdown's list.
    const g = gradePython(task, { stdout: "", stderr: "", output: [], status: "timeout", limitMs: 5000, case: { call: "countdown", index: 1 } });
    expect(g.summary).toBe("Your code didn't finish within 5 seconds while running countdown with another input. Look for a loop that never ends.");
    expect(g.checks.map((c) => c.status)).toEqual(["not-run", "fail"]);
  });
});

// ---- helpers for other question formats ----

describe("authoring helpers in real Pyodide", () => {
  it("pv converts plain values and passes py.* through", () => {
    expect(pv({ a: [1, 2.5, "x", null, true] })).toEqual(py.dict([[py.str("a"), py.list(py.int(1), py.float(2.5), py.str("x"), py.none, py.bool(true))]]));
    expect(pv(py.float(2))).toEqual(py.float(2));
    expect(pv(py.tuple(py.int(1)))).toEqual(py.tuple(py.int(1)));
  });

  it("OOP behaviour, exception messages and async functions through expr checks", async () => {
    const task: PyTask = {
      checks: [
        { kind: "expr", id: "deposit", label: "deposit() adds to the balance", show: "Account(10).deposit(5)", expr: "_a = Account(10)\n_a.deposit(5)\nresult = _a.balance", expected: py.int(15) },
        { kind: "expr", id: "overdraw", label: "withdraw() refuses to overdraw", hidden: true, expr: "Account(5).withdraw(9)", raises: "ValueError" },
        { kind: "expr", id: "message", label: "the error says why", expr: "try:\n    Account(5).withdraw(9)\n    result = None\nexcept ValueError as e:\n    result = str(e)", expected: py.str("insufficient funds") },
        { kind: "expr", id: "async", label: "fetch_total() is a coroutine that returns the total", expr: "_c = fetch_total([1, 2])\ntry:\n    _c.send(None)\nexcept StopIteration as _e:\n    result = _e.value", expected: py.int(3) },
      ],
    };
    const answer = "class Account:\n    def __init__(self, balance):\n        self.balance = balance\n    def deposit(self, n):\n        self.balance += n\n    def withdraw(self, n):\n        if n > self.balance:\n            raise ValueError('insufficient funds')\n        self.balance -= n\n\nasync def fetch_total(xs):\n    return sum(xs)\n";
    const r = await checkFast(task, answer);
    expect(r.ok, explain(r)).toBe(true);
    const noGuard = await checkFast(task, answer.replace("        if n > self.balance:\n            raise ValueError('insufficient funds')\n", ""));
    expect(failing(noGuard)).toEqual(["message", "overdraw"]);
  });

  it("file output: exact text, CSV rows and JSON content", async () => {
    const task: PyTask = {
      checks: [
        fileText("txt", "write_report() writes the summary line", "report.txt", "2 orders, total 15\n", { setup: "write_report([5, 10], 'report.txt')" }),
        csvRows("csv", "export_rows() writes a header and one row per order", "out.csv", [["id", "amount"], ["1", "5"], ["2", "10"]], { setup: "export_rows([(1, 5), (2, 10)], 'out.csv')" }),
        jsonFile("json", "save_totals() writes the totals as JSON", "totals.json", { north: 15, south: 0 }, { setup: "save_totals({'north': 15, 'south': 0}, 'totals.json')" }),
      ],
    };
    const answer = [
      "import csv, json",
      "def write_report(amounts, path):",
      "    with open(path, 'w') as f:",
      "        f.write(f'{len(amounts)} orders, total {sum(amounts)}\\n')",
      "def export_rows(rows, path):",
      "    with open(path, 'w', newline='') as f:",
      "        w = csv.writer(f)",
      "        w.writerow(['id', 'amount'])",
      "        w.writerows(rows)",
      "def save_totals(totals, path):",
      "    with open(path, 'w') as f:",
      "        json.dump(totals, f, indent=2)",
    ].join("\n");
    const r = await checkFast(task, answer);
    expect(r.ok, explain(r)).toBe(true);
    // Different valid CSV/JSON styles still pass: quoted fields, \r\n, compact JSON with other key order.
    const alt = answer.replace("w = csv.writer(f)", "w = csv.writer(f, quoting=csv.QUOTE_ALL, lineterminator='\\r\\n')").replace("json.dump(totals, f, indent=2)", "json.dump(dict(reversed(list(totals.items()))), f)");
    expect((await checkFast(task, alt)).ok).toBe(true);
    const bad = await checkFast(task, answer.replace("w.writerow(['id', 'amount'])", "pass"));
    expect(failing(bad)).toEqual(["csv"]);
  });

  it("DataFrames: rows and columns", async () => {
    const task: PyTask = {
      packages: ["pandas"],
      checks: [
        frameColumns("cols", "summary() has region and total columns", "summary(_df)", ["region", "total"], { setup: "import pandas as _pd\n_df = _pd.DataFrame({'region': ['n', 's', 'n'], 'amount': [5, 2, 10]})" }),
        frameRows("rows", "summary() totals each region", "summary(_df)", [{ region: "n", total: 15 }, { region: "s", total: 2 }], { setup: "import pandas as _pd\n_df = _pd.DataFrame({'region': ['n', 's', 'n'], 'amount': [5, 2, 10]})" }),
      ],
    };
    const answer = "import pandas as pd\ndef summary(df):\n    return df.groupby('region', as_index=False)['amount'].sum().rename(columns={'amount': 'total'})\n";
    const r = await checkFast(task, answer);
    expect(r.ok, explain(r)).toBe(true);
    const unsorted = await checkFast(task, answer.replace("as_index=False)", "as_index=False, sort=False)").replace("{'amount': 'total'})", "{'amount': 'total'}).iloc[::-1]"));
    expect(failing(unsorted)).toEqual(["rows"]);
  }, 120000);

  it("learner-written tests are graded against a correct and defective implementations", async () => {
    const correct = "def dedupe(items):\n    return list(dict.fromkeys(items))\n";
    const task: PyTask = {
      checks: learnerTests("tests", {
        target: "dedupe",
        correct,
        defects: [
          { label: "an implementation that loses the order", code: "def dedupe(items):\n    return sorted(set(items))\n" },
          { label: "an implementation that ignores case", code: "def dedupe(items):\n    seen, out = set(), []\n    for x in items:\n        if x.lower() not in seen:\n            seen.add(x.lower())\n            out.append(x)\n    return out\n" },
        ],
      }),
    };
    const good = `${correct}\ndef test_order():\n    assert dedupe(['b', 'a', 'b']) == ['b', 'a']\n\ndef test_case():\n    assert dedupe(['A', 'a']) == ['A', 'a']\n`;
    expect((await checkFast(task, good)).ok).toBe(true);
    const unittestStyle = `import unittest\n${correct}\nclass DedupeTests(unittest.TestCase):\n    def test_order(self):\n        self.assertEqual(dedupe(['b', 'a', 'b']), ['b', 'a'])\n    def test_case(self):\n        self.assertEqual(dedupe(['A', 'a']), ['A', 'a'])\n`;
    expect((await checkFast(task, unittestStyle)).ok).toBe(true);
    const weak = `${correct}\ndef test_empty():\n    assert dedupe([]) == []\n`;
    expect(failing(await checkFast(task, weak))).toEqual(["tests-1", "tests-2"]);
    const wrongTest = `${correct}\ndef test_order():\n    assert dedupe(['b', 'a', 'b']) == ['a', 'b']\n`;
    expect(failing(await checkFast(task, wrongTest))).toContain("tests-correct");
    expect(check(await checkFast(task, correct), "tests-correct")).toMatchObject({ status: "fail", detail: "Got 'no tests', but expected 'pass'." });
  });

  it("an operation budget (counted comparisons) separates linear from quadratic deterministically", async () => {
    const expr = [
      "_n = [0]",
      "class _Item(str):",
      "    def __eq__(self, other):",
      "        _n[0] += 1",
      "        return str.__eq__(self, other)",
      "    __hash__ = str.__hash__",
      "dedupe([_Item(i % 1500) for i in range(3000)])",
      "result = _n[0] <= 6000",
    ].join("\n");
    const task: PyTask = { checks: [{ kind: "expr", id: "ops", label: "dedupe() compares each item a few times, not against every earlier item", expr, expected: py.bool(true) }] };
    expect((await checkFast(task, DEDUPE.answer)).ok).toBe(true);
    expect((await checkFast(task, DEDUPE.alternatives[0])).ok).toBe(true);
    expect((await checkFast(task, DEDUPE.alternatives[1])).ok).toBe(false);
  });

  it("a time budget separates a linear solution from a quadratic one", async () => {
    const task: PyTask = { checks: [timeBudget("fast", "dedupe() handles 12,000 items in under 0.25 s", "dedupe(_big)", 0.25, { setup: "_big = [str(i) for i in range(12000)]" })] };
    const t0 = Date.now();
    const fast = await checkFast(task, "def dedupe(items):\n    return list(dict.fromkeys(items))\n");
    const tFast = Date.now() - t0;
    const t1 = Date.now();
    const slow = await checkFast(task, "def dedupe(items):\n    out = []\n    for x in items:\n        if x not in out:\n            out.append(x)\n    return out\n");
    const tSlow = Date.now() - t1;
    console.log(`time budget: fast run ${tFast} ms, quadratic run ${tSlow} ms`);
    expect(fast.ok, explain(fast)).toBe(true);
    expect(slow.ok).toBe(false);
  });
});
