import { describe, expect, it } from "vitest";
import { bankById, practiceSeed } from "@/content/question-bank";
import { caseStudies, questionsForCase, stageMetaFor } from "@/content/question-bank/case-studies";
import { lessons } from "@/content";
import { bootWorker, type WorkerResponse } from "./helpers/original";
import { beforeAll } from "vitest";

let send: (data: Record<string, unknown>) => Promise<WorkerResponse>;

beforeAll(async () => {
  send = await bootWorker();
});

describe("case study experience metadata", () => {
  it("covers both existing cases with five stages each", () => {
    expect(caseStudies.map((c) => c.id)).toEqual([
      "harbor-checkout-review",
      "regional-capacity",
    ]);
    for (const meta of caseStudies) {
      const qs = questionsForCase(meta.id);
      expect(qs).toHaveLength(5);
      expect(meta.stages.map((s) => s.questionId)).toEqual(qs.map((q) => q.id));
      expect(meta.independentNote).toMatch(/fresh database|do not carry/i);
      expect(meta.skillLessonIds.length).toBeGreaterThan(0);
      for (const id of meta.skillLessonIds) expect(lessons[id]?.title).toBeTruthy();
      for (const stage of meta.stages) {
        expect(bankById.get(stage.questionId)?.caseStudy?.id).toBe(meta.id);
        expect(stage.businessWhy.length).toBeGreaterThan(20);
      }
    }
  });

  it("keeps Harbor sessionization as stage 1 while requiring preparation", () => {
    const harbor = caseStudies.find((c) => c.id === "harbor-checkout-review")!;
    expect(harbor.stages[0].questionId).toBe("qb-0067");
    expect(harbor.preparation?.demos.length).toBeGreaterThanOrEqual(3);
    expect(harbor.complexityNote).toMatch(/not a beginner/i);
  });

  it("runs every ungraded preparation demo without error", async () => {
    for (const meta of caseStudies) {
      for (const demo of meta.preparation?.demos ?? []) {
        const r = await send({ seed: practiceSeed, query: demo.query });
        expect(r.error, `${meta.id}: ${demo.title}`).toBeUndefined();
        expect((r.result?.values?.length ?? 0) > 0, `${meta.id}: ${demo.title} empty`).toBe(true);
      }
    }
  });

  it("exposes stage briefs for workspace copy without changing question ids", () => {
    expect(stageMetaFor("qb-0067")?.brief).toMatch(/baseline/i);
    expect(stageMetaFor("qb-0088")?.brief).toMatch(/month end|project/i);
    expect(bankById.get("qb-0067")?.id).toBe("qb-0067");
    expect(bankById.get("qb-0084")?.id).toBe("qb-0084");
  });
});
