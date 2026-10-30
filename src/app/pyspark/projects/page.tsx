import { notFound } from "next/navigation";
import { ProjectsScreen } from "@/features/pyspark/Projects";
import { pysparkEnabled } from "@/platform/pyspark-flag";

export const metadata = { title: "Projects" };

export default function Page() {
  if (!pysparkEnabled()) notFound();
  return <ProjectsScreen />;
}
