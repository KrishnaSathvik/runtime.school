import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Lesson } from "@/features/rt/pages/Lesson";
import { courseJsonLd, lessonIds, lessonMetadata } from "@/platform/seo";

type Props = { params: Promise<{ id: string }> };

export function generateStaticParams() {
  return lessonIds().map((id) => ({ id: String(id) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return lessonMetadata(Number((await params).id)) ?? { title: "Lesson not found" };
}

export default async function Page({ params }: Props) {
  const id = Number((await params).id);
  if (!lessonMetadata(id)) notFound();
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(courseJsonLd()) }} />
      <Lesson lessonId={id} />
    </>
  );
}
