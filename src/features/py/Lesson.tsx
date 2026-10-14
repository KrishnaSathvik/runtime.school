"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Circle, CircleCheck, Eye, Lightbulb, Lock, RotateCcw } from "lucide-react";
import { getPythonLesson, pythonLessonOrder, pythonModules, type PyChallenge, type PyLesson } from "@/content/python";
import type { PyGradeReport } from "@/engine/python/grading";
import { emptyAttempt, emptyLesson, isPyLessonMastered, usePyProgress, usePyProgressReady, type PyLessonRecord } from "@/lib/python-progress";
import { Shell } from "@/features/rt/Shell";
import { CodePane, type CodePaneHandle } from "./CodePane";
import { PyRunCell } from "./PyRunCell";
import { Rich } from "./Rich";

type Tab = "challenge-1" | "challenge-2" | "check" | "complete";
const TABS: Tab[] = ["challenge-1", "challenge-2", "check", "complete"];
const pad = (n: number) => String(n).padStart(2, "0");

/** A challenge's task with the lesson's libraries and fixture files (the challenge's own files win on a clash). */
function lessonTask(lesson: PyLesson, challenge: PyChallenge) {
  const task = challenge.task;
  const files = lesson.files || task.files ? { ...lesson.files, ...task.files } : undefined;
  return { ...task, ...(lesson.packages && !task.packages ? { packages: lesson.packages } : {}), ...(files ? { files } : {}) };
}

function challengeIds(lesson: PyLesson) {
  return lesson.challenges.map((c) => c.id);
}

/** The next step a learner should take: first unfinished challenge, then the check, then Complete. */
function nextStep(lesson: PyLesson, rec: PyLessonRecord | undefined): Tab {
  for (const c of lesson.challenges) if (!rec?.challenges[c.id]?.solved) return c.id;
  if (!rec?.quiz.passed) return "check";
  return "complete";
}

function openingTab(lesson: PyLesson, rec: PyLessonRecord | undefined): Tab {
  const mastered = isPyLessonMastered(rec, challengeIds(lesson));
  const saved = rec?.tab as Tab | null | undefined;
  if (saved && TABS.includes(saved) && (saved !== "complete" || mastered)) return saved;
  return mastered ? "complete" : nextStep(lesson, rec);
}

/**
 * A Python lesson: read and run on the left; the two challenges, the concept check and the
 * completion step on the right. Mastery: both challenges solved without help, plus the check.
 */
