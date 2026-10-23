"use client";

import { focusWorkspaceEditor } from "../workspace-focus";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Circle, CircleCheck, List, X } from "lucide-react";
import taskContexts from "@/content/task-context.json";
import lessonPreviews from "@/content/lesson-previews.json";
import type { DatasetPreview as LessonPreview } from "@/data/datasets/learning";
import { courseOrder, learningDatasetCatalog as datasetCatalog, getLesson, groups, lessonFixture } from "@/content";
import { preloadDatabase } from "@/engine/sql-client";
import { mastered as isLessonMastered } from "@/features/discovery/selectors";
import { lessonSummaries } from "@/content/ux-summaries";
import { learnerExplanation } from "@/lib/content-copy";
import { track } from "@/lib/analytics";
import { isMastered, sessionKey, useHydrated, useLearning, type LessonStats } from "@/lib/learning-state";
import { sqlLessonHref } from "@/platform/sql-lesson-href";
import { Shell } from "../Shell";
import { Pager } from "../Pager";
import { RunCell } from "../Cells";
import { Challenge } from "../Challenge";
import { Tables } from "../Tables";
import { revealRange } from "../reveal";

/**
 * A lesson is one session: read, run, observe, then the two challenges and the concept check
 * in the same flow. Same mastery rules as the current app.
 */
export function Lesson({ lessonId }: { lessonId: number }) {
  const lesson = getLesson(lessonId);
  if (!lesson) {
    return (
      <Shell path={[{ label: "sql", href: "/sql" }, { label: "not found" }]} section="learn">
        <div className="rx-page"><h1 className="rx-title">Lesson not found</h1><p><Link href="/sql" className="rx-btn">Back to SQL</Link></p></div>
      </Shell>
    );
  }
  // Render immediately; local progress hydrates in the background and Session restores the saved step.
  return <Session key={lessonId} lessonId={lessonId} />;
}

type Tab = "challenge-1" | "challenge-2" | "check";

/**
 * Filtering lessons that introduce a column. The table starts open so its name and sample
 * values are visible. Later lessons leave every table closed; the column was already taught.
 */
const INTRO_FILTER_TABLES: Record<number, string[]> = {
  3: ["orders", "products"],
  5: ["orders", "products"],
  7: ["orders", "products"],
};

/** Sample rows of the scenario tables a lesson's setup creates. */
function overlayPreviews(lessonId: number): Record<string, LessonPreview> {
  const data = lessonPreviews as unknown as { lessons: Record<string, number>; overlays: Record<string, LessonPreview>[] };
  const index = data.lessons[lessonId];
  return index === undefined ? {} : data.overlays[index];
}

function idealTab(lessonId: number): Tab {
  const s = useLearning.getState();
  const stats = s.stats[lessonId] ?? (emptyStats() as LessonStats);
  const saved = s.sessions[sessionKey(lessonId, null)];
  if (saved?.stage === "review") return "check";
  if (saved?.stage === "practice") return saved.variant === 1 ? "challenge-2" : "challenge-1";
  const solved0 = stats.solved.includes(0);
  const solved1 = stats.solved.includes(1);
  const checkPassed = stats.check || stats.legacy;
  return !solved0 ? "challenge-1" : !solved1 ? "challenge-2" : !checkPassed ? "check" : "challenge-1";
}

