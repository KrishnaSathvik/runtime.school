import { advancedCatalog } from "./advanced";
import { beginnerCatalog } from "./beginner";
import { intermediateCatalog } from "./intermediate";
import type { Project, ProjectLevel } from "./types";

export type {
  Project,
  ProjectHint,
  ProjectLevel,
  ProjectReportSection,
  ProjectScaffolding,
  ProjectStage,
  ProjectStageCompletion,
  ProjectStageType,
  ProjectStageValidation,
} from "./types";

export { SQL_PROJECTS_LIBRARY_HREF, allSqlProjectStaticParams, resolveSqlProjectSlug, sqlProjectHref } from "./paths";

const catalog = [...beginnerCatalog, ...intermediateCatalog, ...advancedCatalog];

/** Thirteen projects in curriculum order, one or more on every canonical dataset. */
export const projects: Project[] = catalog.map((entry) => entry.project);

/** Hidden reference SQL keyed by ProjectStageValidation.referenceId. Never shown to learners. */
export const projectReferences: Record<string, string> = Object.assign({}, ...catalog.map((entry) => entry.references));

const byId = new Map(projects.map((project) => [project.id, project]));

export function getProject(id: string): Project | undefined {
  return byId.get(id);
}

export function projectsByLevel(level: ProjectLevel): Project[] {
  return projects.filter((project) => project.level === level);
}
