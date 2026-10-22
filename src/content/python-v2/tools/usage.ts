import { pyLessonHref, pyProjectHref, pyQuestionHref, visibleLessons, visibleProjects, visibleQuestions } from "@/content/python-v2/content";
import { datasetIdOf } from "@/content/python-v2/types";

export type PyUsageLink = { href: string; title: string };

/**
 * Where the Python course uses a dataset, from the registry: lessons and practice questions whose examples are
 * small samples of it, and projects that open its files. Server-only: it reads the whole course.
 */
export function pyCourseUsage(id: string) {
  const uses = (refs: string[]) => refs.some((r) => datasetIdOf(r) === id);
  return {
    lessons: visibleLessons().filter((l) => uses(l.entry.datasets)).map((l): PyUsageLink => ({ href: pyLessonHref(l.slug), title: l.title })),
    practice: visibleQuestions().filter((q) => uses(q.entry.datasets)).map((q): PyUsageLink => ({ href: pyQuestionHref(q.slug), title: q.title })),
    projects: visibleProjects().filter((p) => uses(p.entry.datasets)).map((p): PyUsageLink => ({ href: pyProjectHref(p.slug), title: p.title })),
  };
}
