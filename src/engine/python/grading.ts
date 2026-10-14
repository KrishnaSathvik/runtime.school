import { runPython, type PyCallCase, type PyExprResult, type PyPackage, type PyProbe, type PyProbeResult, type PyRunResult, type PyVariantResult } from "./client";
import { formatPy, pyEqual, pyTypeName, sameKind, toWire, type ComparePolicy, type PyValue } from "./values";

/**
 * Python grading. Check Answer runs the learner's program once in a fresh interpreter, reads the
 * named variables and calls the required functions there, then judges the returned, type-tagged
 * values here. Expected values — including hidden cases — never enter the interpreter.
 *
 * Browser-side grading is learning feedback, not tamper-proof certification.
 */

export type PyCheck =
  | {
      kind: "output";
      id?: string;
      label?: string;
      tip?: string;
      /** The full expected stdout, including the newline print() adds. */
      expected: string;
      /** "exact" (default), or "trailing": ignore trailing spaces on each line and trailing blank lines. */
      whitespace?: "exact" | "trailing";
    }
  | { kind: "variable"; id?: string; label?: string; tip?: string; name: string; expected: PyValue; compare?: ComparePolicy }
  | { kind: "function"; id?: string; label?: string; tip?: string; name: string; compare?: ComparePolicy; cases: PyFunctionCase[] }
  /**
   * A narrow learning-objective check: the final top-level assignment to `name` (together with any
   * augmented assignments like `+=` that follow it) must use every variable in `uses`. Read from
   * Python's parsed syntax tree, so any expression that uses them counts; it is not a source comparison.
   * Use it only where calculating from variables is the point of the exercise.
   */
  | { kind: "uses-variables"; id?: string; label?: string; tip?: string; name: string; uses: string[] }
  /**
   * A Python expression (or a short snippet that sets `result`) evaluated after the program, in a copy of
   * its namespace: for values a variable check can't read directly (a DataFrame's rows, an array's shape,
   * an object's attribute, a file the program wrote). `_records(df)` gives a DataFrame's rows as dicts.
   * The expression is the author's; the expected value still never enters the interpreter.
   */
  | {
      kind: "expr";
      id?: string;
      /** Required: the expression itself is not shown to the learner unless `show` is given. */
      label: string;
      tip?: string;
      expr: string;
      /** What the learner sees as "what was checked", e.g. "summary(orders)". Omit to show nothing. */
      show?: string;
      expected?: PyValue;
      /** Instead of a value: the exception type this expression must raise, e.g. "ValueError". */
      raises?: string;
      compare?: ComparePolicy;
      hidden?: boolean;
    }
  /**
   * Run the program again with some top-level input assignments replaced (`price = 4` becomes
   * `price = 7`), and compare what it prints and the variables it ends with. This is how a program
   * without functions is tested on more than the values in its starter code.
   */
  | {
      kind: "variant";
      id?: string;
      label?: string;
      tip?: string;
      set: Record<string, PyValue>;
      output?: string;
      whitespace?: "exact" | "trailing";
      vars?: Record<string, PyValue>;
      compare?: ComparePolicy;
      hidden?: boolean;
    };

export type PyFunctionCase = {
  args: PyValue[];
  kwargs?: Record<string, PyValue>;
  /** The return value; omit when `raises` is given. */
  expected?: PyValue;
  /** The call must raise this exception type instead of returning. */
  raises?: string;
  /** Hidden cases are never shown: not their inputs, not their expected value. */
  hidden?: boolean;
};

export type PyTask = {
  checks: PyCheck[];
  stdin?: string;
  timeoutMs?: number;
  /** Libraries the program may import (pandas, matplotlib, …). */
  packages?: readonly PyPackage[];
  /** Text files placed next to main.py before every Run and Check (fixtures: CSV, JSON, helper modules). */
  files?: Record<string, string>;
};

export type PyFailure =
  | "syntax-error"
  | "runtime-error"
  | "timeout"
  | "output-limit"
  | "stopped"
  | "crashed"
  | "unavailable"
  | "superseded"
  | "not-run"
  | "wrong-output"
  | "missing-name"
  | "not-callable"
  | "wrong-type"
  | "wrong-value"
  | "call-error"
  | "returned-none-printed"
  | "fails-hidden-cases"
  | "not-calculated"
  | "wrong-exception"
  | "missing-input";

