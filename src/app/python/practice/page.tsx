import { notFound } from "next/navigation";
import { pythonRunnerEnabled } from "@/platform/python-runner";
import { pythonModules } from "@/content/python";
import { PythonEntry } from "@/features/py/Entry";
import { PracticeIndex } from "@/features/py/Practice";
export const metadata = { robots: { index:false, follow:false } };
export default async function Page({ searchParams }: { searchParams: Promise<{ module?: string | string[]; browse?: string }> }) {
 if (!pythonRunnerEnabled()) notFound();
 const params = await searchParams;
 const requested = params.module;
 if (params.browse !== "1" && requested === undefined) return <PythonEntry section="practice" />;
 const moduleId = pythonModules.some(m => m.id === requested) ? requested as string : '';
 return <PracticeIndex key={moduleId} initialModule={moduleId} />;
}
