import type { Metadata } from "next";
import { toolMetadata } from "@/platform/seo";
import { Suspense } from "react";
import { Syntax } from "@/features/rt/pages/Syntax";

export const metadata: Metadata = toolMetadata.syntax;

export default function Page() {
  return (
    <Suspense>
      <Syntax />
    </Suspense>
  );
}
