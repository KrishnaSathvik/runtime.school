import { expect, it } from "vitest";
import { searchResults } from "@/components/shell/search-index";
import { lessons } from "@/content";
import { seoLessonPath } from "@/platform/sql-slugs";

it("sends learning-path search to Learn, not a Progress page", () => {
  const hit = searchResults("learning path").find((item) => item.label === "Learning path");
  expect(hit).toEqual({
    href: "/sql",
    label: "Learning path",
    detail: "Page",
  });
});

it("links a lesson result to the SEO lesson URL", () => {
  const lesson = lessons[1];
  const hit = searchResults(lesson.title).find((item) => item.label === lesson.title);
  expect(hit?.href).toBe(seoLessonPath(1) ?? "/lesson/1");
});
