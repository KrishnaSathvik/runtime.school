"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { reviewReason, reviewWhen as when } from "@/lib/review-copy";
import { ArrowRight } from "lucide-react";
import { groups, lessons } from "@/content";
import {
  isMastered,
  isReviewDue,
  REVIEW_DAYS,
  useHydrated,
  useLearning,
} from "@/lib/learning-state";

export default function ReviewsPage() {
  const hydrated = useHydrated();
  const stats = useLearning((s) => s.stats);
  const reviews = useLearning((s) => s.reviews);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(timer); }, []);

  const scheduled = lessons
    .filter((l) => stats[l.id] && isMastered(stats[l.id]) && reviews[l.id])
    .sort((a, b) => reviews[a.id].due - reviews[b.id].due);
  const due = scheduled.filter((l) => isReviewDue(reviews[l.id], now));
  const upcoming = scheduled.filter((l) => !isReviewDue(reviews[l.id], now));

  return (
    <div className="canvas">
      <div className="eyebrow">Spaced review</div>
      <h1>Keep what you’ve learned.</h1>
      <p className="lead">
        Answer a short question, then write one query from memory.
        Correct answers move the next review further away; a missed answer brings it back tomorrow.
        Completed lessons stay mastered.
      </p>

      {!hydrated ? (
        <p className="metadata mt-8" role="status">Loading your reviews…</p>
      ) : scheduled.length === 0 ? (
        <section className="mt-10 border-y border-[var(--border)] py-8">
          <h2>No reviews yet</h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Reviews appear a day after you master a lesson.
          </p>
          <Link href="/learn" className="btn primary mt-5">
            Go to lessons <ArrowRight size={14} />
          </Link>
        </section>
      ) : (
        <>
          <section className="mt-10">
            <h2>Ready to review {due.length > 0 && <span className="metadata">· {due.length}</span>}</h2>
            {due.length === 0 ? (
              <p className="metadata mt-3">No reviews are ready yet. {upcoming[0] ? `Next review: ${when(reviews[upcoming[0].id].due, now).toLowerCase()}.` : ""}</p>
            ) : (
              <div className="mt-4 border-t border-[var(--border)]">
                {due.map((l) => (
                  <Link key={l.id} href={`/review/${l.id}`} className="index-row">
                    <span className="module-id">{String(l.group + 1).padStart(2, "0")}</span>
                    <div>
                      <div className="text-sm font-medium">{l.title}</div>
                      <div className="metadata mt-1">{groups[l.group]}</div>
                      <p className="metadata mt-1">{reviewReason(reviews[l.id])}</p>
                    </div>
                    <span className="metadata">{when(reviews[l.id].due, now)}</span>
                    <span className="btn primary">
                      Review <ArrowRight size={14} />
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {upcoming.length > 0 && (
            <section className="mt-10">
              <h2>Coming up</h2>
              <div className="mt-4 border-t border-[var(--border)]">
                {upcoming.map((l) => (
                  <Link key={l.id} href={`/review/${l.id}`} className="index-row">
                    <span className="module-id">{String(l.group + 1).padStart(2, "0")}</span>
                    <div>
                      <div className="text-sm font-medium">{l.title}</div>
                      <div className="metadata mt-1">
                        Level {reviews[l.id].level + 1} of {REVIEW_DAYS.length} ·{" "}
                        {reviews[l.id].history.filter((h) => !h.early).length} completed review
                        {reviews[l.id].history.filter((h) => !h.early).length === 1 ? "" : "s"}
                      </div>
                    </div>
                    <span className="metadata">{when(reviews[l.id].due, now)}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
