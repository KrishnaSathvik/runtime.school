import { notFound } from "next/navigation";
import { psProjectBySlug } from "@/content/pyspark/content";
import { ProjectScreen } from "@/features/pyspark/Projects";
import { pysparkEnabled } from "@/platform/pyspark-flag";

type Props = { params: Promise<{ slug: string }>; searchParams?: Promise<{ step?: string }> };

export async function generateMetadata({ params }: Props) {
  return { title: psProjectBySlug((await params).slug)?.title ?? "Project not found" };
}

export default async function Page({ params, searchParams }: Props) {
  const { slug } = await params;
  if (!pysparkEnabled() || !psProjectBySlug(slug)) notFound();
  const step = Number((await searchParams)?.step) || undefined;
  return <ProjectScreen key={slug} slug={slug} initialStep={step} />;
}
