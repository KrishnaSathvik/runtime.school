"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { Play, RotateCcw, Square, Check } from "lucide-react";
import {
  getPythonStatus,
  preloadMounts,
  preloadPython,
  runPython,
  stopPython,
  subscribePythonStatus,
  type PyMount,
  type PyOutputChunk,
  type PyPackage,
  type PyRunResult,
} from "@/engine/python/client";
import { gradePython, probeFor, type PyGradeReport, type PyTask } from "@/engine/python/grading";
import { PyEditor, type PyEditorHandle } from "@/features/py/PyEditor";
import { Keys } from "@/features/rt/Keys";
import { Code } from "./Code";
import { ChecksView, ConsoleView, ErrorsView, errorLineOf, errorFileOf, FilesView, OnlyView } from "./Results";
import { readsCsv } from "./feedback";

export type WbFile = { name: string; value: string; onChange?: (v: string) => void; readOnly?: boolean };

/**
 * The Python workbench (plan §8): file tabs, editor, Run / Stop / Check / Reset, and results.
 * The program that runs is `main` (default: the first editable file). Every other tab is placed next to it.
 * Run never grades. Check runs the program again from a fresh start and judges it (src/engine/python/grading.ts).
 */
export function Workbench({
  label,
  files,
  main,
  task,
  packages = [],
  mounts = [],
  stdin,
  dataTab,
  onChecked,
  onReset,
  resetFiles,
  resetVersion = 0,
  resetLabel = "Reset",
  help,
  checkLabel = "Check",
  status,
  initialTab,
  layout = "stack",
  toolbarNote,
  resultTabs = "basic",
  onResult,
  next,
}: {
  label: string;
  files: WbFile[];
  main?: string;
  task?: PyTask;
  packages?: readonly PyPackage[];
  mounts?: readonly PyMount[];
  stdin?: string;
  /** Extra read-only tab describing mounted data (e.g. a file list). */
  dataTab?: { label: string; content: ReactNode };
  onChecked?: (report: PyGradeReport, code: Record<string, string>) => void;
  onReset?: () => void;
  resetFiles?: Record<string, string>;
  resetVersion?: number;
  resetLabel?: string;
  /** Hint / Answer controls, shown on the left of the action bar. */
  help?: ReactNode;
  checkLabel?: string;
  /** Shown under the results (e.g. how mastery works). */
  status?: ReactNode;
  /** The tab to open first (default: the program file). Projects open on the file the milestone is about. */
  initialTab?: string;
  /** "columns": editor and results side by side at full height (the Playground). Default: results under the editor. */
  layout?: "stack" | "columns";
  /** Shown in the results header (e.g. which libraries and data the run uses). */
  toolbarNote?: ReactNode;
  /** "split" adds Tables, Charts and Errors tabs next to Output and Files (the Playground). */
  resultTabs?: "basic" | "split";
  /** Called with every finished run (e.g. to export the files it wrote). */
  onResult?: (r: PyRunResult) => void;
  /** Where to go after a passing check (next challenge, question or step), shown in the passing verdict. */
  next?: ReactNode;
}) {
  const mainName = main ?? files.find((f) => !f.readOnly)?.name ?? files[0].name;
  const [tab, setTab] = useState(initialTab ?? mainName);
  const visibleTab = useRef(tab);
  visibleTab.current = tab;
  const [panel, setPanel] = useState<"console" | "checks" | "files" | "tables" | "charts" | "errors">("console");
  const [live, setLive] = useState<PyOutputChunk[]>([]);
  const [ran, setRan] = useState<PyRunResult | null>(null);
  const [report, setReport] = useState<PyGradeReport | null>(null);
  const [runSnapshot, setRunSnapshot] = useState<string | null>(null);
  const [checkSnapshot, setCheckSnapshot] = useState<string | null>(null);
  const [markSnapshot, setMarkSnapshot] = useState<string | null>(null);
  const [busy, setBusy] = useState<"run" | "check" | null>(null);
  const [errorMark, setErrorMark] = useState<{ line: number; token: number; file: string } | null>(null);
  const editors = useRef<Record<string, PyEditorHandle | null>>({});
  const actionsRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  // Bumped when a run or check this learner started finishes: its result is then scrolled into view.
  const [revealed, setRevealed] = useState(0);
  useEffect(() => {
    if (!revealed || layout !== "stack") return;
    const frame = requestAnimationFrame(() => revealResults(resultsRef.current, actionsRef.current));
    return () => cancelAnimationFrame(frame);
  }, [revealed, layout]);
  const resetSeen = useRef(resetVersion);
  const [resetBackup, setResetBackup] = useState<Record<string, string> | null>(null);
  useLayoutEffect(() => {
    if (resetSeen.current === resetVersion) return;
    resetSeen.current = resetVersion;
    if (!resetFiles) return;
    setResetBackup(Object.fromEntries(files.filter(f => !f.readOnly).map(f => [f.name, f.value])));
    for (const f of files) {
      if (!f.readOnly && resetFiles[f.name] !== undefined) editors.current[f.name]?.replaceAll(resetFiles[f.name]);
    }
    setRan(null); setReport(null); setLive([]); setErrorMark(null);
    editors.current[tab]?.focus();
  }, [resetVersion, resetFiles, files, tab]);
  const operation = useRef<symbol | null>(null);
  const [interrupted, setInterrupted] = useState(false);
  useEffect(() => () => {
    const owned = operation.current;
    operation.current = null;
    if (owned) stopPython(owned);
  }, []);
  const pyStatus = useSyncExternalStore(subscribePythonStatus, getPythonStatus, () => "idle" as const);
  const pkgKey = packages.join(",");
  const mountKey = mounts.map((m) => m.sha256).join(",");

  useEffect(() => {
    preloadPython(packages);
    preloadMounts(mounts);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by content, not identity
  }, [pkgKey, mountKey]);

  const current = files.find((f) => f.name === tab) ?? files[0];
  const others = useMemo(() => Object.fromEntries(files.filter((f) => f.name !== mainName).map((f) => [f.name, f.value])), [files, mainName]);
  const code = files.find((f) => f.name === mainName)?.value ?? "";
  // Include every submitted file and input, not just the currently selected editor.
  const sourceSnapshot = JSON.stringify({
    main: mainName, files: Object.entries({ ...task?.files, ...Object.fromEntries(files.map(f => [f.name, f.value])) }).sort(([a], [b]) => a.localeCompare(b)),
    stdin: stdin ?? task?.stdin ?? "", checkStdin: task?.stdin ?? "", packages: [...packages].sort(), mounts: mounts.map(m => [m.path, m.sha256]),
  });
  const latestSnapshot = useRef(sourceSnapshot);
  latestSnapshot.current = sourceSnapshot;
  const runStale = runSnapshot !== null && runSnapshot !== sourceSnapshot;
  const checkStale = checkSnapshot !== null && checkSnapshot !== sourceSnapshot;


  const mark = (r: PyRunResult | PyGradeReport | null) => {
    const line = errorLineOf(r);
    const file = errorFileOf(r);
    const target = file ? files.find(f => f.name === file || f.name === file.replace(/^.*[\\/]/, ""))?.name : mainName;
    setErrorMark(line && target ? { line, token: Date.now(), file: target } : null);
  };

  async function run() {
    if (operation.current) return;
    const owned = Symbol("workbench-run");
    operation.current = owned;
    setBusy("run");
    setInterrupted(false);
    setPanel("console");
    setLive([]);
    setRan(null);
    setRunSnapshot(sourceSnapshot);
    try {
      const r = await runPython(code, {
        operation: owned, packages, mounts, stdin: stdin ?? task?.stdin, echoInput: true,
        files: { ...task?.files, ...others },
        onOutput: (c) => {
          if (operation.current !== owned) return;
          setLive((l) => {
            const last = l.at(-1);
            return last && last.stream === c.stream && (c.stream === "stdout" || c.stream === "stderr") ? [...l.slice(0, -1), { ...last, text: last.text + c.text }] : [...l, c];
          });
        },
      });
      if (operation.current !== owned) return;
      if (r.status === "superseded") { setInterrupted(true); return; }
      setRan(r);
      if (latestSnapshot.current === sourceSnapshot) { mark(r); setMarkSnapshot(sourceSnapshot); }
      setRevealed((n) => n + 1);
      onResult?.(r);
    } catch (error) {
      if (operation.current === owned) setRan({ status: "crashed", message: error instanceof Error ? error.message : String(error), stdout: "", stderr: "", output: [] });
    } finally {
      if (operation.current === owned) { operation.current = null; setBusy(null); }
    }
  }

  async function check() {
    if (!task || operation.current) return;
    const owned = Symbol("workbench-check");
    operation.current = owned;
    setBusy("check");
    setInterrupted(false);
    setPanel("checks");
    // Same probe and evaluator as checkPython, with cancellation owned by this invocation.
    const submitted = { ...task, packages, mounts, files: { ...task.files, ...others } };
    try {
      const result = await runPython(code, { operation: owned, probe: probeFor(submitted), stdin: submitted.stdin, timeoutMs: submitted.timeoutMs, packages: submitted.packages, files: submitted.files, mounts: submitted.mounts });
      if (operation.current !== owned) return;
      if (result.status === "superseded") { setInterrupted(true); return; }
      const r = gradePython(submitted, result);
      setReport(r);
      setCheckSnapshot(sourceSnapshot);
      if (latestSnapshot.current === sourceSnapshot) { mark(r); setMarkSnapshot(sourceSnapshot); }
      setRevealed((n) => n + 1);
      if (result.status !== "stopped") onChecked?.(r, { [mainName]: code, ...others });
    } catch (error) {
      if (operation.current === owned) {
        setReport(gradePython(submitted, { status: "crashed", message: error instanceof Error ? error.message : String(error), stdout: "", stderr: "", output: [] }));
        setCheckSnapshot(sourceSnapshot);
      }
    } finally {
      if (operation.current === owned) { operation.current = null; setBusy(null); }
    }
  }

  const goToLine = (n: number, file?: string) => {
    const target = file ? files.find(f => f.name === file || f.name === file.replace(/^.*[\\/]/, ""))?.name : mainName;
    if (!target) return;
    setTab(target);
    requestAnimationFrame(() => {
      if (visibleTab.current === target) editors.current[target]?.goToLine(n);
    });
  };

  const filesOut = ran && "files" in ran ? ran.files ?? [] : [];
  const chunks = ran && "output" in ran ? ran.output : live;
  const count = (k: "table" | "figure") => chunks.filter((c) => c.stream === k).length;
  const failed = !!ran && ran.status !== "ok" && ran.status !== "superseded";
  const fileNames = files.map((f) => f.name);
  const csv = readsCsv({ files: task?.files, mounts: [...(task?.mounts ?? []), ...mounts] }, fileNames);
  const Wrap = layout === "columns" ? "div" : Frag;
  return (
    <Wrap {...(layout === "columns" ? { className: "p2-wb-cols" } : {})}>
      <div className="p2-bench">
        <div className="p2-bench-bar">
          <div className="p2-files" role="tablist" aria-label="Files">
            {files.map((f) => (
              <button key={f.name} type="button" role="tab" aria-selected={tab === f.name} onClick={() => setTab(f.name)}>
                {f.name} {f.readOnly && <i className="p2-ro">read-only</i>}
              </button>
            ))}
            {dataTab && (
              <button type="button" role="tab" aria-selected={tab === "__data"} onClick={() => setTab("__data")}>
                {dataTab.label} <i className="p2-ro">read-only</i>
              </button>
            )}
          </div>
          {files.length + (dataTab ? 1 : 0) <= 2 && <div className="p2-keys" aria-hidden="true">
            <Keys keys={["mod", "enter"]} /> run{task && <> · <Keys keys={["shift", "mod", "enter"]} /> check</>}
          </div>}
        </div>
        {tab === "__data" && dataTab && <div className="p2-readonly" style={{ whiteSpace: "normal" }}>{dataTab.content}</div>}
        {current.readOnly && tab !== "__data" && (current.name.endsWith(".py")
          ? <Code code={current.value} label={`${current.name} (read-only)`} className="p2-readonly" />
          : <pre className="p2-readonly" tabIndex={0} aria-label={`${current.name} (read-only)`}>{current.value}</pre>)}
        {files.filter(f => !f.readOnly).map(f => (
          <div key={f.name} hidden={tab !== f.name} style={tab === f.name ? { display: "contents" } : undefined}>
            <PyEditor
              ref={handle => { editors.current[f.name] = handle; }}
              value={f.value}
              onChange={v => f.onChange?.(v)}
              onRun={() => { if (tab === f.name) void run(); }}
              onCheck={() => { if (tab === f.name) void (task ? check() : run()); }}
              label={`${label}: ${f.name}`}
              errorLine={markSnapshot === sourceSnapshot && f.name === errorMark?.file ? errorMark : null}
              minHeight="180px"
              placeholder="Write your Python here"
            />
          </div>
        ))}
        <div className="p2-actions" ref={actionsRef}>
          <div>
            {onReset && (
              <button type="button" className="p2-btn" onClick={onReset} disabled={!!busy}>
                <RotateCcw size={14} aria-hidden="true" /> {resetLabel}
              </button>
            )}
            {resetBackup && <button type="button" className="p2-btn" disabled={!!busy} onClick={() => {
              for (const [name, text] of Object.entries(resetBackup)) editors.current[name]?.replaceAll(text);
              setResetBackup(null); editors.current[tab]?.focus();
            }}>Undo Reset</button>}
            {help}
          </div>
          <div>
            {pyStatus === "loading" && busy && <span className="p2-note" role="status">Starting Python…</span>}
            {busy ? (
              <button type="button" className="p2-btn line" onClick={() => { if (operation.current) stopPython(operation.current); }}>
                <Square size={13} aria-hidden="true" /> Stop
              </button>
            ) : (
              <button type="button" className="p2-btn line" onClick={run} disabled={!!busy}>
                <Play size={14} aria-hidden="true" /> Run
              </button>
            )}
            {task && (
              <button type="button" className="p2-btn primary" onClick={check} disabled={!!busy}>
                <Check size={14} aria-hidden="true" /> {checkLabel}
              </button>
            )}
          </div>
        </div>
      </div>
      {interrupted && <p className="p2-note" role="status">Another program on this page started, so this run was stopped. Run or check it again.</p>}
      {layout === "stack" && status}

      <div className="p2-results" ref={resultsRef}>
        <div className="p2-tabs" role="tablist" aria-label="Results">
          <button type="button" role="tab" aria-selected={panel === "console"} onClick={() => setPanel("console")}>{layout === "columns" ? "Output" : "Console"}</button>
          {task && <button type="button" role="tab" aria-selected={panel === "checks"} onClick={() => setPanel("checks")}>Checks</button>}
          {resultTabs === "split" && (
            <>
              <button type="button" role="tab" aria-selected={panel === "tables"} onClick={() => setPanel("tables")}>Tables{count("table") ? ` · ${count("table")}` : ""}</button>
              <button type="button" role="tab" aria-selected={panel === "charts"} onClick={() => setPanel("charts")}>Charts{count("figure") ? ` · ${count("figure")}` : ""}</button>
            </>
          )}
          <button type="button" role="tab" aria-selected={panel === "files"} onClick={() => setPanel("files")}>Files{filesOut.length ? ` · ${filesOut.length}` : ""}</button>
          {resultTabs === "split" && (
            <button type="button" role="tab" aria-selected={panel === "errors"} onClick={() => setPanel("errors")} className={failed ? "p3-tab-bad" : undefined}>Errors{failed ? " · 1" : ""}</button>
          )}
        </div>
        {toolbarNote && panel === "console" && <div className="p2-results-note">{toolbarNote}</div>}
        {report && checkStale && panel === "checks" && <p className="p2-note" role="status">Previous check — code changed</p>}
        {ran && runStale && panel !== "checks" && <p className="p2-note" role="status">Previous run — code changed</p>}
        {panel === "console" && <ConsoleView live={live} result={ran} busy={busy === "run"} onLine={runStale ? undefined : goToLine} csv={csv} />}
        {panel === "checks" && <ChecksView report={report} busy={busy === "check"} onLine={checkStale ? undefined : goToLine} task={task ? { ...task, mounts: [...(task.mounts ?? []), ...mounts] } : undefined} fileNames={fileNames} next={checkStale ? undefined : next} />}
        {panel === "files" && <FilesView files={filesOut} empty={!ran && report ? "Check runs your program on its own. Press Run to see the files it writes here." : undefined} />}
        {panel === "tables" && <OnlyView chunks={chunks} kind="table" />}
        {panel === "charts" && <OnlyView chunks={chunks} kind="figure" />}
        {panel === "errors" && <ErrorsView result={ran} onLine={runStale ? undefined : goToLine} csv={csv} />}
      </div>
    </Wrap>
  );
}

