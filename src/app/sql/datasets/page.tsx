import type { Metadata } from "next";
import { Suspense } from "react";
import { datasetsPageMetadata } from "@/platform/seo";
import { Datasets } from "@/features/rt/pages/Datasets";

export const metadata: Metadata = datasetsPageMetadata("retail");

export default function Page() {
  return (
    <Suspense>
      <Datasets dataset="retail" />
    </Suspense>
  );
}
