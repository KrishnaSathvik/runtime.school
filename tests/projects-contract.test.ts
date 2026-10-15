import { describe, expect, it } from "vitest";
import { getProject } from "@/content/projects";
import { resolveSqlProjectSlug } from "@/content/projects/paths";
import { draftPrefix, fingerprint, reportSectionKey, savedFindings, stageIsComplete } from "@/features/rt/projects/evidence";
import { priorBuildSql } from "@/features/rt/projects/build";

const project = getProject("trusted-retail-warehouse")!;
const evidence = { query: "SELECT 1 AS n", queryFingerprint: "SELECT 1 AS n", result: { columns: ["n"], values: [[1]] }, total: 1, savedAt: "2026-10-15", checkPassed: true, finding: "A useful observation.", id: "finding-1" };

describe("project UX contract", () => {
  it("resolves projects by id and gives every project a three-part report", () => {
    expect(resolveSqlProjectSlug(project.id)).toBe(project);
    expect(project.reportTemplate.sections.map((s) => s.title)).toEqual(["Engineering summary", "Validation results", "Known limitations"]);
  });

  it("keys drafts by project and stage only, with no dataset version", () => {
    expect(draftPrefix(project, "profile")).toBe("sql-project-trusted-retail-warehouse-profile");
    expect(reportSectionKey(project, "report")).toBe("sql-project-trusted-retail-warehouse-report-report");
  });

  it("does not confuse meaningful whitespace inside SQL literals", () => {
    expect(fingerprint("SELECT 'a  b'")).not.toBe(fingerprint("SELECT 'a b'"));
  });

  it("counts saved exploration findings, not runs or unsaved text", () => {
    const stage = { ...project.stages[2], id: "explore", type: "exploration" as const, validation: { kind: "exploration" as const, minimumEvidence: 2 } };
    const prefix = draftPrefix(project, stage.id);
    const drafts: Record<string, string> = { [`${prefix}-sql`]: evidence.query, [`${prefix}-evidence`]: JSON.stringify(evidence), [`${prefix}-finding`]: evidence.finding, [`${prefix}-findings`]: JSON.stringify([evidence]) };
    expect(stageIsComplete(stage, drafts, prefix, project)).toBe(false);
    drafts[`${prefix}-findings`] = JSON.stringify([evidence, { ...evidence, id: "finding-2" }]);
    expect(stageIsComplete(stage, drafts, prefix, project)).toBe(true);
    drafts[`${prefix}-sql`] = "SELECT 2";
    expect(savedFindings(drafts, prefix)).toHaveLength(2);
    expect(stageIsComplete(stage, drafts, prefix, project)).toBe(true);
  });

  it("replays only validated earlier build scripts", () => {
    const prefix = draftPrefix(project, "build-staging");
    const later = project.stages.findIndex((s) => s.id === "build-dimensions");
    expect(priorBuildSql(project, later, { [`${prefix}-evidence`]: JSON.stringify({ ...evidence, checkPassed: false }) })).toBe("");
    expect(priorBuildSql(project, later, { [`${prefix}-evidence`]: JSON.stringify(evidence) })).toContain(evidence.query);
  });
});
