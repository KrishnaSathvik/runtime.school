import { expect, it } from "vitest";
import { courseOrder, lessons } from "@/content";

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


it("keeps at least 202 walkthrough stages", () => {
  const stages = courseOrder.reduce((n, id) => n + lessons[id].walkthrough.length, 0);
  expect(stages).toBeGreaterThanOrEqual(202);
});
