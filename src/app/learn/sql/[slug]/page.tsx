import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLesson, groups } from "@/content";
import { lessonSummaries } from "@/content/ux-summaries";
import { allSqlLessonSlugs, lessonIdForSlug, slugForLessonId } from "@/platform/sql-slugs";
import { SqlSeoLessonClient } from "@/features/lesson/SqlSeoLessonClient";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return allSqlLessonSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const id = lessonIdForSlug(slug);
  const lesson = id === undefined ? undefined : getLesson(id);
  if (!lesson) {
    return { title: "Lesson" };
  }
  const summary = lessonSummaries[lesson.id] ?? lesson.concept.slice(0, 160);
  return {
    title: `${lesson.title} · SQL`,
    description: summary,
    alternates: { canonical: `/learn/sql/${slug}` },
  };
}

export default async function SqlSeoLessonPage({ params }: Props) {
  const { slug } = await params;
  const id = lessonIdForSlug(slug);
  if (id === undefined) notFound();
  const lesson = getLesson(id);
  if (!lesson) notFound();

  const canonicalSlug = slugForLessonId(id);
  if (canonicalSlug && canonicalSlug !== slug) notFound();

  return (
    <article>
      <header className="sr-only">
        <p>SQL · {groups[lesson.group]}</p>
        <h1>{lesson.title}</h1>
        <p>{lessonSummaries[lesson.id] ?? lesson.concept}</p>
      </header>
      <SqlSeoLessonClient lessonId={id} />
    </article>
  );
}
