"use client";

import Link from "next/link";
import { useMemo } from "react";
import { datasetCatalog, projects } from "@/content";
import { projectOutcomes } from "@/content/ux-summaries";
import {
  milestoneDone,
  useHydrated,
  useLearning,
  type LearningState,
} from "@/lib/learning-state";
import { CompletedMark, UpNextTag } from "@/features/discovery/ProgressMarks";

/** Project overview — first visit and list entry. */
export function projectOverviewHref(projectId: number) {
  return `/projects/${projectId}`;
}

/** Resume the next unfinished milestone, or overview when the project is complete. */
export function projectResumeHref(
  projectId: number,
  projectState: LearningState["projects"],
) {
  const project = projects.find((p) => p.id === projectId);
  if (!project) return "/projects/sql";
  const rec = projectState[projectId];
  const next = project.milestoneIds.find((id) => !milestoneDone(rec?.milestones[id]));
  if (next === undefined) return projectOverviewHref(projectId);
  return `/projects/${projectId}/milestone/${next}`;
}

/** @deprecated Use projectOverviewHref for list entry; projectResumeHref for Continue. */
export function projectEntryHref(
  projectId: number,
  projectState: LearningState["projects"],
) {
  return projectResumeHref(projectId, projectState);
}

/** One row per project — opens the overview (business brief), which has Continue. */
export function ProjectList() {
  const ready = useHydrated();
  const projectState = useLearning((s) => s.projects);

  const rows = useMemo(() => {
    return projects.map((p) => {
      const rec = projectState[p.id];
      const count = p.milestoneIds.length;
      const done = p.milestoneIds.filter((id) => milestoneDone(rec?.milestones[id])).length;
      const lastActive = Math.max(
        rec?.started ?? 0,
        ...Object.values(rec?.milestones ?? {}).map((m) => m.updated ?? 0),
      );
      return {
        id: p.id,
        title: p.title,
        description: projectOutcomes[p.id].summary,
        skills: projectOutcomes[p.id].skills,
        dataset: datasetCatalog[p.dataset]?.name,
        count,
        done,
        lastActive,
        overviewHref: projectOverviewHref(p.id),
        inProgress: !!rec && done < count,
        complete: done === count,
      };
    });
  }, [projectState]);
  // Only the most recently worked, unfinished project is labelled; a label, not a selection.
  const upNextId = rows
    .filter((r) => r.inProgress)
    .sort((a, b) => b.lastActive - a.lastActive)[0]?.id;

  return (
    <div className="learning-path mt-6" aria-label="Projects">
      {rows.map((p) => {
        const isNext = ready && p.id === upNextId;
        return (
          <div
            key={p.id}
            id={`project-${p.id}`}
            className="index-row project-card"
            aria-current={isNext ? "step" : undefined}
          >
            <span className="module-id">{String(p.id + 1).padStart(2, "0")}</span>
            <div className="min-w-0">
              <Link
                href={p.overviewHref}
                className="project-card-link text-[15px] font-medium leading-snug text-[var(--text)] hover:underline"
              >
                {p.title}
              </Link>
              {isNext && <UpNextTag />}
              <div className="mt-1.5 max-w-xl text-xs leading-relaxed text-[var(--muted)]">
                {p.description}
              </div>
              <div className="project-row-meta">
                <span>{p.skills}</span>
                {p.dataset && <span>{p.dataset} dataset</span>}
              </div>
            </div>
            <div className="index-aside">
              {/* Milestone count until every milestone is done, then a check mark. */}
              {ready && p.complete ? (
                <CompletedMark />
              ) : (
                <span className="index-progress">{p.count} milestones</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
