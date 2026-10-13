"use client";
import { ActivityHeader } from "@/components/layout/PageHeader";
import { WorkspaceHeading, WorkspaceToolbar } from "@/components/layout/WorkspaceHeading";
import { WorkspaceSplit } from "@/components/editor/WorkspaceSplit";

import Link from "next/link";
import taskContexts from "@/content/task-context.json";
import { TableInspector } from "@/components/editor/TableInspector";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { courseOrder, datasetCatalog, isBlankSql, lessons, starterFor } from "@/content";
import { SqlWorkspace } from "@/components/editor/SqlWorkspace";
import {
  PLACEMENT_IDS,
  isMastered,
  placementStart,
  useHydrated,
  useLearning,
} from "@/lib/learning-state";

export default function PlacementPage() {
  const hydrated = useHydrated();
  const placement = useLearning((s) => s.placement);
  const joinMastered = useLearning((s) => !!s.stats[14] && isMastered(s.stats[14]));
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
    const start = placementStart(placement, { joinMastered })!;
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
          <Link href="/sql" className="btn">Browse the course</Link>
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
  // Only tables this question uses — not the full dataset (avoids a useless “Additional tables” block).
  const tables = taskContext.tables;
  const { sql: starter, cursor } = starterFor(lesson, 0);
  const dKey = `sql-placement-${index}`;
  const sql = isBlankSql(drafts[dKey]) && drafts[dKey] !== "" ? starter : drafts[dKey];
  const solved = placement.answers[index]?.ok === true;
  const last = index === PLACEMENT_IDS.length - 1;
  const dataset = datasetCatalog[lesson.dataset];

  return (
    <div className="workspace-page flex min-h-full flex-col">
      <ActivityHeader>
        <WorkspaceToolbar
          ariaLabel="Placement navigation"
          listHref="/placement"
          listLabel="Find my level"
          indexLabel={`${index + 1} / ${PLACEMENT_IDS.length}`}
          trailing={
            !solved ? (
              <button
                type="button"
                className="problem-toolbar-action"
                onClick={() => {
                  advance();
                  setChecked(false);
                }}
              >
                {last ? "Skip and finish" : "Skip"}
              </button>
            ) : null
          }
          next={
            checked || solved
              ? {
                  onClick: () => {
                    advance();
                    setChecked(false);
                  },
                  label: last ? "See my starting point" : "Next question",
                }
              : null
          }
        />
        <WorkspaceHeading
          title={lesson.title}
          meta={["Find my level", `Question ${index + 1} of ${PLACEMENT_IDS.length}`, dataset?.name, lesson.difficulty]}
        >
          <div
            className="course-progress mt-3 !mb-0 !w-full max-w-xs"
            style={{ ["--progress" as string]: `${(100 * index) / PLACEMENT_IDS.length}%` }}
            role="progressbar"
            aria-label="Placement progress"
            aria-valuemin={0}
            aria-valuemax={PLACEMENT_IDS.length}
            aria-valuenow={index}
          />
        </WorkspaceHeading>
      </ActivityHeader>
      <WorkspaceSplit>
        <aside className={`task-pane ${taskContext.tables.length === 1 ? "compact-task" : ""}`} aria-label="Question">
          <section className="task-section">
            <div className="eyebrow">Your task</div>
            <p id="challenge-prompt" className="mt-2 text-[15px] leading-relaxed">
              {task.prompt}
            </p>
          </section>

          <section className="task-section">
            <div className="eyebrow">Required output</div>
            <p className="metadata mt-1">Columns to return</p>
            <p className="mt-2 text-sm">
              {taskContext.columns.map((c, i) => (
                <span key={c}>
                  <code className="inline-code">{c}</code>
                  {i < taskContext.columns.length - 1 ? ", " : ""}
                </span>
              ))}
            </p>
            <p className="metadata mt-1">
              {task.ordered ? "Row order is checked." : "Rows can be in any order."}{" "}
              Check answer grades this question for placement only. It never marks lessons as mastered.
            </p>
          </section>

          <section className="task-section">
            <div className="eyebrow">Tables and sample data</div>
            <TableInspector
              key={`${lesson.id}:0`}
              tables={tables}
              heading={false}
            />
            {dataset?.description && <p className="metadata mt-3">{dataset.description}</p>}
          </section>
        </aside>
        <SqlWorkspace
          value={sql}
          onChange={(v) => setDraft(dKey, v)}
          graded
          savesProgress={false}
          progressNote="Check answer suggests a starting lesson. It does not mark any lesson as mastered."
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
      </WorkspaceSplit>
    </div>
  );
}
