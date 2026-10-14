import { notFound } from "next/navigation";
import { pythonRunnerEnabled } from "@/platform/python-runner";
import { PythonEntry } from "@/features/py/Entry";
import { ProjectIndex } from "@/features/py/Journeys";
export const metadata = { robots: { index:false, follow:false } };
export default async function Page({ searchParams }: { searchParams: Promise<{ browse?: string }> }) {
 if (!pythonRunnerEnabled()) notFound();
 return (await searchParams).browse === "1" ? <ProjectIndex /> : <PythonEntry section="projects" />;
}
