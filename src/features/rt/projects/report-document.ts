import type { Project } from "@/content/projects";
import { datasetName, toolDataset } from "@/content/tools/datasets";
import { allFindings, draftPrefix, projectIsComplete, reportSectionKey } from "./evidence";

export function projectReportDocument(project: Project, drafts: Record<string, string>) {
  const source = toolDataset(project.datasetId).metadata.source;
  return {
    title: project.title, role: project.role, level: project.level,
    dataset: datasetName(project.datasetId),
    complete: projectIsComplete(project, drafts),
    learner: drafts[reportSectionKey(project, "certificate-name")]?.trim() ?? "",
    completedAt: drafts[reportSectionKey(project, "completed-at")] ?? "",
    sections: project.reportTemplate.sections.map(s => ({ title: s.title, text: drafts[reportSectionKey(project, s.id)]?.trim() || "Not written yet." })),
    synthesis: project.stages.filter(s => s.type === "synthesis").flatMap(s => [
      { title: s.title, text: drafts[`${draftPrefix(project, s.id)}-finding`] ?? "" },
      { title: "Priorities", text: drafts[`${draftPrefix(project, s.id)}-priority`] ?? "" },
      { title: "Uncertainty", text: drafts[`${draftPrefix(project, s.id)}-limitations`] ?? "" },
    ]).filter(s => s.text.trim()),
    findings: allFindings(project, drafts).filter(f => drafts[reportSectionKey(project, `include-${f.id}`)] !== "no").map(f => ({
      title: f.stage.title, text: drafts[reportSectionKey(project, `finding-${f.id}`)] ?? f.finding,
      query: f.query, result: f.result, total: f.total, stageNumber: f.stageNumber,
    })),
    source: source.attribution, sourceUrl: source.url,
  };
}
export type ReportDocument = ReturnType<typeof projectReportDocument>;
export function completionDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}
