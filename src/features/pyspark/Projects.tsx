"use client";

import Link from "next/link";
import { Fragment, useEffect, useRef, useState } from "react";
import { ArrowRight, Download, RotateCcw } from "lucide-react";
import { Shell } from "@/features/rt/Shell";
import { focusWorkspaceEditor } from "@/features/rt/workspace-focus";
import { HelpButtons, HelpPanel } from "@/features/python/Help";
import { ConfirmDialog } from "@/features/python/Dialogs";
import { Inline, Md } from "@/features/python/Md";
import {
  authoredQuestions,
  psDataset,
  psDatasetHref,
  psLesson,
  psLessonHref,
  psProjectBySlug,
  psProjectHref,
  psProjects,
  psQuestionHref,
  type PsEdition,
  type PsProject,
  type PsProjectDef,
  type PsStep,
} from "@/content/pyspark/content";
import { usePs, usePsReady } from "@/lib/pyspark-progress";
import { DatasetCards, Expected, PlannedNote } from "./parts";
import { ProjectOverview, ProjectReview, ProjectStepBar, type FrameStep } from "@/features/rt/project-frame";
import { PsWorkbench } from "./PsWorkbench";
import { ExploreTools } from "./ToolContext";

const LEVELS = [
  { id: "beginner", label: "Beginner" },
  { id: "intermediate", label: "Intermediate" },
  { id: "advanced", label: "Advanced" },
] as const;

/** One sentence a learner can act on. The registry title stays; this is what the card says (as in Python). */
const JOB: Record<string, string> = {
  "PS-P01": "Clean a shop's raw order export and turn it into daily and category sales reports.",
  "PS-P02": "Tidy employee records, link each person to their manager, and rank salaries by department.",
  "PS-P03": "Work out which learners finish their courses and which have gone quiet.",
  "PS-P04": "Match a bank's transactions to its ledger and report every balance that doesn't add up.",
  "PS-P05": "Turn movie ratings into user and movie features for a recommendation model.",
  "PS-P06": "Analyse taxi trips together with the weather, then compare how Spark runs the same query three ways.",
  "PS-P07": "Build raw, cleaned and reporting layers for healthcare claims, with quality checks.",
  "PS-P08": "Apply a stream of order and supplier changes and keep their full history.",
  "PS-P09": "Follow visitors from an ad to a purchase, even when events arrive late.",
  "PS-P10": "Stream a fleet of sensors, flag faults, and recover safely after a crash.",
};

/** "the Retail Commerce dataset's", or both names for a project that joins two datasets. */
const sourceNames = (d: PsProjectDef) => d.also?.length
  ? `${[d.dataset.id, ...d.also.map((a) => a.id)].map((id) => psDataset(id)?.title).join(" and ")} datasets'`
  : `${psDataset(d.dataset.id)?.title} dataset's`;

/** The project library, grouped by level, like Python's. Only a project with a step you can open is a link. */
export function ProjectsScreen() {
  usePsReady();
  const progress = usePs((s) => s.projects);
  return (
    <Shell subject="pyspark" section="projects" path={[{ label: "pyspark" }, { label: "projects" }]}>
      <div className="rx-page rx-project-library">
        <h1 className="rx-title">Projects</h1>
        <p className="rx-lead">Build a data pipeline one step at a time. Each step is checked on Spark.</p>
        {LEVELS.map(({ id, label }) => (
          <section key={id} className="rx-project-level">
            <h2 className={`rx-project-level-title ${id}`}>{label}</h2>
            <ul className="rx-project-list">
              {psProjects.filter((p) => p.level === id).map((p) => {
                const open = p.steps.filter((x) => x.item);
                const passed = progress[p.id]?.passed ?? {};
                const done = open.filter((x) => passed[x.id]).length;
                const started = done > 0 || !!progress[p.id]?.current;
                const body = (
                  <>
                    <span className="rx-project-card-title">{p.title}</span>
                    <span className="rx-project-card-ask">{JOB[p.id] ?? p.goal}</span>
                    {p.steps.length > 0 && <span className="rx-project-card-meta mono">{p.steps.length} steps</span>}
                    {open.length > 0 ? <span className="rx-project-card-cta">{done === p.steps.length ? "View project →" : started ? "Continue →" : "Start →"}</span> : <span className="rx-project-card-meta">Not written yet</span>}
                  </>
                );
                return <li key={p.id}>{open.length ? <Link className="rx-project-card" href={psProjectHref(p.slug)}>{body}</Link> : <div className="rx-project-card ps-card-planned">{body}</div>}</li>;
              })}
            </ul>
          </section>
        ))}
      </div>
    </Shell>
  );
}

