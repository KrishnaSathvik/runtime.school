"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { focusWorkspaceEditor } from "@/features/rt/workspace-focus";
import { Shell } from "@/features/rt/Shell";
import { TaskBar } from "@/features/python/TaskBar";
import { HelpButtons, HelpPanel } from "@/features/python/Help";
import { Inline, Md } from "@/features/python/Md";
import { keepsInputColumns, psDataset, psLesson, psLessonHref, psQuestionBySlug, psQuestionHref, psQuestions, ROLE_LABEL, type PsEdition, type PsQuestion, samePrinted } from "@/content/pyspark/content";
import { psRegistry } from "@/content/pyspark/registry";
import { usePs, usePsReady } from "@/lib/pyspark-progress";
import { useState, type ReactNode } from "react";
import { Cols, Spec } from "@/features/rt/Spec";
import { Code } from "@/features/python/Code";
import { DatasetCards, Expected, PlannedNote, ProgramTables } from "./parts";
import { DatasetSummary } from "./Learn";
import { PsWorkbench } from "./PsWorkbench";

const pad = (n: number) => String(n).padStart(2, "0");
const moduleTitle = (id: string) => psRegistry.modules.find((m) => m.id === id)?.title ?? "";

export function QuestionScreen({ slug }: { slug: string }) {
  const q = psQuestionBySlug(slug)!;
  const i = psQuestions.indexOf(q);
  const prev = psQuestions[i - 1];
  const next = psQuestions[i + 1];
  const ready = usePsReady();
  const progress = usePs((s) => s.questions);
  const lesson = psLesson(q.lesson);
  const rec = progress[q.id];
  const ds = psDataset(q.datasets[0] ?? q.authored?.spec.dataset.id ?? "");
  return (
    <Shell
      subject="pyspark"
      section="practice"
      path={[{ label: "pyspark", href: "/pyspark" }, { label: "practice", href: "/pyspark/practice" }, { label: moduleTitle(q.module) }, { label: q.title }]}
      status={["PySpark", `question ${q.number}/${psRegistry.questions.length}`, ds ? `spark · ${ds.title}` : "runs on Apache Spark", ready ? (rec?.solved ? "✓ solved" : rec?.assisted ? "solved with help" : "draft saves as you type") : "…"]}
    >
      <div className="p2 workspace-bounded rx-learn-tables">
        <TaskBar
          label="All questions"
          heading="Practice questions"
          byLevel
          rows={psQuestions.map((x) => {
            const r = progress[x.id];
            return { id: x.id, href: psQuestionHref(x.slug), title: x.title, group: moduleTitle(x.module), difficulty: x.difficulty, glyph: r?.solved ? ("✓" as const) : r?.assisted ? ("◑" as const) : ("·" as const) };
          })}
          currentId={q.id}
          position={q.number}
          total={psRegistry.questions.length}
          prev={prev ? { href: psQuestionHref(prev.slug), label: prev.title } : null}
          next={next ? { href: psQuestionHref(next.slug), label: next.title } : null}
        >
          <div className="p2-split">
            <article className="p2-read" aria-label="Problem requirements" tabIndex={0}>
              <div className="p2-eyebrow">
                <b>question {pad(q.number)}</b> {moduleTitle(q.module)} · <span className={`p2-level ${q.difficulty}`}>{q.difficulty}</span>
              </div>
              <h1>{q.title}</h1>
              {q.authored ? (q.authored.spec.kind === "predict" ? <AuthoredPredict q={q} /> : <Authored q={q} />) : (
                <>
                  <PlannedNote what="question" />
                  <p className="p2-note">Role in its lesson: {ROLE_LABEL[q.role]}.</p>
                  {q.datasets.map((d) => <DatasetSummary key={d} datasetId={d} />)}
                </>
              )}
              {!q.authored && lesson && (
                <>
                  <div className="p2-label">Learn it</div>
                  <p className="p2-note"><Link href={psLessonHref(lesson.slug)}>Lesson {pad(lesson.number)}: {lesson.title}</Link></p>
                </>
              )}
            </article>
            <section className="p2-work" id="question-work" aria-label="Your solution" tabIndex={0} onFocusCapture={focusWorkspaceEditor}>
              {q.authored ? <Work q={q} /> : <p className="p2-empty">This question isn&apos;t written yet, so there&apos;s nothing to run.</p>}
            </section>
          </div>
        </TaskBar>
      </div>
    </Shell>
  );
}

