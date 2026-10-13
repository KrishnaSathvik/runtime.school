import { beforeEach, describe, expect, it } from "vitest";
import { lessons, projects } from "@/content";
import {
  projectReport,
  projectReportPdf,
  reportFilename,
  reportReadiness,
  persistableResult,
} from "@/features/projects/deliverables";
import { useLearning } from "@/lib/learning-state";

function store() {
  return useLearning.getState();
}

function completeMilestoneSql(projectId: number, lessonId: number) {
  for (const v of [0, 1] as const) {
    store().recordCheck({
      lessonId,
      variant: v,
      project: projectId,
      ok: true,
      guided: false,
      query: `SELECT ${v} AS n`,
      result: { columns: ["n"], values: [[v]] },
      category: null,
    });
  }
  store().completeQuiz(lessonId, projectId, lessons[lessonId].quiz.correct);
}

beforeEach(() => {
  store().resetProgress();
});

describe("project report readiness", () => {
  it("is empty with no work and explains why download stays disabled", () => {
    const p = projects[0];
    const r = reportReadiness(p, undefined);
    expect(r.kind).toBe("empty");
    expect(r.hasAnyWork).toBe(false);
    expect(r.missing[0]).toMatch(/Check at least one SQL|write a finding/i);
  });

  it("is draft when SQL is complete without findings", () => {
    const p = projects[0];
    const id = p.milestoneIds[0];
    completeMilestoneSql(0, id);
    const ready = reportReadiness(p, store().projects[0]);
    expect(ready.kind).toBe("draft");
    expect(ready.missing.some((m) => /Write a finding/i.test(m))).toBe(true);
    expect(projectReport(p, store().projects[0])).toMatch(/_Draft report_/);
  });

  it("is complete only when every milestone is done with a finding", () => {
    const p = projects[0];
    for (const id of p.milestoneIds) {
      completeMilestoneSql(0, id);
      store().setMilestoneNotes(0, id, `Finding for ${id}`);
    }
    const ready = reportReadiness(p, store().projects[0]);
    expect(ready.kind).toBe("complete");
    expect(ready.missing).toEqual([]);
    expect(projectReport(p, store().projects[0])).toMatch(/_Complete report_/);
    expect(reportFilename(p, "complete", "md")).toMatch(/complete-report\.md$/);
  });
});

describe("verified evidence provenance", () => {
  it("keeps verified SQL when a later failed check runs", () => {
    const p = projects[0];
    const id = p.milestoneIds[0];
    store().recordCheck({
      lessonId: id,
      variant: 0,
      project: 0,
      ok: true,
      guided: false,
      query: "SELECT 'good' AS x",
      result: { columns: ["x"], values: [["good"]] },
      category: null,
    });
    store().recordCheck({
      lessonId: id,
      variant: 0,
      project: 0,
      ok: false,
      guided: false,
      query: "SELECT 'bad' AS x",
      result: { columns: ["x"], values: [["bad"]] },
      category: "Values or relationships",
    });
    const m = store().projects[0].milestones[id];
    expect(m.queries[0]).toBe("SELECT 'bad' AS x");
    const r = m.results[0] as { ok: boolean; sql: string; values: unknown[][] };
    expect(r.ok).toBe(true);
    expect(r.sql).toBe("SELECT 'good' AS x");
    expect(r.values).toEqual([["good"]]);
    const report = projectReport(p, store().projects[0]);
    expect(report).toContain("SELECT 'good' AS x");
    expect(report).toMatch(/Editor draft changed after this check/i);
  });

  it("records truncation honestly above the storage cap", () => {
    const rows = Array.from({ length: 120 }, (_, i) => [i]);
    const saved = persistableResult(
      { columns: ["n"], values: rows },
      { ok: true, guided: false, sql: "SELECT n FROM t" },
    );
    expect(saved.truncated).toBe(true);
    expect(saved.values).toHaveLength(100);
    expect(saved.rowCount).toBe(120);
    expect(saved.sql).toBe("SELECT n FROM t");
  });
});

describe("PDF and Markdown exports for all five projects", () => {
  it.each(projects.map((p) => [p.id, p.title] as const))(
    "project %i %s produces labeled MD and a non-empty PDF",
    (pid) => {
      const p = projects[pid];
      const id = p.milestoneIds[0];
      store().resetProgress();
      store().setMilestoneNotes(pid, id, "Learner interpretation only.");
      store().recordCheck({
        lessonId: id,
        variant: 0,
        project: pid,
        ok: true,
        guided: true,
        query: "SELECT 1 AS evidence",
        result: { columns: ["evidence"], values: [[1]] },
        category: null,
      });
      const rec = store().projects[pid];
      const md = projectReport(p, rec);
      expect(md).toContain(p.title);
      expect(md).toContain("Learner interpretation only.");
      expect(md).toContain("SELECT 1 AS evidence");
      expect(md).toMatch(/_Draft report_/);
      const pdf = projectReportPdf(p, rec);
      expect(pdf.byteLength).toBeGreaterThan(200);
      expect(new TextDecoder().decode(pdf.slice(0, 8))).toBe("%PDF-1.4");
    },
  );
});
