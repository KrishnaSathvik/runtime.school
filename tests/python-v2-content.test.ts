// Quality gates for authored Python content (docs/python/curriculum-plan.md §9), in real Pyodide through the
// worker's own harness (tests/helpers/python-fast.ts). Counts are not evidence: every program is executed.
import { describe, expect, it } from "vitest";
import { gradePrediction } from "@/engine/python/predict";
import type { PyGradeReport, PyTask } from "@/engine/python/grading";
import { authoredLessons, authoredProjects, authoredQuestions } from "@/content/python-v2/content";
import type { PyExercise, PyWrong } from "@/content/python-v2/model";
import { pyRegistry } from "@/content/python-v2/registry";
import { PY_STATUSES } from "@/content/python-v2/types";
import { checkFast, runFast } from "./helpers/python-fast";

const failing = (r: PyGradeReport) => r.checks.filter((c) => c.status !== "pass").map((c) => c.id).sort();
const explain = (r: PyGradeReport) => `${r.outcome}: ${r.summary} ${JSON.stringify(r.checks.map((c) => [c.id, c.status, c.detail]))} ${r.error?.message ?? ""}`;

async function gateExercise(task: PyTask, ex: { starter: string; answer: string; alternatives?: string[]; wrong: PyWrong[] }) {
  const ids = task.checks.map((c, i) => c.id ?? `${c.kind}-${i + 1}`);
  expect(new Set(ids).size, "check ids are unique").toBe(ids.length);
  const answer = await checkFast(task, ex.answer);
  expect(answer.ok, `answer: ${explain(answer)}`).toBe(true);
  for (const alt of ex.alternatives ?? []) {
    const r = await checkFast(task, alt);
    expect(r.ok, `alternative: ${explain(r)}`).toBe(true);
  }
  const starter = await checkFast(task, ex.starter);
  expect(starter.ok, "the starter must not already pass").toBe(false);
  for (const w of ex.wrong) {
    const r = await checkFast(task, w.code);
    expect(failing(r), `wrong answer "${w.why}": ${explain(r)}`).toEqual([...w.fails].sort());
  }
}

