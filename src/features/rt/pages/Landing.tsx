"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ArrowRight } from "lucide-react";
import { learnEntry } from "@/features/discovery/selectors";
import { useHydrated, useLearning } from "@/lib/learning-state";
import { BRAND_TAGLINE } from "@/platform/brand";
import { subjects } from "@/platform/subjects";
import { sqlLessonHref } from "@/platform/sql-lesson-href";
import { PS_HOME } from "@/content/pyspark/paths";
import { NotifyInterest } from "../NotifyInterest";
import { Shell } from "../Shell";

/** Pictorial mark for each subject. */
const subjectMarks: Partial<Record<(typeof subjects)[number]["id"], string>> = {
  sql: "/subjects/sql.svg",
  python: "/subjects/python.webp",
  pyspark: "/subjects/pyspark.webp",
  "power-bi": "/subjects/power-bi.webp",
  ml: "/subjects/machine-learning.webp",
  "ai-engineering": "/subjects/ai.svg",
};

/** Python is offered only where its existing runtime gate permits execution; PySpark only behind NEXT_PUBLIC_PYSPARK. */
export function Landing({ pythonAvailable = false, pysparkAvailable = false }: { pythonAvailable?: boolean; pysparkAvailable?: boolean }) {
  const router = useRouter();
  const ready = useHydrated();
  const state = useLearning();
  const entry = learnEntry(state);
  const returning = ready && !!entry?.returning;
  const startHref = returning && entry ? sqlLessonHref(entry.id) : "/sql";
  const startLabel = returning ? "Continue SQL" : "Start SQL";

  // Enter starts (or continues) SQL from anywhere on the page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || (e.target as HTMLElement).closest("input, textarea, button, a, select")) return;
      router.push(startHref);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, startHref]);

  return (
    <Shell path={[{ label: "subjects" }]} bare>
      <div className="rx-home">
        <header className="rx-home-head">
          <h1 className="rx-home-brand">{BRAND_TAGLINE}</h1>
          <p className="rx-home-stand">Learn to code. Understand how it works.</p>
          <p className="rx-home-lead">Interactive lessons, real coding challenges, practical projects, and developer tools. Learn by actually doing.</p>
          <h2 className="rx-home-title">What do you want to learn?</h2>
        </header>

        <ul className="rx-home-grid" aria-label="Subjects">
          {subjects.map((s) => {
            const Icon = s.icon;
            const mark = subjectMarks[s.id];
            const available = s.availability === "available" || (s.id === "python" && pythonAvailable) || (s.id === "pyspark" && pysparkAvailable);
            const subjectHref = s.id === "python" ? "/python" : s.id === "pyspark" ? PS_HOME : startHref;
            const subjectLabel = s.id === "python" ? "Start Python" : s.id === "pyspark" ? "Start PySpark" : startLabel;
            return (
              <li key={s.id} className={`rx-subject ${available ? "on" : "off"}`}>
                {available && <Link href={subjectHref} className="rx-home-cover" aria-label={`${subjectLabel}: ${s.title}`} />}
                <div className="rx-subject-top">
                  {mark ? (
                    <img className="rx-subject-mark" src={mark} alt="" />
                  ) : (
                    <span className="rx-subject-icon" aria-hidden="true"><Icon size={18} strokeWidth={1.75} /></span>
                  )}
                  <span className={`rx-tag ${available ? "ok" : s.availability === "next" ? "amber" : ""}`}>
                    {available ? "available" : s.availabilityLabel.toLowerCase()}
                  </span>
                </div>
                <h2>{s.title}</h2>
                <p className="rx-subject-family">{s.family}</p>
                <p className="rx-subject-sum">{s.summary}</p>
                <div className="rx-subject-foot">
                  {available ? (
                    <span className="rx-subject-go">{subjectLabel} <ArrowRight size={14} aria-hidden="true" /></span>
                  ) : (
                    <NotifyInterest subjectId={s.id} subjectTitle={s.title} />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </Shell>
  );
}
