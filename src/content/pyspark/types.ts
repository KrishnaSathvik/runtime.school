/**
 * The canonical PySpark course registry (docs/pyspark/plan.md §3), imported from the v4 planning CSVs in
 * `PySpark Docs/planning/` by scripts/pyspark/import-catalog.mjs.
 *
 * Every module, lesson, question, project, dataset and tool has one entry with a namespaced, stable ID
 * (`PS-L025`, `PS-Q0127`, `PS-D01`, `PS-P01`), a status, explicit prerequisites and the datasets it uses.
 * Only `published` entries appear in the app, and only once the Spark capability they need is live.
 */

/** Lifecycle, in order. Only `published` items are shown to learners. */
export const PS_STATUSES = ["planned", "drafted", "tests-pass", "reviewed", "published"] as const;
export type PsItemStatus = (typeof PS_STATUSES)[number];

/**
 * `interactive` runs on real Spark. `read-and-diagnose` needs no execution: the learner reads real code, plans
 * or output recorded from real Spark and answers questions about it (architecture, spark-submit, cluster tuning).
 */
export const PS_MODES = ["interactive", "read-and-diagnose"] as const;
export type PsMode = (typeof PS_MODES)[number];

/**
 * What the real Spark engine must support before an item can be published (docs/pyspark/plan.md §5).
 * Tier A: dataframe, sql, rdd, arrow, plans. Tier B: delta, streaming, benchmark, mllib. Tier C: cluster.
 * `none` is a read-and-diagnose item that never runs code.
 */
export const PS_CAPABILITIES = ["none", "dataframe", "sql", "rdd", "arrow", "plans", "delta", "streaming", "benchmark", "mllib", "cluster"] as const;
export type PsCapability = (typeof PS_CAPABILITIES)[number];

/** How a question is graded. Seeds carry a proposed format; authoring may change it (owner decision 2026-10-23). */
export const PS_QUESTION_FORMATS = ["dataframe_coding", "concept_or_trace", "plan_diagnostics", "stateful_pipeline", "streaming"] as const;
export type PsQuestionFormat = (typeof PS_QUESTION_FORMATS)[number];

/** The five seed roles. A scaffold, not a quota: a lesson may use fewer coding roles. */
export const PS_ROLES = ["foundation", "business", "edge", "debugging", "integration"] as const;
export type PsRole = (typeof PS_ROLES)[number];
export type PsDifficulty = "easy" | "medium" | "hard";
export type PsLevel = "beginner" | "intermediate" | "advanced";

export type PsModuleId = `PS-M${string}`;
export type PsLessonId = `PS-L${string}`;
export type PsQuestionId = `PS-Q${string}`;
export type PsProjectId = `PS-P${string}`;
export type PsDatasetId = `PS-D${string}`;
export type PsToolId = `PS-T${string}`;

type Tracked = { status: PsItemStatus; mode: PsMode; requires: PsCapability; prerequisites: string[]; datasets: PsDatasetId[] };

export type PsModuleEntry = { id: PsModuleId; title: string; lessons: PsLessonId[] };
export type PsLessonEntry = Tracked & {
  id: PsLessonId;
  module: PsModuleId;
  title: string;
  slug: string;
  /** Helpful but not needed: shown as related reading, never a lock (docs/pyspark/plan.md §4). */
  related: PsLessonId[];
  questions: PsQuestionId[];
};
export type PsQuestionEntry = Tracked & {
  id: PsQuestionId;
  lesson: PsLessonId;
  module: PsModuleId;
  role: PsRole;
  format: PsQuestionFormat;
  /** From the planning seed. Not calibrated: authoring sets the real difficulty after solver testing. */
  draftDifficulty: PsDifficulty;
};
export type PsMilestoneEntry = Tracked & { id: `${PsProjectId}.m${number}`; title: string };
export type PsProjectEntry = {
  id: PsProjectId;
  title: string;
  slug: string;
  level: PsLevel;
  status: PsItemStatus;
  requires: PsCapability;
  datasets: PsDatasetId[];
  /** Lessons the project builds on. Recommended, not a lock: a project can be opened before they're done. */
  prerequisites: PsLessonId[];
  goal: string;
  /** Output tables the learner's pipeline produces. */
  deliverables: string[];
  /** Authored later, one per step; empty while the project is planned. */
  milestones: PsMilestoneEntry[];
};

/** `ours`: our own synthetic data. `cleared`: licence reviewed and recorded. `review`: can't ship until reviewed. */
export type PsLicenceStatus = "ours" | "cleared" | "review";
export type PsDatasetEntry = {
  id: PsDatasetId;
  title: string;
  kind: "generated" | "external" | "hybrid";
  tables: string[];
  licence: { status: PsLicenceStatus; note: string };
  source?: string;
};
export type PsToolEntry = { id: PsToolId; title: string; status: PsItemStatus; requires: PsCapability };

export type PsRegistry = {
  version: 1;
  modules: PsModuleEntry[];
  lessons: PsLessonEntry[];
  questions: PsQuestionEntry[];
  projects: PsProjectEntry[];
  datasets: PsDatasetEntry[];
  tools: PsToolEntry[];
};
