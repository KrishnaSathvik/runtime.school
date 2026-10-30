"use client";

import { useMemo } from "react";
import { PaletteDialog, PYSPARK_TOOLS, type Item } from "@/features/rt/Shell";
import { authoredQuestions, psLessonHref, psLessons, psProjectHref, psProjects, psQuestionHref } from "@/content/pyspark/content";

/** ⌘K for PySpark: sections, tools that work, written questions, then every lesson and project (marked when planned). */
export function PySparkPalette({ onClose }: { onClose: () => void }) {
  const items = useMemo<Item[]>(() => [
    { label: "Learn: the course", href: "/pyspark", kind: "go" },
    { label: "Practice: next question", href: "/pyspark/practice", kind: "go" },
    { label: "Projects", href: "/pyspark/projects", kind: "go" },
    ...PYSPARK_TOOLS.filter((t) => !t.unavailable).map((t) => ({ label: t.label, href: t.href, kind: "tool" })),
    { label: "Choose a subject", href: "/", kind: "go" },
    ...authoredQuestions().map((q) => ({ label: q.title, href: psQuestionHref(q.slug), kind: "practice" })),
    ...psLessons.map((l) => ({ label: `${String(l.number).padStart(2, "0")} ${l.title}`, href: psLessonHref(l.slug), kind: l.shown === "planned" ? "planned" : "lesson" })),
    ...psProjects.map((p) => ({ label: p.title, href: psProjectHref(p.slug), kind: p.shown === "planned" ? "planned" : "project" })),
  ], []);
  return <PaletteDialog all={items} onClose={onClose} />;
}
