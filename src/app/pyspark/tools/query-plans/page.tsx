import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ToolsScreen } from "@/features/pyspark/Tools";
import { pysparkEnabled } from "@/platform/pyspark-flag";
export const metadata = { title: "Query Plans & Performance" };
export default function Page() { if (!pysparkEnabled()) notFound(); return <Suspense><ToolsScreen tool="plan" /></Suspense>; }
