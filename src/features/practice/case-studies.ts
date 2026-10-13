import {
  caseStudies,
  caseStudyById,
  questionsForCase,
  stageMetaFor,
  type CaseStudyMeta,
} from "@/content/question-bank/case-studies";
import type { BankQuestion } from "@/content/question-bank";
import type { LearningState, QuestionStatus } from "@/lib/learning-state";
import { questionStatus } from "@/lib/learning-state";

export { caseStudies, caseStudyById, questionsForCase, stageMetaFor };

export type CaseProgressItem = {
  q: BankQuestion;
  status: QuestionStatus;
  brief: string;
  businessWhy: string;
};

export function caseProgress(meta: CaseStudyMeta, s: Pick<LearningState, "questions" | "stats" | "attempts" | "history">) {
  const questions = questionsForCase(meta.id);
  const items: CaseProgressItem[] = questions.map((q) => {
    const stage = meta.stages.find((st) => st.questionId === q.id);
    return {
      q,
      status: questionStatus(s.questions[q.id]),
      brief: stage?.brief ?? q.title,
      businessWhy: stage?.businessWhy ?? q.objective,
    };
  });
  const solved = items.filter((x) => x.status === "solved").length;
  const next = items.find((x) => x.status !== "solved") ?? null;
  return {
    items,
    solved,
    total: items.length,
    next,
    complete: solved === items.length && items.length > 0,
  };
}

export function resumeCase(
  meta: CaseStudyMeta,
  s: Pick<LearningState, "questions" | "stats" | "attempts" | "history">,
): CaseProgressItem {
  const progress = caseProgress(meta, s);
  return progress.next ?? progress.items[0];
}

export function nextCaseStage(
  meta: CaseStudyMeta,
  currentId: string,
  s: Pick<LearningState, "questions">,
): BankQuestion | null {
  const questions = questionsForCase(meta.id);
  const i = questions.findIndex((q) => q.id === currentId);
  if (i < 0) return null;
  const after = questions.slice(i + 1);
  return after.find((q) => questionStatus(s.questions[q.id]) !== "solved") ?? after[0] ?? null;
}

export function caseHref(caseId: string) {
  return `/practice/cases/${caseId}`;
}
