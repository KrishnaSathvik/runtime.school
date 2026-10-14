"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Download, List, X } from "lucide-react";
import taskContexts from "@/content/task-context.json";
import { datasetCatalog, getLesson, getProject, projects } from "@/content";
import { lessonSummaries, projectOutcomes } from "@/content/ux-summaries";
import { learnerExplanation } from "@/lib/content-copy";
import { milestoneDone, useHydrated, useLearning } from "@/lib/learning-state";
import { projectReport, projectReportPdf, reportFilename, reportReadiness } from "@/features/projects/deliverables";
import { projectsEntryHref } from "@/features/rt/entry";
import { projectHref, type ProjectStop } from "@/platform/project-paths";
import { Shell } from "../Shell";
import { RunCell } from "../Cells";
import { Challenge } from "../Challenge";
import { Tables } from "../Tables";

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9+]+/g, "-").replace(/^-|-$/g, "");
const pad = (n: number) => String(n).padStart(2, "0");

type Stop = ProjectStop;
const hrefFor = (projectId: number, s: Stop) => projectHref(projectId, s);
const stopsFor = (projectId: number): Stop[] => [
  { kind: "brief" },
  ...(getProject(projectId)?.milestoneIds ?? []).map((id) => ({ kind: "milestone" as const, id })),
  { kind: "report" },
];
const sameStop = (a: Stop, b: Stop) => a.kind === b.kind && (a.kind !== "milestone" || (b.kind === "milestone" && a.id === b.id));

/** /sql/projects: open real work straight away. */
export function ProjectsEntry() {
  const router = useRouter();
  const ready = useHydrated();
  const done = useRef(false);
  useLayoutEffect(() => {
    if (!ready || done.current) return;
    done.current = true;
    router.replace(projectsEntryHref(useLearning.getState()));
  }, [ready, router]);
  return (
    <Shell path={[{ label: "sql" }, { label: "projects" }]} section="projects">
      <div className="rx-page" aria-busy="true" aria-label="Opening your project" />
    </Shell>
  );
}

/** One page of a project: its brief, a milestone, or the report. */
export function ProjectPage({ projectId, stop }: { projectId: number; stop: Stop }) {
  const ready = useHydrated();
  // Subscribe so the status line updates as milestones and findings change.
  useLearning((s) => s.projects[projectId]);
  const project = getProject(projectId);
  const valid = !!project && (stop.kind !== "milestone" || project.milestoneIds.includes(stop.id));
  if (!valid) {
    return (
      <Shell path={[{ label: "sql" }, { label: "projects" }]} section="projects">
        <div className="rx-page"><h1 className="rx-title">Not found</h1><p><Link className="rx-btn" href="/sql/projects">Open my project</Link></p></div>
      </Shell>
    );
  }
  const file = stop.kind === "brief" ? "brief" : stop.kind === "report" ? "export" : `${pad(project.milestoneIds.indexOf(stop.id) + 1)}-${slug(getLesson(stop.id)?.title ?? "")}.sql`;
  return (
    <Shell
      path={[{ label: "sql" }, { label: "projects", href: "/sql/projects" }, { label: project.title, href: hrefFor(projectId, { kind: "brief" }) }, { label: file }]}
      section="projects"
      status={ready ? statusFor(projectId) : ["SQL", project.title]}
    >
      <ProjectBar projectId={projectId} stop={stop} />
      {stop.kind === "brief" ? (
        <Brief projectId={projectId} />
      ) : stop.kind === "report" ? (
        <Report projectId={projectId} />
      ) : (
        <Milestone key={stop.id} projectId={projectId} lessonId={stop.id} />
      )}
    </Shell>
  );
}