export type PyCaseOutcome = {
  index: number;
  hidden: boolean;
  ok: boolean;
  /** e.g. "calculate_total(12, 4)"; omitted for hidden cases. */
  call?: string;
  expected?: string;
  actual?: string;
  category?: PyFailure;
  detail?: string;
  line?: number | null;
};

export type PyCheckOutcome = {
  id: string;
  kind: PyCheck["kind"];
  label: string;
  status: "pass" | "fail" | "not-run";
  category?: PyFailure;
  detail?: string;
  expected?: string;
  actual?: string;
  line?: number | null;
  cases?: PyCaseOutcome[];
  /** The task author's teaching tip, present only when this check failed. Presentation only. */
  tip?: string;
};

export type PyGradeOutcome =
  | "passed"
  | "failed"
  | "syntax-error"
  | "runtime-error"
  | "timeout"
  | "output-limit"
  | "stopped"
  | "crashed"
  | "unavailable"
  | "superseded";

export type PyGradeReport = {
  /** True only when the program ran to completion and every check passed. */
  ok: boolean;
  outcome: PyGradeOutcome;
  summary: string;
  error?: {
    category: PyFailure;
    type?: string;
    message: string;
    line?: number | null;
    column?: number | null;
    text?: string;
    traceback?: string;
  };
  checks: PyCheckOutcome[];
  passed: number;
  total: number;
  stdout: string;
  stderr: string;
};

// ---- probe: what the interpreter is asked to report ----

export function probeFor(task: PyTask): PyProbe {
  const vars = task.checks.filter((c) => c.kind === "variable").map((c) => c.name);
  const assignments = task.checks.filter((c) => c.kind === "uses-variables").map((c) => c.name);
  const calls = task.checks
    .filter((c) => c.kind === "function")
    .map((c) => ({
      name: c.name,
      cases: c.cases.map((k) => ({
        args: k.args.map(toWire),
        ...(k.kwargs ? { kwargs: Object.fromEntries(Object.entries(k.kwargs).map(([n, v]) => [n, toWire(v)])) } : {}),
      })),
    }));
  const exprs = task.checks.filter((c) => c.kind === "expr").map((c) => ({ code: c.expr }));
  const variants = task.checks
    .filter((c) => c.kind === "variant")
    .map((c) => ({ set: Object.fromEntries(Object.entries(c.set).map(([n, v]) => [n, toWire(v)])), vars: Object.keys(c.vars ?? {}) }));
  return {
    vars: [...new Set(vars)],
    calls,
    ...(assignments.length ? { assignments: [...new Set(assignments)] } : {}),
    ...(exprs.length ? { exprs } : {}),
    ...(variants.length ? { variants } : {}),
  };
}

/** Check Answer: one fresh interpreter, then judgement on this side. */
export async function checkPython(task: PyTask, code: string): Promise<PyGradeReport> {
  const result = await runPython(code, { probe: probeFor(task), stdin: task.stdin, timeoutMs: task.timeoutMs, packages: task.packages, files: task.files });
  return gradePython(task, result);
}

// ---- judgement ----

const checkId = (c: PyCheck, i: number) => c.id ?? `${c.kind}-${i + 1}`;
const callText = (name: string, k: PyFunctionCase) =>
  `${name}(${[...k.args.map(formatPy), ...Object.entries(k.kwargs ?? {}).map(([n, v]) => `${n}=${formatPy(v)}`)].join(", ")})`;

const setText = (set: Record<string, PyValue>) => Object.entries(set).map(([n, v]) => `${n} = ${formatPy(v)}`).join(", ");

/** "an int", "a str": the article that reads correctly before a Python type name. */
const aType = (v: PyValue) => `${/^[aeiou]/i.test(pyTypeName(v)) ? "an" : "a"} ${pyTypeName(v)}`;

