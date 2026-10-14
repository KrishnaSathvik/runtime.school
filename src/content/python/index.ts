import type { PyLesson, PyModule } from "./types";
import { printCommentsAndExecutionOrder } from "./print-comments-and-execution-order";
import { variablesAndValues } from "./variables-and-values";

/** Only lessons that genuinely exist are listed. */
export const pythonLessons: PyLesson[] = [variablesAndValues, printCommentsAndExecutionOrder];

export const pythonModules: PyModule[] = [
  {
    id: "foundations",
    number: 1,
    title: "Python Foundations",
    summary: "Start here: values, variables and your first programs.",
    lessons: pythonLessons.filter((l) => l.module === "foundations").map((l) => l.slug),
  },
];

export const pythonLessonOrder = pythonModules.flatMap((m) => m.lessons);

export function getPythonLesson(slug: string): PyLesson | undefined {
  return pythonLessons.find((l) => l.slug === slug);
}

export const pythonLessonHref = (slug: string) => `/python/lesson/${slug}`;

export type { PyChallenge, PyLesson, PyModule, PyQuizQuestion } from "./types";
