import type { Project, ProjectStage } from "@/content/projects";
import type { ExecuteResponse } from "@/engine/sql-client";

export type StoredEvidence = {
  query: string;
  result: NonNullable<ExecuteResponse["result"]>;
  total: number;
  queryFingerprint: string;
  savedAt: string;
  checkPassed?: boolean;
};
export type SavedFinding = StoredEvidence & { id: string; finding: string };
export function draftPrefix(project: Project, stageId: string): string {
  return `sql-project-${project.id}-${stageId}`;
}
// Whitespace inside SQL string literals is meaningful.
export function fingerprint(sql: string): string { return sql.trim(); }
export function parseEvidence(raw?: string): StoredEvidence | null {
  try {
    const e = JSON.parse(raw ?? "null") as StoredEvidence | null;
    if (!e || typeof e.query !== "string" || !Array.isArray(e.result?.columns) || !Array.isArray(e.result?.values) || typeof e.total !== "number") return null;
    return { ...e, queryFingerprint: fingerprint(e.query), savedAt: e.savedAt ?? "" };
  } catch { return null; }
}
export function serializeEvidence(e: StoredEvidence): string { return JSON.stringify(e); }
export function currentEvidence(sql: string, raw?: string): StoredEvidence | null {
  const e = parseEvidence(raw);
  return e && fingerprint(e.query) === fingerprint(sql) ? e : null;
}
export function isEvidenceStale(sql: string, raw?: string): boolean {
  const e = parseEvidence(raw);
  return !!e && fingerprint(e.query) !== fingerprint(sql);
}
export function savedFindings(drafts: Record<string, string>, prefix: string): SavedFinding[] {
  try {
    const rows = JSON.parse(drafts[`${prefix}-findings`] ?? "[]");
    return Array.isArray(rows) ? rows.filter((r): r is SavedFinding => !!parseEvidence(JSON.stringify(r)) && typeof r.id === "string" && typeof r.finding === "string" && !!r.finding.trim()) : [];
  } catch { return []; }
}
export function reportSectionKey(project: Project, sectionId: string): string {
  return `sql-project-${project.id}-report-${sectionId}`;
}
export function stageIsComplete(stage: ProjectStage, drafts: Record<string, string>, prefix: string, project?: Project): boolean {
  if (stage.type === "orientation") return drafts[`${prefix}-seen`] === "1";
  if (stage.type === "report" && project) return drafts[`${prefix}-seen`] === "1" && project.reportTemplate.sections.filter(s => s.required).every(s => !!drafts[reportSectionKey(project, s.id)]?.trim());
  const sql = drafts[`${prefix}-sql`] ?? "";
  const finding = (drafts[`${prefix}-finding`] ?? drafts[`${prefix}-notes`] ?? "").trim();
  if (stage.type === "synthesis") return !!finding && (!project || project.level === "beginner" || !!drafts[`${prefix}-priority`]?.trim()) && (!project || project.level !== "advanced" || !!drafts[`${prefix}-limitations`]?.trim());
  const saved = savedFindings(drafts, prefix);
  if (stage.type === "exploration") return saved.length >= (stage.validation.kind === "exploration" ? stage.validation.minimumEvidence : 1);
  const evidence = currentEvidence(sql, drafts[`${prefix}-evidence`]);
  return drafts[`${prefix}-check`] === "pass" && !!evidence?.checkPassed && !!finding && saved.some(s => fingerprint(s.query) === fingerprint(sql) && s.finding.trim() === finding && s.checkPassed);
}
export function completedStageCount(project: Project, drafts: Record<string, string>): number {
  return project.stages.filter(s => stageIsComplete(s, drafts, draftPrefix(project, s.id), project)).length;
}
export function projectIsComplete(project: Project, drafts: Record<string, string>): boolean {
  return completedStageCount(project, drafts) === project.stages.length;
}
export function allFindings(project: Project, drafts: Record<string, string>) {
  return project.stages.flatMap((stage, index) => savedFindings(drafts, draftPrefix(project, stage.id)).map(f => ({ ...f, stage, stageNumber: index + 1 })));
}
