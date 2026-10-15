import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Lesson } from "@/features/rt/pages/Lesson";
import { courseJsonLd, lessonIds, lessonMetadata } from "@/platform/seo";
import { slugForLessonId } from "@/platform/sql-slugs";
import { resolveSqlLessonParam } from "@/platform/sql-lesson-href";

type Props = { params: Promise<{ id: string }> };

export function generateStaticParams() {
  return lessonIds().flatMap((id) => {
    const slug = slugForLessonId(id);
    return slug ? [{ id: slug }, { id: String(id) }] : [{ id: String(id) }];
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lessonId = resolveSqlLessonParam((await params).id);
  if (lessonId === undefined) return { title: "Lesson not found" };
  return lessonMetadata(lessonId) ?? { title: "Lesson not found" };
}

export default async function Page({ params }: Props) {
  const lessonId = resolveSqlLessonParam((await params).id);
  if (lessonId === undefined || !lessonMetadata(lessonId)) notFound();
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(courseJsonLd()) }} />
      <Lesson lessonId={lessonId} />
    </>
  );
}
