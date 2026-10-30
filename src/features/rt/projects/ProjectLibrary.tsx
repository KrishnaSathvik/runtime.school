"use client";

import Link from "next/link";
import { projectsByLevel, type ProjectLevel } from "@/content/projects";
import { sqlProjectHref } from "@/content/projects/paths";
import { useLearning } from "@/lib/learning-state";
import { Shell } from "../Shell";
import { completedStageCount, projectIsComplete, workStages } from "./evidence";

const LEVELS: { id: ProjectLevel; label: string }[] = [
  { id: "beginner", label: "Beginner" },
  { id: "intermediate", label: "Intermediate" },
  { id: "advanced", label: "Advanced" },
];

export function ProjectLibrary() {
  const drafts = useLearning((s) => s.drafts);
  return (
    <Shell path={[{ label: "sql" }, { label: "projects" }]} section="projects">
      <div className="rx-page rx-project-library">
        <h1 className="rx-title">Projects</h1>
        <p className="rx-lead">
          Answer a business question with SQL one step at a time. Each step is checked on the data.
        </p>
        {LEVELS.map(({ id, label }) => (
          <section key={id} className="rx-project-level">
            <h2 className={`rx-project-level-title ${id}`}>{label}</h2>
            <ul className="rx-project-list">
              {projectsByLevel(id).map((project) => {
                const done = completedStageCount(project, drafts);
                const complete = projectIsComplete(project, drafts);
                const started = done > 0 || Object.keys(drafts).some(k => k.startsWith(`sql-project-${project.id}-`));
                // Every project opens on its overview, as in Python and PySpark; Continue there resumes.
                const href = sqlProjectHref(project.id);
                return (
                  <li key={project.id}>
                    <Link className="rx-project-card" href={href}>
                      <span className="rx-project-card-title">{project.title}</span>
                      <span className="rx-project-card-ask">{project.brief.ask}</span>
                      <span className="rx-project-card-meta mono">{workStages(project).length} steps</span>
                      <span className="rx-project-card-cta">{complete ? "View project →" : started ? "Continue →" : "Start →"}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </Shell>
  );
}
