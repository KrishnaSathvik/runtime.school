import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DatabaseLab } from "@/features/python/DatabaseLab";
import { pythonRunnerEnabled } from "@/platform/python-runner";
import { pyToolMetadata } from "@/platform/python-seo";

export const metadata: Metadata = pyToolMetadata.databaseLab;

export default function Page() {
  if (!pythonRunnerEnabled()) notFound();
  return <DatabaseLab />;
}
