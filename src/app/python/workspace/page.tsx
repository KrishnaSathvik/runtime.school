import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WorkspacePreview } from "@/features/py/WorkspacePreview";
import { pythonRunnerEnabled } from "@/platform/python-runner";

export const metadata: Metadata = {
  title: "Python workspace preview",
  robots: { index: false, follow: false },
};

/** Milestone 3 preview of the Python workspace. Only exists where the runner gate is on. */
export default function Page() {
  if (!pythonRunnerEnabled()) notFound();
  return <WorkspacePreview />;
}
