import type { PlanValidation } from "@/engine/plan-validation";
import type { CanonicalDatasetId, LearningDatasetRef } from "@/data/datasets/learning-map";
export type Challenge = {
  prompt: string;
  answer: string;
  /** Prefilled editor text for a fix-this-query challenge. Omitted for a blank write. */
  starter?: string;
  ordered: boolean;
  required: string[] | null;
  planValidation?: PlanValidation | null;
  /** Lab tasks: queries whose full results must match the reference database after the script. */
  stateQueries?: string[];
  /** Lab tasks: rerun the script on the same database to prove it is idempotent. */
  repeatCheck?: boolean;
  validate: Array<{
    sql: string;
    value?: unknown;
    mustSucceed?: boolean;
    mustFail?: boolean;
  }> | null;
};

export type Quiz = {
  q: string;
  options: string[];
  correct: number;
  why: string;
};

export type WalkthroughStep = {
  title: string;
  query: string;
  description?: string | null;
};

export type Lesson = {
  datasetRef: LearningDatasetRef;
  id: number;
  title: string;
  group: number;
  concept: string;
  example: string;
  trap: string;
  hints: string[];
  dataset: CanonicalDatasetId;
  difficulty: string;
  prereq: number[];
  grain: string | null;
  mode: string;
  dialectReference: string | null;
  tasks: Challenge[];
  quiz: Quiz;
  walkthrough: WalkthroughStep[];
  /** Scenario tables derived from the canonical dataset, created when the lesson's database opens. */
  setupSql?: string;
  /** Extra changed-data statements for this lesson's checks. */
  extraMutation?: string;
};

/** One lesson as listed in the course outline; every dataset-bound field comes from its canonical spec. */
export type LessonOutline = Pick<Lesson, "id" | "title" | "group" | "difficulty" | "prereq" | "mode">;

export type CourseOutline = {
  groups: string[];
  moduleDescriptions: string[];
  courseOrder: number[];
  lessons: LessonOutline[];
};
