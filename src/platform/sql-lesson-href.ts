import { slugForLessonId, lessonIdForSlug } from "@/platform/sql-slugs";

/** Canonical Learn URL for a lesson: `/sql/lesson/<title-slug>`. */
export function sqlLessonHref(id: number): string {
  const slug = slugForLessonId(id);
  return slug ? `/sql/lesson/${slug}` : `/sql/lesson/${id}`;
}

/** Resolve `/sql/lesson/[id]` when `id` is a numeric id or a title slug. */
export function resolveSqlLessonParam(param: string): number | undefined {
  if (/^\d+$/.test(param)) {
    const id = Number(param);
    return Number.isFinite(id) ? id : undefined;
  }
  return lessonIdForSlug(param);
}
