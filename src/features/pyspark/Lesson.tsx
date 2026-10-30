"use client";

import Link from "next/link";
import { Fragment, useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { HelpButtons, HelpPanel } from "@/features/python/Help";
import { Inline, Md } from "@/features/python/Md";
import { showWorkTop } from "@/features/python/JumpToWork";
import { psItem, psLessonHref, psQuestionHref, psQuestions, type PsLesson } from "@/content/pyspark/content";
import { isLessonMastered, usePs, usePsReady } from "@/lib/pyspark-progress";
import { Cols } from "@/features/rt/Spec";
import { keepsInputColumns, psDataset, samePrinted } from "@/content/pyspark/content";
import { Code } from "@/features/python/Code";
import { DatasetCards, Expected, ProgramTables, SparkExample, useSparkConnection } from "./parts";
import { PsWorkbench } from "./PsWorkbench";

/* A written PySpark lesson, laid out like SQL and Python: the reading on the left, the work on the right. */

/** Lesson text, where a fenced ```python block is shown as read-only code (it isn't run) and the rest as prose. */
function Prose({ md }: { md: string }) {
  const parts = md.split(/```[a-z]*\n([\s\S]*?)```/);
  return (
    <>
      {parts.map((p, i) => (i % 2 ? <Code key={i} code={p.replace(/\n$/, "")} label="Code" className="ps-snippet" /> : p.trim() ? <Md key={i} text={p.trim()} /> : null))}
    </>
  );
}

/** The reading side: why, what you'll be able to do, the data, the idea with real Spark examples, review, what's next. */
export function LessonReading({ lesson }: { lesson: PsLesson }) {
  const { content, recorded } = lesson.written!;
  const [connection] = useSparkConnection();
  const ds = content.dataset;
  const practice = content.practice.map((id) => psQuestions.find((q) => q.id === id)).filter((q) => !!q);
  let n = 0;
  return (
    <>
      <p className="p2-lede"><Inline text={content.lede} /></p>
      <div className="p2-label">You&apos;ll be able to</div>
      <ul className="p2-list">{content.objectives.map((o) => <li key={o}><span><Inline text={o} /></span></li>)}</ul>
      <div className="p2-label">Dataset: {psDataset(ds.id)?.title}</div>
      <DatasetCards datasetId={ds.id} tables={ds.tables} edition={ds.edition} />
      <div className="p2-label">The idea</div>
      {content.blocks.map((b, k) => {
        if (b.kind === "text") return <Prose key={k} md={b.md} />;
        n++;
        return (
          <Fragment key={b.id}>
            {n === 1 && <p className="p2-note">Run each example to see what it prints. Running examples doesn&apos;t count toward progress.</p>}
            <SparkExample block={b} n={n} dataset={ds.id} edition={ds.edition} recorded={recorded} connection={connection} />
          </Fragment>
        );
      })}
      <div className="p2-label">Review</div>
      <ul className="p2-list">{content.review.map((r) => <li key={r}><span><Inline text={r} /></span></li>)}</ul>
      {practice.length > 0 && (
        <>
          <div className="p2-label">Practise this</div>
          <ul className="p2-list">
            {practice.map((q) => <li key={q.id}><span><Link href={psQuestionHref(q.slug)}>{q.title}</Link></span></li>)}
          </ul>
        </>
      )}
    </>
  );
}

/** The work side: Challenge 1, Challenge 2, Concept check, and the lesson's status. */
export function LessonWork({ lesson, next }: { lesson: PsLesson; next?: PsLesson }) {
  const ready = usePsReady();
  const { content } = lesson.written!;
  const challenges = content.challenges;
  const rec = usePs((s) => s.lessons[lesson.id]);
  const questions = usePs((s) => s.questions);
  const [tab, setTabState] = useState(challenges[0]);
  const restored = useRef(false);
  useEffect(() => {
    if (!ready || restored.current) return;
    restored.current = true;
    const saved = usePs.getState().lessons[lesson.id]?.tab;
    if (saved && (saved === "concept" || challenges.includes(saved))) setTabState(saved);
  }, [ready, lesson.id, challenges]);
  const setTab = (t: string) => {
    setTabState(t);
    usePs.getState().setLessonTab(lesson.id, t);
  };
  const mastered = isLessonMastered(questions, rec, challenges);
  const dot = (id: string) => (questions[id]?.solved ? "done" : questions[id]?.assisted ? "assisted" : "");
  const onward = (id: string) => {
    const k = challenges.indexOf(id);
    const to = challenges[k + 1] ?? "concept";
    return <button type="button" className="p2-btn primary" onClick={() => { setTab(to); showWorkTop("lesson-work"); }}>{to === "concept" ? "Next: Concept check" : `Next: Challenge ${k + 2}`} <ArrowRight size={14} aria-hidden="true" /></button>;
  };
  return (
    <>
      <div className="p2-tabs" role="tablist" aria-label="Lesson steps">
        {challenges.map((id, k) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>
            <i className={`p2-dot ${dot(id)} ${tab === id ? "on" : ""}`} aria-hidden="true" />Challenge {k + 1}
          </button>
        ))}
        <button type="button" role="tab" aria-selected={tab === "concept"} onClick={() => setTab("concept")}>
          <i className={`p2-dot ${rec?.concept?.passed ? "done" : ""} ${tab === "concept" ? "on" : ""}`} aria-hidden="true" />Concept check
        </button>
      </div>
      {!ready ? (
        <p className="p2-empty" role="status">Loading your progress…</p>
      ) : tab === "concept" ? (
        <ConceptCheck lesson={lesson} />
      ) : (
        <Challenge key={tab} id={tab} index={challenges.indexOf(tab)} next={onward(tab)} />
      )}
      {ready && mastered ? (
        <div className="p2-complete p2-lesson-status" role="status">
          <b>✓ Lesson mastered.</b>
          <p>You solved both challenges on your own and passed the concept check.</p>
          {next ? <Link className="p2-btn primary" href={psLessonHref(next.slug)}>Next lesson: {next.title} <ArrowRight size={14} aria-hidden="true" /></Link> : null}
        </div>
      ) : (
        <p className="p2-note p2-lesson-status">To master this lesson, solve both challenges without hints and pass the concept check.</p>
      )}
    </>
  );
}

