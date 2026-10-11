import fs from "fs";
import { beforeAll, describe, expect, it } from "vitest";
import { lessons } from "@/content";
import {
  allQuestions,
  bankCheckRequest,
  bankRunRequest,
  bankQuestions,
  DIFFICULTIES,
  practiceDatasets,
  practiceSeed,
} from "@/content/question-bank";
import { allTopicIds } from "@/content/question-bank/topics";
import { parseSchema } from "@/engine/explain";
import { bankStarter } from "@/features/practice/QuestionWorkspace";
import { bootWorker, type WorkerResponse } from "./helpers/original";

let send: (d: Record<string, unknown>) => Promise<WorkerResponse>;
beforeAll(async () => {
  send = await bootWorker();
});

const schema = parseSchema(practiceSeed);
const literal = (v: unknown) => (v === null ? "NULL" : typeof v === "number" ? String(v) : `'${String(v).replace(/'/g, "''")}'`);

describe("inventory integrity", () => {
  const all = allQuestions();

  it("keeps all 176 original challenges identifiable and links them to their lesson", () => {
    const existing = all.filter((q) => q.sourceType !== "bank");
    expect(existing).toHaveLength(176);
    for (const q of existing) {
      expect(q.id).toBe(`lc-${q.sourceLessonId}-${q.sourceVariant}`);
      expect(lessons[q.sourceLessonId!].tasks[q.sourceVariant!].prompt).toBe(q.prompt);
    }
  });

  it("has unique ids and slugs, valid difficulties, topics and datasets", () => {
    expect(new Set(all.map((q) => q.id)).size).toBe(all.length);
    expect(new Set(all.map((q) => q.slug)).size).toBe(all.length);
    for (const q of all) {
      expect(DIFFICULTIES, q.id).toContain(q.difficulty);
      expect(allTopicIds.has(q.primaryTopic), `${q.id} primary ${q.primaryTopic}`).toBe(true);
      for (const t of q.topicTags) expect(allTopicIds.has(t), `${q.id} tag ${t}`).toBe(true);
      expect(practiceDatasets[q.datasetId], `${q.id} dataset`).toBeTruthy();
      expect(q.difficultyWhy.length).toBeGreaterThan(10);
    }
  });

  it("bank questions are complete: ids, tables, hints, rules, prerequisites, wrong answers", () => {
    bankQuestions.forEach((q, i) => {
      expect(q.id).toBe(`qb-${String(i + 1).padStart(4, "0")}`);
      expect(q.slug).toMatch(/^[a-z0-9-]+$/);
      expect(q.columns.length).toBeGreaterThan(0);
      expect(q.hints.length).toBeGreaterThan(0);
      expect(q.wrong.length).toBeGreaterThan(0);
      expect(q.solution.trim()).not.toBe("");
      for (const t of q.tables) expect(schema[t], `${q.id} table ${t}`).toBeTruthy();
      for (const p of q.prerequisites) expect(lessons[p], `${q.id} prereq ${p}`).toBeTruthy();
      expect(new Set(q.topicTags).has(q.primaryTopic)).toBe(false);
    });
  });

  it("matches the planned first batch: 8 warm-up, 16 easy, 16 medium, 8 hard", () => {
    const count = (d: string) => bankQuestions.slice(0, 48).filter((q) => q.difficulty === d).length;
    expect([count("warmup"), count("easy"), count("medium"), count("hard")]).toEqual([8, 16, 16, 8]);
  });

  it("no bank question duplicates another bank question's solution or task", () => {
    expect(new Set(bankQuestions.map((q) => q.solution)).size).toBe(bankQuestions.length);
    expect(new Set(bankQuestions.map((q) => q.task)).size).toBe(bankQuestions.length);
  });
});

describe.each(bankQuestions.map((q) => [q.id, q.title, q] as const))("%s %s", (_id, _title, q) => {
  it("reference solution passes on visible and changed data with the exact columns", async () => {
    const r = await send(bankCheckRequest(q, q.solution));
    expect(r.error, r.error).toBeUndefined();
    expect(r.grade?.ok, r.grade?.message).toBe(true);
    expect(r.result.columns).toEqual(q.columns);
    expect(r.result.values.length, "non-empty on visible data").toBeGreaterThan(0);
  });

  it.each(q.equivalent ?? [])("accepts an equivalent solution: %s", async (sql) => {
    const r = await send(bankCheckRequest(q, sql));
    expect(r.error).toBeUndefined();
    expect(r.grade?.ok, r.grade?.message).toBe(true);
  });

  it("hard-coding the visible output fails", async () => {
    const base = await send(bankRunRequest(q, q.solution));
    const rows = base.result.values as unknown[][];
    const select = rows
      .map((row) => `SELECT ${row.map((v, j) => `${literal(v)} AS "${q.columns[j]}"`).join(", ")}`)
      .join(" UNION ALL ");
    const hard = q.ordered ? `SELECT * FROM (${select})` : select;
    const r = await send(bankCheckRequest(q, hard));
    expect(r.grade?.ok).toBe(false);
  });

  it("the editor starter is not an answer", async () => {
    const r = await send(bankCheckRequest(q, bankStarter(q).sql));
    expect(r.grade?.ok === true).toBe(false);
  });

  it.each(q.wrong.map((w) => [w.mistake, w.sql] as const))("rejects: %s", async (_m, sql) => {
    const r = await send(bankCheckRequest(q, sql));
    expect(r.grade?.ok === true, r.grade?.message ?? r.error).toBe(false);
  });
});

describe("generated artifacts are in sync with the sources", () => {
  it("examples.json (sample output shown in Practice) matches the live reference output", async () => {
    const { computeExamples } = await import("../scripts/lib/qb-data");
    const live = await computeExamples();
    const stored = JSON.parse(fs.readFileSync("src/content/question-bank/examples.json", "utf8"));
    expect(stored).toEqual(JSON.parse(JSON.stringify(live)));
  });

  it("question-manifest.json counts match the canonical inventory", () => {
    const m = JSON.parse(fs.readFileSync("docs/question-bank/question-manifest.json", "utf8"));
    const all = allQuestions();
    expect(m.counts.total).toBe(all.length);
    expect(m.questions.map((q: { id: string }) => q.id)).toEqual(all.map((q) => q.id));
    expect(m.counts.bank).toBe(bankQuestions.length);
  });
});
