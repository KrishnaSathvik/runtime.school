import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { TOOL_DATASETS, isToolDataset } from "@/content/tools/datasets";
import { datasetsPageMetadata } from "@/platform/seo";
import { Datasets } from "@/features/rt/pages/Datasets";

type Props = { params: Promise<{ dataset: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return TOOL_DATASETS.map((dataset) => ({ dataset }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { dataset } = await params;
  return isToolDataset(dataset) ? datasetsPageMetadata(dataset) : { title: "Dataset not found" };
}

export default async function Page({ params }: Props) {
  const { dataset } = await params;
  if (!isToolDataset(dataset)) notFound();
  return (
    <Suspense>
      <Datasets dataset={dataset} />
    </Suspense>
  );
}
