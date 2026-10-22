"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Eye, Lightbulb, RotateCcw } from "lucide-react";
import taskContexts from "@/content/task-context.json";
import { getLesson, isBlankSql, lessonFixture, starterFor } from "@/content";
import { SQL_CONSTRUCTS, courseIndex } from "@/content/canonical/constructs";
import {
  attemptKey,
  classifyFailure,
  draftKey,
  useLearning,
} from "@/lib/learning-state";
import { TaskCell } from "./Cells";
import { HelpDialog } from "./HelpDialog";
import { CHALLENGE_EDITOR_HEIGHT } from "./editor-height";
import { prettySql } from "@/components/editor/pretty-sql";
import { SqlCode } from "./SqlCode";
import { revealRange } from "./reveal";

type TaskContext = { columns: string[]; tables: string[] };

/** Feedback may name a construct only once this lesson, or an earlier one, has taught it. */
function taughtBy(lessonId: number) {
  let here: number;
  try { here = courseIndex(lessonId); } catch { return undefined; }
  return (name: string) => {
    const c = SQL_CONSTRUCTS.find((x) => x.name === name);
    if (!c) return true;
    try { return courseIndex(c.taughtIn) <= here; } catch { return true; }
  };
}

/** Long prompts read clearer as short paragraphs (build vs return). */
function PromptText({ text }: { text: string }) {
  const parts = text.split(/(?<=\.)\s+/).map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return <p className="rx-question-text">{text}</p>;
  return (
    <div className="rx-question-body">
      {parts.map((part) => (
        <p key={part} className="rx-question-text">{part}</p>
      ))}
    </div>
  );
}

/**
 * One graded lesson challenge:
 * solving without hints or the answer counts toward mastery; help is always available.
 */
