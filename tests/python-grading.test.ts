import { describe, expect, it } from "vitest";
import type { PyProbeResult, PyRunResult } from "@/engine/python/client";
import { gradePython, probeFor, type PyTask } from "@/engine/python/grading";
import { formatPy, py, pyEqual, pyFloatRepr, pyStrRepr, toWire, type PyValue } from "@/engine/python/values";

const io = { stdout: "", stderr: "", output: [] };
const ok = (probe: Partial<PyProbeResult> = {}, stdout = ""): PyRunResult => ({
  ...io,
  stdout,
  status: "ok",
  durationMs: 1,
  probe: { names: [], vars: {}, calls: {}, ...probe },
});
const v = (value: PyValue) => ({ value });
const ret = (value: PyValue, stdout = "") => ({ ok: true as const, value, stdout });

// What the worker would send for learner values (with Python's own reprs).
const actualFloat = (n: number, r: string): PyValue => ({ t: "float", v: n, r });
const actualStr = (s: string): PyValue => ({ t: "str", v: s, r: pyStrRepr(s) });

describe("python values: display matches Python repr", () => {
  it.each([
    [48, "48.0"],
    [0.1, "0.1"],
    [0.1 + 0.2, "0.30000000000000004"],
    [1e16, "1e+16"],
    [1e-5, "1e-05"],
    [0.00015, "0.00015"],
    [123.456, "123.456"],
    [-2.5, "-2.5"],
    [12345678901234567, "1.2345678901234568e+16"],
    [NaN, "nan"],
    [-Infinity, "-inf"],
    [-0, "-0.0"],
  ])("float %s → %s", (n, text) => expect(pyFloatRepr(n)).toBe(text));

  it("str, collections, None and bools", () => {
    expect(pyStrRepr("it's")).toBe(`"it's"`);
    expect(pyStrRepr("a\nb")).toBe("'a\\nb'");
    expect(formatPy(py.list(py.int(1), py.str("a"), py.none, py.bool(true)))).toBe("[1, 'a', None, True]");
    expect(formatPy(py.tuple(py.int(1)))).toBe("(1,)");
    expect(formatPy(py.set())).toBe("set()");
    expect(formatPy(py.dict([[py.str("k"), py.float(2)]]))).toBe("{'k': 2.0}");
  });
});

describe("python values: explicit comparison policies", () => {
  it("bool is never int, int is not float by default", () => {
    expect(pyEqual(py.int(1), py.bool(true))).toBe(false);
    expect(pyEqual(py.bool(true), py.int(1), { numbers: "int-float-equal" })).toBe(false);
    expect(pyEqual(py.float(48), py.int(48))).toBe(false);
    expect(pyEqual(py.float(48), py.int(48), { numbers: "int-float-equal" })).toBe(true);
    expect(pyEqual(py.int("123456789012345678901234567890"), py.int("123456789012345678901234567890"))).toBe(true);
  });

  it("floats use tolerance unless exact is requested; NaN never matches", () => {
    expect(pyEqual(py.float(0.1 + 0.2), py.float(0.3))).toBe(true);
    expect(pyEqual(py.float(0.1 + 0.2), py.float(0.3), { float: "exact" })).toBe(false);
    expect(pyEqual(py.float(0.3001), py.float(0.3))).toBe(false);
    expect(pyEqual(py.float(0.3001), py.float(0.3), { float: { abs: 0.001 } })).toBe(true);
    expect(pyEqual(py.float(NaN), py.float(NaN))).toBe(false);
    expect(pyEqual(py.float(Infinity), py.float(Infinity))).toBe(true);
  });

  it("strings exact unless strip is allowed", () => {
    expect(pyEqual(py.str("Ada "), py.str("Ada"))).toBe(false);
    expect(pyEqual(py.str("Ada "), py.str("Ada"), { strings: "strip" })).toBe(true);
    expect(pyEqual(py.str("ada"), py.str("Ada"), { strings: "strip" })).toBe(false);
  });

  it("list order matters unless the policy says any; list is not tuple; sets and dicts are unordered", () => {
    const a = py.list(py.int(2), py.int(1));
    expect(pyEqual(a, py.list(py.int(1), py.int(2)))).toBe(false);
    expect(pyEqual(a, py.list(py.int(1), py.int(2)), { order: "any" })).toBe(true);
    expect(pyEqual(py.list(py.int(1), py.int(1), py.int(2)), py.list(py.int(1), py.int(2), py.int(2)), { order: "any" })).toBe(false);
    expect(pyEqual(py.tuple(py.int(1)), py.list(py.int(1)))).toBe(false);
    expect(pyEqual(py.set(py.int(2), py.int(1)), py.set(py.int(1), py.int(2)))).toBe(true);
    expect(pyEqual(py.set(py.int(1)), py.frozenset(py.int(1)))).toBe(false);
    expect(pyEqual(py.dict([[py.str("b"), py.int(2)], [py.str("a"), py.int(1)]]), py.dict([[py.str("a"), py.int(1)], [py.str("b"), py.int(2)]]))).toBe(true);
    expect(pyEqual(py.dict([[py.str("a"), py.int(1)]]), py.dict([[py.str("a"), py.float(1)]]))).toBe(false);
    expect(pyEqual(py.list(py.float(0.1 + 0.2)), py.list(py.float(0.3)))).toBe(true);
  });

  it("learner objects and truncated values never equal anything", () => {
    const fake: PyValue = { t: "other", type: "AlwaysEqual", repr: "48" };
    expect(pyEqual(fake, py.int(48))).toBe(false);
    expect(pyEqual({ t: "str", v: "x", truncated: true }, py.str("x"))).toBe(false);
  });

  it("wire form spells out non-finite floats and rejects learner objects", () => {
    expect(toWire(py.float(NaN))).toEqual({ t: "float", v: "nan" });
    expect(toWire(py.float(-Infinity))).toEqual({ t: "float", v: "-inf" });
    expect(() => toWire({ t: "other", type: "X", repr: "x" })).toThrow();
    expect(() => py.int(1.5)).toThrow();
  });
});

