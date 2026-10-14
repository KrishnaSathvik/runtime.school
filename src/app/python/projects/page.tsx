import { notFound } from "next/navigation";
import { pythonRunnerEnabled } from "@/platform/python-runner";
import { ProjectIndex } from "@/features/py/Journeys";
export const metadata = { robots: { index:false, follow:false } };
export default function Page() {
 if (!pythonRunnerEnabled()) notFound();
 return <ProjectIndex  />;
}
