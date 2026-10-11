"use client";
import {lessonSummaries,moduleObjectives} from "@/content/ux-summaries";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  groups,
  lessons,
  lessonsInModule,

  projects,
} from "@/content";
import { isMastered, lessonStatus, useLearning } from "@/lib/learning-state";

export default function ModulePage() {
  const params = useParams();
  const moduleId = Number(params.moduleId);
  const stats = useLearning((s) => s.stats);
  const reviews = useLearning((s) => s.reviews);
  const history = useLearning((s) => s.history);

  if (!Number.isInteger(moduleId) || moduleId < 0 || moduleId >= groups.length) {
    return (
      <div className="canvas">
        <h1>Module not found</h1>
        <Link href="/learn" className="btn mt-4">
          Back to Learn
        </Link>
      </div>
    );
  }

  const ls = lessonsInModule(moduleId);
  const done = ls.filter((l) =>
    isMastered(
      stats[l.id] ?? {
        attempts: 0,
        correct: 0,
        solved: [],
        last: 0,
        errors: 0,
        check: false,
        legacy: false,
        masteredAt: 0,
        categories: {},
        quizAttempts: 0,
      },
    ),
  ).length;
  const related = projects.find((p) =>
    p.milestoneIds.some((id) => lessons[id].group === moduleId),
  );

  return (
    <div className="canvas reading">
      <div className="metadata">
        <Link href="/learn" className="text-[var(--accent)]">
          Learning path
        </Link>{" "}
        / Module {String(moduleId + 1).padStart(2, "0")}
      </div>
      <h1>{groups[moduleId]}</h1>
      <p className="lead">{moduleObjectives[moduleId]}</p>
      <section className="mt-5"><h2 className="text-sm">What you’ll be able to do</h2><ul className="mt-2 list-disc pl-5 text-sm text-[var(--text-secondary)]">{ls.slice(0,3).map(l=><li key={l.id}>{lessonSummaries[l.id]}</li>)}</ul></section>
      <p className="metadata mt-3">
        {ls.length} lessons · {done} mastered
      </p>
      {(() => {
        const next = ls.find((l) => !stats[l.id] || !isMastered(stats[l.id]));
        return next ? (
          <Link href={`/lesson/${next.id}`} className="btn primary mt-5">
            {done || ls.some((l) => stats[l.id]?.attempts) ? "Continue" : "Start"} with “{next.title}”
          </Link>
        ) : null;
      })()}

      {related && (
        <p className="mt-6 text-sm text-[var(--text-secondary)]">
          Apply these skills in{" "}
          <Link
            href={`/projects/${related.id}`}
            className="font-semibold text-[var(--accent)]"
          >
            {related.title}
          </Link>
          .
        </p>
      )}

      <div className="mt-10 border-t border-[var(--border)]">
        {ls.map((l, position) => {
          const r = stats[l.id] ?? {
            attempts: 0,
            correct: 0,
            solved: [],
            last: 0,
            errors: 0,
            check: false,
            legacy: false,
            masteredAt: 0,
            categories: {},
            quizAttempts: 0,
          };
          const status = lessonStatus(
            l.id,
            r,
            reviews,
            history.some((h) => h.id === l.id && h.guided),
          );
          return (
            <Link key={l.id} href={`/lesson/${l.id}`} className="index-row">
              <span className="module-id">
                {String(position + 1).padStart(2, "0")}
              </span>
              <div>
                <div className="text-sm font-medium">{l.title}</div>
                <div className="mt-1 text-xs text-[var(--muted)]">
                  {lessonSummaries[l.id]}
                </div>
              </div>
              <span className="metadata">{l.difficulty}</span>
              <span className="metadata">{status}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
