import { projects } from "@/content";
import type { Project } from "@/content/types";

export type ProjectStop = { kind: "brief" } | { kind: "milestone"; id: number } | { kind: "report" };

/** Public project URL segment, from the project title. */
export function projectSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function projectBySlug(slug: string): Project | undefined {
  return projects.find((p) => projectSlug(p.title) === slug);
}

/** A slug is the canonical URL. A bare number is the old /sql/projects/0 form. */
export function resolveProjectParam(param: string): { project: Project; legacy: boolean } | null {
  if (/^\d+$/.test(param)) {
    const project = projects.find((p) => p.id === Number(param));
    return project ? { project, legacy: true } : null;
  }
  const project = projectBySlug(param);
  return project ? { project, legacy: false } : null;
}

export function projectHref(projectId: number, stop: ProjectStop = { kind: "brief" }): string {
  const project = projects.find((p) => p.id === projectId);
  const base = `/sql/projects/${project ? projectSlug(project.title) : String(projectId)}`;
  switch (stop.kind) {
    case "brief":
      return base;
    case "report":
      return `${base}/report`;
    case "milestone":
      return `${base}/m/${stop.id}`;
    default: {
      const unreachable: never = stop;
      return unreachable;
    }
  }
}
