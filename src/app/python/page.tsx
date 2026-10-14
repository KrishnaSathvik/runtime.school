import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PythonEntry } from "@/features/py/Entry";
import { PythonHome } from "@/features/py/Home";
import { pythonRunnerEnabled } from "@/platform/python-runner";

export const metadata: Metadata = {
  title: "Python",
  description: "Learn Python by writing real programs that run in your browser.",
  // Python is not public yet.
  robots: { index: false, follow: false },
};

/** Python home. Only exists where the Python runner is allowed (see platform/python-runner.ts). */
export default async function Page({ searchParams }: { searchParams: Promise<{ browse?: string }> }) {
  if (!pythonRunnerEnabled()) notFound();
  return (await searchParams).browse === "1" ? <PythonHome /> : <PythonEntry section="learn" />;
}
