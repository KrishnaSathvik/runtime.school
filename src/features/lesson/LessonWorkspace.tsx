"use client";
import { ActivityHeader } from "@/components/layout/PageHeader";
import { WorkspaceSplit } from "@/components/editor/WorkspaceSplit";
import taskContexts from "@/content/task-context.json";
import {TableInspector} from "@/components/editor/TableInspector";
import {WalkthroughStep} from "./WalkthroughStep";
import {lessonSummaries} from "@/content/ux-summaries";
import { learnerExplanation } from "@/lib/content-copy";

import Link from "next/link";
import {useSearchParams} from "next/navigation";
import { WorkspaceHeading, WorkspaceToolbar } from "@/components/layout/WorkspaceHeading";
import dynamic from "next/dynamic";
import { EngineeringReasoning } from "@/features/teaching/EngineeringReasoning";
import { demoForLesson } from "@/features/teaching/demos";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Eye, Lightbulb, RotateCcw } from "lucide-react";
import {
  courseOrder,
  datasetCatalog,
  getLesson,
  getProject,
  groups,
  isBlankSql,
  starterFor,
} from "@/content";
import { SqlWorkspace } from "@/components/editor/SqlWorkspace";
import { ExampleRun } from "@/components/editor/ExampleRun";
import { MobileTaskBar } from "@/features/lesson/MobileTaskBar";
import { NextInTrack, TrackBanner, useTrackContext } from "@/features/practice/TrackBanner";
import { track } from "@/lib/analytics";
import {
  attemptKey,
  classifyFailure,
  draftKey,
  isMastered,
  milestoneDone,
  sessionKey,
  useHydrated,
  useLearning,
  type LessonStats,
  type Stage,
} from "@/lib/learning-state";

import { PrerequisiteLinks } from "@/features/practice/PrerequisiteLinks";
import { FindingEditor } from "@/features/projects/FindingEditor";

const ConceptDemo = dynamic(() => import("@/features/teaching/ConceptDemo").then((m) => m.ConceptDemo));
const NextSteps = dynamic(() => import("./NextSteps").then((m) => m.NextSteps));

const STAGES: Stage[] = ["understand", "practice", "review", "complete"];
const STAGE_LABELS: Record<Stage, string> = {
  understand: "Understand",
  practice: "Practice",
  review: "Concept check",
  complete: "Complete",
};

export function LessonWorkspace({
  lessonId,
  projectId = null,
  initialChallenge = null,
  trackId = null,
  learnConcept = false,
}: {
  learnConcept?: boolean;
  lessonId: number;
  projectId?: number | null;
  /** 0 or 1: open Practice on this challenge (links from the Practice browser). */
  initialChallenge?: number | null;
  /** Practice track this challenge was opened from. */
  trackId?: string | null;
}) {
  const hydrated = useHydrated();
  const lesson = getLesson(lessonId);
  const project = projectId !== null ? getProject(projectId) : undefined;
  const validProject =
    projectId === null || (!!project && project.milestoneIds.includes(lessonId));

  if (!hydrated) {
    return (
      <div className="canvas">
        <p className="metadata" role="status">
          Loading your saved work…
        </p>
      </div>
    );
  }
  if (!lesson || !validProject) {
    return (
      <div className="canvas">
        <h1>{lesson ? "Milestone not found" : "Lesson not found"}</h1>
        <Link href={projectId !== null ? "/projects" : "/sql"} className="btn mt-4">
          {projectId !== null ? "Back to Projects" : "Back to Learn"}
        </Link>
      </div>
    );
  }
  return (
    <Workspace
      key={`${projectId}:${lessonId}:${initialChallenge}:${learnConcept}`}
      lessonId={lessonId}
      projectId={projectId}
      initialChallenge={initialChallenge}
      trackId={trackId}
      learnConcept={learnConcept}
    />
  );
}

