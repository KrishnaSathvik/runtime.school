"use client";

import { focusWorkspaceEditor } from "@/features/rt/workspace-focus";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { pyRegistry } from "@/content/python-v2/registry";
import { edition } from "@/content/python-v2/datasets";
import { visibleProjects } from "@/content/python-v2/content";
import { Shell } from "@/features/rt/Shell";
import { emptyProject, usePy2, usePy2Ready } from "@/lib/python-progress-v2";
import { HelpButtons, HelpPanel } from "./Help";
import { Inline, Md } from "./Md";
import { Workbench } from "./Workbench";
import { stepFiles } from "./project-steps";
import { ArrowRight } from "lucide-react";

/**
 * Rows the learner can open: the data files the project's program actually reads. A project that provides its own
 * sample files lists those; one that mounts its dataset edition lists the edition's files.
 */
function listedData(project: { dataset: string; dataFiles: string[]; provided: Record<string, string> }) {
  const own = Object.keys(project.provided).some((name) => name.startsWith("data/"));
  try {
    if (own) throw new Error("the project provides its own data files");
    const { edition: ed } = edition(project.dataset);
    return (ed.files ?? []).filter((f) => project.dataFiles.includes(f.path)).map((f) => ({ path: f.path, count: counted(f.rows, f.format === "csv" || f.format === "parquet" || !f.format ? "row" : "record") }));
  } catch {
    return Object.entries(project.provided)
      .filter(([name]) => name.startsWith("data/"))
      .map(([name, text]) => ({ path: name.slice("data/".length), count: sampleCount(name, text) }));
  }
}

const counted = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;

/** How much a provided sample file holds, by format: a CSV's header is not a row; a JSONL file is one record per line. */
function sampleCount(name: string, text: string): string {
  const lines = text.split("\n").filter((line) => line.trim().length > 0);
  if (/\.(jsonl|ndjson)$/i.test(name)) return counted(lines.length, "record");
  if (/\.json$/i.test(name)) {
    try {
      const data: unknown = JSON.parse(text);
      if (Array.isArray(data)) return counted(data.length, "record");
      if (data && typeof data === "object") return counted(Object.keys(data).length, "entry", "entries");
    } catch { /* not valid JSON: fall through to lines */ }
    return counted(lines.length, "line");
  }
  if (/\.(csv|tsv)$/i.test(name)) return counted(Math.max(0, lines.length - 1), "row");
  return counted(lines.length, "line");
}

