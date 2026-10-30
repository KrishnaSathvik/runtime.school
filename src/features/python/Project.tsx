"use client";

import { focusWorkspaceEditor } from "@/features/rt/workspace-focus";

import Link from "next/link";
import { useEffect, useState } from "react";
import { pyRegistry } from "@/content/python-v2/registry";
import { edition } from "@/content/python-v2/datasets";
import { authoredLessons, visibleProjects } from "@/content/python-v2/content";
import { pyOverview } from "@/content/python-v2/overviews";
import { pyLessonHref } from "@/content/python-v2/paths";
import { Tables } from "@/features/rt/Tables";
import { ProjectOverview, ProjectReview, ProjectStepBar, type FrameStep } from "@/features/rt/project-frame";
import { Shell } from "@/features/rt/Shell";
import { emptyProject, usePy2, usePy2Ready } from "@/lib/python-progress-v2";
import { HelpButtons, HelpPanel } from "./Help";
import { Inline, Md } from "./Md";
import { Workbench } from "./Workbench";
import { freshFiles, stepFiles } from "./project-steps";
import { csvHead } from "./csv";
import { ArrowRight, Download } from "lucide-react";

/**
 * Rows the learner can open: the data files the project's program actually reads. A project that provides its own
 * sample files lists those; one that mounts its dataset edition lists the edition's files.
 */
