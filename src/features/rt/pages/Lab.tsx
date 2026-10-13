"use client";

import { useState } from "react";
import Link from "next/link";
import { getLesson, groups, labExperiments, labLessonPresets } from "@/content";
import { lessonSummaries } from "@/content/ux-summaries";
import { learnerExplanation } from "@/lib/content-copy";
import { labObservations, labToRun } from "@/content/lab-guides";
import { useLearning } from "@/lib/learning-state";
import { Shell } from "../Shell";
import { TaskCell } from "../Cells";
import { prettySql } from "@/components/editor/pretty-sql";
import { Select } from "../Select";

type Pick = { kind: "experiment" | "lesson"; id: string };

/** Database Lab: experiments that change data, in a temporary database that resets on every run. */
export function Lab() {
  const [pick, setPick] = useState<Pick>({ kind: "experiment", id: labExperiments[0].id });
  const [pending, setPending] = useState<string | null>(null);
  const drafts = useLearning((s) => s.drafts);
  const setDraft = useLearning((s) => s.setDraft);

  const experiment = pick.kind === "experiment" ? labExperiments.find((e) => e.id === pick.id) : undefined;
  const preset = pick.kind === "lesson" ? labLessonPresets.find((l) => String(l.id) === pick.id) : undefined;
  const lesson = preset ? getLesson(Number(preset.id)) : undefined;
  const raw = experiment?.sql ?? preset?.example ?? "";
  const original = prettySql(raw);
  // Experiments keep the current app's draft keys, so saved scripts carry over.
  const key = experiment ? `sql-lab-${experiment.id}` : `sql-lab-lesson-${pick.id}`;
  // A draft that is still the untouched one-line script shows the readable version.
  const value = drafts[key] === undefined || drafts[key] === raw ? original : drafts[key];
  const duplicate = experiment?.id === "constraints" ? `${original}\nINSERT INTO tags(name) VALUES('sql');` : null;
  const name = experiment ? `${experiment.id}.sql` : `lesson-${pick.id}.sql`;

  const load = (sql: string) => {
    if (value.trim() && value !== original && value !== duplicate) setPending(sql);
    else { setDraft(key, sql); setPending(null); }
  };

  return (
    <Shell
      path={[{ label: "sql" }, { label: "lab" }, { label: name }]}
      section="tools"
      status={["SQL", "database lab · not graded", "temporary database", "resets on every run"]}
    >
      <div className="rx-task rx-lesson">
        <div className="rx-task-split">
          <article className="rx-brief" aria-labelledby="lab-title">
            <p className="rx-prompt-line"><b>lab</b> learn how databases change · {labExperiments.length + labLessonPresets.length} experiments · resets every run</p>
            <Select
              id="lab-choice"
              label="experiment"
              value={`${pick.kind}:${pick.id}`}
              onChange={(v) => {
                const [kind, id] = v.split(":");
                setPick({ kind: kind as Pick["kind"], id });
                setPending(null);
              }}
              groups={[
                { label: "Core experiments", options: labExperiments.map((e, i) => ({ value: `experiment:${e.id}`, label: `${String(i + 1).padStart(2, "0")} · ${e.title}` })) },
                { label: "More database experiments · from the lessons", options: labLessonPresets.map((l) => ({ value: `lesson:${l.id}`, label: l.title })) },
              ]}
            />
            <h1 id="lab-title" className="rx-task-title" style={{ marginTop: 22 }}>{experiment?.title ?? preset?.title}</h1>
            {experiment ? (
              <>
                <p className="rx-lead" style={{ fontSize: "1.05rem", marginTop: 8 }}>{experiment.description}</p>
                <dl className="rx-dl">
                  <dt>what to run</dt><dd>{labToRun[experiment.id]}</dd>
                  <dt>what you should see</dt><dd>{labObservations[experiment.id]}</dd>
                </dl>
                {duplicate && (
                  <p style={{ marginTop: 14 }}>
                    <button type="button" className="rx-btn" onClick={() => load(duplicate)}>Try a duplicate tag</button>
                  </p>
                )}
              </>
            ) : lesson ? (
              <>
                <p className="rx-lead" style={{ fontSize: "1.05rem", marginTop: 8 }}>{lessonSummaries[lesson.id]}</p>
                <p className="rx-label">how it works</p>
                <p className="rx-prose" style={{ marginTop: 0 }}>{learnerExplanation(lesson.concept)}</p>
                {lesson.walkthrough?.length > 0 && (
                  <>
                    <p className="rx-label">what the script does, step by step</p>
                    <ol className="rx-steps">
                      {lesson.walkthrough.map((w, i) => (
                        <li key={w.title}><span className="mono">{i + 1}.</span> <strong>{w.title}.</strong> {w.description ? learnerExplanation(w.description) : ""}</li>
                      ))}
                    </ol>
                  </>
                )}
                {lesson.trap && <p className="rx-note"><strong>Watch for:</strong> {lesson.trap}</p>}
                <p className="rx-small">From the lesson <Link href={`/sql/lesson/${lesson.id}`} style={{ textDecoration: "underline" }}>{lesson.title}</Link> · {groups[lesson.group]}</p>
              </>
            ) : null}
            <p className="rx-label">how the lab works</p>
            <p className="rx-prose" style={{ marginTop: 0, fontSize: 15 }}>Every run starts from a fresh temporary copy of the sample database, so tables you create and rows you change are not kept between runs. Your SQL is saved in this browser. End a script with a SELECT to see what changed.</p>
          </article>
          <section className="rx-work rx-lesson-work" aria-label="Script editor">
            {pending && (
              <div className="rx-confirm" role="group" aria-label="Replace your SQL">
                <p>Replace your current SQL with this script? Your edits will be lost.</p>
                <div className="rx-confirm-acts">
                  <button type="button" className="rx-btn primary" onClick={() => { setDraft(key, pending); setPending(null); }}>Replace my SQL</button>
                  <button type="button" className="rx-btn" onClick={() => setPending(null)}>Keep my SQL</button>
                </div>
              </div>
            )}
            <TaskCell
              key={key}
              name={name}
              value={value}
              onChange={(v) => setDraft(key, v)}
              graded={false}
              minHeight="clamp(300px, calc(100dvh - 330px), 820px)"
              task={{ allowWrites: true }}
              observe={(res, ran) =>
                res.error
                  ? experiment?.id === "constraints" && /UNIQUE constraint failed/.test(res.error)
                    ? "The UNIQUE rule rejected the duplicate. Statements before it ran; the failing insert did not."
                    : "The script stopped with an error. Earlier statements ran; see where it stopped below."
                  : res.result
                    ? `The final SELECT returned ${res.total ?? res.result.values.length} row${(res.total ?? res.result.values.length) === 1 ? "" : "s"}${ran === original && experiment?.id === "transactions" ? ", after the rollback" : ""}.`
                    : "The script ran. End it with a SELECT to see the effect."
              }
            />
            <button type="button" className="rx-btn ghost" onClick={() => { setDraft(key, original); setPending(null); }}>
              Reset to the original script
            </button>
          </section>
        </div>
      </div>
    </Shell>
  );
}
