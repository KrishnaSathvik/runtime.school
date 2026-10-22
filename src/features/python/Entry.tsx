"use client";

import { useRouter } from "next/navigation";
import { useLayoutEffect, useRef } from "react";
import { pyLessonHref, pyQuestionHref, visibleLessons, visibleQuestions } from "@/content/python-v2/content";
import { Shell } from "@/features/rt/Shell";
import { isLessonMastered, usePy2, usePy2Ready } from "@/lib/python-progress-v2";

/** Where Learn and Practice open, like SQL: no overview page, straight into the work. */
export function nextLessonHref(): string {
  const s = usePy2.getState();
  const lessons = visibleLessons();
  const last = lessons.find((l) => l.id === s.last.learn);
  if (last && !isLessonMastered(s.lessons[last.id], last.challenges.map((c) => c.id))) return pyLessonHref(last.slug);
  const open = lessons.find((l) => !isLessonMastered(s.lessons[l.id], l.challenges.map((c) => c.id)));
  return pyLessonHref((open ?? last ?? lessons[0]).slug);
}

export function nextQuestionHref(): string {
  const s = usePy2.getState();
  const questions = visibleQuestions();
  const last = questions.find((q) => q.id === s.last.practice);
  if (last && !s.questions[last.id]?.solved) return pyQuestionHref(last.slug);
  const open = questions.find((q) => !s.questions[q.id]?.solved);
  return pyQuestionHref((open ?? last ?? questions[0]).slug);
}

function Redirect({ section, to }: { section: "learn" | "practice"; to: () => string }) {
  const router = useRouter();
  const ready = usePy2Ready();
  const done = useRef(false);
  useLayoutEffect(() => {
    // Once, after saved progress has loaded; later store updates must not navigate again.
    if (!ready || done.current) return;
    done.current = true;
    router.replace(to());
  }, [ready, router, to]);
  return (
    <Shell subject="python" section={section} path={[{ label: "python" }, { label: section }]}>
      <div className="rx-page" aria-busy="true" aria-label={section === "learn" ? "Opening your lesson" : "Opening your next question"} />
    </Shell>
  );
}

export const PythonLearnEntry = () => <Redirect section="learn" to={nextLessonHref} />;
export const PythonPracticeEntry = () => <Redirect section="practice" to={nextQuestionHref} />;
