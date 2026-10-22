"use client";

import { focusWorkspaceEditor } from "@/features/rt/workspace-focus";

import Link from "next/link";
import { track } from "@/lib/analytics";
import { Fragment, useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronDown, ChevronRight, Play, RotateCcw } from "lucide-react";
import { runPython, stopPython, type PyPackage, type PyRunResult } from "@/engine/python/client";
import { pyRegistry } from "@/content/python-v2/registry";
import { pyLessonHref, visibleLessons, visibleQuestions, pyQuestionHref } from "@/content/python-v2/content";
import type { PyExercise, PyLesson, PyLessonBlock } from "@/content/python-v2/model";
import { Shell } from "@/features/rt/Shell";
import { emptyLesson, isGuided, isLessonMastered, usePy2, usePy2Ready } from "@/lib/python-progress-v2";
import { HelpButtons, HelpPanel } from "./Help";
import { Code } from "./Code";
import { Inline, Md } from "./Md";
import { TaskBar } from "./TaskBar";
import { showWorkTop } from "./JumpToWork";
import { ExpectedOutput } from "./Results";
import { Workbench } from "./Workbench";

const TOTAL_LESSONS = pyRegistry.lessons.length;

/** Stage → the level word SQL shows in its lesson header (lesson 02 SQL foundations · beginner). */
export const levelOf = (stage: number) => (stage <= 2 ? "beginner" : stage <= 5 ? "intermediate" : "advanced");

/** Only lessons the browser can't run as written say so (plan §1.2); ordinary lessons show nothing. */
export function ModeNote({ mode }: { mode: string }) {
  if (mode === "simulated") return <p className="p2-note">Simulated: this runs against results recorded on real Python.</p>;
  if (mode === "read-and-diagnose") return <p className="p2-note">Read and diagnose: this can&apos;t run in the browser, so you&apos;ll read real code and output and answer questions about it.</p>;
  return null;
}

/**
 * A worked example: the program in an editor, and a console that stays empty until Run.
 * Run is what fills the console, the same way SQL's worked example fills its result.
 */
function ExampleBlock({ b, n, packages = [] }: { b: Extract<PyLessonBlock, { kind: "example" | "error-example" }>; n: number; packages?: readonly PyPackage[] }) {
  const [r, setR] = useState<PyRunResult | null>(null);
  const [open, setOpen] = useState(true);
  const [busy, setBusy] = useState(false);
  const operation = useRef<symbol | null>(null);
  const [interrupted, setInterrupted] = useState(false);
  useEffect(() => () => {
    const owned = operation.current;
    operation.current = null;
    if (owned) stopPython(owned);
  }, []);
  const name = `example-${n}.py`;
  const run = async () => {
    if (operation.current) return;
    const owned = Symbol("lesson-example");
    operation.current = owned;
    setBusy(true);
    setInterrupted(false);
    try {
      const res = await runPython(b.code, { operation: owned, stdin: b.kind === "example" ? b.stdin : undefined, packages });
      if (operation.current !== owned) return;
      if (res.status === "superseded") setInterrupted(true);
      else { setR(res); setOpen(true); }
    } catch (error) {
      if (operation.current === owned) { setR({ status: "crashed", message: error instanceof Error ? error.message : String(error), stdout: "", stderr: "", output: [] }); setOpen(true); }
    } finally {
      if (operation.current === owned) { operation.current = null; setBusy(false); }
    }
  };
  return (
    <div className="p2-example">
      <div className="p2-example-head">
        <span>{name} · {b.title}</span>
        <span className="p2-example-acts">
          {r && (
            <button type="button" className="p2-small-btn" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
              {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />} {open ? "Hide" : "Show"}
            </button>
          )}
          <button type="button" className="p2-small-btn" onClick={() => void run()} disabled={busy} aria-label={`${r ? "Run again" : "Run"}: ${b.title}`}>
            {r ? <RotateCcw size={13} /> : <Play size={13} />} {busy ? "Running…" : r ? "Run again" : "Run"}
          </button>
        </span>
      </div>
      <Code code={b.code} label={name} />
      {interrupted && <p className="p2-note" role="status">Another program on this page started, so this run was stopped. Run it again.</p>}
      {r && open && (
        <>
          <PythonConsole result={r} name={name} />
          {b.kind === "example" && b.stdin && <p className="p2-note">Typed input supplied for this example: <code>{b.stdin.replace(/\n$/, "").replace(/\n/g, " ⏎ ")}</code></p>}
          {b.note && <div className="note"><Inline text={b.note} /></div>}
        </>
      )}
    </div>
  );
}

