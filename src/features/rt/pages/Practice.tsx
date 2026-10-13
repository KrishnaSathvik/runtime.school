"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Eye, Lightbulb, List, RotateCcw, X } from "lucide-react";
import { getLesson, isBlankSql } from "@/content";
import {
  bankBySlug,
  bankQuestions,
  bankSeed,
  DIFFICULTY_LABEL,
  practiceDatasets,
  practiceMutation,
  topicLabel,
} from "@/content/question-bank";
import { bankStarter } from "@/features/practice/QuestionWorkspace";
import { rtSectionHrefs } from "@/features/rt/entry";
import { questionStatus, useHydrated, useLearning } from "@/lib/learning-state";
import examples from "@/content/question-bank/examples.json";
import { Shell } from "../Shell";
import { Pager } from "../Pager";
import { TaskCell } from "../Cells";
import { ExpectedResult, Tables } from "../Tables";
import { Cols, Spec } from "../Spec";
import { prettySql } from "@/components/editor/pretty-sql";

/** /sql/practice: open the next question straight away. */
export function PracticeEntry() {
  const router = useRouter();
  const ready = useHydrated();
  const done = useRef(false);
  useLayoutEffect(() => {
    // Redirect once; later store updates must not navigate again.
    if (!ready || done.current) return;
    done.current = true;
    router.replace(rtSectionHrefs(useLearning.getState()).practice);
  }, [ready, router]);
  return (
    <Shell path={[{ label: "sql", href: "/sql" }, { label: "practice" }]} section="practice">
      <div className="rx-page" aria-busy="true" aria-label="Opening your next question" />
    </Shell>
  );
}

