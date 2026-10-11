import type { PlanValidation } from "@/engine/plan-validation";
export type Challenge = {
  prompt: string;
  answer: string;
  ordered: boolean;
  required: string[] | null;
  planValidation?: PlanValidation | null;
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
  id: number;
  title: string;
  group: number;
  concept: string;
  example: string;
  trap: string;
  hints: string[];
  dataset: string;
  difficulty: string;
  prereq: number[];
  grain: string | null;
  mode: string;
  dialectReference: string | null;
  tasks: Challenge[];
  quiz: Quiz;
  walkthrough: WalkthroughStep[];
};

export type Project = {
  id: number;
  title: string;
  sourceTitle: string;
  description: string;
  dataset: string;
  milestoneIds: number[];
};

export type DatasetInfo = {
  name: string;
  role: string;
  description: string;
  tables: string[];
};

export type PlanComparison = {
  title: string;
  question: string;
  cases: Array<{ label: string; query: string; plan: string }>;
};

export type LabExperiment = {
  id: string;
  title: string;
  description: string;
  sql: string;
};

export type WarehouseNode = {
  title: string;
  body?: string;
  summary?: string;
  detail?: string;
  table?: string;
  lesson?: number;
  tables?: string[];
};

export type ContentPack = {
  version: number;
  counts: {
    modules: number;
    lessons: number;
    challenges: number;
    projects: number;
    datasets: number;
    walkthroughStages: number;
    planComparisons: number;
    quizzes: number;
  };
  seed: string;
  fixtureMutation: string;
  groups: string[];
  moduleDescriptions: string[];
  courseOrder: number[];
  datasetCatalog: Record<string, DatasetInfo>;
  productSchemas: Record<string, unknown>;
  dialectGuide: string[][];
  sourceLinks: [string, string][];
  planComparisons: PlanComparison[];
  warehouseMap: Record<string, WarehouseNode>;
  labExperiments: LabExperiment[];
  playgroundStarters: Record<string, string[]>;
  labLessonIds: number[];
  labLessonPresets: Array<{
    id: number;
    title: string;
    example: string;
    mode: string;
  }>;
  projects: Project[];
  lessons: Lesson[];
};