export function PythonLesson({ slug }: { slug: string }) {
  const lesson = getPythonLesson(slug)!;
  const ready = usePyProgressReady();
  const rec = usePyProgress((s) => s.lessons[lesson.ref]);
  const setTabStored = usePyProgress((s) => s.setTab);
  const ids = challengeIds(lesson);
  const mastered = isPyLessonMastered(rec, ids);
  const [tab, setTab] = useState<Tab>("challenge-1");
  const restored = useRef(false);

  // After saved progress loads, open the saved step (or the next unfinished one) once.
  useEffect(() => {
    if (!ready || restored.current) return;
    restored.current = true;
    setTab(openingTab(lesson, usePyProgress.getState().lessons[lesson.ref]));
  }, [ready, lesson]);

  const pick = (t: Tab) => {
    setTab(t);
    setTabStored(lesson.ref, t);
  };

  const position = pythonLessonOrder.indexOf(lesson.slug);
  const mod = pythonModules.find((m) => m.id === lesson.module)!;
  const done = {
    "challenge-1": !!rec?.challenges["challenge-1"]?.solved,
    "challenge-2": !!rec?.challenges["challenge-2"]?.solved,
    check: !!rec?.quiz.passed,
  };
  const left = [done["challenge-1"], done["challenge-2"], done.check].filter((d) => !d).length;
  const tabs: { id: Tab; label: string; done: boolean; locked?: boolean }[] = [
    { id: "challenge-1", label: "Challenge 1", done: done["challenge-1"] },
    { id: "challenge-2", label: "Challenge 2", done: done["challenge-2"] },
    { id: "check", label: "Concept check", done: done.check },
    { id: "complete", label: "Complete", done: mastered, locked: !mastered },
  ];

  return (
    <Shell
      subject="python"
      section="learn"
      path={[{ label: "python", href: "/python" }, { label: mod.id, href: "/python" }, { label: `${pad(lesson.number)}-${lesson.slug}` }]}
      status={["Python", `lesson ${position + 1}/${pythonLessonOrder.length}`, "python 3.14 · runs in your browser", mastered ? "✓ mastered" : "drafts save as you type"]}
    >
      <div className="rx-task py-lesson-bar" style={{ maxWidth: "none" }}>
        <div className="rx-task-bar">
          <Link href="/python" className="rx-btn ghost"><ArrowLeft size={14} /> {mod.title}</Link>
          <span className="mono rx-small" style={{ margin: 0 }}>{pad(position + 1)} / {pad(pythonLessonOrder.length)}</span>
        </div>
      </div>
      <div className="rx-task rx-lesson py-lesson">
        <div className="rx-task-split">
          <article className="rx-brief" aria-labelledby="lesson-title">
            <Brief lesson={lesson} moduleTitle={mod.title} />
          </article>

          <section className="rx-work rx-lesson-work py-lesson-work" aria-label="Your work">
            <div className="rx-tabs" role="tablist" aria-label="Lesson steps">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  id={`tab-${t.id}`}
                  aria-selected={tab === t.id}
                  aria-controls={`panel-${t.id}`}
                  aria-disabled={t.locked || undefined}
                  title={t.locked ? "Finish both challenges and the concept check first" : undefined}
                  onClick={() => !t.locked && pick(t.id)}
                >
                  {t.locked ? <Lock size={14} className="todo" aria-hidden="true" /> : t.done ? <CircleCheck size={15} className="ok" aria-hidden="true" /> : <Circle size={15} className="todo" aria-hidden="true" />} {t.label}
                  {t.done && <span className="sr-only"> (done)</span>}
                  {t.locked && <span className="sr-only"> (locked)</span>}
                </button>
              ))}
            </div>
            <div id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`}>
              {(tab === "challenge-1" || tab === "challenge-2") && (
                <ChallengePanel
                  key={tab}
                  lesson={lesson}
                  challenge={lesson.challenges[tab === "challenge-1" ? 0 : 1]}
                  index={tab === "challenge-1" ? 0 : 1}
                  onNext={() => pick(nextStep(lesson, usePyProgress.getState().lessons[lesson.ref]))}
                />
              )}
              {tab === "check" && <QuizPanel lesson={lesson} onNext={() => pick(nextStep(lesson, usePyProgress.getState().lessons[lesson.ref]))} />}
              {tab === "complete" && mastered && <CompletePanel lesson={lesson} />}
            </div>
            {tab !== "complete" && (
              <div className={`rx-lesson-status ${mastered ? "done" : ""}`} aria-live="polite">
                <span>
                  {mastered ? (
                    <>✓ Lesson mastered. <button type="button" className="py-link" onClick={() => pick("complete")}>See what you completed</button></>
                  ) : (
                    <>To master this lesson, solve both challenges without help and pass the concept check.{" "}<b>{`${left} of 3 to go.`}</b></>
                  )}
                </span>
              </div>
            )}
          </section>
        </div>
      </div>
    </Shell>
  );
}

function Brief({ lesson, moduleTitle }: { lesson: PyLesson; moduleTitle: string }) {
  return (
    <>
      <p className="rx-prompt-line"><b>lesson {pad(lesson.number)}</b> {moduleTitle} · {lesson.level}</p>
      <h1 id="lesson-title" className="rx-task-title">{lesson.title}</h1>
      <p className="rx-lead" style={{ fontSize: "1.05rem" }}>{lesson.summary}</p>

      {lesson.sections.map((s) => (
        <section key={s.label} aria-label={s.label}>
          <h2 className="rx-label sec">{s.label}</h2>
          {s.blocks.map((b, i) =>
            b.kind === "p" ? (
              <p key={i} className="rx-prose py-prose"><Rich text={b.text} /></p>
            ) : (
              <pre key={i} className="py-static-code" tabIndex={0}>{b.code}</pre>
            ),
          )}
        </section>
      ))}

      <h2 className="rx-label sec">example</h2>
      <p className="rx-cap">{lesson.example.caption}</p>
      <PyRunCell packages={lesson.packages} files={lesson.files} code={lesson.example.code} name="example.py" />

      <h2 className="rx-label sec">step by step</h2>
      <p className="rx-cap">Each step adds one idea. Run them in order and watch what changes.</p>
      <ol className="rx-walk">
        {lesson.walkthrough.map((step, i) => (
          <li key={step.title}>
            <span className="rx-walk-no" aria-hidden="true">{i + 1}</span>
            <div className="rx-walk-body">
              <p><strong>{step.title}.</strong> <Rich text={step.text} /></p>
              <PyRunCell packages={lesson.packages} files={lesson.files} code={step.code} name={`step-${i + 1}.py`} />
            </div>
          </li>
        ))}
      </ol>

      <h2 className="rx-label sec">watch for</h2>
      {lesson.mistakes.map((m, i) => (
        <div key={m.title} className="py-mistake">
          <p className="py-mistake-title">{m.title}</p>
          <p className="rx-prose py-prose"><Rich text={m.text} /></p>
          <PyRunCell packages={lesson.packages} files={lesson.files} code={m.code} name={`mistake-${i + 1}.py`} />
          <p className="py-fix"><Rich text={m.fix} /></p>
        </div>
      ))}
    </>
  );
}

function ChallengePanel({ lesson, challenge, index, onNext }: { lesson: PyLesson; challenge: PyChallenge; index: number; onNext: () => void }) {
  const cid = challenge.id;
  const rec = usePyProgress((s) => s.lessons[lesson.ref]) ?? emptyLesson();
  const setDraft = usePyProgress((s) => s.setDraft);
  const takeHelp = usePyProgress((s) => s.takeHelp);
  const freshAttempt = usePyProgress((s) => s.freshAttempt);
  const recordCheck = usePyProgress((s) => s.recordCheck);
  const pane = useRef<CodePaneHandle>(null);
  const [confirm, setConfirm] = useState<null | "hint" | "answer">(null);
  const attempt = rec.attempts[cid] ?? emptyAttempt();
  const record = rec.challenges[cid];
  const value = rec.drafts[cid] ?? challenge.starter;
  const hintsShown = Math.min(challenge.hints.length, attempt.hints);
  const nextLabel = (() => {
    const others = lesson.challenges.filter((c) => c.id !== cid && !rec.challenges[c.id]?.solved);
    if (others.length) return `Continue to ${others[0].id === "challenge-1" ? "Challenge 1" : "Challenge 2"}`;
    return rec.quiz.passed ? "See your completed lesson" : "Continue to the concept check";
  })();

  const help = (kind: "hint" | "answer") => {
    takeHelp(lesson.ref, cid, kind);
    setConfirm(null);
  };

  const banner = (report: PyGradeReport) => {
    if (!report.ok) return null;
    return attempt.guided ? (
      <div className="py-banner assisted" role="status">
        <p><b>✓ Correct, with help.</b> Because you used {attempt.revealed ? "the answer" : "a hint"}, this doesn&apos;t count toward mastery. When you&apos;re ready, choose <em>Try again without help</em> and solve it on your own.</p>
      </div>
    ) : (
      <div className="py-banner ok" role="status">
        <p><b>✓ Solved without help.</b></p>
        <button type="button" className="rx-btn primary" onClick={onNext}>{nextLabel} <ArrowRight size={14} /></button>
      </div>
    );
  };

  return (
    <div className="py-challenge">
      <section className="rx-question" aria-labelledby={`${cid}-title`}>
        <div className="rx-question-head">
          <p className="rx-label">challenge {index + 1}</p>
          {record?.solved ? (
            <span className="rx-tag ok">✓ solved without help</span>
          ) : attempt.guided ? (
            <span className="rx-tag amber">using help</span>
          ) : record?.assisted ? (
            <span className="rx-tag amber">solved with help</span>
          ) : null}
        </div>
        <h2 id={`${cid}-title`} className="py-ch-title">{challenge.title}</h2>
        <p className="py-ch-prompt"><Rich text={challenge.prompt} /></p>
        {challenge.expectedOutput && (
          <>
            <p className="py-looks" id={`${cid}-expected`}>Your program should print</p>
            <pre className="py-expected" aria-labelledby={`${cid}-expected`} tabIndex={0}>{challenge.expectedOutput}</pre>
          </>
        )}
        <p className="py-looks">Check answer looks for</p>
        <ul className="py-list py-looks-list">
          {challenge.looksFor.map((t) => <li key={t}><Rich text={t} /></li>)}
        </ul>
        <div className="py-help">
          {hintsShown < challenge.hints.length && (
            <button type="button" className="rx-btn ghost" onClick={() => (attempt.guided ? help("hint") : setConfirm("hint"))}>
              <Lightbulb size={13} /> {hintsShown === 0 ? "Hint" : "Another hint"}
            </button>
          )}
          {!attempt.revealed && (
            <button type="button" className="rx-btn ghost" onClick={() => setConfirm("answer")}>
              <Eye size={13} /> Show answer
            </button>
          )}
          {attempt.guided && (
            <button
              type="button"
              className="rx-btn ghost"
              onClick={() => {
                freshAttempt(lesson.ref, cid);
                pane.current?.setCode(challenge.starter);
              }}
            >
              <RotateCcw size={13} /> Try again without help
            </button>
          )}
        </div>
      </section>

      {confirm && (
        <div className="rx-confirm" role="group" aria-label="Confirm help">
          <p>
            {confirm === "hint" ? "Showing a hint" : "Showing the answer"} means a correct answer counts as solved with help, not toward mastery. You can try again without help afterwards.
          </p>
          <div className="rx-confirm-acts">
            <button type="button" className="rx-btn primary" onClick={() => help(confirm)}>{confirm === "hint" ? "Show hint" : "Show answer"}</button>
            <button type="button" className="rx-btn" onClick={() => setConfirm(null)}>Keep trying</button>
          </div>
        </div>
      )}
      {hintsShown > 0 && (
        <ul className="rx-hints" aria-label="Hints">
          {challenge.hints.slice(0, hintsShown).map((h) => <li key={h}><span className="mono">hint ›</span> <Rich text={h} /></li>)}
        </ul>
      )}
      {attempt.revealed && (
        <div className="rx-cell">
          <div className="rx-cell-head">
            <span className="name">one correct answer</span>
            <span className="acts"><button type="button" className="rx-btn ghost" onClick={() => pane.current?.setCode(challenge.answer + "\n")}>Put in editor</button></span>
          </div>
          <div className="rx-cell-in"><span className="p" aria-hidden="true">py›</span><pre tabIndex={0}>{challenge.answer}</pre></div>
        </div>
      )}

      <div className="py-lesson-code">
        <CodePane
          ref={pane}
          task={lessonTask(lesson, challenge)}
          starter={challenge.starter}
          value={value}
          onChange={(code) => setDraft(lesson.ref, cid, code)}
          onGraded={(report) => recordCheck(lesson.ref, cid, report.ok, challengeIds(lesson))}
          checkBanner={banner}
          splitKey="runtime-python-split-lesson"
          editorShare={0.5}
        />
      </div>
    </div>
  );
}

function QuizPanel({ lesson, onNext }: { lesson: PyLesson; onNext: () => void }) {
  const rec = usePyProgress((s) => s.lessons[lesson.ref]) ?? emptyLesson();
  const answerQuiz = usePyProgress((s) => s.answerQuiz);
  const [choices, setChoices] = useState<Record<string, number>>({});
  const correctIndex = (qid: string) => lesson.quiz.find((q) => q.id === qid)!.options.findIndex((o) => o.correct);
  const allCorrect = lesson.quiz.every((q) => choices[q.id] === correctIndex(q.id));
  const mastered = isPyLessonMastered(rec, challengeIds(lesson));
  const remaining = lesson.challenges.filter((c) => !rec.challenges[c.id]?.solved).map((c) => (c.id === "challenge-1" ? "Challenge 1" : "Challenge 2"));

  const choose = (qid: string, i: number) => {
    const next = { ...choices, [qid]: i };
    setChoices(next);
    const passed = lesson.quiz.every((q) => next[q.id] === correctIndex(q.id));
    answerQuiz(lesson.ref, qid, i, passed, challengeIds(lesson));
  };

  return (
    <div className="py-quiz">
      <p className="rx-small" style={{ marginTop: 0 }}>Answer both questions. Each answer explains itself, right or wrong, and you can change your answer.</p>
      {lesson.quiz.map((q, qi) => {
        const choice = choices[q.id];
        const picked = choice !== undefined ? q.options[choice] : null;
        return (
          <section key={q.id} className="rx-question py-quiz-q" aria-labelledby={`q-${q.id}`}>
            <div className="rx-question-head"><p className="rx-label">question {qi + 1} of {lesson.quiz.length}</p></div>
            <p id={`q-${q.id}`} className="rx-question-text"><Rich text={q.prompt} /></p>
            {q.code && <pre className="py-static-code" tabIndex={0}>{q.code}</pre>}
            <div className="rx-quiz" role="group" aria-label={`Answers for question ${qi + 1}`}>
              {q.options.map((o, i) => (
                <button key={o.text} type="button" aria-pressed={choice === i} onClick={() => choose(q.id, i)}>
                  <span className="mono rx-opt">{String.fromCharCode(97 + i)}</span> <Rich text={o.text} />
                </button>
              ))}
            </div>
            <div aria-live="polite">
              {picked && (
                <p className={`rx-feedback ${picked.correct ? "ok" : "bad"}`}>
                  {picked.correct ? "✓ Correct. " : "✕ Not quite. "}
                  <Rich text={picked.why} />
                </p>
              )}
            </div>
          </section>
        );
      })}
      <div aria-live="polite">
        {allCorrect ? (
          <div className="py-banner ok" role="status">
            <p><b>✓ Concept check passed.</b> {mastered ? "That completes the lesson." : `To finish the lesson, solve ${remaining.join(" and ")} without help.`}</p>
            <button type="button" className="rx-btn primary" onClick={onNext}>
              {mastered ? "See your completed lesson" : `Go to ${remaining[0] ?? "the next step"}`} <ArrowRight size={14} />
            </button>
          </div>
        ) : rec.quiz.passed ? (
          <p className="rx-feedback ok">✓ You passed this concept check earlier. You can answer again to review.</p>
        ) : null}
      </div>
    </div>
  );
}

function CompletePanel({ lesson }: { lesson: PyLesson }) {
  const rec = usePyProgress((s) => s.lessons[lesson.ref]);
  const when = rec?.masteredAt ? new Date(rec.masteredAt).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }) : null;
  const next = pythonLessonOrder[pythonLessonOrder.indexOf(lesson.slug) + 1];
  return (
    <section className="py-complete" aria-labelledby="complete-title">
      <p className="rx-label">lesson complete</p>
      <h2 id="complete-title" className="py-complete-title">✓ {lesson.title}: mastered</h2>
      <p className="py-complete-sub">You solved both challenges on your own and passed the concept check{when ? ` on ${when}` : ""}.</p>
      <p className="py-looks">You can now</p>
      <ul className="py-list">
        {lesson.outcomes.map((o) => <li key={o}><Rich text={o} /></li>)}
      </ul>
      <div className="py-complete-acts">
        {next ? (
          <Link href={`/python/lesson/${next}`} className="rx-btn primary">Next lesson <ArrowRight size={14} /></Link>
        ) : (
          <Link href="/python" className="rx-btn primary">Back to Python Foundations <ArrowRight size={14} /></Link>
        )}
      </div>
      {!next && <p className="rx-small">This is the latest Python lesson. The next Foundations lessons are being written.</p>}
    </section>
  );
}
