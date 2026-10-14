import { notFound } from "next/navigation";
import { pythonRunnerEnabled } from "@/platform/python-runner";
import { ProjectWorkspace } from "@/features/py/projects-v2/Workspace";
import { projectV2, projectsV2 } from "@/content/python/projects-v2";
import { pythonProjects } from "@/content/python/journeys";
export const dynamicParams = false;
export function generateStaticParams() { return pythonProjects.map(x => ({slug:x.slug})); }
export const metadata = { robots: { index:false, follow:false } };
export default async function Page({params, searchParams}: {params: Promise<{slug:string}>; searchParams: Promise<{stage?:string}>}) {
 const {slug} = await params;
 if (!pythonRunnerEnabled() || !pythonProjects.some(x => x.slug === slug)) notFound();
 const project = projectV2(slug);
 if (!project) notFound();
 return <ProjectWorkspace key={slug} projects={projectsV2.map(({slug,title})=>({slug,title}))} project={{...project,reference:{}}} initialStage={(await searchParams).stage} />;
}
