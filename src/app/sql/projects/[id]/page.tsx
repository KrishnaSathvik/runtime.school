import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { allSqlProjectStaticParams, resolveSqlProjectSlug } from "@/content/projects/paths";
import { ProjectWorkspace } from "@/features/rt/projects/ProjectWorkspace";
import { sqlProjectMetadata } from "@/platform/seo";
// The project frame (overview, step bar, review) is shared with Python and PySpark and styled in p2.css.
import "../../../python/p2.css";

type Props = { params: Promise<{ id: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return allSqlProjectStaticParams();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const project = resolveSqlProjectSlug((await params).id);
  return project ? sqlProjectMetadata(project.id) ?? { title: project.title } : { title: "Project not found" };
}

export default async function Page({ params }: Props) {
  const project = resolveSqlProjectSlug((await params).id);
  if (!project) notFound();
  return <ProjectWorkspace key={project.id} project={project} />;
}