export function Challenge({
  lessonId,
  variant,
  nextAction,
}: {
  lessonId: number;
  variant: 0 | 1;
  /** Shown once every check passes; the learner chooses when to move on. */
  nextAction?: ReactNode;
}) {
  const projectId = null;
  const lesson = getLesson(lessonId)!;
  const task = lesson.tasks[variant];
  const ctx = (taskContexts as Record<string, TaskContext[]>)[lessonId]?.[variant];
  const dKey = draftKey(lessonId, variant, projectId);
  const key = attemptKey(lessonId, variant, projectId);
  const drafts = useLearning((s) => s.drafts);
  const setDraft = useLearning((s) => s.setDraft);
  const attempt = useLearning((s) => s.attempts[key]);
  const markGuided = useLearning((s) => s.markGuided);
  const freshAttempt = useLearning((s) => s.freshAttempt);
  const recordCheck = useLearning((s) => s.recordCheck);
  const setSession = useLearning((s) => s.setSession);
  const stats = useLearning((s) => s.stats[lessonId]);
  const solved = stats?.solved?.includes(variant) ?? false;

  const { sql: starter } = starterFor(lesson, variant);
  const value = isBlankSql(drafts[dKey]) && drafts[dKey] !== "" ? starter : drafts[dKey];
  const guided = !!attempt?.guided;
  const hintsShown = guided ? Math.min(lesson.hints.length, attempt?.hints ?? 0) : 0;
  const revealed = !!attempt?.revealed;
  const [confirm, setConfirm] = useState<null | "hint" | "reveal">(null);

  const hintsRef = useRef<HTMLUListElement>(null);
  const answerRef = useRef<HTMLDivElement>(null);
  const previousHelp = useRef({ hintsShown, revealed });
  const pendingHelp = useRef<"hint" | "answer" | null>(null);
  useEffect(() => { pendingHelp.current = null; }, [lessonId, variant]);
  useEffect(() => {
    const old = previousHelp.current;
    previousHelp.current = { hintsShown, revealed };
    const target = pendingHelp.current === "answer" && revealed && !old.revealed ? answerRef.current : pendingHelp.current === "hint" && hintsShown > old.hintsShown ? hintsRef.current : null;
    if (target) pendingHelp.current = null;
    if (!target) return;
    // The newest hint, or the top of the answer, comes into view in its own pane.
    const shown = target === hintsRef.current ? (target.lastElementChild as HTMLElement | null) ?? target : target;
    const frame = requestAnimationFrame(() => { target.focus({ preventScroll: true }); revealRange(shown); });
    return () => cancelAnimationFrame(frame);
  }, [hintsShown, revealed]);

  return (
    <div>
      <section className="rx-question" aria-label={`Challenge ${variant + 1}`}>
        <div className="rx-question-head">
          <p className="rx-label">challenge {variant + 1}</p>
          {solved && <span className="rx-tag ok">✓ solved without help</span>}
          {!solved && guided && <span className="rx-tag amber">using help</span>}
        </div>
        <PromptText text={task.prompt} />
        {lesson.mode === "lab" && (
          <p className="rx-question-text">The check also looks at tables your script creates or changes.</p>
        )}
      </section>
      <TaskCell
        name={`challenge-${variant + 1}.sql`}
        minHeight={CHALLENGE_EDITOR_HEIGHT}
        value={value}
        onChange={(v) => {
          setDraft(dKey, v);
          setSession(lessonId, projectId, "practice", variant);
        }}
        tables={ctx?.tables}
        feedback={{ taught: taughtBy(lessonId) }}
        nextAction={nextAction}
        analytics={{
          subject: "sql",
          lesson: lessonId,
          challenge: variant + 1,
          project: projectId,
        }}
        task={{
          seedSql: lessonFixture(lesson).seed,
          mutationSql: lessonFixture(lesson).mutation,
          answer: task.answer,
          ordered: task.ordered,
          required: task.required,
          validate: task.validate,
          planValidation: task.planValidation,
          stateQueries: task.stateQueries,
          repeatCheck: task.repeatCheck,
          allowWrites: lesson.mode === "lab",
        }}
        onGraded={(res, ok) => {
          recordCheck({
            lessonId,
            variant,
            project: projectId,
            ok,
            guided,
            query: value,
            result: res.result ?? null,
            category: ok ? null : classifyFailure(res),
          });
        }}
        footer={
          <>
            {hintsShown < lesson.hints.length && (
              <button type="button" className="rx-btn ghost" onClick={() => { if (hintsShown === 0) setConfirm("hint"); else { pendingHelp.current = "hint"; markGuided(key, "hint"); } }}>
                <Lightbulb size={13} /> {hintsShown === 0 ? "Hint" : `Next hint (${hintsShown + 1} of ${lesson.hints.length})`}
              </button>
            )}
            {!revealed && (
              <button type="button" className="rx-btn ghost" onClick={() => setConfirm("reveal")}>
                <Eye size={13} /> Answer
              </button>
            )}
            {guided && (
              <button type="button" className="rx-btn ghost" onClick={() => freshAttempt(key, dKey, starter)}>
                <RotateCcw size={13} /> Try without help
              </button>
            )}
          </>
        }
      />
      <HelpDialog open={confirm !== null} kind={confirm === "hint" ? "hint" : "answer"}
        onClose={() => setConfirm(null)} onConfirm={() => { if (confirm) { pendingHelp.current = confirm === "reveal" ? "answer" : "hint"; markGuided(key, confirm); } }} />
      {hintsShown > 0 && (
        <ul ref={hintsRef} tabIndex={-1} aria-label="Requested hints" className="rx-hints">
          {lesson.hints.slice(0, hintsShown).map((h, i) => <li key={h}><span className="mono">hint {i + 1} of {lesson.hints.length} ›</span> {h}</li>)}
        </ul>
      )}
      {revealed && (
        <div ref={answerRef} tabIndex={-1} role="region" aria-label="Revealed answer" className="rx-cell">
          <div className="rx-cell-head"><span className="name">one correct answer</span>
            <span className="acts"><button type="button" className="rx-btn ghost" onClick={() => setDraft(dKey, prettySql(task.answer))}>Put in editor</button></span>
          </div>
          <div className="rx-cell-in"><span className="p">sql›</span><SqlCode source={prettySql(task.answer)} label="One correct answer" /></div>
        </div>
      )}
    </div>
  );
}
