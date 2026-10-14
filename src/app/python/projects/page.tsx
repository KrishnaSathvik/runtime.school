import { notFound } from "next/navigation";
import { pythonRunnerEnabled } from "@/platform/python-runner";
import { ProjectCatalog } from "@/features/py/projects-v2/Workspace";
import { projectsV2 } from "@/content/python/projects-v2";
export const metadata = { robots: { index:false, follow:false } };
export default function Page() {
 if (!pythonRunnerEnabled()) notFound();
 return <ProjectCatalog projects={projectsV2.map(({ref,slug,title,level,milestones,objective,datasets})=>({ref,slug,title,level,milestones,objective,datasets}))} />;
}
