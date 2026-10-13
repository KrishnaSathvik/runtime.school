import type { QuestionRecord } from "@/content/question-bank";
import { attemptKey, questionStatus, type LearningState, type QuestionStatus } from "@/lib/learning-state";

/** Status for any question: bank problems use their own progress; lesson challenges use lesson progress. */
export function statusOf(q: QuestionRecord, s: Pick<LearningState, "questions" | "stats" | "attempts" | "history">): QuestionStatus {
  if (q.sourceType === "bank") return questionStatus(s.questions[q.id]);
  const id = q.sourceLessonId!;
  const v = q.sourceVariant!;
  if (s.stats[id]?.solved.includes(v)) return "solved";
  const tried = s.history.filter((h) => h.id === id && (h.variant === undefined || h.variant === v));
  if (tried.some((h) => h.ok && h.guided)) return "guided";
  if (tried.length || s.attempts[attemptKey(id, v, null)]?.exposures.length) return "attempted";
  return "not-attempted";
}

export const STATUS_LABEL: Record<QuestionStatus, string> = {
  "not-attempted": "Not started",
  attempted: "In progress",
  guided: "With help",
  solved: "Solved without hints",
};

/** Display help exposure separately from a completed answer; stored statuses stay unchanged. */
export function statusText(status: QuestionStatus, solvedWithHelp = false): string {
  if (status === "guided") return solvedWithHelp ? "Solved with help" : "Practicing with help";
  return STATUS_LABEL[status];
}

export function questionStatusText(q: QuestionRecord, s: Pick<LearningState, "questions" | "stats" | "attempts" | "history">): string {
  const solvedWithHelp = q.sourceType === "bank"
    ? !!s.questions[q.id]?.guidedSolved
    : s.history.some(h => h.id === q.sourceLessonId && (h.variant === undefined || h.variant === q.sourceVariant) && h.ok && h.guided);
  return statusText(statusOf(q, s), solvedWithHelp);
}