function Authored({ q }: { q: PsQuestion }) {
  const { spec, expected } = q.authored!;
  const sample = spec.visible[0];
  const rec = usePs((s) => s.questions[q.id]);
  const lesson = psLesson(spec.lesson ?? q.lesson);
  const total = expected.visible[sample.id]?.row_count ?? expected.visible[sample.id]?.rows.length ?? 0;
  const order = spec.output.order_sensitive ? "in the order asked" : "any order";
  return (
    <>
      <Md text={spec.prompt} className="p2-prose p2-lede" />
      <p className="rx-label">what to return</p>
      <Spec
        rows={[
          ["Write", <code key="f">{spec.entry}({spec.inputs.join(", ")})</code>],
          ...(keepsInputColumns(spec) ? [] : [["Columns", <span key="cols"><Cols names={spec.output.columns} /> <span className="rx-dim">in this order</span></span>] as [string, ReactNode]]),
          ["Rows", `${total} row${total === 1 ? "" : "s"} · ${order}`],
          ...spec.rules.map((r, i): [string, ReactNode] => [i === 0 ? "Watch for" : "", <Inline key={i} text={r} />]),
          ["Checked on", `the data below and ${expected.hidden.length} hidden cases`],
          ...(lesson ? [["Skill", <Link key="skill" className="rx-link" href={psLessonHref(lesson.slug)}>Refresher: {lesson.title} →</Link>] as [string, ReactNode]] : []),
        ]}
      />
      <p className="rx-label sec">expected result</p>
      <Expected expected={expected} caseId={sample.id} ordered={spec.output.order_sensitive} collapsed />
      <p className="rx-label sec">data your function gets</p>
      <DatasetCards datasetId={spec.dataset.id} tables={spec.inputs} edition={(sample.edition ?? "lesson") as PsEdition} sample={expected.visible[sample.id]?.inputs} />
      {spec.explanation && (rec?.solved || rec?.assisted) && (
        <>
          <p className="rx-label sec">explanation</p>
          <Md text={spec.explanation} />
        </>
      )}
    </>
  );
}

function AuthoredPredict({ q }: { q: PsQuestion }) {
  const { spec } = q.authored!;
  const rec = usePs((s) => s.questions[q.id]);
  const lesson = psLesson(spec.lesson ?? q.lesson);
  return (
    <>
      <Md text={spec.prompt} className="p2-prose p2-lede" />
      <p className="rx-label">what to predict</p>
      <Spec
        rows={[
          ["Type", "every line the program prints, in order"],
          ["Checked on", "what this program printed on Apache Spark"],
          ...(lesson ? [["Skill", <Link key="skill" className="rx-link" href={psLessonHref(lesson.slug)}>Refresher: {lesson.title} →</Link>] as [string, ReactNode]] : []),
        ]}
      />
      <ProgramTables spec={spec} />
      {spec.explanation && (rec?.solved || rec?.assisted) && (
        <>
          <p className="rx-label sec">explanation</p>
          <Md text={spec.explanation} />
        </>
      )}
    </>
  );
}

