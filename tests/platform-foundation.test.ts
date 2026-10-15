import { describe, expect, it } from "vitest";
import { lessons } from "@/content";
import {
  allSqlLessonSlugs,
  lessonIdForSlug,
  seoLessonPath,
  slugForLessonId,
} from "@/platform/sql-slugs";
import { subjects } from "@/platform/subjects";

describe("platform subject registry", () => {
  it("marks only SQL as available", () => {
    expect(subjects.filter((s) => s.availability === "available").map((s) => s.id)).toEqual(["sql"]);
    expect(subjects.find((s) => s.id === "python")?.availability).toBe("next");
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

