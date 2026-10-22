import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Playground } from "@/features/python/Playground";
import { pythonRunnerEnabled } from "@/platform/python-runner";
import { pyToolMetadata } from "@/platform/python-seo";

export const metadata: Metadata = pyToolMetadata.playground;

export default function Page() {
  if (!pythonRunnerEnabled()) notFound();
  return <Playground />;
}