/** Read a program, type what it prints; graded against what it printed on real Spark (Python's Prediction screen). */
function Prediction({ q, next }: { q: PsQuestion; next: ReactNode }) {
  const { spec, expected } = q.authored!;
  const rec = usePs((s) => s.questions[q.id]);
  const st = usePs.getState();
  const hints = rec?.hints ?? 0;
  const [text, setText] = useState(rec?.draft ?? "");
  const [verdict, setVerdict] = useState<boolean | null>(null);
  const output = (expected.output ?? "").replace(/\n+$/, "");
  const check = () => {
    const ok = samePrinted(text, output);
    setVerdict(ok);
    st.recordCheck(q.id, ok);
  };
  return (
    <div className="p2-predict">
      <div className="p2-bench">
        <div className="p2-bench-bar"><div className="p2-files"><span style={{ padding: "8px 14px", background: "var(--ide-bg)" }}>predict.py <i className="p2-ro">read-only</i></span></div></div>
        <Code code={spec.program ?? ""} label="The program" />
      </div>
      <label className="p2-label" htmlFor={`pred-${q.id}`} style={{ display: "block" }}>Your prediction</label>
      <textarea
        id={`pred-${q.id}`}
        value={text}
        spellCheck={false}
        onChange={(e) => { setText(e.target.value); setVerdict(null); st.setDraft(q.id, e.target.value); }}
        placeholder="Type each printed line on its own line"
      />
      <div className="p2-actions" style={{ border: "1px solid var(--rx-line)", borderRadius: 8, marginTop: 8 }}>
        <div><HelpButtons hintsShown={hints} hintCount={spec.hints.length} revealed={false} onHint={() => st.takeHint(q.id)} /></div>
        <div><button type="button" className="p2-btn primary" onClick={check} disabled={!text.trim()}>Check prediction</button></div>
      </div>
      {verdict !== null && (
        <div className={`p2-verdict ${verdict ? "pass" : "fail"}`} role="status" style={{ border: "1px solid var(--rx-line)", borderRadius: 8, marginTop: 10 }}>
          <span className={`p2-mark ${verdict ? "pass" : "fail"}`} aria-hidden="true">{verdict ? "✓" : "✗"}</span>
          <div><b>{verdict ? "Correct" : "Not quite"}</b>{verdict ? <div className="p2-verdict-next">{next}</div> : <span className="p2-note">Compare your lines with the program again, one print at a time.</span>}</div>
        </div>
      )}
      {(verdict || rec?.solved || rec?.assisted) && (
        <>
          <div className="p2-label">What Spark printed</div>
          <pre className="p2-py-console ps-console">{output}</pre>
        </>
      )}
      <HelpPanel hints={spec.hints} shown={hints} revealed={false} assisted={hints > 0} />
    </div>
  );
}

function Work({ q }: { q: PsQuestion }) {
  const ready = usePsReady();
  const { spec } = q.authored!;
  const rec = usePs((s) => s.questions[q.id]);
  const st = usePs.getState();
  const hints = rec?.hints ?? 0;
  const after = psQuestions.slice(q.number).find((x) => x.authored && x.shown !== "planned");
  const onward = after
    ? <Link className="p2-btn primary" href={psQuestionHref(after.slug)}>Next question: {after.title} <ArrowRight size={14} aria-hidden="true" /></Link>
    : <span className="p2-note">This is the only written question so far.</span>;
  if (!ready) return <p className="p2-empty" role="status">Loading your progress…</p>;
  const solvedNote = (
    <>
      {rec?.solved && <p className="p2-note">✓ Solved on your own.</p>}
      {!rec?.solved && rec?.assisted && <p className="p2-note">Solved with hints.</p>}
    </>
  );
  if (spec.kind === "predict") return <><Prediction q={q} next={onward} />{solvedNote}</>;
  return (
    <>
      <PsWorkbench
        label={spec.title}
        value={rec?.draft ?? spec.starter ?? ""}
        onChange={(v) => st.setDraft(q.id, v)}
        starter={spec.starter ?? ""}
        request={(mode, code) => ({ mode, item: q.id, code })}
        gradable
        columns={spec.output.columns}
        onChecked={(r) => st.recordCheck(q.id, r.passed)}
        next={onward}
        help={<HelpButtons hintsShown={hints} hintCount={spec.hints.length} revealed={false} onHint={() => st.takeHint(q.id)} />}
        status={<HelpPanel hints={spec.hints} shown={hints} revealed={false} assisted={hints > 0} />}
      />
      {solvedNote}
    </>
  );
}
