"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, CheckCheck, Play, PlayCircle, RotateCcw, Square, X } from "lucide-react";
import { PyEditor, type PyEditorHandle } from "@/features/py/PyEditor";
import { Keys } from "@/features/rt/Keys";
import {
  sparkJob,
  type PsCase,
  type PsCheckResult,
  type PsError,
  type PsJobRequest,
  type PsJobState,
  type PsProjectCheckResult,
  type PsProjectRunResult,
  type PsRunResult,
} from "@/engine/pyspark/client";
import type { PsArtifact } from "@/content/pyspark/content";
import { ArtifactsView, ProjectChecksView } from "./ProjectResults";
import { CheckRows, DataTable, JobLine, Schema, SparkError, useSparkConnection, type Connection } from "./parts";

type Mode = "run" | "check" | "project-run" | "project-check";
type Busy = { mode: Mode; state: PsJobState; since: number; detail?: string };
type Panel = "result" | "checks" | "output" | "artifacts" | "project";

/** A project step's workbench can also run and check the whole pipeline in the same file. */
export type PsWorkbenchProject = {
  id: string;
  artifacts: PsArtifact[];
  /** Step number → its title and output columns, to name steps and label quoted rows in project checks. */
  steps: Record<number, { title: string; columns: string[] }>;
  onChecked?: (r: PsProjectCheckResult) => void;
};

/**
 * The PySpark workbench: one file, Run / Check / Stop, and real Spark results (docs/pyspark/plan.md §7).
 * It reuses the Python workbench's editor, toolbar and result styling, but its own Spark client: the Python workbench
 * is unchanged. Run never grades. Check runs the visible sample and the hidden cases on Spark, then grades on the runner.
 */
