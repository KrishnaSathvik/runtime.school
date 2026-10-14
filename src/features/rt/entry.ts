import { courseOrder, projects } from "@/content";
import { learnEntry } from "@/features/discovery/selectors";
import { practiceEntrySlug } from "@/features/practice/browser";
import { milestoneDone, type LearningState } from "@/lib/learning-state";
import { projectHref, type ProjectStop } from "@/platform/project-paths";

const hrefFor = (projectId: number, s: ProjectStop) => projectHref(projectId, s);

/** Where Projects opens: last worked project at its next unfinished milestone; else Project 01 brief. */
export function projectsEntryHref(s: LearningState): string {
  const last = projects
    .map((p) => {
      const rec = s.projects[p.id];
      const at = Math.max(rec?.started ?? 0, ...Object.values(rec?.milestones ?? {}).map((m) => m.updated ?? 0));
      return { p, rec, at };
    })
    .filter((x) => x.rec)
    .sort((a, b) => b.at - a.at)[0];
  if (!last) return hrefFor(projects[0].id, { kind: "brief" });
  const next = last.p.milestoneIds.find((id) => !milestoneDone(last.rec?.milestones[id]));
  return hrefFor(last.p.id, next === undefined ? { kind: "report" } : { kind: "milestone", id: next });
}

/** Direct destinations for Learn / Practice / Projects once local progress is available. */
export function rtSectionHrefs(s: LearningState) {
  const lesson = learnEntry(s);
  return {
    learn: `/sql/lesson/${lesson?.id ?? courseOrder[0]}`,
    practice: `/sql/practice/${practiceEntrySlug(s)}`,
    projects: projectsEntryHref(s),
  };
}
