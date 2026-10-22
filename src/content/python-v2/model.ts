/**
 * Authored Python content (plan §4–§6). Every item carries its registry ID (registry.json) and everything its
 * quality gate needs (plan §9): reference answers, deliberately wrong answers with the check each must fail,
 * and the exact output every example claims. tests/python-v2-content.test.ts runs all of it in real Pyodide.
 */
import type { PyPackage } from "@/engine/python/client";
import type { PyTask } from "@/engine/python/grading";
import type { PyConceptId } from "./concepts";
import type { PyLessonId, PyMilestoneId, PyProjectId, PyQuestionFormat, PyDifficulty, PyQuestionId } from "./types";

/** Prose: plain text with `code` and **bold**, paragraphs separated by blank lines. */
export type Md = string;

/** A program that must fail, and the check IDs it must fail on (and no others). */
export type PyWrong = { code: string; fails: string[]; why: string };

export type PyLessonBlock =
  | { kind: "text"; md: Md }
  /**
   * A runnable example. `output` is what it prints; the gate runs it and requires exactly this.
   * `preview` marks a glimpse of syntax taught later (e.g. an `if` block in the indentation lesson):
   * the prerequisite linter allows it there, never in exercises.
   */
  | { kind: "example"; title: string; code: string; output: string; note?: Md; stdin?: string; preview?: boolean }
  /** A program that stops with an error on purpose. The gate requires this exception type. */
  | { kind: "error-example"; title: string; code: string; error: string; output: string; note?: Md };

export type PyExercise = {
  id: string;
  title: string;
  prompt: Md;
  /** Rows of the "what to write" table: label, text. */
  spec: [string, Md][];
  starter: string;
  /** The reference answer. Must pass every check. */
  answer: string;
  /** Other correct programs that must also pass. */
  alternatives?: string[];
  wrong: PyWrong[];
  hints: [Md, Md, Md];
  task: PyTask;
};

/** A concept-check question. When `program` is given, the gate runs it and the correct choice must be its output. */
export type PyConceptQuestion = {
  id: string;
  prompt: Md;
  program?: string;
  choices: string[];
  answer: number;
  why: Md;
};

export type PyLesson = {
  id: PyLessonId;
  /** Content version (default 1). Bump with versions.ts when the assessment changes meaning; old progress is retired. */
  version?: number;
  slug: string;
  title: string;
  lede: string;
  /** The one idea this lesson exists to teach. Pieces of that idea are listed in `teaches`. */
  focus: string;
  minutes: number;
  objectives: Md[];
  /** Concepts a learner needs from earlier lessons. */
  requires: PyConceptId[];
  /** Concepts this lesson introduces. */
  teaches: PyConceptId[];
  blocks: PyLessonBlock[];
  /** Libraries every example, concept check, and exercise in this lesson may import. */
  packages?: readonly PyPackage[];
  /** Guided practice right after the concept: hints are free, credit isn't recorded. */
  tryIt: PyExercise;
  challenges: [PyExercise, PyExercise];
  concept: PyConceptQuestion[];
  review: Md[];
};

/** What a question's public tests look like to the learner; hidden tests appear only as kinds and a count. */
export type PyQuestion = {
  id: PyQuestionId;
  /** Content version (default 1). Bump with versions.ts when the question changes meaning; old progress is retired. */
  version?: number;
  slug: string;
  title: string;
  format: PyQuestionFormat;
  difficulty: PyDifficulty;
  minutes: number;
  /** Concepts the program uses. Each one must already be taught by the question's unlock lesson. */
  requires: PyConceptId[];
  prompt: Md;
  spec: [string, Md][];
  /** Kinds of hidden test, e.g. "an empty list". Never their inputs or expected values. */
  hiddenKinds: string[];
  hints: [Md, Md, Md];
  explanation: Md;
  /** Libraries the prediction program or the exercise may import. */
  packages?: readonly PyPackage[];
  /** Code formats: graded by the task's checks. */
  code?: { starter: string; answer: string; alternatives?: string[]; wrong: PyWrong[]; task: PyTask };
  /** output_prediction: the learner types what `program` prints. The gate checks `output` against real Python. */
  predict?: { program: string; output: string; stdin?: string; wrongPredictions: string[] };
};

export type PyMilestone = {
  id: PyMilestoneId;
  title: string;
  brief: Md;
  doneWhen: Md[];
  /** Starting contents of each editable file at this milestone (later milestones start from the learner's own code). */
  starters: Record<string, string>;
  /** Reference contents of every editable file once the milestone is done. */
  solution: Record<string, string>;
  /** Every check of this milestone and all earlier ones. The program run is `main.py`. */
  task: PyTask;
  wrong: { files: Record<string, string>; fails: string[]; why: string }[];
  hints: [Md, Md, Md];
};

export type PyProject = {
  id: PyProjectId;
  slug: string;
  title: string;
  story: Md;
  /** Editable files, in tab order. `main.py` is the program that runs. */
  files: string[];
  /** Read-only helper files given to the learner (shown as tabs, placed next to main.py). */
  provided: Record<string, string>;
  /** Dataset edition the project reads, mounted under data/. */
  dataset: string;
  dataFiles: string[];
  milestones: PyMilestone[];
};
