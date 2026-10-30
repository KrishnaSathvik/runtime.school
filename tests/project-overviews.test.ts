import { describe, expect, it } from "vitest";
import { projects as sqlProjects } from "@/content/projects";
import { sqlLessonLink, sqlOverview } from "@/content/projects/overviews";
import { authoredLessons, authoredProjects } from "@/content/python-v2/content";
import { pyOverview } from "@/content/python-v2/overviews";
import { psProjects } from "@/content/pyspark/content";

// The shared project frame (overview, step bar, review) reads each subject's overview content.
describe("project overviews", () => {
  it("cover every SQL project: a label and a summary per stage after the brief, and lesson links that resolve", () => {
    for (const p of sqlProjects) {
      const o = sqlOverview(p.id);
      expect(o, p.id).toBeTruthy();
      const stages = p.stages.slice(1).map((s) => s.id);
      expect(Object.keys(o!.labels).sort(), p.id).toEqual([...stages].sort());
      expect(Object.keys(o!.summaries).sort(), p.id).toEqual([...stages].sort());
      expect(Object.values(o!.labels).every((l) => l.split(" ").length <= 3 && l !== "Review"), p.id).toBe(true);
      expect(o!.problems.length, p.id).toBeGreaterThan(0);
      for (const slug of o!.preparation) expect(sqlLessonLink(slug), `${p.id} ${slug}`).not.toBeNull();
    }
  });

  it("cover every Python project: a summary per step, and lessons that exist", () => {
    for (const p of authoredProjects) {
      const o = pyOverview(p.id);
      expect(o, p.id).toBeTruthy();
      expect(Object.keys(o!.steps).sort(), p.id).toEqual(p.milestones.map((m) => m.id).sort());
      for (const id of o!.preparation) expect(authoredLessons.some((l) => l.id === id), `${p.id} ${id}`).toBe(true);
    }
  });

  it("give every PySpark step a short bar label", () => {
    for (const p of psProjects.filter((x) => x.def)) {
      expect(p.def!.milestones.map((m) => m.step), p.id).toEqual(p.steps.map((s) => s.number));
      expect(p.def!.milestones.every((m) => !!m.label && m.label.split(" ").length <= 3), p.id).toBe(true);
    }
  });
});
