import { beforeAll, describe, expect, it } from "vitest";
import { fixtureMutation, lessons, seed } from "@/content";
import { bootWorker, type WorkerResponse } from "./helpers/original";

let send: (data: Record<string, unknown>) => Promise<WorkerResponse>;

beforeAll(async () => {
  send = await bootWorker();
});

describe("teaching correctness for lessons 16, 70, 54, 35", () => {
  it("lesson 16 concept check is about line revenue, not fan-out", () => {
    const q = lessons[16].quiz;
    expect(q.q).toMatch(/quantity \* price|revenue/i);
    expect(q.q).not.toMatch(/requests and three invoices/i);
    expect(q.options[q.correct]).toMatch(/line/i);
    expect(q.why).toMatch(/quantity|price|GROUP BY|grain/i);
  });

  it("lesson 70 concept check is about Silver deduplication, not surrogate keys", () => {
    const q = lessons[70].quiz;
    expect(q.q).toMatch(/rn = 1|latest|natural key/i);
    expect(q.q).not.toMatch(/surrogate keys with fresh ROW_NUMBER/i);
    expect(q.options[q.correct]).toMatch(/latest/i);
    expect(q.why).toMatch(/Silver|deduplicat|natural key/i);
  });

  it("lesson 54 keeps the JOIN challenge and teaches the pattern first", () => {
    expect(lessons[54].tasks[1].answer).toMatch(/JOIN customers/i);
    expect(lessons[54].concept).toMatch(/JOIN/);
    expect(lessons[54].walkthrough.some((s) => /JOIN/i.test(s.query))).toBe(true);
    expect(lessons[54].walkthrough[0].title).not.toMatch(/Inspect the source/);
  });

  it("lesson 35 supplies dates without recursion and matches prior result sets", async () => {
    expect(lessons[35].example).not.toMatch(/RECURSIVE|UNION ALL/i);
    expect(lessons[35].tasks[0].answer).not.toMatch(/RECURSIVE|UNION ALL/i);
    expect(lessons[35].tasks[1].answer).not.toMatch(/RECURSIVE|UNION ALL/i);
    expect(lessons[35].example).toMatch(/VALUES/);
    expect(lessons[35].concept).toMatch(/setup data|VALUES/i);
    const old0 =
      "WITH RECURSIVE days(day) AS(SELECT '2025-01-01' UNION ALL SELECT date(day,'+1 day') FROM days WHERE day<'2025-01-03') SELECT day,v.id AS viewer_id FROM days CROSS JOIN viewers v";
    const old1 = `${old0} WHERE day>=v.signup_at`;
    for (const [oldSql, neu] of [
      [old0, lessons[35].tasks[0].answer],
      [old1, lessons[35].tasks[1].answer],
    ] as const) {
      const a = await send({ seed, query: oldSql });
      const b = await send({ seed, query: neu });
      expect(a.error, oldSql).toBeUndefined();
      expect(b.error, neu).toBeUndefined();
      expect(b.result?.values).toEqual(a.result?.values);
      expect(b.result?.columns).toEqual(a.result?.columns);
    }
  });

  it("both challenges still grade through the shipped worker", async () => {
    for (const id of [16, 70, 54, 35]) {
      for (const variant of [0, 1] as const) {
        const t = lessons[id].tasks[variant];
        const r = await send({
          seed,
          query: t.answer,
          answer: t.answer,
          ordered: t.ordered,
          mutation: fixtureMutation,
          validate: t.validate,
          required: t.required,
          allowWrites: lessons[id].mode === "lab",
        });
        expect(r.error, `${id}/${variant}`).toBeUndefined();
        expect(r.grade?.ok, `${id}/${variant}: ${r.grade?.message}`).toBe(true);
      }
    }
  });
});
