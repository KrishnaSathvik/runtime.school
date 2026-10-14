// Validates every lesson of one module against real Pyodide: see python-inventory.ts.
import { afterAll, describe, expect, it } from "vitest";
import { pythonLessons, pythonModules } from "@/content/python";
import type { PyModuleId } from "@/content/python/types";
import { Snapshot, validateGraded } from "./python-inventory";

const SLOW = 600000;

export function describeModule(id: PyModuleId) {
  const mod = pythonModules.find((m) => m.id === id)!;
  const lessons = pythonLessons.filter((l) => l.module === id);
  const snap = new Snapshot(`lessons-${id}`);
  afterAll(() => snap.finish());

  describe(`Python module ${mod.number}: ${mod.title}`, () => {
    it("lists its lessons in order, numbered from 1", () => {
      expect(lessons.length).toBeGreaterThan(0);
      expect(lessons.map((l) => l.number)).toEqual(lessons.map((_, i) => i + 1));
      expect(mod.lessons).toEqual(lessons.map((l) => l.slug));
    });

    for (const lesson of lessons) {
      describe(lesson.title, () => {
        const ctx = { packages: lesson.packages, files: lesson.files };
        it("is complete: teaching, steps, mistakes, two challenges, concept check, outcomes", () => {
          expect(lesson.ref).toBe(`python:${lesson.slug}`);
          expect(lesson.summary.length).toBeGreaterThan(40);
          expect(lesson.sections.length).toBeGreaterThanOrEqual(2);
          expect(lesson.walkthrough.length).toBeGreaterThanOrEqual(3);
          expect(lesson.mistakes.length).toBeGreaterThanOrEqual(2);
          expect(lesson.challenges.map((c) => c.id)).toEqual(["challenge-1", "challenge-2"]);
          expect(lesson.challenges[0].title).not.toBe(lesson.challenges[1].title);
          expect(lesson.quiz.length).toBeGreaterThanOrEqual(2);
          for (const q of lesson.quiz) {
            expect(q.options.length, q.id).toBeGreaterThanOrEqual(3);
            expect(q.options.filter((o) => o.correct), q.id).toHaveLength(1);
            for (const o of q.options) expect(o.why.length, `${q.id}: ${o.text}`).toBeGreaterThan(20);
            expect(new Set(q.options.map((o) => o.text)).size).toBe(q.options.length);
          }
          expect(new Set(lesson.quiz.map((q) => q.id)).size).toBe(lesson.quiz.length);
          expect(lesson.outcomes.length).toBeGreaterThanOrEqual(2);
          const titles = lesson.walkthrough.map((s) => s.title);
          expect(new Set(titles).size).toBe(titles.length);
        });

        it("every example, step, mistake and concept-check program does what was reviewed", async () => {
          await snap.run(`${lesson.ref}#example`, lesson.example.code, ctx);
          for (const [i, s] of lesson.walkthrough.entries()) await snap.run(`${lesson.ref}#step-${i + 1}`, s.code, ctx);
          for (const [i, m] of lesson.mistakes.entries()) {
            const r = await snap.run(`${lesson.ref}#mistake-${i + 1}`, m.code, ctx);
            if (m.raises === "timeout") expect(r.status, `${lesson.ref} mistake ${i + 1} should never finish`).toBe("timeout");
            else if (m.raises) {
              expect(r.status, `${lesson.ref} mistake ${i + 1} should raise ${m.raises}`).toMatch(/error/);
              if (r.status === "runtime-error" || r.status === "syntax-error") expect(r.error.type, `${lesson.ref} mistake ${i + 1}`).toBe(m.raises);
            } else expect(r.status, `${lesson.ref} mistake ${i + 1} should run (its problem is the result)`).toBe("ok");
          }
          for (const q of lesson.quiz) if (q.code) await snap.run(`${lesson.ref}#quiz-${q.id}`, q.code, ctx);
        }, SLOW);

        for (const c of lesson.challenges) {
          it(`${c.id}: the answer passes, the starter doesn't, alternatives pass, mistakes fail for the right reason`, async () => {
            await validateGraded(`${lesson.ref} ${c.id}`, c, ctx);
          }, SLOW);
        }
      });
    }
  });
}
