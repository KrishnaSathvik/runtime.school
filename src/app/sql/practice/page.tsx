import type { Metadata } from "next";
import { entryPages } from "@/platform/seo";
import { PracticeEntry } from "@/features/rt/pages/Practice";

export const metadata: Metadata = entryPages.practice;

export default function Page() {
  return <PracticeEntry />;
}
