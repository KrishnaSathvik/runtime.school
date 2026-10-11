"use client";

import Link from "next/link";
import {BrowserNavigation} from "./BrowserNavigation";
import {safeBrowserReturn} from "./browser";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Eye, Lightbulb, RotateCcw, Table2 } from "lucide-react";
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
import { executeSql, type ExecuteResponse } from "@/engine/sql-client";
import { parseSchemaDetailed } from "@/engine/explain";
import { MobileTaskBar } from "@/features/lesson/MobileTaskBar";
import { questionStatus, useHydrated, useLearning } from "@/lib/learning-state";
import { DifficultyBadge } from "./Badges";
import { statusText } from "./status";
import { NextInTrack, TrackBanner, useTrackContext } from "./TrackBanner";

import { PredictionWorkspace } from "./PredictionWorkspace";
import { PrerequisiteLinks } from "./PrerequisiteLinks";

type Example = { columns: string[]; rows: unknown[][]; total: number };
const EXAMPLES = examples as Record<string, Example>;
let schemaCache: ReturnType<typeof parseSchemaDetailed> | null = null;
const schema = () => (schemaCache ??= parseSchemaDetailed(practiceSeed));

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
        <Link href="/practice" className="btn mt-4">Back to Practice</Link>
      </div>
    );
  }
  return <Workspace key={q.id} q={q} trackId={trackId} />;
}

