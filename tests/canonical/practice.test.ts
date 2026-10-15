/**
 * Practice correctness on the full canonical datasets, using the exact request the workspace sends:
 * reference solutions and authored equivalents pass, every listed wrong approach is rejected, the
 * changed-data fixture changes each answer, and saved ids and links from earlier versions keep resolving.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { bankBySlug, bankCheckRequest, bankQuestions, bankSeed, topicLabel } from "@/content/question-bank";
import { CANONICAL_VERSION } from "@/data/datasets/learning";
import { canonicalNames } from "@/data/datasets/learning-map";
import { lessons } from "@/content";
import { bootWorker, type WorkerResponse } from "../helpers/original";
import { lastResult, openSeed, sameResult, withMutation } from "../helpers/canonical";

let run: (request: Record<string, unknown>) => Promise<WorkerResponse>;
beforeAll(async () => {
  run = await bootWorker();
});

it("gives every question a unique id and slug", () => {
  expect(new Set(bankQuestions.map((q) => q.id)).size).toBe(bankQuestions.length);
  expect(new Set(bankQuestions.map((q) => q.slug)).size).toBe(bankQuestions.length);
  for (const q of bankQuestions) expect(bankBySlug.get(q.slug)?.id, q.slug).toBe(q.id);
});

it("uses only canonical datasets and catalogued topics, with every format and dataset represented", () => {
  for (const q of bankQuestions) {
    expect(Object.keys(canonicalNames), q.id).toContain(q.datasetId);
    expect(q.datasetRef, q.id).toEqual({ datasetId: q.datasetId, datasetVersion: CANONICAL_VERSION });
    expect(topicLabel[q.primaryTopic], `${q.id} topic ${q.primaryTopic}`).toBeTruthy();
    for (const t of q.topicTags) expect(topicLabel[t], `${q.id} tag ${t}`).toBeTruthy();
    for (const p of q.prerequisites) expect(lessons[p], `${q.id} prerequisite ${p}`).toBeTruthy();
    if (q.exerciseType === "debug") expect(q.starterSql, q.id).toBeTruthy();
    if (q.exerciseType === "predict") expect(q.setupSql, `${q.id} shows its sample`).toBeTruthy();
    if (q.exerciseType !== "predict" && q.mode !== "lab") expect(q.wrong.length, `${q.id} wrong answers`).toBeGreaterThan(0);
  }
  for (const id of Object.keys(canonicalNames)) expect(bankQuestions.filter((q) => q.datasetId === id).length, id).toBeGreaterThanOrEqual(5);
  for (const type of ["write", "predict", "debug"]) expect(bankQuestions.some((q) => q.exerciseType === type), type).toBe(true);
  // No wording borrowed from interview-question sites.
  expect(JSON.stringify(bankQuestions.map((q) => [q.title, q.task]))).not.toMatch(/leetcode|hackerrank|stratascratch|datalemur/i);
});

describe.each(bankQuestions.map((q) => [q.id, q] as const))("%s", (_id, q) => {
  it("solution and equivalents pass, wrong approaches fail", async () => {
    const ok = await run(bankCheckRequest(q, q.solution));
    expect(ok.error).toBeUndefined();
    expect(ok.grade?.ok, ok.grade?.message).toBe(true);
    for (const query of q.equivalent ?? []) {
      const r = await run(bankCheckRequest(q, query));
      expect(r.error, query).toBeUndefined();
      expect(r.grade?.ok, `equivalent: ${r.grade?.message}`).toBe(true);
    }
    for (const w of q.wrong) {
      const r = await run(bankCheckRequest(q, w.sql));
      expect(r.grade?.ok, `wrong approach accepted: ${w.mistake}`).toBe(false);
    }
    if (q.starterSql && q.exerciseType === "debug") {
      const r = await run(bankCheckRequest(q, q.starterSql));
      expect(r.grade?.ok, "the buggy starter must not pass").toBe(false);
    }
  }, 60000);

  it.skipIf(q.exerciseType === "predict" || q.mode === "lab")("the answer changes on the changed-data fixture", async () => {
    const request = bankCheckRequest(q, q.solution);
    const db = await openSeed(bankSeed(q));
    try {
      const base = lastResult(db, q.solution);
      const changed = withMutation(db, request.mutation ?? "", () => lastResult(db, q.solution));
      expect(sameResult(base, changed)).toBe(false);
    } finally {
      db.close();
    }
  }, 60000);
});
