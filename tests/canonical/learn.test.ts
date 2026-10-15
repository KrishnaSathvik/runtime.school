/**
 * Learn correctness on the full canonical datasets, through the production worker:
 * every challenge answer passes its own check, obviously wrong variants fail, every example and walkthrough
 * runs, and the changed-data fixture changes each answer (so copied output cannot pass).
 */
import { beforeAll, describe, expect, it } from "vitest";
import { courseOrder, lessonFixture, lessons } from "@/content";
import { canonicalLessons } from "@/content/canonical/lessons";
import { CANONICAL_VERSION } from "@/data/datasets/learning";
import { canonicalNames } from "@/data/datasets/learning-map";
import type { Challenge, Lesson } from "@/content/types";
import { bootWorker, type WorkerResponse } from "../helpers/original";
import lockedMap from "./learn-dataset-map.json";
import { lastResult, openSeed, sameResult, withMutation } from "../helpers/canonical";

/** Lessons whose checks are DDL with constant output: they are verified by schema validation instead. */
const DATA_INDEPENDENT = new Set([58, 60]);

let run: (request: Record<string, unknown>) => Promise<WorkerResponse>;
beforeAll(async () => {
  run = await bootWorker();
});

const check = (lesson: Lesson, task: Challenge, query: string) => {
  const fixture = lessonFixture(lesson);
  return run({
    seed: fixture.seed, mutation: fixture.mutation, query, answer: task.answer, ordered: task.ordered,
    required: task.required, validate: task.validate, planValidation: task.planValidation ?? null,
    stateQueries: task.stateQueries, repeatCheck: task.repeatCheck, allowWrites: lesson.mode === "lab",
  });
};

it("covers all 88 lessons with a canonical dataset and stable ids", () => {
  expect(lessons).toHaveLength(88);
  expect(lessons.map((l) => l.id)).toEqual([...Array(88).keys()]);
  expect([...courseOrder].sort((a, b) => a - b)).toEqual(lessons.map((l) => l.id));
  for (const l of lessons) {
    expect(Object.keys(canonicalNames), `lesson ${l.id}`).toContain(l.dataset);
    expect(l.datasetRef).toEqual({ datasetId: l.dataset, datasetVersion: CANONICAL_VERSION });
    expect(canonicalLessons[l.id].reason.length, `lesson ${l.id} audit reason`).toBeGreaterThan(20);
  }
  // Every lesson uses the dataset locked by the rebuild specification (Retail carries the warehouse sequence).
  for (const l of lessons) expect(l.dataset, `lesson ${l.id}`).toBe((lockedMap as Record<string, string>)[l.id]);
  // Learn uses every canonical dataset.
  expect(new Set(lessons.map((l) => l.dataset)).size).toBe(12);
  // No learner-facing text names a retired fixture or an edition.
  expect(JSON.stringify(lessons)).not.toMatch(/Corner Shop|Harbor Market|Streamly|SocialLoop|dataset edition|learn edition|practice edition/i);
});

describe.each(lessons.map((l) => [l.id, l] as const))("lesson %i", (id, lesson) => {
  it("challenge answers pass, broken variants fail", async () => {
    for (const task of lesson.tasks) {
      const ok = await check(lesson, task, task.answer);
      expect(ok.error, task.prompt).toBeUndefined();
      expect(ok.grade?.ok, `${task.prompt}: ${ok.grade?.message}`).toBe(true);
      if (lesson.mode === "lab" || DATA_INDEPENDENT.has(id)) continue;
      // An empty result and a truncated result are both rejected.
      const empty = await check(lesson, task, `SELECT * FROM (${task.answer.replace(/;\s*$/, "")}) WHERE 0`);
      expect(empty.grade?.ok, `${task.prompt} (empty)`).toBe(false);
      if ((ok.total ?? 0) > 1) {
        const one = await check(lesson, task, `SELECT * FROM (${task.answer.replace(/;\s*$/, "")}) LIMIT 1`);
        expect(one.grade?.ok, `${task.prompt} (one row)`).toBe(false);
      }
    }
  }, 60000);

  it("examples and walkthrough steps run on the full dataset", async () => {
    const fixture = lessonFixture(lesson);
    for (const query of [lesson.example, ...lesson.walkthrough.map((s) => s.query)]) {
      const r = await run({ seed: fixture.seed, query, allowWrites: lesson.mode === "lab" });
      expect(r.error, query.slice(0, 120)).toBeUndefined();
    }
  }, 60000);

  it.skipIf(DATA_INDEPENDENT.has(id))("answers change on the changed-data fixture", async () => {
    const fixture = lessonFixture(lesson);
    for (const task of lesson.tasks) {
      const db = await openSeed(fixture.seed);
      try {
        const base = lastResult(db, task.answer);
        let changed;
        if (lesson.mode === "lab") {
          const other = await openSeed(fixture.seed);
          try {
            other.run(fixture.mutation);
            changed = lastResult(other, task.answer);
          } finally {
            other.close();
          }
        } else changed = withMutation(db, fixture.mutation, () => lastResult(db, task.answer));
        expect(sameResult(base, changed), task.prompt).toBe(false);
      } finally {
        db.close();
      }
    }
  }, 60000);
});
