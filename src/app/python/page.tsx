import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PythonLearnEntry } from "@/features/python/Entry";
import { pythonRunnerEnabled } from "@/platform/python-runner";
import { pyEntryMetadata } from "@/platform/python-seo";

// Opens the learner's next lesson, so it has no content of its own; the first lesson is the canonical page.
export const metadata: Metadata = pyEntryMetadata("learn");

/** Learn: opens the next unfinished lesson, like SQL. Only exists where the Python runner is allowed (platform/python-runner.ts). */
export default function Page() {
  if (!pythonRunnerEnabled()) notFound();
  return <PythonLearnEntry />;
}
