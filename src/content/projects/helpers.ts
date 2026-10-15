import type {
  Project,
  ProjectHint,
  ProjectReportSection,
  ProjectScaffolding,
  ProjectStage,
  ProjectStageCompletion,
  ProjectStageValidation,
} from "./types";

export const validationNone: ProjectStageValidation = { kind: "none" };

export const completionOpen: ProjectStageCompletion = {
  requiresValidation: false,
  requiresFinding: false,
  requiresEvidence: false,
};

export const completionChecked: ProjectStageCompletion = {
  requiresValidation: true,
  requiresFinding: true,
  requiresEvidence: true,
};

export const completionExplored: ProjectStageCompletion = {
  requiresValidation: false,
  requiresFinding: true,
  requiresEvidence: true,
};

export const completionWritten: ProjectStageCompletion = {
  requiresValidation: false,
  requiresFinding: true,
  requiresEvidence: false,
};

export function hints(...texts: string[]): ProjectHint[] {
  return texts.map((text, i) => ({
    level: Math.min(i + 1, 3) as 1 | 2 | 3,
    text,
  }));
}

export function checkpoint(args: {
  expectedColumns: string[];
  grain: string;
  ordered: boolean;
  referenceId: string;
  invariants?: string[];
}): ProjectStageValidation {
  return { kind: "checkpoint", ...args };
}

export function exploration(minimumEvidence = 1): ProjectStageValidation {
  return { kind: "exploration", minimumEvidence };
}

export function stage(
  partial: Omit<ProjectStage, "hints" | "validation" | "completion" | "relevantTables"> & {
    relevantTables?: string[];
    validation?: ProjectStageValidation;
    hints?: ProjectHint[];
    completion?: ProjectStageCompletion;
    scaffolding?: ProjectScaffolding;
  },
): ProjectStage {
  const {
    relevantTables = [],
    validation = validationNone,
    hints: stageHints = [],
    completion = completionOpen,
    ...rest
  } = partial;
  return {
    ...rest,
    relevantTables,
    validation,
    hints: stageHints,
    completion: rest.type === "synthesis" ? completionWritten : rest.type === "build" ? completionChecked : completion,
  };
}

export function reportSections(
  rows: Array<[id: string, title: string, prompt: string, required: boolean, allowEvidence: boolean]>,
): ProjectReportSection[] {
  return rows.map(([id, title, prompt, required, allowEvidence]) => ({
    id,
    title,
    prompt,
    required,
    allowEvidence,
  }));
}

/** One writing box for the final report stage — keeps Projects light compared with multi-section forms. */
export function singleReport(prompt: string): { sections: ProjectReportSection[] } {
  return {
    sections: reportSections([["report", "Your report", prompt, true, true]]),
  };
}

/** A graded checkpoint: one business question, its exact output contract and the hidden reference answer. */
export type CheckpointSpec = {
  id: string;
  title: string;
  context: string;
  investigation: string;
  tables: string[];
  columns: string[];
  grain: string;
  ordered: boolean;
  definitions: string[];
  guidance?: string[];
  hints: string[];
  finding: string;
  /** Hidden reference SQL. Graded on the original data and on the dataset's changed-data fixture. */
  sql: string;
};

/** A build step (warehouse projects): validated by rules in features/rt/projects/build.ts. */
export type BuildSpec = {
  id: string;
  title: string;
  context: string;
  investigation: string;
  tables: string[];
  definitions: string[];
  hints: string[];
  finding: string;
};

export type ProjectSpec = Omit<Project, "stages" | "reportTemplate"> & {
  understand: { title: string; context: string; investigation: string };
  steps: Array<({ kind: "checkpoint" } & CheckpointSpec) | ({ kind: "build" } & BuildSpec)>;
  synthesis: { title: string; investigation: string; reviewPrompt: string };
  report: { context: string; investigation: string; summary: string; recommendation: string; limitations: string; titles?: [string, string, string] };
};

/** Builds a project and its hidden reference answers from one spec, so stage ids and reference ids cannot drift. */
export function defineProject(spec: ProjectSpec): { project: Project; references: Record<string, string> } {
  const references: Record<string, string> = {};
  const { understand, steps, synthesis, report, ...meta } = spec;
  const stages: ProjectStage[] = [
    stage({ id: "brief", title: "Project brief", type: "orientation", context: meta.brief.situation, investigation: meta.brief.ask }),
    stage({ id: "understand-data", title: understand.title, type: "orientation", context: understand.context, investigation: understand.investigation, relevantTables: meta.relevantTables }),
    ...steps.map((s) => {
      if (s.kind === "build") {
        return stage({
          id: s.id, title: s.title, type: "build", context: s.context, investigation: s.investigation, relevantTables: s.tables,
          hints: hints(...s.hints), findingPrompt: s.finding, scaffolding: { metricDefinitions: s.definitions },
        });
      }
      const referenceId = `${meta.id}-${s.id}`;
      references[referenceId] = s.sql.trim();
      return stage({
        id: s.id, title: s.title, type: "checkpoint", context: s.context, investigation: s.investigation, relevantTables: s.tables,
        expectedEvidence: { description: s.investigation, grain: s.grain, columns: s.columns },
        validation: checkpoint({ expectedColumns: s.columns, grain: s.grain, ordered: s.ordered, referenceId }),
        hints: hints(...s.hints), findingPrompt: s.finding,
        scaffolding: { metricDefinitions: s.definitions, guidance: s.guidance },
        completion: completionChecked,
      });
    }),
    stage({ id: "synthesis", title: synthesis.title, type: "synthesis", context: "Separate what the data shows from what it cannot establish.", investigation: synthesis.investigation, reviewPrompt: synthesis.reviewPrompt }),
    stage({ id: "report", title: "Report", type: "report", context: report.context, investigation: report.investigation }),
  ];
  const [summary, recommendation, limitations] = report.titles ?? [
    meta.level === "beginner" ? "Summary" : "Executive summary",
    meta.level === "advanced" ? "Priority actions" : "Recommendation",
    "Limitations",
  ];
  return {
    project: {
      ...meta,
      stages,
      reportTemplate: {
        sections: reportSections([
          ["report", summary, report.summary, true, true],
          ["recommendation", recommendation, report.recommendation, true, true],
          ["limitations", limitations, report.limitations, true, true],
        ]),
      },
    },
    references,
  };
}