/** Read a program, type what it prints; graded against what it printed on real Spark (as in Python's predictions). */
function PredictChallenge({ id, index, next }: { id: string; index: number; next: React.ReactNode }) {
  const { spec, expected } = psItem(id)!;
  const rec = usePs((s) => s.questions[id]);
  const st = usePs.getState();
  const hints = rec?.hints ?? 0;
  const [text, setText] = useState(rec?.draft ?? "");
  const [verdict, setVerdict] = useState<boolean | null>(null);
  const check = () => {
    const ok = samePrinted(text, expected.output ?? "");
    setVerdict(ok);
    st.recordCheck(id, ok);
  };
  const shown = verdict === true || rec?.solved || rec?.assisted;
  return (
    <>
      <div className="p2-task">
        <div className="p2-label">Challenge {index + 1}</div>
        <Md text={spec.prompt} />
        <ProgramTables spec={spec} />
      </div>
      <div className="p2-predict">
        <Code code={spec.program ?? ""} label="program.py" />
        <div className="p2-label">Your prediction</div>
        <textarea value={text} onChange={(e) => { setText(e.target.value); setVerdict(null); st.setDraft(id, e.target.value); }} placeholder="Type each printed line on its own line" aria-label="Your prediction" spellCheck={false} />
        <div className="p2-actions">
          <div><HelpButtons hintsShown={hints} hintCount={spec.hints.length} revealed={false} onHint={() => st.takeHint(id)} /></div>
          <div><button type="button" className="p2-btn primary" onClick={check} disabled={!text.trim()}>Check prediction</button></div>
        </div>
      </div>
      {verdict !== null && (
        <div className={`p2-verdict ${verdict ? "pass" : "fail"}`} role="status" style={{ border: "1px solid var(--rx-line)", borderRadius: 8, marginTop: 10 }}>
          <span className={`p2-mark ${verdict ? "pass" : "fail"}`} aria-hidden="true">{verdict ? "✓" : "✗"}</span>
          <div><b>{verdict ? "Correct" : "Not quite"}</b>{verdict ? <div className="p2-verdict-next">{next}</div> : <span className="p2-note">Compare your lines with the program again, one print at a time.</span>}</div>
        </div>
      )}
      {shown && (
        <>
          <div className="p2-label">What Spark printed</div>
          <pre className="p2-py-console ps-console">{(expected.output ?? "").replace(/\n+$/, "")}</pre>
        </>
      )}
      <HelpPanel hints={spec.hints} shown={hints} revealed={false} assisted={hints > 0} />
      {rec?.solved && <p className="p2-note">✓ Solved on your own.</p>}
    </>
  );
}

function Challenge({ id, index, next }: { id: string; index: number; next: React.ReactNode }) {
  if (psItem(id)?.spec.kind === "predict") return <PredictChallenge id={id} index={index} next={next} />;
  return <CodeChallenge id={id} index={index} next={next} />;
}