export function ProjectScreen({ slug }: { slug: string }) {
  const ready = usePy2Ready();
  const project = visibleProjects().find((p) => p.slug === slug)!;
  const entry = project.entry;
  const rec = usePy2((s) => s.projects[project.id]) ?? emptyProject();
  const st = usePy2.getState();
  const passed = (id: string) => !!rec.milestones[id]?.passedAt;
  const firstOpen = project.milestones.find((m) => !passed(m.id)) ?? project.milestones.at(-1)!;
  const [view, setView] = useState<string>("overview");
  const restored = useRef(false);
  const ms = project.milestones.find((m) => m.id === view);
  const index = ms ? project.milestones.findIndex((m) => m.id === ms.id) : -1;
  const next = index >= 0 ? project.milestones[index + 1] : undefined;
  const [token, setToken] = useState(0);
  const dataFiles = listedData(project);
  const allProgress = usePy2((s) => s.projects);
  const complete = project.milestones.every((m) => passed(m.id));
  const nextProject = onwardProject(project.id, allProgress);
  const given = Object.keys(project.provided).filter((name) => !name.startsWith("data/"));

  useEffect(() => {
    if (!ready || restored.current) return;
    restored.current = true;
    const beenHere = !!rec.current || project.milestones.some((m) => passed(m.id));
    const current = rec.current && project.milestones.some((m) => m.id === rec.current) ? rec.current : firstOpen.id;
    if (beenHere) {
      enter(current);
      setView(current);
    }
  }, [ready, rec, project.milestones, firstOpen.id]);

  // First visit: files start from the first step. Later steps keep the learner's own code.
  useEffect(() => {
    if (ready && Object.keys(usePy2.getState().projects[project.id]?.files ?? {}).length === 0) st.setProjectFiles(project.id, project.milestones[0].starters);
  }, [ready, rec.files, st, project.id, project.milestones]);

  // A step not passed yet gets what it adds: the new function's stub and its own main.py. Earlier code stays.
  function enter(id: string) {
    const step = project.milestones.find((m) => m.id === id);
    const now = usePy2.getState().projects[project.id];
    if (!step || now?.milestones[id]?.passedAt) return;
    const mine = now?.files ?? {};
    const seeded = stepFiles(mine, step, project.milestones);
    if (Object.keys(seeded).some((name) => seeded[name] !== mine[name])) st.setProjectFiles(project.id, seeded);
  }
  const open = (id: string) => {
    enter(id);
    setView(id);
    st.setCurrentMilestone(project.id, id);
    window.scrollTo({ top: 0 });
    // The panes keep their own scroll on desktop: start the new step at its top.
    requestAnimationFrame(() => { for (const pane of ["project-read", "project-work"]) document.getElementById(pane)?.scrollTo?.({ top: 0 }); });
  };
  const files = ms ? [
    ...project.files.map((name) => ({ name, value: rec.files[name] ?? ms.starters[name] ?? "", onChange: (v: string) => st.setProjectFile(project.id, name, v) })),
    ...Object.entries(project.provided).map(([name, value]) => ({ name, value, readOnly: true })),
  ] : [];
  const statusOf = (id: string) => (passed(id) ? "done" : id === ms?.id ? "now" : "");

  return (
    <Shell subject="python" section="projects" path={[{ label: "python", href: "/python" }, { label: "projects", href: "/python/projects" }]}>
      <div className={`p2${view !== "overview" && ms ? " workspace-bounded" : ""}`}>
        <header className="p2-project-head">
          <Link href="/python/projects">All projects</Link>
          <h1>{project.title}</h1>
          <p>{JOB[project.id]}</p>
        </header>
        <ol className="p2-rail" aria-label="Steps">
          <li className={`p2-step overview ${view === "overview" ? "now" : ""}`}>
            <button type="button" className="t" aria-current={view === "overview" ? "step" : undefined} onClick={() => { setView("overview"); window.scrollTo({ top: 0 }); }}>Overview</button>
          </li>
          {entry.milestones.map((m, k) => {
            const built = project.milestones.some((x) => x.id === m.id);
            const s = statusOf(m.id);
            return (
              <li key={m.id} className={`p2-step ${s}`}>
                <span className="n" aria-hidden="true">{s === "done" ? "✓" : k + 1}</span>
                {built ? (
                  <button type="button" className="t" aria-current={m.id === ms?.id ? "step" : undefined} onClick={() => open(m.id)}>{m.title}</button>
                ) : (
                  <span className="t">{m.title}</span>
                )}
              </li>
            );
          })}
        </ol>
        {view === "overview" || !ms ? (
          <article className="p2-brief">
            <div className="p2-brief-grid">
              <div>
                {complete && <Finished title={project.title} steps={project.milestones.length} onward={nextProject} />}
                <h2>The project</h2>
                <Md text={project.story} />
                <button type="button" className="rx-btn amber" onClick={() => open(firstOpen.id)}>{passed(project.milestones[0].id) ? "Continue →" : "Start →"}</button>
              </div>
              <div>
                <h2>The steps</h2>
                <ol className="p2-steps">
                  {project.milestones.map((m) => (
                    <li key={m.id}><button type="button" onClick={() => open(m.id)}>{m.title}</button></li>
                  ))}
                </ol>
                <h2>Your files</h2>
                <ul className="p2-files-note">
                  {project.files.map((name) => <li key={name}><code>{name}</code> <span>you write this</span></li>)}
                  {given.map((name) => <li key={name}><code>{name}</code> <span>already written</span></li>)}
                  {dataFiles.map((f) => <li key={f.path}><code>data/{f.path}</code> <span>{f.count}</span></li>)}
                </ul>
              </div>
            </div>
          </article>
        ) : (
          <div className="p2-split">
            <article className="p2-read" id="project-read" aria-label="Milestone requirements" tabIndex={0}>
              <p className="p2-eyebrow">Step {index + 1} of {project.milestones.length}</p>
              <h2>{ms.title}</h2>
              <Md text={ms.brief} />
              <div className="p2-label">Done when</div>
              <ul className="p2-done">
                {ms.doneWhen.map((d) => (
                  <li key={d}><span className={`p2-mark ${passed(ms.id) ? "pass" : "not-run"}`} aria-hidden="true">{passed(ms.id) ? "✓" : "◌"}</span><span><Inline text={d} /></span></li>
                ))}
              </ul>
              {passed(ms.id) && next && <button type="button" className="rx-btn amber p2-next" onClick={() => open(next.id)}>Next: {next.title} →</button>}
              {passed(ms.id) && !next && (complete
                ? <Finished title={project.title} steps={project.milestones.length} onward={nextProject} />
                : <p className="p2-note p2-next">This is the last step. Pass every earlier step to finish the project.</p>)}
            </article>
            <section className="p2-work" id="project-work" aria-label="Project workspace" tabIndex={0} onFocusCapture={focusWorkspaceEditor}>
              {!ready ? (
                <p className="p2-empty" role="status">Loading your project…</p>
              ) : (
                <Workbench
                  key={ms.id}
                  resetVersion={token}
                  resetFiles={ms.starters}
                  resetLabel="Reset milestone files"
                  label={`${project.title}`}
                  files={files}
                  main="main.py"
                  initialTab={project.files[0]}
                  task={ms.task}
                  packages={ms.task.packages}
                  mounts={ms.task.mounts}
                  checkLabel="Check step"
                  dataTab={dataFiles.length ? { label: "data/", content: <ul style={{ margin: 0, paddingLeft: 18 }}>{dataFiles.map((f) => <li key={f.path}><code>data/{f.path}</code> · {f.count}</li>)}</ul> } : undefined}
                  onReset={() => setToken((t) => t + 1)}
                  onChecked={(r) => st.recordMilestone(project.id, ms.id, r.ok)}
                  next={next
                    ? <button type="button" className="p2-btn primary" onClick={() => open(next.id)}>Next step: {next.title} <ArrowRight size={14} aria-hidden="true" /></button>
                    : complete && (nextProject
                      ? <Link className="p2-btn primary" href={`/python/projects/${nextProject.slug}`}>Project complete. Next project: {nextProject.title} <ArrowRight size={14} aria-hidden="true" /></Link>
                      : <Link className="p2-btn primary" href="/python/projects">Project complete. All projects <ArrowRight size={14} aria-hidden="true" /></Link>)}
                  help={<HelpButtons hintsShown={rec.attempt.hints} hintCount={ms.hints.length} revealed={false} onHint={() => st.takeProjectHelp(project.id)} />}
                  status={
                    <>
                      <HelpPanel hints={ms.hints} shown={rec.attempt.hints} revealed={false} assisted={false} />
                      {passed(ms.id) && <p className="p2-note">✓ Step passed{rec.milestones[ms.id].assisted ? " with help" : ""}.</p>}
                    </>
                  }
                />
              )}
            </section>
          </div>
        )}
      </div>
    </Shell>
  );
}

