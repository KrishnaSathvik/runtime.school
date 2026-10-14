import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPythonLesson, pythonLessons } from "@/content/python";
import { PythonLesson } from "@/features/py/Lesson";
import { pythonRunnerEnabled } from "@/platform/python-runner";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return pythonLessons.map((l) => ({ slug: l.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lesson = getPythonLesson((await params).slug);
  return lesson
    ? { title: lesson.title, description: lesson.summary, robots: { index: false, follow: false } }
    : { title: "Lesson not found" };
}

/** A Python lesson. Only exists where the Python runner is allowed. */
export default async function Page({ params }: Props) {
  const lesson = getPythonLesson((await params).slug);
  if (!pythonRunnerEnabled() || !lesson) notFound();
  return <PythonLesson slug={lesson.slug} />;
}
