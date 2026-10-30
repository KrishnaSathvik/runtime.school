"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLayoutEffect, useRef } from "react";
import { focusWorkspaceEditor } from "@/features/rt/workspace-focus";
import { Shell } from "@/features/rt/Shell";
import { TaskBar } from "@/features/python/TaskBar";
import { levelOf, psDataset, psDatasetHref, psLesson, psLessonBySlug, psLessonHref, psLessons, psProjectHref, psProjects, psQuestionHref, psQuestions, ROLE_LABEL } from "@/content/pyspark/content";
import { psRegistry } from "@/content/pyspark/registry";
import { isLessonMastered, usePs, usePsReady } from "@/lib/pyspark-progress";
import { LessonReading, LessonWork } from "./Lesson";
import { PlannedNote } from "./parts";

const pad = (n: number) => String(n).padStart(2, "0");

/** A dataset in a sentence per table, without rows: for pages that don't run anything. */
export function DatasetSummary({ datasetId, heading = "The data" }: { datasetId: string; heading?: string }) {
  const d = psDataset(datasetId);
  if (!d) return null;
  return (
    <section aria-label={heading}>
      <div className="p2-label">{heading}</div>
      <p className="p2-note">
        <Link href={psDatasetHref(d.id)}>{d.title}</Link>
      </p>
      <ul className="ps-tables">
        {d.built
          ? Object.entries(d.built.tables).map(([name, t]) => (
              <li key={name}><code>{name}</code> <span>{t.note}</span></li>
            ))
          : d.tables.map((name) => <li key={name}><code>{name}</code></li>)}
      </ul>
    </section>
  );
}

/** Learn: opens the next written lesson you haven't mastered, like SQL and Python. */
export function PySparkLearnEntry() {
  const router = useRouter();
  const ready = usePsReady();
  const done = useRef(false);
  useLayoutEffect(() => {
    if (!ready || done.current) return;
    done.current = true;
    const s = usePs.getState();
    const written = psLessons.filter((l) => l.written);
    const next = written.find((l) => !isLessonMastered(s.questions, s.lessons[l.id], l.written!.content.challenges)) ?? written[0] ?? psLessons[0];
    router.replace(psLessonHref(next.slug));
  }, [ready, router]);
  return (
    <Shell subject="pyspark" section="learn" path={[{ label: "pyspark" }, { label: "learn" }]}>
      <div className="rx-page" aria-busy="true" aria-label="Opening your lesson" />
    </Shell>
  );
}

export function LessonScreen({ slug }: { slug: string }) {
  const lesson = psLessonBySlug(slug)!;
  const i = psLessons.indexOf(lesson);
  const prev = psLessons[i - 1];
  const next = psLessons[i + 1];
  const questions = psQuestions.filter((q) => q.lesson === lesson.id);
  const projects = psProjects.filter((p) => p.prerequisites.includes(lesson.id));
  const questionsDone = usePs((s) => s.questions);
  const lessonsDone = usePs((s) => s.lessons);
  const mastered = !!lesson.written && isLessonMastered(questionsDone, lessonsDone[lesson.id], lesson.written.content.challenges);
  const ds = lesson.datasets[0] ? psDataset(lesson.datasets[0]) : null;
  const glyph = (id: string) => {
    const l = psLesson(id);
    if (!l?.written) return "·" as const;
    const challenges = l.written.content.challenges;
    if (isLessonMastered(questionsDone, lessonsDone[id], challenges)) return "✓" as const;
    return challenges.some((c) => questionsDone[c]) || lessonsDone[id]?.concept ? ("◑" as const) : ("·" as const);
  };
  const link = (id: string) => {
    const l = psLesson(id);
    return l ? <li key={id}><span><Link href={psLessonHref(l.slug)}>{pad(l.number)} {l.title}</Link></span></li> : null;
  };
  return (
    <Shell
      subject="pyspark"
      section="learn"
      path={[{ label: "pyspark", href: "/pyspark" }, { label: "learn", href: "/pyspark" }, { label: lesson.moduleEntry.title }, { label: lesson.title }]}
      status={["PySpark", `lesson ${lesson.number}/${psRegistry.lessons.length}`, ds ? `spark · ${ds.title}` : "runs on Apache Spark", mastered ? "✓ mastered" : "drafts save as you type"]}
    >
      <div className="p2 workspace-bounded rx-learn-tables">
        <TaskBar
          label="All lessons"
          heading="Course lessons"
          rows={psLessons.map((l) => ({ id: l.id, href: psLessonHref(l.slug), title: l.title, group: l.moduleEntry.title, glyph: glyph(l.id) }))}
          currentId={lesson.id}
          position={lesson.number}
          total={psRegistry.lessons.length}
          prev={prev ? { href: psLessonHref(prev.slug), label: prev.title } : null}
          next={next ? { href: psLessonHref(next.slug), label: next.title } : null}
        >
          <div className="p2-split">
            <article className="p2-read" aria-label="Lesson explanation" tabIndex={0}>
              <div className="p2-eyebrow"><b>lesson {pad(lesson.number)}</b> {lesson.moduleEntry.title} · {levelOf(lesson.module)}</div>
              <h1>{lesson.title}</h1>
              {lesson.written && <LessonReading lesson={lesson} />}
              {lesson.shown === "planned" && <PlannedNote what="lesson" />}
              {lesson.mode === "read-and-diagnose" && <p className="p2-note">Read and diagnose: this lesson doesn&apos;t run code. You&apos;ll read real Spark output and answer questions about it.</p>}
              {!lesson.written && <div className="p2-label">Builds on</div>}
              {!lesson.written && (lesson.prerequisites.length ? <ul className="p2-list">{lesson.prerequisites.map(link)}</ul> : <p className="p2-note">Nothing: this is a starting point.</p>)}
              {!lesson.written && lesson.related.length > 0 && (
                <>
                  <div className="p2-label">Related</div>
                  <ul className="p2-list">{lesson.related.map(link)}</ul>
                </>
              )}
              {!lesson.written && lesson.datasets.map((d) => <DatasetSummary key={d} datasetId={d} />)}
              {!lesson.written && (
                <>
                  <div className="p2-label">Practise this</div>
                  <ul className="p2-list">
                    {questions.map((q) => (
                      <li key={q.id}><span><Link href={psQuestionHref(q.slug)}>{q.authored ? q.title : ROLE_LABEL[q.role]}</Link></span></li>
                    ))}
                  </ul>
                </>
              )}
              {!lesson.written && projects.length > 0 && (
                <>
                  <div className="p2-label">Used in projects</div>
                  <ul className="p2-list">{projects.map((p) => <li key={p.id}><span><Link href={psProjectHref(p.slug)}>{p.title}</Link></span></li>)}</ul>
                </>
              )}
            </article>
            <section className="p2-work" id="lesson-work" aria-label="Practice in this lesson" tabIndex={0} onFocusCapture={focusWorkspaceEditor}>
              {lesson.written ? <LessonWork lesson={lesson} next={next} /> : (
              <>
              <div className="p2-tabs" role="tablist" aria-label="Lesson steps">
                {["Challenge 1", "Challenge 2", "Concept check"].map((t, k) => (
                  <button key={t} type="button" role="tab" aria-selected={k === 0} aria-disabled="true" disabled><i className="p2-dot" aria-hidden="true" />{t}</button>
                ))}
              </div>
              <p className="p2-empty">The challenges and concept check for this lesson aren&apos;t written yet, so there&apos;s nothing to run here.</p>
              </>
              )}
            </section>
          </div>
        </TaskBar>
      </div>
    </Shell>
  );
}
