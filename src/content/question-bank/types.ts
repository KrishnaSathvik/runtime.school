import type { PlanValidation } from "@/engine/plan-validation";
import type { Challenge } from "@/content/types";
import type { LearningDatasetRef } from "@/data/datasets/learning-map";

export const DIFFICULTIES = ["warmup", "easy", "medium", "hard"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  warmup: "Warm-up",
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

/** Canonical topic id, e.g. "joins.self". See topics.ts. */
export type TopicId = string;

export type SourceType = "lesson" | "project" | "bank";

export type QuestionMode = "query" | "lab";
export type ExerciseType = "write" | "predict" | "debug";
export const EXERCISE_LABEL: Record<ExerciseType, string> = { write: "Write SQL", predict: "Predict Output", debug: "Debug Query" };

/** A wrong approach the grader must reject (verified by tests). */
export type WrongAnswer = { sql: string; mistake: string };

/** A new, independent question-bank problem (namespace qb-####). */
export type BankQuestion = {
  datasetRef: LearningDatasetRef;
  exerciseType?: ExerciseType;
  starterSql?: string;
  id: string; // "qb-0001"
  slug: string;
  title: string;
  difficulty: Difficulty;
  /** Why this difficulty — rubric-based, one or two sentences. */
  difficultyWhy: string;
  primaryTopic: TopicId;
  topicTags: TopicId[];
  objective: string;
  /** Lesson ids whose concepts help (links, not mastery). */
  prerequisites: number[];
  datasetId: string;
  mode: QuestionMode;
  /** Plain-language task. */
  task: string;
  /** Exact output columns, in order. */
  columns: string[];
  ordered: boolean;
  /** Extra precise rules: ties, NULLs, boundaries, rounding. */
  rules: string[];
  /** Tables the learner needs. */
  tables: string[];
  hints: string[];
  solution: string;
  /** Independently executable alternative solutions, verified through the production grader. */
  equivalent?: string[];
  /** Visible per-question fixture, appended to the shared seed for Run, Check and previews. */
  setupSql?: string;
  /** Compare complete query results with the independent reference database. */
  stateQueries?: string[];
  /** Re-execute on the same database to verify idempotent state and output. */
  repeatCheck?: boolean;
  caseStudy?: { id: string; title: string; stage: number; total: number };
  explanation: string;
  /** Extra checks for database-engineering tasks (same format as lessons). */
  planValidation?: PlanValidation | null;
  validate?: Challenge["validate"];
  /** Constructs the objective explicitly requires. */
  required?: string[] | null;
  /** Extra changed-data statements beyond the shared fixture. */
  extraMutation?: string;
  wrong: WrongAnswer[];
  version: number;
};

/** One row of the unified bank: new questions and existing lesson/project challenges. */
export type QuestionRecord = {
  exerciseType?: ExerciseType;
  id: string; // "qb-0001" | "lc-<lesson>-<variant>"
  slug: string;
  title: string;
  difficulty: Difficulty;
  difficultyWhy: string;
  primaryTopic: TopicId;
  topicTags: TopicId[];
  datasetId: string;
  sourceType: SourceType;
  /** For lesson/project challenges: where it lives. */
  sourceLessonId?: number;
  sourceVariant?: number;
  projectIds?: number[];
  moduleId?: number;
  prompt: string;
  ordered: boolean;
  /** Same-reasoning group; questions sharing a pattern are near-duplicates. */
  pattern: string;
  /** Eligible for independent practice (lesson challenges that only make sense inside their lesson are not). */
  practiceEligible: boolean;
  href: string;
};