/** One practice question as a focused task: brief and data on the left, editor and checks on the right. */
export function PracticeTask({ slug }: { slug: string }) {
  const ready = useHydrated();
  const q = bankBySlug.get(slug);
  const s = useLearning();
  const [listOpen, setListOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const openQuestion = s.openQuestion;

  useEffect(() => {
    if (q) openQuestion(q.slug);
  }, [q, openQuestion]);

  const index = q ? bankQuestions.findIndex((b) => b.id === q.id) : -1;
  const prev = bankQuestions[index - 1];
  const next = bankQuestions[index + 1];
  const list = useMemo(() => {
    const n = filter.trim().toLowerCase();
    return bankQuestions.filter((b) => !n || `${b.title} ${topicLabel[b.primaryTopic]}`.toLowerCase().includes(n));
  }, [filter]);

  if (!q) {
    return (
      <Shell path={[{ label: "sql", href: "/sql" }, { label: "practice" }]} section="practice">
        <div className="rx-page"><h1 className="rx-title">Question not found</h1><p><Link className="rx-btn" href="/sql/practice">Next question</Link></p></div>
      </Shell>
    );
  }

  const progress = s.questions[q.id];
  const status = questionStatus(progress);
  const dKey = `sql-qb-${q.id}`;
  const { sql: starter } = bankStarter(q);
  const value = isBlankSql(s.drafts[dKey]) && s.drafts[dKey] !== "" ? starter : s.drafts[dKey];
  const hints = progress?.hints ?? 0;
  const revealed = !!progress?.revealed;
  const supported = (q.exerciseType ?? "write") !== "predict";
  const refresher = q.prerequisites[q.prerequisites.length - 1];
  const example = (examples as Record<string, { columns: string[]; rows: unknown[][]; total: number }>)[q.id];

  return (
    <Shell
      path={[{ label: "sql", href: "/sql" }, { label: "practice", href: "/sql/practice" }, { label: q.slug }]}
      section="practice"
      status={["SQL", `question ${index + 1}/${bankQuestions.length}`, `sqlite · ${practiceDatasets[q.datasetId]?.name ?? q.datasetId}`, ready ? (status === "solved" ? "✓ solved" : status === "guided" ? "solved with help" : "draft saves as you type") : "…"]}
    >
      <div className="rx-task rx-lesson">
        <div className="rx-task-bar">
          <button type="button" className="rx-btn ghost" onClick={() => setListOpen((o) => !o)} aria-expanded={listOpen}>
            <List size={14} /> All questions
          </button>
          <span className="mono rx-small" style={{ margin: 0 }}>{String(index + 1).padStart(2, "0")} / {bankQuestions.length}</span>
          <span className="push" />
          <Pager
            prev={prev ? { href: `/sql/practice/${prev.slug}`, label: prev.title } : null}
            next={next ? { href: `/sql/practice/${next.slug}`, label: next.title } : null}
          />
        </div>

        {listOpen && (
          <div className="rx-drawer" role="dialog" aria-label="All questions">
            <div className="rx-drawer-head">
              <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="filter questions…" aria-label="Filter questions" autoFocus />
              <button type="button" className="rx-btn ghost" onClick={() => setListOpen(false)} aria-label="Close list"><X size={14} /></button>
            </div>
            <ol>
              {list.map((b) => {
                const st = questionStatus(s.questions[b.id]);
                return (
                  <li key={b.id}>
                    <Link href={`/sql/practice/${b.slug}`} aria-current={b.id === q.id ? "page" : undefined} onClick={() => setListOpen(false)}>
                      <span className="mono g">{st === "solved" ? "✓" : st === "guided" ? "◑" : st === "attempted" ? "◐" : "·"}</span>
                      <span>{b.title}</span>
                      <span className="mono k">{DIFFICULTY_LABEL[b.difficulty].toLowerCase()}</span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        <div className="rx-task-split">
          <section className="rx-brief" aria-labelledby="task-title">
            <p className="rx-prompt-line"><b>task</b> {topicLabel[q.primaryTopic]} · {DIFFICULTY_LABEL[q.difficulty].toLowerCase()}</p>
            <h1 id="task-title" className="rx-task-title">{q.title}</h1>
            <p className="rx-lead rx-ask">{q.task}</p>

            <p className="rx-label">what to return</p>
            <Spec
              rows={[
                ["Columns", <><Cols names={q.columns} /> <span className="rx-dim">{q.columns.length > 1 ? "in this order" : ""}</span></>],
                ["Rows", example ? `${example.total} row${example.total === 1 ? "" : "s"} · ${q.ordered ? "in the order asked" : "any order"}` : q.ordered ? "in the order asked" : "any order"],
                ...q.rules.map((r, i): [string, ReactNode] => [i === 0 ? "Watch for" : "", r]),
                ["Skill", <>{q.objective}{refresher !== undefined && <> <Link className="rx-link" href={`/sql/lesson/${refresher}`}>Refresher: {getLesson(refresher)?.title} →</Link></>}</>],
              ]}
            />

            {example && (
              <>
                <p className="rx-label sec">expected result</p>
                <p className="rx-cap">Your query should return exactly these columns and values. Run it and compare.</p>
                <ExpectedResult columns={example.columns} rows={example.rows} total={example.total} ordered={q.ordered} />
              </>
            )}

            <p className="rx-label sec">data you can query</p>
            <p className="rx-cap">Sample rows from each table. Each column shows its type underneath; → marks a link to another table.</p>
            <Tables tables={q.tables} open />
          </section>
          <section className="rx-work rx-lesson-work" aria-label="Your solution">
            {supported ? (
              <TaskCell
                name="solution.sql"
                value={value}
                onChange={(v) => s.setDraft(dKey, v)}
                tables={q.tables}
                minHeight={hints > 0 || revealed ? "260px" : "clamp(300px, calc(100dvh - 300px), 820px)"}
                checkLabel={q.exerciseType === "debug" ? "Check fix" : "Check"}
                task={{
                  seedSql: bankSeed(q),
                  mutationSql: `${practiceMutation} ${q.extraMutation ?? ""}`.trim(),
                  answer: q.solution,
                  ordered: q.ordered,
                  repeatCheck: q.repeatCheck,
                  stateQueries: q.stateQueries,
                  planValidation: q.planValidation,
                  validate: q.validate ?? null,
                  required: q.required ?? null,
                  allowWrites: q.mode === "lab",
                }}
                onGraded={(res, ok) =>
                  s.recordQuestionCheck(q.id, ok, { input: value, version: q.version, epoch: progress?.epoch ?? 0, message: res.grade?.message ?? res.error ?? "Checked" })
                }
                footer={
                  <>
                    {hints < q.hints.length && (
                      <button type="button" className="rx-btn ghost" onClick={() => s.questionHint(q.id)}><Lightbulb size={13} /> Hint</button>
                    )}
                    {!revealed && <button type="button" className="rx-btn ghost" onClick={() => s.revealQuestion(q.id)}><Eye size={13} /> Answer</button>}
                    {(hints > 0 || revealed) && (
                      <button type="button" className="rx-btn ghost" onClick={() => s.freshQuestionAttempt(q.id, dKey, starter)}><RotateCcw size={13} /> Try without help</button>
                    )}
                  </>
                }
              />
            ) : (
              <div className="rx-note">This question asks you to predict an output. The prototype covers write and debug questions; <Link href={`/practice/${q.slug}`} style={{ textDecoration: "underline" }}>open it in the current app</Link>.</div>
            )}
            {hints > 0 && (
              <ul className="rx-hints">{q.hints.slice(0, hints).map((h) => <li key={h}><span className="mono">hint ›</span> {h}</li>)}</ul>
            )}
            {revealed && (
              <div className="rx-cell">
                <div className="rx-cell-head"><span className="name">one correct answer</span>
                  <span className="acts"><button type="button" className="rx-btn ghost" onClick={() => s.setDraft(dKey, prettySql(q.solution))}>Put in editor</button></span>
                </div>
                <div className="rx-cell-in"><span className="p">sql›</span><pre tabIndex={0}>{prettySql(q.solution)}</pre></div>
              </div>
            )}
            {(revealed || (ready && (progress?.solved || progress?.guidedSolved))) && (
              <div className="rx-why">
                <p className="rx-label">why it works</p>
                <p>{q.explanation}</p>
              </div>
            )}
            {hints === 0 && !revealed && <p className="rx-small">Hints and the answer are always available. Using them counts the question as solved with help.</p>}
          </section>
        </div>
      </div>
    </Shell>
  );
}
