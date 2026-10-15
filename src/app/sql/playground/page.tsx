import type { Metadata } from "next";
import { Suspense } from "react";
import { toolMetadata } from "@/platform/seo";
import { Playground } from "@/features/rt/pages/Playground";

export const metadata: Metadata = toolMetadata.playground;

export default function Page() {
  return (
    <Suspense>
      <Playground dataset="retail" />
    </Suspense>
  );
}