const totalTask: PyTask = {
  checks: [
    { kind: "variable", name: "price", expected: py.int(12) },
    { kind: "variable", name: "total", expected: py.int(48) },
    { kind: "output", expected: "48\n" },
  ],
};

const fnTask: PyTask = {
  checks: [
    {
      kind: "function",
      name: "calculate_total",
      cases: [
        { args: [py.int(12), py.int(4)], expected: py.int(48) },
        { args: [py.int(5), py.int(3)], expected: py.int(15), hidden: true },
        { args: [py.int(7), py.int(2)], expected: py.int(14), hidden: true },
      ],
    },
  ],
};

describe("probe never carries expected values", () => {
  it("only names and arguments are sent to the interpreter", () => {
    const probe = probeFor(fnTask);
    expect(probe).toEqual({
      vars: [],
      calls: [{ name: "calculate_total", cases: [{ args: [{ t: "int", v: "12" }, { t: "int", v: "4" }] }, { args: [{ t: "int", v: "5" }, { t: "int", v: "3" }] }, { args: [{ t: "int", v: "7" }, { t: "int", v: "2" }] }] }],
    });
    expect(JSON.stringify(probe)).not.toMatch(/expected|"48"|"15"|"14"/);
    expect(probeFor(totalTask)).toEqual({ vars: ["price", "total"], calls: [] });
  });
});

