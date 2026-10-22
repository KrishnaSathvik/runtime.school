"use client";

import { focusWorkspaceEditor } from "@/features/rt/workspace-focus";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { runPython, type PyRunResult } from "@/engine/python/client";
import { publicExamples } from "@/engine/python/grading";
import { gradePrediction, type PredictResult } from "@/engine/python/predict";
import { pyRegistry } from "@/content/python-v2/registry";
import { pyQuestionHref, visibleQuestions } from "@/content/python-v2/content";
import type { VisibleQuestion } from "@/content/python-v2/content";
import { Shell } from "@/features/rt/Shell";
import { isGuided, usePy2, usePy2Ready } from "@/lib/python-progress-v2";
import { HelpButtons, HelpPanel } from "./Help";
import { exerciseDraft, ModeNote } from "./Lesson";
import { Code } from "./Code";
import { Inline, Md } from "./Md";
import { ConsoleView, ExpectedOutput } from "./Results";
import { TaskBar } from "./TaskBar";
import { revealResults, Workbench } from "./Workbench";

function Prediction({ q, next }: { q: VisibleQuestion; next: ReactNode }) {
  const p = q.predict!;
  const where = { kind: "question" as const, id: q.id };
  const rec = usePy2((s) => s.questions[q.id]);
  const st = usePy2.getState();
  const [answer, setAnswer] = useState(rec?.draft ?? "");
  const [result, setResult] = useState<PredictResult | null>(null);
  const [ran, setRan] = useState<PyRunResult | null>(null);
  const attempt = rec?.attempt ?? { hints: 0, revealed: false };
  const verdict = useRef<HTMLDivElement>(null);
  const actions = useRef<HTMLDivElement>(null);
  const check = () => {
    const r = gradePrediction(p.output, answer);
    setResult(r);
    st.recordCheck(where, r.ok);
    requestAnimationFrame(() => revealResults(verdict.current, actions.current));
  };
  const run = async () => {
    const r = await runPython(p.program, { stdin: p.stdin, packages: q.packages });
    if (r.status !== "superseded") setRan(r);
  };
  return (
    <div className="p2-predict">
      <div className="p2-bench">
        <div className="p2-bench-bar"><div className="p2-files"><span style={{ padding: "8px 14px", background: "var(--ide-bg)" }}>predict.py <i className="p2-ro">read-only</i></span></div></div>
        <Code code={p.program} label="The program" />
      </div>
      <label className="p2-label" htmlFor={`pred-${q.id}`} style={{ display: "block" }}>Your prediction</label>
      <textarea
        id={`pred-${q.id}`}
        value={answer}
        spellCheck={false}
        onChange={(e) => { setAnswer(e.target.value); setResult(null); st.setDraft(where, e.target.value); }}
        placeholder="Type each printed line on its own line"
      />
      <div className="p2-actions" ref={actions} style={{ border: "1px solid var(--rx-line)", borderRadius: 8, marginTop: 8 }}>
        <div><HelpButtons hintsShown={attempt.hints} hintCount={q.hints.length} revealed={attempt.revealed} onHint={() => st.takeHelp(where, "hint")} onAnswer={() => st.takeHelp(where, "answer")} /></div>
        <div>
          {(result?.ok || rec?.solved || rec?.assisted || attempt.revealed) && <button type="button" className="p2-btn line" onClick={run}>Run the program</button>}
          <button type="button" className="p2-btn primary" onClick={check}>Check prediction</button>
        </div>
      </div>
      {result && (
        <div ref={verdict} className={`p2-verdict ${result.ok ? "pass" : "fail"}`} role="status" style={{ border: "1px solid var(--rx-line)", borderRadius: 8, marginTop: 10 }}>
          <span className={`p2-mark ${result.ok ? "pass" : "fail"}`} aria-hidden="true">{result.ok ? "✓" : "✗"}</span>
          <div><b>{result.ok ? "Correct" : "Not quite"}</b><span className="p2-note">{result.detail}</span>{result.ok && <div className="p2-verdict-next">{next}</div>}</div>
        </div>
      )}
      {ran && <div className="p2-results" style={{ marginTop: 10 }}><ConsoleView live={[]} result={ran} busy={false} /></div>}
      <HelpPanel hints={q.hints} shown={attempt.hints} answer={p.output.replace(/\n$/, "")} revealed={attempt.revealed} assisted={isGuided(attempt)} onFresh={() => st.freshAttempt(where)} />
      <p className="p2-note">Predict first: you can run the program once your prediction is right or you&apos;ve seen the answer.</p>
    </div>
  );
}

