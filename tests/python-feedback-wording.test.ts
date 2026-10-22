// How check results are worded on screen (src/features/python/feedback.ts). Wording only: every test also asserts
// that pass/fail counts and report.ok are exactly the grader's.
import { describe, expect, it } from "vitest";
import type { PyProbeResult, PyRunResult } from "@/engine/python/client";
import { gradePython, type PyTask } from "@/engine/python/grading";
import { py, type PyValue } from "@/engine/python/values";
import { firstDiff, presentReport, resultParts, splitRepr, typeErrorHint } from "@/features/python/feedback";

const io = { stderr: "", output: [] };
const ok = (probe: Partial<PyProbeResult> = {}, stdout = ""): PyRunResult => ({ ...io, stdout, status: "ok", durationMs: 1, probe: { names: [], vars: {}, calls: {}, ...probe } });
const val = (value: PyValue) => ({ ok: true as const, value, stdout: "" });

function both(task: PyTask, run: PyRunResult) {
  const raw = gradePython(task, run);
  const shown = presentReport(raw, task);
  expect(shown.ok).toBe(raw.ok);
  expect(shown.passed).toBe(raw.passed);
  expect(shown.checks.map((c) => c.status)).toEqual(raw.checks.map((c) => c.status));
  return { raw, shown };
}

describe("rule checks (True/False expressions)", () => {
  const task: PyTask = {
    checks: [
      { kind: "output", expected: "hi\n" },
      { kind: "expr", id: "one", label: "Uses a single print call", expr: "result = True", expected: py.bool(true), tip: "Combine the three values into one print." },
      { kind: "expr", id: "note", label: "Keeps the note as a comment", expr: "result = True", expected: py.bool(true) },
    ],
  };
  it("say the rule (the tip, once) instead of Got False, but expected True", () => {
    const { raw, shown } = both(task, ok({ exprs: [val(py.bool(false)), val(py.bool(false))] }, "hi\n"));
    expect(raw.checks[1].detail).toBe("Got False, but expected True.");
    const [, one, note] = shown.checks;
    expect(one.detail).toBe("Combine the three values into one print.");
    expect(one.tip).toBeUndefined();
    expect(note.detail).toBe("Your program doesn't do this yet.");
    expect(JSON.stringify(shown.checks)).not.toMatch(/Got (True|False)/);
    expect(shown.note).toBeNull(); // the banner no longer repeats the first failure
  });
  it("passing rule checks are unchanged", () => {
    const { shown } = both(task, ok({ exprs: [val(py.bool(true)), val(py.bool(true))] }, "hi\n"));
    expect(shown.ok).toBe(true);
  });
});

describe("bundled results", () => {
  it("names each call the check made and shows its test data", () => {
    const expr = 'from desk import is_open\nrows = [{"room": "oak"}]\nresult = (is_open(rows, "oak", "2024-06-01"), is_open(rows, "oak", "2024-06-03"), is_open(rows, "elm", "2024-06-01"))\n';
    const task: PyTask = { checks: [{ kind: "expr", id: "open", label: "only a yes row is open", show: "is_open(rows, 'oak', '2024-06-01')", expr, expected: py.tuple(py.bool(true), py.bool(false), py.bool(false)) }] };
    const { raw, shown } = both(task, ok({ exprs: [val(py.tuple(py.bool(true), py.bool(true), py.bool(false)))] }));
    expect(raw.checks[0].detail).toMatch(/gave \(True, True, False\)/);
    const c = shown.checks[0];
    expect(c.parts).toEqual([
      { what: 'is_open(rows, "oak", "2024-06-01")', expected: "True", actual: "True", ok: true },
      { what: 'is_open(rows, "oak", "2024-06-03")', expected: "False", actual: "True", ok: false },
      { what: 'is_open(rows, "elm", "2024-06-01")', expected: "False", actual: "False", ok: true },
    ]);
    expect(c.setup).toBe('rows = [{"room": "oak"}]');
    expect(c.detail).not.toMatch(/\(True, True, False\)/);
  });
  it("a limit measured by the check names the requirement, not (90, False)", () => {
    const expr = "_n = [0]\n_counts = recent_counts(_times)\nresult = (_counts[-1], _n[0] <= 15000)";
    const task: PyTask = { checks: [{ kind: "expr", id: "cmp", label: "at most 15,000 time comparisons for 600 trips", expr, expected: py.tuple(py.int(90), py.bool(true)) }] };
    const { raw, shown } = both(task, ok({ exprs: [val(py.tuple(py.int(90), py.bool(false)))] }));
    expect(raw.checks[0].detail).toBe("Got (90, False), but expected (90, True).");
    expect(shown.checks[0].detail).toBe("Your result is right, but this requirement isn't met yet: at most 15,000 time comparisons for 600 trips.");
  });
  it("one function's returned pair keeps the grader's sentence", () => {
    const task: PyTask = { checks: [{ kind: "expr", id: "imp", label: "counts rows", show: "import_payments(conn, export)", expr: "result = import_payments(conn, export)", expected: py.tuple(py.int(2), py.int(2)) }] };
    const { raw, shown } = both(task, ok({ exprs: [val(py.tuple(py.int(0), py.int(0)))] }));
    expect(shown.checks[0].detail).toBe(raw.checks[0].detail);
  });
});

