import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { visibleQuestions } from "@/content/python-v2/content";
import { QuestionScreen } from "@/features/python/Question";
import { pythonRunnerEnabled } from "@/platform/python-runner";
import { pyQuestionMetadata } from "@/platform/python-seo";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return pyQuestionMetadata(slug);
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  if (!pythonRunnerEnabled() || !visibleQuestions().some((q) => q.slug === slug)) notFound();
  return <QuestionScreen key={slug} slug={slug} />;
}
