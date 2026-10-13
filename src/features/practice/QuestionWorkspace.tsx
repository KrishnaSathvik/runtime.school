"use client";
import { ActivityHeader } from "@/components/layout/PageHeader";
import { WorkspaceHeading, WorkspaceToolbar } from "@/components/layout/WorkspaceHeading";
import { WorkspaceSplit } from "@/components/editor/WorkspaceSplit";

import Link from "next/link";
import { BrowserNavigation } from "./BrowserNavigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Eye, Lightbulb, RotateCcw } from "lucide-react";
import { isBlankSql } from "@/content";
import {
  bankBySlug,
  bankSeed,
  bankQuestions,
  practiceDatasets,
  practiceMutation,
  practiceSeed,
  topicLabel,
  type BankQuestion,
  EXERCISE_LABEL,
} from "@/content/question-bank";
import tablePreviews from "@/content/table-previews.json";
import inputPreviews from "@/content/question-bank/input-previews.json";
import examples from "@/content/question-bank/examples.json";
import { SqlWorkspace } from "@/components/editor/SqlWorkspace";
import { ResultsTable } from "@/components/editor/ResultsTable";
import { SchemaColumns } from "@/components/editor/SchemaColumns";
import { useHorizontalOverflow } from "@/components/editor/use-horizontal-overflow";
import type { ExecuteResponse } from "@/engine/sql-client";
import { parseSchemaDetailed } from "@/engine/explain";
import { MobileTaskBar } from "@/features/lesson/MobileTaskBar";
import { questionStatus, useHydrated, useLearning } from "@/lib/learning-state";
import { DifficultyBadge, SolvedCheck } from "./Badges";
import { NextInTrack, TrackBanner, useTrackContext } from "./TrackBanner";

import { PredictionWorkspace } from "./PredictionWorkspace";
import { PrerequisiteLinks } from "./PrerequisiteLinks";
import { caseHref, caseStudyById, nextCaseStage, stageMetaFor } from "./case-studies";

type Example = { columns: string[]; rows: unknown[][]; total: number };
const EXAMPLES = examples as Record<string, Example>;
let schemaCache: ReturnType<typeof parseSchemaDetailed> | null = null;
const schema = () => (schemaCache ??= parseSchemaDetailed(practiceSeed));

function SamplePreview({
  table,
  result,
  total,
}: {
  table: string;
  result: { columns: string[]; values: unknown[][] };
  total?: number;
}) {
  const { ref, overflows } = useHorizontalOverflow<HTMLDivElement>();
  const shown = result.values.length;
  const all = total ?? shown;
  return (
    <div className="mt-3">
      <p className="metadata mb-2">
        {shown} of {all} sample rows
        {overflows ? " · scroll sideways for more columns" : ""}
      </p>
      <div ref={ref} className="table-scroll" tabIndex={0} role="region" aria-label={`${table} sample rows`}>
        <ResultsTable result={result} total={total} compact />
      </div>
    </div>
  );
}

/** Starter that is never a complete answer: warm-ups name their table, others leave FROM open. */
export function bankStarter(q: BankQuestion): { sql: string; cursor: number } {
  if (q.exerciseType === "debug") return {sql:q.starterSql!,cursor:0};
  if (q.mode === "lab") return { sql: "", cursor: 0 };
  return {
    sql: q.difficulty === "warmup" ? `SELECT \nFROM ${q.tables[0]};` : "SELECT \nFROM ",
    cursor: "SELECT ".length,
  };
}

export function QuestionWorkspace({ slug, trackId = null }: { slug: string; trackId?: string | null }) {
  const hydrated = useHydrated();
  const q = bankBySlug.get(slug);
  if (!hydrated) {
    return (
      <div className="canvas">
        <p className="metadata" role="status">Loading your saved work…</p>
      </div>
    );
  }
  if (!q) {
    return (
      <div className="canvas">
        <h1>Question not found</h1>
        <Link href="/practice/questions" className="btn mt-4">Back to Practice</Link>
      </div>
    );
  }
  return <Workspace key={q.id} q={q} trackId={trackId} />;
}

