import type { PyCaseOutcome, PyCheck, PyCheckOutcome, PyGradeReport, PyTask } from "@/engine/python/grading";

/*
 * How a grade report is worded on screen. Presentation only: it never changes which checks passed, how many
 * passed, or report.ok. The grader (src/engine/python/grading.ts) judges; this file turns its generic text into
 * sentences about the task in front of the learner, using the check definitions the screen already has.
 */

/** One part of a result that bundles several values, e.g. one call out of `(is_open(...), is_open(...))`. */
export type ShownPart = { what: string; expected: string; actual: string; ok: boolean };

/** The first output line that differs, for a monospace side-by-side view. Null means "no line here". */
export type ShownDiff = { line: number; expected: string | null; actual: string | null };

export type ShownCheck = PyCheckOutcome & {
  /** Per-part results of a check whose value bundles several results. */
  parts?: ShownPart[];
  /** The lines that build the test data the parts were computed from. */
  setup?: string;
  /** Hide the hidden-test counter: the visible example still fails, so a count of hidden passes would mislead. */
  hideHiddenCount?: boolean;
  diff?: ShownDiff;
};

export type ShownReport = Omit<PyGradeReport, "checks"> & { checks: ShownCheck[]; note: string | null };

// ---- Python repr helpers (values arrive formatted by values.ts formatPy) ----

/** Splits the inside of a tuple/list repr at its top-level commas. Null when the text isn't a bracketed sequence. */
export function splitRepr(text: string): string[] | null {
  const t = text.trim();
  const close = t[0] === "(" ? ")" : t[0] === "[" ? "]" : null;
  if (!close || t.at(-1) !== close) return null;
  const inner = t.slice(1, -1);
  const out: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let start = 0;
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (quote) {
      if (ch === "\\") i++;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"') quote = ch;
    else if ("([{".includes(ch)) depth++;
    else if (")]}".includes(ch)) depth--;
    else if (ch === "," && depth === 0) {
      out.push(inner.slice(start, i).trim());
      start = i + 1;
    }
  }
  if (quote || depth !== 0) return null;
  const last = inner.slice(start).trim();
  if (last) out.push(last);
  return out;
}

/** The parts of `result = (a, b, c)` when that is the expression's last line, plus the lines before it. */
export function resultParts(expr: string): { parts: string[]; setup: string } | null {
  const lines = expr.replace(/\s+$/, "").split("\n");
  const last = lines.length - 1;
  if (last < 0 || !/^result\s*=/.test(lines[last])) return null;
  const parts = splitRepr(lines[last].replace(/^result\s*=\s*/, ""));
  if (!parts || parts.length < 2) return null;
  const setup = lines
    .slice(0, last)
    .filter((l) => !/^\s*(from\s+\S+\s+)?import\s/.test(l))
    .join("\n")
    .trim();
  return { parts, setup };
}

const isBool = (s: string | undefined) => s === "True" || s === "False";
/** Code that uses the check's own helper names (`_n`, `_counts`): not something to show the learner. */
const internal = (code: string) => /(^|[^\w.])_\w/.test(code);
/** Two reprs that show the same value, allowing for float rounding. */
function sameRepr(a: string, b: string): boolean {
  if (a === b) return true;
  const x = Number(a);
  const y = Number(b);
  return a.trim() !== "" && b.trim() !== "" && Number.isFinite(x) && Number.isFinite(y) && Math.abs(x - y) <= 1e-9 * Math.max(1, Math.abs(x), Math.abs(y));
}

// ---- error hints ----

/**
 * A plain next step for the TypeErrors that come from mixing text and numbers. `csv` says the program reads CSV
 * files, whose values are always text: the usual cause of these errors in projects.
 */
