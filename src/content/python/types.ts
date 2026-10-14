import type { PyPackage } from "@/engine/python/client";
import type { PyTask } from "@/engine/python/grading";

/**
 * Python lesson content. Prose strings may use `code` and **bold**; everything else is plain text.
 * Runnable code is executed for real in the browser; no output is written into the content.
 */

export type PyBlock =
  | { kind: "p"; text: string }
  /** Code shown for reading only. */
  | { kind: "code"; code: string };

export type PySection = { label: string; blocks: PyBlock[] };

export type PyRunnable = { title: string; text: string; code: string };

export type PyMistake = PyRunnable & { fix: string };

export type PyChallenge = {
  id: "challenge-1" | "challenge-2";
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
};

export type PyQuizOption = { text: string; correct?: boolean; why: string };
export type PyQuizQuestion = { id: string; prompt: string; code?: string; options: PyQuizOption[] };

export type PyLesson = {
  slug: string;
  /** Stable progress identity, e.g. "python:variables-and-values". */
  ref: string;
  module: string;
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
};

export type PyModule = { id: string; number: number; title: string; summary: string; lessons: string[] };
