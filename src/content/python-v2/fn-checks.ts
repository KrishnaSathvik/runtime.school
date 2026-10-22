/**
 * Authoring helpers for genuine coding questions: function implementation, data transformation, file output,
 * learner-written tests and performance budgets. Re-exported from ./checks. Reference: docs/python/grading-capabilities.md.
 *
 * Every helper produces an ordinary PyCheck. Expected values stay on this side; only inputs (and, for `expr`
 * checks, the author's expression) enter the interpreter. Browser grading is learning feedback, not tamper-proof.
 */
import type { PyCheck, PyFunctionCase } from "@/engine/python/grading";
import { py, type ComparePolicy, type PyValue } from "@/engine/python/values";

const TAGS = new Set(["none", "bool", "int", "float", "str", "list", "tuple", "set", "frozenset", "dict", "other"]);
const VALUE_KEYS = new Set(["t", "v", "r", "items", "entries", "truncated", "type", "repr"]);
const isPyValue = (x: unknown): x is PyValue =>
  typeof x === "object" && x !== null && !Array.isArray(x) && TAGS.has((x as { t?: unknown }).t as string) && Object.keys(x).every((k) => VALUE_KEYS.has(k));

/**
 * A plain JavaScript value as a Python value, for test inputs and expected results:
 * string → str, boolean → bool, null → None, whole number → int, other number → float, array → list,
 * object → dict with str keys. A value built with `py.*` passes through unchanged, so write `py.float(2)`
 * for 2.0, `py.tuple(…)` for a tuple, `py.set(…)` for a set, and `py.dict([...])` for non-str keys.
 */
export function pv(x: unknown): PyValue {
  if (isPyValue(x)) return x;
  if (x === null || x === undefined) return py.none;
  if (typeof x === "string") return py.str(x);
  if (typeof x === "boolean") return py.bool(x);
  if (typeof x === "bigint") return py.int(x);
  if (typeof x === "number") return Number.isInteger(x) ? py.int(x) : py.float(x);
  if (Array.isArray(x)) return py.list(...x.map(pv));
  if (typeof x === "object") return py.dict(Object.entries(x).map(([k, v]) => [py.str(k), pv(v)]));
  throw new Error(`pv: can't turn ${typeof x} into a Python value`);
}

export type FnCaseOptions = {
  /** Keyword arguments, e.g. { rate: 0.1 }. */
  kwargs?: Record<string, unknown>;
  /** The call must not change any argument it was given (no mutation of the input). */
  unchanged?: boolean;
  /** For in-place functions: each positional argument's value after the call. */
  argsAfter?: unknown[];
};

const caseFrom = (args: unknown[], opts: FnCaseOptions = {}): PyFunctionCase => ({
  args: args.map(pv),
  ...(opts.kwargs ? { kwargs: Object.fromEntries(Object.entries(opts.kwargs).map(([k, v]) => [k, pv(v)])) } : {}),
  ...(opts.unchanged ? { unchanged: true } : {}),
  ...(opts.argsAfter ? { argsAfter: opts.argsAfter.map(pv) } : {}),
});

/** A public example: its call, expected result and the learner's result are shown when it fails. */
export function example(args: unknown[], expected: unknown, opts?: FnCaseOptions): PyFunctionCase {
  return { ...caseFrom(args, opts), expected: pv(expected) };
}

/**
 * A hidden test. `label` names the kind of input ("an empty list", "mixed-case duplicates") and is the only
 * thing the learner learns about it when it fails: never put the input or the answer in the label.
 */
export function hiddenCase(label: string, args: unknown[], expected: unknown, opts?: FnCaseOptions): PyFunctionCase {
  return { ...caseFrom(args, opts), expected: pv(expected), hidden: true, label };
}

/**
 * A "doesn't change its input" case: only the arguments after the call are judged, not the return value.
 * Put these in their own check (e.g. fn("keeps-input", name, [keepsInput([[1, 2]]), …])) so a wrong result fails
 * the value check and a mutated input fails this one. Hidden when `label` is given.
 */
