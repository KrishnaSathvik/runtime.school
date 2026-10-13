import { beforeAll, describe, expect, it } from "vitest";
import { content, dialectGuide, planComparisons } from "@/content";
import { syntaxNotes } from "@/content/syntax-notes";
import { bootWorker, type WorkerResponse } from "./helpers/original";

let send: (data: Record<string, unknown>) => Promise<WorkerResponse>;
beforeAll(async () => {
  send = await bootWorker();
});

const planText = (c: { plan: { values: unknown[][] } }) => c.plan.values.map((v) => String(v.at(-1))).join(" | ");

describe("Query Performance comparisons run on the real engine", () => {
  it("has at least ten comparisons, each with a takeaway", () => {
    expect(planComparisons.length).toBeGreaterThanOrEqual(10);
    for (const p of planComparisons) {
      expect(p.takeaway, p.title).toBeTruthy();
      expect(p.explain, p.title).toBeTruthy();
    }
  });

  it("A and B return the same rows, and their plans show the difference they teach", async () => {
    for (const p of planComparisons) {
      const r = await send({ seed: content.seed, query: "SELECT 1", allowWrites: true, compare: p.cases });
      expect(r.error, p.title).toBeFalsy();
      expect(r.equivalent, `${p.title}: same output`).toBe(true);
      const [a, b] = r.comparison.map(planText);
      // "OR versus IN" exists to show that both spellings get the identical plan.
      if (/OR versus IN/.test(p.title)) expect(a, p.title).toBe(b);
      else expect(a, p.title).not.toBe(b);
    }
  }, 120_000);
});

describe("Compare SQL Syntax", () => {
  it("has twenty concepts with notes in the same order", () => {
    expect(dialectGuide.length).toBe(20);
    expect(Object.keys(syntaxNotes)).toEqual(dialectGuide.map((r) => r[0]));
  });

  it("every runnable SQLite example runs without an error", async () => {
    for (const [title, note] of Object.entries(syntaxNotes)) {
      if (!note.sqlite) continue;
      const sql = note.examples?.[0] ?? dialectGuide.find((r) => r[0] === title)![1];
      const r = await send({ seed: content.seed, query: sql, allowWrites: note.sqlite === "lab" });
      expect(r.error ?? null, title).toBeNull();
      expect(r.result?.values.length ?? 0, title).toBeGreaterThan(0);
    }
  }, 60_000);
});
