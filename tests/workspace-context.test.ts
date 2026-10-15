import { describe, expect, it } from "vitest";
import { lastResult, openSeed } from "./helpers/canonical";
import { lessons, lessonFixture } from "@/content";
import contexts from "@/content/task-context.json";
import { SYNTAX_CONCEPTS } from "@/content/syntax-notes";

const context = contexts as Record<string, { columns: string[]; tables: string[] }[]>;
describe("visible task information", () => {
  it("shows the exact columns returned by every original challenge", async () => {
    for (const lesson of lessons) {
      for (const [i, task] of lesson.tasks.entries()) {
        const db = await openSeed(lessonFixture(lesson).seed);
        try {
          expect(context[lesson.id][i].columns, `lesson ${lesson.id} challenge ${i}`).toEqual(lastResult(db, task.answer).columns);
        } finally { db.close(); }
      }
    }
    expect(context[0][0].tables).toEqual(["customers"]);
    expect(context[0][1].tables).toEqual(["products"]);
  }, 120000);
  it("keeps every earlier Compare Syntax link working", () => {
    // Running the examples on canonical data is covered by tests/tools-content.test.ts.
    const ids = SYNTAX_CONCEPTS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ["limit-output", "monthly-bucket", "add-seven-days", "string-length", "replace-null", "materialize-temp-rows", "stored-procedure", "partitioning", "safe-yyyymmdd-conversion", "incremental-update", "csv-ingestion", "concatenate-text", "today-s-date", "days-between-dates", "case-insensitive-match", "combine-values-per-group", "find-text-position", "page-through-results", "number-series", "auto-numbered-ids"]) {
      expect(ids, id).toContain(id);
    }
  });
});
