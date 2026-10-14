// Milestone 2 — Python grading against real Pyodide 314.0.7 in real browsers.
// Usage: npm run dev -- -p 3041 & BASE=http://localhost:3041 node tests/e2e/python-grading.mjs
// Optional: BROWSERS=chromium,firefox,webkit (default all three).
import { chromium, firefox, webkit } from "playwright";
import assert from "node:assert/strict";

const BASE = process.env.BASE ?? "http://localhost:3041";
const ENGINES = { chromium, firefox, webkit };
const BROWSERS = (process.env.BROWSERS ?? "chromium,firefox,webkit").split(",");
const results = [];

// Expected values, same shape as py.* in src/engine/python/values.ts.
const int = (n) => ({ t: "int", v: String(n) });
const float = (n) => ({ t: "float", v: n });
const str = (v) => ({ t: "str", v });
const bool = (v) => ({ t: "bool", v });
const list = (...items) => ({ t: "list", items });
const tuple = (...items) => ({ t: "tuple", items });
const dict = (entries) => ({ t: "dict", entries });

const notebookTask = {
  checks: [
    { kind: "variable", name: "price", expected: int(12) },
    { kind: "variable", name: "quantity", expected: int(4) },
    { kind: "variable", name: "total", expected: int(48) },
    { kind: "output", expected: "48\n" },
  ],
};
const totalFnTask = {
  checks: [
    {
      kind: "function",
      name: "calculate_total",
      cases: [
        { args: [int(12), int(4)], expected: int(48) },
        { args: [int(5), int(3)], expected: int(15), hidden: true },
        { args: [int(7), int(2)], expected: int(14), hidden: true },
        { args: [int(0), int(9)], expected: int(0), hidden: true },
      ],
    },
  ],
};

const grade = (page, task, code) => page.evaluate(([t, c]) => window.__runtimePython.checkPython(t, c), [task, code]);
const run = (page, code) => page.evaluate((c) => window.__runtimePython.runPython(c), code);

async function test(name, fn) {
  const t = Date.now();
  try {
    await fn();
    results.push(`✓ ${name} (${Date.now() - t} ms)`);
  } catch (err) {
    results.push(`✕ ${name}\n    ${String(err?.message ?? err).split("\n").slice(0, 8).join("\n    ")}`);
    process.exitCode = 1;
  }
}

