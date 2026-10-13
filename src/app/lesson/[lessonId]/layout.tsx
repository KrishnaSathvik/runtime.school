import type { Metadata } from "next";
import { getLesson } from "@/content";
import { lessonSummaries } from "@/content/ux-summaries";
import { seoLessonPath } from "@/platform/sql-slugs";

type Props = {
  children: React.ReactNode;
  params: Promise<{ lessonId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lessonId } = await params;
  const id = Number(lessonId);
  const lesson = Number.isInteger(id) ? getLesson(id) : undefined;
  if (!lesson) {
    return { title: "Lesson" };
  }
  const canonical = seoLessonPath(id);
  return {
    title: `${lesson.title} · SQL`,
    description: lessonSummaries[id] ?? lesson.concept.slice(0, 160),
    alternates: canonical ? { canonical } : undefined,
    robots: { index: true, follow: true },
  };
}

export default function LessonLayout({ children }: Props) {
  return children;
}