/** Libraries beyond the standard library that a project's steps import (shown on its card). */
function packagesOf(p: { milestones: { task: { packages?: readonly string[] } }[] }): string[] {
  return [...new Set(p.milestones.flatMap((m) => [...(m.task.packages ?? [])]))];
}

/** Where to go after finishing a project: the next unfinished one in course order, wrapping round, or none. */
function onwardProject(id: string, progress: Record<string, { milestones: Record<string, { passedAt?: unknown } | undefined> } | undefined>) {
  const all = visibleProjects();
  const done = (p: (typeof all)[number]) => p.milestones.every((m) => !!progress[p.id]?.milestones[m.id]?.passedAt);
  const at = all.findIndex((p) => p.id === id);
  return [...all.slice(at + 1), ...all.slice(0, Math.max(0, at))].find((p) => !done(p)) ?? null;
}

/** The end of a project: what was built, and where to go next. */
function Finished({ title, steps, onward }: { title: string; steps: number; onward: { slug: string; title: string } | null }) {
  return (
    <div className="p2-complete p2-next" role="status">
      <b>✓ Project complete</b>
      <p>You built {title}: all {steps} steps pass their checks. Your files stay here to look back at.</p>
      <div className="p2-complete-acts">
        {onward && <Link className="p2-btn primary" href={`/python/projects/${onward.slug}`}>Next project: {onward.title} <ArrowRight size={14} aria-hidden="true" /></Link>}
        <Link className="p2-btn line" href="/python/projects">All projects</Link>
      </div>
    </div>
  );
}

