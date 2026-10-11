"use client";

import Link from "next/link";
import { lessons } from "@/content";
import { useHydrated, useLearning } from "@/lib/learning-state";

/** Concept checks are evidence of understanding; opening a lesson alone isn't. */
export function PrerequisiteLinks({ lessonIds, struggling = false }: { lessonIds: number[]; struggling?: boolean }) {
  const hydrated = useHydrated();
  const stats = useLearning((s) => s.stats);
  const pending = [...new Set(lessonIds)].filter((id) => lessons[id] && (struggling || !(stats[id]?.check || stats[id]?.legacy)));
  if (!hydrated || !pending.length) return null;
  return (
    <aside className="my-4 border-l-2 border-[var(--border)] pl-3" aria-label="Helpful concepts">
      <p className="metadata">{struggling ? "A concept refresher may help your next attempt. Revisit a related concept, then return to your saved query." : "These lessons may help. You can also try the question now."}</p>
      <ul className="mt-2 space-y-1 text-sm">
        {pending.map((id) => (
          <li key={id}>
            <Link className="!text-[var(--accent-strong)] !underline underline-offset-2" href={`/lesson/${id}?stage=understand`}>
              Learn this concept: {lessons[id].title}
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
