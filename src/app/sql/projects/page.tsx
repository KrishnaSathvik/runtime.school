import type { Metadata } from "next";
import { redirectPage } from "@/platform/seo";
import { ProjectsEntry } from "@/features/rt/pages/Project";

export const metadata: Metadata = redirectPage;

export default function Page() {
  return <ProjectsEntry />;
}
