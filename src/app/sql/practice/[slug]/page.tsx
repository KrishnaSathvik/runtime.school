import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PracticeTask } from "@/features/rt/pages/Practice";
import { practiceSlugs, questionMetadata } from "@/platform/seo";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return practiceSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return questionMetadata((await params).slug) ?? { title: "Question not found" };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  if (!questionMetadata(slug)) notFound();
  return <PracticeTask slug={slug} />;
}
