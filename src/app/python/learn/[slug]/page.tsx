import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { visibleLessons } from "@/content/python-v2/content";
import { LessonScreen } from "@/features/python/Lesson";
import { pythonRunnerEnabled } from "@/platform/python-runner";
import { pyCourseJsonLd, pyLessonMetadata } from "@/platform/python-seo";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return pyLessonMetadata(slug);
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  if (!pythonRunnerEnabled() || !visibleLessons().some((l) => l.slug === slug)) notFound();
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pyCourseJsonLd()) }} />
      <LessonScreen key={slug} slug={slug} />
    </>
  );
}
