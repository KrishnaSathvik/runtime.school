import { notFound, redirect } from "next/navigation";
import { pythonRunnerEnabled } from "@/platform/python-runner";
import { projectsV2 } from "@/content/python/projects-v2";
export const metadata = { robots: { index:false, follow:false } };
export default function Page() {
 if (!pythonRunnerEnabled()) notFound();
 redirect(`/python/projects/${projectsV2[0].slug}#overview`);
}