function Workspace({ q, trackId }: { q: BankQuestion; trackId: string | null }) {
  const params=useSearchParams();
  const returnParam=params.get("return");
  const backHref=safeBrowserReturn(returnParam);
  const questionHref=(slug:string)=>`/practice/${slug}${backHref!=="/practice"?`?return=${encodeURIComponent(backHref)}`:""}`;
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
  const [previews, setPreviews] = useState<Record<string, ExecuteResponse | null>>(() => {
    const specific = (inputPreviews as Record<string, Record<string, ExecuteResponse>>)[q.id];
    if (specific) return specific;
    const samples = tablePreviews as Record<string, { result: NonNullable<ExecuteResponse["result"]>; total: number }>;
    return Object.fromEntries(q.tables.filter(t => samples[t]).map(t => [t, { result: samples[t].result, total: samples[t].total }]));
  });

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

  const index = bankQuestions.findIndex((x) => x.id === q.id);
  const next = useMemo(() => {
    const after = [...bankQuestions.slice(index + 1), ...bankQuestions.slice(0, index)];
    return after.find((x) => !allProgress[x.id]?.solved) ?? bankQuestions[(index + 1) % bankQuestions.length];
  }, [index, allProgress]);
  const caseStages = q.caseStudy ? bankQuestions.filter((item) => item.caseStudy?.id === q.caseStudy!.id) : [];
  const prev = bankQuestions[(index - 1 + bankQuestions.length) % bankQuestions.length];

  const preview = async (table: string) => {
    const res = await executeSql({ seed: bankSeed(q), query: `SELECT * FROM ${table} LIMIT 5` });
    if (!res.superseded) setPreviews((p) => ({ ...p, [table]: res }));
  };

  return (
    <div className="workspace-page flex min-h-full flex-col">
      <div className="workspace-header">
        {trackCtx && <TrackBanner ctx={trackCtx} />}
        <BrowserNavigation questionId={q.id}/>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <Link hidden={!!returnParam} href={backHref} className="inline-flex items-center gap-1 text-[var(--accent)]">
              <ArrowLeft size={14} aria-hidden /> All questions
            </Link>
            {q.caseStudy && (
              <nav className="flex flex-wrap items-center gap-1.5" aria-label="Case study navigation">
                <span className="metadata mr-1">{q.caseStudy.title}</span>
                {caseStages.map((item) => (
                  <Link key={item.id} className={`btn !min-h-[28px] !px-2.5 text-xs ${item.id === q.id ? "primary" : ""}`} href={`/practice/${item.slug}`} aria-current={item.id === q.id ? "step" : undefined} title={item.title}>
                    Stage {item.caseStudy!.stage}{allProgress[item.id]?.solved ? " ✓" : ""}
                  </Link>
                ))}
              </nav>
            )}
          </div>
          <div className="flex gap-3">
            <Link hidden={!!returnParam} href={questionHref(prev.slug)} className="metadata hover:text-[var(--text)]">
              ← Previous
            </Link>
            <Link hidden={!!returnParam} href={questionHref(next.slug)} className="metadata hover:text-[var(--text)]">
              Next →
            </Link>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1>{q.title}</h1>
          <DifficultyBadge difficulty={q.difficulty} />
          <span className="metadata">
            {EXERCISE_LABEL[q.exerciseType ?? "write"]} · {topicLabel[q.primaryTopic]} · {dataset.name}
          </span>
          <span className="metadata">
            · <span>{statusText(status, !!progress?.guidedSolved)}</span>
            {guided && status === "solved" ? " · using help this time" : ""}
          </span>
        </div>
      </div>

      <div className="practice-layout wide">
        <aside className="task-pane" aria-label="Question">
          <div className="eyebrow">{q.exerciseType === "debug" ? "Fix the query" : "Your task"}</div>
          <p id="challenge-prompt" className="mt-2 text-[15px] leading-relaxed">
            {q.task}
          </p>
          {q.exerciseType === "debug" && <p className="metadata mt-2">The query in the editor has a mistake. Change it to return the result described above, then choose Check your fix.</p>}
          <nav className="data-jump items-center" aria-label="Tables for this question">
            <span className="metadata">Uses</span>
            {q.tables.map((t) => <a key={t} href={`#table-${t}`}>{t}</a>)}
          </nav>
          {q.caseStudy && <p className="metadata mt-3" role="region" aria-label="Case study stages">Stage {q.caseStudy.stage} of {q.caseStudy.total}. Each stage starts with the original sample data; results from earlier stages are not carried forward.</p>}
          <div className="eyebrow mt-5">Columns to return</div>
          <p className="mt-2 text-sm">
            {q.columns.map((c, i) => (
              <span key={c}>
                <code className="inline-code">{c}</code>
                {i < q.columns.length - 1 ? ", " : ""}
              </span>
            ))}
          </p>
          <p className="metadata mt-1">
            {q.ordered ? "Row order is checked." : "Rows can be in any order."} {q.exerciseType === "predict" ? "Predict the rows returned from the sample data below." : "Your query is also tested with different data to check that it follows the task’s rules."}
            {q.mode === "lab" ? " You can create or change tables here. Each run starts with the original sample data." : ""}
          </p>

          {q.rules.length > 0 && (
            <><div className="eyebrow mt-6">Rules to follow</div><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--text-secondary)]">
              {q.rules.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul></>
          )}

          <div className="eyebrow mt-6">Tables and sample data</div>
          <div className="mt-2 space-y-4">
            {q.tables.map((t) => (
              <div key={t} id={`table-${t}`} className="scroll-mt-4">
                <div className="flex items-center justify-between gap-2">
                  <code className="font-mono text-xs font-semibold">{t}</code>
                  {!(q.id in inputPreviews) && <button type="button" className="btn ghost !min-h-[28px] !px-2 text-xs" onClick={() => preview(t)}>
                    <Table2 size={13} aria-hidden /> View sample data
                  </button>}
                </div>
                <ul className="schema-columns mt-1 font-mono text-xs text-[var(--text-secondary)]">
                  {(schema()[t] ?? []).map((c) => (
                    <li key={c.name} title={c.references ? `references ${c.references}` : undefined}>
                      {c.name}
                      <span className="text-[var(--muted)]"> {c.type.toLowerCase()}</span>
                      {c.key && <span className="text-[var(--accent-strong)]"> {c.key}</span>}
                      {c.references && <span> → {c.references}</span>}
                    </li>
                  ))}
                </ul>
                {previews[t]?.result && (
                  <div className="mt-2 border border-[var(--border)]">
                    <p className="metadata px-2 py-2">{previews[t]!.result!.values.length} of {previews[t]!.total ?? previews[t]!.result!.values.length} sample rows</p>
                    <ResultsTable result={previews[t]!.result!} total={previews[t]!.total} compact />
                  </div>
                )}
              </div>
            ))}
          </div>
          <p className="metadata mt-3">{dataset.description}</p>
          {example && q.exerciseType !== "predict" && (
            <>
              <div className="eyebrow mt-6">Expected output (example)</div>
              <p className="metadata mt-1">
                First {example.rows.length} of {example.total} row{example.total === 1 ? "" : "s"} on this data.
              </p>
              <div className="mt-2 border border-[var(--border)]">
                <ResultsTable result={{ columns: example.columns, values: example.rows }} total={example.rows.length} compact />
              </div>
            </>
          )}


          <PrerequisiteLinks lessonIds={q.prerequisites} struggling={(progress?.attempts ?? 0) >= 2 && !progress?.solved} />
          {q.exerciseType === "debug" && progress?.solved && q.equivalent?.length && <details className="mt-5 border-y border-[var(--border)] py-3"><summary className="cursor-pointer text-sm">Compare two solutions</summary><p className="metadata mt-2">Both solutions work with the sample data and different data. Compare how they handle the problem; neither is always faster.</p>{[q.solution,q.equivalent[0]].map((query,i)=><pre key={i} tabIndex={0} className="sql-mono mt-3 overflow-x-auto text-xs" aria-label={`Solution ${i+1}`}>{query}</pre>)}<p className="mt-3 text-sm">{q.explanation}</p></details>}
          <div className="my-6 h-px bg-[var(--border)]" />
          {hints < q.hints.length && (
            <button type="button" className="btn ghost" onClick={() => questionHint(q.id)}>
              <Lightbulb size={15} /> {hints === 0 ? "Show a hint" : "Show another hint"}
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
        </aside>

        {q.exerciseType === "predict" ? <PredictionWorkspace q={q} nextAction={returnParam ? <BrowserNavigation questionId={q.id} nextOnly/> : <Link hidden={!!returnParam} href={questionHref(next.slug)} className="btn primary">Next question: {next.title} <ArrowRight size={14}/></Link>} /> : <SqlWorkspace
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
            ) : returnParam ? <BrowserNavigation questionId={q.id} nextOnly/> : q.caseStudy?.stage === q.caseStudy?.total && q.caseStudy ? (
              <Link href="/practice/cases" className="btn primary">Back to case studies</Link>
            ) : (
            <>
              <Link hidden={!!returnParam} href={questionHref(next.slug)} className="btn primary">
                Next question: {next.title} <ArrowRight size={14} />
              </Link>
              <Link href={`/practice?topic=${q.primaryTopic.split(".")[0]}`} className="btn">
                More {topicLabel[q.primaryTopic].toLowerCase()}
              </Link>
            </>
            )
          }
        />}
      </div>
    </div>
  );
}
