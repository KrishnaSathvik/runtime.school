"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getPythonLesson, pythonLessonHref, pythonModules } from "@/content/python";
import { isPyLessonMastered, usePyProgress, usePyProgressReady } from "@/lib/python-progress";
import { Shell } from "@/features/rt/Shell";

const pad = (n: number) => String(n).padStart(2, "0");

/** Python home: the modules and lessons that exist today, with this browser's progress. */
export function PythonHome() {
  const ready = usePyProgressReady();
  const lessons = usePyProgress((s) => s.lessons);
  return (
    <Shell subject="python" section="learn" path={[{ label: "python" }]} status={["Python", "python 3.14 · runs in your browser", "progress is saved in this browser"]}>
      <div className="rx-page py-home">
        <p className="rx-prompt-line"><b>python</b> learn</p>
        <h1 className="rx-title">Python</h1>
        <p className="rx-lead">Learn Python by writing real programs. Every example and exercise runs in a real Python interpreter, right here in your browser.</p>

        <p className="py-links"><Link href="/python/practice">Practice independently</Link><Link href="/python/projects">Build a project</Link><Link href="/python/playground">Open Python playground</Link></p>
        <section className="py-learning-loop" aria-labelledby="learning-loop-title">
          <h2 id="learning-loop-title">Make time to use what you learn</h2>
          <ol><li><b>Learn one idea.</b> Read a lesson and predict an example before running it.</li><li><b>Try it yourself.</b> Solve a practice question, then inspect what went wrong.</li><li><b>Build something useful.</b> Apply the skills you have practiced to a project.</li></ol>
          <p>A short practice session counts. You do not need to finish a whole module in one sitting.</p>
        </section>
        {pythonModules.map((m) => (
          <section key={m.id} className="py-module" aria-labelledby={`module-${m.id}`}>
            <p className="rx-label">module {pad(m.number)}</p>
            <h2 id={`module-${m.id}`} className="py-module-title">{m.title}</h2>
            <p className="py-module-sum">{m.summary}</p>
            <ol className="py-lessons">
              {m.lessons.map((slug) => {
                const l = getPythonLesson(slug)!;
                const rec = lessons[l.ref];
                const ids = l.challenges.map((c) => c.id);
                const mastered = isPyLessonMastered(rec, ids);
                const steps = [rec?.challenges["challenge-1"]?.solved, rec?.challenges["challenge-2"]?.solved, rec?.quiz.passed].filter(Boolean).length;
                const started = !!rec && (steps > 0 || Object.keys(rec.drafts).length > 0 || rec.tab !== null);
                const state = !ready ? "" : mastered ? "✓ mastered" : started ? `in progress · ${steps} of 3 steps` : "not started";
                return (
                  <li key={slug}>
                    <Link href={pythonLessonHref(slug)} className="py-lesson-row">
                      <span className="mono n">{pad(l.number)}</span>
                      <span className="t">
                        <span className="name">{l.title}</span>
                        <span className="sum">{l.summary}</span>
                      </span>
                      <span className={`mono s ${mastered ? "ok" : ""}`}>{state}</span>
                      <span className="go">{!ready ? "Open" : mastered ? "Review" : started ? "Continue" : "Start"} <ArrowRight size={14} aria-hidden="true" /></span>
                    </Link>
                  </li>
                );
              })}
            </ol>
            <p className="py-links"><Link href={`/python/practice?module=${m.id}#questions`}>Practice {m.title.toLowerCase()}</Link></p>

          </section>
        ))}
      </div>
    </Shell>
  );
}