function Session({ lessonId }: { lessonId: number }) {
  const ready = useHydrated();
  const lesson = getLesson(lessonId)!;
  const stats = useLearning((s) => s.stats[lessonId]) ?? (emptyStats() as LessonStats);
  const completeQuiz = useLearning((s) => s.completeQuiz);
  const setSession = useLearning((s) => s.setSession);
  const [quiz, setQuiz] = useState<{ choice: number; ok: boolean } | null>(null);

  const position = courseOrder.indexOf(lessonId);
  // The example and the walkthrough are one sequence: show the steps in order, mark the step that is the example,
  // and finish with the example when it is not one of the steps.
  const sameQuery = (a: string, b: string) => a.replace(/\s+/g, " ").replace(/;\s*$/, "").trim() === b.replace(/\s+/g, " ").replace(/;\s*$/, "").trim();
  const walkthrough = lesson.walkthrough ?? [];
  const workedSteps = [
    ...walkthrough.map((s) => ({ ...s, isExample: sameQuery(s.query, lesson.example) })),
    ...(walkthrough.some((s) => sameQuery(s.query, lesson.example))
      ? []
      : [{ title: "Put it together", description: "The lesson's pattern in one query.", query: lesson.example, isExample: true }]),
  ];
  const nextLessonId = courseOrder[position + 1];
  const tables = [...new Set((taskContexts as Record<string, { tables: string[] }[]>)[lessonId]?.flatMap((t) => t.tables) ?? [])];
  const solved0 = stats.solved.includes(0);
  const solved1 = stats.solved.includes(1);
  const checkPassed = stats.check || stats.legacy;
  const mastered = isMastered(stats);

  // Start downloading the lesson's dataset while the learner reads the explanation.
  useEffect(() => preloadDatabase(lessonFixture(lesson).seed), [lesson]);

  // Open on the saved step, else the first unfinished one.
  const [tab, setTab] = useState<Tab>(() => idealTab(lessonId));
  const restored = useRef(false);

  // After localStorage loads, restore the saved step once (without a loading screen).
  useEffect(() => {
    if (!ready || restored.current) return;
    restored.current = true;
    setTab(idealTab(lessonId));
  }, [ready, lessonId]);

  // Opening a lesson makes it the one Learn returns to (after saved progress is loaded).
  useEffect(() => {
    if (!ready) return;
    const saved = useLearning.getState().sessions[sessionKey(lessonId, null)];
    setSession(lessonId, null, saved?.stage ?? "understand", saved?.variant ?? 0);
  }, [lessonId, setSession, ready]);

  useEffect(() => {
    track("lesson_started", {
      subject: "sql",
      lesson: lessonId,
      position: courseOrder.indexOf(lessonId) + 1,
    });
  }, [lessonId]);

  const pick = (t: Tab) => {
    setTab(t);
    setSession(lessonId, null, t === "check" ? "review" : "practice", t === "challenge-2" ? 1 : 0);
  };
  const tabsRef = useRef<HTMLDivElement>(null);
  /** Next after a pass: the following task, then the next lesson. Focus follows to the new tab. */
  const goTo = (t: Tab) => {
    pick(t);
    requestAnimationFrame(() => {
      const button = document.getElementById(`tab-${t}`);
      button?.focus({ preventScroll: true });
      if (tabsRef.current) revealRange(tabsRef.current);
    });
  };
  const nextLessonTitle = nextLessonId !== undefined ? getLesson(nextLessonId)?.title : undefined;
  const nextLessonLink = nextLessonId !== undefined && (
    <Link className="rx-btn primary" href={sqlLessonHref(nextLessonId)}>Next lesson: {nextLessonTitle} <ArrowRight size={14} aria-hidden="true" /></Link>
  );
  const tabs: { id: Tab; label: string; done: boolean }[] = [
    { id: "challenge-1", label: "Challenge 1", done: solved0 },
    { id: "challenge-2", label: "Challenge 2", done: solved1 },
    { id: "check", label: "Concept check", done: checkPassed },
  ];
  const left = tabs.filter((t) => !t.done).length;

  return (
    <Shell
      path={[
        { label: "sql", href: "/sql" },
        { label: "learn", href: "/sql" },
        { label: groups[lesson.group] },
        { label: lesson.title },
      ]}
      section="learn"
      status={["SQL", `lesson ${position + 1}/${courseOrder.length}`, `sqlite · ${datasetCatalog[lesson.dataset]?.name ?? lesson.dataset}`, mastered ? "✓ mastered" : "drafts save as you type"]}
    >
      <LessonBar lessonId={lessonId} />
      <div className="rx-task rx-canonical-learning rx-lesson rx-learn-tables workspace-bounded">
        <div className="rx-task-split">
          {/* Left: read and run. */}
          <article className="rx-brief" aria-labelledby="lesson-title" tabIndex={0}>
            <p className="rx-prompt-line"><b>lesson {String(position + 1).padStart(2, "0")}</b> {groups[lesson.group]} · {lesson.difficulty.toLowerCase()}</p>
            <h1 id="lesson-title" className="rx-task-title">{lesson.title}</h1>
            <p className="rx-lead" style={{ fontSize: "1.05rem" }}>{lessonSummaries[lessonId]}</p>

            <p className="rx-label sec">the idea</p>
            <p className="rx-prose" style={{ marginTop: 0 }}>{learnerExplanation(lesson.concept)}</p>

            {tables.length > 0 && (
              <>
                <p className="rx-label sec">Dataset: {datasetCatalog[lesson.dataset]?.name}</p>
                <Tables tables={tables} openTables={INTRO_FILTER_TABLES[lessonId]} previews={{ ...lessonFixture(lesson).previews, ...overlayPreviews(lessonId) }} />
              </>
            )}

            <p className="rx-label sec">worked example</p>
            <p className="rx-cap">The step marked “the pattern” is what the challenges build on. Running examples doesn’t count toward progress.</p>
            <ol className="rx-walk">
              {workedSteps.map((step, i) => (
                <li key={`${i}-${step.title}`}>
                  <span className="rx-walk-no" aria-hidden="true">{i + 1}</span>
                  <div className="rx-walk-body">
                    <p>
                      <strong>{step.title}.</strong> {step.description ? learnerExplanation(step.description) : ""}
                      {step.isExample && <span className="rx-walk-tag">the pattern</span>}
                    </p>
                    <RunCell query={step.query} name={step.isExample ? "example.sql" : `step-${i + 1}.sql`} seedSql={lessonFixture(lesson).seed} allowWrites={lesson.mode === "lab"} />
                  </div>
                </li>
              ))}
            </ol>
            {lesson.trap && (
              <>
                <p className="rx-label sec">common mistake</p>
                <p className="rx-note">{lesson.trap}</p>
              </>
            )}
          </article>

          {/* Right: do the work. Stays in view while the lesson scrolls. */}
          <section className="rx-work rx-lesson-work" aria-label="Your work" tabIndex={0} onFocusCapture={focusWorkspaceEditor}>
            <div className="rx-tabs" role="tablist" aria-label="Lesson tasks" ref={tabsRef}>
              {tabs.map((t) => (
                <button key={t.id} id={`tab-${t.id}`} type="button" role="tab" aria-selected={tab === t.id} aria-controls={`panel-${t.id}`} onClick={() => pick(t.id)}>
                  {t.done ? <CircleCheck size={15} className="ok" aria-hidden="true" /> : <Circle size={15} className="todo" aria-hidden="true" />} {t.label}
                  {t.done && <span className="sr-only"> (done)</span>}
                </button>
              ))}
            </div>
            <div id={`panel-${tab}`} role="tabpanel">
              {tab === "challenge-1" && <Challenge key="c1" lessonId={lessonId} variant={0}
                nextAction={<button type="button" className="rx-btn primary" onClick={() => goTo("challenge-2")}>Next: Challenge 2 <ArrowRight size={14} aria-hidden="true" /></button>} />}
              {tab === "challenge-2" && <Challenge key="c2" lessonId={lessonId} variant={1}
                nextAction={<button type="button" className="rx-btn primary" onClick={() => goTo("check")}>Next: Concept check <ArrowRight size={14} aria-hidden="true" /></button>} />}
              {tab === "check" && (
                <>
                  <section className="rx-question" aria-label="Concept check">
                    <div className="rx-question-head"><p className="rx-label">concept check</p></div>
                    <p className="rx-question-text">{lesson.quiz.q}</p>
                    <p className="rx-question-meta"><span>pick one answer</span></p>
                  </section>
                  <div className="rx-quiz" role="group" aria-label="Answer options">
                    {lesson.quiz.options.map((opt, i) => (
                      <button
                        key={opt}
                        type="button"
                        aria-pressed={quiz?.choice === i}
                        disabled={quiz?.ok === true}
                        onClick={() => {
                          const r = completeQuiz(lessonId, null, i);
                          setQuiz({ choice: i, ok: r.ok });
                        }}
                      >
                        <span className="mono rx-opt">{String.fromCharCode(97 + i)}</span> {opt}
                      </button>
                    ))}
                  </div>
                  <div aria-live="polite">
                    {quiz && (
                      <p className={`rx-feedback ${quiz.ok ? "ok" : "bad"}`}>
                        {quiz.ok
                          ? nextLessonId !== undefined
                            ? "✓ Correct."
                            : "✓ Correct. That’s the last lesson in the course."
                          : "✕ Not quite."}{" "}
                        {lesson.quiz.why}
                      </p>
                    )}
                    {!quiz && checkPassed && <p className="rx-feedback ok">✓ Concept check passed earlier.</p>}
                  </div>
                  {(quiz?.ok || (!quiz && checkPassed)) && nextLessonLink && <div className="rx-next">{nextLessonLink}</div>}
                </>
              )}
            </div>
            <div className={`rx-lesson-status ${mastered ? "done" : ""}`} aria-live="polite">
              <span>
                {mastered
                  ? <>✓ Lesson mastered.{nextLessonId !== undefined && tab !== "check" && <> <Link className="rx-link" href={sqlLessonHref(nextLessonId)}>Next lesson: {nextLessonTitle} →</Link></>}</>
                  : <>To master this lesson, solve both challenges without hints and pass the concept check.{" "}<b>{`${left} of 3 to go.`}</b></>}
              </span>
            </div>
          </section>
        </div>
      </div>
    </Shell>
  );
}

