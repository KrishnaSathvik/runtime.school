import { notFound } from "next/navigation";
import { PlaygroundScreen } from "@/features/pyspark/Playground";
import { pysparkEnabled } from "@/platform/pyspark-flag";

export const metadata = { title: "Playground" };

type Props = { searchParams?: Promise<{ edition?: string; dataset?: string; code?: string; from?: string }> };

export default async function Page({ searchParams }: Props) {
  if (!pysparkEnabled()) notFound();
  const q = await searchParams;
  return <PlaygroundScreen key={q?.dataset ?? ""} edition={q?.edition} dataset={q?.dataset} incoming={q?.code?.slice(0, 64000)} from={q?.from} />;
}