describe("gradePython: variables and output", () => {
  it("passes when values, types and output match", () => {
    const r = gradePython(totalTask, ok({ vars: { price: v(py.int(12)), total: v(py.int(48)) } }, "48\n"));
    expect(r).toMatchObject({ ok: true, outcome: "passed", passed: 3, total: 3 });
    expect(r.checks.map((c) => c.status)).toEqual(["pass", "pass", "pass"]);
  });

  it("missing variable, with a case-sensitive near miss", () => {
    const r = gradePython(totalTask, ok({ names: ["price", "Total"], vars: { price: v(py.int(12)), total: { missing: true } } }, "48\n"));
    expect(r.ok).toBe(false);
    expect(r.checks[1]).toMatchObject({ status: "fail", category: "missing-name" });
    expect(r.checks[1].detail).toMatch(/You defined Total/);
  });

  it("wrong type is distinguished from wrong value", () => {
    const r = gradePython(totalTask, ok({ vars: { price: v(actualStr("12")), total: v(py.int(36)) } }, "48\n"));
    expect(r.checks[0]).toMatchObject({ category: "wrong-type", actual: "'12'", expected: "12" });
    expect(r.checks[0].detail).toBe("price is a str ('12'), but this task needs an int (12).");
    expect(r.checks[1]).toMatchObject({ category: "wrong-value", actual: "36" });
  });

  it("True is not 1 when the task needs a bool", () => {
    const task: PyTask = { checks: [{ kind: "variable", name: "in_stock", expected: py.bool(true) }] };
    expect(gradePython(task, ok({ vars: { in_stock: v(py.int(1)) } })).checks[0].category).toBe("wrong-type");
    expect(gradePython(task, ok({ vars: { in_stock: v(py.bool(true)) } })).ok).toBe(true);
  });

  it("float values use the check's policy", () => {
    const task: PyTask = { checks: [{ kind: "variable", name: "avg", expected: py.float(0.3) }] };
    expect(gradePython(task, ok({ vars: { avg: v(actualFloat(0.1 + 0.2, "0.30000000000000004")) } })).ok).toBe(true);
    const exact: PyTask = { checks: [{ kind: "variable", name: "avg", expected: py.float(0.3), compare: { float: "exact" } }] };
    const r = gradePython(exact, ok({ vars: { avg: v(actualFloat(0.1 + 0.2, "0.30000000000000004")) } }));
    expect(r.checks[0]).toMatchObject({ category: "wrong-value", actual: "0.30000000000000004" });
  });

  it("output is exact by default and only normalised when the task allows it", () => {
    const exact: PyTask = { checks: [{ kind: "output", expected: "48\n" }] };
    expect(gradePython(exact, ok({}, "48 \n")).checks[0]).toMatchObject({ category: "wrong-output", detail: "Line 1 differs only in trailing spaces." });
    expect(gradePython(exact, ok({}, "48")).ok).toBe(false);
    expect(gradePython(exact, ok({}, "")).checks[0].detail).toBe("Your program didn't print anything.");
    expect(gradePython(exact, ok({}, "48.0\n")).checks[0].detail).toBe('Line 1: expected "48", but your program printed "48.0".');
    expect(gradePython(exact, ok({}, "48\n49\n")).checks[0].detail).toMatch(/more lines than expected/);
    const relaxed: PyTask = { checks: [{ kind: "output", expected: "48\n", whitespace: "trailing" }] };
    expect(gradePython(relaxed, ok({}, "48  \n\n")).ok).toBe(true);
    expect(gradePython(relaxed, ok({}, " 48\n")).ok).toBe(false);
  });
});