/** Same bar as Practice: all lessons in a drawer, position, previous and next. */
function LessonBar({ lessonId }: { lessonId: number }) {
  const state = useLearning();
  const [open, setOpen] = useState(false);
  const listRef = useRef<HTMLOListElement>(null);
  const position = courseOrder.indexOf(lessonId);
  const prev = courseOrder[position - 1];
  const next = courseOrder[position + 1];
  // Course order, the same order Prev and Next follow, split where the course moves to a new section.
  const bySection = useMemo(() => {
    const sections: { label: string; items: { id: number; i: number; lesson: NonNullable<ReturnType<typeof getLesson>> }[] }[] = [];
    courseOrder.forEach((id, i) => {
      const lesson = getLesson(id)!;
      const label = groups[lesson.group] ?? "";
      const last = sections[sections.length - 1];
      if (last && last.label === label) last.items.push({ id, i, lesson });
      else sections.push({ label, items: [{ id, i, lesson }] });
    });
    return sections;
  }, []);

  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView({ block: "center" });
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [open]);

  /** ✓ mastered (both challenges + concept check); ◐ started; · not started. */
  const glyph = (id: number) => {
    if (isLessonMastered(state, id)) return "✓";
    const st = state.stats[id];
    return st && (st.attempts > 0 || st.solved.length > 0 || st.check) ? "◐" : "·";
  };

  return (
    <div className="rx-task" style={{ maxWidth: "none" }}>
      <div className="rx-task-bar">
        <button type="button" className="rx-btn ghost" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <List size={14} /> All lessons
        </button>
        <span className="mono rx-small" style={{ margin: 0 }}>{String(position + 1).padStart(2, "0")} / {courseOrder.length}</span>
        <span className="push" />
        <Pager
          prev={prev !== undefined ? { href: sqlLessonHref(prev), label: getLesson(prev)?.title ?? "" } : null}
          next={next !== undefined ? { href: sqlLessonHref(next), label: getLesson(next)?.title ?? "" } : null}
        />
      </div>
      {open && (
        <div className="rx-drawer" role="dialog" aria-label="All lessons">
          <div className="rx-drawer-head">
            <span className="rx-small" style={{ flex: 1, margin: 0 }}>Course lessons</span>
            <button type="button" className="rx-btn ghost" onClick={() => setOpen(false)} aria-label="Close list"><X size={14} /></button>
          </div>
          <ol ref={listRef}>
            {bySection.map(({ label, items }) => (
              <li key={`${items[0].i}-${label}`}>
                <p className="rx-drawer-group mono">{label}</p>
                <ul className="rx-drawer-sub">
                  {items.map((r) => (
                    <li key={r.id}>
                      <Link href={sqlLessonHref(r.id)} aria-current={r.id === lessonId ? "page" : undefined} onClick={() => setOpen(false)}>
                        <span className={`mono g ${glyph(r.id) === "✓" ? "ok" : ""}`}>{glyph(r.id)}</span>
                        <span><span className="mono k">{String(r.i + 1).padStart(2, "0")}</span> {r.lesson.title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

function emptyStats() {
  return { attempts: 0, correct: 0, solved: [], last: 0, errors: 0, check: false, legacy: false, masteredAt: 0, categories: {}, quizAttempts: 0 };
}
