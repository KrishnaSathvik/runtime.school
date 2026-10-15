import { courseOrder } from "@/content";
import { projects as sqlProjects } from "@/content/projects";
import { SQL_PROJECTS_LIBRARY_HREF, sqlProjectHref } from "@/content/projects/paths";
import { learnEntry } from "@/features/discovery/selectors";
import { practiceEntrySlug } from "@/features/practice/browser";
import { completedStageCount } from "@/features/rt/projects/evidence";
import { type LearningState } from "@/lib/learning-state";
import { sqlLessonHref } from "@/platform/sql-lesson-href";

/**
 * Where Projects opens: the most progressed catalog project with local drafts,
 * otherwise the Projects library.
 */
export function projectsEntryHref(s: LearningState): string {
  let bestId: string | null = null;
  let bestDone = -1;
  for (const project of sqlProjects) {
    const prefix = `sql-project-${project.id}-`;
    const touched = Object.keys(s.drafts).some((key) => key.startsWith(prefix));
    if (!touched) continue;
    const done = completedStageCount(project, s.drafts);
    if (done >= bestDone) {
      bestId = project.id;
      bestDone = done;
    }
  }
  return bestId ? sqlProjectHref(bestId) : SQL_PROJECTS_LIBRARY_HREF;
}

/** Direct destinations for Learn / Practice / Projects once local progress is available. */
export function rtSectionHrefs(s: LearningState) {
  const lesson = learnEntry(s);
  return {
    learn: sqlLessonHref(lesson?.id ?? courseOrder[0]),
    practice: `/sql/practice/${practiceEntrySlug(s)}`,
    projects: projectsEntryHref(s),
  };
}
