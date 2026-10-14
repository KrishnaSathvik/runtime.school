import { notFound } from "next/navigation";
import { pythonRunnerEnabled } from "@/platform/python-runner";
import { PracticeQuestion } from "@/features/py/Practice";
import { pythonQuestions } from "@/content/python/practice";
export const dynamicParams = false;
export function generateStaticParams() { return pythonQuestions.map(x => ({slug:x.slug})); }
export const metadata = { robots: { index:false, follow:false } };
export default async function Page({params}: {params: Promise<{slug:string}>}) {
 const {slug} = await params;
 if (!pythonRunnerEnabled() || !pythonQuestions.some(x => x.slug === slug)) notFound();
 return <PracticeQuestion slug={slug} />;
}
