import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { TOOL_DATASETS, isToolDataset } from "@/content/tools/datasets";
import { playgroundDatasetMetadata } from "@/platform/seo";
import { Playground } from "@/features/rt/pages/Playground";

type Props = { params: Promise<{ dataset: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return TOOL_DATASETS.map((dataset) => ({ dataset }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { dataset } = await params;
  return isToolDataset(dataset) ? playgroundDatasetMetadata(dataset) : { title: "Dataset not found" };
}

export default async function Page({ params }: Props) {
  const { dataset } = await params;
  if (!isToolDataset(dataset)) notFound();
  return (
    <Suspense>
      <Playground dataset={dataset} />
    </Suspense>
  );
}
