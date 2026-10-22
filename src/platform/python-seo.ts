import type { Metadata } from "next";
import { pyRegistry } from "@/content/python-v2/registry";
import { PY_COMPARE_HREF, PY_DBLAB_HREF, PY_PERF_HREF, PY_PLAYGROUND_HREF, pyDatasetHref, pyLessonHref, pyProjectHref, pyQuestionHref, visibleLessons, visibleProjects, visibleQuestions } from "@/content/python-v2/content";
import { toolDataset, toolDatasets } from "@/content/python-v2/tools/friendly";
import { BRAND_NAME, SITE_URL } from "@/platform/brand";

/** Search-engine metadata for the public Python pages (/python/…). One canonical URL per page, like SQL's seo.ts. */

/** Markdown to one plain line: no code ticks, emphasis, links or line breaks. */
const plain = (md: string) =>
  md.replace(/```[\s\S]*?```/g, " ").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/[`*_#>]/g, "").replace(/\s+/g, " ").trim();
const clip = (s: string, n = 158) => (s.length <= n ? s : `${s.slice(0, n - 1).replace(/\s+\S*$/, "")}…`);

type ShareCard = { url: string; width: number; height: number; alt: string };

const card = (file: string, alt: string): ShareCard => ({ url: `/${file}`, width: 1280, height: 720, alt });

/** One share card per Python section (public/og-python-*.png); `python` is the general one. */
const SHARE = {
  python: card("og-python.png", "Runtime Python. Learn Python by doing: write programs, run them, understand the results."),
  learn: card("og-python-learn.png", "Learn Python. Read it. Run it. Lessons, two challenges, a concept check."),
  practice: card("og-python-practice.png", "Python Practice. Write the code. Check it. Real programs, graded the moment you run them."),
  projects: card("og-python-projects.png", "Python Projects. A brief, then the work: milestones, checked as you go."),
  playground: card("og-python-playground.png", "Python Playground. Explore; nothing is graded. Files, data and libraries in the browser."),
  datasets: card("og-python-datasets.png", "Python Datasets. Files, columns, and tricky rows."),
  lab: card("og-python-lab.png", "Database Lab. Query it from Python. Change rows, then reset the file."),
  performance: card("og-python-performance.png", "Performance Lab. See which way is faster: time a list against a set."),
  compare: card("og-python-compare.png", "Compare Approaches. One problem, several ways: same input, different Python."),
};

/** Share title, description and card. A page's own openGraph replaces the root one, so the card is named every time. */
const share = (title: string, description: string, path: string, image: ShareCard): Pick<Metadata, "openGraph" | "twitter"> => ({
  openGraph: { title: `${title} · ${BRAND_NAME}`, description, url: path, siteName: BRAND_NAME, type: "website", images: [image] },
  twitter: { card: "summary_large_image", title: `${title} · ${BRAND_NAME}`, description, images: [image.url] },
});

function page(title: string, description: string, path: string, image: ShareCard = SHARE.python): Metadata {
  const d = clip(plain(description));
  return { title, description: d, alternates: { canonical: path }, ...share(title, d, path, image) };
}

/** A missing lesson, question, project or dataset: never indexed. */
export const pyMissing = (title: string): Metadata => ({ title, robots: { index: false, follow: false } });

const moduleTitle = (id: string) => pyRegistry.modules.find((m) => m.id === id)?.title ?? "Python";

export function pyLessonMetadata(slug: string): Metadata {
  const l = visibleLessons().find((x) => x.slug === slug);
  if (!l) return pyMissing("Lesson not found");
  return page(`${l.title} — ${moduleTitle(l.entry.module)}`, `${l.lede} Write and run real Python in your browser, then solve two challenges.`, pyLessonHref(l.slug), SHARE.learn);
}

export function pyQuestionMetadata(slug: string): Metadata {
  const q = visibleQuestions().find((x) => x.slug === slug);
  if (!q) return pyMissing("Question not found");
  return page(`${q.title} — Python practice`, `${plain(q.prompt)} ${q.difficulty[0].toUpperCase()}${q.difficulty.slice(1)} Python question. Write the code, run it in your browser and check it.`, pyQuestionHref(q.slug), SHARE.practice);
}

export function pyProjectMetadata(slug: string): Metadata {
  const p = visibleProjects().find((x) => x.slug === slug);
  if (!p) return pyMissing("Project not found");
  return page(`${p.title} — Python project`, p.story, pyProjectHref(p.slug), SHARE.projects);
}

/** One page per dataset; the plain Datasets page shows the first, so that's its canonical address. */
export function pyDatasetMetadata(id?: string): Metadata {
  const d = id ? toolDataset(id) : toolDatasets[0];
  if (!d) return pyMissing("Dataset not found");
  const path = !id || d.id === toolDatasets[0].id ? "/python/tools/datasets" : pyDatasetHref(d.id);
  return page(`${d.name} dataset — Python Datasets`, `${d.blurb} See its files, columns and tricky rows, then load it in the Python Playground.`, path, SHARE.datasets);
}

export const pyToolMetadata = {
  playground: page("Python Playground", "Write and run Python in your browser: several files, real datasets under data/, and pandas, NumPy, Matplotlib and more loaded from your imports. Nothing is graded.", PY_PLAYGROUND_HREF, SHARE.playground),
  databaseLab: page("Python Database Lab", "Query and change a real SQLite database from Python with sqlite3: transactions, indexes and query plans, on a copy you can reset.", PY_DBLAB_HREF, SHARE.lab),
  performanceLab: page("Python Performance Lab", "Time two ways of writing the same Python on the same input, check they agree, and see which is faster and why.", PY_PERF_HREF, SHARE.performance),
  compare: page("Compare Python Approaches", "The same problem solved different ways in Python, run on the same input, with what really differs and when to use each.", PY_COMPARE_HREF, SHARE.compare),
  projects: page("Python Projects", "Build real Python programs one milestone at a time: shopping carts, data pipelines, API clients and more, checked as you go.", "/python/projects", SHARE.projects),
};

/**
 * Pages that only open the learner's next step. A new visitor (and a crawler) lands on the first lesson or question,
 * so that page is the canonical one, as on SQL.
 */
export function pyEntryMetadata(kind: "learn" | "practice"): Metadata {
  const first = kind === "learn" ? visibleLessons()[0] : visibleQuestions()[0];
  const base = kind === "learn"
    ? { title: "Python", description: "Learn Python by writing real programs that run in your browser: lessons, practice questions and projects." }
    : { title: "Python practice", description: "Python practice questions: write the code, run it in your browser and check it instantly." };
  const path = kind === "learn" ? "/python" : "/python/practice";
  return {
    ...base,
    ...(first ? { alternates: { canonical: kind === "learn" ? pyLessonHref(first.slug) : pyQuestionHref(first.slug) } } : {}),
    ...share(base.title, base.description, path, kind === "learn" ? SHARE.python : SHARE.practice),
  };
}

/** schema.org data for the Python course, embedded on lesson pages. */
export function pyCourseJsonLd() {
  const first = visibleLessons()[0];
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    name: "Python",
    description: "Learn Python by writing real programs: lessons, practice questions and projects that run in your browser.",
    url: `${SITE_URL}${first ? pyLessonHref(first.slug) : "/python"}`,
    provider: { "@type": "Organization", name: BRAND_NAME, url: SITE_URL },
    isAccessibleForFree: true,
    inLanguage: "en",
    hasCourseInstance: { "@type": "CourseInstance", courseMode: "online" },
    offers: { "@type": "Offer", price: 0, priceCurrency: "USD", category: "Free" },
  };
}

/** Every indexable Python page, for the sitemap. */
export function pySitemapPaths(): { path: string; priority: number }[] {
  return [
    ...visibleLessons().map((l, i) => ({ path: pyLessonHref(l.slug), priority: i === 0 ? 0.9 : 0.7 })),
    ...visibleQuestions().map((q) => ({ path: pyQuestionHref(q.slug), priority: 0.6 })),
    { path: "/python/projects", priority: 0.8 },
    ...visibleProjects().map((p) => ({ path: pyProjectHref(p.slug), priority: 0.6 })),
    { path: PY_PLAYGROUND_HREF, priority: 0.5 },
    { path: "/python/tools/datasets", priority: 0.5 },
    ...toolDatasets.slice(1).map((d) => ({ path: pyDatasetHref(d.id), priority: 0.4 })),
    { path: PY_DBLAB_HREF, priority: 0.5 },
    { path: PY_PERF_HREF, priority: 0.5 },
    { path: PY_COMPARE_HREF, priority: 0.5 },
  ];
}
