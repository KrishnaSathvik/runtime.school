import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { ProjectPage } from "@/features/rt/pages/Project";
import { projectHref, resolveProjectParam } from "@/platform/project-paths";

// The report is built from the learner's own answers: followable, not indexed.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const found = resolveProjectParam((await params).id);
  return { title: `${found?.project.title ?? "Project"} — report`, robots: { index: false, follow: true } };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const found = resolveProjectParam((await params).id);
  if (!found) notFound();
  if (found.legacy) permanentRedirect(projectHref(found.project.id, { kind: "report" }));
  return <ProjectPage projectId={found.project.id} stop={{ kind: "report" }} />;
}
