import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PythonPracticeEntry } from "@/features/python/Entry";
import { pythonRunnerEnabled } from "@/platform/python-runner";
import { pyEntryMetadata } from "@/platform/python-seo";

export const metadata: Metadata = pyEntryMetadata("practice");

/** Practice: opens the next unsolved question, like SQL. */
export default function Page() {
  if (!pythonRunnerEnabled()) notFound();
  return <PythonPracticeEntry />;
}