describe("gradePython: functions", () => {
  it("passes when every case, visible and hidden, returns the expected value", () => {
    const r = gradePython(fnTask, ok({ calls: { calculate_total: { cases: [ret(py.int(48)), ret(py.int(15)), ret(py.int(14))] } } }));
    expect(r.ok).toBe(true);
    expect(r.checks[0].cases?.map((c) => c.ok)).toEqual([true, true, true]);
  });

  it("a hardcoded return fails the hidden cases without revealing them", () => {
    const r = gradePython(fnTask, ok({ calls: { calculate_total: { cases: [ret(py.int(48)), ret(py.int(48)), ret(py.int(48))] } } }));
    expect(r.ok).toBe(false);
    expect(r.checks[0]).toMatchObject({ category: "fails-hidden-cases" });
    expect(r.checks[0].detail).toMatch(/Works for the examples, but not for 2 of 2 other inputs/);
    const hidden = r.checks[0].cases!.filter((c) => c.hidden);
    for (const c of hidden) {
      expect(c.call).toBeUndefined();
      expect(c.expected).toBeUndefined();
      expect(c.actual).toBeUndefined();
    }
    expect(JSON.stringify(r)).not.toMatch(/\b15\b|\b14\b|\(5, 3\)|\(7, 2\)/);
  });

  it("a wrong visible case is shown with the call, expected and actual", () => {
    const r = gradePython(fnTask, ok({ calls: { calculate_total: { cases: [ret(py.int(16)), ret(py.int(8)), ret(py.int(9))] } } }));
    expect(r.checks[0]).toMatchObject({ category: "wrong-value", detail: "calculate_total(12, 4) returned 16, but should return 48." });
  });

  it("printing instead of returning is recognised", () => {
    const r = gradePython(fnTask, ok({ calls: { calculate_total: { cases: [ret(py.none, "48\n"), ret(py.none, "15\n"), ret(py.none, "14\n")] } } }));
    expect(r.checks[0].category).toBe("returned-none-printed");
    expect(r.checks[0].detail).toMatch(/printed a value but returned None/);
  });

  it("an exception inside the function reports its type, message and line", () => {
    const err = { ok: false as const, stdout: "", error: { type: "TypeError", message: "can't multiply sequence by non-int of type 'str'", line: 2, traceback: "" } };
    const r = gradePython(fnTask, ok({ calls: { calculate_total: { cases: [err, err, err] } } }));
    expect(r.checks[0]).toMatchObject({ category: "call-error", line: 2 });
    expect(r.checks[0].detail).toMatch(/calculate_total\(12, 4\) raised TypeError: can't multiply/);
  });

  it("an exception only on a hidden input hides the input", () => {
    const err = { ok: false as const, stdout: "", error: { type: "ZeroDivisionError", message: "division by zero", line: 3, traceback: "" } };
    const r = gradePython(fnTask, ok({ calls: { calculate_total: { cases: [ret(py.int(48)), err, ret(py.int(14))] } } }));
    expect(r.checks[0].category).toBe("fails-hidden-cases");
    expect(r.checks[0].detail).toMatch(/Raised ZeroDivisionError for another input \(line 3\)/);
  });

  it("missing and non-callable functions", () => {
    expect(gradePython(fnTask, ok({ names: ["calc_total"], calls: { calculate_total: { missing: true } } })).checks[0]).toMatchObject({ category: "missing-name" });
    expect(gradePython(fnTask, ok({ calls: { calculate_total: { notCallable: true, type: "int" } } })).checks[0]).toMatchObject({ category: "not-callable" });
  });

  it("fewer results than cases never passes", () => {
    const r = gradePython(fnTask, ok({ calls: { calculate_total: { cases: [ret(py.int(48))] } } }));
    expect(r.ok).toBe(false);
  });
});

describe("gradePython: nothing passes unless the program ran and every check passed", () => {
  const allGood = ok({ vars: { price: v(py.int(12)), total: v(py.int(48)) } }, "48\n");

  it.each<PyRunResult>([
    { ...io, status: "syntax-error", durationMs: 0, error: { type: "SyntaxError", message: "'(' was never closed", line: 2, column: 6, text: "print(" } },
    { ...io, status: "runtime-error", durationMs: 0, error: { type: "NameError", message: "name 'x' is not defined", line: 1, traceback: "t" } },
    { ...io, stdout: "48\n", status: "timeout", limitMs: 5000 },
    { ...io, stdout: "48\n", status: "output-limit", limit: 50000 },
    { ...io, stdout: "48\n", status: "stopped" },
    { ...io, status: "crashed", message: "boom" },
    { status: "superseded" },
    { status: "unavailable", message: "off" },
  ])("$status → ok false, checks not passed", (r) => {
    const report = gradePython(totalTask, r);
    expect(report.ok).toBe(false);
    expect(report.passed).toBe(0);
    expect(report.checks.every((c) => c.status !== "pass")).toBe(true);
  });

  it("syntax and runtime errors keep Python's location", () => {
    const s = gradePython(totalTask, { ...io, status: "syntax-error", durationMs: 0, error: { type: "SyntaxError", message: "'(' was never closed", line: 2, column: 6, text: "print(" } });
    expect(s.error).toMatchObject({ category: "syntax-error", line: 2, column: 6, text: "print(" });
    expect(s.summary).toMatch(/^SyntaxError on line 2/);
    const rt = gradePython(totalTask, { ...io, status: "runtime-error", durationMs: 0, error: { type: "NameError", message: "name 'x' is not defined", line: 1, traceback: "Traceback…" } });
    expect(rt.error).toMatchObject({ category: "runtime-error", type: "NameError", line: 1, traceback: "Traceback…" });
  });

  it("a timeout on a hidden case names the function, not the input", () => {
    const r = gradePython(fnTask, { ...io, status: "timeout", limitMs: 5000, case: { call: "calculate_total", index: 1 } });
    expect(r.summary).toBe("Your code didn't finish within 5 seconds while running calculate_total with another input. Look for a loop that never ends.");
    expect(r.checks[0]).toMatchObject({ status: "fail", category: "timeout" });
    const visible = gradePython(fnTask, { ...io, status: "timeout", limitMs: 5000, case: { call: "calculate_total", index: 0 } });
    expect(visible.summary).toMatch(/while running calculate_total\(12, 4\)/);
  });

  it("a finished program with no probe data never passes value checks", () => {
    const r = gradePython(totalTask, { ...io, stdout: "48\n", status: "ok", durationMs: 1 });
    expect(r.ok).toBe(false);
    expect(r.checks[2].status).toBe("pass");
  });

  it("a task without checks can't be marked correct", () => {
    expect(gradePython({ checks: [] }, allGood)).toMatchObject({ ok: false, outcome: "failed" });
  });

  it("each report depends only on its own run: correct then wrong", () => {
    expect(gradePython(totalTask, allGood).ok).toBe(true);
    expect(gradePython(totalTask, ok({ vars: { price: v(py.int(12)), total: v(py.int(47)) } }, "47\n")).ok).toBe(false);
  });
});

describe("gradePython: author tips", () => {
  it("are attached only to failed checks and never change the verdict", () => {
    const task: PyTask = { checks: [{ kind: "variable", name: "total", expected: py.int(75), tip: "Recalculate total after changing quantity." }] };
    const bad = gradePython(task, ok({ vars: { total: v(py.int(30)) } }));
    expect(bad.ok).toBe(false);
    expect(bad.checks[0].tip).toBe("Recalculate total after changing quantity.");
    const good = gradePython(task, ok({ vars: { total: v(py.int(75)) } }));
    expect(good.ok).toBe(true);
    expect(good.checks[0].tip).toBeUndefined();
    const notRun = gradePython(task, { stdout: "", stderr: "", output: [], status: "timeout", limitMs: 5000 });
    expect(notRun.checks[0].tip).toBeUndefined();
  });
});

describe("gradePython: uses-variables (learning-objective check)", () => {
  const task: PyTask = {
    checks: [
      { kind: "variable", name: "total", expected: py.int(21) },
      { kind: "uses-variables", name: "total", uses: ["price", "quantity"] },
    ],
  };
  const a = (line: number, uses: string[], aug = false) => ({ line, uses, aug });
  const run = (assignments: Record<string, { line: number; uses: string[]; aug: boolean }[]>) =>
    gradePython(task, ok({ vars: { total: v(py.int(21)) }, assignments }));

  it("asks the interpreter for assignment facts only when a task uses the check", () => {
    expect(probeFor(task)).toEqual({ vars: ["total"], calls: [], assignments: ["total"] });
    expect(probeFor(totalTask)).not.toHaveProperty("assignments");
  });

  it("passes for any expression that uses both variables", () => {
    expect(run({ total: [a(3, ["price", "quantity"])] }).ok).toBe(true);
    expect(run({ total: [a(3, ["price", "quantity", "sum"])] }).ok).toBe(true);
    // total = price, then total *= quantity
    expect(run({ total: [a(3, ["price"]), a(4, ["quantity", "total"], true)] }).ok).toBe(true);
  });

  it("a typed-in result fails with a beginner-friendly reason and the line", () => {
    const r = run({ total: [a(3, [])] });
    expect(r.ok).toBe(false);
    expect(r.checks[1]).toMatchObject({ status: "fail", category: "not-calculated", line: 3, label: "total is calculated from price and quantity" });
    expect(r.checks[1].detail).toBe("total is set to a fixed value on line 3. Calculate it from price and quantity instead of typing the result, so the program still works if those values change.");
    // The value check still passes on its own: the two requirements are reported separately.
    expect(r.checks[0].status).toBe("pass");
  });

  it("names the variable that wasn't used", () => {
    const r = run({ total: [a(3, ["price"])] });
    expect(r.checks[1].detail).toBe("total is calculated on line 3 without using quantity. Use the variable instead of typing its value.");
  });

  it("judges the final assignment: a later typed-in value overrides an earlier calculation", () => {
    expect(run({ total: [a(3, ["price", "quantity"]), a(5, [])] }).checks[1].category).toBe("not-calculated");
  });

  it("missing assignment and missing facts never pass", () => {
    expect(run({ total: [] }).checks[1].category).toBe("missing-name");
    expect(gradePython(task, ok({ vars: { total: v(py.int(21)) } })).checks[1]).toMatchObject({ status: "fail", category: "not-run" });
  });
});
