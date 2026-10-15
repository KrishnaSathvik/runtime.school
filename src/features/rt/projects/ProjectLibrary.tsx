"use client";

import Link from "next/link";
import { projects, projectsByLevel, type ProjectLevel } from "@/content/projects";
import { sqlProjectHref } from "@/content/projects/paths";
import { datasetName } from "@/content/tools/datasets";
import { useLearning } from "@/lib/learning-state";
import { Shell } from "../Shell";
import { completedStageCount, draftPrefix, stageIsComplete } from "./evidence";

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
          Investigate a business problem with SQL, save your findings, and deliver a report.
        </p>
        {LEVELS.map(({ id, label }) => (
          <section key={id} className="rx-project-level">
            <h2 className="rx-project-level-title">{label}</h2>
            <ul className="rx-project-list">
              {projectsByLevel(id).map((project) => {
                const done = completedStageCount(project, drafts);
                const complete = done === project.stages.length;
                const started = done > 0 || Object.keys(drafts).some(k => k.startsWith(`sql-project-${project.id}-`));
                const next = Math.max(0, project.stages.findIndex(s => !stageIsComplete(s, drafts, draftPrefix(project, s.id), project)));
                return (
                  <li key={project.id}>
                    <Link className="rx-project-card" href={sqlProjectHref(project.id)}>
                      <span className="rx-project-card-title">{project.title}</span>
                      <span className="rx-project-card-meta">
                        {label} · {datasetName(project.datasetId)}
                        
                      </span>
                      <span className="rx-project-card-ask">{complete ? "Completed" : started ? `Stage ${next + 1} of ${project.stages.length} · ${project.stages[next].title}` : project.brief.ask}</span>
                      <span className="rx-project-card-cta">{complete ? "View project →" : started ? "Continue →" : "Start →"}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
        <p className="rx-small">{projects.length} projects across all twelve Runtime datasets.</p>
      </div>
    </Shell>
  );
}
