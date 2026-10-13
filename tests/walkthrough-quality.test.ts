import { expect, it } from "vitest";
import { courseOrder, lessons } from "@/content";
import { reviewedWalkthroughIds } from "@/content/reviewed-quizzes";

it("has no remaining Inspect-the-source walkthrough openers", () => {
  const leftovers: number[] = [];
  for (const id of courseOrder) {
    const step = lessons[id].walkthrough[0];
    const title = step.title.toLowerCase();
    const query = step.query.replace(/\s+/g, " ").trim();
    if (
      /inspect the source|inspect the starting state/.test(title) &&
      /^SELECT \* FROM \w+/i.test(query)
    ) {
      leftovers.push(id);
    }
  }
  expect(leftovers).toEqual([]);
});

it("allowlists every rewritten walkthrough for parity", () => {
  expect(new Set(reviewedWalkthroughIds).size).toBe(reviewedWalkthroughIds.length);
  for (const id of reviewedWalkthroughIds) {
    expect(lessons[id].walkthrough[0].title.length).toBeGreaterThan(0);
    expect(lessons[id].walkthrough[0].query.length).toBeGreaterThan(0);
  }
});

it("keeps walkthrough stage count at 204", () => {
  const stages = courseOrder.reduce((n, id) => n + lessons[id].walkthrough.length, 0);
  expect(stages).toBe(204);
});
