import type { Metadata } from "next";
import { getLesson, projects } from "@/content";
import { ProjectPage } from "@/features/rt/pages/Project";

// A milestone is the learner's own work on a lesson challenge: followable, not indexed (the project brief is).
export async function generateMetadata({ params }: { params: Promise<{ id: string; lessonId: string }> }): Promise<Metadata> {
  const { id, lessonId } = await params;
  const p = projects.find((x) => x.id === Number(id));
  return { title: `${getLesson(Number(lessonId))?.title ?? "Milestone"} — ${p?.title ?? "Project"}`, robots: { index: false, follow: true } };
}

export default async function Page({ params }: { params: Promise<{ id: string; lessonId: string }> }) {
  const { id, lessonId } = await params;
  return <ProjectPage projectId={Number(id)} stop={{ kind: "milestone", id: Number(lessonId) }} />;
}
