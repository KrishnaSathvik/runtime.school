import { notFound } from "next/navigation";
import { pythonRunnerEnabled } from "@/platform/python-runner";
import { PracticeIndex } from "@/features/py/Practice";
import { pythonTracks } from "@/content/python/practice";
export const dynamicParams = false;
export function generateStaticParams() { return pythonTracks.map(x => ({slug:x.slug})); }
export const metadata = { robots: { index:false, follow:false } };
export default async function Page({params}: {params: Promise<{slug:string}>}) {
 const {slug} = await params;
 if (!pythonRunnerEnabled() || !pythonTracks.some(x => x.slug === slug)) notFound();
 return <PracticeIndex trackSlug={slug} />;
}
