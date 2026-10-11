"use client";

import Link from "next/link";
import taskContexts from "@/content/task-context.json";
import {TableInspector} from "@/components/editor/TableInspector";
import { reviewReason } from "@/lib/review-copy";
import { useEffect, useMemo, useRef } from "react";
import { ArrowRight, Eye } from "lucide-react";
import { datasetCatalog, getLesson, groups, isBlankSql, lessons, starterFor } from "@/content";
import { MobileTaskBar } from "@/features/lesson/MobileTaskBar";
import { SqlWorkspace } from "@/components/editor/SqlWorkspace";
import {
  isMastered,
  isReviewDue,
  REVIEW_DAYS,
  useHydrated,
  useLearning,
} from "@/lib/learning-state";

export function ReviewSession({ lessonId }: { lessonId: number }) {
  const hydrated = useHydrated();
  const lesson = getLesson(lessonId);
  const stats = useLearning((s) => s.stats[lessonId]);
  if (!hydrated) {
    return (
      <div className="canvas">
        <p className="metadata" role="status">Loading your review…</p>
      </div>
    );
  }
  if (!lesson) {
    return (
      <div className="canvas">
        <h1>Review not found</h1>
        <Link href="/review" className="btn mt-4">Back to Reviews</Link>
      </div>
    );
  }
  if (!stats || !isMastered(stats)) {
    return (
      <div className="canvas reading">
        <div className="eyebrow">Spaced review</div>
        <h1>{lesson.title}</h1>
        <p className="lead">Reviews start after you master a lesson.</p>
        <Link href={`/lesson/${lesson.id}`} className="btn primary mt-6">
          Open the lesson <ArrowRight size={14} />
        </Link>
      </div>
    );
  }
  return <Session key={lessonId} lessonId={lessonId} />;
}

