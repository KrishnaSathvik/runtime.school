import { notFound } from "next/navigation";
import { DatasetsScreen } from "@/features/pyspark/Datasets";
import { pysparkEnabled } from "@/platform/pyspark-flag";

export const metadata = { title: "Datasets" };

export default function Page() {
  if (!pysparkEnabled()) notFound();
  return <DatasetsScreen />;
}
