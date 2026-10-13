import { describe, expect, it } from "vitest";
import { lessons } from "@/content";
import {
  allSqlLessonSlugs,
  lessonIdForSlug,
  seoLessonPath,
  slugForLessonId,
} from "@/platform/sql-slugs";
import { isLessonRefMastered } from "@/platform/progress-adapter";
import { lessonRef, subjectFromPath, subjects } from "@/platform/subjects";
import { migrateLearning } from "@/lib/learning-state";

describe("platform subject registry", () => {
  it("marks only SQL as available", () => {
    expect(subjects.filter((s) => s.availability === "available").map((s) => s.id)).toEqual(["sql"]);
    expect(subjects.find((s) => s.id === "python")?.availability).toBe("next");
  });

  it("infers SQL subject from legacy and new routes", () => {
    expect(subjectFromPath("/lesson/3")).toBe("sql");
    expect(subjectFromPath("/learn/sql/filter-with-where")).toBe("sql");
    expect(subjectFromPath("/practice/questions")).toBe("sql");
    expect(subjectFromPath("/projects/2")).toBe("sql");
    expect(subjectFromPath("/sql")).toBe("sql");
    // The landing page lists every subject, so it belongs to none.
    expect(subjectFromPath("/")).toBeNull();
    expect(subjectFromPath("/practice")).toBe("sql");
    expect(subjectFromPath("/settings")).toBe("sql");
  });
});

describe("SQL lesson slug map", () => {
  it("covers every lesson with a stable bidirectional map", () => {
    expect(allSqlLessonSlugs()).toHaveLength(lessons.length);
    for (const lesson of lessons) {
      const slug = slugForLessonId(lesson.id);
      expect(slug).toBeTruthy();
      expect(lessonIdForSlug(slug!)).toBe(lesson.id);
      expect(seoLessonPath(lesson.id)).toBe(`/learn/sql/${slug}`);
    }
    expect(slugForLessonId(3)).toBe("filter-with-where");
  });
});

describe("progress adapter", () => {
  it("reads sql:N mastery from existing stats without migrating storage", () => {
    const state = migrateLearning({ version: 3 });
    expect(isLessonRefMastered(state, lessonRef("sql", 3))).toBe(false);
    state.stats["3"] = {
      attempts: 2,
      correct: 2,
      solved: [0, 1],
      last: Date.now(),
      errors: 0,
      check: true,
      legacy: false,
      masteredAt: Date.now(),
      categories: {},
      quizAttempts: 1,
    };
    expect(isLessonRefMastered(state, "sql:3")).toBe(true);
    expect(isLessonRefMastered(state, "python:variables-and-values")).toBe(false);
  });
});
