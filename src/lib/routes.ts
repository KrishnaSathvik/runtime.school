import type { Recommendation } from "@/lib/learning-state";
import { seoLessonPath } from "@/platform/sql-slugs";

/** Continuation and mastery live on the Learn home. */
export const PROGRESS_HREF = "/sql";

/** Learn home (paths list). */
export const LEARN_SUMMARY_HREF = "/sql";

/** Where a recommended activity lives. Prefer SEO lesson URLs when available. */
export function hrefFor(rec: Pick<Recommendation, "id" | "project" | "kind">): string {
  if (rec.kind === "review") return `/review/${rec.id}`;
  if (rec.project !== null) return `/projects/${rec.project}/milestone/${rec.id}`;
  return seoLessonPath(rec.id) ?? `/lesson/${rec.id}`;
}

/** Numeric lesson path that always works (legacy bookmarks). */
export function legacyLessonPath(id: number): string {
  return `/lesson/${id}`;
}
