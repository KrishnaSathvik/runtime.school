import type { Metadata } from "next";
import { courseOrder, getLesson, groups } from "@/content";
import { getProject } from "@/content/projects";
import { sqlProjectHref } from "@/content/projects/paths";
import { lessonSummaries } from "@/content/ux-summaries";
import { bankBySlug, bankQuestions, DIFFICULTY_LABEL, topicLabel } from "@/content/question-bank";
import { BRAND_NAME, SITE_URL } from "@/platform/brand";
import { learningDatasets } from "@/data/datasets/learning";
import { canonicalNames, type CanonicalDatasetId } from "@/data/datasets/learning-map";
import { sqlLessonHref } from "@/platform/sql-lesson-href";

/** Search-engine metadata for the public SQL pages (/sql/…). One canonical URL per page. */

const clip = (s: string, n = 158) => (s.length <= n ? s : `${s.slice(0, n - 1).replace(/\s+\S*$/, "")}…`);

type ShareCard = { url: string; width: number; height: number; alt: string };

const card = (file: string, alt: string, width = 1200, height = 630): ShareCard => ({ url: `/${file}`, width, height, alt });

const SHARE = {
  learn: card("og-sql-learn.png", "Learn SQL. Read the idea, run the query, then solve it."),
  practice: card("og-sql-practice.png", "SQL Practice. Write the query and check it on real data."),
  projects: card("og-sql-projects.png", "SQL Projects. Investigate a business problem with real data."),
  playground: card("og-sql-playground.png", "SQL Playground. Explore a real-world dataset with SQL. Nothing is graded."),
  datasets: card("og-sql-datasets.png", "SQL Datasets. Tables, joins, and what to watch for.", 1280, 720),
  lab: card("og-sql-lab.png", "Database Lab. Create, change, and roll back a temporary database."),
  queryPlans: card("og-sql-query-plans.png", "Query Performance. See why a SQL query is faster."),
  syntax: card("og-sql-syntax.png", "Compare Syntax. One idea in SQLite, PostgreSQL, and SQL Server."),
};

function page(title: string, description: string, path: string, image: ShareCard): Metadata {
  return {
    title,
    description: clip(description),
    alternates: { canonical: path },
    // A page's own openGraph replaces the root one, so the shared card image is named again here.
    openGraph: { title: `${title} · ${BRAND_NAME}`, description: clip(description), url: path, siteName: BRAND_NAME, type: "website", images: [image] },
    twitter: { card: "summary_large_image", title: `${title} · ${BRAND_NAME}`, description: clip(description), images: [image.url] },
  };
}

/**
 * Pages that only open the learner's next step. A new visitor (and a crawler) lands on the first lesson or
 * question, so that page is the canonical one; a noindex here made Search Console flag the hub as excluded.
 */
export const entryPages = {
  learn: { alternates: { canonical: sqlLessonHref(courseOrder[0]) } } satisfies Metadata,
  practice: { alternates: { canonical: `/sql/practice/${bankQuestions[0].slug}` } } satisfies Metadata,
};

export const lessonIds = (): number[] => courseOrder;

export function lessonMetadata(id: number): Metadata | null {
  const lesson = getLesson(id);
  if (!lesson) return null;
  const summary = lessonSummaries[id] ?? "";
  return page(
    `${lesson.title} — ${groups[lesson.group]}`,
    `${summary} ${groups[lesson.group]}, ${lesson.difficulty.toLowerCase()}. Read the idea, run real SQL in your browser, then solve two challenges.`.trim(),
    sqlLessonHref(id),
    SHARE.learn,
  );
}

export function questionMetadata(slug: string): Metadata | null {
  const q = bankBySlug.get(slug);
  if (!q) return null;
  return page(
    `${q.title} — SQL practice`,
    `${q.task} ${DIFFICULTY_LABEL[q.difficulty]} SQL question on ${topicLabel[q.primaryTopic]}. Write the query, run it on real data, and check it instantly.`,
    `/sql/practice/${q.slug}`,
    SHARE.practice,
  );
}

/** Metadata for a SQL Projects catalog workspace. */
export function sqlProjectMetadata(projectId: string): Metadata | null {
  const p = getProject(projectId);
  if (!p) return null;
  return page(
    `${p.title} — SQL project`,
    `${p.brief.ask} ${p.brief.deliverable}`,
    sqlProjectHref(p.id),
    SHARE.projects,
  );
}

export const toolMetadata = {
  playground: page("SQL Playground", "Explore twelve real-world datasets with SQL in your browser: retail, flights, product analytics, taxis, weather, energy, payments, healthcare, IoT, logistics, developer platforms and sports. Nothing is graded.", "/sql/playground", SHARE.playground),
  lab: page("Database Lab", "Create tables, change data, test constraints, transactions, triggers, upserts and warehouse loads on a disposable copy of a real dataset. Every run starts fresh.", "/sql/lab", SHARE.lab),
  queryPerformance: page("SQL Query Performance", "Compare two ways of writing the same SQL query and read the real SQLite execution plan for each, on full datasets of 89,000 to 238,000 rows.", "/sql/query-performance", SHARE.queryPlans),
  syntax: page("Compare SQL Syntax", "See how the same SQL concept is written in SQLite, PostgreSQL and SQL Server, with runnable SQLite examples on real datasets.", "/sql/syntax", SHARE.syntax),
  projects: page(
    "SQL Projects",
    "Apply SQL to realistic business problems. Investigate with evidence, write findings, and export a report.",
    "/sql/projects",
    SHARE.projects,
  ),
};

/** One Playground page per canonical dataset; the plain /sql/playground page shows Retail. */
export function playgroundDatasetMetadata(id: CanonicalDatasetId): Metadata {
  const m = learningDatasets[id].metadata;
  const path = id === "retail" ? "/sql/playground" : `/sql/playground/${id}`;
  return page(`${canonicalNames[id]} dataset — SQL Playground`, `${m.description} Explore its ${m.totals.tables} tables with SQL in your browser. Nothing is graded.`, path, SHARE.playground);
}

export function datasetsPageMetadata(id: CanonicalDatasetId): Metadata {
  const m = learningDatasets[id].metadata;
  const path = id === "retail" ? "/sql/datasets" : `/sql/datasets/${id}`;
  return page(`${canonicalNames[id]} dataset — SQL Datasets`, `${m.description} See its ${m.totals.tables} tables, how they join, what to watch for, and where the course uses it.`, path, SHARE.datasets);
}

/** schema.org data for the course, embedded on lesson pages. */
export function courseJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    name: "SQL",
    description: "Learn to query, transform and analyze data with real SQL: lessons, practice questions and projects that run in your browser.",
    url: `${SITE_URL}${sqlLessonHref(courseOrder[0])}`,
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
export const practiceRouteSlugs = practiceSlugs;
