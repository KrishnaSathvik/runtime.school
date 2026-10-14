import type { PyPackage } from "@/engine/python/client";
import type { PyGraded, PyModuleId } from "../types";

/**
 * Independent practice. Each question has one canonical identity (`ref`), used by every track and case that
 * lists it, so solving it once counts once.
 */

export type PyDifficulty = "easy" | "medium" | "hard";

type QuestionBase = {
  /** Stable progress identity, e.g. "python:bank:py01-01". Never changes. */
  ref: string;
  /** URL segment, e.g. "py01-01". */
  slug: string;
  module: PyModuleId;
  difficulty: PyDifficulty;
  title: string;
  topics: string[];
  minutes: number;
  /** The last lesson this question relies on: everything it needs is taught up to there. */
  after: string;
  packages?: readonly PyPackage[];
  /** Files placed next to main.py for every run and check. */
  files?: Record<string, string>;
};

/** Write a program or function, or repair a broken one, graded by the real grader. */
export type PyCodeQuestion = QuestionBase & PyGraded & { kind: "write" | "debug" };

/** Read a program and type exactly what it prints. Graded by comparing with the program's real output. */
export type PyPredictQuestion = QuestionBase & {
  kind: "predict";
  prompt: string;
  code: string;
  /** What the program really prints (verified against Pyodide by tests/python-practice.test.ts). */
  output: string;
  /** Why it prints that, shown after a correct answer or on request. */
  explanation: string;
  hints: string[];
  /** Plausible wrong predictions: each must differ from the real output. Verified, never shown. */
  wrong?: string[];
};

export type PyQuestion = PyCodeQuestion | PyPredictQuestion;

export type PyTrack = {
  id: string;
  slug: string;
  title: string;
  audience: string;
  goal: string;
  summary: string;
  /** Canonical question refs, in the order the track recommends. */
  questions: string[];
};
