import { projects } from "./index";
import type { Project } from "./types";

/** Project workspace URL. */
export function sqlProjectHref(projectId: string): string {
  return `/sql/projects/${projectId}`;
}

export const SQL_PROJECTS_LIBRARY_HREF = "/sql/projects";

export function resolveSqlProjectSlug(slug: string): Project | undefined {
  return projects.find((project) => project.id === slug);
}

export function allSqlProjectStaticParams(): Array<{ id: string }> {
  return projects.map((project) => ({ id: project.id }));
}
