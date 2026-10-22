import type { CanonicalDatasetId } from "@/data/datasets/learning-map";
import { courseOrder, getLesson } from "@/content";
import { bankQuestions } from "@/content/question-bank";
import { projects } from "@/content/projects";
import { sqlProjectHref } from "@/content/projects/paths";
import { sqlLessonHref } from "@/platform/sql-lesson-href";

export type UsageLink = { href: string; title: string };

const LEVEL = { warmup: 0, easy: 1, medium: 2, hard: 3 } as const;

/** Where the course uses a dataset: its lessons in course order, its practice questions easiest first, its projects. */
export function courseUsage(id: CanonicalDatasetId) {
  const questions = bankQuestions
    .filter((q) => q.datasetRef.datasetId === id)
    .sort((a, b) => LEVEL[a.difficulty] - LEVEL[b.difficulty]);
  return {
    lessons: courseOrder
      .map((n) => getLesson(n))
      .filter((l) => l?.datasetRef.datasetId === id)
      .map((l): UsageLink => ({ href: sqlLessonHref(l!.id), title: l!.title })),
    practice: questions.map((q): UsageLink => ({ href: `/sql/practice/${q.slug}`, title: q.title })),
    projects: projects.filter((p) => p.datasetId === id).map((p): UsageLink => ({ href: sqlProjectHref(p.id), title: p.title })),
  };
}
