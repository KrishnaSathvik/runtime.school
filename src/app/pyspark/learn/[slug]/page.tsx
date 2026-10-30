import { notFound } from "next/navigation";
import { psLessonBySlug } from "@/content/pyspark/content";
import { LessonScreen } from "@/features/pyspark/Learn";
import { pysparkEnabled } from "@/platform/pyspark-flag";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  return { title: psLessonBySlug((await params).slug)?.title ?? "Lesson not found" };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  if (!pysparkEnabled() || !psLessonBySlug(slug)) notFound();
  return <LessonScreen key={slug} slug={slug} />;
}