export function typeErrorHint(type: string | undefined, message: string | undefined, csv = false): string | null {
  if (type !== "TypeError" || !message) return null;
  const fromCsv = "Values read from a CSV file are text (str), even when they look like numbers.";
  if (/can't multiply sequence by non-int of type 'str'/.test(message)) {
    return csv ? `${fromCsv} Convert them with int() or float() before multiplying.` : "You can't multiply by text (str). Convert the text to a number with int() or float() first.";
  }
  if (/unsupported operand type\(s\) for [^:]+: (?:'(?:int|float)' and 'str'|'str' and '(?:int|float)')/.test(message)) {
    return csv
      ? `${fromCsv} Convert them with int() or float() before doing arithmetic.`
      : "One value is text (str) and the other is a number. Convert the text with int() or float(), or the number with str() if you meant to join text.";
  }
  if (/can only concatenate str \(not "(?:int|float)"\) to str/.test(message)) {
    return csv
      ? `${fromCsv} Convert them with int() or float() to do arithmetic, or convert the number with str() to join text.`
      : "To join text and a number, convert the number with str() or use an f-string.";
  }
  if (/not supported between instances of (?:'str' and '(?:int|float)'|'(?:int|float)' and 'str')/.test(message)) {
    return csv ? `${fromCsv} Convert them with int() or float() before comparing.` : "This compares text (str) with a number. Convert the text with int() or float() first.";
  }
  return null;
}

/** Whether the program reads CSV files (task fixtures, mounted data or the workbench's own tabs). */
export function readsCsv(task: Pick<PyTask, "files" | "mounts"> | undefined, names: string[] = []): boolean {
  const all = [...Object.keys(task?.files ?? {}), ...(task?.mounts ?? []).map((m) => m.path), ...names];
  return all.some((n) => /\.csv$/i.test(n));
}

const TYPE_ERROR = /raised TypeError: (.+?)(?: \(line \d+\))?\.(?:\s|$)/;

function withTypeHint(detail: string | undefined, csv: boolean): string | undefined {
  const m = detail?.match(TYPE_ERROR);
  const hint = m ? typeErrorHint("TypeError", m[1], csv) : null;
  return hint ? `${detail} ${hint}` : detail;
}

// ---- output diffs ----

export function firstDiff(expected: string, actual: string): ShownDiff | null {
  const e = expected.split("\n");
  const a = actual.split("\n");
  for (let i = 0; i < Math.max(a.length, e.length); i++) {
    if (a[i] === e[i]) continue;
    // A final "" is the newline after the last line, not a line of its own.
    const eLine = e[i] === undefined || (e[i] === "" && i === e.length - 1) ? null : e[i];
    const aLine = a[i] === undefined || (a[i] === "" && i === a.length - 1) ? null : a[i];
    if (eLine === null && aLine === null) return null;
    return { line: i + 1, expected: eLine, actual: aLine };
  }
  return null;
}

const lead = (s: string) => s.length - s.trimStart().length;

/** A whitespace-only difference, said without quoting text that a browser would collapse. Null for other differences. */
function spacingSentence(prefix: string, d: ShownDiff): string | null {
  if (d.expected === null || d.actual === null) return null;
  const words = (s: string) => s.trim().split(/\s+/).join(" ");
  const at = `${prefix}${prefix ? "line" : "Line"} ${d.line}`;
  if (d.expected.trimEnd() === d.actual.trimEnd()) return `${at} differs only in spaces at the end of the line. Each space is shown as · below.`;
  if (words(d.expected) !== words(d.actual)) return null;
  const le = lead(d.expected);
  const la = lead(d.actual);
  const start = le !== la ? ` It should start with ${le} space${le === 1 ? "" : "s"}; yours starts with ${la}.` : "";
  return `${at} has the right words, but the spaces differ.${start} Each space is shown as · below.`;
}

// ---- checks ----

