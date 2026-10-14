"use client";

import { useState } from "react";
import { py } from "@/engine/python/values";
import { Shell } from "@/features/rt/Shell";
import { PythonWorkspace, type PyExercise } from "./Workspace";

/**
 * Two sample exercises that exercise every part of the workspace: one checked through
 * variables and printed output, one through a function with hidden test inputs.
 * Not curriculum: Milestone 4 replaces this with the first real lesson.
 */
const EXERCISES: PyExercise[] = [
  {
    id: "preview-notebooks",
    title: "Notebook order total",
    kicker: "workspace preview · exercise 1 of 2",
    prompt: (
      <p>A store sells notebooks for 12 dollars each. Store the price and the number of notebooks in variables, calculate the cost of four notebooks, and print it.</p>
    ),
    requirements: [
      <>Create <code>price</code> and <code>quantity</code>.</>,
      <>Store the cost in <code>total</code>, calculated from the other two.</>,
      <>Print <code>total</code>.</>,
    ],
    checking: [
      <><code>price</code> is the whole number <code>12</code> and <code>quantity</code> is <code>4</code>.</>,
      <><code>total</code> is <code>48</code>.</>,
      <>The program prints exactly <code>48</code>.</>,
    ],
    starter: "# Notebooks cost 12 dollars each.\nprice = \n",
    task: {
      checks: [
        { kind: "variable", name: "price", expected: py.int(12) },
        { kind: "variable", name: "quantity", expected: py.int(4) },
        { kind: "variable", name: "total", expected: py.int(48) },
        { kind: "output", expected: "48\n" },
      ],
    },
  },
  {
    id: "preview-function",
    title: "A reusable total",
    kicker: "workspace preview · exercise 2 of 2",
    prompt: (
      <p>Write a function <code>calculate_total(price, quantity)</code> that returns the cost of buying <code>quantity</code> items at <code>price</code> each. It should work for any price and quantity, not just one order.</p>
    ),
    requirements: [
      <>Define <code>calculate_total</code> with two parameters.</>,
      <>Return the result; don&apos;t just print it.</>,
    ],
    checking: [
      <><code>calculate_total(12, 4)</code> returns <code>48</code>.</>,
      <>It also returns the right total for other inputs that aren&apos;t shown.</>,
    ],
    starter: "def calculate_total(price, quantity):\n    \n",
    task: {
      checks: [
        {
          kind: "function",
          name: "calculate_total",
          label: "calculate_total() returns price × quantity",
          cases: [
            { args: [py.int(12), py.int(4)], expected: py.int(48) },
            { args: [py.int(5), py.int(3)], expected: py.int(15), hidden: true },
            { args: [py.int(7), py.int(2)], expected: py.int(14), hidden: true },
            { args: [py.int(0), py.int(9)], expected: py.int(0), hidden: true },
          ],
        },
      ],
    },
  },
];

export function WorkspacePreview() {
  const [index, setIndex] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, string>>(() => Object.fromEntries(EXERCISES.map((e) => [e.id, e.starter])));
  const exercise = EXERCISES[index];
  return (
    <Shell
      subject="python"
      section="learn"
      path={[{ label: "python", href: "/python/workspace" }, { label: "workspace-preview" }]}
      status={["Python", "workspace preview", "drafts are kept until you leave this page"]}
    >
      <div className="py-preview-bar">
        <span>Preview exercises:</span>
        {EXERCISES.map((e, i) => (
          <button key={e.id} type="button" className="rx-btn" aria-pressed={i === index} onClick={() => setIndex(i)}>
            {i + 1}. {e.title}
          </button>
        ))}
        <span className="push" />
        <span className="py-preview-note">Not saved to your progress yet.</span>
      </div>
      <PythonWorkspace
        key={exercise.id}
        exercise={exercise}
        value={drafts[exercise.id]}
        onChange={(code) => setDrafts((d) => ({ ...d, [exercise.id]: code }))}
      />
    </Shell>
  );
}
