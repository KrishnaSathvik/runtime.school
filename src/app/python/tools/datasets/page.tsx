import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { toolDatasets } from "@/content/python-v2/tools/friendly";
import { pyCourseUsage } from "@/content/python-v2/tools/usage";
import { DatasetsScreen } from "@/features/python/Datasets";
import { pythonRunnerEnabled } from "@/platform/python-runner";
import { pyDatasetMetadata } from "@/platform/python-seo";

export const metadata: Metadata = pyDatasetMetadata();

export default function Page() {
  if (!pythonRunnerEnabled()) notFound();
  // Resolved here so the course never ships to this page.
  return <DatasetsScreen usage={pyCourseUsage(toolDatasets[0].id)} />;
}
