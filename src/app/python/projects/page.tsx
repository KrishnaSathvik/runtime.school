import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectsScreen } from "@/features/python/Project";
import { pythonRunnerEnabled } from "@/platform/python-runner";
import { pyToolMetadata } from "@/platform/python-seo";

export const metadata: Metadata = pyToolMetadata.projects;

export default function Page() {
  if (!pythonRunnerEnabled()) notFound();
  return <ProjectsScreen />;
}
