import { redirect } from "next/navigation";
import { availableSubjects } from "@/platform/subjects";
import { ProjectSubjectsFallback } from "@/features/projects/ProjectSubjectsFallback";

/**
 * While one subject has projects, open that hub directly (one hop, no chain).
 * When more subjects ship, show the subject picker.
 */
export default function GlobalProjectsPage() {
  const withProjects = availableSubjects.filter((s) => s.projectsHref);
  if (withProjects.length === 1) {
    redirect(withProjects[0].projectsHref!);
  }
  return <ProjectSubjectsFallback />;
}
