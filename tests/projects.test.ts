import { beforeAll, describe, expect, it } from "vitest";
import { content, playgroundPresets, projects, lessons } from "@/content";
import { projectReport } from "@/features/projects/deliverables";
import { practiceDatasets, practiceSeed } from "@/content/question-bank";
import { bootWorker, type WorkerResponse } from "./helpers/original";

let send: (d: Record<string, unknown>) => Promise<WorkerResponse>;
beforeAll(async () => {
  send = await bootWorker();
});

describe("projects: every milestone is executable in its workspace", () => {
  it.each(projects.map((p) => [p.id, p.title] as const))(
    "project %i %s — each milestone's dataset, example and both checks work",
    async (pid) => {
      const p = projects[pid];
      for (const id of p.milestoneIds) {
        const l = lessons[id];
        expect(content.datasetCatalog[l.dataset]).toBeTruthy();
        const ex = await send({ seed: content.seed, query: l.example, allowWrites: l.mode === "lab" });
        expect(ex.error, `${l.title} example`).toBeUndefined();
        for (const v of [0, 1]) {
          const t = l.tasks[v];
          const r = await send({
            seed: content.seed, query: t.answer, answer: t.answer, ordered: t.ordered,
            mutation: content.fixtureMutation, allowWrites: l.mode === "lab",
            validate: t.validate, required: t.required,
          });
          expect(r.grade?.ok, `${l.title} ${v}`).toBe(true);
        }
      }
    },
  );
});

describe("project deliverables export", () => {
  it("includes saved queries, status and checked results", () => {
    const p = projects[0];
    const [a, b] = p.milestoneIds;
    const report = projectReport(p, {
      started: 1,
      last: a,
      milestones: {
        [a]: {
          solved: [0, 1], check: true, updated: 1,
          queries: { 0: "SELECT day FROM t", 1: "SELECT 2" },
          results: { 0: { ok: true, guided: false, columns: ["day", "n|x"], values: [["2025-01-01", null]] }, 1: { ok: true } },
        },
        [b]: { solved: [], check: false, updated: 1, queries: { 0: "SELECT bad" }, results: { 0: { ok: false, columns: [], values: [] } } },
      },
    }, new Date("2026-01-01T00:00:00Z"));
    expect(report).toContain(`# ${p.title}`);
    expect(report).toContain("Milestones completed: 1 of 4");
    expect(report).toContain("Status: Completed · concept check passed");
    expect(report).toContain("```sql\nSELECT day FROM t\n```");
    expect(report).toContain("| day | n\\|x |");
    expect(report).toContain("| 2025-01-01 | NULL |");
    expect(report).toContain("_checked, not yet correct_");
    expect(report).toContain("_not attempted_");
  });
});

describe("Playground starter questions run on their dataset", () => {
  it.each(Object.entries(playgroundPresets))("%s presets execute read-only", async (ds, presets) => {
    expect(practiceDatasets[ds]).toBeTruthy();
    for (const p of presets) {
      const r = await send({ seed: practiceSeed, query: p.query, allowWrites: ds === "lab" });
      expect(r.error, `${ds}: ${p.label}`).toBeUndefined();
      expect(r.result.columns.length).toBeGreaterThan(0);
    }
  });
});
