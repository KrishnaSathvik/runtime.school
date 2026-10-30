/**
 * The PySpark course as the app shows it: the registry joined to written lessons, items and built dataset snapshots.
 *
 * What a learner can see depends on status (docs/pyspark/plan.md §6): a production build shows `published` only; local
 * development also shows everything else, marked "in review" (tests-pass, reviewed) or "planned" (not written). An item
 * is runnable only when it's written and a real Spark runner is connected; nothing planned is ever runnable.
 */
import { pysparkInspect } from "@/platform/pyspark-flag";
import { psRegistry } from "./registry";
import type { PsDatasetEntry, PsItemStatus, PsLessonEntry, PsLevel, PsMilestoneEntry, PsModuleEntry, PsProjectEntry, PsQuestionEntry, PsRole } from "./types";
import { DATASET_FILES, ITEM_FILES, LESSON_FILES, PROJECT_FILES } from "./generated";

export * from "./paths";

export type PsShown = "published" | "in-review" | "planned";

/** How an item is shown: published, in review (written and tested, local only), or planned (not written). */
export function shownAs(status: PsItemStatus): PsShown {
  if (status === "published") return "published";
  return status === "tests-pass" || status === "reviewed" ? "in-review" : "planned";
}

/** Whether this build may show an item with this status at all. */
export const visible = (status: PsItemStatus, inspect = pysparkInspect()) => status === "published" || inspect;

// ---------------------------------------------------------------- datasets

export type PsEdition = "lesson" | "practice" | "project";
export type PsColumn = { name: string; type: string; nullable?: boolean };
export type PsTableSnapshot = {
  note: string;
  columns: PsColumn[];
  key: string[];
  rows: Record<string, number>;
  lesson: (string | null)[][];
  practice_head: (string | null)[][];
  project_head?: (string | null)[][];
};
export type PsDatasetSnapshot = { id: string; version: string; title: string; rules: string[]; relationships: { from: string; to: string }[]; tables: Record<string, PsTableSnapshot> };
export type PsDataset = PsDatasetEntry & { built: PsDatasetSnapshot | null };

const SNAPSHOTS = DATASET_FILES as Record<string, PsDatasetSnapshot>;

export const psDatasets: PsDataset[] = psRegistry.datasets.map((d) => ({ ...d, built: SNAPSHOTS[d.id] ?? null }));
export const psDataset = (id: string) => psDatasets.find((d) => d.id === id);
/** `d01` → the dataset. */
export const psDatasetBySlug = (slug: string) => psDatasets.find((d) => d.id === `PS-${slug.toUpperCase()}`);

/** The rows of one table in one edition that a page may show: all of the lesson table, the first rows otherwise. */
export function editionRows(t: PsTableSnapshot, edition: PsEdition) {
  return edition === "lesson" ? t.lesson : edition === "practice" ? t.practice_head : t.project_head ?? [];
}
export const EDITION_LABEL: Record<PsEdition, string> = { lesson: "lesson table", practice: "practice table", project: "project export" };

/** Only editions with actual files, not the planned editions of a domain. */
export function datasetEditions(d: PsDataset): PsEdition[] {
  return (["lesson", "practice", "project"] as PsEdition[]).filter((e) => d.built && Object.values(d.built.tables).every((t) => t.rows[e] !== undefined));
}

// ---------------------------------------------------------------- items (questions, lesson challenges, project steps)

/** Tables a step or project takes from a second dataset (projects that join two domains); names never collide. */
export type PsAlso = { id: string; version: string; tables: string[] };

