import { SITE_URL } from "@/platform/brand";
import type { MetadataRoute } from "next";
import { projects as sqlProjects } from "@/content/projects";
import { sqlProjectHref } from "@/content/projects/paths";
import { lessonIds, practiceSlugs } from "@/platform/seo";
import { sqlLessonHref } from "@/platform/sql-lesson-href";
import { TOOL_DATASETS } from "@/content/tools/datasets";
import { pythonRunnerEnabled } from "@/platform/python-runner";
import { pySitemapPaths } from "@/platform/python-seo";

const BASE = SITE_URL;

/**
 * Canonical public pages. Guided milestone project URLs are retired;
 * Projects are the catalog under /sql/projects and /sql/projects/<id>.
 * Python pages are listed only where Python is switched on (platform/python-runner.ts).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const entry = (path: string, priority: number, changeFrequency: "weekly" | "monthly" = "monthly") => ({
    url: `${BASE}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  });
  return [
    entry("", 1, "weekly"),
    entry("/sql/projects", 0.8, "weekly"),
    ...lessonIds().map((id, i) => entry(sqlLessonHref(id), i === 0 ? 0.9 : 0.7)),
    ...practiceSlugs().map((slug) => entry(`/sql/practice/${slug}`, 0.6)),
    ...sqlProjects.map((p) => entry(sqlProjectHref(p.id), 0.6)),
    entry("/sql/playground", 0.5),
    ...TOOL_DATASETS.filter((id) => id !== "retail").map((id) => entry(`/sql/playground/${id}`, 0.4)),
    entry("/sql/lab", 0.5),
    entry("/sql/query-performance", 0.5),
    entry("/sql/syntax", 0.5),
    ...(pythonRunnerEnabled() ? pySitemapPaths().map((p) => entry(p.path, p.priority)) : []),
  ];
}