function Session({ lessonId }: { lessonId: number }) {
  const lesson = lessons[lessonId];
  const review = useLearning((s) => s.reviews[lessonId]);
  const allReviews = useLearning((s) => s.reviews);
  const drafts = useLearning((s) => s.drafts);
  const setDraft = useLearning((s) => s.setDraft);
  const completeReview = useLearning((s) => s.completeReview);

  const beginReview = useLearning((s) => s.beginReview);
  const updateSession = useLearning((s) => s.updateReviewSession);
  const session = useLearning((s) => s.reviewSessions[lessonId]);
  const finished = useRef(false);
  useEffect(() => { beginReview(lessonId); }, [beginReview, lessonId, review]);
  const stageHeading = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef<string | null>(null);
  const now = Date.now();
  const due = isReviewDue(review, now);
  const step = session?.stage ?? "recall";
  const choice = session?.choice ?? null;
  const revealed = session?.revealed ?? false;
  const confirmReveal = session?.confirmReveal ?? false;
  const outcome = session?.completion ?? null;
  const variant = session?.variant ?? 0;
  const cycle = session?.cycle ?? "";
  useEffect(() => { finished.current = false; }, [cycle]);
  useEffect(() => {
    if (previousStep.current !== null && previousStep.current !== step) stageHeading.current?.focus();
    previousStep.current = step;
  }, [step]);
  const setChoice = (choice: number) => updateSession(lessonId, cycle, { choice });
  const setStep = (stage: "recall" | "write") => updateSession(lessonId, cycle, { stage });
  const setConfirmReveal = (confirmReveal: boolean) => updateSession(lessonId, cycle, { confirmReveal });
  const task = lesson.tasks[variant];
  const taskContext = (taskContexts as Record<string, { columns: string[]; tables: string[] }[]>)[lesson.id][variant];
  const { sql: starter, cursor } = starterFor(lesson, variant);
  const dKey = `sql-review-${lessonId}-${variant}-${cycle}`;
  const sql = isBlankSql(drafts[dKey]) && drafts[dKey] !== "" ? starter : drafts[dKey];
  const tables = datasetCatalog[lesson.dataset]?.tables ?? [];
  const quizOk = choice !== null && choice === lesson.quiz.correct;

  const nextDue = useMemo(
    () =>
      Object.entries(allReviews)
        .filter(([id, r]) => Number(id) !== lessonId && isReviewDue(r, now))
        .sort((a, b) => a[1].due - b[1].due)[0]?.[0],
    [allReviews, lessonId, now],
  );

  const finish = (sqlOk: boolean, answerShown = false) => {
    if (finished.current) return;
    const state = completeReview(lessonId, { quiz: quizOk, sql: sqlOk }, cycle, answerShown);
    if (state) finished.current = true;
  };

  return (
    <div className="flex min-h-full flex-col">
      <div className="border-b border-[var(--border)] px-6 pt-6 pb-4 md:px-10">
        <div className="mb-2 text-sm">
          <Link href="/review" className="text-[var(--accent)]">← Reviews</Link>
        </div>
        <div className="eyebrow">
          Spaced review · {groups[lesson.group]}
        </div>
        <h1 className="!my-2 !text-[1.7rem]">{lesson.title}</h1>
        <p className="metadata">
          {step === "done" ? "Review complete" : due
            ? `Step ${step === "recall" ? 1 : 2} of 2`
            : `Next review: ${new Date(review?.due ?? now).toLocaleDateString()}. You can practise now — it won’t change your schedule.`}
        </p>
        {review && step !== "done" && <p className="metadata mt-2">{reviewReason(review)}</p>}
      </div>

      {step === "recall" && (
        <article className="canvas reading">
          <div className="eyebrow">Step 1 · Remember the concept</div>
          <h2 ref={stageHeading} tabIndex={-1} className="!mt-3 !text-[1.6rem]">{lesson.quiz.q}</h2>
          <div className="mt-6 space-y-2" role="group" aria-label="Answer options">
            {lesson.quiz.options.map((opt, i) => (
              <button
                key={opt}
                type="button"
                className={`btn w-full !justify-start text-left ${choice === i ? "primary" : ""}`}
                aria-pressed={choice === i}
                disabled={choice !== null}
                onClick={() => setChoice(i)}
              >
                {opt}
              </button>
            ))}
          </div>
          {choice !== null && (
            <div className="mt-4" aria-live="polite">
              <p className={`text-sm ${quizOk ? "feedback-ok" : "feedback-err"}`}>
                {quizOk ? "Correct. " : "Not quite. "}
                {lesson.quiz.why}
              </p>
              <button type="button" className="btn primary mt-4" onClick={() => setStep("write")}>
                Next: write the query <ArrowRight size={14} />
              </button>
            </div>
          )}
        </article>
      )}

      {step === "write" && (
        <div className="practice-layout">
          <aside className="task-pane" aria-label="Review task">
            <div className="eyebrow">Step 2 · Write it from memory</div>
            <h2 ref={stageHeading} tabIndex={-1} id="challenge-prompt" className="mt-3 !text-[1.35rem] leading-snug">{task.prompt}</h2>
            <p className="mt-3 text-sm text-[var(--text-secondary)]">
              No hints this time — that’s what makes it a review. Check your answer when ready.
            </p>
            {!!session?.attempts && <p className="metadata mt-3" role="status">
              Checks this review: {session.attempts}. {session.lastFeedback}
            </p>}
            <div className="my-6 h-px bg-[var(--border)]" />
            <p className="metadata mt-3">Required columns: <code>{taskContext.columns.join(", ")}</code>. {task.ordered ? "Row order is checked." : "Any row order is accepted."}</p>
          <TableInspector key={`${lesson.id}:${variant}`} tables={tables} relevantTables={taskContext.tables}/>
            <div className="mt-6">
              {!revealed && !confirmReveal && (
                <button type="button" className="btn ghost" onClick={() => setConfirmReveal(true)}>
                  <Eye size={15} /> I’m stuck — show the answer
                </button>
              )}
              {!revealed && confirmReveal && (
                <div className="border border-[var(--border)] bg-[var(--secondary)] p-3 text-sm">
                  <p>{due ? "Showing the answer ends this review as ‘not remembered yet’, so it comes back tomorrow." : "Showing the answer ends this extra practice. Your scheduled review date stays the same."}</p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      className="btn primary"
                      onClick={() => {
                        finish(false, true);
                      }}
                    >
                      Show answer
                    </button>
                    <button type="button" className="btn" onClick={() => setConfirmReveal(false)}>
                      Keep trying
                    </button>
                  </div>
                </div>
              )}
            </div>
          </aside>
          <SqlWorkspace
            value={sql}
            onChange={(v) => setDraft(dKey, v)}
            graded
            taskKey={dKey}
            starter={starter}
            starterCursor={cursor}
            tables={tables}
            editorLabel="Review SQL editor"
            header={<MobileTaskBar watchId="challenge-prompt" label="Review task" prompt={task.prompt} tables={tables} />}
            allowWrites={lesson.mode === "lab"}
            answer={task.answer}
            ordered={task.ordered}
            required={task.required}
            planValidation={task.planValidation}
            validate={task.validate}
            onGraded={(res) => {
              updateSession(lessonId, cycle, {
                attempts: (useLearning.getState().reviewSessions[lessonId]?.attempts ?? 0) + 1,
                lastFeedback: res.error ?? res.grade?.message ?? "Check did not complete. Try again.",
              });
              if (res.grade?.ok) finish(true);
            }}
          />
        </div>
      )}

      {step === "done" && outcome && (
        <article className="canvas reading" aria-live="polite">
          <div className="eyebrow">Review complete</div>
          <h2 ref={stageHeading} tabIndex={-1} className="!mt-3 !text-[1.8rem]">
            {outcome.ok ? "Still remembered." : "Worth another look."}
          </h2>
          <ul className="mt-5 space-y-1 text-sm">
            <li className={quizOk ? "feedback-ok" : "feedback-err"}>
              {quizOk ? "✓" : "✗"} Concept question
            </li>
            <li className={revealed ? "feedback-err" : "feedback-ok"}>
              {revealed ? "✗ Query (answer shown)" : "✓ Query written from memory"}
            </li>
          </ul>
          <p className="mt-5 text-sm">
            {outcome.early
              ? "This was extra practice before the review was due, so your schedule didn’t change."
              : outcome.ok
                ? `Next review in ${REVIEW_DAYS[outcome.state.level]} days (${new Date(outcome.state.due).toLocaleDateString()}).`
                : `It will come back tomorrow (${new Date(outcome.state.due).toLocaleDateString()}). Your lesson stays mastered.`}
          </p>
          {revealed && (
            <pre className="sql-mono mt-4 overflow-x-auto border border-[var(--border)] p-3 text-xs">{task.answer}</pre>
          )}
          <div className="mt-8 flex flex-wrap gap-3">
            {nextDue !== undefined ? (
              <Link href={`/review/${nextDue}`} className="btn primary">
                Next review <ArrowRight size={14} />
              </Link>
            ) : (
              <Link href="/review" className="btn primary">
                Back to Reviews <ArrowRight size={14} />
              </Link>
            )}
            {!outcome.ok && (
              <Link href={`/lesson/${lessonId}`} className="btn">
                Revisit the lesson
              </Link>
            )}
          </div>
        </article>
      )}
    </div>
  );
}