function Workspace({ q, trackId }: { q: BankQuestion; trackId: string | null }) {
  const trackCtx = useTrackContext(trackId, q.id);
  const progress = useLearning((s) => s.questions[q.id]);
  const allProgress = useLearning((s) => s.questions);
  const drafts = useLearning((s) => s.drafts);
  const setDraft = useLearning((s) => s.setDraft);
  const openQuestion = useLearning((s) => s.openQuestion);
  const recordQuestionCheck = useLearning((s) => s.recordQuestionCheck);
  const questionHint = useLearning((s) => s.questionHint);
  const revealQuestion = useLearning((s) => s.revealQuestion);
  const freshQuestionAttempt = useLearning((s) => s.freshQuestionAttempt);
  const [confirmReveal, setConfirmReveal] = useState(false);
  const [confirmHint, setConfirmHint] = useState(false);
  const previews = useMemo<Record<string, ExecuteResponse | null>>(() => {
    const specific = (inputPreviews as Record<string, Record<string, ExecuteResponse>>)[q.id];
    if (specific) return specific;
    const samples = tablePreviews as Record<string, { result: NonNullable<ExecuteResponse["result"]>; total: number }>;
    return Object.fromEntries(q.tables.filter(t => samples[t]).map(t => [t, { result: samples[t].result, total: samples[t].total }]));
  }, [q]);

  useEffect(() => openQuestion(q.slug), [q.slug, openQuestion]);

  const hints = progress?.hints ?? 0;
  const revealed = !!progress?.revealed;
  const guided = hints > 0 || revealed;
  const status = questionStatus(progress);
  const { sql: starter, cursor } = bankStarter(q);
  const dKey = `sql-qb-${q.id}`;
  const sql = isBlankSql(drafts[dKey]) && drafts[dKey] !== "" ? starter : drafts[dKey];
  const example = EXAMPLES[q.id];
  const dataset = practiceDatasets[q.datasetId];

  const caseMeta = q.caseStudy ? caseStudyById.get(q.caseStudy.id) : undefined;
  const caseStageMeta = stageMetaFor(q.id);
  const caseStages = q.caseStudy ? bankQuestions.filter((item) => item.caseStudy?.id === q.caseStudy!.id).sort((a, b) => a.caseStudy!.stage - b.caseStudy!.stage) : [];
  const nextInCase = caseMeta ? nextCaseStage(caseMeta, q.id, { questions: allProgress }) : null;
  const caseComplete = Boolean(
    q.caseStudy && caseStages.every((item) => allProgress[item.id]?.solved),
  );

  const help = <div className="workspace-help-content">
    <p className="metadata mt-3">Check answer tests your query with the sample data and with different data to check that it follows the task’s rules. Run query shows output without grading.</p>
          <PrerequisiteLinks lessonIds={q.prerequisites} struggling={(progress?.attempts ?? 0) >= 2 && !progress?.solved} />
          {q.exerciseType === "debug" && progress?.solved && q.equivalent?.length && <details className="mt-5 border-y border-[var(--border)] py-3"><summary className="cursor-pointer text-sm">Compare two solutions</summary><p className="metadata mt-2">Both solutions work with the sample data and different data. Compare how they handle the problem; neither is always faster.</p>{[q.solution,q.equivalent[0]].map((query,i)=><pre key={i} tabIndex={0} className="sql-mono mt-3 overflow-x-auto text-xs" aria-label={`Solution ${i+1}`}>{query}</pre>)}<p className="mt-3 text-sm">{q.explanation}</p></details>}
          <div className="my-6 h-px bg-[var(--border)]" />
          {hints < q.hints.length && hints === 0 && !confirmHint && (
            <button type="button" className="btn ghost" onClick={() => setConfirmHint(true)}>
              <Lightbulb size={15} /> Show a hint
            </button>
          )}
          {hints === 0 && confirmHint && !revealed && (
            <div className="border border-[var(--border)] bg-[var(--secondary)] p-3 text-sm" role="group" aria-label="Confirm showing a hint">
              <p>Showing a hint marks this attempt as using help. A correct answer will count as solved with help.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className="btn primary" onClick={() => { questionHint(q.id); setConfirmHint(false); }}>
                  Show hint
                </button>
                <button type="button" className="btn" onClick={() => setConfirmHint(false)}>
                  Keep trying
                </button>
              </div>
            </div>
          )}
          {hints > 0 && hints < q.hints.length && (
            <button type="button" className="btn ghost" onClick={() => questionHint(q.id)}>
              <Lightbulb size={15} /> Show another hint
            </button>
          )}
          {hints === 0 && !revealed && (
            <p className="metadata mt-1">Using a hint or viewing the solution means a correct answer counts as solved with help. You can try again without hints later.</p>
          )}
          {hints > 0 && (
            <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-[var(--text-secondary)]">
              {q.hints.slice(0, hints).map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ol>
          )}
          <div className="mt-4">
            {q.exerciseType !== "predict" && <>
            {!revealed && !confirmReveal && (
              <button type="button" className="btn ghost" onClick={() => setConfirmReveal(true)}>
                <Eye size={15} /> Show the solution
              </button>
            )}
            {!revealed && confirmReveal && (
              <div className="border border-[var(--border)] bg-[var(--secondary)] p-3 text-sm" role="group" aria-label="Confirm showing the solution">
                <p>
                  If you view the solution, a correct answer will count as <strong>solved with help</strong>.
                  You can try again without hints later.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn primary"
                    onClick={() => {
                      revealQuestion(q.id);
                      setConfirmReveal(false);
                    }}
                  >
                    Show solution
                  </button>
                  <button type="button" className="btn" onClick={() => setConfirmReveal(false)}>
                    Keep trying
                  </button>
                </div>
              </div>
            )}
            {revealed && (
              <div className="border border-[var(--border)] p-3">
                <div className="eyebrow">One correct solution</div>
                <pre tabIndex={0} className="sql-mono mt-2 overflow-x-auto text-xs">{q.solution}</pre>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">{q.explanation}</p>
                <button type="button" className="btn mt-2" onClick={() => setDraft(dKey, q.solution)}>
                  Put it in the editor
                </button>
              </div>
            )}
            </>}
          </div>
          {guided && (
            <button type="button" className="btn mt-4" onClick={() => freshQuestionAttempt(q.id, dKey, q.exerciseType === "predict" ? "" : starter)}>
              <RotateCcw size={14} /> Try again without hints
            </button>
          )}
  </div>;

  return (
    <div className="workspace-page flex min-h-full flex-col">
      <ActivityHeader>
        {trackCtx && <TrackBanner ctx={trackCtx} />}
        {q.caseStudy ? (
          <WorkspaceToolbar
            ariaLabel="Case study navigation"
            listHref={caseHref(q.caseStudy.id)}
            listLabel="Case overview"
            indexLabel={`Stage ${q.caseStudy.stage} / ${q.caseStudy.total}`}
            prev={(() => {
              const i = caseStages.findIndex((item) => item.id === q.id);
              const prev = caseStages[i - 1];
              return prev
                ? { href: `/practice/${prev.slug}`, label: `Previous stage: ${prev.title}` }
                : null;
            })()}
            next={
              nextInCase
                ? { href: `/practice/${nextInCase.slug}`, label: `Next stage: ${nextInCase.title}` }
                : null
            }
          />
        ) : (
          <BrowserNavigation questionId={q.id} />
        )}
        <WorkspaceHeading
          title={q.title}
          leading={
            (status === "solved" || status === "guided") ? (
              <SolvedCheck status={status} withHelp={!!progress?.guidedSolved} />
            ) : undefined
          }
          badge={<DifficultyBadge difficulty={q.difficulty} />}
          meta={[
            EXERCISE_LABEL[q.exerciseType ?? "write"],
            topicLabel[q.primaryTopic],
            dataset.name,
            guided && status !== "solved" ? "Using help this time" : null,
          ]}
        >
          {caseStageMeta && <p className="metadata mt-2 max-w-3xl">{caseStageMeta.businessWhy}</p>}
        </WorkspaceHeading>
      </ActivityHeader>

      <WorkspaceSplit>
        <aside className={`task-pane ${q.tables.length === 1 && q.rules.length <= 2 ? "compact-task" : ""}`} aria-label="Question">
          <section className="task-section">
            <div className="eyebrow">{q.exerciseType === "debug" ? "Fix the query" : "Your task"}</div>
            <p id="challenge-prompt" className="mt-2 text-[15px] leading-relaxed">
              {q.task}
            </p>
            {q.rules.length <= 2 && q.rules.length > 0 && <ul id="task-rules" className="mt-2 space-y-1 text-sm text-[var(--text-secondary)]">{q.rules.map(rule => <li key={rule}>{rule}</li>)}</ul>}
            {q.exerciseType === "debug" && <p className="metadata mt-2">The query in the editor has a mistake. Change it to return the result described above, then choose Check your fix.</p>}
            {(q.tables.length > 1 || q.rules.length > 2) && <nav className="data-jump items-center" aria-label="Jump to task details">
              <span className="metadata">Uses</span>
              {q.tables.map((t) => <a key={t} href={`#table-${t}`}>{t}</a>)}
              {q.rules.length > 0 && <a className="jump-section" href="#task-rules">Rules ({q.rules.length})</a>}
              {example && q.exerciseType !== "predict" && <a className="jump-section" href="#task-expected">Expected output</a>}
            </nav>}
            {q.caseStudy && (
              <p className="metadata mt-3" role="region" aria-label="Case study stages">
                Stage {q.caseStudy.stage} of {q.caseStudy.total}
                {caseStageMeta ? ` · ${caseStageMeta.brief}` : ""}. Each stage starts with the original sample data; results from earlier stages are not carried forward.
              </p>
            )}
          </section>

          <section className="task-section">
            <div className="eyebrow">Required output</div>
            <p className="metadata mt-1">Columns to return</p>
            <p className="mt-2 text-sm">
              {q.columns.map((c, i) => (
                <span key={c}>
                  <code className="inline-code">{c}</code>
                  {i < q.columns.length - 1 ? ", " : ""}
                </span>
              ))}
            </p>
            <p className="metadata mt-1">
              {q.ordered ? "Row order is checked." : "Rows can be in any order."}
              {q.exerciseType === "predict" ? " Predict the rows returned from the sample data below." : ""}
              {q.mode === "lab" ? " You can create or change tables here. Each run starts with the original sample data." : ""}
            </p>
          </section>

          {q.rules.length > 2 && (
            <section className="task-section">
              <div id="task-rules" className="eyebrow scroll-mt-14">Rules to follow</div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--text-secondary)]">
                {q.rules.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </section>
          )}

          {example && q.exerciseType !== "predict" && (
            <section className="task-section">
              <div id="task-expected" className="eyebrow scroll-mt-14">Expected output (example)</div>
              <p className="metadata mt-1">
                First {example.rows.length} of {example.total} row{example.total === 1 ? "" : "s"} on this data.
              </p>
              <div className="mt-2 border border-[var(--border)]">
                <ResultsTable result={{ columns: example.columns, values: example.rows }} total={example.rows.length} compact />
              </div>
            </section>
          )}

          <section className="task-section">
            <div className="eyebrow">Tables and sample data</div>
            <div className="mt-2 space-y-5">
              {q.tables.map((t) => (
                <div key={t} id={`table-${t}`} className="scroll-mt-14">
                  <code className="font-mono text-sm font-semibold">{t}</code>
                  <SchemaColumns className="mt-2" columns={schema()[t] ?? []} />
                  {previews[t]?.result && (
                    <SamplePreview table={t} result={previews[t]!.result!} total={previews[t]!.total} />
                  )}
                </div>
              ))}
            </div>
            <p className="metadata mt-3">{dataset.description}</p>
          </section>

          {q.exerciseType === "predict" && help}
        </aside>

        {q.exerciseType === "predict" ? (
          <PredictionWorkspace
            q={q}
            nextAction={
              trackCtx ? (
                <NextInTrack ctx={trackCtx} />
              ) : (
                <BrowserNavigation questionId={q.id} nextOnly />
              )
            }
          />
        ) : (
          <SqlWorkspace
          help={help}
          checkLabel={q.exerciseType === "debug" ? "Check your fix" : "Check answer"}
          value={sql}
          onChange={(v) => setDraft(dKey, v)}
          graded
          taskKey={`${q.id}:${progress?.epoch??0}`}
          editorLabel={`SQL editor for ${q.title}`}
          seedSql={bankSeed(q)}
          mutationSql={`${practiceMutation} ${q.extraMutation ?? ""}`.trim()}
          allowWrites={q.mode === "lab"}
          answer={q.solution}
          learningExplanation={q.explanation}
          ordered={q.ordered}
          repeatCheck={q.repeatCheck}
          stateQueries={q.stateQueries}
          planValidation={q.planValidation}
          validate={q.validate ?? null}
          required={q.required ?? null}
          guided={guided}
          starter={starter}
          starterCursor={cursor}
          tables={q.tables}
          placeholder={q.mode === "lab" ? "Write your SQL script. End it with a SELECT so the result can be checked." : "Write your SQL here"}
          header={<MobileTaskBar watchId="challenge-prompt" label="Your task" prompt={q.task} tables={q.tables} />}
          onGraded={(res) => recordQuestionCheck(q.id, !!res.grade?.ok, {input:sql,version:q.version,epoch:progress?.epoch??0,message:res.grade?.message??res.error??"Checked"})}
          nextAction={
            trackCtx ? (
              <NextInTrack ctx={trackCtx} />
            ) : q.caseStudy && caseMeta ? (
              caseComplete ? (
                <>
                  <Link href={caseHref(q.caseStudy.id)} className="btn primary">
                    Case complete — review investigations <ArrowRight size={14} />
                  </Link>
                  <p className="metadata mt-2 max-w-xl">{caseMeta.completionSummary}</p>
                  <p className="metadata mt-1">Skills used: {caseMeta.skillLabels.join(" · ")}</p>
                </>
              ) : nextInCase ? (
                <>
                  <Link href={`/practice/${nextInCase.slug}`} className="btn primary">
                    Next stage: {nextInCase.title} <ArrowRight size={14} />
                  </Link>
                  <Link href={caseHref(q.caseStudy.id)} className="btn">
                    Case overview
                  </Link>
                </>
              ) : (
                <Link href={caseHref(q.caseStudy.id)} className="btn primary">
                  Back to case overview
                </Link>
              )
            ) : (
              <BrowserNavigation questionId={q.id} nextOnly />
            )
          }
        />
        )}
      </WorkspaceSplit>
    </div>
  );
}