function defaultLabel(c: PyCheck): string {
  if (c.label) return c.label;
  if (c.kind === "output") return "Prints the expected output";
  if (c.kind === "variable") return `${c.name} is ${formatPy(c.expected)}`;
  if (c.kind === "uses-variables") return `${c.name} is calculated from ${c.uses.join(" and ")}`;
  if (c.kind === "expr") return c.label;
  if (c.kind === "variant") return c.hidden ? "Works with other input values" : `Works when ${setText(c.set)}`;
  return `${c.name}() returns the right result for every input`;
}

function editDistance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

function didYouMean(name: string, names: string[]): string | null {
  const close = names.find((n) => n !== name && (n.toLowerCase() === name.toLowerCase() || (name.length >= 4 && editDistance(n, name) <= 2)));
  return close ?? null;
}

function normalizeOutput(text: string, mode: "exact" | "trailing"): string {
  if (mode === "exact") return text;
  return text.split("\n").map((l) => l.replace(/[ \t\r]+$/, "")).join("\n").replace(/\n+$/, "");
}

function outputDiff(actual: string, expected: string): string {
  if (!actual) return "Your program didn't print anything.";
  const a = actual.split("\n");
  const e = expected.split("\n");
  for (let i = 0; i < Math.max(a.length, e.length); i++) {
    if (a[i] === e[i]) continue;
    if (a[i] !== undefined && e[i] !== undefined && a[i].trimEnd() === e[i].trimEnd()) {
      return `Line ${i + 1} differs only in trailing spaces.`;
    }
    if (e[i] === undefined || (e[i] === "" && i === e.length - 1)) return `Your program printed more lines than expected, starting at line ${i + 1}: ${JSON.stringify(a[i])}.`;
    if (a[i] === undefined || (a[i] === "" && i === a.length - 1)) return `Your program stopped printing before line ${i + 1}: expected ${JSON.stringify(e[i])}.`;
    const words = (s: string) => s.trim().split(/\s+/).join(" ");
    const spacing = words(a[i]) === words(e[i]) ? " The words match; only the spaces differ." : "";
    // An empty line reads as "", which beginners can't see; name it instead.
    const show = (line: string) => (line === "" ? "an empty line" : JSON.stringify(line));
    return `Line ${i + 1}: expected ${show(e[i])}, but your program printed ${show(a[i])}.${spacing}`;
  }
  return "The output differs from what was expected.";
}

function judgeOutput(c: Extract<PyCheck, { kind: "output" }>, stdout: string): Omit<PyCheckOutcome, "id" | "kind" | "label"> {
  const mode = c.whitespace ?? "exact";
  if (normalizeOutput(stdout, mode) === normalizeOutput(c.expected, mode)) return { status: "pass" };
  return { status: "fail", category: "wrong-output", detail: outputDiff(stdout, c.expected), expected: c.expected, actual: stdout };
}

function judgeVariable(c: Extract<PyCheck, { kind: "variable" }>, probe: PyProbeResult): Omit<PyCheckOutcome, "id" | "kind" | "label"> {
  const found = probe.vars[c.name];
  const expected = formatPy(c.expected);
  if (!found || "missing" in found) {
    const hint = didYouMean(c.name, probe.names);
    return {
      status: "fail",
      category: "missing-name",
      expected,
      detail: hint
        ? `There is no variable named ${c.name}. You defined ${hint}; Python names are case-sensitive and must match exactly.`
        : `There is no variable named ${c.name}. Create it with ${c.name} = …`,
    };
  }
  const actual = found.value;
  if (pyEqual(actual, c.expected, c.compare)) return { status: "pass", expected, actual: formatPy(actual) };
  if (!sameKind(actual, c.expected, c.compare)) {
    return {
      status: "fail",
      category: "wrong-type",
      expected,
      actual: formatPy(actual),
      detail: `${c.name} is ${aType(actual)} (${formatPy(actual)}), but this task needs ${aType(c.expected)} (${expected}).`,
    };
  }
  return { status: "fail", category: "wrong-value", expected, actual: formatPy(actual), detail: `${c.name} is ${formatPy(actual)}, but it should be ${expected}.` };
}

