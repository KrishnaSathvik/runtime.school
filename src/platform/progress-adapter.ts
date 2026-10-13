import { lessons } from "@/content";
import {
  courseContinuation,
  dueLessons,
  mastered,
  practiceProgress,
} from "@/features/discovery/selectors";
import {
  isMastered,
  type LearningState,
} from "@/lib/learning-state";
import { lessonRef, parseLessonRef, type SubjectId } from "@/platform/subjects";

/**
 * Subject-aware progress reads without migrating sql-studio-v1.
 * Logical IDs: `sql:3`, `python:variables-and-values`.
 * SQL evidence continues to live under numeric keys in the existing store.
 */

export function isLessonRefMastered(state: LearningState, ref: string): boolean {
  const parsed = parseLessonRef(ref);
  if (!parsed) return false;
  if (parsed.subjectId === "sql") {
    const id = Number(parsed.lessonId);
    if (!Number.isInteger(id) || !lessons[id]) return false;
    return mastered(state, id);
  }
  // Future subjects: namespaced slices will land here without rewriting SQL storage.
  return false;
}

export function sqlMasteryCount(state: LearningState): { mastered: number; total: number } {
  return {
    mastered: lessons.filter((l) => mastered(state, l.id)).length,
    total: lessons.length,
  };
}

export function sqlPracticeCount(state: LearningState): { solved: number; total: number } {
  return practiceProgress(state);
}

export function sqlDueReviewCount(state: LearningState, now = Date.now()): number {
  return dueLessons(state, now).length;
}

export function sqlHasStarted(state: LearningState): boolean {
  return (
    Object.keys(state.stats).some((id) => {
      const s = state.stats[id];
      return !!s && (s.attempts > 0 || s.solved.length > 0 || s.quizAttempts > 0 || isMastered(s));
    }) ||
    Object.keys(state.sessions).length > 0 ||
    !!state.active ||
    Object.keys(state.questions).length > 0 ||
    Object.keys(state.projects).length > 0
  );
}

export type ContinueCard = {
  subjectId: SubjectId;
  subjectTitle: string;
  title: string;
  href: string;
  reason: string;
  lessonRef: string;
};

export function continueLearningCard(state: LearningState): ContinueCard | null {
  const activity = courseContinuation(state);
  if (!activity) return null;
  const lesson = lessons[activity.id];
  if (!lesson) return null;
  const stageLabel =
    activity.stage === "practice"
      ? `Practice · Challenge ${activity.variant + 1} of 2`
      : activity.stage === "review"
        ? "Concept check"
        : "Understand the concept";
  return {
    subjectId: "sql",
    subjectTitle: "SQL",
    title: lesson.title,
    href: activity.href,
    reason: activity.returning ? stageLabel : "Start your SQL learning path",
    lessonRef: lessonRef("sql", activity.id),
  };
}

export function subjectProgressSummary(state: LearningState, subjectId: SubjectId) {
  if (subjectId === "sql") {
    const mastery = sqlMasteryCount(state);
    const practice = sqlPracticeCount(state);
    const due = sqlDueReviewCount(state);
    const cont = continueLearningCard(state);
    return {
      subjectId,
      started: sqlHasStarted(state),
      mastery,
      practice,
      dueReviews: due,
      continue: cont,
    };
  }
  return {
    subjectId,
    started: false,
    mastery: { mastered: 0, total: 0 },
    practice: { solved: 0, total: 0 },
    dueReviews: 0,
    continue: null as ContinueCard | null,
  };
}
