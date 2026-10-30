import { notFound } from "next/navigation";
import { PySparkLearnEntry } from "@/features/pyspark/Learn";
import { pysparkEnabled } from "@/platform/pyspark-flag";

/** Learn: opens the next unfinished lesson, like SQL and Python. */
export default function Page() {
  if (!pysparkEnabled()) notFound();
  return <PySparkLearnEntry />;
}
