"use client";

import { pyLessonHref, pyProjectHref, pyQuestionHref, visibleLessons, visibleProjects, visibleQuestions } from "@/content/python-v2/content";
import { PaletteDialog, PYTHON_NAV, PYTHON_TOOLS, type Item } from "./Shell";

/** Search on Python pages: Python destinations that exist, plus the way back to other subjects. No SQL tools. */
export function PythonPalette({ onClose }: { onClose: () => void }) {
  const all: Item[] = [
    ...PYTHON_NAV.map((n) => ({ label: `Python · ${n.label}`, href: n.href, kind: "go" })),
    ...PYTHON_TOOLS.map((t) => ({ label: t.label, href: t.href, kind: "tool" })),
    ...visibleLessons().map((l) => ({ label: `${String(l.number).padStart(3, "0")} ${l.title}`, href: pyLessonHref(l.slug), kind: "lesson" })),
    ...visibleQuestions().map((q) => ({ label: q.title, href: pyQuestionHref(q.slug), kind: "practice" })),
    ...visibleProjects().map((p) => ({ label: p.title, href: pyProjectHref(p.slug), kind: "project" })),
    { label: "Choose a subject", href: "/", kind: "go" },
    { label: "SQL course", href: "/sql", kind: "subject" },
  ];
  return <PaletteDialog all={all} onClose={onClose} />;
}

