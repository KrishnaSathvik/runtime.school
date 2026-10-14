import type { PyLesson, PyModule, PyModuleId } from "./types";
import { foundations } from "./lessons/foundations";
import { strings } from "./lessons/strings";
import { conditions } from "./lessons/conditions";
import { loops } from "./lessons/loops";
import { collections } from "./lessons/collections";
import { functions } from "./lessons/functions";
import { debugging } from "./lessons/debugging";
import { files } from "./lessons/files";
import { patterns } from "./lessons/patterns";
import { numpy } from "./lessons/numpy";
import { pandas } from "./lessons/pandas";
import { pipelines } from "./lessons/pipelines";

/**
 * Lesson identities that must never be reused. `names-reassignment-and-augmented-assignment` was planned as
 * Foundations lesson 5 and dropped: Lesson 1 already teaches reassignment and naming, and augmented assignment
 * is taught in Numbers and arithmetic (docs/python/curriculum-decisions.md).
 */
export const RESERVED_PYTHON_REFS = ["python:names-reassignment-and-augmented-assignment"] as const;

const MODULES: { id: PyModuleId; title: string; summary: string; lessons: PyLesson[] }[] = [
  { id: "foundations", title: "Python Foundations", summary: "Start here: values, variables, arithmetic, types and your first complete program.", lessons: foundations },
  { id: "strings", title: "Strings and Text", summary: "Build, slice, clean, split and format text.", lessons: strings },
  { id: "conditions", title: "Conditions and Logic", summary: "Make decisions with comparisons, if, elif and else, and boolean logic.", lessons: conditions },
  { id: "loops", title: "Loops and Iteration", summary: "Repeat work with for and while loops, and keep counts and running totals.", lessons: loops },
  { id: "collections", title: "Collections and Records", summary: "Store and transform data in lists, tuples, sets and dictionaries.", lessons: collections },
  { id: "functions", title: "Functions and Modules", summary: "Package logic into reusable functions with clear contracts, and use modules.", lessons: functions },
  { id: "debugging", title: "Debugging and Testing", summary: "Read tracebacks, handle and raise exceptions, and test edge cases.", lessons: debugging },
  { id: "files", title: "Files and Structured Data", summary: "Read and write text, CSV and JSON files; work with dates and text patterns.", lessons: files },
  { id: "patterns", title: "Practical Python Patterns", summary: "Classes, dataclasses, generators, context managers and logging.", lessons: patterns },
  { id: "numpy", title: "NumPy Fundamentals", summary: "Numeric arrays: shapes, vectorized arithmetic, masks, aggregation and NaNs.", lessons: numpy },
  { id: "pandas", title: "pandas for Data Work", summary: "Load, clean, group, join and explore tabular data with DataFrames.", lessons: pandas },
  { id: "pipelines", title: "Reliable Data Pipelines", summary: "Contracts, validation, idempotent processing and reproducible outputs.", lessons: pipelines },
];

/** Only lessons that genuinely exist are listed, in course order. */
export const pythonLessons: PyLesson[] = MODULES.flatMap((m) => m.lessons);

export const pythonModules: PyModule[] = MODULES.filter((m) => m.lessons.length > 0).map((m, i) => ({
  id: m.id,
  number: i + 1,
  title: m.title,
  summary: m.summary,
  lessons: m.lessons.map((l) => l.slug),
}));

export const pythonLessonOrder = pythonModules.flatMap((m) => m.lessons);

export function getPythonLesson(slug: string): PyLesson | undefined {
  return pythonLessons.find((l) => l.slug === slug);
}

export function getPythonLessonByRef(ref: string): PyLesson | undefined {
  return pythonLessons.find((l) => l.ref === ref);
}

export const pythonModuleOf = (lesson: PyLesson) => pythonModules.find((m) => m.id === lesson.module)!;

export const pythonLessonHref = (slug: string) => `/python/lesson/${slug}`;

export type { PyChallenge, PyGraded, PyLesson, PyModule, PyModuleId, PyQuizQuestion } from "./types";
