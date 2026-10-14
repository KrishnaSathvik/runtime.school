// Validates practice questions against real Pyodide: code questions with the real grader (python-inventory.ts),
// predict questions by running their program and comparing with the stated output.
import { afterAll, describe, expect, it } from "vitest";
import { getPythonLessonByRef } from "@/content/python";
import type { PyQuestion } from "@/content/python/practice/types";
import { gradePrediction } from "@/engine/python/predict";
import { Snapshot, validateGraded } from "./python-inventory";

const SLOW = 600000;

export function describeQuestions(group: string, questions: PyQuestion[]) {
  const snap = new Snapshot(`practice-${group}`);
  afterAll(() => snap.finish());
  describe(`practice ${group}`, () => {
    for (const q of questions) {
      describe(`${q.slug} ${q.title}`, () => {
        it("is complete and assumes only lessons that exist", () => {
          expect(q.ref).toBe(`python:bank:${q.slug}`);
          expect(getPythonLessonByRef(q.after), `${q.ref}: after ${q.after}`).toBeDefined();
          expect(q.topics.length).toBeGreaterThan(0);
          expect(q.minutes).toBeGreaterThan(0);
          if (q.kind === "predict") {
            expect(q.hints.length).toBeGreaterThanOrEqual(2);
            expect(q.explanation.length).toBeGreaterThan(40);
          }
        });
        if (q.kind === "predict") {
          it("the stated output is what the program really prints; wrong predictions don't match", async () => {
            const r = await snap.run(`${q.ref}#program`, q.code, { packages: q.packages, files: q.files });
            expect("stdout" in r ? r.stdout : null, `${q.ref} real output`).toBe(q.output);
            expect(gradePrediction(q.output, q.output).ok).toBe(true);
            for (const w of q.wrong ?? []) expect(gradePrediction(q.output, w).ok, `${q.ref} wrong prediction ${JSON.stringify(w)}`).toBe(false);
          }, SLOW);
        } else {
          it("the answer passes, the starter doesn't, alternatives pass, mistakes fail for the right reason", async () => {
            await validateGraded(q.ref, q, { packages: q.packages, files: q.files });
          }, SLOW);
        }
      });
    }
  });
}