/** An item's public spec: what the page shows and the runner reads (the runner keeps the private parts). */
export type PsItemSpec = {
  id: string;
  /** `dataframe` (default): write a function that returns a DataFrame. `predict`: read a program, type what it prints. */
  kind?: "dataframe" | "predict";
  /** predict: the program to read, run on `edition` of the dataset. */
  program?: string;
  edition?: PsEdition;
  slug: string;
  lesson?: string;
  project?: string;
  milestone?: string;
  difficulty: "easy" | "medium" | "hard";
  minutes: number;
  title: string;
  dataset: { id: string; version: string };
  also?: PsAlso[];
  prompt: string;
  rules: string[];
  hints: string[];
  explanation?: string;
  entry: string;
  inputs: string[];
  file?: string;
  starter?: string;
  /** For a later project step: code added to the learner's file when they first open the step. */
  append?: string;
  prerequisites?: string[];
  output: { columns: string[]; order_sensitive: boolean };
  /** A visible case runs on a dataset edition, or on the item's own small sample tables (`sample: true`). */
  visible: { id: string; edition?: string; sample?: boolean }[];
};
export type PsExpected = {
  visible: Record<string, {
    schema: { name: string; type: string; nullable: boolean }[];
    rows: unknown[][];
    row_count?: number;
    /** The item's own sample tables, when the case doesn't use an edition: every row, in the dataset's column order. */
    inputs?: Record<string, (string | null)[][]>;
  }>;
  hidden: string[];
  /** predict: what the program printed on real Spark. */
  output?: string;
};

/** Compare a typed prediction with real output: trailing spaces on each line and trailing blank lines don't count. */
export function samePrinted(a: string, b: string): boolean {
  const norm = (s: string) => s.replace(/\r/g, "").split("\n").map((l) => l.replace(/\s+$/, "")).join("\n").replace(/\n+$/, "");
  return norm(a) === norm(b);
}
export type PsItem = { spec: PsItemSpec; expected: PsExpected };

const ITEMS: Record<string, PsItem> = Object.fromEntries((ITEM_FILES as [PsItemSpec, PsExpected][]).map(([spec, expected]) => [spec.id, { spec, expected }]));
export const psItem = (id: string): PsItem | undefined => ITEMS[id];

/** Whether an item returns its input table's columns unchanged (then the brief needn't list them). */
export function keepsInputColumns(spec: PsItemSpec): boolean {
  const table = SNAPSHOTS[spec.dataset.id]?.tables[spec.inputs[0]];
  return !!table && spec.inputs.length === 1 && table.columns.map((c) => c.name).join() === spec.output.columns.join();
}

// ---------------------------------------------------------------- lessons

export type PsExampleBlock = { kind: "example" | "error-example"; id: string; title: string; code: string; note?: string; error?: string };
export type PsLessonBlock = { kind: "text"; md: string } | PsExampleBlock;
export type PsLessonContent = {
  id: string;
  minutes: number;
  lede: string;
  objectives: string[];
  dataset: { id: string; version: string; edition: PsEdition; tables: string[] };
  blocks: PsLessonBlock[];
  challenges: string[];
  concept: { id: string; prompt: string; choices: string[]; answer: number; why: string }[];
  review: string[];
  practice: string[];
};
export type PsRecorded = { engine: { spark: string } | null; examples: Record<string, { stdout: string; error: { type: string; message: string; line?: number | null; condition?: string | null } | null }> };

const LESSON_CONTENT: Record<string, { content: PsLessonContent; recorded: PsRecorded }> = Object.fromEntries(
  Object.entries(LESSON_FILES as Record<string, [PsLessonContent, PsRecorded]>).map(([id, [content, recorded]]) => [id, { content, recorded }]),
);

export const levelOf = (module: string): PsLevel => {
  const n = Number(module.slice(4));
  return n <= 6 ? "beginner" : n <= 10 ? "intermediate" : "advanced";
};

export type PsLesson = PsLessonEntry & { number: number; moduleEntry: PsModuleEntry; shown: PsShown; written: { content: PsLessonContent; recorded: PsRecorded } | null };

export const psLessons: PsLesson[] = psRegistry.lessons
  .map((l, i) => {
    const shown = shownAs(l.status);
    return { ...l, number: i + 1, moduleEntry: psRegistry.modules.find((m) => m.id === l.module)!, shown, written: shown === "planned" ? null : LESSON_CONTENT[l.id] ?? null };
  })
  .filter((l) => visible(l.status));
export const psLesson = (id: string) => psLessons.find((l) => l.id === id);
export const psLessonBySlug = (slug: string) => psLessons.find((l) => l.slug === slug);

// ---------------------------------------------------------------- questions

