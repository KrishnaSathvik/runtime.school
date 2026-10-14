import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { projects } from "@/content";
import { ProjectPage } from "@/features/rt/pages/Project";
import { projectHref, projectSlug, resolveProjectParam } from "@/platform/project-paths";
import { projectMetadata } from "@/platform/seo";

type Props = { params: Promise<{ id: string }> };

export function generateStaticParams() {
  return projects.map((p) => ({ id: projectSlug(p.title) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const found = resolveProjectParam((await params).id);
  return (found && projectMetadata(found.project.id)) || { title: "Project not found" };
}

export default async function Page({ params }: Props) {
  const found = resolveProjectParam((await params).id);
  if (!found) notFound();
  if (found.legacy) permanentRedirect(projectHref(found.project.id));
  return <ProjectPage projectId={found.project.id} stop={{ kind: "brief" }} />;
}