type View = number | "overview" | "review";

/** A Python file without one top-level function (its `def` line to the next unindented line). */
function withoutDef(code: string, name: string): string {
  const lines = code.split("\n");
  const at = lines.findIndex((l) => new RegExp(`^def\\s+${name}\\s*\\(`).test(l));
  if (at < 0) return code;
  let end = at + 1;
  while (end < lines.length && !/^\S/.test(lines[end])) end++;
  return [...lines.slice(0, at), ...lines.slice(end)].join("\n").replace(/\n{3,}/g, "\n\n\n");
}
/** One shared empty record, so a store selector never returns a new object (which would re-render forever). */
const NONE: Record<string, number> = {};

export function ProjectScreen({ slug, initialStep }: { slug: string; initialStep?: number }) {
  const p = psProjectBySlug(slug)!;
  const ready = usePsReady();
  const rec = usePs((s) => s.projects[p.id]);
  const passed = rec?.passed ?? {};
  const written = p.steps.filter((s) => s.item);
  const [view, setView] = useState<View>(() => (initialStep && p.steps[initialStep - 1]?.item ? initialStep : "overview"));
  const [resets, setResets] = useState(0);
  const restored = useRef(false);
  useEffect(() => {
    if (!ready || restored.current) return;
    restored.current = true;
    if (typeof view === "number") enter(view);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, after saved progress has loaded
  }, [ready]);

  /**
   * Arriving at a written step. A file the learner hasn't written in (none yet, or still exactly as handed out) becomes
   * this step's own start: step 1's starter, or for a later step the starter's given code (imports, helpers) and this
   * step's stub, never an earlier step's function. A file with the learner's work gets this step's stub added if its
   * function isn't there yet; nothing else of theirs changes.
   */
  function enter(n: number) {
    const step = p.steps[n - 1];
    const spec = step?.item?.spec;
    if (!spec) return;
    const st = usePs.getState();
    const mine = st.projects[p.id]?.code;
    const fresh = (k: number) => {
      const starter = p.steps[0].item?.spec.starter ?? "";
      if (k === 1) return starter;
      const s = p.steps[k - 1].item?.spec;
      return `${withoutDef(starter, p.steps[0].item?.spec.entry ?? "").trimEnd()}\n${s?.append ?? ""}`;
    };
    const handedOut = mine === undefined || mine.trim() === "" || p.steps.some((s) => s.item && mine.trim() === fresh(s.number).trim());
    let code = mine ?? "";
    if (handedOut) code = fresh(n);
    else if (spec.append && !new RegExp(`def\\s+${spec.entry}\\s*\\(`).test(code)) code = code.replace(/\s*$/, "\n") + spec.append;
    if (code !== mine) st.setProjectCode(p.id, code);
    st.setCurrentStep(p.id, step.id);
  }
  function open(n: number) {
    enter(n);
    setView(n);
    window.scrollTo({ top: 0 });
  }
  function go(v: View) {
    if (typeof v === "number") return open(v);
    setView(v);
    window.scrollTo({ top: 0 });
  }
  function resetProject() {
    usePs.getState().resetProject(p.id, p.steps[0].item?.spec.starter ?? "", p.steps[0].id);
    setResets((n) => n + 1);
    open(1);
  }
  const step = typeof view === "number" ? p.steps[view - 1] : null;
  const doneCount = written.filter((s) => passed[s.id]).length;
  const complete = written.length > 0 && written.length === p.steps.length && doneCount === written.length;
  const frameSteps: FrameStep[] = p.steps.map((s) => ({
    key: s.id,
    number: s.number,
    title: s.title,
    label: p.def?.milestones.find((m) => m.step === s.number)?.label ?? `Step ${s.number}`,
    summary: p.def?.milestones.find((m) => m.step === s.number)?.summary,
    done: !!passed[s.id],
    onOpen: s.item ? () => go(s.number) : undefined,
  }));
  return (
    <Shell subject="pyspark" section="projects" path={[{ label: "pyspark", href: "/pyspark" }, { label: "projects", href: "/pyspark/projects" }, { label: p.title }]}>
      <div className={`p2 pf-project rx-learn-tables ps-project${step ? " workspace-bounded" : ""}`}>
        <header className="p2-project-head">
          <Link href="/pyspark/projects">All projects</Link>
          <h1>{p.title}</h1>
          <p>{JOB[p.id] ?? `${p.goal}.`}</p>
          <ExploreTools dataset={p.datasets[0]} edition={p.def?.dataset.edition ?? "project"} from={`${psProjectHref(p.slug)}${step ? `?step=${step.number}` : ""}`} />
        </header>
        {view !== "overview" && <ProjectStepBar steps={frameSteps} current={step ? step.id : "review"} onOverview={() => go("overview")} onReview={p.def && written.length ? () => go("review") : undefined} />}
        {step ? (
          <Workspace key={`${step.id}:${resets}`} project={p} step={step} onGo={go} onReset={resetProject} />
        ) : view === "review" ? (
          <Review project={p} complete={complete} />
        ) : (
          <Overview project={p} complete={complete} started={doneCount > 0 || !!rec?.current} steps={frameSteps} onGo={go} />
        )}
      </div>
    </Shell>
  );
}

