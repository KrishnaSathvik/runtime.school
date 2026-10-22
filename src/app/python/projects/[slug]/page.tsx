import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { visibleProjects } from "@/content/python-v2/content";
import { ProjectScreen } from "@/features/python/Project";
import { pythonRunnerEnabled } from "@/platform/python-runner";
import { pyProjectMetadata } from "@/platform/python-seo";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return pyProjectMetadata(slug);
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  if (!pythonRunnerEnabled() || !visibleProjects().some((p) => p.slug === slug)) notFound();
  return <ProjectScreen key={slug} slug={slug} />;
}