/**
 * What Python printed. Nothing is shown until Run. An error shows what ran before it, then the traceback, as a terminal
 * would: lessons ask learners to read both (which line ran, which line stopped the program).
 */
function PythonConsole({ result, name }: { result: PyRunResult; name: string }) {
  const { out, err } = consoleText(result, name);
  return (
    <pre className={`p2-py-console${err && !out ? " bad" : ""}`} aria-live="polite" aria-label="Python console">
      {out}
      {out && err ? "\n" : ""}
      {err && <span className="p2-py-err">{err}</span>}
    </pre>
  );
}

/** The program file is called main.py inside the runner; the example on screen is `name`. */
const renamed = (text: string, name: string) => text.replace(/File "main\.py"/g, `File "${name}"`);

function consoleText(result: PyRunResult, name: string): { out: string; err: string } {
  const out = "stdout" in result ? result.stdout.replace(/\n$/, "") : "";
  switch (result.status) {
    case "ok":
    case "stopped":
      return { out, err: "" };
    case "syntax-error": {
      const e = result.error;
      const caret = e.column && e.text ? `\n    ${" ".repeat(Math.max(0, e.column - 1))}^` : "";
      const where = e.line ? `  File "${name}", line ${e.line}\n${e.text ? `    ${e.text.replace(/\n$/, "")}${caret}\n` : ""}` : "";
      return { out: "", err: `${where}${e.type}: ${e.message}` };
    }
    case "runtime-error": {
      const e = result.error;
      const tb = e.traceback ? renamed(e.traceback, name).replace(/\n$/, "") : `${e.type}: ${e.message}`;
      return { out, err: tb };
    }
    case "timeout":
      return { out, err: "The program was still running." };
    case "output-limit":
      return { out, err: "The program printed too much." };
    case "crashed":
    case "unavailable":
      return { out: "", err: result.message };
    case "superseded":
      return { out: "", err: "" };
    default: {
      const unreachable: never = result;
      return unreachable;
    }
  }
}

/** Text this blank starter used to ship already filled in. A saved copy the learner never typed is cleared once on restore so it doesn't put the answer back. */
function cannedDraft(saved: string, answer: string, alternatives: string[] | undefined): boolean {
  const first = answer.split("\n").find((line) => line.length > 0) ?? "";
  return saved === answer || saved === first || saved === `${first}\n` || (alternatives ?? []).includes(saved);
}

/** Head starts that used to open a write-from-scratch editor. A saved copy of one is not the learner's work. */
const RETIRED_PREFILL = new Set([
  'print("City?")',
  "items = 17\nper_box = 5",
  "price = 12",
  'status = "delivered"',
  "price = 20\npacked = False",
  "qty = 0",
  'note = "Promo WELCOME10"',
  'raw = "12"',
  'refund = 5\nprint("Refund:", refund)',
  'in_stock = True\nprint("In stock:", in_stock)',
  'price_text = "19.5"\nprice = price_text\nprint(price)',
  'count = 3\nlabel = count\nprint("Items:", label)',
  'count = 0\nprice = 0\nprint("Count:", count)\nprint("Price:", price)',
  "qty = 0\npacked = True",
  'coupon = None\nnote = "No coupon yet"',
  "price = 8.5\nprint(price)",
  "print(4 * 10 + 2)",
  'print("Packing slip:", "O104839")',
]);

function retiredPrefill(saved: string): boolean {
  return RETIRED_PREFILL.has(saved.replace(/\s+$/, ""));
}

/**
 * The editor text to show, and a replacement to persist when a saved copy is a leaked answer or an old head start.
 * Only for restoring a saved copy: a draft the learner typed or pasted (editedKey) is always theirs, even when it
 * matches the reference answer.
 */
export function exerciseDraft(
  saved: string | null | undefined,
  starter: string,
  answer: string,
  alternatives: string[] | undefined,
  unsolved: boolean,
  blankKey: string,
  editedKey: string,
): { value: string; replace: string | null } {
  if (saved == null) return { value: starter, replace: null };
  if (blanked(editedKey)) return { value: saved, replace: null };
  const leaked = unsolved && saved !== starter && cannedDraft(saved, answer, alternatives);
  const hideCanned = starter === "" && unsolved && cannedDraft(saved, answer, alternatives) && !blanked(blankKey);
  const retired = starter === "" && unsolved && retiredPrefill(saved) && !blanked(blankKey);
  if (hideCanned || retired) return { value: "", replace: "" };
  if (leaked) return { value: starter, replace: starter };
  return { value: saved, replace: null };
}

