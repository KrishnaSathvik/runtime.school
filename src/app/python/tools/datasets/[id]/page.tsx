import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { toolDataset } from "@/content/python-v2/tools/friendly";
import { pyCourseUsage } from "@/content/python-v2/tools/usage";
import { DatasetsScreen } from "@/features/python/Datasets";
import { pythonRunnerEnabled } from "@/platform/python-runner";
import { pyDatasetMetadata } from "@/platform/python-seo";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return pyDatasetMetadata(id);
}

export default async function Page({ params }: Props) {
  const { id } = await params;
  // Only datasets learners can use have a page.
  if (!pythonRunnerEnabled() || !toolDataset(id)) notFound();
  // Resolved here so the course never ships to this page.
  return <DatasetsScreen id={id} usage={pyCourseUsage(id)} />;
}
