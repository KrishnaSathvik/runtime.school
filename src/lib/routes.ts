import type { Recommendation } from "@/lib/learning-state";
import { sqlLessonHref } from "@/platform/sql-lesson-href";

/** Continuation and mastery live on the Learn home. */
export const PROGRESS_HREF = "/sql";

/** Where a recommended activity lives: every recommendation is a lesson in /sql. */
export function hrefFor(rec: Pick<Recommendation, "id">): string {
  return sqlLessonHref(rec.id);
}
