// Content-quality validators for the authored Python course (rebuild brief §10). Pure static analysis, no Pyodide:
// duplicates (up to names and constants), faked execution, format mix, hidden-test coverage, bad habits, and
// title/topic honesty. Rules and thresholds live in scripts/python-v2/quality.ts.
//
// Modes (environment variables):
//   default              fail only on findings missing from scripts/python-v2/quality-baseline.json (new violations)
//   PYQ_STRICT=1         fail on every finding in the selected modules, baseline or not
//   PYQ_MODULES=M12,M13  only judge (and prune/regenerate) these modules; analysis still sees the whole course
//   PYQ_BASELINE=prune   remove baseline entries that no longer occur (selected modules only)
//   PYQ_BASELINE=regen   rewrite the baseline from current findings (selected modules only). Not for hiding new findings.
//   PYQ_REPORT=1         write docs/python/content-inventory.md (always the whole course)
//   PYQ_VERBOSE=1        print every finding in the selected modules
//
// Passing here is necessary, not sufficient: whether a challenge is a meaningful problem or an explanation is
// accurate still needs editorial review.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { authoredLessons, authoredQuestions } from "@/content/python-v2/content";
import { pyRegistry } from "@/content/python-v2/registry";
import type { PyCheck } from "@/engine/python/grading";
import { py } from "@/engine/python/values";
import {
  RULES,
  analyse,
  baselineFile,
  codeStrings,
  compareBaseline,
  computesNothing,
  fakeExceptLiterals,
  habitsIn,
  inventoryMarkdown,
  jaccard,
  normalizeCode,
  onlyLiteralChecks,
  proseHabitsIn,
  toBaseline,
  type Baseline,
  type BaselineFile,
  type Finding,
} from "../scripts/python-v2/quality";

const ROOT = path.resolve(__dirname, "..");
const BASELINE_PATH = path.join(ROOT, "scripts/python-v2/quality-baseline.json");
const INVENTORY_PATH = path.join(ROOT, "docs/python/content-inventory.md");

const STRICT = process.env.PYQ_STRICT === "1";
const REPORT = process.env.PYQ_REPORT === "1";
const VERBOSE = process.env.PYQ_VERBOSE === "1";
const BASELINE_MODE = process.env.PYQ_BASELINE ?? "";
const SELECTED = process.env.PYQ_MODULES
  ? new Set(process.env.PYQ_MODULES.split(",").map((m) => m.trim().toUpperCase()).filter(Boolean).map((m) => (/^M\d$/.test(m) ? `M0${m.slice(1)}` : m)))
  : undefined;

const lessonTitle = new Map(pyRegistry.lessons.map((l) => [l.id as string, l.title]));
const all = analyse(authoredLessons, authoredQuestions, (id) => lessonTitle.get(id));
const modules = pyRegistry.modules.map((m) => m.id as string).filter((m) => !SELECTED || SELECTED.has(m));
const findings = all.filter((f) => !SELECTED || SELECTED.has(f.module));

const readBaseline = (): Baseline => (fs.existsSync(BASELINE_PATH) ? (JSON.parse(fs.readFileSync(BASELINE_PATH, "utf8")) as BaselineFile).modules : {});
let baseline = readBaseline();

// ---- baseline maintenance (before judging, so a prune/regen run judges the file it wrote)
if (BASELINE_MODE === "prune" || BASELINE_MODE === "regen") {
  const current = toBaseline(all);
  const next: Baseline = { ...readBaseline() };
  for (const m of modules) {
    if (BASELINE_MODE === "regen") next[m] = current[m] ?? [];
    else {
      const now = new Set(current[m] ?? []);
      next[m] = (next[m] ?? []).filter((k) => now.has(k));
    }
  }
  fs.writeFileSync(BASELINE_PATH, JSON.stringify(baselineFile(next), null, 2) + "\n");
  baseline = readBaseline();
}

const fmt = (f: Finding) => `${f.severity.toUpperCase()} ${f.rule} ${f.item} [${f.where}] ${f.detail}`;

