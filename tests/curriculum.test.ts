import { describe, expect, it } from "vitest";
import {
  content,
  counts,
  courseOrder,
  dialectGuide,
  groups,
  labExperiments,
  lessons,
  planComparisons,
  projects,
} from "@/content";

describe("curriculum completeness", () => {
  it("matches verified source inventory counts", () => {
    expect(counts.modules).toBe(10);
    expect(counts.lessons).toBe(88);
    expect(counts.challenges).toBe(176);
    expect(counts.projects).toBe(5);
    expect(counts.datasets).toBe(7);
    expect(counts.walkthroughStages).toBe(204);
    expect(counts.quizzes).toBe(88);
    expect(counts.planComparisons).toBe(planComparisons.length);
    expect(planComparisons.length).toBeGreaterThanOrEqual(10);
  });

  it("has unique lesson ids and complete course order", () => {
    expect(lessons).toHaveLength(88);
    expect(new Set(lessons.map((l) => l.id)).size).toBe(88);
    expect(courseOrder).toHaveLength(88);
    expect(new Set(courseOrder).size).toBe(88);
    expect(groups).toHaveLength(10);
  });

  it("gives every lesson two challenges and a quiz", () => {
    for (const lesson of lessons) {
      expect(lesson.tasks).toHaveLength(2);
      expect(lesson.quiz?.options?.length).toBeGreaterThanOrEqual(2);
      expect(typeof lesson.quiz.correct).toBe("number");
    }
    expect(lessons.reduce((n, l) => n + l.tasks.length, 0)).toBe(176);
  });

  it("preserves five projects with milestones", () => {
    expect(projects).toHaveLength(5);
    expect(projects.map((p) => p.title)).toEqual([
      "Video Product Analytics",
      "Social Product Analytics",
      "AI Platform Economics",
      "Warehouse and Reporting",
      "CRM + ERP Integration",
    ]);
    for (const project of projects) {
      expect(project.milestoneIds.length).toBeGreaterThan(0);
      for (const id of project.milestoneIds) {
        expect(lessons[id]).toBeTruthy();
      }
    }
  });

  it("includes exploratory tool content", () => {
    expect(planComparisons.every((p) => p.takeaway && p.cases.length === 2)).toBe(true);
    expect(dialectGuide.length).toBeGreaterThan(5);
    expect(labExperiments.length).toBeGreaterThan(5);
    expect(content.seed.length).toBeGreaterThan(1000);
    expect(content.fixtureMutation.length).toBeGreaterThan(10);
  });
});
