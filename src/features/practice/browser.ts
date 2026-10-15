import { bankBySlug, bankQuestions } from "@/content/question-bank";
import type { LearningState } from "@/lib/learning-state";

function practiceFinished(s: Pick<LearningState, "questions">, id: string): boolean {
  const progress = s.questions[id];
  return Boolean(progress?.solved || progress?.guidedSolved);
}

/** Slug for the Practice continue link: resume, else the next question not yet solved. */
export function practiceEntrySlug(
  s: Pick<LearningState, "lastQuestion" | "questions">,
): string {
  const current = s.lastQuestion ? bankBySlug.get(s.lastQuestion) : undefined;
  if (current && !practiceFinished(s, current.id)) return current.slug;
  if (current) {
    const i = bankQuestions.findIndex((q) => q.id === current.id);
    const next = [...bankQuestions.slice(i + 1), ...bankQuestions.slice(0, i)].find(
      (q) => !practiceFinished(s, q.id),
    );
    if (next) return next.slug;
  }
  const unsolved = bankQuestions.find((q) => !practiceFinished(s, q.id));
  return (unsolved ?? bankQuestions[0]).slug;
}
