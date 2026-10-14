import type { PyPackage } from "@/engine/python/client";
import type { PyTask } from "@/engine/python/grading";

/**
 * Python lesson content. Prose strings may use `code` and **bold**; everything else is plain text.
 * Runnable code is executed for real in the browser; no output is written into the content.
 * Fields marked "verified, never shown" exist for tests/python-inventory: they prove that other correct
 * programs pass and realistic mistakes fail for the intended reason.
 */

export type PyBlock =
  | { kind: "p"; text: string }
  /** Code shown for reading only. */
  | { kind: "code"; code: string };

export type PySection = { label: string; blocks: PyBlock[] };

export type PyRunnable = { title: string; text: string; code: string };

export type PyMistake = PyRunnable & {
  fix: string;
  /** The exception this code really raises ("NameError", "SyntaxError", …). Omit when it runs but gives a wrong result. */
  raises?: string;
};

/** A realistic wrong program and the check ids it must fail on ("program": it doesn't run to the end). Verified, never shown. */
export type PyWrong = { code: string; fails: string[] | "program"; why?: string };

/** Something the learner writes and Check answer grades: a lesson challenge, a practice question, a case stage, a project milestone. */
export type PyGraded = {
  title: string;
  /** What to build, in the learner's terms. */
  prompt: string;
  /** Exact stdout the program must produce, shown as a block when the layout of the output is the point. */
  expectedOutput?: string;
  /** What Check answer looks for: the requirements, stated once. */
  looksFor: string[];
  starter: string;
  task: PyTask;
  hints: string[];
  /** One correct answer, revealed only on request. */
  answer: string;
  /** Other correct programs that must also pass. Verified, never shown. */
  alternatives?: string[];
  wrong?: PyWrong[];
};

export type PyChallenge = PyGraded & { id: "challenge-1" | "challenge-2" };

export type PyQuizOption = { text: string; correct?: boolean; why: string };
export type PyQuizQuestion = { id: string; prompt: string; code?: string; options: PyQuizOption[] };

export type PyModuleId =
  | "foundations"
  | "strings"
  | "conditions"
  | "loops"
  | "collections"
  | "functions"
  | "debugging"
  | "files"
  | "patterns"
  | "numpy"
  | "pandas"
  | "pipelines";

export type PyLesson = {
  slug: string;
  /** Stable progress identity, e.g. "python:variables-and-values". Never changes once published. */
  ref: string;
  module: PyModuleId;
  /** Position within its module, from 1. */
  number: number;
  title: string;
  level: string;
  summary: string;
  sections: PySection[];
  example: { code: string; caption: string };
  walkthrough: PyRunnable[];
  mistakes: PyMistake[];
  challenges: [PyChallenge, PyChallenge];
  quiz: PyQuizQuestion[];
  /** What the learner can do after mastering the lesson. */
  outcomes: string[];
  /** Libraries every runnable block and challenge in this lesson may import. Omit for core Python. */
  packages?: PyPackage[];
  /** Files placed next to every example and challenge in this lesson (CSV, JSON, helper modules). */
  files?: Record<string, string>;
};

export type PyModule = { id: PyModuleId; number: number; title: string; summary: string; lessons: string[] };
