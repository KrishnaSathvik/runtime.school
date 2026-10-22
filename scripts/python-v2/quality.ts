/**
 * Static content-quality analysis for the authored Python course (rebuild brief §10).
 *
 * Pure text analysis: nothing here runs Python. tests/python-v2-quality.test.ts runs it against
 * authoredLessons/authoredQuestions and compares the findings with scripts/python-v2/quality-baseline.json.
 *
 * Every finding has a stable `key` (rule + item + where), so a baseline can list known violations and the
 * test fails only on new ones. Keys never include line numbers or similarity scores.
 *
 * These checks are necessary, not sufficient: they find copies, fakes and bad habits by pattern. Whether a
 * challenge is a meaningful problem, or an explanation is accurate, still needs a person.
 */
import type { PyExercise, PyLesson, PyQuestion } from "@/content/python-v2/model";
import type { PyCheck } from "@/engine/python/grading";
import type { PyValue } from "@/engine/python/values";

export type Severity = "error" | "warn";
export type Group = "duplicate" | "fake" | "weak" | "format" | "tests" | "habit" | "prose";

export type Finding = {
  rule: string;
  group: Group;
  severity: Severity;
  module: string;
  /** Lesson, exercise (PY-L12-03/c1), question (PY-Q12-06) or module (M12) ID. */
  item: string;
  /** Stable discriminator: which block/field, or which item it duplicates. */
  where: string;
  detail: string;
  key: string;
};

export type RuleInfo = { group: Group; severity: Severity; what: string };

export const RULES: Record<string, RuleInfo> = {
  // 1. duplicates
  "dup-challenge-example": { group: "duplicate", severity: "error", what: "A lesson challenge's answer is the same program as an example or the try-it in that lesson, up to names and constants." },
  "dup-challenge-pair": { group: "duplicate", severity: "error", what: "Challenge 2 is the same program as challenge 1, up to names and constants." },
  "dup-example-pair": { group: "duplicate", severity: "warn", what: "Example B is the same program as example A with constants swapped (brief §1: B must be meaningfully different)." },
  "dup-practice-lesson-code": { group: "duplicate", severity: "error", what: "A practice answer/program is the same program as a lesson example, try-it or challenge, up to names and constants." },
  "dup-practice-lesson-prompt": { group: "duplicate", severity: "error", what: "A practice prompt matches a lesson challenge or try-it prompt." },
  "dup-practice-practice": { group: "duplicate", severity: "error", what: "Two practice questions are the same program (or the same prompt), up to names and constants." },
  // 2. fakes
  "fake-except-literal": { group: "fake", severity: "error", what: "An except branch for an unsupported-operation error assigns a hardcoded result that the program then uses." },
  "fake-code-string": { group: "fake", severity: "error", what: "A string literal holds code (e.g. \"breakpoint()\") instead of running it." },
  "fake-prose-runner": { group: "fake", severity: "error", what: "Prose says the runner cannot do the thing being taught (\"This runner cannot …\")." },
  "fake-prose-recorded": { group: "fake", severity: "warn", what: "Prose talks about a \"recorded\" result. Fine only for a clearly labelled, validated simulation." },
  "fake-no-computation": { group: "weak", severity: "error", what: "The reference answer computes nothing: only literals, assignments of literals and print." },
  "fake-literal-check": { group: "weak", severity: "error", what: "Every check compares text the answer already contains verbatim as a literal, and nothing is hidden or varied." },
  // 3. format mix
  "format-supporting-majority": { group: "format", severity: "warn", what: "More than half of the module's practice is output_prediction + code_completion." },
  "format-no-function": { group: "format", severity: "warn", what: "The module (M09 on, once def is taught) has no function_implementation question." },
  // 4. tests
  "tests-function-public": { group: "tests", severity: "error", what: "function_implementation question with fewer than 3 public cases." },
  "tests-function-hidden": { group: "tests", severity: "error", what: "function_implementation question with fewer than 3 hidden cases / hidden checks." },
  "tests-few-wrongs": { group: "tests", severity: "error", what: "Code question with fewer than 2 known-wrong programs." },
  "tests-no-hidden": { group: "tests", severity: "warn", what: "Code question past M04 with no hidden check of any kind (hidden case, hidden expr, hidden variant)." },
  // 5. habits
  "habit-bare-except": { group: "habit", severity: "error", what: "Bare `except:`." },
  "habit-eq-bool": { group: "habit", severity: "error", what: "Comparison with `== True` / `== False`." },
  "habit-lambda-assign": { group: "habit", severity: "error", what: "`name = lambda …` (use def)." },
  "habit-private-api": { group: "habit", severity: "error", what: "Private interpreter API such as `sys._is_gil_enabled`." },
  "habit-star-import": { group: "habit", severity: "error", what: "`from x import *`." },
  "habit-mutable-default": { group: "habit", severity: "error", what: "Mutable default argument (`def f(x=[])`)." },
  "habit-open-without-with": { group: "habit", severity: "error", what: "`open(` outside a `with` statement, in a lesson that is not teaching close()." },
  "prose-args-list": { group: "habit", severity: "error", what: "Prose describes *args as a list (it is a tuple)." },
  "prose-numpy-int": { group: "habit", severity: "error", what: "Prose states a NumPy default integer dtype without saying it is platform-dependent." },
  // 6. prose
  "prose-topic-missing": { group: "prose", severity: "warn", what: "The lesson/module title promises an API or topic its code never uses." },
  "prose-data-monotony": { group: "prose", severity: "warn", what: "More than 30% of the module's programs are built on MUG/HAT/CUP placeholder data." },
};

// ---------------------------------------------------------------- helpers

export const moduleOf = (id: string) => `M${id.match(/^PY-[LQ](\d\d)/)![1]}`;
const moduleNo = (m: string) => Number(m.slice(1));

