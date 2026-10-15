import type { Challenge, Lesson, Quiz, WalkthroughStep } from "../types";
import type { CanonicalDatasetId } from "@/data/datasets/learning-map";

/** Migration decision recorded for the Learn audit. */
export type Decision = "KEEP" | "MIGRATE" | "REWRITE";

/**
 * Every dataset-bound field of a lesson, authored against one canonical dataset.
 * Title, module, prerequisites, difficulty and mode come from the course outline and are unchanged.
 */
export type LessonSpec = {
  dataset: CanonicalDatasetId;
  decision: Decision;
  /** Why the lesson was kept, migrated or rewritten. */
  reason: string;
  /** Replacement title when the old one named retired data. */
  title?: string;
  concept: string;
  trap: string;
  grain: string;
  example: string;
  hints: [string, string];
  tasks: [Challenge, Challenge];
  quiz: Quiz;
  walkthrough: WalkthroughStep[];
  dialectReference?: string | null;
  /** Small scenario tables derived from the canonical data, created when the lesson's database opens. */
  setupSql?: string;
  /** Extra changed-data statements for this lesson's checks, applied after the dataset mutation. */
  extraMutation?: string;
};

export const task = (prompt: string, answer: string, extra: Partial<Challenge> = {}): Challenge => ({
  prompt, answer, ordered: false, required: null, validate: null, ...extra,
});
export const step = (title: string, description: string, query: string): WalkthroughStep => ({ title, description, query });
export const quiz = (q: string, options: [string, string, string], correct: 0 | 1 | 2, why: string): Quiz => ({ q, options, correct, why });

export type LessonOverrides = Record<number, LessonSpec>;
export type { Lesson };
