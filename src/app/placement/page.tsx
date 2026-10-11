"use client";

import Link from "next/link";
import taskContexts from "@/content/task-context.json";
import {TableInspector} from "@/components/editor/TableInspector";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { courseOrder, datasetCatalog, isBlankSql, lessons, starterFor } from "@/content";
import { SqlWorkspace } from "@/components/editor/SqlWorkspace";
import {
  PLACEMENT_IDS,
  placementStart,
  useHydrated,
  useLearning,
} from "@/lib/learning-state";

export default function PlacementPage() {
  const hydrated = useHydrated();
  const placement = useLearning((s) => s.placement);
  const restart = useLearning((s) => s.restartPlacement);
  const answer = useLearning((s) => s.answerPlacement);
  const advance = useLearning((s) => s.advancePlacement);
  const drafts = useLearning((s) => s.drafts);
  const setDraft = useLearning((s) => s.setDraft);
  const [checked, setChecked] = useState(false);

  if (!hydrated) {
    return (
      <div className="canvas">
        <h1 className="sr-only">Find your starting point</h1>
        <p className="metadata" role="status">Loading…</p>
      </div>
    );
  }

  if (!placement) {
    return (
      <div className="canvas reading">
        <div className="eyebrow">Find my level</div>
        <h1>Find your starting point.</h1>
        <p className="lead">
          Already know some SQL? Answer up to {PLACEMENT_IDS.length} short questions, from a
          first SELECT to joins and ratios. We’ll suggest where to start.
        </p>
        <ul className="mt-6 list-disc space-y-1 pl-5 text-sm text-[var(--text-secondary)]">
          <li>Write SQL using small sample tables — about 10 minutes.</li>
          <li>Skip any question you don’t know; that simply sets your starting point there.</li>
          <li>Nothing is marked as mastered. You can still open any lesson.</li>
        </ul>
        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" className="btn primary" onClick={restart}>
            Start the check <ArrowRight size={14} />
          </button>
          <Link href={`/lesson/${courseOrder[0]}`} className="btn ghost">
            I’m new — start at lesson 1
          </Link>
        </div>
      </div>
    );
  }

  if (placement.done) {
    const start = placementStart(placement)!;
    const solved = placement.answers.filter((a) => a?.ok).length;
    const firstMiss = placement.answers.findIndex((a) => !a?.ok);
    return (
      <div className="canvas reading">
        <div className="eyebrow">Placement result</div>
        <h1>Start with “{lessons[start].title}”.</h1>
        <p className="lead">
          You solved {solved} of {PLACEMENT_IDS.length}.{" "}
          {firstMiss === -1
            ? "You handled every foundation question, so you can begin after them."
            : firstMiss === 0
              ? "Starting from the first lesson will build a solid base."
              : `You solved the first ${firstMiss} in a row; the next concept is where to begin.`}
        </p>
        <ol className="mt-6 space-y-1 text-sm">
          {PLACEMENT_IDS.map((id, i) => (
            <li key={id} className={placement.answers[i]?.ok ? "feedback-ok" : "text-[var(--text-secondary)]"}>
              {placement.answers[i]?.ok ? "✓" : "○"} {lessons[id].title}
            </li>
          ))}
        </ol>
        <p className="metadata mt-4">
          Your starting point is the first question you missed or skipped. If you solved them all,
          we suggest the next topic. This check covers the basics through joins; it does not assess every advanced skill or complete any lessons.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={`/lesson/${start}`} className="btn primary">
            Start here <ArrowRight size={14} />
          </Link>
          <Link href="/learn" className="btn">Browse the course</Link>
          {firstMiss === -1 && <Link href="/practice/tracks/advanced-challenges" className="btn">Explore advanced practice</Link>}
          <button type="button" className="btn ghost" onClick={() => { restart(); setChecked(false); }}>
            Retake the check
          </button>
        </div>
      </div>
    );
  }

  const index = placement.index;
  const lesson = lessons[PLACEMENT_IDS[index]];
  const task = lesson.tasks[0];
  const taskContext = (taskContexts as Record<string, { columns: string[]; tables: string[] }[]>)[lesson.id][0];
  const tables = datasetCatalog[lesson.dataset]?.tables ?? [];
  const { sql: starter, cursor } = starterFor(lesson, 0);
  const dKey = `sql-placement-${index}`;
  const sql = isBlankSql(drafts[dKey]) && drafts[dKey] !== "" ? starter : drafts[dKey];
  const solved = placement.answers[index]?.ok === true;
  const last = index === PLACEMENT_IDS.length - 1;

  return (
    <div className="flex min-h-full flex-col">
      <div className="border-b border-[var(--border)] px-6 pt-6 pb-4 md:px-10">
        <div className="eyebrow">Placement check · question {index + 1} of {PLACEMENT_IDS.length}</div>
        <h1 className="!my-2 !text-[1.7rem]">{lesson.title}</h1>
        <div
          className="mt-2 h-[3px] w-full max-w-sm overflow-hidden bg-[var(--border)]"
          role="progressbar"
          aria-label="Placement progress"
          aria-valuemin={0}
          aria-valuemax={PLACEMENT_IDS.length}
          aria-valuenow={index}
        >
          <div className="h-full bg-[var(--accent)]" style={{ width: `${(100 * index) / PLACEMENT_IDS.length}%` }} />
        </div>
      </div>
      <div className="practice-layout">
        <aside className="task-pane" aria-label="Question">
          <h2 id="challenge-prompt" className="!text-[1.35rem] leading-snug">{task.prompt}</h2>
          <div className="my-6 h-px bg-[var(--border)]" />
          <div className="eyebrow">Tables you can use</div>
          <p className="metadata mt-3">Required columns: <code>{taskContext.columns.join(", ")}</code>. {task.ordered ? "Row order is checked." : "Any row order is accepted."}</p>
          <TableInspector key={`${lesson.id}:0`} tables={tables} relevantTables={taskContext.tables}/>
          <div className="mt-8 flex flex-wrap gap-2">
            {(checked || solved) && (
              <button
                type="button"
                className="btn primary"
                onClick={() => {
                  advance();
                  setChecked(false);
                }}
              >
                {last ? "See my starting point" : "Next question"} <ArrowRight size={14} />
              </button>
            )}
            {!solved && (
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  advance();
                  setChecked(false);
                }}
              >
                {last ? "Skip and finish" : "I don’t know this yet — skip"}
              </button>
            )}
          </div>
          <p className="metadata mt-4">This check never marks lessons as mastered.</p>
        </aside>
        <SqlWorkspace
          value={sql}
          onChange={(v) => setDraft(dKey, v)}
          graded
          taskKey={dKey}
          starter={starter}
          starterCursor={cursor}
          tables={tables}
          editorLabel={`Placement question ${index + 1} SQL editor`}
          answer={task.answer}
          ordered={task.ordered}
          required={task.required}
          validate={task.validate}
          onGraded={(res) => {
            answer(index, !!res.grade?.ok);
            setChecked(true);
          }}
          nextAction={
            <button
              type="button"
              className="btn primary"
              onClick={() => {
                advance();
                setChecked(false);
              }}
            >
              {last ? "See my starting point" : "Next question"} <ArrowRight size={14} />
            </button>
          }
        />
      </div>
    </div>
  );
}
