"use client";

import type { ReactNode } from "react";
import type { PyGradeReport, PyTask } from "@/engine/python/grading";
import { CodePane } from "./CodePane";
import { Split } from "./Split";

export type PyExercise = {
  id: string;
  title: string;
  /** Short context line above the title, e.g. "foundations · practice". */
  kicker?: string;
  prompt: ReactNode;
  requirements: ReactNode[];
  /** Plain-language list of what Check Answer verifies. */
  checking: ReactNode[];
  starter: string;
  task: PyTask;
};

/**
 * The standalone Python workspace: task on the left; main.py with Run/Check/Stop/Reset and the
 * Console and Checks on the right.
 */
export function PythonWorkspace({
  exercise,
  value,
  onChange,
  onGraded,
  footer,
}: {
  exercise: PyExercise;
  value: string;
  onChange: (code: string) => void;
  /** Called after every finished Check. Only report.ok means the exercise was met. */
  onGraded?: (report: PyGradeReport) => void;
  /** Extra controls under the task. */
  footer?: ReactNode;
}) {
  return (
    <div className="py-ws">
      <Split
        direction="columns"
        storageKey="runtime-python-split-task"
        label="Resize task and code"
        initial={0.38}
        min={0.24}
        max={0.6}
        className="py-ws-split"
        first={
          <section className="py-task" aria-labelledby="py-task-title">
            {exercise.kicker && <p className="rx-prompt-line"><b>python</b> {exercise.kicker}</p>}
            <h1 id="py-task-title" className="py-task-title">{exercise.title}</h1>
            <p className="rx-label sec">your task</p>
            <div className="py-prompt">{exercise.prompt}</div>
            <p className="rx-label sec">requirements</p>
            <ul className="py-list">{exercise.requirements.map((r, i) => <li key={i}>{r}</li>)}</ul>
            <p className="rx-label sec">what check answer verifies</p>
            <ul className="py-list">{exercise.checking.map((r, i) => <li key={i}>{r}</li>)}</ul>
            {footer}
          </section>
        }
        second={
          <section className="py-work" aria-label="Your code">
            <CodePane task={exercise.task} starter={exercise.starter} value={value} onChange={onChange} onGraded={onGraded} />
          </section>
        }
      />
    </div>
  );
}