/** Checks whose inputs the learner can see: what "the visible example" refers to. */
function visibleChecks(task: PyTask): number[] {
  const out: number[] = [];
  task.checks.forEach((c, i) => {
    if (c.kind === "expr" && (c.hidden || c.expected?.t === "bool")) return;
    if (c.kind === "variant" && c.hidden) return;
    if (c.kind === "uses-variables") return;
    if (c.kind === "function" && c.cases.every((k) => k.hidden)) return;
    out.push(i);
  });
  return out;
}

const HIDDEN_EXPR = "Works for the visible example, but gives a different result for another input.";

const listNames = (names: string[]) => (names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`);

function variantLabel(def: Extract<PyCheck, { kind: "variant" }>): string {
  const names = Object.keys(def.set);
  return names.length === 1 ? `Works when ${names[0]} holds a different value` : `Works when ${listNames(names)} hold different values`;
}

type Ctx = { visibleOk: boolean | null; visibleLabels: string[]; csv: boolean };

function presentCheck(c: PyCheckOutcome, def: PyCheck | undefined, ctx: Ctx): ShownCheck {
  const shown: ShownCheck = { ...c };
  // "Works with other input values" on a program that reads no input: name the values that are swapped.
  if (def?.kind === "variant" && def.hidden && !def.label) shown.label = variantLabel(def);
  if (c.status !== "fail") return shown;
  shown.detail = withTypeHint(shown.detail, ctx.csv);

  if (def?.kind === "variant" && def.hidden && shown.detail?.startsWith("With other input values")) {
    const keys = Object.keys(def.set);
    const names = listNames(keys);
    shown.detail = shown.detail
      .replace("With other input values", `With ${names} set to ${keys.length === 1 ? "a different value" : "different values"}`)
      .replace("calculated from the inputs", `calculated from ${names}`);
  }

  // A rule about the program's code (a True/False check): say the rule, not the boolean.
  if (def?.kind === "expr" && def.expected?.t === "bool" && !def.hidden && isBool(c.actual) && (c.category === "wrong-value" || c.category === "wrong-type")) {
    shown.detail = c.tip ?? (def.expected.v ? "Your program doesn't do this yet." : "Your program still does this. Change it so it doesn't.");
    delete shown.tip;
    delete shown.expected;
    delete shown.actual;
    return shown;
  }

  // A hidden expression check: only say "works for the visible example" when that is true.
  if (def?.kind === "expr" && def.hidden && c.detail === HIDDEN_EXPR) {
    const passes = ctx.visibleLabels.length === 1 ? `Passes “${ctx.visibleLabels[0]}”` : "Passes the checks you can see";
    shown.detail =
      ctx.visibleOk === true
        ? `${passes}, but gives a different result for this case. Its inputs stay hidden; the check's name says what it tries.`
        : ctx.visibleOk === null
          ? "Your code gives a different result for this case. Its inputs stay hidden; the check's name says what it tries."
          : "Your code also gives a different result for this case, whose inputs stay hidden. Fix the visible example first.";
    return shown;
  }

  // A result that bundles several values: say which part is wrong.
  if (def?.kind === "expr" && !def.hidden && def.expected?.t === "tuple" && c.expected && c.actual && (c.category === "wrong-value" || c.category === "wrong-type")) {
    const want = splitRepr(c.expected);
    const got = splitRepr(c.actual);
    if (want && got && want.length === got.length) {
      const authored = resultParts(def.expr);
      const named = !!authored && authored.parts.length === want.length && !authored.parts.some(internal) && !internal(authored.setup);
      const parts: ShownPart[] = want.map((w, i) => ({ what: named ? authored!.parts[i] : `part ${i + 1}`, expected: w, actual: got[i], ok: sameRepr(w, got[i]) }));
      const bad = parts.filter((p) => !p.ok);
      if (named) {
        // The check computes several values from its own data: show each one, and that data.
        delete shown.expected;
        delete shown.actual;
        shown.parts = parts;
        if (authored!.setup) shown.setup = authored!.setup;
        shown.detail = `This check works out ${parts.length} values from its own test data, shown below. ${bad.length === 1 ? "1 of them is" : `${bad.length} of them are`} different from what was expected.`;
        return shown;
      }
      // A True/False bundled in by the check itself (e.g. "within the limit"): name the requirement, not the boolean.
      const measured = (i: number) => !!authored && authored.parts.length === want.length && internal(authored.parts[i]) && isBool(parts[i].actual) && isBool(parts[i].expected);
      if (bad.length > 0 && parts.every((p, i) => p.ok || measured(i))) {
        delete shown.expected;
        delete shown.actual;
        const good = parts.some((p) => p.ok && !isBool(p.actual));
        shown.detail = `${good ? "Your result is right, but this" : "This"} requirement isn't met yet: ${c.label}.`;
        return shown;
      }
      // Otherwise the value is one result (e.g. a function that returns a pair): the grader's sentence says it well.
    }
  }

  // Output differences: show the differing line in monospace, and don't quote whitespace in prose.
  if (c.category === "wrong-output" && c.expected !== undefined && c.actual !== undefined) {
    const d = firstDiff(c.expected, c.actual);
    if (d) {
      shown.diff = d;
      const prefix = c.detail?.match(/^(With [^:]+: )line \d+/)?.[1] ?? "";
      const sentence = spacingSentence(prefix, d);
      if (sentence) shown.detail = sentence;
    }
  }

  if (def?.kind === "function" && c.cases?.some((k) => !k.hidden && !k.ok)) shown.hideHiddenCount = true;
  return shown;
}