const LEVELS = [
  { id: "beginner", label: "Beginner" },
  { id: "intermediate", label: "Intermediate" },
  { id: "advanced", label: "Advanced" },
] as const;

/** One sentence a learner can act on. The registry title stays; this is what the card says. */
const JOB: Record<string, string> = {
  P01: "Look through the shop's products and list the ones still for sale.",
  P02: "Search a list of films and rank the ones people rated highest.",
  P03: "Read a weather file, skip the blank readings, and flag a day that is too hot or too cold.",
  P04: "Read a sales file, drop the rows that don't make sense, and report what's left.",
  P05: "Check whether a stay is free on the dates someone asked for. The bookings are simulated.",
  P06: "Move a complaint from new, to assigned, to closed, and keep a log. The assignments are simulated.",
  P07: "Read a saved list of research papers, one page at a time. Nothing calls the internet.",
  P08: "Read a stream of events, skip ones already counted, and report the totals.",
  P09: "Add up the same taxi trips two ways and check that both totals match.",
  P10: "Check a flight file, transform it, retry a failed step, and show what shipped.",
};

/** The project library: the job in one sentence. Only a project with a milestone you can run is a link. */
export function ProjectsScreen() {
  usePy2Ready();
  const built = visibleProjects();
  const progress = usePy2((s) => s.projects);
  return (
    <Shell subject="python" section="projects" path={[{ label: "python" }, { label: "projects" }]}>
      <div className="rx-page rx-project-library">
        <h1 className="rx-title">Projects</h1>
        <p className="rx-lead">Build a program one step at a time. Each step is checked before you move on.</p>
        {LEVELS.map(({ id, label }) => (
          <section key={id} className="rx-project-level">
            <h2 className="rx-project-level-title">{label}</h2>
            <ul className="rx-project-list">
              {pyRegistry.projects.filter((p) => p.level.replace("+", "").toLowerCase() === id).map((p) => {
                const b = built.find((x) => x.id === p.id);
                const rec = progress[p.id];
                const steps = b?.milestones ?? [];
                const done = rec ? steps.filter((m) => rec.milestones[m.id]?.passedAt).length : 0;
                const complete = steps.length > 0 && done === steps.length;
                const nextAt = steps.findIndex((m) => !rec?.milestones[m.id]?.passedAt);
                const started = !!rec && (done > 0 || !!rec.current);
                const ask = complete ? "Completed" : started && nextAt >= 0 ? `Step ${nextAt + 1} of ${steps.length} · ${steps[nextAt].title}` : JOB[p.id];
                const body = (
                  <>
                    <span className="rx-project-card-title">{p.title}</span>
                    <span className="rx-project-card-ask">{ask}</span>
                    {b && <span className="rx-project-card-meta mono">{steps.length} steps{packagesOf(b).length ? ` · uses ${packagesOf(b).join(", ")}` : ""}</span>}
                    {b && <span className="rx-project-card-cta">{complete ? "View project →" : started ? "Continue →" : "Start →"}</span>}
                  </>
                );
                return <li key={p.id}>{b ? <Link className="rx-project-card" href={`/python/projects/${b.slug}`}>{body}</Link> : <div className="rx-project-card">{body}</div>}</li>;
              })}
            </ul>
          </section>
        ))}
      </div>
    </Shell>
  );
}