function judgeCase(name: string, k: PyFunctionCase, index: number, got: PyCallCase | undefined, policy?: ComparePolicy): PyCaseOutcome {
  const hidden = !!k.hidden;
  const wanted = k.raises ? `raises ${k.raises}` : formatPy(k.expected ?? { t: "none" });
  const base: PyCaseOutcome = hidden
    ? { index, hidden, ok: false }
    : { index, hidden, ok: false, call: callText(name, k), expected: wanted };
  const what = hidden ? "another input" : callText(name, k);
  if (!got) return { ...base, category: "not-run", detail: `${what} was not tested.` };
  if (k.raises) {
    if (!got.ok && got.error.type === k.raises) return { ...base, ...(hidden ? {} : { actual: `raises ${got.error.type}` }), ok: true };
    const gotText = got.ok ? `returned ${formatPy(got.value)}` : `raised ${got.error.type}${got.error.message ? `: ${got.error.message}` : ""}`;
    return {
      ...base,
      ...(hidden ? {} : { actual: got.ok ? formatPy(got.value) : `raises ${got.error.type}` }),
      category: "wrong-exception",
      line: got.ok ? null : got.error.line,
      detail: hidden
        ? `For another invalid input, the function should raise ${k.raises}, but it ${got.ok ? "returned a value" : `raised ${got.error.type}`}.`
        : `${what} should raise ${k.raises}, but it ${gotText}.`,
    };
  }
  const expectedValue = k.expected ?? ({ t: "none" } as PyValue);
  if (!got.ok) {
    const e = got.error;
    return {
      ...base,
      category: "call-error",
      line: e.line,
      detail: hidden
        ? `Raised ${e.type} for another input${e.line ? ` (line ${e.line})` : ""}.`
        : `${what} raised ${e.type}${e.message ? `: ${e.message}` : ""}${e.line ? ` (line ${e.line})` : ""}.`,
    };
  }
  const actual = got.value;
  const shown = hidden ? {} : { actual: formatPy(actual) };
  if (pyEqual(actual, expectedValue, policy)) return { ...base, ...shown, ok: true };
  if (actual.t === "none" && expectedValue.t !== "none" && got.stdout) {
    return {
      ...base,
      ...shown,
      category: "returned-none-printed",
      detail: `${hidden ? "For another input, the function" : what} printed a value but returned None. Use return to give the result back.`,
    };
  }
  if (!sameKind(actual, expectedValue, policy)) {
    return {
      ...base,
      ...shown,
      category: "wrong-type",
      detail: hidden
        ? `For another input, the function returned ${aType(actual)} instead of ${aType(expectedValue)}.`
        : `${what} returned ${aType(actual)} (${formatPy(actual)}), but should return ${aType(expectedValue)} (${formatPy(expectedValue)}).`,
    };
  }
  return {
    ...base,
    ...shown,
    category: "wrong-value",
    detail: hidden ? "For another input, the function returned a different result." : `${what} returned ${formatPy(actual)}, but should return ${formatPy(expectedValue)}.`,
  };
}

function judgeFunction(c: Extract<PyCheck, { kind: "function" }>, probe: PyProbeResult): Omit<PyCheckOutcome, "id" | "kind" | "label"> {
  const found = probe.calls[c.name];
  if (!found || "missing" in found) {
    const hint = didYouMean(c.name, probe.names);
    return {
      status: "fail",
      category: "missing-name",
      detail: hint
        ? `There is no function named ${c.name}. You defined ${hint}; the name must match exactly.`
        : `There is no function named ${c.name}. Define it with def ${c.name}(…):`,
    };
  }
  if ("notCallable" in found) {
    return { status: "fail", category: "not-callable", detail: `${c.name} is ${/^[aeiou]/i.test(found.type) ? "an" : "a"} ${found.type}, not a function. Define it with def ${c.name}(…):` };
  }
  const cases = c.cases.map((k, i) => judgeCase(c.name, k, i, found.cases[i], c.compare));
  if (cases.length > 0 && cases.every((k) => k.ok)) return { status: "pass", cases };
  const visibleFail = cases.find((k) => !k.ok && !k.hidden);
  if (visibleFail) return { status: "fail", category: visibleFail.category, detail: visibleFail.detail, line: visibleFail.line, cases };
  const hiddenFails = cases.filter((k) => !k.ok);
  const hiddenTotal = cases.filter((k) => k.hidden).length;
  const first = hiddenFails[0];
  return {
    status: "fail",
    category: "fails-hidden-cases",
    line: first?.line,
    detail:
      `Works for the examples, but not for ${hiddenFails.length} of ${hiddenTotal} other input${hiddenTotal === 1 ? "" : "s"}. ` +
      (first?.category === "call-error"
        ? first.detail
        : "Make sure the function calculates from its parameters instead of returning a fixed value."),
    cases,
  };
}

