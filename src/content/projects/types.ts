import type { CanonicalDatasetId } from "@/data/datasets/learning-map";
/**
 * Compile-time contract for Runtime SQL Projects.
 * Human-readable source: docs/sql-rebuild/PROJECT_MANIFEST.md
 * Typed catalog: src/content/projects/{beginner,intermediate,advanced}.ts
 * Stage UX and completion rules: docs/sql-rebuild/PROJECT_STAGE_UX_CONTRACT.md.
 */

export type ProjectLevel = "beginner" | "intermediate" | "advanced";

export type ProjectStageType =
  | "orientation"
  | "checkpoint"
  | "exploration"
  | "build"
  | "synthesis"
  | "report";

export type ProjectStageValidation =
  | {
      kind: "none";
    }
  | {
      kind: "checkpoint";
      expectedColumns: string[];
      grain: string;
      ordered: boolean;
      /** Hidden reference definition id; never shown to learners. */
      referenceId: string;
      invariants?: string[];
    }
  | {
      kind: "exploration";
      minimumEvidence: number;
    };

export type ProjectHint = {
  level: 1 | 2 | 3;
  text: string;
};

export type ProjectScaffolding = {
  metricDefinitions?: string[];
  expectedGrain?: string;
  expectedColumns?: string[];
  guidance?: string[];
};

export type ProjectStageCompletion = {
  requiresValidation: boolean;
  requiresFinding: boolean;
  requiresEvidence: boolean;
};

export type ProjectStage = {
  id: string;
  title: string;
  type: ProjectStageType;
  context: string;
  investigation: string;
  relevantTables: string[];
  expectedEvidence?: {
    description: string;
    grain?: string;
    columns?: string[];
  };
  validation: ProjectStageValidation;
  hints: ProjectHint[];
  findingPrompt?: string;
  /** Project-specific synthesis copy within the shared review layout. */
  reviewPrompt?: string;
  scaffolding?: ProjectScaffolding;
  completion: ProjectStageCompletion;
};

export type ProjectReportSection = {
  id: string;
  title: string;
  prompt: string;
  required: boolean;
  allowEvidence: boolean;
};

export type Project = {
  id: string;
  title: string;
  level: ProjectLevel;
  role: string;
  /** One of the twelve canonical datasets; every query runs on its full data. */
  datasetId: CanonicalDatasetId;
  brief: {
    who: string;
    situation: string;
    ask: string;
    data: string;
    deliverable: string;
  };
  prerequisites: string[];
  placementAfter: string[];
  relevantTables: string[];
  stages: ProjectStage[];
  reportTemplate: {
    sections: ProjectReportSection[];
  };
};
