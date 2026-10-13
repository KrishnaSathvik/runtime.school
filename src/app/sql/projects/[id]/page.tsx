import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { projects } from "@/content";
import { ProjectPage } from "@/features/rt/pages/Project";
import { projectMetadata } from "@/platform/seo";

type Props = { params: Promise<{ id: string }> };

export function generateStaticParams() {
  return projects.map((p) => ({ id: String(p.id) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return projectMetadata(Number((await params).id)) ?? { title: "Project not found" };
}

export default async function Page({ params }: Props) {
  const id = Number((await params).id);
  if (!projectMetadata(id)) notFound();
  return <ProjectPage projectId={id} stop={{ kind: "brief" }} />;
}
