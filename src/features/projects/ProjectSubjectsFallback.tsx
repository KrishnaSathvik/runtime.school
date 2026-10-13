"use client";

import Link from "next/link";
import { projects } from "@/content";
import { useHydrated, useLearning } from "@/lib/learning-state";
import { subjects } from "@/platform/subjects";

/** Shown only when more than one subject has a projects hub. */
export function ProjectSubjectsFallback() {
  const projectState = useLearning((s) => s.projects);
  const ready = useHydrated();

  const sqlDone = ready
    ? projects.filter((p) => {
        const rec = projectState[p.id];
        if (!rec) return false;
        return p.milestoneIds.every((id) => {
          const m = rec.milestones[id];
          return m && m.solved?.length === 2 && (m.check || m.legacy);
        });
      }).length
    : 0;
  const sqlStarted = ready ? projects.filter((p) => projectState[p.id]).length : 0;

  return (
    <div className="canvas">
      <h1>Projects</h1>
      <p className="lead">
        Build evidence-backed work in the subjects you are learning. Completion stays subject-specific.
      </p>

      <h2 className="pt-10">Subjects</h2>
      <div className="learning-path mt-6 border-t border-[var(--border)]">
        {subjects.map((subject, i) => {
          const available = subject.availability === "available" && subject.projectsHref;
          const status = !ready
            ? ""
            : sqlDone === projects.length
              ? "Complete"
              : sqlStarted > 0
                ? "In progress"
                : "Not started";
          const body = (
            <>
              <span className="module-id">{String(i + 1).padStart(2, "0")}</span>
              <div className="min-w-0">
                <div className="text-[15px] font-medium leading-snug">{subject.title} Projects</div>
                <div className="mt-1.5 max-w-xl text-xs leading-relaxed text-[var(--muted)]">
                  {available ? subject.summary : "Project work ships with this subject."}
                </div>
              </div>
              <div className="index-aside">
                <span className="metadata">
                  {available
                    ? `${projects.length} projects${ready ? ` · ${status}` : ""}`
                    : subject.availabilityLabel}
                </span>
                <span className="index-progress">
                  {available && ready ? `${sqlDone}/${projects.length}` : "—"}
                </span>
              </div>
            </>
          );

          if (!available) {
            return (
              <div key={subject.id} className="index-row" aria-disabled="true">
                {body}
              </div>
            );
          }
          return (
            <Link key={subject.id} href={subject.projectsHref!} className="index-row">
              {body}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
