import fs from "node:fs";
import { it } from "vitest";
import initSqlJs from "sql.js";
import { lessons, seed, datasetCatalog } from "@/content";
import { computeInputPreviews } from "./lib/qb-data";

it("generate visible task context from the original database", async () => {
  const SQL = await initSqlJs();
  const contexts: Record<string, { columns: string[]; tables: string[] }[]> = {};
  for (const lesson of lessons) {
    contexts[lesson.id] = lesson.tasks.map(task => {
      const db = new SQL.Database();
      try {
        db.run(seed);
        const columns = db.exec(task.answer).at(-1)?.columns ?? [];
        const source = [task.answer, ...(task.validate ?? []).map(v => v.sql)].join(" ");
        const available = datasetCatalog[lesson.dataset].tables;
        const tables = available.filter(t => new RegExp(`\\b${t}\\b`, "i").test(source));
        return { columns, tables: tables.length ? tables : available.slice(0, 1) };
      } finally { db.close(); }
    });
  }
  fs.writeFileSync("src/content/task-context.json", JSON.stringify(contexts, null, 2) + "\n");
  fs.writeFileSync("src/content/question-bank/input-previews.json", JSON.stringify(await computeInputPreviews(), null, 2) + "\n");
});