/** Python source → tokens. Strings and comments are kept as single tokens so callers can drop or inspect them. */
const TOKEN_RE =
  /[rRbBuUfF]{0,2}(?:"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')|#[^\n]*|\d[\d_]*(?:\.\d*)?(?:[eE][-+]?\d+)?j?|\.\d+(?:[eE][-+]?\d+)?|[A-Za-z_]\w*|\*\*=?|\/\/=?|->|:=|[=!<>]=|<<=?|>>=?|[-+*\/%&|^@]=|\.\.\.|\S/g;

export type Tok = { kind: "str" | "num" | "name" | "op" | "comment"; text: string };

export function tokenize(code: string): Tok[] {
  const out: Tok[] = [];
  for (const m of code.matchAll(TOKEN_RE)) {
    const t = m[0];
    if (t.startsWith("#")) out.push({ kind: "comment", text: t });
    else if (/^[rRbBuUfF]{0,2}["']/.test(t)) out.push({ kind: "str", text: t });
    else if (/^\.?\d/.test(t)) out.push({ kind: "num", text: t });
    else if (/^[A-Za-z_]/.test(t)) out.push({ kind: "name", text: t });
    else out.push({ kind: "op", text: t });
  }
  return out;
}

/** The value inside a string token (prefix and quotes removed; escapes left as written). */
export function strValue(tok: string): string {
  const body = tok.replace(/^[rRbBuUfF]{0,2}/, "");
  const q = body.startsWith('"""') || body.startsWith("'''") ? 3 : 1;
  return body.slice(q, body.length - q);
}

const KEYWORDS = new Set(
  "False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield match case".split(" "),
);
const BUILTINS = new Set(
  "print len range int float str bool list dict set tuple frozenset sum min max sorted reversed enumerate zip map filter any all abs round input open isinstance type repr iter next super object property staticmethod classmethod getattr setattr hasattr callable id hash divmod pow chr ord format vars dir globals locals exec eval compile Exception ValueError TypeError KeyError IndexError ZeroDivisionError RuntimeError OSError FileNotFoundError ImportError ModuleNotFoundError StopIteration AttributeError NotImplementedError self cls".split(
    " ",
  ),
);

/**
 * Normalised token stream: strings → S, numbers → N, comments dropped, keywords/builtins/attributes/imported
 * names kept, every other name renamed by first appearance (v0, v1, …). Two programs that differ only in
 * constants and variable names normalise to the same stream.
 */
export function normalizeCode(code: string): string[] {
  const toks = tokenize(code).filter((t) => t.kind !== "comment");
  const imported = new Set<string>();
  for (const line of code.split("\n")) {
    const from = line.match(/^\s*from\s+([\w.]+)\s+import\s+\(?([^#)]*)/);
    const imp = line.match(/^\s*import\s+([^#]*)/);
    const parts = from ? [from[1], ...from[2].split(",")] : imp ? imp[1].split(",") : [];
    for (const part of parts) for (const n of part.split(/\s+as\s+|\.|\s+/)) if (/^[A-Za-z_]\w*$/.test(n)) imported.add(n);
  }
  const names = new Map<string, string>();
  const out: string[] = [];
  toks.forEach((t, i) => {
    if (t.kind === "str") out.push("S");
    else if (t.kind === "num") out.push("N");
    else if (t.kind === "op") out.push(t.text);
    else if (KEYWORDS.has(t.text) || BUILTINS.has(t.text) || imported.has(t.text) || toks[i - 1]?.text === ".") out.push(t.text);
    else {
      if (!names.has(t.text)) names.set(t.text, `v${names.size}`);
      out.push(names.get(t.text)!);
    }
  });
  return out;
}

/** Prose → word tokens: lowercase, code spans and quoted text → S, numbers → N. */
export function normalizeProse(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/`[^`]*`/g, " s ")
    .replace(/"[^"]*"|'[^'\s][^']*'/g, " s ")
    .replace(/\d+(\.\d+)?/g, " n ")
    .split(/[^a-z_]+/)
    .filter(Boolean);
}

function shingles(tokens: string[], k: number): Set<string> {
  const s = new Set<string>();
  if (tokens.length <= k) s.add(tokens.join(" "));
  for (let i = 0; i + k <= tokens.length; i++) s.add(tokens.slice(i, i + k).join(" "));
  return s;
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size && !b.size) return 1;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

/** Thresholds. A program must have at least MIN_CODE_TOKENS normalised tokens to be compared at all. */
export const THRESHOLDS = { code: 0.8, prose: 0.7, minCodeTokens: 12, minProseWords: 6, monotony: 0.3, codeShingle: 4, proseShingle: 2 };

type Fp = { tokens: string[]; set: Set<string> };
const codeFp = (code: string): Fp => {
  const tokens = normalizeCode(code);
  return { tokens, set: shingles(tokens, THRESHOLDS.codeShingle) };
};
const proseFp = (text: string): Fp => {
  const tokens = normalizeProse(text);
  return { tokens, set: shingles(tokens, THRESHOLDS.proseShingle) };
};
const sameCode = (a: Fp, b: Fp) =>
  Math.min(a.tokens.length, b.tokens.length) >= THRESHOLDS.minCodeTokens && (a.tokens.join(" ") === b.tokens.join(" ") || jaccard(a.set, b.set) >= THRESHOLDS.code);
const sameProse = (a: Fp, b: Fp) =>
  Math.min(a.tokens.length, b.tokens.length) >= THRESHOLDS.minProseWords && (a.tokens.join(" ") === b.tokens.join(" ") || jaccard(a.set, b.set) >= THRESHOLDS.prose);
const score = (a: Fp, b: Fp) => (a.tokens.join(" ") === b.tokens.join(" ") ? 1 : jaccard(a.set, b.set));

// ---------------------------------------------------------------- collection

/** Lessons whose job is to teach open()/close() by hand: open( outside with is allowed there. */
// PY-L37-04 keeps many output files open in a dictionary (closed in finally) and wraps open() to count calls.
export const OPEN_ALLOWED_LESSONS = new Set(["PY-L19-01", "PY-L19-02", "PY-L37-04"]);
/** Lessons that show a mutable default on purpose (to teach the pitfall). */
export const MUTABLE_DEFAULT_ALLOWED_LESSONS = new Set<string>(["PY-L36-01"]);

type CodeRef = { item: string; module: string; where: string; code: string; lessonId?: string; role: "example" | "starter" | "answer" | "alternative" | "program" | "concept" };
type ProseRef = { item: string; module: string; where: string; text: string };

const exItem = (l: PyLesson, e: PyExercise) => `${l.id}/${e.id}`;

function lessonCode(l: PyLesson): CodeRef[] {
  const mod = moduleOf(l.id);
  const out: CodeRef[] = [];
  for (const b of l.blocks) if (b.kind === "example") out.push({ item: l.id, module: mod, where: `example:${b.title}`, code: b.code, lessonId: l.id, role: "example" });
  for (const e of [l.tryIt, ...l.challenges]) {
    out.push({ item: exItem(l, e), module: mod, where: "starter", code: e.starter, lessonId: l.id, role: "starter" });
    out.push({ item: exItem(l, e), module: mod, where: "answer", code: e.answer, lessonId: l.id, role: "answer" });
    (e.alternatives ?? []).forEach((a, i) => out.push({ item: exItem(l, e), module: mod, where: `alternative${i + 1}`, code: a, lessonId: l.id, role: "alternative" }));
  }
  for (const q of l.concept) if (q.program) out.push({ item: l.id, module: mod, where: `concept:${q.id}`, code: q.program, lessonId: l.id, role: "concept" });
  return out;
}

function questionCode(q: PyQuestion): CodeRef[] {
  const mod = moduleOf(q.id);
  const out: CodeRef[] = [];
  if (q.predict) out.push({ item: q.id, module: mod, where: "program", code: q.predict.program, role: "program" });
  if (q.code) {
    // A debugging starter is broken on purpose; it is not judged for habits.
    if (q.format !== "debugging" && q.format !== "refactoring") out.push({ item: q.id, module: mod, where: "starter", code: q.code.starter, role: "starter" });
    out.push({ item: q.id, module: mod, where: "answer", code: q.code.answer, role: "answer" });
    (q.code.alternatives ?? []).forEach((a, i) => out.push({ item: q.id, module: mod, where: `alternative${i + 1}`, code: a, role: "alternative" }));
  }
  return out;
}

function lessonProse(l: PyLesson): ProseRef[] {
  const mod = moduleOf(l.id);
  const out: ProseRef[] = [
    { item: l.id, module: mod, where: "title", text: l.title },
    { item: l.id, module: mod, where: "lede", text: l.lede },
    { item: l.id, module: mod, where: "focus", text: l.focus },
  ];
  l.objectives.forEach((t, i) => out.push({ item: l.id, module: mod, where: `objective${i + 1}`, text: t }));
  l.blocks.forEach((b, i) => {
    if (b.kind === "text") out.push({ item: l.id, module: mod, where: `text${i + 1}`, text: b.md });
    else {
      out.push({ item: l.id, module: mod, where: `title:${b.title}`, text: b.title });
      if (b.note) out.push({ item: l.id, module: mod, where: `note:${b.title}`, text: b.note });
    }
  });
  for (const e of [l.tryIt, ...l.challenges]) {
    out.push({ item: exItem(l, e), module: mod, where: "prompt", text: e.prompt });
    e.spec.forEach(([k, v]) => out.push({ item: exItem(l, e), module: mod, where: `spec:${k}`, text: v }));
    e.hints.forEach((h, i) => out.push({ item: exItem(l, e), module: mod, where: `hint${i + 1}`, text: h }));
  }
  for (const q of l.concept) {
    out.push({ item: l.id, module: mod, where: `concept:${q.id}`, text: q.prompt });
    out.push({ item: l.id, module: mod, where: `concept-why:${q.id}`, text: q.why });
  }
  l.review.forEach((t, i) => out.push({ item: l.id, module: mod, where: `review${i + 1}`, text: t }));
  return out;
}

function questionProse(q: PyQuestion): ProseRef[] {
  const mod = moduleOf(q.id);
  const out: ProseRef[] = [
    { item: q.id, module: mod, where: "title", text: q.title },
    { item: q.id, module: mod, where: "prompt", text: q.prompt },
    { item: q.id, module: mod, where: "explanation", text: q.explanation },
  ];
  q.spec.forEach(([k, v]) => out.push({ item: q.id, module: mod, where: `spec:${k}`, text: v }));
  q.hints.forEach((h, i) => out.push({ item: q.id, module: mod, where: `hint${i + 1}`, text: h }));
  return out;
}

// ---------------------------------------------------------------- rules: duplicates

function duplicates(lessons: PyLesson[], questions: PyQuestion[], add: Add) {
  type Src = { id: string; module: string; fp: Fp; label: string };
  const lessonSrcs: Src[] = [];
  const lessonPrompts: Src[] = [];
  for (const l of lessons) {
    const mod = moduleOf(l.id);
    const examples = l.blocks.flatMap((b) => (b.kind === "example" && !b.preview ? [{ title: b.title, fp: codeFp(b.code) }] : []));
    const tryFp = codeFp(l.tryIt.answer);
    const [c1, c2] = l.challenges.map((c) => ({ c, fp: codeFp(c.answer) }));
    for (const { c, fp } of [c1, c2]) {
      const hits = [...examples.map((e) => ({ where: `example:${e.title}`, fp: e.fp })), { where: `tryIt:${l.tryIt.id}`, fp: tryFp }].filter((x) => sameCode(fp, x.fp));
      if (hits.length) add("dup-challenge-example", mod, exItem(l, c), "answer", `matches ${hits.map((h) => `${h.where} (${score(fp, h.fp).toFixed(2)})`).join(", ")}`);
    }
    if (sameCode(c1.fp, c2.fp)) add("dup-challenge-pair", mod, exItem(l, c2.c), "answer", `c2 matches c1 (${score(c1.fp, c2.fp).toFixed(2)})`);
    for (let i = 1; i < examples.length; i++) {
      const prev = examples.slice(0, i).find((e) => sameCode(e.fp, examples[i].fp));
      if (prev) add("dup-example-pair", mod, l.id, `example:${examples[i].title}`, `same program as "${prev.title}" (${score(prev.fp, examples[i].fp).toFixed(2)})`);
    }
    for (const e of examples) lessonSrcs.push({ id: l.id, module: mod, fp: e.fp, label: `${l.id} example "${e.title}"` });
    for (const x of [l.tryIt, ...l.challenges]) {
      lessonSrcs.push({ id: exItem(l, x), module: mod, fp: codeFp(x.answer), label: `${exItem(l, x)} answer` });
      lessonPrompts.push({ id: exItem(l, x), module: mod, fp: proseFp(x.prompt), label: `${exItem(l, x)} prompt` });
    }
  }

  // Prompts shared by 3+ items ("Type exactly what this program prints.") are boilerplate, not copies.
  const promptUses = new Map<string, number>();
  for (const t of [...questions.map((q) => q.prompt), ...lessons.flatMap((l) => [l.tryIt, ...l.challenges].map((e) => e.prompt))]) {
    const k = normalizeProse(t).join(" ");
    promptUses.set(k, (promptUses.get(k) ?? 0) + 1);
  }
  const boilerplate = (fp: Fp) => (promptUses.get(fp.tokens.join(" ")) ?? 0) >= 3;
  const seenCode: Src[] = [];
  const seenPrompt: Src[] = [];
  for (const q of questions) {
    const mod = moduleOf(q.id);
    const code = q.code?.answer ?? q.predict?.program ?? "";
    const fp = codeFp(code);
    const pfp = proseFp(q.prompt);
    const ownPrompt = !q.predict && !boilerplate(pfp);
    // Lessons up to and including the question's module: practice may not copy what the learner just saw.
    const lessonHit = lessonSrcs.find((s) => moduleNo(s.module) <= moduleNo(mod) && moduleNo(s.module) >= moduleNo(mod) - 1 && sameCode(fp, s.fp));
    if (lessonHit) add("dup-practice-lesson-code", mod, q.id, "answer", `answer matches ${lessonHit.label} (${score(fp, lessonHit.fp).toFixed(2)})`);
    const promptHit = ownPrompt ? lessonPrompts.find((s) => moduleNo(s.module) <= moduleNo(mod) && !boilerplate(s.fp) && sameProse(pfp, s.fp)) : undefined;
    if (promptHit) add("dup-practice-lesson-prompt", mod, q.id, "prompt", `prompt matches ${promptHit.label} (${score(pfp, promptHit.fp).toFixed(2)})`);
    const codeHit = seenCode.find((s) => sameCode(fp, s.fp));
    const qHit = codeHit ?? (ownPrompt ? seenPrompt.find((s) => sameProse(pfp, s.fp)) : undefined);
    if (qHit) add("dup-practice-practice", mod, q.id, codeHit ? "answer" : "prompt", `matches ${qHit.label}`);
    seenCode.push({ id: q.id, module: mod, fp, label: `${q.id} answer` });
    if (ownPrompt) seenPrompt.push({ id: q.id, module: mod, fp: pfp, label: `${q.id} prompt` });
  }
}

// ---------------------------------------------------------------- rules: fakes

/**
 * Errors a fake catches to pretend an unsupported operation ran. ValueError/KeyError fallbacks are real logic, and a
 * bare `except:` is reported by habit-bare-except instead.
 */
const FAKE_EXC = /^except\s*\(?\s*(?:RuntimeError|OSError|ImportError|ModuleNotFoundError|NotImplementedError|PermissionError|Exception|BaseException|ConnectionError|TimeoutError)\b[^:]*:/;
const LITERAL_RHS = /^[ \t]*([A-Za-z_]\w*(?:\s*,\s*[A-Za-z_]\w*)*)\s*=\s*([-+]?\d[\d_.]*|[rRbBuUfF]{0,2}"(?:[^"\\]|\\.)*"|[rRbBuUfF]{0,2}'(?:[^'\\]|\\.)*'|True|False|None|\[[^\]]*\]|\{[^}]*\}|\([^)]*\))\s*$/;

export function fakeExceptLiterals(code: string): string[] {
  const lines = code.split("\n");
  const found: string[] = [];
  lines.forEach((line, i) => {
    const m = line.match(/^([ \t]*)(except\b.*)$/);
    if (!m || !FAKE_EXC.test(m[2].trim())) return;
    const indent = m[1].length;
    const body: string[] = [];
    let j = i + 1;
    for (; j < lines.length; j++) {
      const l = lines[j];
      if (!l.trim()) continue;
      if (l.match(/^[ \t]*/)![0].length <= indent) break;
      body.push(l);
    }
    const assigned = body.map((l) => l.match(LITERAL_RHS)).filter(Boolean) as RegExpMatchArray[];
    if (!assigned.length || assigned.length !== body.filter((l) => !/^\s*pass\s*$/.test(l)).length) return;
    const rest = lines.slice(j).join("\n");
    const names = assigned.flatMap((a) => a[1].split(/\s*,\s*/));
    if (names.some((n) => new RegExp(`\\b${n}\\b`).test(rest))) found.push(`${m[2].trim()} → ${assigned.map((a) => a[0].trim()).join("; ")}`);
  });
  return found;
}

const CODE_IN_STRING = /^\s*(?:[A-Za-z_][\w.]*\([^()]*\)|import\s+\w+|from\s+\w+\s+import\b.*|def\s+\w+\(.*|await\s+\w.*)\s*$/;

export function codeStrings(code: string): string[] {
  const toks = tokenize(code);
  const out: string[] = [];
  toks.forEach((t, i) => {
    if (t.kind !== "str" || /^[rRbBuUfF]*[fF]/.test(t.text)) return;
    const v = strValue(t.text);
    if (!CODE_IN_STRING.test(v)) return;
    // Strings that really are run (exec/eval/compile/subprocess args/SQL drivers) are not fakes.
    const before = toks.slice(Math.max(0, i - 10), i).map((x) => x.text).join(" ");
    if (/\b(exec|eval|compile|run|Popen|check_output|parse|execute|executescript|write_text|write|timeit|repeat)\b/.test(before)) return;
    out.push(v.trim());
  });
  return out;
}

const NO_COMPUTE_TOKENS = new Set(["S", "N", "=", "(", ")", ",", "[", "]", "{", "}", ":", "print", "True", "False", "None", "-"]);

/** Only literals, names bound to literals, and print: nothing is computed. */
export function computesNothing(code: string): boolean {
  const norm = normalizeCode(code);
  if (!norm.includes("print")) return false;
  return norm.every((t) => NO_COMPUTE_TOKENS.has(t) || /^v\d+$/.test(t));
}

function valueStrings(v: PyValue | undefined, out: string[] = []): string[] {
  if (!v) return out;
  if (v.t === "str") out.push(v.v);
  else if (v.t === "list" || v.t === "tuple" || v.t === "set" || v.t === "frozenset") v.items.forEach((x) => valueStrings(x, out));
  else if (v.t === "dict") v.entries.forEach(([k, x]) => {
      valueStrings(k, out);
      valueStrings(x, out);
    });
  return out;
}

const isHiddenCheck = (c: PyCheck) => ("hidden" in c && !!c.hidden) || (c.kind === "function" && c.cases.some((k) => k.hidden));

/**
 * True when every value-bearing check compares text that sits verbatim in one of the answer's string literals,
 * and nothing is hidden, varied or called. Structural checks (AST `expr` checks with a boolean expectation) are ignored.
 */
export function onlyLiteralChecks(answer: string, checks: PyCheck[]): boolean {
  if (checks.some((c) => isHiddenCheck(c) || c.kind === "variant" || c.kind === "function")) return false;
  const literals = tokenize(answer).filter((t) => t.kind === "str").map((t) => strValue(t.text));
  const inLiteral = (s: string) => !s.trim() || literals.some((l) => l.includes(s.trim()));
  let valueChecks = 0;
  for (const c of checks) {
    if (c.kind === "output") {
      valueChecks++;
      if (!c.expected.split("\n").every(inLiteral)) return false;
    } else if (c.kind === "variable" || (c.kind === "expr" && c.expected && c.expected.t !== "bool")) {
      const exp = c.kind === "variable" ? c.expected : c.expected!;
      const strs = valueStrings(exp);
      valueChecks++;
      if (!strs.length || !strs.every(inLiteral)) return false;
    }
  }
  return valueChecks > 0;
}

const RUNNER_PROSE = /this runner (?:cannot|can't|can not|does not|doesn't)|cannot start another program|runner raises|uses? the (?:recorded|stored) (?:result|values?)/i;
const RECORDED_PROSE = /\brecorded\b/i;

function fakes(lessons: PyLesson[], questions: PyQuestion[], add: Add) {
  const allCode = [...lessons.flatMap(lessonCode), ...questions.flatMap(questionCode)];
  for (const r of allCode) {
    if (r.role === "starter") continue;
    for (const f of fakeExceptLiterals(r.code)) add("fake-except-literal", r.module, r.item, r.where, f);
    for (const s of codeStrings(r.code)) add("fake-code-string", r.module, r.item, `${r.where}:${s}`, `string "${s}" stands in for running it`);
  }
  for (const p of [...lessons.flatMap(lessonProse), ...questions.flatMap(questionProse)]) {
    if (RUNNER_PROSE.test(p.text)) add("fake-prose-runner", p.module, p.item, p.where, excerpt(p.text, RUNNER_PROSE));
    else if (RECORDED_PROSE.test(p.text)) add("fake-prose-recorded", p.module, p.item, p.where, excerpt(p.text, RECORDED_PROSE));
  }
  // No-computation answers and literal-only checks: from M03 on (M01–M02 teach print and literals themselves).
  for (const l of lessons) {
    const mod = moduleOf(l.id);
    if (moduleNo(mod) < 3) continue;
    for (const e of l.challenges) {
      if (computesNothing(e.answer)) add("fake-no-computation", mod, exItem(l, e), "answer", "answer is literals + print");
      else if (onlyLiteralChecks(e.answer, e.task.checks)) add("fake-literal-check", mod, exItem(l, e), "checks", "only checks text the answer itself holds as a literal; no variant, hidden or function check");
    }
  }
  for (const q of questions) {
    const mod = moduleOf(q.id);
    if (moduleNo(mod) < 3 || !q.code) continue;
    if (computesNothing(q.code.answer)) add("fake-no-computation", mod, q.id, "answer", "answer is literals + print");
    else if (onlyLiteralChecks(q.code.answer, q.code.task.checks)) add("fake-literal-check", mod, q.id, "checks", "only checks text the answer itself holds as a literal; no variant, hidden or function check");
  }
}

function excerpt(text: string, re: RegExp): string {
  const m = text.match(re);
  if (!m || m.index === undefined) return text.slice(0, 80);
  return `…${text.slice(Math.max(0, m.index - 30), m.index + m[0].length + 40).replace(/\s+/g, " ")}…`;
}

// ---------------------------------------------------------------- rules: format mix and tests

function formatMix(questions: PyQuestion[], add: Add) {
  const byModule = new Map<string, PyQuestion[]>();
  for (const q of questions) byModule.set(moduleOf(q.id), [...(byModule.get(moduleOf(q.id)) ?? []), q]);
  for (const [mod, qs] of byModule) {
    const support = qs.filter((q) => q.format === "output_prediction" || q.format === "code_completion").length;
    if (support / qs.length > 0.5) add("format-supporting-majority", mod, mod, "practice", `${support}/${qs.length} are output_prediction + code_completion`);
    // def is taught in PY-L09-01, so a function_implementation question is possible from M09 on.
    if (moduleNo(mod) > 8 && !qs.some((q) => q.format === "function_implementation")) add("format-no-function", mod, mod, "practice", "no function_implementation question");
  }
}

export function testCounts(q: PyQuestion) {
  const checks = q.code?.task.checks ?? [];
  let pub = 0;
  let hidden = 0;
  for (const c of checks) {
    if (c.kind === "function") {
      for (const k of c.cases) {
        if (k.hidden) hidden++;
        else pub++;
      }
    } else if ((c.kind === "expr" || c.kind === "variant") && c.hidden) hidden++;
  }
  return { pub, hidden, wrong: q.code?.wrong.length ?? 0 };
}

function testCoverage(questions: PyQuestion[], add: Add) {
  for (const q of questions) {
    if (!q.code) continue;
    const mod = moduleOf(q.id);
    const { pub, hidden, wrong } = testCounts(q);
    if (q.format === "function_implementation") {
      if (pub < 3) add("tests-function-public", mod, q.id, "checks", `${pub} public cases`);
      if (hidden < 3) add("tests-function-hidden", mod, q.id, "checks", `${hidden} hidden cases/checks`);
    }
    if (wrong < 2) add("tests-few-wrongs", mod, q.id, "wrong", `${wrong} wrong programs`);
    if (moduleNo(mod) > 4 && hidden === 0) add("tests-no-hidden", mod, q.id, "checks", "no hidden checks");
  }
}

// ---------------------------------------------------------------- rules: habits

/** Code with strings and comments blanked, for syntax-level habit rules. */
function bare(code: string): string {
  return code
    .replace(/[rRbBuUfF]{0,2}("""[\s\S]*?"""|'''[\s\S]*?''')/g, '""')
    .replace(/[rRbBuUfF]{0,2}("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')/g, '""')
    .replace(/#.*$/gm, "");
}

export function habitsIn(code: string): string[] {
  const b = bare(code);
  const out: string[] = [];
  if (/^\s*except\s*:/m.test(b)) out.push("habit-bare-except");
  if (/[!=]=\s*(True|False)\b|\b(True|False)\s*[!=]=/.test(b)) out.push("habit-eq-bool");
  if (/^\s*[A-Za-z_][\w.]*\s*=\s*lambda\b/m.test(b)) out.push("habit-lambda-assign");
  if (/\bsys\._[a-z]\w*/.test(b)) out.push("habit-private-api");
  if (/^\s*from\s+\S+\s+import\s+\*/m.test(b)) out.push("habit-star-import");
  if (/\bdef\s+\w+\s*\([^)]*=\s*(\[\s*\]|\{\s*\}|set\(\)|list\(\)|dict\(\))/.test(b)) out.push("habit-mutable-default");
  if (b.split("\n").some((l) => /(?<![\w.])open\(/.test(l) && !/^\s*with\b/.test(l) && !/^\s*def\b/.test(l))) out.push("habit-open-without-with");
  return out;
}

const ARGS_LIST = /\*args\b[^.]{0,80}?\b(?<!not an? )(?<!not a )list\b/i;
const NUMPY_INT = /\b(?:int32|int64)\b/i;

function habits(lessons: PyLesson[], questions: PyQuestion[], add: Add) {
  for (const r of [...lessons.flatMap(lessonCode), ...questions.flatMap(questionCode)]) {
    // Starters are what the learner is given to change; the answer is what the course teaches as right.
    if (r.role === "starter") continue;
    for (const rule of habitsIn(r.code)) {
      if (rule === "habit-open-without-with" && r.lessonId && OPEN_ALLOWED_LESSONS.has(r.lessonId)) continue;
      if (rule === "habit-mutable-default" && r.lessonId && MUTABLE_DEFAULT_ALLOWED_LESSONS.has(r.lessonId)) continue;
      add(rule, r.module, r.item, r.where, r.code.split("\n").find((l) => l.trim())?.slice(0, 60) ?? "");
    }
  }
  for (const p of [...lessons.flatMap(lessonProse), ...questions.flatMap(questionProse)]) {
    for (const [rule, sentence] of proseHabitsIn(p.text)) add(rule, p.module, p.item, p.where, sentence.slice(0, 120));
  }
}

/** Factual-habit rules over prose, per sentence: *args called a list, a NumPy default int stated as universal. */
export function proseHabitsIn(text: string): [string, string][] {
  const out: [string, string][] = [];
  for (const sentence of text.split(/(?<=[.!?])\s+/)) {
    if (ARGS_LIST.test(sentence) && !/tuple/i.test(sentence)) out.push(["prose-args-list", sentence]);
    if (NUMPY_INT.test(sentence) && /default|always|by itself|automatically/i.test(sentence) && !/platform|depends|windows|varies/i.test(sentence)) out.push(["prose-numpy-int", sentence]);
  }
  return out;
}

// ---------------------------------------------------------------- rules: topic coverage and data monotony

/**
 * What a lesson's code must use for its title to be honest, keyed by "Mxx:lesson title". Any regex matching any
 * code in the lesson (examples, try-it, challenges) satisfies it. Lessons not listed are conceptual and need a
 * person to judge.
 */
export const LESSON_TOPICS: Record<string, RegExp> = {
  "M18:custom exceptions": /class\s+\w+\(\w*(Error|Exception)\)/,
  "M19:context managers": /\bwith\b/,
  "M19:pathlib": /\bpathlib\b|\bPath\(/,
  "M19:encodings": /encoding\s*=|\.encode\(|\.decode\(/,
  "M20:CSV reading": /csv\.(reader|DictReader)/,
  "M20:CSV writing": /csv\.(writer|DictWriter)/,
  "M20:JSON parsing": /json\.loads?\(/,
  "M20:JSON serialization": /json\.dumps?\(/,
  "M20:JSONL streams": /json\.(loads|dumps)/,
  "M21:datetime parsing": /strptime|fromisoformat/,
  "M21:time zones": /timezone|zoneinfo|ZoneInfo|tzinfo/,
  "M21:durations": /timedelta|total_seconds|\.days\b/,
  "M21:Decimal": /Decimal\(/,
  "M21:regular expressions": /\bre\.(search|match|fullmatch|findall|finditer|sub|compile|split)\(/,
  "M22:__main__": /__name__\s*==\s*["']__main__["']/,
  "M23:argparse": /argparse\.ArgumentParser|\.add_argument\(/,
  "M23:environment variables": /os\.environ|os\.getenv/,
  "M23:subprocess": /subprocess\.(run|Popen|check_output)/,
  "M24:tracebacks": /traceback\.|Traceback/,
  "M24:breakpoints": /\bpdb\b|(?<!["'])breakpoint\(\)(?!["'])/,
  "M24:logging": /logging\.(getLogger|basicConfig|info|warning|error|debug)/,
  "M25:assertions": /\bassert\b/,
  "M25:pytest": /\bpytest\b|def test_\w+/,
  "M25:parametrization": /parametrize|subTest/,
  "M25:fixtures and mocking": /unittest\.mock|Mock\(|monkeypatch|@pytest\.fixture|patch\(/,
  "M28:dataclasses": /@dataclass/,
  "M28:properties": /@property/,
  "M28:special methods": /def __(repr|str|eq|lt|len|iter|add|hash|contains|getitem)__/,
  "M28:type hints": /def \w+\([^)]*:\s*\w+|->\s*\w+/,
  "M28:TypedDict and Protocol": /TypedDict|Protocol/,
  "M29:abstract classes": /ABC|abstractmethod/,
  "M29:protocols": /Protocol/,
  "M29:descriptors": /def __(get|set|set_name)__/,
  "M30:SQLite": /sqlite3\.connect/,
  "M30:transactions": /\.commit\(\)|\.rollback\(\)|with\s+\w+\s*:/,
  "M30:pyproject": /pyproject|tomllib/,
  "M31:HTTP requests": /urllib\.request|http\.client|requests\.|httpx\.|pyodide\.http|Request\(/,
  "M31:JSON responses": /json\.loads|\.json\(\)/,
  "M31:retries and timeouts": /timeout\s*=|TimeoutError|retry|attempt/,
  "M32:iterator protocol": /__iter__|__next__|\biter\(|\bnext\(/,
  "M32:generators": /\byield\b/,
  "M32:yield from": /\byield from\b/,
  "M33:decorators": /^\s*@\w+/m,
  "M33:parameterized decorators": /^\s*@\w+\(/m,
  "M33:wraps": /functools\.wraps|@wraps/,
  "M33:custom context managers": /__enter__|__exit__/,
  "M33:contextlib": /contextlib|@contextmanager/,
  "M34:partial": /partial\(/,
  "M34:introspection": /inspect\.|getattr\(|hasattr\(|__name__|signature\(/,
  "M35:stacks and queues": /deque|\.pop\(|\.append\(/,
  "M36:garbage collection": /\bgc\./,
  "M36:memory profiling": /tracemalloc/,
  "M36:GIL and interpreter": /sys\.implementation|platform\.python_implementation|threading/,
  "M37:timeit": /timeit/,
  "M37:cProfile": /cProfile|pstats/,
  "M37:caching": /lru_cache|@cache\b/,
  "M38:threads": /threading\.Thread|\.start\(\)/,
  "M38:executors": /ThreadPoolExecutor|ProcessPoolExecutor|concurrent\.futures/,
  "M38:shared state": /Lock\(|threading\.local|Queue\(/,
  "M38:processes": /multiprocessing|ProcessPoolExecutor/,
  "M39:async and await": /\basync def\b[\s\S]*\bawait\b/,
  "M39:tasks": /create_task|gather\(|TaskGroup/,
  "M39:cancellation": /\.cancel\(\)|CancelledError/,
  "M39:semaphores": /Semaphore\(/,
  "M39:async HTTP workflows": /async def[\s\S]*await[\s\S]*(fetch|request|get|response|status)/,
  "M41:arrays and dtypes": /np\.array|numpy\.array|dtype/,
  "M41:broadcasting": /np\.|numpy\./,
  "M41:vectorization": /np\.|numpy\./,
  "M42:Series and DataFrames": /pd\.(Series|DataFrame)/,
  "M42:missing values": /isna|fillna|dropna|notna/,
  "M43:groupby": /\.groupby\(/,
  "M43:merge and join": /\.merge\(|\.join\(|pd\.merge/,
  "M43:pivot": /pivot|crosstab|unstack/,
  "M44:Matplotlib": /matplotlib|plt\./,
  "M44:Seaborn": /seaborn|sns\./,
  "M45:Parquet and Arrow": /parquet|pyarrow|arrow/i,
  "M45:chunking": /chunksize|chunk/,
  "M45:SQLite and DuckDB": /sqlite3|duckdb/,
  "M46:schema checks": /schema|isinstance|required/i,
  "M46:idempotency": /seen|already|exists|idempot/i,
  "M46:checkpoints": /checkpoint|offset|resume/i,
  "M47:secrets": /secrets\.|os\.environ|getenv|hmac|compare_digest/,
  "M47:SQL injection": /execute\([^)]*\?/,
  "M47:safe serialization": /json\.|yaml\.safe_load|literal_eval/,
  "M47:path security": /resolve\(\)|is_relative_to|commonpath|realpath/,
  "M48:structured logs": /logging\.|json\.dumps/,
  "M48:metrics": /Counter\(|count|histogram|perf_counter/i,
  "M48:tracing concepts": /trace_id|span|uuid/i,
  "M48:retries": /for\s+\w+\s+in\s+range\([^)]*\)[\s\S]*(try|except)|retry/,
  "M49:dependency locking": /==\d|lock|hash/i,
  "M49:Docker": /Dockerfile|FROM\s+python/,
  "M49:CI": /pytest|unittest|assert|workflow|steps/i,
  "M49:configuration": /os\.environ|getenv|config/i,
};

/** Module-level promises: at least one program in the module must use one of these. */
export const MODULE_TOPICS: Record<string, RegExp> = {
  M23: /argparse/,
  M24: /logging\.|traceback/,
  M25: /\bassert\b|unittest|pytest/,
  M30: /sqlite3/,
  M31: /urllib|http\.client|requests|httpx|pyodide\.http/,
  M32: /\byield\b/,
  M33: /^\s*@\w+/m,
  M36: /tracemalloc|getsizeof|\bgc\./,
  M37: /timeit|cProfile|perf_counter/,
  M38: /threading\.Thread|concurrent\.futures|multiprocessing/,
  M39: /asyncio\.(run|gather|create_task|wait_for|Semaphore)/,
  M41: /numpy|np\./,
  M42: /pandas|pd\./,
  M43: /groupby|merge/,
  M44: /matplotlib|plt\./,
};

const PLACEHOLDER = /["'](?:MUG|HAT|CUP|Mug|Hat|Cup|mug|hat|cup)[!?.]*["']|\b(?:MUG|HAT|CUP)\b/;

function topics(lessons: PyLesson[], questions: PyQuestion[], titleOf: (id: string) => string | undefined, add: Add) {
  const codeByModule = new Map<string, string[]>();
  for (const r of [...lessons.flatMap(lessonCode), ...questions.flatMap(questionCode)]) {
    if (r.role === "starter") continue;
    codeByModule.set(r.module, [...(codeByModule.get(r.module) ?? []), r.code]);
  }
  for (const l of lessons) {
    const mod = moduleOf(l.id);
    const re = LESSON_TOPICS[`${mod}:${titleOf(l.id) ?? l.title}`];
    if (!re) continue;
    const code = lessonCode(l).filter((r) => r.role !== "starter").map((r) => r.code);
    if (!code.some((c) => re.test(c))) add("prose-topic-missing", mod, l.id, "title", `"${titleOf(l.id) ?? l.title}" but no code matches ${re}`);
  }
  for (const [mod, re] of Object.entries(MODULE_TOPICS)) {
    const code = codeByModule.get(mod);
    if (code && !code.some((c) => re.test(c))) add("prose-topic-missing", mod, mod, "module", `module promises ${re} but no program uses it`);
  }
  for (const [mod, code] of codeByModule) {
    const n = code.filter((c) => PLACEHOLDER.test(c)).length;
    if (n / code.length > THRESHOLDS.monotony) add("prose-data-monotony", mod, mod, "data", `${n}/${code.length} programs (${Math.round((100 * n) / code.length)}%) use MUG/HAT/CUP`);
  }
}

// ---------------------------------------------------------------- entry point

type Add = (rule: string, module: string, item: string, where: string, detail: string) => void;

export const findingKey = (rule: string, item: string, where: string) => `${rule}|${item}|${where}`;

export function analyse(lessons: PyLesson[], questions: PyQuestion[], titleOf: (id: string) => string | undefined = () => undefined): Finding[] {
  const out: Finding[] = [];
  const seen = new Set<string>();
  const add: Add = (rule, mod, item, where, detail) => {
    const info = RULES[rule];
    const key = findingKey(rule, item, where);
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ rule, group: info.group, severity: info.severity, module: mod, item, where, detail, key });
  };
  duplicates(lessons, questions, add);
  fakes(lessons, questions, add);
  formatMix(questions, add);
  testCoverage(questions, add);
  habits(lessons, questions, add);
  topics(lessons, questions, titleOf, add);
  return out.sort((a, b) => a.key.localeCompare(b.key));
}

// ---------------------------------------------------------------- baseline

/** Known violations by module: `{ "M12": ["rule|item|where", …], … }`. Shrunk as modules are fixed. */
export type Baseline = Record<string, string[]>;
export type BaselineFile = { about: string; total: number; modules: Baseline };

export const BASELINE_ABOUT =
  "Known content-quality violations (scripts/python-v2/quality.ts). tests/python-v2-quality.test.ts fails on any finding not listed here. Remove entries as you fix them (PYQ_BASELINE=prune does it for you); never add entries to hide a new violation.";

export function toBaseline(findings: Finding[]): Baseline {
  const b: Baseline = {};
  for (const f of findings) (b[f.module] ??= []).push(f.key);
  for (const m of Object.keys(b)) b[m].sort();
  return Object.fromEntries(Object.entries(b).sort(([a], [c]) => a.localeCompare(c)));
}

export function baselineFile(modules: Baseline): BaselineFile {
  const sorted = Object.fromEntries(Object.entries(modules).filter(([, k]) => k.length).sort(([a], [c]) => a.localeCompare(c)));
  return { about: BASELINE_ABOUT, total: Object.values(sorted).reduce((n, k) => n + k.length, 0), modules: sorted };
}

export function compareBaseline(findings: Finding[], baseline: Baseline, modules?: Set<string>) {
  const known = new Set(Object.entries(baseline).flatMap(([m, keys]) => (!modules || modules.has(m) ? keys : [])));
  const found = new Set(findings.map((f) => f.key));
  return {
    fresh: findings.filter((f) => !known.has(f.key)),
    resolved: [...known].filter((k) => !found.has(k)).sort(),
  };
}

// ---------------------------------------------------------------- inventory

export const VERDICTS: { from: number; to: number; verdict: string }[] = [
  { from: 1, to: 9, verdict: "strengthen" },
  { from: 10, to: 16, verdict: "rewrite challenges + practice" },
  { from: 17, to: 29, verdict: "rewrite" },
  { from: 30, to: 40, verdict: "rebuild" },
  { from: 41, to: 50, verdict: "rebuild" },
];

export function verdictFor(mod: string, findings: Finding[]): string {
  const n = moduleNo(mod);
  const base = VERDICTS.find((v) => n >= v.from && n <= v.to)?.verdict ?? "review";
  const mine = findings.filter((f) => f.module === mod);
  if (!mine.some((f) => f.severity === "error")) return mine.length ? "keep (warnings only)" : "keep";
  if (mine.some((f) => f.group === "fake" && f.severity === "error")) return `${base}; withhold faked lessons until rebuilt`;
  return base;
}

const FORMAT_ABBR: Record<string, string> = {
  function_implementation: "FI",
  output_prediction: "OP",
  code_completion: "CC",
  debugging: "DB",
  data_transformation: "DT",
  validation: "VA",
  refactoring: "RF",
  testing: "TE",
  performance: "PF",
  integration: "IN",
};

export function inventoryMarkdown(
  lessons: PyLesson[],
  questions: PyQuestion[],
  findings: Finding[],
  registry: { modules: { id: string; title: string }[]; lessons: { id: string; status: string }[]; questions: { id: string; status: string }[] },
  baselineSize: number,
): string {
  const statusOf = new Map([...registry.lessons, ...registry.questions].map((e) => [e.id, e.status]));
  const byItem = new Map<string, Finding[]>();
  for (const f of findings) {
    const base = f.item.split("/")[0];
    byItem.set(base, [...(byItem.get(base) ?? []), f]);
  }
  const rulesOf = (id: string) => [...new Set((byItem.get(id) ?? []).map((f) => (f.item === id ? f.rule : `${f.item.split("/")[1]}:${f.rule}`)))];
  const count = (m: string, g: Group) => findings.filter((f) => f.module === m && f.group === g).length;
  const lines: string[] = [];
  lines.push("# Python content inventory");
  lines.push("");
  lines.push("Generated by `PYQ_REPORT=1 npx vitest run tests/python-v2-quality.test.ts` from scripts/python-v2/quality.ts. Do not edit by hand.");
  lines.push("");
  lines.push(`Totals: ${lessons.length} lessons, ${questions.length} questions, ${findings.length} findings (${findings.filter((f) => f.severity === "error").length} errors, ${findings.filter((f) => f.severity === "warn").length} warnings). Baseline holds ${baselineSize} known violations.`);
  lines.push("");
  lines.push("Format key: " + Object.entries(FORMAT_ABBR).map(([k, v]) => `${v} ${k}`).join(", ") + ".");
  lines.push("");
  lines.push("Columns: Dup = duplicate rules; Fake = faked execution (hardcoded except results, code in strings, runner disclaimers, \"recorded\" prose); Weak checks = answers that compute nothing or checks that only compare literals; Tests = missing hidden tests / wrong programs; Format/prose warns = format mix, topic coverage, MUG/HAT/CUP monotony. Verdict follows the rebuild brief's table; \"withhold\" is added where a module has error-level fakes.");
  lines.push("");
  lines.push("## Findings by rule");
  lines.push("");
  lines.push("| Rule | Level | Count | What it means |");
  lines.push("|---|---|---|---|");
  for (const [rule, info] of Object.entries(RULES)) lines.push(`| ${rule} | ${info.severity} | ${findings.filter((f) => f.rule === rule).length} | ${info.what.replace(/\|/g, "\\|")} |`);
  lines.push("");
  lines.push("## Modules");
  lines.push("");
  lines.push("| Module | Title | Lessons | Questions | Formats | Status | Dup | Fake | Weak checks | Habit | Tests | Format/prose warns | Verdict |");
  lines.push("|---|---|---|---|---|---|---|---|---|---|---|---|---|");
  for (const mod of registry.modules) {
    const m = mod.id;
    const ls = lessons.filter((l) => moduleOf(l.id) === m);
    const qs = questions.filter((q) => moduleOf(q.id) === m);
    const fmts = Object.entries(FORMAT_ABBR)
      .map(([f, a]) => [a, qs.filter((q) => q.format === f).length] as const)
      .filter(([, n]) => n)
      .map(([a, n]) => `${a} ${n}`)
      .join(", ");
    const statuses = [...new Set([...ls.map((l) => statusOf.get(l.id)), ...qs.map((q) => statusOf.get(q.id))])].join("/");
    lines.push(
      `| ${m} | ${mod.title} | ${ls.length} | ${qs.length} | ${fmts || "-"} | ${statuses || "-"} | ${count(m, "duplicate")} | ${count(m, "fake")} | ${count(m, "weak")} | ${count(m, "habit")} | ${count(m, "tests")} | ${count(m, "format") + count(m, "prose")} | ${verdictFor(m, findings)} |`,
    );
  }
  lines.push("");
  lines.push("## Lessons");
  lines.push("");
  lines.push("Flags on a lesson's exercises are prefixed with the exercise id (try, c1, c2).");
  lines.push("");
  lines.push("| ID | Title | Status | Flags |");
  lines.push("|---|---|---|---|");
  for (const l of lessons) lines.push(`| ${l.id} | ${l.title.replace(/\|/g, "\\|")} | ${statusOf.get(l.id) ?? "-"} | ${rulesOf(l.id).join(", ") || "-"} |`);
  lines.push("");
  lines.push("## Questions");
  lines.push("");
  lines.push("Public/hidden = function cases and hidden expr/variant checks. Wrong = known-wrong programs the gate rejects.");
  lines.push("");
  lines.push("| ID | Format | Difficulty | Status | Public/hidden | Wrong | Flags |");
  lines.push("|---|---|---|---|---|---|---|");
  for (const q of questions) {
    const t = testCounts(q);
    lines.push(`| ${q.id} | ${q.format} | ${q.difficulty} | ${statusOf.get(q.id) ?? "-"} | ${q.code ? `${t.pub}/${t.hidden}` : "-"} | ${q.code ? t.wrong : "-"} | ${rulesOf(q.id).join(", ") || "-"} |`);
  }
  lines.push("");
  return lines.join("\n");
}
