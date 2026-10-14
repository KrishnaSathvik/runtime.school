import { notFound } from "next/navigation";
import { pythonRunnerEnabled } from "@/platform/python-runner";
import { ProjectJourney } from "@/features/py/ProjectJourney";
import { pythonProjects } from "@/content/python/journeys";
export const dynamicParams = false;
export function generateStaticParams() { return pythonProjects.map(x => ({slug:x.slug})); }
export const metadata = { robots: { index:false, follow:false } };
export default async function Page({params, searchParams}: {params: Promise<{slug:string}>; searchParams: Promise<{stage?:string}>}) {
 const {slug} = await params;
 if (!pythonRunnerEnabled() || !pythonProjects.some(x => x.slug === slug)) notFound();
 return <ProjectJourney key={slug + ((await searchParams).stage ?? "brief")} slug={slug} initialStage={(await searchParams).stage} />;
}
