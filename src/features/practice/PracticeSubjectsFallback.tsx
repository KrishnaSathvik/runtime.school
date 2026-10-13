"use client";

import Link from "next/link";
import { practiceProgress } from "@/features/discovery/selectors";
import { useHydrated, useLearning } from "@/lib/learning-state";
import { subjects } from "@/platform/subjects";

/** Shown only when more than one subject has a practice hub. */
export function PracticeSubjectsFallback() {
  const state = useLearning();
  const ready = useHydrated();
  const sqlPractice = ready ? practiceProgress(state) : null;

  return (
    <div className="canvas">
      <h1>Practice</h1>
      <p className="lead">
        Choose a subject, then work independent problems with real execution and feedback.
      </p>

      <h2 className="pt-10">Subjects</h2>
      <div className="learning-path mt-6 border-t border-[var(--border)]">
        {subjects.map((subject, i) => {
          const available = subject.availability === "available" && subject.practiceHref;
          const body = (
            <>
              <span className="module-id">{String(i + 1).padStart(2, "0")}</span>
              <div className="min-w-0">
                <div className="text-[15px] font-medium leading-snug">{subject.title} Practice</div>
                <div className="mt-1.5 max-w-xl text-xs leading-relaxed text-[var(--muted)]">
                  {available
                    ? subject.summary
                    : "Opens when this subject’s practice environment ships."}
                </div>
              </div>
              <div className="index-aside">
                <span className="metadata">
                  {available
                    ? ready && sqlPractice
                      ? `Questions · ${subject.availabilityLabel}`
                      : subject.availabilityLabel
                    : subject.availabilityLabel}
                </span>
                <span className="index-progress">
                  {available && ready && sqlPractice
                    ? `${sqlPractice.solved}/${sqlPractice.total}`
                    : "—"}
                </span>
              </div>
            </>
          );

          if (!available) {
            return (
              <div key={subject.id} className="index-row" aria-disabled="true">
                {body}
              </div>
            );
          }
          return (
            <Link key={subject.id} href={subject.practiceHref!} className="index-row">
              {body}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
