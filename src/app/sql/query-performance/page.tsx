import type { Metadata } from "next";
import { Suspense } from "react";
import { toolMetadata } from "@/platform/seo";
import { QueryPerformance } from "@/features/rt/pages/QueryPerformance";

export const metadata: Metadata = toolMetadata.queryPerformance;

export default function Page() {
  return (
    <Suspense>
      <QueryPerformance />
    </Suspense>
  );
}
