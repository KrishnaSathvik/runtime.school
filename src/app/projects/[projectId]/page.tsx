"use client";

import Link from "next/link";
import previews from "@/content/table-previews.json";
import { TableInspector, tableRelations } from "@/components/editor/TableInspector";
import { projectOutcomes, lessonSummaries } from "@/content/ux-summaries";
import { useParams } from "next/navigation";
import { ArrowRight, Download } from "lucide-react";
import {
  datasetCatalog,
  getProject,
  lessons,
  warehouseMap,
} from "@/content";
import { milestoneDone, useHydrated, useLearning } from "@/lib/learning-state";
import {
  projectReport,
  projectReportPdf,
  reportFilename,
  reportReadiness,
} from "@/features/projects/deliverables";
import { projectPhases } from "@/content/project-phases";
import { projectResumeHref } from "@/features/projects/ProjectList";

type Preview = {
  columns: { name: string; type: string; key: string | null; references?: string }[];
  result: { columns: string[]; values: unknown[][] };
  total: number;
};

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = Number(params.projectId);
  const project = getProject(projectId);
  const projectState = useLearning((s) => s.projects);
  const rec = projectState[projectId];
  const hydrated = useHydrated();

  if (!project) {
    return (
      <div className="canvas">
        <h1>Project not found</h1>
        <Link href="/projects/sql" className="btn mt-4">
          Back to Projects
        </Link>
      </div>
    );
  }

  const ds = datasetCatalog[project.dataset];
  const tables = ds?.tables ?? [];
  const outcome = projectOutcomes[projectId];
  const readiness = reportReadiness(project, rec);
  const done = readiness.milestonesCompleted;
  const allDone = done === project.milestoneIds.length;
  const next =
    project.milestoneIds.find((id) => !milestoneDone(rec?.milestones[id])) ??
    project.milestoneIds[0];
  const firstLesson = lessons[project.milestoneIds[0]];
  const relations = tableRelations(tables, previews as Record<string, Preview>);
  const resumeHref = projectResumeHref(projectId, projectState);

  const downloadMarkdown = () => {
    const blob = new Blob([projectReport(project, rec)], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = reportFilename(project, readiness.kind, "md");
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const downloadPdf = () => {
    const bytes = projectReportPdf(project, rec);
    const blob = new Blob([Uint8Array.from(bytes)], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = reportFilename(project, readiness.kind, "pdf");
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const canDownload = hydrated && readiness.hasAnyWork;
  const reportLabel =
    readiness.kind === "complete"
      ? "Complete report"
      : readiness.kind === "draft"
        ? "Draft report"
        : "Report";

  return (
    <div className="canvas">
      <div className="metadata">
        <Link href="/projects/sql" className="text-[var(--accent)]">
          SQL Projects
        </Link>{" "}
        / {project.title}
      </div>

      {/* 1 · Title and objective */}
      <p className="eyebrow mt-6">
        Project {String(projectId + 1).padStart(2, "0")} · {project.title}
      </p>
      <h1>{outcome.objective}</h1>
      <p className="lead">{outcome.summary}</p>

      {/* 2 · Start / Continue */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Link
          href={allDone ? "#project-report" : resumeHref}
          className="btn primary"
        >
          {allDone
            ? "Review report"
            : rec
              ? `Continue: ${lessons[next].title}`
              : "Start project"}{" "}
          <ArrowRight size={14} />
        </Link>
        <span className="metadata" role="status">
          {hydrated
            ? `${done}/${project.milestoneIds.length} milestones completed · ${readiness.findingsWritten} findings`
            : ""}
        </span>
      </div>

      {/* 3 · The brief: question, deliverable, skills, scope — one memo-style block */}
      <section className="mt-12" aria-labelledby="brief-heading">
        <h2 id="brief-heading" className="rt-section-label">The brief</h2>
        <dl className="project-brief">
          <dt>The business question</dt>
          <dd>{project.description}</dd>
          <dt>What you’ll deliver</dt>
          <dd>
            {outcome.build}
            <span className="metadata mt-1 block">
              Exported as a report with business questions, checked SQL, result evidence and your
              written findings. Labeled Draft until every milestone has a finding.
            </span>
          </dd>
          <dt>Skills</dt>
          <dd>{outcome.skills}</dd>
          <dt>Scope</dt>
          <dd>
            {firstLesson.difficulty} level · {project.milestoneIds.length} milestones · {tables.length} tables
          </dd>
        </dl>
      </section>

      {/* 5 · Available data: one line per table; each expands to schema and sample rows */}
      <section id="explore-dataset" className="mt-12 scroll-mt-14" aria-label="Available data summary">
        <h2 className="rt-section-label">Available data</h2>
        <p className="mt-3 text-sm text-[var(--text-secondary)]">{ds?.description}</p>
        {relations.length > 0 && (
          <div className="table-relations mt-3" aria-label="How the tables connect">
            <span className="metadata">How the tables connect:</span>
            {relations.map((r) => (
              <code key={r}>{r}</code>
            ))}
          </div>
        )}
        <TableInspector
          tables={tables}
          heading={false}
          collapsed
        />
        <p className="metadata">
          Open a table to see its columns and sample rows. You do not need to read every table
          before starting a milestone.
        </p>
        <p className="metadata mt-2">
          Each run starts with the original sample data. Changes to tables do not carry over to
          later runs or milestones. Findings are optional for continuing — required only for a
          complete report.
        </p>
      </section>

      {/* 6 · Milestones */}
      <section className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="rt-section-label">Milestones</h2>
          {!allDone && (
            <Link href={resumeHref} className="btn outline">
              {rec ? "Continue" : "Start"} <ArrowRight size={14} />
            </Link>
          )}
        </div>
        {(projectPhases[projectId] ?? [
          { title: "", summary: "", milestoneIds: project.milestoneIds },
        ]).map((phase) => (
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
                const hasFinding = !!m?.notes?.trim();
                return (
                  <Link
                    key={id}
                    href={`/projects/${projectId}/milestone/${id}`}
                    className="index-row"
                  >
                    <span className="module-id">{String(i + 1).padStart(2, "0")}</span>
                    <div className="min-w-0">
                      <div className="text-[15px] font-medium leading-snug">{lessons[id].title}</div>
                      <div className="mt-1.5 max-w-xl text-xs leading-relaxed text-[var(--muted)]">
                        {lessonSummaries[id]}
                      </div>
                    </div>
                    <div className="index-aside">
                      <span className="index-progress">
                        {complete
                          ? hasFinding
                            ? "Completed · finding saved"
                            : "Completed · finding optional"
                          : m && (m.solved.length || m.check || Object.keys(m.queries).length)
                            ? `${m.solved.length}/2 queries${m.check ? " · check passed" : ""}${hasFinding ? " · finding" : ""}`
                            : "Not started"}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      {/* 8 · Project report */}
      <section id="project-report" className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="rt-section-label">Project report</h2>
            <p className="metadata mt-1">
              {hydrated
                ? readiness.kind === "complete"
                  ? "Complete — every milestone has checked SQL work and a written finding."
                  : readiness.kind === "draft"
                    ? "Draft — downloadable now; complete when all milestones and findings are done."
                    : "No report yet — check SQL or write a finding to unlock download."
                : "Loading saved progress…"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn"
              onClick={downloadMarkdown}
              disabled={!canDownload}
              aria-describedby="report-download-help"
            >
              <Download size={14} /> Download project summary
            </button>
            <button
              type="button"
              className="btn"
              onClick={downloadPdf}
              disabled={!canDownload}
              aria-describedby="report-download-help"
            >
              <Download size={14} /> Download {reportLabel} PDF
            </button>
          </div>
        </div>
        <p id="report-download-help" className="metadata mt-2 max-w-3xl">
          {!hydrated
            ? "Waiting for saved progress to load."
            : !canDownload
              ? readiness.missing[0]
              : readiness.kind === "complete"
                ? `Downloads as Markdown (.md) and PDF. Filename marks this as a complete report. Includes ${readiness.verifiedChecks} verified check(s) and ${readiness.findingsWritten} finding(s).`
                : `Downloads as a Draft report (Markdown and PDF). Still needed: ${readiness.missing.slice(0, 3).join("; ")}${readiness.missing.length > 3 ? ` (+${readiness.missing.length - 3} more)` : ""}.`}
        </p>
        {readiness.kind === "draft" && readiness.missing.length > 0 && (
          <ul className="metadata mt-3 list-disc space-y-1 pl-5">
            {readiness.missing.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
        {canDownload && (
          <div className="mt-4 space-y-4">
            {project.milestoneIds.map((id, i) => {
              const m = rec?.milestones[id];
              if (!m || (!Object.keys(m.queries).length && !m.notes?.trim() && !Object.keys(m.results).length))
                return null;
              return (
                <details key={id} className="border border-[var(--border)] p-4">
                  <summary className="cursor-pointer text-sm font-medium">
                    {i + 1}. {lessons[id].title} ·{" "}
                    <span className="metadata">
                      {milestoneDone(m) ? "Completed" : "In progress"}
                      {m.notes?.trim() ? " · finding saved" : ""}
                    </span>
                  </summary>
                  {m.notes?.trim() && (
                    <div className="mt-3">
                      <p className="metadata">Findings</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm">{m.notes}</p>
                    </div>
                  )}
                  {[0, 1].map((v) => {
                    const r = m.results[v] as
                      | { ok?: boolean; sql?: string; columns?: string[]; values?: unknown[][]; truncated?: boolean; rowCount?: number }
                      | undefined;
                    const sql = (r?.ok && r.sql) || m.queries[v];
                    if (!sql) return null;
                    return (
                      <div key={v} className="mt-3">
                        <p className="metadata">
                          Challenge {v + 1} ·{" "}
                          {m.solved.includes(v)
                            ? "solved without hints"
                            : r?.ok
                              ? "solved with help"
                              : "not yet verified"}
                          {r?.ok ? " · Check answer evidence" : ""}
                        </p>
                        <pre className="sql-mono mt-1 overflow-x-auto bg-[var(--secondary)] p-3 text-xs">
                          {sql}
                        </pre>
                        {r?.ok && r.columns?.length ? (
                          <p className="metadata mt-2">
                            Saved result: {r.values?.length ?? 0}
                            {r.truncated ? ` of ${r.rowCount ?? "many"}` : ""} row
                            {(r.values?.length ?? 0) === 1 ? "" : "s"} · {r.columns.join(", ")}
                            {r.truncated ? " (truncated in storage)" : ""}
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </details>
              );
            })}
          </div>
        )}
      </section>

      {projectId === 3 || projectId === 4 ? (
        <section className="mt-10">
          <h2 className="rt-section-label">How a data warehouse is built</h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            This project follows the standard layers: understand source data → load raw records
            (Bronze) → clean and validate (Silver) → build reporting tables (Gold) → produce reports.
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
