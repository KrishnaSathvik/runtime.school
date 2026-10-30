import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BRAND_NAME } from "@/platform/brand";
import { pysparkEnabled } from "@/platform/pyspark-flag";
import "../sql/rt.css";
import "../python/py.css";
import "../python/p2.css";
import "../python/tools.css";
import "./pyspark.css";

/** Hidden subject: never indexed, even when switched on (docs/pyspark/plan.md §7). */
export const metadata: Metadata = {
  title: { default: "PySpark", template: `%s · ${BRAND_NAME}` },
  robots: { index: false, follow: false },
};

/** PySpark pages share Runtime's design tokens and Python's lesson styles. Off unless NEXT_PUBLIC_PYSPARK=1. */
export default function PySparkLayout({ children }: { children: React.ReactNode }) {
  if (!pysparkEnabled()) notFound();
  return children;
}
