import { groups, lessons, projects } from "@/content";
import { bankBySlug } from "@/content/question-bank";
import { caseStudies } from "@/content/question-bank/case-studies";
import { tracks } from "@/content/question-bank/tracks";
import { BRAND_NAME } from "@/platform/brand";

const STATIC_TITLES: Record<string, string> = {
  "/practice": "Practice",
  "/practice/questions": "Practice",
  "/settings": "Settings",
  "/placement": "Find my level",
  "/review": "Reviews",
  "/playground": "Playground",
  "/database-lab": "Database Lab",
  "/query-performance": "Query performance",
  "/sql-syntax": "Compare SQL syntax",
  "/sql": "SQL",
  "/projects": "Projects",
  "/projects/sql": "SQL projects",
};

/** Title for client routes that do not export page metadata. Null leaves the server title. */
export function routeTitle(pathname: string): string | null {
  const exact = STATIC_TITLES[pathname];
  if (exact) return exact;

  const track = pathname.match(/^\/practice\/tracks\/([^/]+)$/);
  if (track) return tracks.find((item) => item.id === track[1])?.title ?? "Practice track";

  const caseStudy = pathname.match(/^\/practice\/cases\/([^/]+)$/);
  if (caseStudy) return caseStudies.find((item) => item.id === caseStudy[1])?.title ?? "Case study";

  const question = pathname.match(/^\/practice\/([^/]+)$/);
  if (question) return bankBySlug.get(question[1])?.title ?? "Practice";

  const milestone = pathname.match(/^\/projects\/(\d+)\/milestone\/(\d+)/);
  if (milestone) return lessons[Number(milestone[2])]?.title ?? "Project";

  const project = pathname.match(/^\/projects\/(\d+)$/);
  if (project) return projects.find((item) => item.id === Number(project[1]))?.title ?? "Project";

  const review = pathname.match(/^\/review\/(\d+)$/);
  if (review) return lessons[Number(review[1])]?.title ? `Review · ${lessons[Number(review[1])].title}` : "Review";

  const moduleId = pathname.match(/^\/learn\/(\d+)$/);
  if (moduleId) return groups[Number(moduleId[1])] ?? null;

  return null;
}

export function formatDocumentTitle(pathname: string): string | null {
  const title = routeTitle(pathname);
  return title ? `${title} · ${BRAND_NAME}` : null;
}
