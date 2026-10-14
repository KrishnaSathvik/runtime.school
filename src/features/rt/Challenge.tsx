"use client";

import { useState } from "react";
import { Eye, Lightbulb, RotateCcw } from "lucide-react";
import taskContexts from "@/content/task-context.json";
import { getLesson, isBlankSql, seed, starterFor } from "@/content";
import {
  attemptKey,
  classifyFailure,
  draftKey,
  useLearning,
} from "@/lib/learning-state";
import { TaskCell } from "./Cells";
import { CHALLENGE_EDITOR_HEIGHT } from "./editor-height";
import { Cols } from "./Spec";
import { prettySql } from "@/components/editor/pretty-sql";
import { SqlCode } from "./SqlCode";

type TaskContext = { columns: string[]; tables: string[] };

/**
 * One graded challenge (lesson or project milestone), with the same rules as the current app:
 * solving without hints or the answer counts toward mastery; help is always available.
 */
export function Challenge({
  lessonId,
  variant,
  projectId = null,
  onSolved,
}: {
  lessonId: number;
  variant: 0 | 1;
  projectId?: number | null;
  onSolved?: () => void;
}) {
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
  const milestone = useLearning((s) => (projectId !== null ? s.projects[projectId]?.milestones[lessonId] : undefined));
  const solved = (projectId !== null ? milestone?.solved : stats?.solved)?.includes(variant) ?? false;

  const { sql: starter } = starterFor(lesson, variant);
  const value = isBlankSql(drafts[dKey]) && drafts[dKey] !== "" ? starter : drafts[dKey];
  const guided = !!attempt?.guided;
  const hintsShown = guided ? Math.min(lesson.hints.length, attempt?.hints ?? 0) : 0;
  const revealed = !!attempt?.revealed;
  const [confirm, setConfirm] = useState<null | "hint" | "reveal">(null);

  return (
    <div>
      <section className="rx-question" aria-label={`Challenge ${variant + 1}`}>
        <div className="rx-question-head">
          <p className="rx-label">challenge {variant + 1}</p>
          {solved && <span className="rx-tag ok">✓ solved without help</span>}
          {!solved && guided && <span className="rx-tag amber">using help</span>}
        </div>
        <p className="rx-question-text">{task.prompt}</p>
        <p className="rx-question-meta">
          {ctx?.columns.length ? <span>Return <Cols names={ctx.columns} /></span> : null}
          <span>{task.ordered ? "rows in the order asked" : "any row order"}</span>
          {lesson.mode === "lab" && <span>table changes are checked too</span>}
        </p>
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
        analytics={{
          subject: "sql",
          lesson: lessonId,
          challenge: variant + 1,
          project: projectId,
        }}
        task={{
          seedSql: seed,
          answer: task.answer,
          ordered: task.ordered,
          required: task.required,
          validate: task.validate,
          planValidation: task.planValidation,
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
          if (ok) onSolved?.();
        }}
        footer={
          <>
            {hintsShown < lesson.hints.length && (
              <button type="button" className="rx-btn ghost" onClick={() => (hintsShown === 0 ? setConfirm("hint") : markGuided(key, "hint"))}>
                <Lightbulb size={13} /> {hintsShown === 0 ? "Hint" : "Another hint"}
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
      {confirm && (
        <div className="rx-confirm" role="group" aria-label="Confirm help">
          <p>
            {confirm === "hint" ? "Showing a hint" : "Showing the answer"} means a correct query counts as solved with help, not toward mastery. You can try again without help afterwards.
          </p>
          <div className="rx-confirm-acts">
            <button type="button" className="rx-btn primary" onClick={() => { markGuided(key, confirm); setConfirm(null); }}>
              {confirm === "hint" ? "Show hint" : "Show answer"}
            </button>
            <button type="button" className="rx-btn" onClick={() => setConfirm(null)}>Keep trying</button>
          </div>
        </div>
      )}
      {hintsShown > 0 && (
        <ul className="rx-hints">
          {lesson.hints.slice(0, hintsShown).map((h) => <li key={h}><span className="mono">hint ›</span> {h}</li>)}
        </ul>
      )}
      {revealed && (
        <div className="rx-cell">
          <div className="rx-cell-head"><span className="name">one correct answer</span>
            <span className="acts"><button type="button" className="rx-btn ghost" onClick={() => setDraft(dKey, prettySql(task.answer))}>Put in editor</button></span>
          </div>
          <div className="rx-cell-in"><span className="p">sql›</span><SqlCode source={prettySql(task.answer)} label="One correct answer" /></div>
        </div>
      )}
    </div>
  );
}
