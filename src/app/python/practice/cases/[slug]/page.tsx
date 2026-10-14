import { notFound } from "next/navigation";
import { pythonRunnerEnabled } from "@/platform/python-runner";
import { Journey } from "@/features/py/Journeys";
import { pythonCases } from "@/content/python/journeys";
export const dynamicParams = false;
export function generateStaticParams() { return pythonCases.map(x => ({slug:x.slug})); }
export const metadata = { robots: { index:false, follow:false } };
export default async function Page({params}: {params: Promise<{slug:string}>}) {
 const {slug} = await params;
 if (!pythonRunnerEnabled() || !pythonCases.some(x => x.slug === slug)) notFound();
 return <Journey slug={slug} />;
}
