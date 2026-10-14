import { runPython, type PyCallCase, type PyProbe, type PyProbeResult, type PyRunResult } from "./client";
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
  | { kind: "function"; id?: string; label?: string; tip?: string; name: string; compare?: ComparePolicy; cases: PyFunctionCase[] };

export type PyFunctionCase = {
  args: PyValue[];
  kwargs?: Record<string, PyValue>;
  expected: PyValue;
  /** Hidden cases are never shown: not their inputs, not their expected value. */
  hidden?: boolean;
};

export type PyTask = { checks: PyCheck[]; stdin?: string; timeoutMs?: number };

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
  | "fails-hidden-cases";

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
  const calls = task.checks
    .filter((c) => c.kind === "function")
    .map((c) => ({
      name: c.name,
      cases: c.cases.map((k) => ({
        args: k.args.map(toWire),
        ...(k.kwargs ? { kwargs: Object.fromEntries(Object.entries(k.kwargs).map(([n, v]) => [n, toWire(v)])) } : {}),
      })),
    }));
  return { vars: [...new Set(vars)], calls };
}

/** Check Answer: one fresh interpreter, then judgement on this side. */
export async function checkPython(task: PyTask, code: string): Promise<PyGradeReport> {
  const result = await runPython(code, { probe: probeFor(task), stdin: task.stdin, timeoutMs: task.timeoutMs });
  return gradePython(task, result);
}

// ---- judgement ----

const checkId = (c: PyCheck, i: number) => c.id ?? `${c.kind}-${i + 1}`;
const callText = (name: string, k: PyFunctionCase) =>
  `${name}(${[...k.args.map(formatPy), ...Object.entries(k.kwargs ?? {}).map(([n, v]) => `${n}=${formatPy(v)}`)].join(", ")})`;

/** "an int", "a str": the article that reads correctly before a Python type name. */
const aType = (v: PyValue) => `${/^[aeiou]/i.test(pyTypeName(v)) ? "an" : "a"} ${pyTypeName(v)}`;

function defaultLabel(c: PyCheck): string {
  if (c.label) return c.label;
  if (c.kind === "output") return "Prints the expected output";
  if (c.kind === "variable") return `${c.name} is ${formatPy(c.expected)}`;
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
    return `Line ${i + 1}: expected ${JSON.stringify(e[i])}, but your program printed ${JSON.stringify(a[i])}.`;
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
  const base: PyCaseOutcome = hidden
    ? { index, hidden, ok: false }
    : { index, hidden, ok: false, call: callText(name, k), expected: formatPy(k.expected) };
  const what = hidden ? "another input" : callText(name, k);
  if (!got) return { ...base, category: "not-run", detail: `${what} was not tested.` };
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
  if (pyEqual(actual, k.expected, policy)) return { ...base, ...shown, ok: true };
  if (actual.t === "none" && k.expected.t !== "none" && got.stdout) {
    return {
      ...base,
      ...shown,
      category: "returned-none-printed",
      detail: `${hidden ? "For another input, the function" : what} printed a value but returned None. Use return to give the result back.`,
    };
  }
  if (!sameKind(actual, k.expected, policy)) {
    return {
      ...base,
      ...shown,
      category: "wrong-type",
      detail: hidden
        ? `For another input, the function returned ${aType(actual)} instead of ${aType(k.expected)}.`
        : `${what} returned ${aType(actual)} (${formatPy(actual)}), but should return ${aType(k.expected)} (${formatPy(k.expected)}).`,
    };
  }
  return {
    ...base,
    ...shown,
    category: "wrong-value",
    detail: hidden ? "For another input, the function returned a different result." : `${what} returned ${formatPy(actual)}, but should return ${formatPy(k.expected)}.`,
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
  const checks = task.checks.map((c, i): PyCheckOutcome => {
    const base = { id: checkId(c, i), kind: c.kind, label: defaultLabel(c) };
    const judged = c.kind === "output" ? judgeOutput(c, r.stdout) : c.kind === "variable" ? judgeVariable(c, probe) : judgeFunction(c, probe);
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
