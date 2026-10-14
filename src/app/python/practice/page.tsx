import { notFound } from "next/navigation";
import { pythonRunnerEnabled } from "@/platform/python-runner";
import { pythonModules } from "@/content/python";
import { PracticeIndex } from "@/features/py/Practice";
export const metadata = { robots: { index:false, follow:false } };
export default async function Page({ searchParams }: { searchParams: Promise<{ module?: string | string[] }> }) {
 if (!pythonRunnerEnabled()) notFound();
 const requested = (await searchParams).module;
 const moduleId = pythonModules.some(m => m.id === requested) ? requested as string : '';
 return <PracticeIndex key={moduleId} initialModule={moduleId} />;
}