function statusFor(projectId: number) {
  const project = getProject(projectId)!;
  const rec = useLearning.getState().projects[projectId];
  const done = project.milestoneIds.filter((id) => milestoneDone(rec?.milestones[id])).length;
  const findings = project.milestoneIds.filter((id) => rec?.milestones[id]?.notes?.trim()).length;
  return ["SQL", project.title, `${done}/${project.milestoneIds.length} milestones`, `${findings} findings`, `sqlite · ${datasetCatalog[project.dataset]?.name ?? project.dataset}`];
}

/** Same bar as Learn and Practice: all projects in a drawer, position, and previous. */
function ProjectBar({ projectId, stop }: { projectId: number; stop: Stop }) {
  const state = useLearning();
  const [open, setOpen] = useState(false);
  const project = getProject(projectId)!;
  const stops = stopsFor(projectId);
  const at = stops.findIndex((s) => sameStop(s, stop));
  const prev = stops[at - 1];
  const label = (s: Stop) =>
    s.kind === "brief" ? "brief" : s.kind === "report" ? "export" : `milestone ${pad(project.milestoneIds.indexOf(s.id) + 1)} / ${pad(project.milestoneIds.length)}`;

  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [open]);

  return (
    <div className="rx-task rx-lesson">
      <div className="rx-task-bar">
        <button type="button" className="rx-btn ghost" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <List size={14} /> All projects
        </button>
        <span className="mono rx-small" style={{ margin: 0 }}>{project.title} · {label(stop)}</span>
        <span className="push" />
        {prev && (
          <nav className="rx-pager" aria-label="Previous">
            <Link href={hrefFor(projectId, prev)} aria-label={`Previous: ${label(prev)}`} title={label(prev)}>
              <ArrowLeft size={14} aria-hidden="true" /> Prev
            </Link>
          </nav>
        )}
      </div>
      {open && (
        <div className="rx-drawer" role="dialog" aria-label="All projects">
          <div className="rx-drawer-head">
            <span className="rx-small" style={{ margin: "8px 6px", flex: 1 }}>{projects.length} projects</span>
            <button type="button" className="rx-btn ghost" onClick={() => setOpen(false)} aria-label="Close list"><X size={14} /></button>
          </div>
          <ol>
            {projects.map((p) => {
              const rec = state.projects[p.id];
              return (
                <li key={p.id}>
                  <p className="rx-drawer-group mono">{pad(p.id + 1)} {p.title}</p>
                  {stopsFor(p.id).map((s) => {
                    const m = s.kind === "milestone" ? rec?.milestones[s.id] : undefined;
                    const complete = s.kind === "milestone" && milestoneDone(m);
                    const started = !!m && (m.solved.length > 0 || m.check || Object.keys(m.queries).length > 0);
                    const current = p.id === projectId && sameStop(s, stop);
                    return (
                      <Link key={hrefFor(p.id, s)} href={hrefFor(p.id, s)} aria-current={current ? "page" : undefined} onClick={() => setOpen(false)}>
                        <span className={`mono g ${complete ? "ok" : ""}`}>{s.kind !== "milestone" ? "" : complete ? "✓" : started ? "◐" : "·"}</span>
                        <span>{s.kind === "brief" ? "Brief" : s.kind === "report" ? "Export" : getLesson(s.id)?.title}</span>
                        <span className="mono k">{s.kind === "milestone" ? pad(p.milestoneIds.indexOf(s.id) + 1) : ""}</span>
                      </Link>
                    );
                  })}
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}

function Brief({ projectId }: { projectId: number }) {
  const project = getProject(projectId)!;
  const outcome = projectOutcomes[projectId];
  const rec = useLearning((s) => s.projects[projectId]);
  const next = project.milestoneIds.find((id) => !milestoneDone(rec?.milestones[id])) ?? project.milestoneIds[0];
  const tables = datasetCatalog[project.dataset]?.tables ?? [];
  return (
    <div className="rx-task rx-lesson">
      <div className="rx-task-split">
        <article className="rx-brief" aria-labelledby="brief-title">
          <p className="rx-prompt-line"><b>project {pad(projectId + 1)}</b> {project.title}</p>
          <h1 id="brief-title" className="rx-task-title">{outcome.objective}</h1>
          <p className="rx-lead" style={{ fontSize: "1.05rem" }}>{outcome.summary}</p>
          <dl className="rx-dl">
            <dt>business question</dt><dd>{project.description}</dd>
            <dt>you deliver</dt><dd>{outcome.build} Exported as a report with your checked SQL, result evidence and written findings.</dd>
            <dt>skills</dt><dd>{outcome.skills}</dd>
            <dt>scope</dt><dd>{project.milestoneIds.length} milestones · {tables.length} tables · {getLesson(project.milestoneIds[0])?.difficulty.toLowerCase()}</dd>
          </dl>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 22 }}>
            <Link href={hrefFor(projectId, { kind: "milestone", id: next })} className="rx-btn amber">
              {rec ? "Continue with the next milestone" : "Start the first milestone"} <ArrowRight size={15} />
            </Link>
            <Link href={hrefFor(projectId, { kind: "report" })} className="rx-btn ghost">
              Open the report <ArrowRight size={15} />
            </Link>
          </div>
          <p className="rx-label">milestones</p>
          <ol className="rx-ms-list">
            {project.milestoneIds.map((id, i) => {
              const complete = milestoneDone(rec?.milestones[id]);
              return (
                <li key={id}>
                  <Link href={hrefFor(projectId, { kind: "milestone", id })}>
                    <span className={`mono g ${complete ? "ok" : ""}`}>{complete ? "✓" : pad(i + 1)}</span>
                    <span className="t">{getLesson(id)?.title}<span className="d">{lessonSummaries[id]}</span></span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </article>
        <section className="rx-work rx-lesson-work" aria-label="Project data">
          <p className="rx-prompt-line" style={{ marginTop: 0 }}><b>data</b> {datasetCatalog[project.dataset]?.name} · {tables.length} tables</p>
          <p className="rx-prose" style={{ margin: "0 0 10px", fontSize: 15 }}>{datasetCatalog[project.dataset]?.description}</p>
          <div className="rx-two-col">
            <Tables tables={tables} open />
          </div>
        </section>
      </div>
    </div>
  );
}

type Tab = "q1" | "q2" | "check" | "finding";

function Milestone({ projectId, lessonId }: { projectId: number; lessonId: number }) {
  const project = getProject(projectId)!;
  const lesson = getLesson(lessonId)!;
  const m = useLearning((s) => s.projects[projectId]?.milestones[lessonId]);
  const setNotes = useLearning((s) => s.setMilestoneNotes);
  const completeQuiz = useLearning((s) => s.completeQuiz);
  const [quiz, setQuiz] = useState<{ choice: number; ok: boolean } | null>(null);
  const index = project.milestoneIds.indexOf(lessonId);
  const nextId = project.milestoneIds[index + 1];
  const tables = [...new Set((taskContexts as Record<string, { tables: string[] }[]>)[lessonId]?.flatMap((t) => t.tables) ?? [])];
  const solved = m?.solved ?? [];
  const complete = milestoneDone(m);
  const hasFinding = !!m?.notes?.trim();
  const [tab, setTab] = useState<Tab>(() => (!solved.includes(0) ? "q1" : !solved.includes(1) ? "q2" : !m?.check ? "check" : "finding"));

  const tabs: { id: Tab; label: string; done: boolean }[] = [
    { id: "q1", label: "Query 1", done: solved.includes(0) },
    { id: "q2", label: "Query 2", done: solved.includes(1) },
    { id: "check", label: "Concept check", done: !!m?.check },
    { id: "finding", label: "Finding", done: hasFinding },
  ];
  const required = tabs.slice(0, 3).filter((t) => !t.done).length;
  const nextHref = nextId !== undefined ? hrefFor(projectId, { kind: "milestone", id: nextId }) : hrefFor(projectId, { kind: "report" });

  return (
    <div className="rx-task rx-lesson">
      <div className="rx-task-split">
        {/* Left: the business context and how to approach it. */}
        <article className="rx-brief" aria-labelledby="ms-title">
          <p className="rx-prompt-line"><b>milestone {index + 1}/{project.milestoneIds.length}</b> {lesson.title}</p>
          <h1 id="ms-title" className="rx-task-title">{lessonSummaries[lessonId]}</h1>
          <p className="rx-small" style={{ marginTop: 8 }}>{project.title} · {project.description}</p>
          <h2 className="rx-h"><b>approach</b></h2>
          <p className="rx-prose">{learnerExplanation(lesson.concept)}</p>
          <RunCell query={lesson.example} name="worked-example.sql" allowWrites={lesson.mode === "lab"} />
          {tables.length > 0 && (
            <>
              <h2 className="rx-h"><b>data</b> for this milestone</h2>
              <Tables tables={tables} open />
            </>
          )}
        </article>

        {/* Right: the work, one step at a time. */}
        <section className="rx-work rx-lesson-work" aria-label="Your work">
          <div className="rx-tabs" role="tablist" aria-label="Milestone steps">
            {tabs.map((t) => (
              <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} aria-controls={`panel-${t.id}`} onClick={() => setTab(t.id)}>
                <span className={`mono ${t.done ? "ok" : ""}`} aria-hidden="true">{t.done ? "✓" : "·"}</span> {t.label}
                {t.done && <span className="sr-only"> (done)</span>}
              </button>
            ))}
          </div>
          <div id={`panel-${tab}`} role="tabpanel">
            {tab === "q1" && <Challenge key="q1" lessonId={lessonId} variant={0} projectId={projectId} onSolved={() => !solved.includes(1) && setTab("q2")} />}
            {tab === "q2" && <Challenge key="q2" lessonId={lessonId} variant={1} projectId={projectId} onSolved={() => !m?.check && setTab("check")} />}
            {tab === "check" && (
              <>
                <p className="rx-task-prompt">{lesson.quiz.q}</p>
                <div className="rx-quiz" role="group" aria-label="Answer options">
                  {lesson.quiz.options.map((opt, i) => (
                    <button
                      key={opt}
                      type="button"
                      aria-pressed={quiz?.choice === i}
                      disabled={quiz?.ok === true}
                      onClick={() => {
                        const r = completeQuiz(lessonId, projectId, i);
                        setQuiz({ choice: i, ok: r.ok });
                        if (r.ok && !hasFinding) setTab("finding");
                      }}
                    >
                      <span className="mono rx-opt">{String.fromCharCode(97 + i)}</span> {opt}
                    </button>
                  ))}
                </div>
                <div aria-live="polite">
                  {quiz && <p className={`rx-feedback ${quiz.ok ? "ok" : "bad"}`}>{quiz.ok ? "✓ Correct." : "✕ Not quite."} {lesson.quiz.why}</p>}
                  {!quiz && m?.check && <p className="rx-feedback ok">✓ Concept check passed earlier.</p>}
                </div>
              </>
            )}
            {tab === "finding" && (
              <>
                <p className="rx-task-prompt">What did the data show?</p>
                <p className="rx-task-rules">One or two plain sentences. Included when you download this project. It does not affect SQL credit.</p>
                <textarea
                  className="rx-notes rx-finding"
                  aria-label="Your finding for this milestone"
                  placeholder="For example: daily active viewers peaked on Jan 3, and engagement per viewer fell on weekends."
                  value={m?.notes ?? ""}
                  onChange={(e) => setNotes(projectId, lessonId, e.target.value)}
                />
                <p className="rx-small">{hasFinding ? "✓ saved" : "saves as you type"}</p>
              </>
            )}
          </div>
          <div className={`rx-lesson-status ${complete ? "done" : ""}`} aria-live="polite">
            <span className="mono">
              {complete
                ? hasFinding ? "✓ milestone complete · finding saved" : "✓ milestone complete · add a finding for the report"
                : `${required} step${required === 1 ? "" : "s"} left · check both queries and pass the concept check`}
            </span>
            <span style={{ display: "inline-flex", flexWrap: "wrap", gap: 8 }}>
              {nextId !== undefined && (
                <Link href={hrefFor(projectId, { kind: "report" })} className="rx-btn ghost">
                  Open the report
                </Link>
              )}
              <Link href={nextHref} className={`rx-btn ${complete ? "amber" : "ghost"}`}>
                {nextId !== undefined ? "Next milestone" : "Open the report"} <ArrowRight size={14} />
              </Link>
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}

function Report({ projectId }: { projectId: number }) {
  const project = getProject(projectId)!;
  const rec = useLearning((s) => s.projects[projectId]);
  const readiness = reportReadiness(project, rec);
  const save = (kind: "md" | "pdf") => {
    let blob: Blob;
    if (kind === "md") {
      blob = new Blob([projectReport(project, rec)], { type: "text/markdown;charset=utf-8" });
    } else {
      const bytes = projectReportPdf(project, rec);
      const copy = new Uint8Array(bytes.byteLength);
      copy.set(bytes);
      blob = new Blob([copy], { type: "application/pdf" });
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = reportFilename(project, readiness.kind, kind);
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <div className="rx-task rx-lesson">
      <div className="rx-task-split">
        <article className="rx-brief" aria-labelledby="report-title">
          <p className="rx-prompt-line"><b>export</b> {readiness.kind === "complete" ? "complete" : readiness.kind === "draft" ? "draft" : "not started"}</p>
          <h1 id="report-title" className="rx-task-title">{project.title}</h1>
          <p className="rx-lead" style={{ fontSize: "1.05rem" }}>Your checked SQL, result evidence and findings, ready to download.</p>
          <div className="rx-next" style={{ justifyContent: "flex-start", maxWidth: "none" }}>
            <button type="button" className="rx-btn primary" disabled={!readiness.hasAnyWork} onClick={() => save("md")}><Download size={14} /> Download Markdown</button>
            <button type="button" className="rx-btn" disabled={!readiness.hasAnyWork} onClick={() => save("pdf")}><Download size={14} /> Download PDF</button>
          </div>
          <p className="rx-small">
            {readiness.hasAnyWork
              ? readiness.kind === "complete"
                ? "Complete: every milestone has checked SQL and a finding."
                : `Draft. Still needed: ${readiness.missing.slice(0, 2).join("; ")}${readiness.missing.length > 2 ? ` (+${readiness.missing.length - 2} more)` : ""}.`
              : readiness.missing[0]}
          </p>
          <p className="rx-label">milestones</p>
          <ol className="rx-ms-list">
            {project.milestoneIds.map((id, i) => {
              const m = rec?.milestones[id];
              const complete = milestoneDone(m);
              return (
                <li key={id}>
                  <Link href={hrefFor(projectId, { kind: "milestone", id })}>
                    <span className={`mono g ${complete && m?.notes?.trim() ? "ok" : ""}`}>{complete && m?.notes?.trim() ? "✓" : complete ? "◐" : pad(i + 1)}</span>
                    <span className="t">
                      {getLesson(id)?.title}
                      <span className="d">{m?.notes?.trim() || (complete ? "complete · no finding yet" : "not complete yet")}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </article>
        <section className="rx-work rx-lesson-work" aria-label="Report preview">
          <div className="rx-cell" style={{ marginTop: 0 }}>
            <div className="rx-cell-head"><span className="name">export · preview</span></div>
            <pre className="rx-report" tabIndex={0}>{projectReport(project, rec)}</pre>
          </div>
        </section>
      </div>
    </div>
  );
}