export function PsWorkbench({
  label,
  fileName = "solution.py",
  value,
  onChange,
  starter,
  request,
  gradable,
  onChecked,
  help,
  status,
  next,
  columns = [],
  entry = "solve",
  caseLabels,
  project,
  resetControl,
  panes = false,
  onJobStart,
  identity = "",
}: {
  label: string;
  fileName?: string;
  value: string;
  onChange: (v: string) => void;
  starter: string;
  /** The job for this code: an item to run or check, or a Playground dataset. */
  request: (mode: "run" | "check", code: string) => PsJobRequest;
  gradable: boolean;
  onChecked?: (r: PsCheckResult) => void;
  help?: ReactNode;
  status?: ReactNode;
  next?: ReactNode;
  /** The expected output columns, to label rows quoted in feedback. */
  columns?: string[];
  /** The function Run and Check call, named in the result header. */
  entry?: string;
  /** Names for the visible cases when there are several (a project step's small example and its export). */
  caseLabels?: Record<string, string>;
  /** Project steps: Run project and Check project, and their Artifacts and Project tabs. */
  project?: PsWorkbenchProject;
  /** Replaces the Reset button (a project resets the whole project, after asking). */
  resetControl?: ReactNode;
  /** Wrap the editor and the results in panes a phone layout can show one at a time. */
  panes?: boolean;
  /** Called when a job starts, so a phone layout can switch to the results. */
  onJobStart?: (mode: Mode) => void;
  /** Dataset/version/edition or other inputs that affect the answer. */
  identity?: string;
}) {
  const editor = useRef<PyEditorHandle>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const abort = useRef<AbortController | null>(null);
  const [connection, setConnection] = useSparkConnection();
  const [busy, setBusy] = useState<Busy | null>(null);
  const [ran, setRan] = useState<{ result: PsRunResult; code: string } | null>(null);
  const [checked, setChecked] = useState<{ result: PsCheckResult; code: string } | null>(null);
  const [whole, setWhole] = useState<{ result: PsProjectRunResult; code: string } | null>(null);
  const [wholeChecked, setWholeChecked] = useState<{ result: PsProjectCheckResult; code: string } | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>("result");
  const [mark, setMark] = useState<{ line: number; token: number } | null>(null);
  const latest = useRef(identity);
  latest.current = identity;
  const [ranIdentity, setRanIdentity] = useState<string | null>(null);

  useEffect(() => () => abort.current?.abort(), []);

  const goToLine = (line: number) => editor.current?.goToLine(line);
  const markError = (e?: PsError | null) => setMark(e?.line ? { line: e.line, token: Date.now() } : null);

  async function go(mode: Mode) {
    if (busy || connection !== "connected") return;
    if (mode.startsWith("project-") && !project) return;
    const code = value;
    const submittedIdentity = identity;
    const ctl = new AbortController();
    abort.current = ctl;
    setProblem(null);
    setMark(null);
    setPanel(({ run: "result", check: "checks", "project-run": "artifacts", "project-check": "project" } as const)[mode]);
    setBusy({ mode, state: "queued", since: Date.now() });
    onJobStart?.(mode);
    const req: PsJobRequest = mode === "project-run" || mode === "project-check" ? { mode, project: project!.id, code } : request(mode, code);
    const out = await sparkJob<PsRunResult | PsCheckResult | PsProjectRunResult | PsProjectCheckResult>(req, {
      signal: ctl.signal,
      onState: (state, d) => setBusy((b) => (b ? { ...b, state, detail: d?.case && mode !== "run" ? caseLabel(d.case) : undefined } : b)),
    });
    abort.current = null;
    setBusy(null);
    if (submittedIdentity !== latest.current) return;
    setRanIdentity(submittedIdentity);
    if (out.state === "done") {
      if (out.result.mode === "project-run") {
        const r = out.result as PsProjectRunResult;
        setWhole({ result: r, code });
        markError(r.error ?? r.artifacts.find((a) => a.error?.line)?.error);
      } else if (out.result.mode === "project-check") {
        const r = out.result as PsProjectCheckResult;
        setWholeChecked({ result: r, code });
        markError(r.steps.find((x) => x.error)?.error ?? r.steps.flatMap((x) => x.checks).find((c) => !c.passed && c.error?.line)?.error);
        project?.onChecked?.(r);
      } else if (out.result.mode === "check") {
        const r = out.result as PsCheckResult;
        setChecked({ result: r, code });
        markError(r.error ?? r.checks.find((c) => !c.passed && c.error?.line)?.error);
        onChecked?.(r);
      } else {
        const r = out.result as PsRunResult;
        setRan({ result: r, code });
        markError(r.error ?? r.cases.find((c) => c.error)?.error);
      }
      requestAnimationFrame(() => {
        // Bring the verdict into view without moving focus (the work pane scrolls on desktop, the page on phones).
        const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        resultsRef.current?.scrollIntoView?.({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
      });
    } else if (out.state === "cancelled") {
      setProblem("Stopped. The Spark job and everything it started were shut down.");
    } else {
      if (out.state === "unavailable") setConnection("unreachable");
      setProblem(out.message);
    }
  }

  const stop = () => abort.current?.abort();
  const clear = () => { setRan(null); setChecked(null); setWhole(null); setWholeChecked(null); setProblem(null); setMark(null); };
  const anyResult = !!(ran || checked || whole || wholeChecked);
  const offline = connection !== "connected";
  const output = ran?.result.cases.map((c) => [c.stdout, c.stderr].filter(Boolean).join("\n")).filter(Boolean).join("\n") ?? "";

  // A plain function, not a component: the editor inside must keep its identity between renders.
  const pane = (kind: "code" | "results", children: ReactNode) => (panes ? <div className={`ps-pane ps-pane-${kind}`}>{children}</div> : children);

  return (
    <>
      {pane("code", <>
      <div className="p2-bench">
        <div className="p2-bench-bar">
          <div className="p2-files" role="tablist" aria-label="Files">
            <button type="button" role="tab" aria-selected="true">{fileName}</button>
          </div>
          <div className="p2-keys" aria-hidden="true">
            <Keys keys={["mod", "enter"]} /> run{gradable && <> · <Keys keys={["shift", "mod", "enter"]} /> check</>}
          </div>
        </div>
        <PyEditor ref={editor} value={value} onChange={onChange} onRun={() => void go("run")} onCheck={gradable ? () => void go("check") : undefined} label={label} errorLine={mark} minHeight="200px" placeholder="Write your PySpark here" />
        <div className="p2-actions">
          <div>
            {resetControl ?? (
              <button type="button" className="p2-btn" disabled={!!busy || value === starter} onClick={() => { editor.current?.replaceAll(starter); editor.current?.focus(); }}>
                <RotateCcw size={14} aria-hidden="true" /> Reset
              </button>
            )}
            {help}
          </div>
          <div>
            {busy && <JobLine state={busy.state} since={busy.since} detail={busy.detail} />}
            {busy ? (
              <button type="button" className="p2-btn line" onClick={stop}>
                <Square size={13} aria-hidden="true" /> Stop
              </button>
            ) : (
              <button type="button" className="p2-btn line" onClick={() => void go("run")} disabled={offline}>
                <Play size={14} aria-hidden="true" /> Run
              </button>
            )}
            {gradable && (
              <button type="button" className="p2-btn primary" onClick={() => void go("check")} disabled={!!busy || offline}>
                <Check size={14} aria-hidden="true" /> {project ? "Check step" : "Check"}
              </button>
            )}
          </div>
        </div>
      </div>
      <Connectivity connection={connection} />
      {problem && <p className="p2-note" role="status">{problem}</p>}
      {status}
      </>)}

      {pane("results", <>
      {project && (
        <div className="p2-actions ps-project-acts" aria-label="Whole project">
          <span className="ps-project-acts-label">Whole pipeline</span>
          <div>
            <button type="button" className="p2-btn line" onClick={() => void go("project-run")} disabled={!!busy || offline}>
              <PlayCircle size={14} aria-hidden="true" /> Run project
            </button>
            <button type="button" className="p2-btn line" onClick={() => void go("project-check")} disabled={!!busy || offline}>
              <CheckCheck size={14} aria-hidden="true" /> Check project
            </button>
          </div>
        </div>
      )}
      <div className="p2-results" ref={resultsRef}>
        {anyResult && ranIdentity !== identity && <p className="p2-note ps-stale" role="status">Previous run — data or inputs changed. Run again for the selected data.</p>}
        <div className="p2-tabs ps-result-tabs" role="tablist" aria-label="Results">
          <button type="button" role="tab" aria-selected={panel === "result"} onClick={() => setPanel("result")}>Result</button>
          {gradable && <button type="button" role="tab" aria-selected={panel === "checks"} onClick={() => setPanel("checks")}>Checks{checked ? ` · ${checked.result.score}` : ""}</button>}
          <button type="button" role="tab" aria-selected={panel === "output"} onClick={() => setPanel("output")}>Output{output ? " · 1" : ""}</button>
          {project && <button type="button" role="tab" aria-selected={panel === "artifacts"} onClick={() => setPanel("artifacts")}>Artifacts{whole ? ` · ${whole.result.artifacts.filter((a) => a.status === "ok").length}` : ""}</button>}
          {project && <button type="button" role="tab" aria-selected={panel === "project"} onClick={() => setPanel("project")}>Project checks{wholeChecked ? ` · ${wholeChecked.result.steps.filter((x) => x.passed).length}/${Object.keys(project.steps).length}` : ""}</button>}
          {anyResult && !busy && (
            <button type="button" className="ps-clear" onClick={clear} aria-label="Clear results (your code stays)">
              <X size={13} aria-hidden="true" /> Clear
            </button>
          )}
        </div>
        {panel === "result" && (
          <>
            {ran && ran.code !== value && !busy && <p className="p2-note ps-stale" role="status">Previous run — code changed</p>}
            <RunView result={ran?.result ?? null} busy={busy?.mode === "run"} onLine={goToLine} gradable={gradable} entry={entry} caseLabels={caseLabels} />
          </>
        )}
        {panel === "checks" && (
          <>
            {checked && checked.code !== value && !busy && <p className="p2-note ps-stale" role="status">Previous check — code changed</p>}
            <ChecksView result={checked?.result ?? null} busy={busy?.mode === "check"} onLine={goToLine} columns={columns} next={checked && checked.code === value ? next : undefined} caseLabels={caseLabels} />
          </>
        )}
        {panel === "output" && (
          <div className="p2-console" role="log" aria-label="Output">
            {output ? output : <span className="meta">{ran ? "Your code didn't print anything." : "What your code prints appears here after Run."}</span>}
          </div>
        )}
        {panel === "artifacts" && project && (
          <>
            {whole && whole.code !== value && !busy && <p className="p2-note ps-stale" role="status">Previous project run — code changed</p>}
            <ArtifactsView result={whole?.result ?? null} busy={busy?.mode === "project-run"} artifacts={project.artifacts} onLine={goToLine} />
          </>
        )}
        {panel === "project" && project && (
          <>
            {wholeChecked && wholeChecked.code !== value && !busy && <p className="p2-note ps-stale" role="status">Previous project check — code changed</p>}
            <ProjectChecksView result={wholeChecked?.result ?? null} busy={busy?.mode === "project-check" ? busy.detail ?? "" : undefined} steps={project.steps} onLine={goToLine} />
          </>
        )}
      </div>
      </>)}
    </>
  );
}

const caseLabel = (id: string) => (id.startsWith("hidden-") ? "hidden cases" : id.startsWith("step ") || id.startsWith("artifact ") ? id : "the sample");

function Connectivity({ connection }: { connection: Connection }) {
  if (connection === "connected") return null;
  if (connection === "checking") return <p className="p2-note" role="status">Connecting to Spark…</p>;
  if (connection === "none") {
    return <p className="ps-offline" role="status"><b>Spark isn&apos;t connected.</b> Run and Check need a real Spark runner, and none is available here. Nothing on this page is simulated.</p>;
  }
  return (
    <p className="ps-offline" role="status">
      <b>Can&apos;t reach the Spark runner.</b> Start it with <code>python3 services/spark-runner/dev_server.py</code>, then reload. Nothing on this page is simulated.
    </p>
  );
}

function CaseView({ c, onLine, entry, label }: { c: PsCase; onLine: (n: number) => void; entry: string; label?: string }) {
  if (c.error) return <SparkError error={c.error} onLine={onLine} />;
  if (c.frames) {
    if (!c.frames.length) return <p className="p2-empty">Nothing to show. Call <code>display(df)</code> to see a DataFrame here.</p>;
    return (
      <>
        {c.frames.map((f, i) => (
          <div key={i} className="ps-frame">
            <div className="p2-data-head"><b>{f.name}</b><span>{f.truncated ? `first ${f.rows.length} of ${f.row_count.toLocaleString("en-US")} rows` : `${f.row_count} rows`}</span></div>
            <Schema fields={f.schema} />
            <DataTable columns={f.schema} rows={f.rows} label={`${f.name}: ${f.row_count} rows`} />
          </div>
        ))}
      </>
    );
  }
  if (!c.schema || !c.rows) return null;
  return (
    <div className="ps-frame">
      <div className="p2-data-head"><b>{entry}() returned{label ? ` · ${label}` : ""}</b><span>{c.truncated ? `first ${c.rows.length} of ${c.row_count?.toLocaleString("en-US")} rows` : `${c.row_count} rows`}</span></div>
      <Schema fields={c.schema} />
      <DataTable columns={c.schema} rows={c.rows} label={`Your result: ${c.row_count} rows`} />
    </div>
  );
}

function RunView({ result, busy, onLine, gradable, entry, caseLabels }: { result: PsRunResult | null; busy: boolean; onLine: (n: number) => void; gradable: boolean; entry: string; caseLabels?: Record<string, string> }) {
  if (busy) return <p className="p2-empty" role="status">Running your code on Spark…</p>;
  if (!result) return <p className="p2-empty">{gradable ? `Press Run to see what ${entry}() returns. Run doesn't grade.` : "Press Run to run your code on Spark. Nothing is graded."}</p>;
  return (
    <div className="ps-run" aria-live="polite">
      {result.error && <SparkError error={result.error} onLine={onLine} />}
      {result.status === "timeout" || result.status === "memory-limit" || result.status === "crashed" ? null : result.cases.map((c) => <CaseView key={c.id} c={c} onLine={onLine} entry={entry} label={caseLabels?.[c.id]} />)}
    </div>
  );
}

function ChecksView({ result, busy, onLine, next, columns, caseLabels }: { result: PsCheckResult | null; busy: boolean; onLine: (n: number) => void; next?: ReactNode; columns: string[]; caseLabels?: Record<string, string> }) {
  if (busy) return <p className="p2-empty" role="status">Checking: running your code on the sample and the hidden cases…</p>;
  if (!result) return <p className="p2-empty">Press Check when you think your code is ready. Check runs it on the sample and on hidden cases, on Spark.</p>;
  const [ok, total] = result.score.split("/").map(Number);
  return (
    <div aria-live="polite">
      <div className={`p2-verdict ${result.passed ? "pass" : "fail"}`}>
        <span className={`p2-mark ${result.passed ? "pass" : "fail"}`} aria-hidden="true">{result.passed ? "✓" : "✗"}</span>
        <div>
          <b>{result.passed ? "All checks pass" : result.error ? "Your code didn't run" : `${ok} of ${total} checks pass`}</b>
          {result.passed && next && <div className="p2-verdict-next">{next}</div>}
        </div>
      </div>
      {result.error && <div style={{ padding: "0 14px" }}><SparkError error={result.error} onLine={onLine} /></div>}
      {!result.error && <CheckRows checks={result.checks} onLine={onLine} columns={columns} caseLabels={caseLabels} />}
    </div>
  );
}
