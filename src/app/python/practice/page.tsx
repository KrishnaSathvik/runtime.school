import { notFound } from "next/navigation";
import { pythonRunnerEnabled } from "@/platform/python-runner";
import { PracticeIndex } from "@/features/py/Practice";
export const metadata = { robots: { index:false, follow:false } };
export default function Page() {
 if (!pythonRunnerEnabled()) notFound();
 return <PracticeIndex  />;
}