/** The project brief: the assignment, the data it starts from, what you'll produce and how it's broken into steps. */
function Overview({ project: p, complete, started, steps, onGo }: { project: PsProject; complete: boolean; started: boolean; steps: FrameStep[]; onGo: (v: View) => void }) {
  const passed = usePs((s) => s.projects[p.id]?.passed) ?? NONE;
  const written = p.steps.filter((s) => s.item);
  const d = p.def;
  const current = written.find((s) => s.id === usePs.getState().projects[p.id]?.current);
  const firstOpen = current ?? written.find((s) => !passed[s.id]) ?? written[0];
  const banner = (
    <>
      {written.length === 0 && <PlannedNote what="project" />}
      {complete && (
        <div className="p2-complete">
          <b>Project complete</b>
          <p>Every step passes on Spark. Look back over what you built, and download your pipeline.</p>
          <div className="p2-complete-acts"><button type="button" className="p2-btn primary" onClick={() => onGo("review")}>Review and export <ArrowRight size={14} aria-hidden="true" /></button></div>
        </div>
      )}
    </>
  );
  return (
    <ProjectOverview
      banner={banner}
      task={<p>{d?.task ?? `${p.goal}.`}</p>}
      started={started}
      onStart={firstOpen ? () => onGo(firstOpen.number) : undefined}
      outputs={d ? d.artifacts.filter((a) => a.deliverable) : p.deliverables.map((name) => ({ name, about: "output table" }))}
      steps={steps}
      data={d ? (
        <p className="pf-text">From the {sourceNames(d)} project export. Your code gets these tables.</p>
      ) : (
        <ul className="p2-files-note">{p.datasets.map((id) => <li key={id}><Link href={psDatasetHref(id)}>{psDataset(id)!.title}</Link></li>)}</ul>
      )}
      tables={d ? <DatasetCards datasetId={d.dataset.id} tables={d.inputs} edition={d.dataset.edition} also={d.also} /> : undefined}
      relationships={d && projectRelationships(p).length > 0 ? <Relationships project={p} /> : undefined}
      problems={d?.problems ?? []}
      preparation={p.prerequisites.flatMap((id) => {
        const l = psLesson(id);
        return l ? [{ href: psLessonHref(l.slug), label: `${String(l.number).padStart(2, "0")} ${l.title}` }] : [];
      })}
    />
  );
}

function projectRelationships(p: PsProject) {
  const d = p.def;
  if (!d) return [];
  return [d.dataset.id, ...(d.also ?? []).map((a) => a.id)].flatMap((id) => psDataset(id)?.built?.relationships ?? []).filter((r) => d.inputs.includes(r.from.split(".")[0]) && d.inputs.includes(r.to.split(".")[0]));
}

