import { sqlLessonHref } from "@/platform/sql-lesson-href";
import fs from "fs";
import { describe, expect, it } from "vitest";
import { bankQuestions } from "@/content/question-bank";
import { teachingSchema } from "@/engine/explain";
import { sqlFeatures } from "@/content/question-bank/rubric";

type ManifestQ = { id: string; tables: string[]; expectedColumns: string[]; sourceType: string };
const manifest = JSON.parse(fs.readFileSync("docs/question-bank/question-manifest.json", "utf8")) as {
  questions: ManifestQ[];
};
const schema = teachingSchema();

describe("inventory metadata audit (all 247 questions)", () => {
  it("every listed table is a real table or an object the solution creates", () => {
    const bad: string[] = [];
    for (const q of manifest.questions) {
      for (const t of q.tables) if (!(t in schema) && !/^[a-z_]\w*$/.test(t)) bad.push(`${q.id}:${t}`);
    }
    // Names outside the schema must be created by that question's own SQL (lab work).
    const created = manifest.questions.flatMap((q) => q.tables.filter((t) => !(t in schema)).map((t) => `${q.id}:${t}`));
    expect(bad).toEqual([]);
    expect(created.every((x) => !/:(of|set|select|values|where|on|as|by)$/.test(x))).toBe(true);
  });

  it("known keyword traps are not read as tables", () => {
    expect(sqlFeatures("CREATE TRIGGER t AFTER UPDATE OF list_price ON products BEGIN SELECT 1; END;").tables).toEqual(["products"]);
    expect(sqlFeatures("CREATE INDEX idx ON orders(customer_id); SELECT 1").tables).toEqual(["orders"]);
    expect(
      sqlFeatures("INSERT INTO customers SELECT customer_id, country, segment, valid_from FROM customer_history WHERE 1 ON CONFLICT(customer_id) DO UPDATE SET country=excluded.country").tables.sort(),
    ).toEqual(["customer_history", "customers"]);
    expect(sqlFeatures("CREATE TEMP TABLE silver AS SELECT * FROM customers; SELECT * FROM silver").tables.sort()).toEqual([
      "customers",
      "silver",
    ]);
  });

  it("every question has expected output columns", () => {
    expect(manifest.questions.filter((q) => q.expectedColumns.length === 0).map((q) => q.id)).toEqual([]);
  });

  it("bank questions list every table their reference solution reads", () => {
    const missing: string[] = [];
    for (const q of bankQuestions) {
      const used = sqlFeatures(q.solution).tables.filter((t) => t in schema);
      for (const t of used) if (!q.tables.includes(t)) missing.push(`${q.id}:${t}`);
    }
    expect(missing).toEqual([]);
  });
});

describe("lesson-only challenges", () => {
  it("are an explicit reviewed list and every one stays reachable through its lesson", async () => {
    const { allQuestions } = await import("@/content/question-bank");
    const { LESSON_ONLY } = await import("@/content/question-bank/existing");
    const { lessons } = await import("@/content");
    const hidden = allQuestions().filter((q) => !q.practiceEligible);
    expect(hidden.map((q) => `${q.sourceLessonId}/${q.sourceVariant}`).sort()).toEqual(Object.keys(LESSON_ONLY).sort());
    for (const q of hidden) {
      expect(q.href).toBe(sqlLessonHref(q.sourceLessonId!));
      expect(lessons[q.sourceLessonId!].tasks[q.sourceVariant!]).toBeTruthy();
    }
    expect(allQuestions().filter((q) => q.sourceType === "bank").every((q) => q.practiceEligible)).toBe(true);
  });
});
