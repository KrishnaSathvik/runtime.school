import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { pythonLessons, pythonModules } from "@/content/python";
import { pythonQuestions, pythonTracks } from "@/content/python/practice";

// Structure of the whole practice bank. The questions themselves are run against the real runtime in
// python-practice-py01-04 / py05-08 / py09-12.
const research = JSON.parse(readFileSync("research/Runtime_Python_Agent_Starter_Complete/research/practice-tracks-and-cases.json", "utf8")) as {
  tracks: { id: string; modules: string[]; question_count_target: number }[];
};

describe("python practice inventory", () => {
  it("has 120 questions: ten per module, in curriculum order", () => {
    expect(pythonQuestions).toHaveLength(120);
    pythonModules.forEach((m, n) => {
      const here = pythonQuestions.filter((q) => q.module === m.id);
      expect(here.map((q) => q.slug), m.id).toEqual(Array.from({ length: 10 }, (_, k) => `py${String(n + 1).padStart(2, "0")}-${String(k + 1).padStart(2, "0")}`));
    });
    expect(pythonQuestions.map((q) => q.slug)).toEqual([...pythonQuestions.map((q) => q.slug)].sort());
  });

  it("refs, slugs and titles are unique, and no title repeats a lesson challenge", () => {
    for (const key of ["ref", "slug", "title"] as const) expect(new Set(pythonQuestions.map((q) => q[key])).size).toBe(120);
    const challengeTitles = new Set(pythonLessons.flatMap((l) => l.challenges.map((c) => c.title.toLowerCase())));
    for (const q of pythonQuestions) expect(challengeTitles.has(q.title.toLowerCase()), q.title).toBe(false);
  });

  it("every module mixes writing, debugging and predicting", () => {
    for (const m of pythonModules) {
      const kinds = new Set(pythonQuestions.filter((q) => q.module === m.id).map((q) => q.kind));
      expect([...kinds].sort(), m.id).toEqual(["debug", "predict", "write"]);
    }
  });

  it("tracks match the research plan: size, modules, and canonical refs only", () => {
    expect(pythonTracks.map((t) => t.id)).toEqual(research.tracks.map((t) => t.id));
    const byRef = new Map(pythonQuestions.map((q) => [q.ref, q]));
    const moduleCode = new Map(pythonModules.map((m, n) => [m.id, `PY${String(n + 1).padStart(2, "0")}`]));
    for (const t of pythonTracks) {
      const plan = research.tracks.find((r) => r.id === t.id)!;
      expect(t.questions, t.id).toHaveLength(plan.question_count_target);
      expect(new Set(t.questions).size, t.id).toBe(t.questions.length);
      for (const ref of t.questions) {
        const q = byRef.get(ref);
        expect(q, ref).toBeDefined();
        expect(plan.modules, `${t.id} ${ref}`).toContain(moduleCode.get(q!.module));
      }
      const order = t.questions.map((ref) => pythonQuestions.findIndex((q) => q.ref === ref));
      expect(order, t.id).toEqual([...order].sort((a, b) => a - b));
      expect(new Set(pythonTracks.map((x) => x.slug)).size).toBe(pythonTracks.length);
    }
  });
});