function Relationships({ project: p }: { project: PsProject }) {
  const rels = projectRelationships(p);
  if (!rels.length) return null;
  return (
    <ul className="pf-rels" aria-label="How the tables connect">
      {rels.map((r) => <li key={r.from}><code>{r.from}</code> → <code>{r.to}</code></li>)}
    </ul>
  );
}

/**
 * The project workspace: the current task on the left, the learner's one growing file on the right, with Run / Check
 * for this step and Run project / Check project for the whole pipeline. On tablets and phones the task comes first
 * and the file under it, in one page scroll, as in Python and SQL.
 */
function Workspace({ project, step, onGo, onReset }: { project: PsProject; step: PsStep; onGo: (v: View) => void; onReset: () => void }) {
  const ready = usePsReady();
  const { spec, expected } = step.item!;
  const code = usePs((s) => s.projects[project.id]?.code ?? "");
  const passedSteps = usePs((s) => s.projects[project.id]?.passed) ?? NONE;
  const passed = !!passedSteps[step.id];
  const hints = usePs((s) => s.questions[spec.id]?.hints ?? 0);
  const [failed, setFailed] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const st = usePs.getState();
  const next = project.steps[step.number];
  // A step can show a small example (its own sample tables, every row) next to the project export it runs on.
  const several = spec.visible.length > 1;
  const name = (c: { sample?: boolean }) => (c.sample ? "small example" : "project export");
  const caseLabels = several ? Object.fromEntries(spec.visible.map((c) => [c.id, name(c)])) : undefined;
  const def = project.def;
  const projectBench = def
    ? {
        id: project.id,
        artifacts: def.artifacts,
        steps: Object.fromEntries(project.steps.filter((s) => s.item).map((s) => [s.number, { title: s.title, columns: s.item!.spec.output.columns }])),
        onChecked: (r: { steps: { item: string; passed: boolean; step: number }[] }) => {
          for (const s of r.steps) {
            st.recordCheck(s.item, s.passed);
            if (s.passed) st.passStep(project.id, project.steps[s.step - 1].id);
          }
        },
      }
    : undefined;
  return (
    <>
      <div className="p2-split ps-ws">
        <article className="p2-read" id="project-read" aria-label="Step requirements" tabIndex={0}>
          <p className="p2-eyebrow">Step {step.number} of {project.steps.length}</p>
          <h2>{spec.title}</h2>
          <Md text={spec.prompt} />
          <div className="p2-label">Done when</div>
          <ul className="p2-done">
            {spec.rules.map((d) => (
              <li key={d}><span className={`p2-mark ${passed ? "pass" : "not-run"}`} aria-hidden="true">{passed ? "✓" : "◌"}</span><span><Inline text={d} /></span></li>
            ))}
          </ul>
          {passed && spec.explanation && (
            <>
              <div className="p2-label">One way to do it</div>
              <div className="ps-approach"><Md text={spec.explanation} /></div>
            </>
          )}
          {failed && !passed && <Refresher step={step} />}
          {spec.visible.map((c) => (
            <Fragment key={c.id}>
              <div className="p2-label">{several ? `${name(c)}: data your code gets` : "Data your code gets"}</div>
              <DatasetCards datasetId={spec.dataset.id} tables={spec.inputs} edition={(c.edition ?? "project") as PsEdition} sample={expected.visible[c.id]?.inputs} also={spec.also} />
              <div className="p2-label">{several ? `${name(c)}: expected result` : "Expected result"}</div>
              <Expected expected={expected} caseId={c.id} ordered={spec.output.order_sensitive} />
            </Fragment>
          ))}
        </article>
        <section className="p2-work" id="project-work" aria-label="Project workspace" tabIndex={0} onFocusCapture={focusWorkspaceEditor}>
          {!ready ? (
            <p className="p2-empty" role="status">Loading your project…</p>
          ) : (
            <PsWorkbench
              label={`${project.title}: ${spec.file ?? "pipeline.py"}`}
              fileName={spec.file ?? "pipeline.py"}
              value={code}
              onChange={(v) => st.setProjectCode(project.id, v)}
              starter={project.steps[0].item?.spec.starter ?? ""}
              request={(mode, c) => ({ mode, item: spec.id, code: c })}
              gradable
              columns={spec.output.columns}
              entry={spec.entry}
              caseLabels={caseLabels}
              project={projectBench}
              panes
              resetControl={
                <button type="button" className="p2-btn" onClick={() => setConfirmReset(true)}>
                  <RotateCcw size={14} aria-hidden="true" /> Reset project
                </button>
              }
              onChecked={(r) => { st.recordCheck(spec.id, r.passed); setFailed(!r.passed); if (r.passed) st.passStep(project.id, step.id); }}
              next={next?.item
                ? <button type="button" className="p2-btn primary" onClick={() => onGo(next.number)}>Next step: {next.title} <ArrowRight size={14} aria-hidden="true" /></button>
                : next ? <span className="p2-note">Step {next.number} ({next.title}) is planned and not written yet.</span>
                : <button type="button" className="p2-btn primary" onClick={() => onGo("review")}>Review the project <ArrowRight size={14} aria-hidden="true" /></button>}
              help={<HelpButtons hintsShown={hints} hintCount={spec.hints.length} revealed={false} onHint={() => st.takeHint(spec.id)} />}
              status={
                <>
                  <HelpPanel hints={spec.hints} shown={hints} revealed={false} assisted={hints > 0} />
                  {passed && <p className="p2-note">✓ Step passed.</p>}
                </>
              }
            />
          )}
        </section>
      </div>
      <ConfirmDialog
        open={confirmReset}
        title="Start this project over?"
        onClose={() => setConfirmReset(false)}
        actions={[{ label: "Reset project", danger: true, onClick: onReset }]}
      >
        <p>Your file goes back to the step 1 starter and every step is marked not done. Your code in <code>{spec.file ?? "pipeline.py"}</code> can&apos;t be brought back. To clear results only, use <b>Clear</b> in the results.</p>
      </ConfirmDialog>
    </>
  );
}

