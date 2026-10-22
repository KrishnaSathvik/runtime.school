import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PerformanceLab } from "@/features/python/PerformanceLab";
import { pythonRunnerEnabled } from "@/platform/python-runner";
import { pyToolMetadata } from "@/platform/python-seo";

export const metadata: Metadata = pyToolMetadata.performanceLab;

export default function Page() {
  if (!pythonRunnerEnabled()) notFound();
  return (
    <Suspense>
      <PerformanceLab />
    </Suspense>
  );
}
