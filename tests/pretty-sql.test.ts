import { beforeAll, describe, expect, it } from "vitest";
import { prettySql } from "@/components/editor/pretty-sql";
import { lessonFixture, lessons } from "@/content";
import { toolDataset } from "@/content/tools/datasets";
import { performanceComparisons } from "@/content/tools/performance";
import { bankQuestions, bankSeed } from "@/content/question-bank";
import { bootWorker, type WorkerResponse } from "./helpers/original";

let send: (data: Record<string, unknown>) => Promise<WorkerResponse>;
beforeAll(async () => {
  send = await bootWorker();
});

// Every piece of SQL a learner can see or load into an editor, with the database it runs on.
const corpus: { name: string; sql: string; seed: string; writes: boolean }[] = [
  ...lessons.flatMap((l) => [
    { name: `lesson ${l.id} example`, sql: l.example, seed: lessonFixture(l).seed, writes: l.mode === "lab" },
    ...(l.walkthrough ?? []).map((w, i) => ({ name: `lesson ${l.id} step ${i + 1}`, sql: w.query, seed: lessonFixture(l).seed, writes: l.mode === "lab" })),
    ...l.tasks.map((t, i) => ({ name: `lesson ${l.id} answer ${i + 1}`, sql: t.answer, seed: lessonFixture(l).seed, writes: l.mode === "lab" })),
  ]),
  // Query Performance shows its setup and queries through prettySql.
  ...performanceComparisons.flatMap((p) => [p.a, p.b].map((x, i) => ({ name: `performance ${p.id} ${"ab"[i]}`, sql: x.setup ? `${x.setup}; ${x.query}` : x.query, seed: toolDataset(p.datasetId).seed, writes: true }))),
  ...bankQuestions.map((q) => ({ name: `practice ${q.id}`, sql: q.solution, seed: bankSeed(q), writes: q.mode === "lab" })),
];

const strip = (s: string) => s.replace(/\s+/g, "");
// SQLite stores CREATE statements as typed, so read-back definitions differ only in whitespace.
const norm = (r: unknown) => JSON.parse(JSON.stringify(r ?? null), (_k, v) => (typeof v === "string" ? v.replace(/\s+/g, " ").replace(/\s*([(),;=<>])\s*/g, "$1").trim() : v));

describe("prettySql only changes layout", () => {
  it("keeps every non-whitespace character, in order", () => {
    for (const c of corpus) expect(strip(prettySql(c.sql)), c.name).toBe(strip(c.sql));
  });

  it("returns the same result or error from the real engine", async () => {
    for (const c of corpus) {
      const a = await send({ seed: c.seed, query: c.sql, allowWrites: c.writes });
      const b = await send({ seed: c.seed, query: prettySql(c.sql), allowWrites: c.writes });
      expect({ result: norm(b.result), error: b.error ?? null }, c.name).toEqual({ result: norm(a.result), error: a.error ?? null });
    }
  }, 600_000); // Every lesson and practice query twice on the full datasets.

  it("breaks long one-line scripts into readable lines", () => {
    const longest = [...lessons.flatMap((l) => l.tasks.map((t) => t.answer)), ...bankQuestions.map((q) => q.solution)].map((sql) => sql.replace(/\s+/g, " ")).sort((x, y) => y.length - x.length)[0];
    const lines = prettySql(longest).split("\n");
    expect(lines.length).toBeGreaterThan(10);
    expect(Math.max(...lines.map((l) => l.length))).toBeLessThan(160);
  });
});