const listNames = (names: string[]) => names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;

function judgeUses(c: Extract<PyCheck, { kind: "uses-variables" }>, probe: PyProbeResult): Omit<PyCheckOutcome, "id" | "kind" | "label"> {
  const list = probe.assignments?.[c.name];
  if (!list) return { status: "fail", category: "not-run", detail: `How ${c.name} is calculated was not checked.` };
  if (list.length === 0) {
    return { status: "fail", category: "missing-name", detail: `There is no line that assigns ${c.name}. Create it with ${c.name} = …, using ${listNames(c.uses)}.` };
  }
  // The final value comes from the last plain assignment plus any += style updates after it.
  let i = list.length - 1;
  while (i > 0 && list[i].aug) i--;
  const used = new Set(list.slice(i).flatMap((a) => a.uses));
  const missing = c.uses.filter((u) => !used.has(u));
  if (missing.length === 0) return { status: "pass" };
  const line = list.at(-1)!.line;
  const none = c.uses.every((u) => !used.has(u));
  return {
    status: "fail",
    category: "not-calculated",
    line,
    detail: none
      ? `${c.name} is set to a fixed value on line ${line}. Calculate it from ${listNames(c.uses)} instead of typing the result, so the program still works if those values change.`
      : `${c.name} is calculated on line ${line} without using ${listNames(missing)}. Use the variable${missing.length === 1 ? "" : "s"} instead of typing ${missing.length === 1 ? "its value" : "their values"}.`,
  };
}

type Judged = Omit<PyCheckOutcome, "id" | "kind" | "label">;

function judgeExpr(c: Extract<PyCheck, { kind: "expr" }>, got: PyExprResult | undefined): Judged {
  const shownAs = !c.hidden && c.show ? `${c.show} ` : "";
  if (!got) return { status: "fail", category: "not-run", detail: "This check could not run." };
  if (c.raises) {
    if (!got.ok && got.error.type === c.raises) return { status: "pass" };
    if (c.hidden) return { status: "fail", category: "wrong-exception", detail: `For another invalid input, your code should raise ${c.raises}, but it ${got.ok ? "didn't raise an error" : `raised ${got.error.type}`}.` };
    return {
      status: "fail",
      category: "wrong-exception",
      expected: `raises ${c.raises}`,
      actual: got.ok ? formatPy(got.value) : `raises ${got.error.type}`,
      line: got.ok ? null : got.error.line,
      detail: `${shownAs || "This "}should raise ${c.raises}, but it ${got.ok ? `gave ${formatPy(got.value)}` : `raised ${got.error.type}${got.error.message ? `: ${got.error.message}` : ""}`}.`,
    };
  }
  const expectedValue = c.expected ?? ({ t: "none" } as PyValue);
  const expected = formatPy(expectedValue);
  if (!got.ok) {
    const e = got.error;
    return {
      status: "fail",
      category: "call-error",
      line: e.line,
      detail: c.hidden
        ? `With another input, your code raised ${e.type}${e.line ? ` (line ${e.line})` : ""}.`
        : `Checking ${shownAs}raised ${e.type}${e.message ? `: ${e.message}` : ""}${e.line ? ` (line ${e.line})` : ""}.`,
    };
  }
  const actual = formatPy(got.value);
  if (pyEqual(got.value, expectedValue, c.compare)) return c.hidden ? { status: "pass" } : { status: "pass", expected, actual };
  if (c.hidden) return { status: "fail", category: "fails-hidden-cases", detail: "Works for the visible example, but gives a different result for another input." };
  const typeNote = !sameKind(got.value, expectedValue, c.compare) ? ` That is ${aType(got.value)}; this needs ${aType(expectedValue)}.` : "";
  return { status: "fail", category: typeNote ? "wrong-type" : "wrong-value", expected, actual, detail: `${shownAs ? `${shownAs}gave` : "Got"} ${actual}, but expected ${expected}.${typeNote}` };
}

