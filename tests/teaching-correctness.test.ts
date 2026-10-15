import { beforeAll, describe, expect, it } from "vitest";
import { lessonFixture, lessons } from "@/content";
import { bootWorker, type WorkerResponse } from "./helpers/original";

let send: (data: Record<string, unknown>) => Promise<WorkerResponse>;

beforeAll(async () => {
  send = await bootWorker();
});

describe("teaching correctness for lessons 16, 70, 54, 35", () => {
  it("lesson 16 concept check is about line revenue, not fan-out", () => {
    const q = lessons[16].quiz;
    expect(q.q).toMatch(/quantity \* unit_price|revenue/i);
    expect(JSON.stringify(q)).not.toMatch(/fan-?out/i);
    expect(q.options[q.correct]).toMatch(/quantit/i);
    expect(q.why).toMatch(/quantity|price|units/i);
  });

  it("lesson 70 concept check is about Silver deduplication, not surrogate keys", () => {
    const q = lessons[70].quiz;
    expect(q.q).toMatch(/partition by/i);
    expect(JSON.stringify(q)).not.toMatch(/surrogate/i);
    expect(q.options[q.correct]).toMatch(/same customer/i);
    expect(q.why).toMatch(/group|split|key/i);
  });

  it("lesson 54 keeps the JOIN challenge and teaches the pattern first", () => {
    expect(lessons[54].tasks[1].answer).toMatch(/JOIN customers/i);
    expect(lessons[54].concept).toMatch(/JOIN customers ON/);
    expect(lessons[54].walkthrough.some((s) => /JOIN/i.test(s.query))).toBe(true);
    expect(lessons[54].walkthrough[0].title).not.toMatch(/Inspect the source/);
  });

  it("lesson 35 builds its date grid from the calendar table, without recursion", () => {
    for (const sql of [lessons[35].example, ...lessons[35].tasks.map((t) => t.answer)]) {
      expect(sql).not.toMatch(/RECURSIVE|UNION ALL/i);
      expect(sql).toMatch(/CROSS JOIN calendar|FROM calendar/i);
    }
    expect(lessons[35].concept).toMatch(/calendar/i);
  });

  it("both challenges still grade through the shipped worker", async () => {
    for (const id of [16, 70, 54, 35]) {
      for (const variant of [0, 1] as const) {
        const t = lessons[id].tasks[variant];
        const r = await send({
          seed: lessonFixture(lessons[id]).seed,
          query: t.answer,
          answer: t.answer,
          ordered: t.ordered,
          mutation: lessonFixture(lessons[id]).mutation,
          validate: t.validate,
          required: t.required,
          allowWrites: lessons[id].mode === "lab",
        });
        expect(r.error, `${id}/${variant}`).toBeUndefined();
        expect(r.grade?.ok, `${id}/${variant}: ${r.grade?.message}`).toBe(true);
      }
    }
  }, 60000);
});
