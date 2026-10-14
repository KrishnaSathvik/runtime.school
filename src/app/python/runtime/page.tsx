import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RuntimeCheck } from "@/features/py/RuntimeCheck";
import { pythonRunnerEnabled } from "@/platform/python-runner";

export const metadata: Metadata = {
  title: "Python runtime check",
  robots: { index: false, follow: false },
};

/** Developer page for the Python execution foundation. Only exists where the runner is allowed. */
export default function Page() {
  if (!pythonRunnerEnabled()) notFound();
  return <RuntimeCheck />;
}
