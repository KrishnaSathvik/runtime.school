import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ToolsScreen } from "@/features/pyspark/Tools";
import { pysparkEnabled } from "@/platform/pyspark-flag";
export const metadata = { title: "Pipeline & Streaming Lab" };
export default function Page() { if (!pysparkEnabled()) notFound(); return <Suspense><ToolsScreen tool="pipeline" /></Suspense>; }
