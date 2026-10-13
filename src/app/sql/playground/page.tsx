import type { Metadata } from "next";
import { toolMetadata } from "@/platform/seo";
import { Playground } from "@/features/rt/pages/Playground";

export const metadata: Metadata = toolMetadata.playground;

export default function Page() {
  return <Playground />;
}
