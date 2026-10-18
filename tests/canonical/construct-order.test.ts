/**
 * Graded SQL may use only constructs the current lesson, or an earlier lesson, has explained.
 * Practice after lessons 01–09 stays on Retail. Later dataset changes are intentional transfer.
 */
import { describe, expect, it } from "vitest";
import { lessons } from "@/content";
import { bankQuestions } from "@/content/question-bank";
import {
  courseIndex,
  futureConstructs,
  isBeginnerSpine,
  latestCourseIndex,
} from "@/content/canonical/constructs";

describe("construct order", () => {
  it("allows LIMIT only as a non-graded preview", () => {
    const beforeSort = courseIndex(8) - 1;
    expect(futureConstructs("SELECT * FROM customers LIMIT 10", beforeSort, true)).toContain("LIMIT");
    expect(futureConstructs("SELECT * FROM customers LIMIT 10", beforeSort, false)).not.toContain("LIMIT");
    expect(futureConstructs("SELECT ROUND(AVG(list_price), 2) FROM products", beforeSort, false)).toContain("ROUND");
  });

  it("keeps every lesson challenge inside constructs already taught", () => {
    const violations: string[] = [];
    for (const lesson of lessons) {
      const allowed = courseIndex(lesson.id);
      lesson.tasks.forEach((task, index) => {
        const future = futureConstructs(task.answer, allowed, true);
        if (future.length > 0) {
          violations.push(`lesson ${lesson.id} challenge ${index + 1}: ${future.join(", ")}`);
        }
      });
    }
    expect(violations).toEqual([]);
  });

  it("keeps every practice solution inside constructs its prerequisites taught", () => {
    const violations: string[] = [];
    for (const question of bankQuestions) {
      const allowed = latestCourseIndex(question.prerequisites);
      const future = futureConstructs(question.solution, allowed, true);
      if (future.length > 0) {
        violations.push(`${question.id} after lessons [${question.prerequisites.join(", ")}]: ${future.join(", ")}`);
      }
    }
    expect(violations).toEqual([]);
  });

  it("keeps immediate practice for lessons 01–09 on Retail", () => {
    const premature = bankQuestions
      .filter((question) => isBeginnerSpine(question.prerequisites) && question.datasetId !== "retail")
      .map((question) => `${question.id} ${question.datasetId} after [${question.prerequisites.join(", ")}]`);
    expect(premature).toEqual([]);
  });
});
