"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {projectOutcomes} from "@/content/ux-summaries";
import { lessons, projects } from "@/content";
import { useLearning } from "@/lib/learning-state";

export default function ProjectsPage() {
  const projectState = useLearning((s) => s.projects);

  return (
    <div className="canvas">

      <h1>Put SQL to work.</h1>
      <p className="lead">
        Use SQL to answer realistic business questions, one milestone at a time.
        Your queries and checked results are saved. Each run starts with the original sample data.
      </p>
      <div className="mt-10 border-t border-[var(--border)]">
        {projects.map((p) => {
          const rec = projectState[p.id];
          const done = p.milestoneIds.filter((id) => {
            const m = rec?.milestones[id];
            return m && m.solved?.length === 2 && (m.check || m.legacy);
          }).length;
          return (
            <Link key={p.id} href={`/projects/${p.id}`} className="index-row !grid-cols-[54px_minmax(0,1fr)_auto_auto]">
              <span className="module-id">0{p.id + 1}</span>
              <div>
                <div className="text-[15px] font-medium">{p.title}</div>
                <p className="mt-2 max-w-xl text-xs leading-relaxed text-[var(--muted)]">
                  {projectOutcomes[p.id].summary}
                </p>
                <p className="metadata mt-2">
                  {lessons[p.milestoneIds[0]].difficulty} · {projectOutcomes[p.id].skills} ·{" "}
                  {p.milestoneIds.length} milestones
                </p>
              </div>
              <span className="metadata">
                {done}/{p.milestoneIds.length}
              </span>
              <span className="btn outline">
                {done===p.milestoneIds.length ? "View project" : rec ? "Continue" : "Start"} <ArrowRight size={14} />
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
