import type { Metadata } from "next";
import { ProjectLibrary } from "@/features/rt/projects/ProjectLibrary";
import { toolMetadata } from "@/platform/seo";

export const metadata: Metadata = toolMetadata.projects;

export default function Page() {
  return <ProjectLibrary />;
}
