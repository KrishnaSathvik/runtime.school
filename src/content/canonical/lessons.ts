import type { Lesson } from "../types";
import type { LessonOverrides } from "./spec";
import { foundationLessons } from "./lessons-foundations";
import { joinLessons } from "./lessons-joins";
import { windowLessons } from "./lessons-windows";
import { advancedLessons } from "./lessons-advanced";
import { engineeringLessons } from "./lessons-engineering";
import { warehouseLessons } from "./lessons-warehouse";
import { CANONICAL_VERSION } from "@/data/datasets/learning";

/** All 88 lessons, re-authored against the canonical datasets. */
export const canonicalLessons: LessonOverrides = {
  ...foundationLessons,
  ...joinLessons,
  ...windowLessons,
  ...advancedLessons,
  ...engineeringLessons,
  ...warehouseLessons,
};

/** Replaces every dataset-bound field; title, module, order, prerequisites, difficulty and mode stay as authored in the outline. */
export function applyCanonicalLesson(outline: Lesson): Lesson {
  const spec = canonicalLessons[outline.id];
  if (!spec) throw new Error(`Lesson ${outline.id} has no canonical specification`);
  return {
    ...outline,
    title: spec.title ?? outline.title,
    dataset: spec.dataset,
    datasetRef: { datasetId: spec.dataset, datasetVersion: CANONICAL_VERSION },
    concept: spec.concept,
    trap: spec.trap,
    grain: spec.grain,
    example: spec.example,
    hints: spec.hints,
    tasks: spec.tasks,
    quiz: spec.quiz,
    walkthrough: spec.walkthrough,
    dialectReference: spec.dialectReference ?? null,
    setupSql: spec.setupSql,
    extraMutation: spec.extraMutation,
  };
}