export const ROLE_LABEL: Record<PsRole, string> = { foundation: "Foundation", business: "Business task", edge: "Edge cases", debugging: "Debugging", integration: "Integration" };

export type PsQuestion = PsQuestionEntry & {
  number: number;
  slug: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  lessonEntry: PsLessonEntry;
  shown: PsShown;
  authored: PsItem | null;
};

export const psQuestions: PsQuestion[] = psRegistry.questions
  .map((q, i) => {
    const shown = shownAs(q.status);
    const a = shown === "planned" ? null : ITEMS[q.id] ?? null;
    const lesson = psRegistry.lessons.find((l) => l.id === q.lesson)!;
    return {
      ...q,
      number: i + 1,
      slug: a?.spec.slug ?? q.id.replace(/^PS-/, "").toLowerCase(),
      title: a?.spec.title ?? `${lesson.title}: ${ROLE_LABEL[q.role].toLowerCase()}`,
      difficulty: a?.spec.difficulty ?? q.draftDifficulty,
      lessonEntry: lesson,
      shown,
      authored: a,
    };
  })
  .filter((q) => visible(q.status));
export const psQuestionBySlug = (slug: string) => psQuestions.find((q) => q.slug === slug);
/** Questions that have been written (anything past planned), in course order. */
export const authoredQuestions = () => psQuestions.filter((q) => q.authored);

// ---------------------------------------------------------------- projects

export type PsStep = PsMilestoneEntry & { number: number; shown: PsShown; item: PsItem | null };
/** A table the pipeline produces: the function that returns it, its inputs, and the step that writes it. */
export type PsArtifact = { name: string; entry?: string; inputs: string[]; step: number; about: string; deliverable?: boolean };
/** A project's workspace definition (src/content/pyspark/projects/<id>.json); the runner reads the same file. */
export type PsProjectDef = {
  id: string;
  workspace: "guided" | "pipeline" | "engineering";
  file: string;
  dataset: { id: string; version: string; edition: PsEdition };
  also?: PsAlso[];
  inputs: string[];
  task: string;
  skills: string[];
  problems: string[];
  revenue?: string;
  milestones: { step: number; summary: string; label: string }[];
  artifacts: PsArtifact[];
};
export type PsProject = PsProjectEntry & { shown: PsShown; steps: PsStep[]; def: PsProjectDef | null };

const PROJECT_DEFS = PROJECT_FILES as Record<string, PsProjectDef>;

export const psProjects: PsProject[] = psRegistry.projects
  .map((p) => {
    const steps = p.milestones.map((m, i) => {
      const shown = shownAs(m.status);
      return { ...m, number: i + 1, shown, item: shown === "planned" ? null : ITEMS[`${p.id}-M${i + 1}`] ?? null };
    });
    // A project with written steps is in review, even while its later steps are planned.
    const shown: PsShown = shownAs(p.status) === "published" ? "published" : steps.some((s) => s.shown !== "planned") ? "in-review" : "planned";
    return { ...p, shown, steps, def: PROJECT_DEFS[p.id] ?? null };
  })
  .filter((p) => visible(p.status) || p.steps.some((s) => visible(s.status) && s.shown !== "planned"));
export const psProjectBySlug = (slug: string) => psProjects.find((p) => p.slug === slug);

// ---------------------------------------------------------------- tools

/** Tools that work in this build. The rest are listed as unavailable, never as working. */
export const LIVE_TOOLS = new Set(psRegistry.tools.filter((t) => ["tests-pass", "reviewed", "published"].includes(t.status)).map((t) => t.id));

/** Every visible lesson, question and project that uses a dataset. */
export function usesOf(datasetId: string) {
  // Written items first, then planned ones, each in course order.
  const firstWritten = <T extends { shown: PsShown }>(xs: T[]) => [...xs.filter((x) => x.shown !== "planned"), ...xs.filter((x) => x.shown === "planned")];
  return {
    lessons: firstWritten(psLessons.filter((l) => l.datasets.includes(datasetId as never))),
    questions: psQuestions.filter((q) => q.datasets.includes(datasetId as never)),
    projects: psProjects.filter((p) => p.datasets.includes(datasetId as never)),
  };
}
