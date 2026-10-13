import type { Metadata } from "next";
import { projects } from "@/content";
import { ProjectPage } from "@/features/rt/pages/Project";

// The report is built from the learner's own answers: followable, not indexed.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const id = Number((await params).id);
  const p = projects.find((x) => x.id === id);
  return { title: `${p?.title ?? "Project"} — report`, robots: { index: false, follow: true } };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProjectPage projectId={Number(id)} stop={{ kind: "report" }} />;
}