/** The report as the learner reads it. `fileNames` are the workbench's tabs (to spot CSV data). */
export function presentReport(report: PyGradeReport, task?: PyTask, fileNames: string[] = []): ShownReport {
  const csv = readsCsv(task, fileNames);
  const defs = task?.checks ?? [];
  const visible = task ? visibleChecks(task) : [];
  const visibleOk = visible.length === 0 ? null : visible.every((i) => report.checks[i]?.status === "pass");
  const visibleLabels = visible.map((i) => report.checks[i]?.label).filter((l): l is string => !!l);
  let checks: ShownCheck[] = report.checks.map((c, i) => presentCheck(c, defs[i], { visibleOk, visibleLabels, csv }));

  // Two checks with the same label read like a duplicate: number the repeats.
  const seen = new Map<string, number>();
  checks = checks.map((c) => {
    const n = (seen.get(c.label) ?? 0) + 1;
    seen.set(c.label, n);
    return n > 1 ? { ...c, label: `${c.label} (test ${n})` } : c;
  });

  // The banner says what happened once; each check row carries its own detail, so the banner doesn't repeat it.
  let note: string | null = null;
  if (report.outcome === "runtime-error" && report.error) {
    const e = report.error;
    const file = [...(e.traceback ?? "").matchAll(/File "([^"<>]+)", line \d+/g)].at(-1)?.[1];
    const where = e.line ? ` on line ${e.line}${file && file !== "main.py" ? ` of ${file}` : ""}` : "";
    const type = e.type ?? "error";
    note = `Your program stopped with ${/^[AEIOU]/.test(type) ? "an" : "a"} ${type}${where}, so the checks didn't run.`;
  } else if (report.outcome === "syntax-error") {
    note = "Python couldn't read your code, so nothing ran and nothing was checked.";
  } else if (report.outcome !== "passed" && report.outcome !== "failed") {
    note = report.summary;
    // The interrupted check carries the same sentence; keep it once, in the banner.
    checks = checks.map((c) => (c.detail === report.summary ? { ...c, detail: undefined } : c));
  } else if (report.outcome === "failed" && report.total === 0) {
    note = report.summary;
  }
  return { ...report, checks, note };
}

/** Hidden cases of a check, for the counter. */
export const hiddenCases = (c: ShownCheck): PyCaseOutcome[] => c.cases?.filter((k) => k.hidden) ?? [];
