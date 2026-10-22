import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { pyLessonHref, visibleLessons } from "@/content/python-v2/content";
import { COMPARISONS } from "@/content/python-v2/tools/compare";
import { Comparator, type LessonLink } from "@/features/python/Comparator";
import { pythonRunnerEnabled } from "@/platform/python-runner";
import { pyToolMetadata } from "@/platform/python-seo";

export const metadata: Metadata = pyToolMetadata.compare;

export default function Page() {
  if (!pythonRunnerEnabled()) notFound();
  // Only the lessons a learner can open are linked; resolved here so the course never ships to this page.
  const wanted = new Set(COMPARISONS.flatMap((c) => c.lessons));
  const lessons: Record<string, LessonLink> = Object.fromEntries(
    visibleLessons().filter((l) => wanted.has(l.id)).map((l) => [l.id, { title: l.title, href: pyLessonHref(l.slug) }]),
  );
  return (
    <Suspense>
      <Comparator lessons={lessons} />
    </Suspense>
  );
}