describe("quality detectors", () => {
  it("normalise away constants and names but keep structure", () => {
    const a = normalizeCode("prices = [8, 15]\nkept = []\nfor p in prices:\n    if p >= 10:\n        kept.append(p)\nprint(kept)\n");
    const b = normalizeCode("scores = [3, 99, 4]\nhigh = []\nfor s in scores:\n    if s >= 50:\n        high.append(s)\nprint(high)\n");
    const c = normalizeCode("scores = [3, 99, 4]\nhigh = [s for s in scores if s >= 50]\nprint(high)\n");
    expect(a.filter((t) => t !== "N" && t !== ",")).toEqual(b.filter((t) => t !== "N" && t !== ","));
    expect(a).not.toEqual(c);
    expect(normalizeCode("import sqlite3\ncon = sqlite3.connect(':memory:')\n")).toEqual(["import", "sqlite3", "v0", "=", "sqlite3", ".", "connect", "(", "S", ")"]);
    expect(jaccard(new Set(["a", "b"]), new Set(["a", "b"]))).toBe(1);
  });

  it("find hardcoded results in an except branch, but not real fallbacks", () => {
    const fake = 'import threading\ntry:\n    t = threading.Thread(target=f)\n    t.start()\n    text = box[0]\nexcept RuntimeError:\n    text = "MUG"\nprint(text)\n';
    expect(fakeExceptLiterals(fake)).toHaveLength(1);
    const real = "try:\n    n = int(raw)\nexcept ValueError:\n    n = 0\nprint(n)\n";
    expect(fakeExceptLiterals(real)).toEqual([]);
    const unused = 'try:\n    go()\nexcept OSError:\n    status = "down"\n';
    expect(fakeExceptLiterals(unused)).toEqual([]);
  });

  it("find code kept in a string instead of run", () => {
    expect(codeStrings('note = "breakpoint()"\nprint(1)\n')).toEqual(["breakpoint()"]);
    expect(codeStrings('code = compile("print(1)", "x", "single")\n')).toEqual([]);
    expect(codeStrings('print("Total: 4")\n')).toEqual([]);
  });

  it("find answers that compute nothing and checks that only compare literals", () => {
    expect(computesNothing('sku = "MUG"\nprint(sku)\n')).toBe(true);
    expect(computesNothing("total = 4 + 5\nprint(total)\n")).toBe(false);
    const out = (expected: string): PyCheck => ({ kind: "output", expected });
    expect(onlyLiteralChecks('def f():\n    return "CUP"\nprint(f())\n', [out("CUP\n")])).toBe(true);
    expect(onlyLiteralChecks("print(4 + 5)\n", [out("9\n")])).toBe(false);
    expect(onlyLiteralChecks('print("CUP")\n', [out("CUP\n"), { kind: "variant", set: { x: py.int(2) }, output: "x\n", hidden: true }])).toBe(false);
  });

  it("find bad habits and leave idiomatic code alone", () => {
    expect(habitsIn("try:\n    x()\nexcept:\n    pass\n")).toContain("habit-bare-except");
    expect(habitsIn("if ok == True:\n    pass\n")).toContain("habit-eq-bool");
    expect(habitsIn("double = lambda n: n * 2\n")).toContain("habit-lambda-assign");
    expect(habitsIn("import sys\nprint(sys._is_gil_enabled())\n")).toContain("habit-private-api");
    expect(habitsIn("from math import *\n")).toContain("habit-star-import");
    expect(habitsIn("def add(item, bag=[]):\n    bag.append(item)\n")).toContain("habit-mutable-default");
    expect(habitsIn('f = open("a.txt")\n')).toContain("habit-open-without-with");
    expect(proseHabitsIn("The extra arguments arrive in *args as a list.").map(([r]) => r)).toEqual(["prose-args-list"]);
    expect(proseHabitsIn("The extra arguments arrive in *args as a tuple.")).toEqual([]);
    expect(proseHabitsIn("NumPy uses int64 by default.").map(([r]) => r)).toEqual(["prose-numpy-int"]);
    expect(proseHabitsIn("The default integer dtype depends on the platform: often int64, int32 on Windows.")).toEqual([]);
    expect(habitsIn('with open("a.txt") as f:\n    print(f.read())\nprint("== True")\nkey = sorted(xs, key=lambda x: x[1])\n')).toEqual([]);
  });

  it("know every rule they report", () => {
    for (const f of all) expect(RULES[f.rule], f.rule).toBeTruthy();
    expect(new Set(all.map((f) => f.key)).size).toBe(all.length);
  });
});

describe.each(modules.map((m) => [m] as const))("module %s", (m) => {
  const mine = findings.filter((f) => f.module === m);
  if (VERBOSE && mine.length) console.log(`${m}: ${mine.length} findings\n${mine.map(fmt).join("\n")}`);

  if (STRICT) {
    it("has no quality findings (PYQ_STRICT=1)", () => {
      expect(mine.map(fmt)).toEqual([]);
    });
  } else {
    it("has no quality findings beyond the baseline", () => {
      const { fresh, resolved } = compareBaseline(mine, baseline, new Set([m]));
      if (resolved.length) console.info(`${m}: ${resolved.length} baseline entries are fixed; run with PYQ_BASELINE=prune PYQ_MODULES=${m} to drop them`);
      expect(fresh.map(fmt), "new findings (fix them; do not add them to the baseline)").toEqual([]);
    });
  }
});

describe("summary", () => {
  it("reports counts per rule", () => {
    const byRule = Object.keys(RULES)
      .map((r) => `${r.padEnd(28)} ${String(findings.filter((f) => f.rule === r).length).padStart(4)}`)
      .join("\n");
    const known = Object.entries(baseline)
      .filter(([m]) => !SELECTED || SELECTED.has(m))
      .reduce((n, [, k]) => n + k.length, 0);
    console.log(`Python content quality${SELECTED ? ` (${[...SELECTED].join(",")})` : ""}: ${findings.length} findings, baseline ${known}\n${byRule}`);
    expect(findings.every((f) => f.key.startsWith(f.rule))).toBe(true);
  });

  it.runIf(REPORT)("writes docs/python/content-inventory.md", () => {
    const total = Object.values(readBaseline()).reduce((n, k) => n + k.length, 0);
    fs.writeFileSync(INVENTORY_PATH, inventoryMarkdown(authoredLessons, authoredQuestions, all, pyRegistry, total));
    expect(fs.existsSync(INVENTORY_PATH)).toBe(true);
  });
});
