import { notFound } from "next/navigation";
import { psQuestionBySlug } from "@/content/pyspark/content";
import { QuestionScreen } from "@/features/pyspark/Practice";
import { pysparkEnabled } from "@/platform/pyspark-flag";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  return { title: psQuestionBySlug((await params).slug)?.title ?? "Question not found" };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  if (!pysparkEnabled() || !psQuestionBySlug(slug)) notFound();
  return <QuestionScreen key={slug} slug={slug} />;
}
