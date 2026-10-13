import { SITE_URL } from "@/platform/brand";
import type { MetadataRoute } from "next";
import { projects } from "@/content";
import { lessonIds, practiceSlugs } from "@/platform/seo";

const BASE = SITE_URL;

/**
 * Only the canonical public pages of the current site (/ and /sql/…).
 * Redirect-only entries (/sql, /sql/practice, /sql/projects), learner-specific pages
 * (project milestones and reports) and the older app routes are left out on purpose.
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
    ...lessonIds().map((id, i) => entry(`/sql/lesson/${id}`, i === 0 ? 0.9 : 0.7)),
    ...practiceSlugs().map((slug) => entry(`/sql/practice/${slug}`, 0.6)),
    ...projects.map((p) => entry(`/sql/projects/${p.id}`, 0.6)),
    entry("/sql/playground", 0.5),
    entry("/sql/lab", 0.5),
    entry("/sql/query-plans", 0.5),
    entry("/sql/syntax", 0.5),
  ];
}