function listedData(project: { dataset: string; dataFiles: string[]; provided: Record<string, string> }) {
  const own = Object.keys(project.provided).some((name) => name.startsWith("data/"));
  try {
    if (own) throw new Error("the project provides its own data files");
    const { edition: ed } = edition(project.dataset);
    return (ed.files ?? []).filter((f) => project.dataFiles.includes(f.path)).map((f) => ({ path: f.path, url: f.url, count: counted(f.rows, f.format === "csv" || f.format === "parquet" || !f.format ? "row" : "record") }));
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
  const ms = project.milestones.find((m) => m.id === view);
  const index = ms ? project.milestones.findIndex((m) => m.id === ms.id) : -1;
  const next = index >= 0 ? project.milestones[index + 1] : undefined;
  const [token, setToken] = useState(0);
  const dataFiles = listedData(project);
  const allProgress = usePy2((s) => s.projects);
  const complete = project.milestones.every((m) => passed(m.id));
  const nextProject = onwardProject(project.id, allProgress);
  const given = Object.keys(project.provided).filter((name) => !name.startsWith("data/"));

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
    ...project.files.map((name) => ({ name, value: rec.files[name] ?? project.milestones[0].starters[name] ?? "", onChange: (v: string) => st.setProjectFile(project.id, name, v) })),
    ...Object.entries(project.provided).map(([name, value]) => ({ name, value, readOnly: true })),
  ] : [];
  const overview = pyOverview(project.id);
  const started = !!rec.current || project.milestones.some((m) => passed(m.id));
  const frameSteps: FrameStep[] = entry.milestones.map((m, k) => ({
    key: m.id,
    number: k + 1,
    title: m.title,
    label: m.title,
    summary: overview?.steps[m.id],
    done: passed(m.id),
    onOpen: project.milestones.some((x) => x.id === m.id) ? () => open(m.id) : undefined,
  }));

  return (
    <Shell subject="python" section="projects" path={[{ label: "python", href: "/python" }, { label: "projects", href: "/python/projects" }]}>
      <div className={`p2 pf-project${view !== "overview" && ms ? " workspace-bounded" : ""}`}>
        <header className="p2-project-head">
          <Link href="/python/projects">All projects</Link>
          <h1>{project.title}</h1>
          <p>{JOB[project.id]}</p>
        </header>
        {view !== "overview" && <ProjectStepBar steps={frameSteps} current={ms ? ms.id : view} onOverview={() => { setView("overview"); window.scrollTo({ top: 0 }); }} onReview={() => { setView("review"); window.scrollTo({ top: 0 }); }} />}
        {view === "review" ? (
          <ProjectReview
            complete={complete}
            finishedOn={complete ? shortDate(Math.max(...project.milestones.map((m) => rec.milestones[m.id]?.passedAt ?? 0))) : undefined}
            actions={project.files.map((name) => <button key={name} type="button" className="p2-btn line" onClick={() => download(name, rec.files[name] ?? "")}><Download size={14} aria-hidden="true" /> Download {name}</button>)}
            workTitle="Your files"
            work={project.files.map((name) => {
              const wanted = defNames(project.milestones.at(-1)!.solution[name] ?? "");
              const mine = writtenDefs(rec.files[name] ?? "");
              const got = wanted.filter((n) => mine.has(n)).length;
              return { key: name, name, about: wanted.length ? `${got} of ${wanted.length} functions written` : "your program", ok: wanted.length ? got === wanted.length : complete };
            })}
            workNote="A function counts once it does more than its starter stub. Check step runs your files as they are now."
            references={project.milestones.map((m, k) => ({
              key: m.id,
              title: `Step ${k + 1}: ${m.title}`,
              body: project.files.filter((name) => m.solution[name]).map((name) => <div key={name}><code>{name}</code><pre><code>{m.solution[name]}</code></pre></div>),
            }))}
            referencesNote="One way to write each step. Your code doesn't have to match: any program that passes the same checks is right."
                        nextProject={nextProject ? { href: `/python/projects/${nextProject.slug}`, label: nextProject.title } : undefined}
          />
        ) : view === "overview" || !ms ? (
          <ProjectOverview
            banner={complete ? <Finished title={project.title} steps={project.milestones.length} onward={nextProject} /> : undefined}
            task={<Md text={overview?.task ?? project.story} />}
            started={started}
            onStart={() => open(rec.current && project.milestones.some((m) => m.id === rec.current) ? rec.current : firstOpen.id)}
            outputs={overview?.produce ?? project.files.map((name) => ({ name, about: "you write this" }))}
            steps={frameSteps}
            data={<ProjectData files={dataFiles} given={given} provided={project.provided} />}
            problems={overview?.problems ?? []}
            preparation={(overview?.preparation ?? []).flatMap((id) => {
              const l = authoredLessons.find((x) => x.id === id);
              return l ? [{ href: pyLessonHref(l.slug), label: l.title }] : [];
            })}
            preparationSide="right"
          />
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
                  resetFiles={freshFiles(ms, project.milestones)}
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

const shortDate = (t: number) => new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

/** The top-level functions a Python file defines. */
const defNames = (code: string) => [...code.matchAll(/^def\s+(\w+)\s*\(/gm)].map((m) => m[1]);

/** The functions the learner has written: a body with more than a docstring and `pass`. */
function writtenDefs(code: string): Set<string> {
  const out = new Set<string>();
  const lines = code.split("\n");
  lines.forEach((line, i) => {
    const m = line.match(/^def\s+(\w+)\s*\(/);
    if (!m) return;
    let end = i + 1;
    while (end < lines.length && !/^\S/.test(lines[end])) end++;
    const body = lines.slice(i + 1, end).join("\n").replace(/("""|\'\'\')[\s\S]*?\1/g, "").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
    if (body.some((l) => l !== "pass")) out.add(m[1]);
  });
  return out;
}

/** Save one of the learner's files. */
function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name.split("/").pop() ?? name;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * The project's data as table cards, like SQL's and PySpark's: each CSV file's columns and first rows (read from the
 * published file or the project's own sample), other formats by name and size. Files the project gives are listed too.
 */
function ProjectData({ files, given, provided }: { files: { path: string; count: string; url?: string }[]; given: string[]; provided: Record<string, string> }) {
  const [rows, setRows] = useState<Record<string, string[][]>>({});
  useEffect(() => {
    let live = true;
    for (const f of files) {
      if (!/\.csv$/i.test(f.path)) continue;
      const own = provided[`data/${f.path}`];
      const got = own !== undefined ? Promise.resolve(parseCsv(own).slice(0, 11)) : f.url ? csvHead(f.url, 10) : null;
      got?.then((r) => { if (live) setRows((x) => ({ ...x, [f.path]: r })); }).catch(() => {});
    }
    return () => { live = false; };
    // The file list is rebuilt every render; its paths are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files.map((f) => f.path).join(), provided]);
  const csv = files.filter((f) => rows[f.path]?.length);
  const previews = Object.fromEntries(csv.map((f) => {
    const [head, ...body] = rows[f.path];
    return [`data/${f.path}`, { columns: head.map((name) => ({ name, type: "", key: null })), result: { columns: head, values: body }, total: Number(f.count.replace(/\D/g, "")) || body.length }];
  }));
  const other = files.filter((f) => !rows[f.path]?.length);
  return (
    <>
      <p className="pf-text">Your program reads these files from <code>data/</code>.</p>
      {csv.length > 0 && <Tables tables={csv.map((f) => `data/${f.path}`)} previews={previews} usesAll="your program reads all of them" />}
      <ul className="p2-files-note">
        {other.map((f) => <li key={f.path}><code>data/{f.path}</code> <span>{f.count}</span></li>)}
        {given.map((name) => <li key={name}><code>{name}</code> <span>already written for you</span></li>)}
      </ul>
    </>
  );
}

/** A small CSV text as rows (header first). The project samples are tiny and unquoted except for simple quotes. */
function parseCsv(text: string): string[][] {
  return text.split(/\r?\n/).filter((l) => l.trim()).map((l) => l.split(",").map((v) => v.replace(/^"|"$/g, "")));
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
            <h2 className={`rx-project-level-title ${id}`}>{label}</h2>
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