/** After a failed check: the lesson this step leans on, and a smaller practice question on the same idea. */
function Refresher({ step }: { step: PsStep }) {
  const lessons = (step.prerequisites ?? []).map((id) => psLesson(id)).filter((l) => l?.written);
  if (!lessons.length) return null;
  const lesson = lessons[lessons.length - 1]!;
  const question = authoredQuestions().find((q) => q.lesson === lesson.id);
  return (
    <p className="ps-refresher" role="note">
      Stuck? <Link href={psLessonHref(lesson.slug)}>Review {lesson.title}</Link>
      {question && <> or <Link href={psQuestionHref(question.slug)}>try a smaller practice question</Link></>}. Your project stays as it is.
    </p>
  );
}

const shortDate = (t: number | string) => new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

/** Looking back: where the project stands, the pipeline's outputs, and the reference approach once complete. */
function Review({ project: p, complete }: { project: PsProject; complete: boolean }) {
  const rec = usePs((s) => s.projects[p.id]);
  const passed = rec?.passed ?? {};
  const d = p.def!;
  function download() {
    const blob = new Blob([rec?.code ?? ""], { type: "text/x-python" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = d.file;
    a.click();
    URL.revokeObjectURL(url);
  }
  const at = psProjects.findIndex((x) => x.id === p.id);
  const onward = [...psProjects.slice(at + 1), ...psProjects.slice(0, at)].find((x) => x.def && x.steps.some((s) => s.item));
  const times = Object.values(passed);
  return (
    <ProjectReview
      complete={complete}
      finishedOn={complete && times.length ? shortDate(Math.max(...times)) : undefined}
      actions={rec?.code ? <button type="button" className="p2-btn line" onClick={download}><Download size={14} aria-hidden="true" /> Download your code ({d.file})</button> : null}
      workTitle="Your pipeline's outputs"
      work={d.artifacts.filter((a) => a.deliverable).map((a) => ({ key: a.name, name: a.name, about: a.about, ok: !!passed[p.steps[a.step - 1]?.id] }))}
      workNote="✓ once the step that builds it passes. Run project, in any step, builds every table again from your file on Spark."
      references={p.steps.filter((s) => s.item?.spec.explanation).map((s) => ({ key: s.id, title: `Step ${s.number}: ${s.title}`, body: <Md text={s.item!.spec.explanation!} /> }))}
      referencesNote="One way to do each step. Your code doesn't have to match: any code that passes the same checks is right."
      nextProject={onward ? { href: psProjectHref(onward.slug), label: onward.title } : undefined}
    />
  );
}