function CodeQuestion({ q, next }: { q: VisibleQuestion; next: ReactNode }) {
  const c = q.code!;
  const where = { kind: "question" as const, id: q.id };
  const rec = usePy2((s) => s.questions[q.id]);
  const st = usePy2.getState();
  const [token, setToken] = useState(0);
  const blankKey = `py2-blank:q:${q.id}`;
  const editedKey = `py2-edited:q:${q.id}`;
  const unsolved = !rec?.solved && !rec?.assisted;
  const resolved = exerciseDraft(rec?.draft, c.starter, c.answer, c.alternatives, unsolved, blankKey, editedKey);
  const attempt = rec?.attempt ?? { hints: 0, revealed: false };
  useEffect(() => {
    if (resolved.replace == null) return;
    if (resolved.replace === "") {
      try { sessionStorage.setItem(blankKey, "1"); } catch { /* private mode */ }
    }
    st.setDraft({ kind: "question", id: q.id }, resolved.replace);
  }, [resolved.replace, blankKey, q.id, st]);
  const reset = () => { setToken((t) => t + 1); };
  return (
    <Workbench
      key={q.id}
      resetVersion={token}
      resetFiles={{ "main.py": c.starter }}
      label={q.title}
      files={[{ name: "main.py", value: resolved.value, onChange: (v) => { st.setDraft(where, v); if (v !== c.starter) { try { sessionStorage.setItem(editedKey, "1"); } catch { /* private mode */ } } } }]}
      task={c.task}
      packages={q.packages}
      onReset={reset}
      onChecked={(r) => st.recordCheck(where, r.ok)}
      next={next}
      help={<HelpButtons hintsShown={attempt.hints} hintCount={q.hints.length} revealed={attempt.revealed} onHint={() => st.takeHelp(where, "hint")} onAnswer={() => st.takeHelp(where, "answer")} />}
      status={<HelpPanel hints={q.hints} shown={attempt.hints} answer={c.answer} revealed={attempt.revealed} assisted={isGuided(attempt)} onFresh={() => { st.freshAttempt(where); reset(); }} />}
    />
  );
}

export function QuestionScreen({ slug }: { slug: string }) {
  const ready = usePy2Ready();
  const all = visibleQuestions();
  const i = all.findIndex((q) => q.slug === slug);
  const q = all[i];
  const mod = pyRegistry.modules.find((m) => m.id === q.entry.module)!;
  const rec = usePy2((s) => s.questions[q.id]);
  const progress = usePy2((s) => s.questions);
  const prev = all[i - 1];
  const next = all[i + 1];
  // After a pass: on to the next question in course order; after the last one, back to the first unsolved.
  const onward = next
    ? <Link className="p2-btn primary" href={pyQuestionHref(next.slug)}>Next question: {next.title} <ArrowRight size={14} aria-hidden="true" /></Link>
    : <Link className="p2-btn primary" href="/python/practice">Next unsolved question <ArrowRight size={14} aria-hidden="true" /></Link>;
  return (
    <Shell
      subject="python"
      section="practice"
      path={[{ label: "python", href: "/python" }, { label: "practice", href: "/python/practice" }, { label: mod.title }, { label: q.title }]}
    >
      <div className="p2 workspace-bounded">
        <TaskBar
          label="All questions"
          heading="Practice questions"
          byLevel
          rows={all.map((x) => {
            const r = progress[x.id];
            const group = pyRegistry.modules.find((m) => m.id === x.entry.module)?.title ?? x.entry.module;
            return { id: x.id, href: pyQuestionHref(x.slug), title: x.title, group, difficulty: x.difficulty, glyph: r?.solved ? ("✓" as const) : r?.assisted ? ("◑" as const) : ("·" as const) };
          })}
          currentId={q.id}
          position={i + 1}
          total={all.length}
          prev={prev ? { href: pyQuestionHref(prev.slug), label: prev.title } : null}
          next={next ? { href: pyQuestionHref(next.slug), label: next.title } : null}
        >
        <div className="p2-split">
          <article className="p2-read" aria-label="Problem requirements" tabIndex={0}>
            <div className="p2-eyebrow"><b>question {String(i + 1).padStart(2, "0")}</b> {mod.title} · <span className={`p2-level ${q.difficulty}`}>{q.difficulty}</span></div>
            <h1>{q.title}</h1>
            <Md text={q.prompt} className="p2-prose p2-lede" />
            <ModeNote mode={q.entry.mode} />
            {q.spec.length > 0 && (
              <div className="p2-spec">
                {q.spec.map(([k, v], i) => (
                  <div key={i}><b>{k}</b><span><Inline text={v} /></span></div>
                ))}
              </div>
            )}
            {q.code && publicExamples(q.code.task).length > 0 && (
              <>
                <div className="p2-label">Examples</div>
                {publicExamples(q.code.task).map((e, n) => (
                  <div key={n} className="p2-case"><span>call</span><span>{e.call}</span><span>{e.kind}</span><span>{e.result}</span></div>
                ))}
              </>
            )}
            {q.code && <ExpectedOutput task={q.code.task} />}
            {(rec?.solved || rec?.assisted) && (
              <>
                <div className="p2-label">Explanation</div>
                <Md text={q.explanation} />
              </>
            )}
          </article>
          <section className="p2-work" id="question-work" aria-label="Your solution" tabIndex={0} onFocusCapture={focusWorkspaceEditor}>
            {!ready ? <p className="p2-empty" role="status">Loading your progress…</p> : q.predict ? <Prediction q={q} next={onward} /> : <CodeQuestion q={q} next={onward} />}
            {rec?.solved && <p className="p2-note">✓ Solved on your own.</p>}
            {!rec?.solved && rec?.assisted && <p className="p2-note">Solved with help. Try again without hints to solve it on your own.</p>}
          </section>
        </div>
        </TaskBar>
      </div>
    </Shell>
  );
}