function judgeVariant(c: Extract<PyCheck, { kind: "variant" }>, got: PyVariantResult | undefined): Judged {
  const when = c.hidden ? "With other input values" : `With ${setText(c.set)}`;
  if (!got || got.status === "skipped") return { status: "fail", category: "not-run", detail: "Your program could not be re-run with other values." };
  if (got.status === "missing") {
    const names = listNames(got.missing);
    return {
      status: "fail",
      category: "missing-input",
      detail: `Keep the input line${got.missing.length === 1 ? "" : "s"} ${got.missing.map((n) => `${n} = …`).join(", ")} at the top of your program: Check replaces ${names} with other values to test it, and couldn't find ${got.missing.length === 1 ? "that line" : "those lines"}.`,
    };
  }
  if (got.status === "error") {
    const e = got.error;
    return { status: "fail", category: "runtime-error", line: e.line, detail: `${when}, your program stopped with ${e.type}${e.message ? `: ${e.message}` : ""}${e.line ? ` (line ${e.line})` : ""}.` };
  }
  if (c.output !== undefined) {
    const mode = c.whitespace ?? "exact";
    if (normalizeOutput(got.stdout, mode) !== normalizeOutput(c.output, mode)) {
      return c.hidden
        ? { status: "fail", category: "fails-hidden-cases", detail: `${when}, your program printed something different from what was expected. Make sure every printed value is calculated from the inputs.` }
        : { status: "fail", category: "wrong-output", expected: c.output, actual: got.stdout, detail: `${when}: ${outputDiff(got.stdout, c.output).replace(/^Line/, "line")}` };
    }
  }
  for (const [name, want] of Object.entries(c.vars ?? {})) {
    const v = got.vars[name];
    if (!v || "missing" in v) return { status: "fail", category: "missing-name", detail: `${when}, your program didn't create ${name}.` };
    if (!pyEqual(v.value, want, c.compare)) {
      return c.hidden
        ? { status: "fail", category: "fails-hidden-cases", detail: `${when}, ${name} came out wrong. Make sure it is calculated from the inputs, not typed in.` }
        : { status: "fail", category: "wrong-value", expected: formatPy(want), actual: formatPy(v.value), detail: `${when}, ${name} is ${formatPy(v.value)}, but it should be ${formatPy(want)}.` };
    }
  }
  return { status: "pass" };
}

function caseLabel(task: PyTask, ref: { call: string; index: number } | undefined): { checkIndex: number; text: string } | null {
  if (!ref) return null;
  const checkIndex = task.checks.findIndex((c) => c.kind === "function" && c.name === ref.call);
  const check = task.checks[checkIndex];
  if (!check || check.kind !== "function") return null;
  const k = check.cases[ref.index];
  if (!k) return null;
  return { checkIndex, text: k.hidden ? `${ref.call} with another input` : callText(ref.call, k) };
}

function interrupted(task: PyTask, r: Extract<PyRunResult, { status: "timeout" | "output-limit" | "stopped" | "crashed" }>, total: number): PyGradeReport {
  const ref = "case" in r ? caseLabel(task, r.case) : null;
  const during = ref ? ` while running ${ref.text}` : "";
  const category: PyFailure = r.status;
  const message =
    r.status === "timeout"
      ? `Your code didn't finish within ${Math.round(r.limitMs / 1000)} seconds${during}. Look for a loop that never ends.`
      : r.status === "output-limit"
        ? `Your code printed more than ${r.limit.toLocaleString("en-US")} characters${during}, so it was stopped. Look for a print inside a loop that never ends.`
        : r.status === "stopped"
          ? `The check was stopped before it finished${during}. Nothing was graded.`
          : `Python stopped unexpectedly: ${r.message} Check your answer again.`;
  const checks = task.checks.map((c, i): PyCheckOutcome => {
    const base = { id: checkId(c, i), kind: c.kind, label: defaultLabel(c) };
    return ref && ref.checkIndex === i
      ? { ...base, status: "fail", category, detail: message }
      : { ...base, status: "not-run", category: "not-run" };
  });
  return { ok: false, outcome: r.status, summary: message, error: { category, message }, checks, passed: 0, total, stdout: r.stdout, stderr: r.stderr };
}