export function keepsInput(args: unknown[], opts: { kwargs?: Record<string, unknown>; label?: string } = {}): PyFunctionCase {
  return { ...caseFrom(args, { kwargs: opts.kwargs, unchanged: true }), ignoreReturn: true, ...(opts.label ? { hidden: true, label: opts.label } : {}) };
}

/** The call must raise `exception` (the exact type name, e.g. "ValueError"). Hidden when `label` is given. */
export function raisesCase(args: unknown[], exception: string, opts: FnCaseOptions & { label?: string } = {}): PyFunctionCase {
  return { ...caseFrom(args, opts), raises: exception, ...(opts.label ? { hidden: true, label: opts.label } : {}) };
}

/**
 * A function check: calls `name` once per case, each with fresh argument objects, after the program has run.
 * `unchanged: true` requires every case to leave its arguments as they were. `compare` sets the comparison
 * policy (float tolerance, list order, int/float, string stripping).
 */
export function fn(
  id: string,
  name: string,
  cases: PyFunctionCase[],
  opts: { label?: string; tip?: string; compare?: ComparePolicy; unchanged?: boolean } = {},
): PyCheck {
  return {
    kind: "function",
    id,
    name,
    ...(opts.label ? { label: opts.label } : {}),
    ...(opts.tip ? { tip: opts.tip } : {}),
    ...(opts.compare ? { compare: opts.compare } : {}),
    cases: opts.unchanged ? cases.map((k) => ({ ...k, unchanged: true })) : cases,
  };
}

export type ExprOptions = { show?: string; hidden?: boolean; compare?: ComparePolicy; tip?: string; setup?: string };
const pyStr = (s: string) => JSON.stringify(s);
const withSetup = (setup: string | undefined, lines: string[]) => [...(setup ? [setup] : []), ...lines].join("\n");
const exprCheck = (id: string, label: string, expr: string, expected: PyValue, o: ExprOptions): PyCheck => ({
  kind: "expr",
  id,
  label,
  expr,
  expected,
  ...(o.show ? { show: o.show } : {}),
  ...(o.hidden ? { hidden: true } : {}),
  ...(o.compare ? { compare: o.compare } : {}),
  ...(o.tip ? { tip: o.tip } : {}),
});

/**
 * A pandas DataFrame's rows, compared as a list of {column: value} dicts (missing values as None).
 * `expr` is evaluated after the program, e.g. "clean(orders)" or "summary". Row order matters unless
 * `compare: { order: "any" }`; floats use the usual tolerance; numpy scalars arrive as plain Python values.
 */
export function frameRows(id: string, label: string, expr: string, rows: Record<string, unknown>[], o: ExprOptions = {}): PyCheck {
  return exprCheck(id, label, withSetup(o.setup, [`result = _records(${expr})`]), pv(rows), o);
}

/** A DataFrame's column names, in order. */
export function frameColumns(id: string, label: string, expr: string, columns: string[], o: ExprOptions = {}): PyCheck {
  return exprCheck(id, label, withSetup(o.setup, [`result = [str(_c) for _c in (${expr}).columns]`]), pv(columns), o);
}

/** The exact text of a file the program (or `setup`, e.g. a call to the learner's function) wrote. */
export function fileText(id: string, label: string, path: string, expected: string, o: ExprOptions = {}): PyCheck {
  return exprCheck(id, label, withSetup(o.setup, [`with open(${pyStr(path)}, encoding='utf-8', newline='') as _f:`, "    result = _f.read()"]), py.str(expected), o);
}

/** A CSV file's rows as lists of strings, read with csv.reader: quoting style and \n vs \r\n don't matter. */
export function csvRows(id: string, label: string, path: string, rows: string[][], o: ExprOptions = {}): PyCheck {
  return exprCheck(id, label, withSetup(o.setup, ["import csv as _csv", `with open(${pyStr(path)}, encoding='utf-8', newline='') as _f:`, "    result = list(_csv.reader(_f))"]), pv(rows), o);
}

