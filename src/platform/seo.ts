import type { Metadata } from "next";
import { courseOrder, getLesson, groups, projects } from "@/content";
import { lessonSummaries } from "@/content/ux-summaries";
import { bankBySlug, bankQuestions, DIFFICULTY_LABEL, topicLabel } from "@/content/question-bank";
import { BRAND_NAME, SITE_URL } from "@/platform/brand";

/** Search-engine metadata for the public SQL pages (/sql/…). One canonical URL per page. */

const SHARE_IMAGE = { url: "/og-sql.png", width: 1200, height: 630, alt: "Runtime SQL — Learn SQL by doing." };

const clip = (s: string, n = 158) => (s.length <= n ? s : `${s.slice(0, n - 1).replace(/\s+\S*$/, "")}…`);

function page(title: string, description: string, path: string): Metadata {
  return {
    title,
    description: clip(description),
    alternates: { canonical: path },
    // A page's own openGraph replaces the root one, so the shared card image is named again here.
    openGraph: { title: `${title} · ${BRAND_NAME}`, description: clip(description), url: path, siteName: BRAND_NAME, type: "website", images: [SHARE_IMAGE] },
    twitter: { card: "summary_large_image", title: `${title} · ${BRAND_NAME}`, description: clip(description), images: [SHARE_IMAGE.url] },
  };
}

/** Pages that only redirect to the learner's next step: keep links followable, keep them out of the index. */
export const redirectPage: Metadata = { robots: { index: false, follow: true } };

export const lessonIds = (): number[] => courseOrder;

export function lessonMetadata(id: number): Metadata | null {
  const lesson = getLesson(id);
  if (!lesson) return null;
  const n = courseOrder.indexOf(id) + 1;
  const summary = lessonSummaries[id] ?? "";
  return page(
    `${lesson.title} — SQL lesson ${n}`,
    `${summary} ${groups[lesson.group]}, ${lesson.difficulty.toLowerCase()}. Read the idea, run real SQL in your browser, then solve two challenges.`.trim(),
    `/sql/lesson/${id}`,
  );
}

export function questionMetadata(slug: string): Metadata | null {
  const q = bankBySlug.get(slug);
  if (!q) return null;
  return page(
    `${q.title} — SQL practice`,
    `${q.task} ${DIFFICULTY_LABEL[q.difficulty]} SQL question on ${topicLabel[q.primaryTopic]}. Write the query, run it on real data, and check it instantly.`,
    `/sql/practice/${q.slug}`,
  );
}

export function projectMetadata(id: number): Metadata | null {
  const p = projects.find((x) => x.id === id);
  if (!p) return null;
  return page(`${p.title} — SQL project`, `${p.description} A guided SQL project with real data that runs in your browser.`, `/sql/projects/${id}`);
}

export const toolMetadata = {
  playground: page("SQL Playground", "Write any SELECT query against sample databases and see the results instantly in your browser. No sign-up, nothing graded.", "/sql/playground"),
  lab: page("Database Lab", "Create tables, insert and update data, and test transactions in a safe temporary SQLite database that resets whenever you want.", "/sql/lab"),
  queryPlans: page("SQL Query Performance", "See why some SQL queries are faster: compare real EXPLAIN QUERY PLAN output for indexes, covering indexes, sorting and joins.", "/sql/query-plans"),
  syntax: page("Compare SQL Syntax", "One concept in three SQL dialects: SQLite, PostgreSQL and SQL Server side by side, with runnable SQLite examples.", "/sql/syntax"),
};

/** schema.org data for the course, embedded on lesson pages. */
export function courseJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    name: "SQL",
    description: "Learn to query, transform and analyze data with real SQL: lessons, practice questions and projects that run in your browser.",
    url: `${SITE_URL}/sql/lesson/${courseOrder[0]}`,
    provider: { "@type": "Organization", name: BRAND_NAME, url: SITE_URL },
    isAccessibleForFree: true,
    inLanguage: "en",
    hasCourseInstance: { "@type": "CourseInstance", courseMode: "online", courseWorkload: "PT20H" },
    offers: { "@type": "Offer", price: 0, priceCurrency: "USD", category: "Free" },
  };
}

export function siteJsonLd() {
  return [
    { "@context": "https://schema.org", "@type": "WebSite", name: BRAND_NAME, url: SITE_URL },
    { "@context": "https://schema.org", "@type": "Organization", name: BRAND_NAME, url: SITE_URL, logo: `${SITE_URL}/logo.png` },
  ];
}

export const practiceSlugs = () => bankQuestions.map((q) => q.slug);