/** Pure: judges one run result against the task. Never returns ok unless every check passed. */
export function gradePython(task: PyTask, r: PyRunResult): PyGradeReport {
  const total = task.checks.length;
  const notRun = (): PyCheckOutcome[] =>
    task.checks.map((c, i) => ({ id: checkId(c, i), kind: c.kind, label: defaultLabel(c), status: "not-run", category: "not-run" }));
  const empty = { stdout: "", stderr: "" };

  if (r.status === "superseded") return { ok: false, outcome: "superseded", summary: "A newer check replaced this one.", checks: notRun(), passed: 0, total, ...empty };
  if (r.status === "unavailable") return { ok: false, outcome: "unavailable", summary: r.message, error: { category: "unavailable", message: r.message }, checks: notRun(), passed: 0, total, ...empty };
  if (r.status === "timeout" || r.status === "output-limit" || r.status === "stopped" || r.status === "crashed") return interrupted(task, r, total);

  const io = { stdout: r.stdout, stderr: r.stderr };
  if (r.status === "syntax-error") {
    const e = r.error;
    const where = e.line ? ` on line ${e.line}` : "";
    return {
      ok: false,
      outcome: "syntax-error",
      summary: `${e.type}${where}: ${e.message}. Python couldn't read your code, so nothing ran.`,
      error: { category: "syntax-error", type: e.type, message: e.message, line: e.line, column: e.column, text: e.text },
      checks: notRun(),
      passed: 0,
      total,
      ...io,
    };
  }
  if (r.status === "runtime-error") {
    const e = r.error;
    const where = e.line ? ` on line ${e.line}` : "";
    return {
      ok: false,
      outcome: "runtime-error",
      summary: `${e.type}${where}${e.message ? `: ${e.message}` : ""}. Your program stopped there, so the checks didn't run.`,
      error: { category: "runtime-error", type: e.type, message: e.message, line: e.line, traceback: e.traceback },
      checks: notRun(),
      passed: 0,
      total,
      ...io,
    };
  }

  // status "ok": the program finished. Judge every check from this run only.
  const probe: PyProbeResult = r.probe ?? { names: [], vars: {}, calls: {} };
  let exprIndex = 0;
  let variantIndex = 0;
  const checks = task.checks.map((c, i): PyCheckOutcome => {
    const base = { id: checkId(c, i), kind: c.kind, label: defaultLabel(c) };
    const judged =
      c.kind === "output" ? judgeOutput(c, r.stdout)
      : c.kind === "variable" ? judgeVariable(c, probe)
      : c.kind === "uses-variables" ? judgeUses(c, probe)
      : c.kind === "expr" ? judgeExpr(c, probe.exprs?.[exprIndex++])
      : c.kind === "variant" ? judgeVariant(c, probe.variants?.[variantIndex++])
      : judgeFunction(c, probe);
    return { ...base, ...judged, ...(judged.status === "fail" && c.tip ? { tip: c.tip } : {}) };
  });
  const passed = checks.filter((c) => c.status === "pass").length;
  const ok = total > 0 && passed === total;
  const firstFail = checks.find((c) => c.status !== "pass");
  return {
    ok,
    outcome: ok ? "passed" : "failed",
    summary: total === 0
      ? "This task has no checks, so it can't be marked correct."
      : ok
        ? `All ${total} check${total === 1 ? "" : "s"} passed.`
        : `${passed} of ${total} checks passed. ${firstFail?.detail ?? ""}`.trim(),
    checks,
    passed,
    total,
    ...io,
  };
}
