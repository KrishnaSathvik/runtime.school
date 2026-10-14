import { notFound } from "next/navigation";
import { pythonRunnerEnabled } from "@/platform/python-runner";
import { Playground } from "@/features/py/Playground";
export const metadata = { robots: { index:false, follow:false } };
export default function Page() {
 if (!pythonRunnerEnabled()) notFound();
 return <Playground  />;
}