function blanked(key: string): boolean {
  try {
    if (sessionStorage.getItem(key) === "1") return true;
  } catch { /* private mode */ }
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

/** Remembers, across reloads and tabs, that the learner wrote this draft themselves. */
function markEdited(key: string) {
  try { sessionStorage.setItem(key, "1"); } catch { /* private mode */ }
  try { localStorage.setItem(key, "1"); } catch { /* private mode */ }
}

function ExercisePanel({ lesson, ex, credit, challenges, next }: { lesson: PyLesson; ex: PyExercise; credit: boolean; challenges: string[]; next?: { label: string; go: () => void } }) {
  const where = { kind: "lesson" as const, id: lesson.id, exercise: ex.id };
  const rec = usePy2((s) => s.lessons[lesson.id]?.exercises[ex.id]);
  const [resetToken, setResetToken] = useState(0);
  const blankKey = `py2-blank:${lesson.id}:${ex.id}`;
  const editedKey = `py2-edited:${lesson.id}:${ex.id}`;
  const saved = rec?.draft ?? null;
  const unsolved = !rec?.solved && !(rec?.checks);
  // Clean up a restored copy only; once the learner edits in this panel, show exactly what they wrote.
  const typed = useRef(false);
  const resolved = typed.current
    ? { value: saved ?? ex.starter, replace: null }
    : exerciseDraft(saved, ex.starter, ex.answer, ex.alternatives, unsolved, blankKey, editedKey);
  const draft = resolved.value;
  useEffect(() => {
    if (resolved.replace == null) return;
    if (resolved.replace === "") {
      try { sessionStorage.setItem(blankKey, "1"); } catch { /* private mode */ }
    }
    usePy2.getState().setDraft({ kind: "lesson", id: lesson.id, exercise: ex.id }, resolved.replace);
  }, [resolved.replace, blankKey, lesson.id, ex.id]);
  const attempt = rec?.attempt ?? { hints: 0, revealed: false };
  const st = usePy2.getState();
  const reset = () => {
    setResetToken((t) => t + 1);
  };
  return (
    <>
      <div className="p2-task">
        <div className="p2-label">{ex.id === "try" ? "Try it · guided" : ex.id === "c1" ? "Challenge 1" : "Challenge 2"}</div>
        <Md text={ex.prompt} />
        {ex.spec.length > 0 && (
          <div className="p2-spec">
            {ex.spec.map(([k, v], i) => (
              <div key={i}><b>{k}</b><span><Inline text={v} /></span></div>
            ))}
          </div>
        )}
        <ExpectedOutput task={ex.task} simple />
      </div>
      <Workbench
        key={ex.id}
        resetVersion={resetToken}
        resetFiles={{ "main.py": ex.starter }}
        label={ex.title}
        files={[{ name: "main.py", value: draft, onChange: (v) => { if (v !== ex.starter) { typed.current = true; markEdited(editedKey); } st.setDraft(where, v); } }]}
        task={ex.task}
        packages={lesson.packages}
        onReset={reset}
        onChecked={(r) => credit && st.recordCheck(where, r.ok, challenges)}
        next={next && <button type="button" className="p2-btn primary" onClick={next.go}>{next.label} <ArrowRight size={14} aria-hidden="true" /></button>}
        help={<HelpButtons hintsShown={attempt.hints} hintCount={ex.hints.length} revealed={attempt.revealed} onHint={() => st.takeHelp(where, "hint")} onAnswer={() => st.takeHelp(where, "answer")} />}
        status={
          <>
            <HelpPanel hints={ex.hints} shown={attempt.hints} answer={ex.answer} revealed={attempt.revealed} assisted={isGuided(attempt)} free={!credit} onFresh={() => { st.freshAttempt(where); reset(); }} />
            {credit && rec?.solved && <p className="p2-note">✓ Solved on your own.</p>}
            {credit && !rec?.solved && rec?.assisted && <p className="p2-note">Solved with help. Solve it without hints or the answer to count it toward mastery.</p>}
            {!credit && <p className="p2-note">Guided practice: hints are free here and nothing is recorded.</p>}
          </>
        }
      />
    </>
  );
}

function ConceptCheck({ lesson, challenges }: { lesson: PyLesson; challenges: string[] }) {
  const rec = usePy2((s) => s.lessons[lesson.id]) ?? emptyLesson();
  const [picks, setPicks] = useState<Record<string, number>>(() => ({ ...rec.concept.answers }));
  const [checked, setChecked] = useState(false);
  const all = lesson.concept.every((q) => picks[q.id] !== undefined);
  const right = (qid: string) => lesson.concept.find((q) => q.id === qid)!.answer === picks[qid];
  const submit = () => {
    setChecked(true);
    const allCorrect = lesson.concept.every((q) => right(q.id));
    lesson.concept.forEach((q) => usePy2.getState().answerConcept(lesson.id, q.id, picks[q.id], allCorrect, challenges));
    // Bring the outcome (and, once mastered, the way on) into view under the button.
    requestAnimationFrame(() => document.querySelector(".p2-work .p2-lesson-status")?.scrollIntoView?.({ block: "nearest" }));
  };
  return (
    <div className="p2-quiz">
      {lesson.concept.map((q, i) => (
        <fieldset key={q.id} className="p2-q">
          <legend><b>{i + 1}.</b> <Inline text={q.prompt} /></legend>
          {q.program && <Code code={q.program} label="The program" />}
          <div className="p2-choices">
            {q.choices.map((c, j) => {
              const state = checked && picks[q.id] === j ? (j === q.answer ? "right" : "wrong") : "";
              return (
                <label key={j} className={state}>
                  <input type="radio" name={`${lesson.id}-${q.id}`} checked={picks[q.id] === j} onChange={() => { setChecked(false); setPicks((p) => ({ ...p, [q.id]: j })); }} />
                  <span className="c">{c}</span>
                </label>
              );
            })}
          </div>
          {checked && picks[q.id] !== undefined && <p className="p2-note" role="status">{right(q.id) ? "✓ " : "✗ "}<Inline text={q.why} /></p>}
        </fieldset>
      ))}
      <div>
        <button type="button" className="p2-btn primary" onClick={submit} disabled={!all}>Check answers</button>
        {rec.concept.passed && <span className="p2-note" style={{ marginLeft: 10 }}>✓ Concept check passed</span>}
      </div>
    </div>
  );
}

function openTab(saved: string | null | undefined, challengeIds: string[]): string {
  if (saved && saved !== "try" && (saved === "concept" || challengeIds.includes(saved))) return saved;
  return challengeIds[0] ?? "concept";
}

export function LessonScreen({ slug }: { slug: string }) {
  const ready = usePy2Ready();
  const lessons = visibleLessons();
  const i = lessons.findIndex((l) => l.slug === slug);
  const lesson = lessons[i];
  const mod = pyRegistry.modules.find((m) => m.id === lesson.entry.module)!;
  const stage = pyRegistry.stages.find((s) => s.stage === mod.stage)!;
  const challenges = lesson.challenges.map((c) => c.id);
  const rec = usePy2((s) => s.lessons[lesson.id]);
  const progress = usePy2((s) => s.lessons);
  const tabs = lesson.challenges;
  const [tab, setTabState] = useState<string>(() => openTab(rec?.tab, challenges));
  const setTab = (t: string) => { setTabState(t); usePy2.getState().setTab(lesson.id, t); };
  useEffect(() => track("lesson_started", { subject: "python", lesson: lesson.id, position: lesson.number }), [lesson.id, lesson.number]);
  const restored = useRef(false);
  useEffect(() => {
    if (!ready || restored.current) return;
    restored.current = true;
    setTabState(openTab(usePy2.getState().lessons[lesson.id]?.tab, challenges));
  }, [ready, lesson.id, lesson.challenges]);
  const mastered = isLessonMastered(rec, challenges);
  const prev = lessons[i - 1];
  const next = lessons[i + 1];
  const practice = visibleQuestions().filter((q) => q.entry.prerequisites.includes(lesson.id));
  // After a passing check: the next challenge, then the concept check.
  const nextStep = (id: string) => {
    const k = tabs.findIndex((t) => t.id === id);
    const to = tabs[k + 1]?.id ?? "concept";
    return { label: to === "concept" ? "Next: Concept check" : `Next: Challenge ${k + 2}`, go: () => { setTab(to); showWorkTop("lesson-work"); } };
  };
  const dot = (id: string) => {
    const e = rec?.exercises[id];
    return e?.solved ? "done" : e?.assisted ? "assisted" : "";
  };

  return (
    <Shell
      subject="python"
      section="learn"
      path={[{ label: "python", href: "/python" }, { label: "learn", href: "/python" }, { label: mod.title }, { label: lesson.title }]}
    >
      <div className="p2 workspace-bounded">
        <TaskBar
          label="All lessons"
          heading="Course lessons"
          rows={lessons.map((l) => {
            const m = pyRegistry.modules.find((x) => x.id === l.entry.module)!;
            const r = progress[l.id];
            return { id: l.id, href: pyLessonHref(l.slug), title: l.title, group: m.title, glyph: isLessonMastered(r, l.challenges.map((c) => c.id)) ? "✓" : r ? "◑" : "·" };
          })}
          currentId={lesson.id}
          position={lesson.number}
          total={TOTAL_LESSONS}
          prev={prev ? { href: pyLessonHref(prev.slug), label: prev.title } : null}
          next={next ? { href: pyLessonHref(next.slug), label: next.title } : null}
        >
        <div className="p2-split">
          <article className="p2-read" aria-label="Lesson explanation" tabIndex={0}>
            <div className="p2-eyebrow"><b>lesson {String(lesson.number).padStart(2, "0")}</b> {mod.title} · {levelOf(stage.stage)}</div>
            <h1>{lesson.title}</h1>
            <p className="p2-lede">{lesson.lede}</p>
            <ModeNote mode={lesson.entry.mode} />
            <div className="p2-label">You&apos;ll be able to</div>
            <ul className="p2-list">{lesson.objectives.map((o) => <li key={o}><span><Inline text={o} /></span></li>)}</ul>
            <div className="p2-label">The idea</div>
            {(() => {
              let n = 0;
              return lesson.blocks.map((b, k) => {
                if (b.kind === "text") return <Md key={k} text={b.md} />;
                n++;
                // Said once, just above the first example, where "run each example" makes sense.
                return (
                  <Fragment key={k}>
                    {n === 1 && <p className="p2-note">Run each example to see what it prints. Running examples doesn&apos;t count toward progress.</p>}
                    <ExampleBlock b={b} n={n} packages={lesson.packages} />
                  </Fragment>
                );
              });
            })()}
            <div className="p2-label">Review</div>
            <ul className="p2-list">{lesson.review.map((r) => <li key={r}><span><Inline text={r} /></span></li>)}</ul>
            {practice.length > 0 && (
              <>
                <div className="p2-label">Practise this</div>
                <ul className="p2-list">{practice.map((q) => <li key={q.id}><Link href={pyQuestionHref(q.slug)}>{q.title}</Link></li>)}</ul>
              </>
            )}
          </article>
          <section className="p2-work" id="lesson-work" aria-label="Practice in this lesson" tabIndex={0} onFocusCapture={focusWorkspaceEditor}>
            <div className="p2-tabs" role="tablist" aria-label="Lesson steps">
              {tabs.map((t) => (
                <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>
                  <i className={`p2-dot ${dot(t.id)} ${tab === t.id ? "on" : ""}`} aria-hidden="true" />{t.id === "c1" ? "Challenge 1" : "Challenge 2"}
                </button>
              ))}
              <button type="button" role="tab" aria-selected={tab === "concept"} onClick={() => setTab("concept")}>
                <i className={`p2-dot ${rec?.concept.passed ? "done" : ""} ${tab === "concept" ? "on" : ""}`} aria-hidden="true" />Concept check
              </button>
            </div>
            {!ready ? (
              <p className="p2-empty" role="status">Loading your progress…</p>
            ) : tab === "concept" ? (
              <ConceptCheck lesson={lesson} challenges={challenges} />
            ) : (
              <ExercisePanel key={tab} lesson={lesson} ex={tabs.find((t) => t.id === tab) ?? tabs[0]} credit challenges={challenges} next={nextStep(tab)} />
            )}
            {ready && mastered ? (
              <div className="p2-complete p2-lesson-status" role="status">
                <b>✓ Lesson mastered.</b>
                <p>You solved both challenges on your own and passed the concept check.</p>
                {next ? (
                  <Link className="p2-btn primary" href={pyLessonHref(next.slug)}>Next lesson: {next.title} <ArrowRight size={14} aria-hidden="true" /></Link>
                ) : (
                  <Link className="p2-btn primary" href="/python/practice">Go to practice <ArrowRight size={14} aria-hidden="true" /></Link>
                )}
              </div>
            ) : (
              <p className="p2-note p2-lesson-status">To master this lesson, solve both challenges without hints or the answer, and pass the concept check.</p>
            )}
          </section>
        </div>
        </TaskBar>
      </div>
    </Shell>
  );
}
