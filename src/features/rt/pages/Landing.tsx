"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ArrowRight } from "lucide-react";
import { lessons } from "@/content";
import { learnEntry } from "@/features/discovery/selectors";
import { useHydrated, useLearning } from "@/lib/learning-state";
import { subjects } from "@/platform/subjects";
import { NotifyInterest } from "../NotifyInterest";
import { Shell } from "../Shell";

/** Landing: one question and the subjects, all as equal cards. SQL is available; the rest are planned. */
export function Landing() {
  const router = useRouter();
  const ready = useHydrated();
  const state = useLearning();
  const entry = learnEntry(state);
  const returning = ready && !!entry?.returning;
  const startHref = returning && entry ? `/sql/lesson/${entry.id}` : "/sql";
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
          <p className="rx-prompt-line"><b>runtime</b> learn --subject <span className="rx-home-caret" aria-hidden="true" /></p>
          <h1 className="rx-home-title">What do you want to learn?</h1>
          <p className="rx-home-lead">Pick a subject and start straight away. Lessons, practice and projects run real code on real data, right in your browser.</p>
        </header>

        <ul className="rx-home-grid" aria-label="Subjects">
          {subjects.map((s) => {
            const Icon = s.icon;
            const available = s.availability === "available";
            return (
              <li key={s.id} className={`rx-subject ${available ? "on" : "off"}`}>
                {available && <Link href={startHref} className="rx-home-cover" aria-label={`${startLabel}: ${s.title}`} />}
                <div className="rx-subject-top">
                  <span className="rx-subject-icon" aria-hidden="true"><Icon size={18} strokeWidth={1.75} /></span>
                  <span className={`rx-tag ${available ? "ok" : s.availability === "next" ? "amber" : ""}`}>
                    {available ? "available" : s.availabilityLabel.toLowerCase()}
                  </span>
                </div>
                <h2>{s.title}</h2>
                <p className="rx-subject-family">{s.family}</p>
                <p className="rx-subject-sum">{s.summary}</p>
                <div className="rx-subject-foot">
                  {available ? (
                    <>
                      <span className="rx-subject-go">{startLabel} <ArrowRight size={14} aria-hidden="true" /></span>
                      {returning && entry && <span className="rx-subject-note mono">next · {lessons[entry.id]?.title}</span>}
                    </>
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
