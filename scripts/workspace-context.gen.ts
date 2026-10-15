import fs from "node:fs";
import { it } from "vitest";
import { lessons, lessonFixture } from "@/content";
import { parseSchema, parseSchemaDetailed } from "@/engine/explain";
import { learningDataset } from "@/data/datasets/learning";
import { computeInputPreviews, freshDb, lastResult } from "./lib/qb-data";

it("generate visible task context from the canonical databases", async () => {
  const contexts: Record<string, { columns: string[]; tables: string[] }[]> = {};
  for (const lesson of lessons) {
    const seed = lessonFixture(lesson).seed;
    // Every table and view the lesson can query, including its scenario tables.
    const available = Object.keys(parseSchema(seed));
    contexts[lesson.id] = [];
    for (const task of lesson.tasks) {
      const db = await freshDb(seed);
      try {
        const columns = lastResult(db, task.answer).columns;
        const source = [task.answer, ...(task.validate ?? []).map(v => v.sql), ...(task.stateQueries ?? [])].join(" ");
        const tables = available.filter(t => new RegExp(`\\b${t}\\b`, "i").test(source));
        contexts[lesson.id].push({ columns, tables: tables.length ? tables : available.slice(0, 1) });
      } finally { db.close(); }
    }
  }
  fs.writeFileSync("src/content/task-context.json", JSON.stringify(contexts, null, 2) + "\n");
  // Small previews of the scenario tables and views a lesson's setup creates (base tables ship with the dataset).
  // Lessons sharing one scenario (the warehouse sequence) share one entry.
  const overlays: Record<string, unknown>[] = [];
  const bySetup = new Map<string, number>();
  const lessonOverlay: Record<string, number> = {};
  for (const lesson of lessons.filter((l) => l.setupSql && l.datasetRef && !("edition" in l.datasetRef))) {
    const seed = lessonFixture(lesson).seed;
    if (bySetup.has(seed)) { lessonOverlay[lesson.id] = bySetup.get(seed)!; continue; }
    const base = new Set(learningDataset(lesson.datasetRef as Parameters<typeof learningDataset>[0]).metadata.tables.map((t) => t.name));
    const schema = parseSchemaDetailed(seed);
    const db = await freshDb(seed);
    try {
      bySetup.set(seed, overlays.length);
      lessonOverlay[lesson.id] = overlays.length;
      overlays.push(Object.fromEntries(Object.keys(schema).filter((t) => !base.has(t)).map((t) => {
        const total = Number(lastResult(db, `SELECT COUNT(*) FROM ${t}`).values[0][0]);
        return [t, { columns: schema[t], result: lastResult(db, `SELECT * FROM ${t} LIMIT 12`), total }];
      })));
    } finally { db.close(); }
  }
  fs.writeFileSync("src/content/lesson-previews.json", JSON.stringify({ lessons: lessonOverlay, overlays }) + "\n");
  fs.writeFileSync("src/content/question-bank/input-previews.json", JSON.stringify(await computeInputPreviews(), null, 2) + "\n");
});
