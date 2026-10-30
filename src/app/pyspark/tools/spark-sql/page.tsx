import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ToolsScreen } from "@/features/pyspark/Tools";
import { pysparkEnabled } from "@/platform/pyspark-flag";
export const metadata = { title: "Spark SQL Lab" };
export default function Page() { if (!pysparkEnabled()) notFound(); return <Suspense><ToolsScreen tool="sql" /></Suspense>; }