for (const name of BROWSERS) {
  const browser = await ENGINES[name].launch();
  results.push(`\n[${name}]`);
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${BASE}/python/runtime`);
  await page.waitForFunction(() => window.__runtimePython && /status: ready/.test(document.querySelector('[data-testid="py-status"]')?.textContent ?? ""), null, { timeout: 60000 });

  try {
    // ---- printed output + variables ----
    await test("correct variables and output pass, with different valid implementations", async () => {
      for (const code of [
        "price = 12\nquantity = 4\ntotal = price * quantity\nprint(total)\n",
        "price, quantity = 12, 4\ntotal = 0\nfor _ in range(quantity):\n    total += price\nprint(total)\n",
        "price = 12\nquantity = 4\ntotal = sum([price] * quantity)\nprint(f'{total}')\n",
      ]) {
        const r = await grade(page, notebookTask, code);
        assert.equal(r.ok, true, JSON.stringify(r.checks));
        assert.equal(r.outcome, "passed");
        assert.equal(r.passed, 4);
      }
    });

    await test("wrong printed output fails with actual vs expected", async () => {
      const r = await grade(page, notebookTask, "price = 12\nquantity = 4\ntotal = price * quantity\nprint('Total:', total)\n");
      assert.equal(r.ok, false);
      const out = r.checks.find((c) => c.kind === "output");
      assert.equal(out.category, "wrong-output");
      assert.equal(out.detail, 'Line 1: expected "48", but your program printed "Total: 48".');
    });

    await test("missing variable (with case-sensitive near miss) vs wrong value", async () => {
      const r = await grade(page, notebookTask, "price = 12\nquantity = 3\nTotal = price * quantity\nprint(Total)\n");
      assert.equal(r.ok, false);
      assert.equal(r.checks[1].category, "wrong-value");
      assert.match(r.checks[1].detail, /quantity is 3, but it should be 4/);
      assert.equal(r.checks[2].category, "missing-name");
      assert.match(r.checks[2].detail, /You defined Total/);
    });

    await test("types are exact: '12' is not 12, 12.0 is not 12, True is not 1", async () => {
      const r = await grade(page, notebookTask, "price = '12'\nquantity = 4.0\ntotal = 48\nprint(total)\n");
      assert.equal(r.checks[0].category, "wrong-type");
      assert.match(r.checks[0].detail, /price is a str \('12'\), but this task needs a int \(12\)|price is a str \('12'\)/);
      assert.equal(r.checks[1].category, "wrong-type");
      assert.equal(r.checks[1].actual, "4.0");
      const b = await grade(page, { checks: [{ kind: "variable", name: "in_stock", expected: bool(true) }] }, "in_stock = 1\n");
      assert.equal(b.checks[0].category, "wrong-type");
      const b2 = await grade(page, { checks: [{ kind: "variable", name: "in_stock", expected: bool(true) }] }, "in_stock = 3 > 2\n");
      assert.equal(b2.ok, true);
    });

    await test("floats: tolerance by default, exact on request, repr from Python", async () => {
      const task = { checks: [{ kind: "variable", name: "x", expected: float(0.3) }] };
      assert.equal((await grade(page, task, "x = 0.1 + 0.2\n")).ok, true);
      const exact = await grade(page, { checks: [{ kind: "variable", name: "x", expected: float(0.3), compare: { float: "exact" } }] }, "x = 0.1 + 0.2\n");
      assert.equal(exact.ok, false);
      assert.equal(exact.checks[0].actual, "0.30000000000000004");
      const avg = await grade(page, { checks: [{ kind: "variable", name: "avg", expected: float(2.5) }] }, "avg = sum([1, 2, 3, 4]) / 4\n");
      assert.equal(avg.ok, true);
    });

    await test("collections: lists, tuples, dicts, sets; order policy", async () => {
      const task = {
        checks: [
          { kind: "variable", name: "names", expected: list(str("Ada"), str("Grace")) },
          { kind: "variable", name: "point", expected: tuple(int(1), int(2)) },
          { kind: "variable", name: "stock", expected: dict([[str("pens"), int(3)], [str("ink"), int(0)]]) },
          { kind: "variable", name: "tags", expected: { t: "set", items: [str("a"), str("b")] } },
          { kind: "variable", name: "scores", expected: list(int(3), int(1), int(2)), compare: { order: "any" } },
        ],
      };
      const good = "names = ['Ada', 'Grace']\npoint = (1, 2)\nstock = {'ink': 0, 'pens': 3}\ntags = {'b', 'a'}\nscores = [1, 2, 3]\n";
      assert.equal((await grade(page, task, good)).ok, true);
      const bad = await grade(page, task, "names = ['Grace', 'Ada']\npoint = [1, 2]\nstock = {'ink': 0, 'pens': 3.0}\ntags = {'a'}\nscores = [1, 2, 3]\n");
      assert.deepEqual(bad.checks.map((c) => c.category ?? "pass"), ["wrong-value", "wrong-type", "wrong-value", "wrong-value", "pass"]);
    });

    // ---- functions ----
    await test("correct functions pass every visible and hidden case", async () => {
      for (const code of [
        "def calculate_total(price, quantity):\n    return price * quantity\n",
        "def calculate_total(price, quantity):\n    total = 0\n    for _ in range(quantity):\n        total = total + price\n    return total\n",
        "calculate_total = lambda p, q: p * q\n",
      ]) {
        const r = await grade(page, totalFnTask, code);
        assert.equal(r.ok, true, JSON.stringify(r.checks));
        assert.equal(r.checks[0].cases.length, 4);
      }
    });

    await test("a hardcoded return fails hidden cases without revealing them", async () => {
      const r = await grade(page, totalFnTask, "def calculate_total(price, quantity):\n    return 48\n");
      assert.equal(r.ok, false);
      assert.equal(r.checks[0].category, "fails-hidden-cases");
      assert.match(r.checks[0].detail, /Works for the examples, but not for 3 of 3 other inputs/);
      assert.doesNotMatch(JSON.stringify(r), /\b15\b|\b14\b|\(5, 3\)|\(7, 2\)|\(0, 9\)/);
    });

    await test("printing instead of returning; wrong arg count; exception line", async () => {
      const p = await grade(page, totalFnTask, "def calculate_total(price, quantity):\n    print(price * quantity)\n");
      assert.equal(p.checks[0].category, "returned-none-printed");
      const a = await grade(page, totalFnTask, "def calculate_total(price):\n    return price\n");
      assert.equal(a.checks[0].category, "call-error");
      assert.match(a.checks[0].detail, /raised TypeError: calculate_total\(\) takes 1 positional argument but 2 were given/);
      const e = await grade(page, totalFnTask, "def calculate_total(price, quantity):\n    unit = price / (quantity - 4)\n    return unit\n");
      assert.equal(e.checks[0].category, "call-error");
      assert.equal(e.checks[0].line, 2);
      assert.match(e.checks[0].detail, /ZeroDivisionError/);
    });

    await test("missing function with near miss; name that isn't a function", async () => {
      const m = await grade(page, totalFnTask, "def calc_total(price, quantity):\n    return price * quantity\n");
      assert.equal(m.checks[0].category, "missing-name");
      const n = await grade(page, totalFnTask, "calculate_total = 48\n");
      assert.equal(n.checks[0].category, "not-callable");
      assert.match(n.checks[0].detail, /calculate_total is a int, not a function/);
    });

    await test("each case gets fresh argument objects", async () => {
      const task = { checks: [{ kind: "function", name: "add_item", cases: [
        { args: [list(str("a"))], expected: int(2) },
        { args: [list(str("a"))], expected: int(2), hidden: true },
      ] }] };
      const r = await grade(page, task, "def add_item(items):\n    items.append('new')\n    return len(items)\n");
      assert.equal(r.ok, true, JSON.stringify(r.checks));
    });

    // ---- program-level failures ----
    await test("syntax error: no checks run, Python's location kept", async () => {
      const r = await grade(page, notebookTask, "price = 12\nprint(price\n");
      assert.equal(r.ok, false);
      assert.equal(r.outcome, "syntax-error");
      assert.equal(r.error.line, 2);
      assert.equal(r.error.text, "print(price");
      assert.ok(r.checks.every((c) => c.status === "not-run"));
    });

    await test("runtime error at top level: type, line and traceback", async () => {
      const r = await grade(page, notebookTask, "price = 12\nquantity = 4\ntotal = price * quantty\nprint(total)\n");
      assert.equal(r.outcome, "runtime-error");
      assert.equal(r.error.type, "NameError");
      assert.equal(r.error.line, 3);
      assert.match(r.error.traceback, /File "main\.py", line 3/);
      assert.match(r.error.message, /quantty/);
      assert.equal(r.ok, false);
    });

    await test("an infinite loop in a hidden case times out, names only the function, then grading recovers", async () => {
      const r = await grade(page, totalFnTask, "def calculate_total(price, quantity):\n    while quantity == 3:\n        pass\n    return price * quantity\n");
      assert.equal(r.outcome, "timeout");
      assert.equal(r.ok, false);
      assert.match(r.summary, /while running calculate_total with another input/);
      assert.doesNotMatch(r.summary, /\(5, 3\)/);
      assert.equal(r.checks[0].category, "timeout");
      const again = await grade(page, totalFnTask, "def calculate_total(price, quantity):\n    return price * quantity\n");
      assert.equal(again.ok, true);
    });

    await test("Stop during a check never awards completion", async () => {
      await page.evaluate(([t]) => {
        window.__pending = window.__runtimePython.checkPython(t, "price = 12\nquantity = 4\ntotal = 48\nprint(total)\nwhile True:\n    pass\n");
      }, [notebookTask]);
      await page.waitForTimeout(1500);
      await page.evaluate(() => window.__runtimePython.stopPython());
      const r = await page.evaluate(() => window.__pending);
      assert.equal(r.outcome, "stopped");
      assert.equal(r.ok, false);
      assert.equal(r.passed, 0);
    });

    await test("correct, then wrong: the second grade fails (no carried-over success)", async () => {
      assert.equal((await grade(page, notebookTask, "price = 12\nquantity = 4\ntotal = price * quantity\nprint(total)\n")).ok, true);
      const r = await grade(page, notebookTask, "price = 12\nquantity = 4\nprint(48)\n");
      assert.equal(r.ok, false);
      assert.equal(r.checks.find((c) => c.label.startsWith("total")).category, "missing-name");
    });

    // ---- isolation and tampering ----
    await test("an earlier Run that patches builtins cannot affect a later Check", async () => {
      const contaminate = "import builtins, math\nbuiltins.len = lambda x: -1\nbuiltins.int = str\nmath.pi = 3\nprice = 12\ntotal = 48\n";
      assert.equal((await run(page, contaminate)).status, "ok");
      const r = await grade(page, { checks: [...notebookTask.checks, { kind: "variable", name: "n", expected: int(3) }] }, "price = 12\nquantity = 4\ntotal = price * quantity\nprint(total)\nn = len([1, 2, 3])\n");
      assert.equal(r.ok, true, JSON.stringify(r.checks));
      const missing = await grade(page, notebookTask, "print(48)\n");
      assert.equal(missing.ok, false, "variables from the earlier Run are gone");
    });

    await test("patched builtins and json inside the checked program don't change how values are read", async () => {
      const code = [
        "import builtins, json",
        "price = 12",
        "quantity = 4",
        "total = 47",
        "builtins.repr = lambda x: '48'",
        "builtins.type = lambda x: int",
        "builtins.isinstance = lambda *a: True",
        "builtins.len = lambda x: 0",
        "builtins.callable = lambda x: True",
        "json.loads = lambda *a, **k: {}",
        "print(48)",
      ].join("\n");
      const r = await grade(page, notebookTask, code);
      assert.equal(r.ok, false);
      const total = r.checks.find((c) => c.label.startsWith("total"));
      assert.equal(total.category, "wrong-value");
      assert.equal(total.actual, "47");
    });

    await test("objects with a lying __eq__ or __repr__, and int subclasses, never pass", async () => {
      const code = [
        "class AlwaysEqual:",
        "    def __eq__(self, other): return True",
        "    def __repr__(self): return '48'",
        "class FakeInt(int):",
        "    def __repr__(self): return '48'",
        "    def __eq__(self, other): return True",
        "price = 12",
        "quantity = AlwaysEqual()",
        "total = FakeInt(47)",
        "print(48)",
      ].join("\n");
      const r = await grade(page, notebookTask, code);
      assert.equal(r.ok, false);
      assert.equal(r.checks[1].category, "wrong-type");
      assert.equal(r.checks[1].actual, "48", "shown as its repr, but judged as a foreign object");
      assert.equal(r.checks[2].category, "wrong-type");
      const fn = await grade(page, totalFnTask, "class Liar:\n    def __eq__(self, o): return True\ndef calculate_total(p, q):\n    return Liar()\n");
      assert.equal(fn.ok, false);
    });

    await test("results forged through js.postMessage are ignored", async () => {
      const code = [
        "import js",
        "from pyodide.ffi import to_js",
        "fake = {'status': 'ok', 'durationMs': 1, 'probe': {'names': ['total'], 'vars': {'price': {'value': {'t': 'int', 'v': '12'}}, 'quantity': {'value': {'t': 'int', 'v': '4'}}, 'total': {'value': {'t': 'int', 'v': '48'}}}, 'calls': {}}}",
        "for i in range(1, 400):",
        "    js.postMessage(to_js({'type': 'done', 'id': i, 'result': fake}, dict_converter=js.Object.fromEntries))",
        "    js.postMessage(to_js({'type': 'output', 'id': i, 'stream': 'stdout', 'text': '48\\n'}, dict_converter=js.Object.fromEntries))",
        "js.postMessage = None",
        "total = 1",
        "print('nope')",
      ].join("\n");
      const r = await grade(page, notebookTask, code);
      assert.equal(r.ok, false);
      assert.equal(r.stdout, "nope\n");
      assert.equal(r.checks.find((c) => c.label.startsWith("total")).actual, "1");
    });

    await test("Run and Check stay separate: Run after a Check still works", async () => {
      await grade(page, notebookTask, "price = 12\nquantity = 4\ntotal = 48\nprint(total)\n");
      const r = await run(page, "print('run after check')");
      assert.equal(r.status, "ok");
      assert.equal(r.stdout, "run after check\n");
      assert.equal(r.probe, undefined);
    });
  } finally {
    await context.close();
    await browser.close();
  }
}

console.log(results.join("\n"));