// ---- prerequisite linter: syntax may not appear before the module that teaches it ----
const TAUGHT_AT: Record<string, number> = {
  if: 4, elif: 4, else: 4, match: 4, for: 5, while: 5, break: 5, continue: 5, "{": 8, def: 9, return: 9,
  lambda: 15, try: 18, except: 18, finally: 18, raise: 18, with: 19, import: 16, from: 16, class: 18, yield: 32, async: 39, await: 39,
};
function syntaxUsed(code: string): string[] {
  const bare = code
    .replace(/("""[\s\S]*?"""|'''[\s\S]*?''')/g, '""')
    .replace(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'/g, '""')
    .replace(/#.*$/gm, "");
  const found = Object.keys(TAUGHT_AT).filter((k) => (/^\w/.test(k) ? new RegExp(`\\b${k}\\b`).test(bare) : bare.includes(k)));
  // text[n] is indexing (M06). A bracket that opens a list is M07.
  if (/(?:^|[=(:,\n])\s*\[/.test(bare)) found.push("[");
  return found;
}
function lint(code: string, module: number, where: string) {
  const early = syntaxUsed(code).filter((k) => (k === "[" ? 7 : TAUGHT_AT[k]) > module);
  expect(early, `${where} uses syntax taught later: ${early.join(", ")}`).toEqual([]);
}
const moduleNo = (id: string) => Number(id.match(/^PY-[LQ](\d\d)/)![1]);

describe.each(authoredLessons.map((l) => [l.id, l] as const))("lesson %s", (_, lesson) => {
  const m = moduleNo(lesson.id);

  it("every example prints exactly what the lesson says", async () => {
    for (const b of lesson.blocks) {
      if (b.kind === "example") {
        const r = await runFast(b.code, { stdin: b.stdin, packages: lesson.packages });
        expect(r.status, `${b.title}`).toBe("ok");
        expect("stdout" in r && r.stdout, b.title).toBe(b.output);
        if (!b.preview) lint(b.code, m, b.title);
      }
      if (b.kind === "error-example") {
        const r = await runFast(b.code, { packages: lesson.packages });
        expect(r.status === "runtime-error" || r.status === "syntax-error", b.title).toBe(true);
        if (r.status === "runtime-error" || r.status === "syntax-error") expect(r.error.type, b.title).toBe(b.error);
        expect("stdout" in r && r.stdout, b.title).toBe(b.output);
      }
    }
  });

  it.each([lesson.tryIt, ...lesson.challenges].map((e) => [e.id, e] as [string, PyExercise]))("exercise %s passes its gate", async (_, ex) => {
    await gateExercise(ex.task, ex);
    for (const code of [ex.starter, ex.answer, ...(ex.alternatives ?? [])]) lint(code, m, `${lesson.id} ${ex.id}`);
    expect(ex.hints).toHaveLength(3);
  });

  it("concept-check answers match real Python", async () => {
    expect(lesson.concept.length).toBeGreaterThanOrEqual(2);
    for (const q of lesson.concept) {
      expect(q.answer).toBeLessThan(q.choices.length);
      if (!q.program) continue;
      const r = await runFast(q.program, { packages: lesson.packages });
      const printed = ("stdout" in r ? r.stdout : "").replace(/\n$/, "");
      const shown = (c: string) => (c === "(nothing)" ? "" : c);
      expect(shown(q.choices[q.answer]), `${q.id}`).toBe(printed);
      expect(q.choices.filter((c) => shown(c) === printed), `${q.id}: exactly one choice matches`).toHaveLength(1);
    }
  });
});

describe.each(authoredQuestions.map((q) => [q.id, q] as const))("question %s", (_, q) => {
  it("passes its gate", async () => {
    expect(q.hints).toHaveLength(3);
    if (q.predict) {
      const r = await runFast(q.predict.program, { stdin: q.predict.stdin, packages: q.packages });
      expect(r.status).toBe("ok");
      expect("stdout" in r && r.stdout).toBe(q.predict.output);
      expect(gradePrediction(q.predict.output, q.predict.output).ok).toBe(true);
      for (const w of q.predict.wrongPredictions) expect(gradePrediction(q.predict.output, w).ok, w).toBe(false);
    } else {
      expect(q.code, "code questions need code").toBeTruthy();
      await gateExercise(q.code!.task, q.code!);
      for (const code of [q.code!.starter, q.code!.answer, ...(q.code!.alternatives ?? [])]) lint(code, moduleNo(q.id), q.id);
      const hidden = q.code!.task.checks.some((c) => ("hidden" in c && c.hidden) || (c.kind === "function" && c.cases.some((k) => k.hidden)));
      if (hidden) expect(q.hiddenKinds.length, "hidden tests are described by kind").toBeGreaterThan(0);
    }
  });
});

describe.each(authoredProjects.flatMap((p) => p.milestones.map((ms) => [ms.id, p, ms] as const)))("milestone %s", (_, project, ms) => {
  const run = (files: Record<string, string>) => {
    const { "main.py": main, ...rest } = files;
    return checkFast({ ...ms.task, files: { ...ms.task.files, ...project.provided, ...rest } }, main);
  };
  it("passes its gate", async () => {
    const solved = await run(ms.solution);
    expect(solved.ok, explain(solved)).toBe(true);
    const starter = await run(ms.starters);
    expect(starter.ok, "the starter must not already pass").toBe(false);
    for (const w of ms.wrong) {
      const r = await run(w.files);
      expect(failing(r), `wrong "${w.why}": ${explain(r)}`).toEqual([...w.fails].sort());
    }
    // Learner-written lines (in the solution but not the starter) respect the unlock module.
    const unlock = Number(pyRegistry.projects.find((e) => e.id === project.id)!.unlockAfter.slice(1));
    for (const [file, text] of Object.entries(ms.solution)) {
      const given = new Set((ms.starters[file] ?? "").split("\n"));
      lint(text.split("\n").filter((l) => !given.has(l)).join("\n"), unlock, `${ms.id} ${file}`);
    }
  });
});

describe("registry agrees with authored content", () => {
  const rank = (s: string) => PY_STATUSES.indexOf(s as (typeof PY_STATUSES)[number]);
  it("authored items are at least drafted, and nothing past drafted is missing its content", () => {
    const authored = new Set([...authoredLessons.map((l) => l.id), ...authoredQuestions.map((q) => q.id), ...authoredProjects.flatMap((p) => p.milestones.map((m) => m.id))]);
    for (const e of [...pyRegistry.lessons, ...pyRegistry.questions, ...pyRegistry.projects.flatMap((p) => p.milestones)]) {
      if (authored.has(e.id)) expect(rank(e.status), e.id).toBeGreaterThanOrEqual(rank("drafted"));
      else expect(rank(e.status), `${e.id} has no content`).toBeLessThan(rank("drafted"));
    }
    for (const q of authoredQuestions) expect(pyRegistry.questions.find((e) => e.id === q.id)?.format, q.id).toBe(q.format);
  });
});
