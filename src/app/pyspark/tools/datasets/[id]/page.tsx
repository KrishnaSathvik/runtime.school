import { notFound } from "next/navigation";
import { psDatasetBySlug } from "@/content/pyspark/content";
import { DatasetScreen } from "@/features/pyspark/Datasets";
import { pysparkEnabled } from "@/platform/pyspark-flag";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  return { title: psDatasetBySlug((await params).id)?.title ?? "Dataset not found" };
}

export default async function Page({ params }: Props) {
  const { id } = await params;
  if (!pysparkEnabled() || !psDatasetBySlug(id)) notFound();
  return <DatasetScreen key={id} slug={id} />;
}
