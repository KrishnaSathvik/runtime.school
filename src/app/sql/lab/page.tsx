import type { Metadata } from "next";
import { toolMetadata } from "@/platform/seo";
import { Lab } from "@/features/rt/pages/Lab";

export const metadata: Metadata = toolMetadata.lab;

export default function Page() {
  return <Lab />;
}
