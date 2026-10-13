import type { Metadata } from "next";
import { toolMetadata } from "@/platform/seo";
import { QueryPlans } from "@/features/rt/pages/QueryPlans";

export const metadata: Metadata = toolMetadata.queryPlans;

export default function Page() {
  return <QueryPlans />;
}