function CodeChallenge({ id, index, next }: { id: string; index: number; next: React.ReactNode }) {
  const item = psItem(id)!;
  const { spec, expected } = item;
  const rec = usePs((s) => s.questions[id]);
  const st = usePs.getState();
  const hints = rec?.hints ?? 0;
  return (
    <>
      <div className="p2-task">
        <div className="p2-label">Challenge {index + 1}</div>
        <Md text={spec.prompt} />
        <div className="p2-spec">
          <div><b>Write</b><span><code>{spec.entry}({spec.inputs.join(", ")})</code></span></div>
          {!keepsInputColumns(spec) && <div><b>Columns</b><span><Cols names={spec.output.columns} /> in this order</span></div>}
          {spec.rules.map((r, i) => <div key={r}><b>{i === 0 ? "Watch for" : ""}</b><span><Inline text={r} /></span></div>)}
        </div>
        <Expected expected={expected} caseId={spec.visible[0].id} ordered={spec.output.order_sensitive} collapsed />
        {expected.visible[spec.visible[0].id]?.inputs && (
          <>
            <p className="rx-label sec">data your function gets</p>
            <DatasetCards datasetId={spec.dataset.id} tables={spec.inputs} edition="lesson" sample={expected.visible[spec.visible[0].id].inputs} />
          </>
        )}
      </div>
      <PsWorkbench
        label={spec.title}
        value={rec?.draft ?? spec.starter ?? ""}
        onChange={(v) => st.setDraft(id, v)}
        starter={spec.starter ?? ""}
        request={(mode, code) => ({ mode, item: id, code })}
        gradable
        columns={spec.output.columns}
        onChecked={(r) => st.recordCheck(id, r.passed)}
        next={next}
        help={<HelpButtons hintsShown={hints} hintCount={spec.hints.length} revealed={false} onHint={() => st.takeHint(id)} />}
        status={
          <>
            <HelpPanel hints={spec.hints} shown={hints} revealed={false} assisted={hints > 0} />
            {rec?.solved && <p className="p2-note">✓ Solved on your own.</p>}
            {!rec?.solved && rec?.assisted && <p className="p2-note">Solved with hints. It counts toward mastery once you solve it without them.</p>}
          </>
        }
      />
    </>
  );
}

/** Choices that point at other choices by position ("Both of the first two…") must keep the authored order. */
const POSITIONAL = /\b(of the (first|last) (two|three)|(all|none) of the above|the above|the below)\b/i;

/**
 * The order to show a question's choices in: a fixed shuffle seeded by lesson and question, so the right answer isn't
 * usually in the same place, and a learner sees the same order on every visit. Returns the authored indices in display
 * order; picks and grading keep using the authored index, so saved answers and `answer` stay valid.
 */
function choiceOrder(lessonId: string, questionId: string, choices: readonly string[]): number[] {
  const order = choices.map((_, i) => i);
  if (choices.some((c) => POSITIONAL.test(c))) return order;
  let h = 2166136261;
  for (const ch of `${lessonId}:${questionId}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const rand = () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = order.length - 1; i > 0; i--) {
    const k = Math.floor(rand() * (i + 1));
    [order[i], order[k]] = [order[k], order[i]];
  }
  return order;
}

function ConceptCheck({ lesson }: { lesson: PsLesson }) {
  const { content } = lesson.written!;
  const rec = usePs((s) => s.lessons[lesson.id]);
  const [picks, setPicks] = useState<Record<string, number>>(() => ({ ...(rec?.concept?.answers ?? {}) }));
  const [checked, setChecked] = useState(false);
  const all = content.concept.every((q) => picks[q.id] !== undefined);
  const right = (qid: string) => content.concept.find((q) => q.id === qid)!.answer === picks[qid];
  const submit = () => {
    setChecked(true);
    usePs.getState().answerConcept(lesson.id, picks, content.concept.every((q) => right(q.id)));
    requestAnimationFrame(() => document.querySelector(".p2-work .p2-lesson-status")?.scrollIntoView?.({ block: "nearest" }));
  };
  return (
    <div className="p2-quiz">
      {content.concept.map((q, i) => (
        <section key={q.id} className="p2-q">
          <p className="p2-q-prompt" id={`${lesson.id}-${q.id}`}><b>{i + 1}.</b> <Inline text={q.prompt} /></p>
          <p className="p2-quiz-prompt">pick one answer</p>
          <div className="p2-choices" role="radiogroup" aria-labelledby={`${lesson.id}-${q.id}`}>
            {choiceOrder(lesson.id, q.id, q.choices).map((j, n) => {
              const state = checked && picks[q.id] === j ? (j === q.answer ? "right" : "wrong") : picks[q.id] === j ? "on" : "";
              const text = q.choices[j];
              return (
                <label key={j} className={state}>
                  <input className="sr-only" type="radio" name={`${lesson.id}-${q.id}`} checked={picks[q.id] === j} onChange={() => { setChecked(false); setPicks((p) => ({ ...p, [q.id]: j })); }} />
                  <span className="p2-opt" aria-hidden="true">{String.fromCharCode(97 + n)}</span>
                  <span className={text.includes("\n") ? "c" : "c prose"}>{text}</span>
                </label>
              );
            })}
          </div>
          {checked && picks[q.id] !== undefined && <p className="p2-note" role="status">{right(q.id) ? "✓ " : "✗ "}<Inline text={q.why} /></p>}
        </section>
      ))}
      <div>
        <button type="button" className="p2-btn primary" onClick={submit} disabled={!all}>Check answers</button>
        {rec?.concept?.passed && <span className="p2-note" style={{ marginLeft: 10 }}>✓ Concept check passed</span>}
      </div>
    </div>
  );
}