/**
 * Bring a finished result into view in whatever scrolls it (the work pane on desktop, the page on phones): enough to
 * read the verdict and the first failing check, scrolling no further than keeps Run / Check on screen. Never moves focus.
 */
export function revealResults(results: HTMLElement | null, actions: HTMLElement | null) {
  if (!results?.isConnected) return;
  let owner: HTMLElement | null = results.parentElement;
  while (owner && !/(auto|scroll)/.test(getComputedStyle(owner).overflowY)) owner = owner.parentElement;
  const page = !owner || owner === document.body || owner === document.documentElement;
  const header = document.querySelector<HTMLElement>(".rx-bar");
  const view = page ? { top: header && getComputedStyle(header).position !== "static" ? header.getBoundingClientRect().bottom : 0, bottom: window.innerHeight } : owner!.getBoundingClientRect();
  const r = results.getBoundingClientRect();
  const fail = [...results.querySelectorAll<HTMLElement>(".p2-check")].find((c) => c.querySelector(".p2-mark.fail"));
  const end = (fail ?? results.querySelector<HTMLElement>(".p2-verdict") ?? results).getBoundingClientRect().bottom;
  const want = Math.min(end, r.top + (view.bottom - view.top) * 0.6, r.bottom) + 16;
  let delta = want - view.bottom;
  if (delta <= 0) return;
  // Keep Run / Check (and the end of the code above them) on screen.
  if (actions) delta = Math.min(delta, actions.getBoundingClientRect().top - view.top - 12);
  if (delta <= 0) return;
  const behavior: ScrollBehavior = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
  if (page) window.scrollBy?.({ top: delta, behavior });
  else if (typeof owner!.scrollBy === "function") owner!.scrollBy({ top: delta, behavior });
  else owner!.scrollTop += delta;
}

function Frag({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