/** A JSON file's parsed content: key order and whitespace don't matter. */
export function jsonFile(id: string, label: string, path: string, expected: unknown, o: ExprOptions = {}): PyCheck {
  return exprCheck(id, label, withSetup(o.setup, ["import json as _json", `with open(${pyStr(path)}, encoding='utf-8') as _f:`, "    result = _json.load(_f)"]), pv(expected), o);
}

/**
 * Grade the learner's own tests. Their test functions (top-level `test*`) and unittest.TestCase classes are run
 * once against `correct` and once against each defective implementation of `target`, swapped in under that name.
 * Checks: `${prefix}-correct` (every test passes on a correct implementation) and `${prefix}-${i + 1}` (at least
 * one test fails on defect i: an AssertionError or any other exception both count as failing).
 * Implementation sources are never shown to the learner; the defect `label` is.
 */
export function learnerTests(
  prefix: string,
  o: { target: string; correct: string; defects: { label: string; code: string }[]; tip?: string },
): PyCheck[] {
  const name = pyStr(o.target);
  const run = (impl: string) =>
    [
      "import unittest as _ut",
      "_suite = _ut.TestSuite()",
      "_owners = []",
      "for _k, _v in list(globals().items()):",
      "    if _k.startswith('test') and callable(_v) and not isinstance(_v, type) and hasattr(_v, '__globals__'):",
      "        _suite.addTest(_ut.FunctionTestCase(_v))",
      "        _owners.append(_v.__globals__)",
      "    elif isinstance(_v, type) and issubclass(_v, _ut.TestCase) and _v is not _ut.TestCase:",
      "        _suite.addTests(_ut.defaultTestLoader.loadTestsFromTestCase(_v))",
      "        _owners += [_m.__globals__ for _m in vars(_v).values() if hasattr(_m, '__globals__')]",
      "if _suite.countTestCases() == 0 or not _owners:",
      "    result = 'no tests'",
      "else:",
      "    _impl_ns = {'__name__': 'implementation'}",
      `    exec(compile(${pyStr(impl)}, 'implementation.py', 'exec'), _impl_ns)`,
      "    _g = _owners[0]",
      "    _missing = object()",
      `    _old = _g.get(${name}, _missing)`,
      `    _g[${name}] = _impl_ns[${name}]`,
      "    try:",
      "        _res = _ut.TestResult()",
      "        _suite.run(_res)",
      "        result = 'pass' if _res.wasSuccessful() else 'fail'",
      "    finally:",
      "        if _old is _missing:",
      `            del _g[${name}]`,
      "        else:",
      `            _g[${name}] = _old`,
    ].join("\n");
  const tip = o.tip ? { tip: o.tip } : {};
  return [
    { kind: "expr", id: `${prefix}-correct`, label: `Your tests pass for a correct ${o.target}()`, expr: run(o.correct), expected: py.str("pass"), ...tip },
    ...o.defects.map((d, i): PyCheck => ({ kind: "expr", id: `${prefix}-${i + 1}`, label: `Your tests catch ${d.label}`, expr: run(d.code), expected: py.str("fail"), ...tip })),
  ];
}

/**
 * A wall-clock budget for one call, e.g. timeBudget("fast", "Handles 20,000 items quickly", "dedupe(_big)", 0.5,
 * { setup: "_big = [str(i % 5000) for i in range(20000)]" }). Defensible only when the efficient and naive
 * solutions differ by 100x or more and the naive one still finishes well inside the run's 5 s limit (otherwise the
 * whole check times out instead of failing this one check). Timing in the browser varies by device.
 */
export function timeBudget(id: string, label: string, call: string, seconds: number, o: { setup?: string; tip?: string } = {}): PyCheck {
  const expr = withSetup(o.setup, ["import time as _time", "_t0 = _time.perf_counter()", call, `result = (_time.perf_counter() - _t0) <= ${seconds}`]);
  return { kind: "expr", id, label, expr, expected: py.bool(true), ...(o.tip ? { tip: o.tip } : {}) };
}
