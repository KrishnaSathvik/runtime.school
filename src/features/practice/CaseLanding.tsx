"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { lessons } from "@/content";
import { practiceDatasets, topicLabel } from "@/content/question-bank";
import type { CaseStudyMeta } from "@/content/question-bank/case-studies";
import { useHydrated, useLearning } from "@/lib/learning-state";
import { CasePrepDemo } from "./CasePrepDemo";
import { DifficultyBadge } from "./Badges";
import { STATUS_LABEL } from "./status";
import { caseProgress, resumeCase } from "./case-studies";

export function CaseLanding({ meta }: { meta: CaseStudyMeta }) {
  const hydrated = useHydrated();
  const questions = useLearning((s) => s.questions);
  const stats = useLearning((s) => s.stats);
  const attempts = useLearning((s) => s.attempts);
  const history = useLearning((s) => s.history);
  const state = { questions, stats, attempts, history };
  const progress = caseProgress(meta, state);
  const resume = resumeCase(meta, state);
  const dataset = practiceDatasets[progress.items[0]?.q.datasetId ?? "market"];
  const pct = progress.total ? Math.round((100 * progress.solved) / progress.total) : 0;

  return (
    <div className="canvas">
      <Link href="/practice/questions" className="inline-flex items-center gap-1 text-sm text-[var(--accent)]">
        <ArrowLeft size={14} aria-hidden /> All questions
      </Link>

      <div className="eyebrow mt-6">Case study · {meta.difficultyLabel}</div>
      <h1>{meta.title}</h1>
      <p className="lead">{meta.summary}</p>

      <section className="mt-8 max-w-3xl space-y-6 text-[15px] leading-relaxed">
        <div>
          <h2 className="!text-base !font-semibold">The scenario</h2>
          <p className="mt-2 text-[var(--text-secondary)]">{meta.scenario}</p>
        </div>
        <div>
          <h2 className="!text-base !font-semibold">What you will investigate</h2>
          <p className="mt-2 text-[var(--text-secondary)]">{meta.investigation}</p>
        </div>
        <div>
          <h2 className="!text-base !font-semibold">Available data</h2>
          <p className="mt-2 text-[var(--text-secondary)]">{meta.dataOverview}</p>
          <ul className="mt-3 space-y-2 text-sm text-[var(--text-secondary)]">
            {meta.dataTables.map((t) => (
              <li key={t.name}>
                <code className="inline-code">{t.name}</code> — {t.role}
              </li>
            ))}
          </ul>
          <p className="metadata mt-2">Dataset: {dataset?.name} · {dataset?.role}</p>
        </div>
        <div>
          <h2 className="!text-base !font-semibold">SQL skills required</h2>
          <p className="mt-2 text-[var(--text-secondary)]">{meta.skillLabels.join(" · ")}</p>
          <p className="metadata mt-2">{meta.complexityNote}</p>
          <ul className="mt-3 space-y-1 text-sm">
            {meta.skillLessonIds.map((id) => {
              const lesson = lessons[id];
              if (!lesson) return null;
              return (
                <li key={id}>
                  <Link href={`/lesson/${id}`} className="text-[var(--accent-strong)] underline">
                    {lesson.title}
                  </Link>
                  <span className="metadata"> — optional preparation in Learn</span>
                </li>
              );
            })}
          </ul>
        </div>
        <p className="metadata border-y border-[var(--border)] py-4">{meta.independentNote}</p>
      </section>

      {meta.preparation && (
        <section className="mt-10 max-w-3xl" aria-label="Case preparation">
          <h2 className="!text-lg">{meta.preparation.title}</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-[var(--text-secondary)]">
            {meta.preparation.intro}
          </p>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-[var(--text-secondary)]">
            {meta.preparation.points.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
          <ol className="mt-6 space-y-4 text-sm">
            {meta.preparation.demos.map((demo) => (
              <CasePrepDemo key={demo.title} demo={demo} />
            ))}
          </ol>
          <p className="metadata mt-4">
            These inspections are ungraded and do not change case progress.
          </p>
        </section>
      )}

      <section className="mt-10 border-y border-[var(--border)] py-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-[220px] flex-1">
            <p className="text-sm" role="status">
              {hydrated
                ? `${progress.solved} of ${progress.total} investigations solved without hints`
                : `${progress.total} investigations`}
            </p>
            <div
              className="mt-2 h-[3px] w-full max-w-sm overflow-hidden bg-[var(--border)]"
              role="progressbar"
              aria-label={`${meta.title} progress`}
              aria-valuemin={0}
              aria-valuemax={progress.total}
              aria-valuenow={hydrated ? progress.solved : 0}
            >
              <div className="h-full bg-[var(--accent)]" style={{ width: `${hydrated ? pct : 0}%` }} />
            </div>
            {hydrated && !progress.complete && (
              <p className="metadata mt-3">
                Next: Stage {resume.q.caseStudy!.stage}. {resume.brief}
              </p>
            )}
            {hydrated && progress.complete && (
              <p className="feedback-ok mt-3 text-sm">{meta.completionSummary}</p>
            )}
          </div>
          {hydrated && (
            <Link href={`/practice/${resume.q.slug}`} className="btn primary">
              {progress.complete
                ? "Review first investigation"
                : progress.solved > 0
                  ? "Continue investigation"
                  : "Start investigation"}
              : Stage {resume.q.caseStudy!.stage} <ArrowRight size={14} />
            </Link>
          )}
        </div>
      </section>

      <div className="learning-path mt-8 border-t border-[var(--border)]" aria-label="Investigations in this case">
        {progress.items.map((item) => {
          const status = !hydrated
            ? "—"
            : item.status === "guided" && state.questions[item.q.id]?.guidedSolved
              ? "Solved with help"
              : STATUS_LABEL[item.status];
          const current = hydrated && resume.q.id === item.q.id && !progress.complete;
          return (
            <Link
              key={item.q.id}
              href={`/practice/${item.q.slug}`}
              className={`index-row ${current ? "current-module" : ""}`}
              aria-current={current ? "step" : undefined}
            >
              <span className="module-id">
                {String(item.q.caseStudy!.stage).padStart(2, "0")}
              </span>
              <div className="min-w-0">
                <div className="text-[15px] font-medium leading-snug">{item.brief}</div>
                <div className="mt-1.5 max-w-xl text-xs leading-relaxed text-[var(--muted)]">
                  {item.businessWhy}
                </div>
                <div className="mt-1 max-w-xl text-xs leading-relaxed text-[var(--muted)]">
                  {topicLabel[item.q.primaryTopic]} · {item.q.title}
                </div>
              </div>
              <div className="index-aside">
                <DifficultyBadge difficulty={item.q.difficulty} />
                <span className="index-progress">{status}</span>
              </div>
            </Link>
          );
        })}
      </div>

      <p className="metadata mt-8 max-w-3xl">
        Solving a case investigation updates that question wherever it appears. Completing the case
        does not mark Learn lessons mastered or create a downloadable Project finding.
      </p>
    </div>
  );
}