function Workspace({
  lessonId,
  projectId,
  initialChallenge,
  trackId,
  learnConcept,
}: {
  lessonId: number;
  projectId: number | null;
  initialChallenge: number | null;
  trackId: string | null;
  learnConcept: boolean;
}) {
  const params=useSearchParams();
  const projectData=params.get("projectStep")==="data";
  const lesson = getLesson(lessonId)!;
  const project = projectId !== null ? getProject(projectId) : undefined;
  const stats = useLearning((s) => s.stats[lessonId]) ?? emptyStats();
  const setSession = useLearning((s) => s.setSession);
  const setDraft = useLearning((s) => s.setDraft);
  const drafts = useLearning((s) => s.drafts);
  const attempts = useLearning((s) => s.attempts);
  const markGuided = useLearning((s) => s.markGuided);
  const freshAttempt = useLearning((s) => s.freshAttempt);
  const recordCheck = useLearning((s) => s.recordCheck);
  const completeQuiz = useLearning((s) => s.completeQuiz);
  const setMilestoneNotes = useLearning((s) => s.setMilestoneNotes);
  const milestone = useLearning((s) =>
    projectId !== null ? s.projects[projectId]?.milestones[lessonId] : undefined,
  );
  const projectRecord = useLearning((s) =>
    projectId !== null ? s.projects[projectId] : undefined,
  );

  const history = useLearning((s) => s.history);
  const solved = projectId !== null ? (milestone?.solved ?? []) : stats.solved;
  // Passed with a hint or the answer: kept and shown, but not yet counted toward mastery.
  const passedWithHelp = (v: number) =>
    !solved.includes(v) &&
    history.some(
      (h) => h.id === lessonId && h.ok && (h.variant === undefined || h.variant === v) && (h.project ?? null) === projectId,
    );
  const checkPassed = projectId !== null ? !!milestone?.check : stats.check || stats.legacy;
  const done = projectId !== null ? milestoneDone(milestone) : isMastered(stats);

  // Restore the saved stage and challenge for this exact activity.
  const [initial] = useState(() => {
    if (initialChallenge === 0 || initialChallenge === 1) {
      return { stage: "practice" as Stage, variant: initialChallenge };
    }
    const s = useLearning.getState();
    const saved = s.sessions[sessionKey(lessonId, projectId)];
    const active =
      s.active && s.active.id === lessonId && s.active.project === projectId
        ? s.active
        : null;
    const firstUnsolved = solved.includes(0) && !solved.includes(1) ? 1 : 0;
    const variant = active?.variant ?? saved?.variant ?? firstUnsolved;
    // Projects: first open shows Learn the approach (brief); returning restores the saved stage.
    // Learn is never a gate — Write SQL and Finish stay reachable from the step bar.
    let stage: Stage = active?.stage ?? saved?.stage ?? (done ? "complete" : "understand");
    if (learnConcept || (projectId !== null && projectData)) stage = "understand";
    if (stage === "complete" && !done) stage = solved.length >= 2 ? "review" : "practice";
    return { stage, variant: variant === 1 ? 1 : 0 };
  });
  const [stage, setStage] = useState<Stage>(initial.stage);
  useEffect(() => {
    const bar = document.querySelector<HTMLElement>(".stage-bar");
    const active = bar?.querySelector<HTMLElement>(".stage.active");
    if (!bar || !active) return;
    const left = active.offsetLeft - (bar.clientWidth - active.offsetWidth) / 2;
    bar.scrollTo({ left: Math.max(0, left) });
  }, [stage]);
  const [variant, setVariant] = useState(initial.variant);
  useEffect(()=>{if(projectId!==null&&projectData)setStage("understand");},[projectId,projectData]);
  const trackCtx = useTrackContext(trackId, `lc-${lessonId}-${variant}`);
  const [quizChoice, setQuizChoice] = useState<number | null>(null);
  const [quizOk, setQuizOk] = useState<boolean | null>(null);
  const [confirmReveal, setConfirmReveal] = useState(false);
  const [confirmHint, setConfirmHint] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    setSession(lessonId, projectId, stage, variant);
  }, [lessonId, projectId, stage, variant, setSession]);

  useEffect(() => {
    track("lesson_started", {
      subject: "sql",
      lesson: lessonId,
      project: projectId,
      position: courseOrder.indexOf(lessonId) + 1,
    });
  }, [lessonId, projectId]);

  // Move focus to the new stage heading so keyboard/screen-reader users follow along.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [stage]);

  const task = lesson.tasks[variant];
  const taskContext = (taskContexts as Record<string, { columns: string[]; tables: string[] }[]>)[lessonId][variant];
  const milestoneTables = [...new Set((taskContexts as Record<string, { tables: string[] }[]>)[lessonId].flatMap(t => t.tables))];
  const key = attemptKey(lessonId, variant, projectId);
  const dKey = draftKey(lessonId, variant, projectId);
  const attempt = attempts[key];
  const guided = !!attempt?.guided;
  const revealed = !!attempt?.revealed;
  const hintLevel = attempt?.guided ? Math.min(lesson.hints.length, attempt.hints) : 0;
  const { sql: starter, cursor: starterCursor } = starterFor(lesson, variant);
  // Comment-only drafts (from the old starter) hold no SQL; show the scaffold instead.
  const sql = isBlankSql(drafts[dKey]) && drafts[dKey] !== "" ? starter : drafts[dKey];
  const tables = useMemo(
    () => datasetCatalog[lesson.dataset]?.tables ?? [],
    [lesson.dataset],
  );

  const position = courseOrder.indexOf(lessonId) + 1;
  const milestoneIndex = project ? project.milestoneIds.indexOf(lessonId) : -1;
  const previousLessonId = courseOrder[courseOrder.indexOf(lessonId) - 1];
  const nextLessonId = courseOrder[courseOrder.indexOf(lessonId) + 1];
  const nextMilestone = project
    ? (project.milestoneIds.find(
        (id) => id !== lessonId && !milestoneDone(projectRecord?.milestones[id]),
      ) ?? null)
    : null;

  const otherVariant = variant === 0 ? 1 : 0;
  const goProjectStep = (step: number) => {
    const url = new URL(window.location.href);
    url.searchParams.delete("projectStep");
    window.history.replaceState(null, "", url.pathname + url.search);
    setStage(step === 0 ? "understand" : step === 1 ? "practice" : done ? "complete" : "review");
  };
  const goStage = (next: Stage) => {
    if (next === "complete" && !done) return;
    if(project){const url=new URL(window.location.href);url.searchParams.delete("projectStep");window.history.replaceState(null,"",url.pathname+url.search);}
    setStage(next);
  };
  const switchVariant = (v: number) => {
    setVariant(v);
    setConfirmReveal(false);
    setConfirmHint(false);
  };

  const missing: string[] = [];
  for (const v of [0, 1]) {
    if (solved.includes(v)) continue;
    missing.push(
      passedWithHelp(v)
        ? `solve Challenge ${v + 1} again without hints (you already passed it with help)`
        : `solve Challenge ${v + 1} without hints or the answer`,
    );
  }
  if (!checkPassed) missing.push("pass the concept check");

  const help = <div className="workspace-help-content">
            <PrerequisiteLinks lessonIds={initialChallenge !== null || stats.errors >= 2 ? [lessonId, ...lesson.prereq] : lesson.prereq} struggling={stats.errors >= 2 && !done} />
            {hintLevel < lesson.hints.length && hintLevel === 0 && !confirmHint && (
              <button
                type="button"
                className="btn ghost"
                onClick={() => setConfirmHint(true)}
              >
                <Lightbulb size={15} /> Show a hint
              </button>
            )}
            {hintLevel === 0 && confirmHint && !revealed && (
              <div className="border border-[var(--border)] bg-[var(--secondary)] p-3 text-sm" role="group" aria-label="Confirm showing a hint">
                <p>Showing a hint marks this attempt as using help. A correct answer will count as solved with help.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" className="btn primary" onClick={() => { markGuided(key, "hint"); setConfirmHint(false); }}>
                    Show hint
                  </button>
                  <button type="button" className="btn" onClick={() => setConfirmHint(false)}>
                    Keep trying
                  </button>
                </div>
              </div>
            )}
            {hintLevel > 0 && hintLevel < lesson.hints.length && (
              <button
                type="button"
                className="btn ghost"
                onClick={() => markGuided(key, "hint")}
              >
                <Lightbulb size={15} /> Show another hint
              </button>
            )}
            {hintLevel === 0 && (
              <p className="metadata mt-1">
                A correct answer after using a hint counts as solved with help. To master
                this {project ? "milestone" : "lesson"}, try both challenges without hints or the answer.
              </p>
            )}
            {hintLevel > 0 && (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[var(--text-secondary)]">
                {lesson.hints.slice(0, hintLevel).map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            )}
            <div className="mt-4">
              {!revealed && !confirmReveal && (
                <button type="button" className="btn ghost" onClick={() => setConfirmReveal(true)}>
                  <Eye size={15} /> Show the answer
                </button>
              )}
              {!revealed && confirmReveal && (
                <div className="border border-[var(--border)] bg-[var(--secondary)] p-3 text-sm" role="group" aria-label="Confirm showing the answer">
                  <p>
                    If you view the answer, a correct query will count as <strong>solved with help</strong>.
                    You can try again without hints later.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn primary"
                      onClick={() => {
                        markGuided(key, "reveal");
                        setConfirmReveal(false);
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
              {revealed && (
                <div className="border border-[var(--border)] p-3">
                  <div className="eyebrow">One correct answer</div>
                  <pre tabIndex={0} className="sql-mono mt-2 overflow-x-auto text-xs">{task.answer}</pre>
                  <p className="metadata mt-2">
                    Other queries can be correct too. Try to understand each clause, then
                    choose “Try again without hints” and write it yourself.
                  </p>
                  <button
                    type="button"
                    className="btn mt-2"
                    onClick={() => setDraft(dKey, task.answer)}
                  >
                    Put it in the editor
                  </button>
                </div>
              )}
            </div>
            {guided && (
              <button
                type="button"
                className="btn mt-4"
                onClick={() => freshAttempt(key, dKey, starter)}
              >
                <RotateCcw size={14} /> Try again without hints
              </button>
            )}
            <p className="metadata mt-5">
              {solved.length} of 2 challenges solved without hints
              {[0, 1].some(passedWithHelp) ? ` · ${[0, 1].filter(passedWithHelp).length} passed with help` : ""}
              {guided ? " · using help this time" : ""}
            </p>

  </div>;

  return (
    <div className={`${stage === "practice" ? "workspace-page " : ""}flex min-h-full flex-col`}>
      <ActivityHeader>
        {trackCtx && <TrackBanner ctx={trackCtx} />}
        {project ? (
          <WorkspaceToolbar
            listHref={`/projects/${project.id}`}
            listLabel="Project overview"
            indexLabel={`${milestoneIndex + 1} / ${project.milestoneIds.length}`}
            prev={
              milestoneIndex > 0
                ? {
                    href: `/projects/${project.id}/milestone/${project.milestoneIds[milestoneIndex - 1]}`,
                    label: "Previous milestone",
                  }
                : null
            }
            next={
              milestoneIndex < project.milestoneIds.length - 1
                ? {
                    href: `/projects/${project.id}/milestone/${project.milestoneIds[milestoneIndex + 1]}`,
                    label: "Next milestone",
                  }
                : null
            }
          />
        ) : !trackCtx ? (
          <WorkspaceToolbar
            listHref="/sql"
            listLabel="Learning path"
            indexLabel={`${position} / ${courseOrder.length}`}
            prev={
              previousLessonId !== undefined
                ? {
                    href: `/lesson/${previousLessonId}`,
                    label: `Previous lesson: ${getLesson(previousLessonId)?.title ?? "Previous"}`,
                  }
                : null
            }
            next={
              nextLessonId !== undefined
                ? {
                    href: `/lesson/${nextLessonId}`,
                    label: `Next lesson: ${getLesson(nextLessonId)?.title ?? "Next"}`,
                  }
                : null
            }
          />
        ) : null}
        {project && (
          <nav className="milestone-stepper" aria-label={`${project.title} milestones`}>
            <span className="milestone-stepper-project">{project.title}</span>
            <ol>
              {project.milestoneIds.map((id, i) => {
                const complete = milestoneDone(projectRecord?.milestones[id]);
                return (
                  <li key={id}>
                    <Link
                      href={`/projects/${project.id}/milestone/${id}`}
                      aria-current={id === lessonId ? "step" : undefined}
                      title={getLesson(id)?.title}
                      className={complete ? "done" : undefined}
                    >
                      {complete ? "✓" : String(i + 1).padStart(2, "0")}
                      <span className="milestone-stepper-name">{getLesson(id)?.title}</span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </nav>
        )}
        <WorkspaceHeading
          title={lesson.title}
          meta={
            project
              ? [datasetCatalog[project.dataset]?.name, lesson.difficulty]
              : [groups[lesson.group], `Lesson ${position} of ${courseOrder.length}`, lesson.difficulty]
          }
        />
        {project ? <nav className="stage-bar project-stage-bar" aria-label="Project steps">
          <button type="button" className={`stage ${stage === "understand" ? "active" : ""}`} aria-current={stage === "understand" ? "step" : undefined} onClick={() => goProjectStep(0)}>
            <span className="grid h-[19px] w-[19px] place-items-center rounded-full border border-[var(--strong)] text-xs">1</span>
            Learn the approach
          </button>
          <button type="button" className={`stage ${stage === "practice" ? "active" : ""}`} aria-current={stage === "practice" ? "step" : undefined} onClick={() => goProjectStep(1)}>
            <span className="grid h-[19px] w-[19px] place-items-center rounded-full border border-[var(--strong)] text-xs">2</span>
            Write SQL
          </button>
          <button type="button" className={`stage ${stage === "review" || stage === "complete" ? "active" : ""}`} aria-current={stage === "review" || stage === "complete" ? "step" : undefined} onClick={() => goProjectStep(2)}>
            <span className="grid h-[19px] w-[19px] place-items-center rounded-full border border-[var(--strong)] text-xs">3</span>
            Finish
          </button>
        </nav> : (
        <nav className="stage-bar" aria-label="Lesson stages">
          {STAGES.map((s, i) => {
            const locked = s === "complete" && !done;
            return (
              <button
                key={s}
                type="button"
                className={`stage ${stage === s ? "active" : ""}`}
                aria-current={stage === s ? "step" : undefined}
                aria-disabled={locked || undefined}
                title={locked ? `To complete: ${missing.join(", ")}` : undefined}
                onClick={() => goStage(s)}
              >
                <span className="grid h-[19px] w-[19px] place-items-center rounded-full border border-[var(--strong)] text-xs">
                  {i + 1}
                </span>
                {STAGE_LABELS[s]}
              </button>
            );
          })}
        </nav>
        )}
      </ActivityHeader>

      {stage === "understand" && (
        <article className="canvas reading lesson-reading">
          <div className="lesson-prose">
          {project ? <>
            <section className="business-question" aria-label="Business question">
              <p className="eyebrow">Business question</p>
              <h2 id="business-question" ref={headingRef} tabIndex={-1} className="!mt-2 !text-[1.6rem] font-medium tracking-tight">
                {lessonSummaries[lessonId]}
              </h2>
              <p className="metadata mt-2">{project.title}, milestone {milestoneIndex + 1} of {project.milestoneIds.length}: {project.description}</p>
            </section>
            <section className="mt-6" aria-label="Milestone task and data">
              <h3 className="text-base font-semibold">What you’ll deliver</h3>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm">{lesson.tasks.map((t, i) => <li key={i}>{t.prompt}</li>)}</ol>
              <TableInspector
                title="Tables for this milestone"
                caption="Schema and sample rows for the SQL challenges in this milestone."
                tables={milestoneTables}
                showRelations={milestoneTables.length > 1}
                layout="grid"
              />
            </section>
            <section className="mt-8">
              <h3 className="text-base font-semibold">Learn the approach</h3>
              <p className="mt-2 !max-w-[42rem] text-[16px] leading-[1.72]">
                {learnerExplanation(lesson.concept)}
              </p>
            </section>
          </> : <>
          <h2 ref={headingRef} tabIndex={-1} className="!mt-3 !text-[2rem] font-medium tracking-tight">
            {lessonSummaries[lessonId]}
          </h2>
          <p className="mt-4 !max-w-[42rem] text-[16px] leading-[1.72]">
            {learnerExplanation(lesson.concept)}
          </p>
          </>}
          {demoForLesson(lessonId) && <ConceptDemo kind={demoForLesson(lessonId)!} />}
          <EngineeringReasoning key={lessonId} lessonId={lessonId} />
          {!project && (
            <section className="mt-10" aria-label="Lesson data">
              <TableInspector
                title="Tables for this lesson"
                caption="You'll query these in the two challenges. Other tables in the same database aren't shown here."
                tables={milestoneTables}
                showRelations={milestoneTables.length > 1}
                layout="grid"
              />
            </section>
          )}
          <section className="mt-10">
            <h3 className="text-base font-semibold">Example</h3>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Run this example and look at the output. Examples are for learning —
              running them never affects your progress.
            </p>
            <div className="mt-4">
              <ExampleRun
                query={lesson.example}
                allowWrites={lesson.mode === "lab"}
                title="example.sql · SQLite"
                describe
              />
            </div>
          </section>
          <aside className="mt-8 border-l-2 border-[var(--accent)] pl-4 text-sm leading-relaxed text-[var(--text-secondary)]">
            <strong className="text-[var(--text)]">A mistake to watch for:</strong>{" "}
            {lesson.trap}
          </aside>
          {lesson.walkthrough?.length > 0 && (
            <section className="mt-10" aria-label="Build it step by step">
              <h3 className="text-base font-semibold">Build it step by step</h3>
              <p className="metadata mt-1">
                How the example is built, one idea at a time.
              </p>
              <ol className="mt-4 space-y-4 text-sm">
                {lesson.walkthrough.map((step, i) => (
                  <li key={step.title} className="border-b border-[var(--border)] pb-4">
                    <strong>
                      {i + 1}. {step.title}
                    </strong>
                    {step.description && (
                      <p className="mt-1 text-[var(--text-secondary)]">{learnerExplanation(step.description)}</p>
                    )}
                    <WalkthroughStep query={step.query} allowWrites={lesson.mode === "lab"}/>
                  </li>
                ))}
              </ol>
            </section>
          )}
          <div className={project ? "next-action-bar" : "mt-10 border-t border-[var(--border)] pt-8"}>
            {project ? (
              <span className="metadata">You have the question, the tables and a worked example. Next, write the query.</span>
            ) : (
              <p className="metadata mb-3 max-w-xl">
                Next you’ll write SQL in two graded challenges. Running the example above does not count —
                only checked challenges count toward mastery.
              </p>
            )}
            <button type="button" className="btn primary" onClick={() => project ? goProjectStep(1) : goStage("practice")}>
              {project ? "Write SQL — start Challenge 1" : "Try it yourself — start Challenge 1"} <ArrowRight size={14} />
            </button>
          </div>
          </div>
        </article>
      )}

      {stage === "practice" && (
        <WorkspaceSplit>
          <aside className="task-pane" aria-label="Challenge instructions">
            {project && (
              <p className="project-context">
                <span className="eyebrow block">Business question</span>
                {lessonSummaries[lessonId]}{" "}
                <button type="button" className="text-[var(--accent)]" onClick={() => goProjectStep(0)}>
                  Learn the approach
                </button>
              </p>
            )}
            <div className="flex gap-2" role="group" aria-label="Choose challenge">
              {[0, 1].map((v) => (
                <button
                  key={v}
                  type="button"
                  className={`btn ${variant === v ? "primary" : ""}`}
                  aria-pressed={variant === v}
                  onClick={() => switchVariant(v)}
                >
                  Challenge {v + 1}
                  {solved.includes(v) ? " ✓" : passedWithHelp(v) ? " · passed with help" : ""}
                </button>
              ))}
            </div>
            <div className="metadata mt-6">
              Challenge {variant + 1} of 2
            </div>
            <h2
              id="challenge-prompt"
              ref={headingRef}
              tabIndex={-1}
              className="mt-3 !text-[1.35rem] leading-snug"
            >
              {task.prompt}
            </h2>
            <section className="mt-4 text-sm" aria-label="Answer requirements">
              <h3 className="text-sm font-semibold">Answer requirements</h3>
              {taskContext.columns.length > 0 && (
                <p className="mt-2">
                  Required columns: <code>{taskContext.columns.join(", ")}</code>
                </p>
              )}
              <p className="metadata mt-2">
                {task.ordered ? "Return rows in the requested order." : "Any row order is accepted."}
              </p>
              {lesson.mode === "lab" && (
                <p className="metadata mt-2">
                  Table changes and task constraints are also checked. Each run starts with fresh
                  sample data.
                </p>
              )}
            </section>
            <div className="my-6 h-px bg-[var(--border)]" />
            <TableInspector key={variant} tables={taskContext.tables} showRelations={taskContext.tables.length > 1} />
            <div className="my-6 h-px bg-[var(--border)]" />

          </aside>
          <SqlWorkspace
            help={help}
            value={sql}
            onChange={(next) => setDraft(dKey, next)}
            graded
            taskKey={key}
            header={
              <MobileTaskBar
                watchId="challenge-prompt"
                label={`Challenge ${variant + 1}`}
                prompt={task.prompt}
                tables={tables}
              />
            }
            editorLabel={`SQL editor for challenge ${variant + 1}`}
            allowWrites={lesson.mode === "lab"}
            answer={task.answer}
            ordered={task.ordered}
            required={task.required}
            planValidation={task.planValidation}
            validate={task.validate}
            guided={guided}
            starter={starter}
            starterCursor={starterCursor}
            tables={tables}
            placeholder={
              lesson.mode === "lab"
                ? "Write your SQL script. End it with a SELECT so you can see the result."
                : "Write your SQL here"
            }
            nextAction={
              trackCtx ? (
                <NextInTrack ctx={trackCtx} />
              ) : solved.length >= 2 || (solved.includes(otherVariant) && !guided) ? (
                <button type="button" className="btn primary" onClick={() => goStage("review")}>
                  Continue to concept check <ArrowRight size={14} />
                </button>
              ) : !solved.includes(otherVariant) ? (
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => switchVariant(otherVariant)}
                >
                  Next: Challenge {otherVariant + 1} <ArrowRight size={14} />
                </button>
              ) : null
            }
            onGraded={(res, wasGuided) => {
              const ok = !!res.grade?.ok;
              recordCheck({
                lessonId,
                variant,
                project: projectId,
                ok,
                guided: wasGuided || guided,
                query: sql,
                result: res.result ?? null,
                category: ok ? null : classifyFailure(res),
              });
            }}
          />
        </WorkspaceSplit>
      )}

      {project && (stage === "review" || stage === "complete") && <section className="canvas reading !pb-0">
        <h2>Your saved work</h2>
        <p className="metadata mt-2">Checked SQL (Check answer) and findings are saved with this milestone. Findings do not affect SQL credit or mastery.</p>
        {[0, 1].map(v => {
          const r = milestone?.results[v] as { ok?: boolean; sql?: string } | undefined;
          const verified = r?.ok ? (r.sql ?? milestone?.queries[v]) : undefined;
          const shown = verified ?? milestone?.queries[v];
          if (!shown) return null;
          return (
            <details key={v} className="mt-3 border-b border-[var(--border)] pb-3">
              <summary className="text-sm">
                Challenge {v + 1} · {verified ? "verified Check answer SQL" : "last checked SQL (not verified)"}
                {milestone?.solved.includes(v) ? " · solved without hints" : ""}
              </summary>
              <pre tabIndex={0} className="sql-mono mt-3 overflow-auto text-xs">{shown}</pre>
            </details>
          );
        })}
        <FindingEditor
          projectId={project.id}
          lessonId={lessonId}
          milestone={milestone}
          draftSql={sql}
          activeVariant={variant}
          onChange={(notes) => setMilestoneNotes(project.id, lessonId, notes)}
          compact
        />
        {!done && <p className="metadata mt-3">To complete this milestone: {missing.join("; ")}. A written finding is optional for continuing.</p>}
      </section>}
      {stage === "review" && (
        <article className="canvas reading">
          <div className="eyebrow">Concept check</div>
          <h2 ref={headingRef} tabIndex={-1} className="concept-question">
            {lesson.quiz.q}
          </h2>
          <div className="mt-6 space-y-2" role="group" aria-label="Answer options">
            {lesson.quiz.options.map((opt, i) => (
              <button
                key={opt}
                type="button"
                className={`btn w-full !justify-start text-left ${quizChoice === i ? "primary" : ""}`}
                aria-pressed={quizChoice === i}
                disabled={quizOk === true}
                onClick={() => {
                  setQuizChoice(i);
                  const result = completeQuiz(lessonId, projectId, i);
                  setQuizOk(result.ok);
                  // The store updates synchronously, so the new state is already "done".
                  if (result.complete) setStage("complete");
                }}
              >
                {opt}
              </button>
            ))}
          </div>
          <div aria-live="polite">
            {quizOk === false && (
              <p className="feedback-err mt-4 text-sm">Not quite. {lesson.quiz.why}</p>
            )}
            {quizOk === true && (
              <div className="mt-4">
                <p className="feedback-ok text-sm">Correct. {lesson.quiz.why}</p>
                {!done && (
                  <>
                    <p className="mt-3 text-sm">
                      Concept check passed. To complete this{" "}
                      {project ? "milestone" : "lesson"}, {missing.join(" and ")}.
                    </p>
                    <button
                      type="button"
                      className="btn primary mt-3"
                      onClick={() => {
                        setVariant(solved.includes(0) ? 1 : 0);
                        goStage("practice");
                      }}
                    >
                      Go to practice <ArrowRight size={14} />
                    </button>
                  </>
                )}
              </div>
            )}
            {quizOk === null && solved.length < 2 && (
              <p className="metadata mt-4">
                You can answer this now; the {project ? "milestone" : "lesson"} completes
                once both challenges are also solved without hints.
              </p>
            )}
          </div>
        </article>
      )}

      {stage === "complete" && done && (
        <article className="canvas reading">
          <div className="eyebrow">Complete</div>
          <h2 ref={headingRef} tabIndex={-1} className="concept-question">
            {project ? "Milestone completed" : "Lesson mastered"}
          </h2>
          <p className="lead mt-4">{learnerExplanation(lesson.concept)}</p>
          <p className="mt-4 text-sm text-[var(--text-secondary)]"><strong>Concept check:</strong> {lesson.quiz.why}</p>
          <ul className="mt-6 space-y-2 text-sm text-[var(--success)]">
            <li>✓ Challenge 1 solved without hints</li>
            <li>✓ Challenge 2 solved without hints</li>
            <li>
              ✓ Concept check passed
              {!project && stats.legacy && !stats.check ? " (carried over from earlier progress)" : ""}
            </li>
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            {project ? (
              nextMilestone !== null ? (
                <Link
                  href={`/projects/${project.id}/milestone/${nextMilestone}`}
                  className="btn primary"
                >
                  Next milestone <ArrowRight size={14} />
                </Link>
              ) : (
                <Link href={`/projects/${project.id}`} className="btn primary">
                  View your saved project work <ArrowRight size={14} />
                </Link>
              )
            ) : nextLessonId !== undefined ? (
              <Link href={`/lesson/${nextLessonId}`} className="btn primary">
                Next lesson: {getLesson(nextLessonId)?.title} <ArrowRight size={14} />
              </Link>
            ) : (
              <Link href="/projects/sql" className="btn primary">
                Explore projects <ArrowRight size={14} />
              </Link>
            )}
            <Link
              href={project ? `/projects/${project.id}` : "/sql"}
              className="btn"
            >
              {project ? "Project overview" : "Learning path"}
            </Link>
            <button type="button" className="btn ghost" onClick={() => setStage("practice")}>
              Practice again
            </button>
          </div>
          {!project && <NextSteps lessonId={lessonId} />}
        </article>
      )}
    </div>
  );
}

function emptyStats(): LessonStats {
  return {
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
}
