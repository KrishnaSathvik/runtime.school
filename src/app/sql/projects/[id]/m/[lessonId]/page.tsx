import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getLesson } from "@/content";
import { ProjectPage } from "@/features/rt/pages/Project";
import { projectHref, resolveProjectParam } from "@/platform/project-paths";

// A milestone is the learner's own work on a lesson challenge: followable, not indexed (the project brief is).
export async function generateMetadata({ params }: { params: Promise<{ id: string; lessonId: string }> }): Promise<Metadata> {
  const { id, lessonId } = await params;
  const found = resolveProjectParam(id);
  return {
    title: `${getLesson(Number(lessonId))?.title ?? "Milestone"} — ${found?.project.title ?? "Project"}`,
    robots: { index: false, follow: true },
  };
}

export default async function Page({ params }: { params: Promise<{ id: string; lessonId: string }> }) {
  const { id, lessonId } = await params;
  const found = resolveProjectParam(id);
  if (!found) notFound();
  const milestoneId = Number(lessonId);
  if (found.legacy) permanentRedirect(projectHref(found.project.id, { kind: "milestone", id: milestoneId }));
  return <ProjectPage projectId={found.project.id} stop={{ kind: "milestone", id: milestoneId }} />;
}
