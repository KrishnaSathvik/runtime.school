"use client";
import Link from "next/link";
import { useLearning } from "@/lib/learning-state";
import { lessonNextSteps } from "./next-steps";

export function NextSteps({ lessonId }: { lessonId: number }) {
  const stats = useLearning((s) => s.stats);
  const questions = useLearning((s) => s.questions);
  const projects = useLearning((s) => s.projects);
  const review = useLearning((s) => s.reviews[lessonId]);
  const next = lessonNextSteps(lessonId, { stats, questions, projects });
  return <section className="mt-8 border-t border-[var(--border)] pt-6" aria-label="Keep learning">
    <h3 className="font-semibold">Keep learning</h3>
    {review && <p className="metadata mt-2">Your next review is scheduled for {new Date(review.due).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}. <Link href="/review" className="text-[var(--accent-strong)] underline">See reviews</Link></p>}
    <ul className="mt-4 space-y-4 text-sm">
      {next.practice.map((q) => <li key={q.id}><Link className="text-[var(--accent-strong)] underline" href={`/practice/${q.slug}`}>{q.title}</Link><p className="metadata mt-1">Try this concept with different sample data. You’ve completed the lessons it builds on.</p></li>)}
      {next.track && <li><Link className="text-[var(--accent-strong)] underline" href={`/practice/tracks/${next.track.id}`}>{next.track.title}</Link><p className="metadata mt-1">Follow related questions in order, including skills to learn next.</p></li>}
      {next.project && <li><Link className="text-[var(--accent-strong)] underline" href={`/projects/${next.project.id}`}>{next.project.title}</Link><p className="metadata mt-1">You’ve learned the concepts needed to start. Apply them in a project.</p></li>}
    </ul>
  </section>;
}
