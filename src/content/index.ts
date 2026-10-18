import { learningDataset, learningDatasetInfo } from "@/data/datasets/learning";
import { applyCanonicalLesson } from "./canonical/lessons";
import outline from "./course-outline.json";
import type { CourseOutline, Lesson } from "./types";

const course = outline as CourseOutline;

/** The course: titles, order and modules from the outline; every dataset-bound field from a canonical dataset spec. */
export const lessons: Lesson[] = course.lessons.map((l) => applyCanonicalLesson(l as Lesson));
export const learningDatasetCatalog = learningDatasetInfo;
export const groups = course.groups;
export const moduleDescriptions = course.moduleDescriptions;
export const courseOrder = course.courseOrder;

/** A lesson's database: its canonical dataset plus any small scenario tables, and the changed-data fixture for checks. */
export function lessonFixture(lesson: Lesson) {
  const dataset = learningDataset(lesson.datasetRef);
  return {
    seed: dataset.seed + (lesson.setupSql ?? ""),
    mutation: `${dataset.mutation}\n${lesson.extraMutation ?? ""}`.trim(),
    previews: dataset.previews,
  };
}

export function getLesson(id: number): Lesson | undefined {
  return lessons[id];
}


export function lessonsInModule(moduleId: number): Lesson[] {
  return courseOrder.map((id) => lessons[id]).filter((l) => l.group === moduleId);
}

export type Starter = {
  /** Text placed in a fresh editor. Never a complete, runnable answer. */
  sql: string;
  /** Caret offset to place the cursor where the learner should start typing. */
  cursor: number;
};

/** First table named in the reference answer's FROM clause, if any. */
function firstTable(answer: string): string | null {
  const m = /\bFROM\s+([A-Za-z_][A-Za-z0-9_]*)/i.exec(answer);
  return m ? m[1] : null;
}

/**
 * Starting SQL for a challenge. Query lessons get an executable-shape scaffold
 * ("SELECT ⎸ / FROM …") with the cursor after SELECT; beginner lessons also name
 * the table, since the task text already does. Lab scripts start empty (the
 * editor shows a placeholder) because they begin with CREATE/INSERT/BEGIN.
 * A scaffold is always incomplete SQL, so it can never pass a check.
 */
export function starterFor(lesson: Lesson, variant = 0): Starter {
  if (lesson.mode === "lab") return { sql: "", cursor: 0 };
  const authored = lesson.tasks[variant]?.starter;
  if (authored) return { sql: authored, cursor: authored.length };
  const table =
    lesson.difficulty === "Beginner" ? firstTable(lesson.tasks[variant]?.answer ?? "") : null;
  const sql = table ? `SELECT \nFROM ${table};` : "SELECT \nFROM ";
  return { sql, cursor: "SELECT ".length };
}

/** Back-compatible: the starter text only. */
export function starterSql(lesson: Lesson, variant = 0): string {
  return starterFor(lesson, variant).sql;
}

/**
 * Drafts saved from the previous comment-only starter contain no SQL at all.
 * Treat them as empty so returning learners get the new scaffold instead.
 */
export function isBlankSql(sql: string | undefined): boolean {
  if (sql === undefined) return true;
  return sql.replace(/--[^\n]*|\/\*[\s\S]*?\*\//g, "").trim() === "";
}
