import { describe, expect, it } from "vitest";
import initSqlJs from "sql.js";
import { lessons, seed, dialectGuide } from "@/content";
import contexts from "@/content/task-context.json";
import { syntaxNotes } from "@/content/syntax-notes";

const context = contexts as Record<string, { columns: string[]; tables: string[] }[]>;
describe("visible task information", () => {
  it("shows the exact columns returned by every original challenge", async () => {
    const SQL = await initSqlJs();
    for (const lesson of lessons) {
      for (const [i, task] of lesson.tasks.entries()) {
        const db = new SQL.Database();
        try {
          db.run(seed);
          expect(context[lesson.id][i].columns, `lesson ${lesson.id} challenge ${i}`).toEqual(db.exec(task.answer).at(-1)?.columns ?? []);
        } finally { db.close(); }
      }
    }
    expect(context[0][0].tables).toEqual(["customers"]);
    expect(context[0][1].tables).toEqual(["products"]);
  });
  it("keeps all eleven syntax concepts and executes every runnable SQLite example", async () => {
    expect(Object.keys(syntaxNotes)).toEqual(dialectGuide.map(row => row[0]));
    const SQL = await initSqlJs();
    for (const note of Object.values(syntaxNotes)) {
      if (!note.sqlite) continue;
      const db = new SQL.Database();
      try {
        db.run(seed);
        expect(db.exec(note.examples![0]).length).toBeGreaterThan(0);
      } finally { db.close(); }
    }
  });
});
