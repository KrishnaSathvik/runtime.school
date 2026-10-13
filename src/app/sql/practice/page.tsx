import type { Metadata } from "next";
import { redirectPage } from "@/platform/seo";
import { PracticeEntry } from "@/features/rt/pages/Practice";

export const metadata: Metadata = redirectPage;

export default function Page() {
  return <PracticeEntry />;
}
