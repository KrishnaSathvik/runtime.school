import type { PyQuestion } from "./types";
import { py01 } from "./py01";
import { py02 } from "./py02";
import { py03 } from "./py03";
import { py04 } from "./py04";

/** Every independent practice question, in module order. */
export const pythonQuestions: PyQuestion[] = [...py01, ...py02, ...py03, ...py04];

export function getPythonQuestion(slug: string): PyQuestion | undefined {
  return pythonQuestions.find((q) => q.slug === slug);
}

export function getPythonQuestionByRef(ref: string): PyQuestion | undefined {
  return pythonQuestions.find((q) => q.ref === ref);
}

export const pythonQuestionHref = (slug: string) => `/python/practice/${slug}`;

export type { PyCodeQuestion, PyDifficulty, PyPredictQuestion, PyQuestion, PyTrack } from "./types";
