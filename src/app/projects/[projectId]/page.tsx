"use client";

import Link from "next/link";
import {TableInspector} from "@/components/editor/TableInspector";
import {projectOutcomes,lessonSummaries} from "@/content/ux-summaries";
import { useParams } from "next/navigation";
import { ArrowRight, Download } from "lucide-react";
import {
  datasetCatalog,
  getProject,
  lessons,
  warehouseMap,
} from "@/content";
import { milestoneDone, useHydrated, useLearning } from "@/lib/learning-state";
import { projectReport } from "@/features/projects/deliverables";
import { projectPhases } from "@/content/project-phases";

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = Number(params.projectId);
  const project = getProject(projectId);
  const rec = useLearning((s) => s.projects[projectId]);
  const hydrated = useHydrated();

  if (!project) {
    return (
      <div className="canvas">
        <h1>Project not found</h1>
        <Link href="/projects" className="btn mt-4">
          Back to Projects
        </Link>
      </div>
    );
  }

  const ds = datasetCatalog[project.dataset];
  const done = project.milestoneIds.filter((id) => milestoneDone(rec?.milestones[id])).length;
  const allDone = done === project.milestoneIds.length;
  const next =
    project.milestoneIds.find((id) => !milestoneDone(rec?.milestones[id])) ??
    project.milestoneIds[0];
  const savedQueries = project.milestoneIds.reduce(
    (n, id) => n + Object.keys(rec?.milestones[id]?.queries ?? {}).length,
    0,
  );
  const savedNotes = project.milestoneIds.filter((id) => rec?.milestones[id]?.notes?.trim()).length;
  const hasDeliverables = savedQueries + savedNotes > 0;

  const exportReport = () => {
    const blob = new Blob([projectReport(project, rec)], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-summary.md`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="canvas">
      <div className="metadata">
        <Link href="/projects" className="text-[var(--accent)]">
          Projects
        </Link>{" "}
        / {project.title}
      </div>
      <h1>{projectOutcomes[projectId].objective}</h1>
      <p className="lead">{projectOutcomes[projectId].summary}</p>

      <section className="mt-8 border-y border-[var(--border)] py-6">
        <h2>What you’ll build</h2>
        <p className="mt-3 text-sm text-[var(--text-secondary)]">{projectOutcomes[projectId].build}</p>
        <p className="metadata mt-3">{project.milestoneIds.length} milestones · {lessons[project.milestoneIds[0]].difficulty} · {ds?.tables.length} sample tables</p>
        <section className="mt-5" aria-label="Project data"><h3 className="text-base font-semibold">Explore the project data</h3><p className="metadata mt-3">{ds?.description}</p><TableInspector tables={ds?.tables??[]}/></section>
        <p className="metadata mt-4">
          Each run starts with the original sample data. Changes to tables do not
          carry over to later runs or milestones. Your SQL, checked results,
          and notes stay saved.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link href={allDone ? "#saved-work" : `/projects/${projectId}/milestone/${next}`} className="btn primary">
            {allDone
              ? "Review saved work"
              : rec
                ? `Resume: ${lessons[next].title}`
                : "Start project"}{" "}
            <ArrowRight size={14} />
          </Link>
          <span className="metadata" role="status">
            {hydrated ? `${done}/${project.milestoneIds.length} milestones completed` : ""}
          </span>
        </div>
      </section>

      <section className="mt-8">
        <h2>Your milestones</h2>
        {(projectPhases[projectId] ?? [{ title: "", summary: "", milestoneIds: project.milestoneIds }]).map((phase) => (
          <div key={phase.title || "all"} className="mt-6">
            {phase.title && (
              <div className="mb-2">
                <h3 className="text-sm font-semibold">{phase.title}</h3>
                <p className="metadata mt-0.5">{phase.summary}</p>
              </div>
            )}
            <div className="border-t border-[var(--border)]">
              {phase.milestoneIds.map((id) => {
                const i = project.milestoneIds.indexOf(id);
                const m = rec?.milestones[id];
                const complete = milestoneDone(m);
                return (
                  <Link key={id} href={`/projects/${projectId}/milestone/${id}`} className="index-row">
                    <span className="module-id">{String(i + 1).padStart(2, "0")}</span>
                    <div>
                      <div className="text-sm font-medium">{lessons[id].title}</div>
                      <div className="metadata mt-1">{lessonSummaries[id]}</div>
                    </div>
                    <span className="metadata">
                      {complete
                        ? "Completed"
                        : m && (m.solved.length || m.check || Object.keys(m.queries).length)
                          ? `${m.solved.length}/2 queries${m.check ? " · check passed" : ""}`
                          : "Not started"}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      <section id="saved-work" className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2>Your saved work</h2>
          <button
            type="button"
            className="btn"
            onClick={exportReport}
            disabled={!hydrated || !hasDeliverables}
          >
            <Download size={14} /> Download project summary
          </button>
        </div>
        <p className="metadata mt-2">
          {!hasDeliverables
            ? "Queries you check and findings you write in a milestone appear here."
            : `${savedQueries} saved quer${savedQueries === 1 ? "y" : "ies"}. The summary includes each query, whether it passed, and its checked result. It downloads as a Markdown (.md) file.`}
        </p>
        {hasDeliverables && (
          <div className="mt-4 space-y-4">
            {project.milestoneIds.map((id, i) => {
              const m = rec?.milestones[id];
              if (!m || (!Object.keys(m.queries).length && !m.notes?.trim())) return null;
              return (
                <details key={id} className="border border-[var(--border)] p-4">
                  <summary className="cursor-pointer text-sm font-medium">
                    {i + 1}. {lessons[id].title} ·{" "}
                    <span className="metadata">{milestoneDone(m) ? "Completed" : "In progress"}</span>
                  </summary>
                  {m.notes?.trim() && (
                    <div className="mt-3">
                      <p className="metadata">Findings</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm">{m.notes}</p>
                    </div>
                  )}
                  {[0, 1].map((v) =>
                    m.queries[v] ? (
                      <div key={v} className="mt-3">
                        <p className="metadata">
                          Query {v + 1} ·{" "}
                          {m.solved.includes(v)
                            ? "solved without hints"
                            : (m.results[v] as { ok?: boolean } | undefined)?.ok
                              ? "solved with help"
                              : "not yet correct"}
                        </p>
                        <pre className="sql-mono mt-1 overflow-x-auto bg-[var(--secondary)] p-3 text-xs">
                          {m.queries[v]}
                        </pre>
                      </div>
                    ) : null,
                  )}
                </details>
              );
            })}
          </div>
        )}
      </section>

      {projectId === 3 || projectId === 4 ? (
        <section className="mt-10">
          <h2>How a data warehouse is built</h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            This project follows the standard layers: understand source data → load raw
            records (Bronze) → clean and validate (Silver) → build reporting tables (Gold) →
            produce reports.
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-5">
            {Object.entries(warehouseMap).map(([key, node]) => (
              <div key={key} className="border border-[var(--border)] p-3">
                <div className="eyebrow">{key}</div>
                <h3 className="mt-2 text-sm font-semibold">{node.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">
                  {node.summary ?? node.body}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