describe("labels that contradict the task", () => {
  it("a hidden rerun names the swapped value; repeated labels are numbered", () => {
    const rerun = { kind: "variant" as const, set: { order: py.str("O1") }, output: "O1\n", hidden: true };
    const task: PyTask = { checks: [{ kind: "output", expected: "O9\n" }, { ...rerun, id: "r1" }, { ...rerun, id: "r2" }] };
    const run = ok({ variants: [{ status: "ok", stdout: "O9\n", vars: {} }, { status: "ok", stdout: "O9\n", vars: {} }] }, "O9\n");
    const { shown } = both(task, run);
    expect(shown.checks[1].label).toBe("Works when order holds a different value");
    expect(shown.checks[2].label).toBe("Works when order holds a different value (test 2)");
    expect(shown.checks[1].detail).toMatch(/^With order set to a different value, .*calculated from order\.$/);
  });
  it("'works for the visible example' only when it does", () => {
    const hidden = { kind: "expr" as const, id: "h", label: "an empty list", expr: "result = f([])", expected: py.int(0), hidden: true };
    const visible = { kind: "expr" as const, id: "v", label: "f() adds the numbers", show: "f([1, 2])", expr: "result = f([1, 2])", expected: py.int(3) };
    const fail = (v: PyValue) => ok({ exprs: [val(v), val(py.int(9))] });
    expect(both({ checks: [visible, hidden] }, fail(py.int(3))).shown.checks[1].detail).toBe("Passes “f() adds the numbers”, but gives a different result for this case. Its inputs stay hidden; the check's name says what it tries.");
    expect(both({ checks: [visible, hidden] }, fail(py.int(4))).shown.checks[1].detail).toMatch(/^Your code also gives a different result for this case.*Fix the visible example first\.$/);
    expect(both({ checks: [hidden] }, ok({ exprs: [val(py.int(9))] })).shown.checks[0].detail).toMatch(/^Your code gives a different result for this case\./);
  });
  it("no hidden-test counter while the visible example fails", () => {
    const task: PyTask = { checks: [{ kind: "function", name: "f", cases: [{ args: [py.int(1)], expected: py.int(2) }, { args: [py.int(2)], expected: py.int(0), hidden: true }] }] };
    const run = ok({ calls: { f: { cases: [val(py.int(0)), val(py.int(0))] } } });
    const { shown } = both(task, run);
    expect(shown.checks[0].hideHiddenCount).toBe(true);
  });
});

describe("errors and output", () => {
  it("a runtime error is summarised once, without repeating the message", () => {
    const run: PyRunResult = { ...io, stdout: "", status: "runtime-error", durationMs: 1, error: { type: "TypeError", message: "can't multiply sequence by non-int of type 'str'", line: 20, traceback: 'Traceback (most recent call last):\n  File "quality.py", line 20, in kept_total\nTypeError: x' } };
    const { shown } = both({ checks: [{ kind: "output", expected: "32\n" }] }, run);
    expect(shown.note).toBe("Your program stopped with a TypeError on line 20 of quality.py, so the checks didn't run.");
  });
  it("CSV text in arithmetic gets a conversion hint", () => {
    expect(typeErrorHint("TypeError", "can't multiply sequence by non-int of type 'str'", true)).toMatch(/CSV file are text.*int\(\) or float\(\)/);
    expect(typeErrorHint("TypeError", "unsupported operand type(s) for +: 'int' and 'str'", false)).toMatch(/int\(\) or float\(\)/);
    expect(typeErrorHint("TypeError", "can only concatenate str (not \"int\") to str")).toMatch(/str\(\) or use an f-string/);
    expect(typeErrorHint("TypeError", "'NoneType' object is not subscriptable")).toBeNull();
    expect(typeErrorHint("ValueError", "can't multiply sequence by non-int of type 'str'")).toBeNull();
  });
  it("whitespace-only differences are described without quoting collapsed spaces", () => {
    const task: PyTask = { checks: [{ kind: "output", expected: "slip\n    1 x Set\n" }] };
    const { shown } = both(task, ok({}, "slip\n  1 x Set\n"));
    expect(shown.checks[0].detail).toBe("Line 2 has the right words, but the spaces differ. It should start with 4 spaces; yours starts with 2. Each space is shown as · below.");
    expect(shown.checks[0].diff).toEqual({ line: 2, expected: "    1 x Set", actual: "  1 x Set" });
    expect(firstDiff("a\n", "a\nb\n")).toEqual({ line: 2, expected: null, actual: "b" });
  });
});

describe("repr helpers", () => {
  it("split at top-level commas only", () => {
    expect(splitRepr("(1, ['a, b', (2, 3)], {'k': 1})")).toEqual(["1", "['a, b', (2, 3)]", "{'k': 1}"]);
    expect(splitRepr("12")).toBeNull();
    expect(resultParts("x = 1\nresult = (f(x), g(x, 2))")).toEqual({ parts: ["f(x)", "g(x, 2)"], setup: "x = 1" });
  });
});
