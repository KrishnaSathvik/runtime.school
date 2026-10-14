"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { Check, CircleStop, Play, RotateCcw, Undo2 } from "lucide-react";
import {
  getPythonFailure,
  getPythonStatus,
  getPythonVersion,
  preloadPython,
  releasePython,
  runPython,
  stopPython,
  subscribePythonStatus,
  packageKey,
  type PyOutputChunk,
  type PyRunResult,
} from "@/engine/python/client";
import { checkPython, type PyGradeReport, type PyTask } from "@/engine/python/grading";
import { Keys, MacOnly } from "@/features/rt/Keys";
import { appendChunk, CheckSummary, ChecksView, ConsoleView, errorLineOf } from "./Output";
import { PyEditor, type PyEditorHandle } from "./PyEditor";
import { Split } from "./Split";

type Busy = null | "run" | "check";

/**
 * Scroll just enough to show `el`: only its own scroll container (the lesson's work column on
 * desktop, the page on phones), allowing for the sticky header and status band, and never past the
 * element's top. scrollIntoView would also move every outer scroller and ignore sticky bars.
 */
function reveal(el: HTMLElement | null) {
  if (!el) return;
  const behavior: ScrollBehavior = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
  let box: HTMLElement | null = el.parentElement;
  while (box && box !== document.body) {
    const oy = getComputedStyle(box).overflowY;
    if ((oy === "auto" || oy === "scroll") && box.scrollHeight > box.clientHeight) break;
    box = box.parentElement;
  }
  const r = el.getBoundingClientRect();
  const gap = 12;
  // The visible window: below the sticky header, above the status band.
  const header = document.querySelector<HTMLElement>(".rx-bar")?.getBoundingClientRect().height ?? 0;
  const status = document.querySelector<HTMLElement>(".rx-status");
  const band = status && getComputedStyle(status).display !== "none" ? status.getBoundingClientRect().height : 0;
  let top = header;
  let bottom = window.innerHeight - band;
  if (box && box !== document.body) {
    // A scroll container can extend past the window (e.g. before the page scrolls): use the visible part.
    const b = box.getBoundingClientRect();
    top = Math.max(top, b.top);
    bottom = Math.min(bottom, b.bottom);
  } else {
    box = null;
  }
  let delta = 0;
  if (r.bottom + gap > bottom) delta = Math.min(r.bottom + gap - bottom, r.top - gap - top);
  else if (r.top - gap < top) delta = r.top - gap - top;
  if (Math.abs(delta) < 1) return;
  if (box) box.scrollBy({ top: delta, behavior });
  else window.scrollBy({ top: delta, behavior });
}
type Panel = "console" | "checks";

export type CodePaneHandle = {
  /** Replace the code as an editor change (e.g. "Put in editor", "Try without help"). */
  setCode: (code: string) => void;
};

/**
 * main.py with Run, Check, Stop and Reset, and the Console / Checks output underneath.
 * Run shows what the program did; Check grades it against the task. Each uses its own fresh
 * interpreter (see engine/python/client.ts). Drafts are controlled by the parent.
 */
export const CodePane = forwardRef<CodePaneHandle, {
  task: PyTask;
  layout?: "workspace" | "cell";
  name?: string;
  footer?: ReactNode;
  minHeight?: string;
  ungraded?: boolean;
  starter: string;
  value: string;
  onChange: (code: string) => void;
  /** Called after every finished Check. Only report.ok means the task was met. */
  onGraded?: (report: PyGradeReport) => void;
  /** Shown above the Checks results after a check (e.g. "Solved without help → next"). */
  checkBanner?: (report: PyGradeReport) => ReactNode;
  /** Storage key for the editor/output divider. */
  splitKey?: string;
  /** Initial share of the editor, 0–1. */
  editorShare?: number;
}>(function CodePane({ task, layout = "workspace", name = "solution.py", footer, minHeight = "clamp(280px, calc(100dvh - 340px), 820px)", ungraded = false, starter, value, onChange, onGraded, checkBanner, splitKey = "runtime-python-split-console", editorShare = 0.58 }, ref) {
  const status = useSyncExternalStore(subscribePythonStatus, getPythonStatus, () => "idle" as const);
  const failure = useSyncExternalStore(subscribePythonStatus, getPythonFailure, () => null);
  const version = useSyncExternalStore(subscribePythonStatus, getPythonVersion, () => null);
  const editor = useRef<PyEditorHandle>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [panel, setPanel] = useState<Panel>("console");
  const [live, setLive] = useState<PyOutputChunk[]>([]);
  const [ran, setRan] = useState<{ result: PyRunResult; code: string } | null>(null);
  const [checked, setChecked] = useState<{ report: PyGradeReport; code: string } | null>(null);
  const [interrupted, setInterrupted] = useState<Busy>(null);
  const [mark, setMark] = useState<{ line: number; token: number } | null>(null);
  const [undo, setUndo] = useState<string | null>(null);
  /** Which button was pressed last: the summary under the controls belongs to Check only. */
  const [outputHidden, setOutputHidden] = useState(false);
  const [last, setLast] = useState<Busy>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const summaryHeading = useRef<HTMLParagraphElement>(null);
  const outRef = useRef<HTMLDivElement>(null);
  const busyRef = useRef<Busy>(null);
  busyRef.current = busy;
  /** True while Reset/Undo/setCode replaces the code, so that change doesn't count as the learner editing. */
  const replacing = useRef(false);
  const replaceCode = (text: string) => {
    replacing.current = true;
    try {
      if (editor.current) editor.current.replaceAll(text);
      else onChange(text);
    } finally {
      replacing.current = false;
    }
  };

  useImperativeHandle(ref, () => ({
    setCode: (code: string) => {
      setUndo(null);
      replaceCode(code);
    },
  }));

  const packages = task.packages;
  const packagesKey = packageKey(packages);
  useEffect(() => {
    preloadPython(packages);
    return () => {
      stopPython();
      releasePython();
    };
    // Re-preload only when the set of libraries changes, not on every new `task` object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packagesKey]);

  const markError = (line: number | null) => setMark(line ? { line, token: Date.now() } : null);

  const run = async () => {
    if (busyRef.current) return;
    const code = value;
    setOutputHidden(false);
    setBusy("run");
    setLast("run");
    setPanel("console");
    setLive([]);
    setRan(null);
    setMark(null);
    setInterrupted(null);
    const r = await runPython(code, { packages, files: task.files, onOutput: (c) => setLive((l) => appendChunk(l, c)) });
    setBusy(null);
    // Another program on the page (e.g. a lesson example) started and replaced this run.
    if (r.status === "superseded") return setInterrupted("run");
    setRan({ result: r, code });
    markError(errorLineOf(r));
  };

  const check = async () => {
    if (ungraded) return;
    if (busyRef.current) return;
    const code = value;
    setOutputHidden(false);
    setBusy("check");
    setLast("check");
    setPanel("checks");
    setChecked(null);
    setMark(null);
    setInterrupted(null);
    const report = await checkPython(task, code);
    setBusy(null);
    if (report.outcome === "superseded") return setInterrupted("check");
    setChecked({ report, code });
    markError(errorLineOf(report));
    onGraded?.(report);
  };

  // When a check finishes, bring its summary into view (only as far as needed) and keep focus sensible.
  useEffect(() => {
    if (!checked) return;
    reveal(summaryRef.current);
    // The Check button is disabled while checking, so some browsers drop focus to the page; give it a home.
    const active = document.activeElement;
    if (!active || active === document.body) summaryHeading.current?.focus({ preventScroll: true });
  }, [checked]);

  const showAllChecks = () => {
    setPanel("checks");
    reveal(outRef.current);
  };

  const reset = () => {
    if (value === starter) return;
    setUndo(value);
    replaceCode(starter);
    setMark(null);
  };

  const retry = () => {
    releasePython();
    preloadPython(packages);
  };

  const goTo = (line: number) => editor.current?.goToLine(line);
  const starting = busy !== null && status === "loading";
  const stateText =
    status === "failed"
      ? "Python failed to load"
      : busy === "run"
        ? starting ? "Starting Python…" : "Running…"
        : busy === "check"
          ? starting ? "Starting Python…" : "Checking…"
          : status === "loading"
            ? version ? "Preparing a fresh Python…" : "Loading Python…"
            : status === "ready"
              ? "Python ready"
              : "Loading Python…"; // idle only before the mount effect starts loading

  if (layout === "cell") return <div className="rx-cell py-task-cell">
    <div className="rx-cell-head"><span className="name">{name}</span><span className="acts" aria-hidden="true"><MacOnly><Keys keys={["mod", "enter"]} /><span>run</span>{!ungraded && <><Keys keys={["mod", "shift", "enter"]} /><span>check</span></>}</MacOnly></span></div>
    <PyEditor ref={editor} value={value} onChange={onChange} onRun={() => void run()} onCheck={() => void check()} label={name} errorLine={mark} minHeight={minHeight} />
    <div className="rx-cell-foot">
      <span className="hint">{(last === 'check' ? checked?.code : ran?.code) !== undefined && (last === 'check' ? checked?.code : ran?.code) !== value ? 'edited since the last run' : ' '}</span>
      {footer}
      {busy ? <button className="rx-btn" onClick={stopPython}><CircleStop size={14} />Stop</button> : <button className="rx-btn" onClick={() => void run()} disabled={status === 'failed'}><Play size={13} />Run</button>}
      {!ungraded && <button className="rx-btn primary" disabled={busy !== null || status === 'failed'} onClick={() => void check()}><Check size={14} />{busy === 'check' ? 'Checking…' : 'Check'}</button>}
    </div>
    {status === 'failed' && <p className="rx-feedback bad" role="alert">{failure} <button className="rx-btn" onClick={retry}>Retry</button></p>}
    {(busy || checked || ran || interrupted) && <div className="py-cell-output" ref={summaryRef}>
      <div className="rx-out-meta"><span>{last === 'check' ? 'checks' : 'output'}</span><span className="acts"><button className="rx-btn ghost" onClick={() => setOutputHidden(!outputHidden)}>{outputHidden ? 'Show' : 'Hide'}</button><button className="rx-btn ghost" disabled={busy !== null} onClick={() => {setChecked(null);setRan(null);setInterrupted(null);}}>Close</button></span></div>
      {!outputHidden && <div className="py-cell-results" ref={outRef}>
        {interrupted && <p className="rx-feedback">The run was interrupted. Try again.</p>}
        {last === 'check' ? <><ChecksView busy={busy === 'check'} checked={checked} edited={!!checked && checked.code !== value} onLine={goTo} />{checked && checkBanner?.(checked.report)}</> : <ConsoleView busy={busy === 'run'} live={live} ran={ran} edited={!!ran && ran.code !== value} onLine={goTo} />}
      </div>}
    </div>}
  </div>;

  return (
    <Split
      direction="rows"
      storageKey={splitKey}
      label="Resize code and output"
      initial={editorShare}
      min={0.25}
      max={0.82}
      className="py-work-split"
      first={
        <div className="py-code">
          <div className="py-code-head">
            <span className="py-file" aria-hidden="true">main.py</span>
            <span className={`py-state ${status === "failed" ? "bad" : busy || status === "loading" ? "busy" : ""}`} role="status" aria-live="polite">
              <span className="dot" aria-hidden="true" />
              {stateText}
              {status === "ready" && version && !busy ? <span className="v"> · Pyodide {version}</span> : null}
            </span>
            {status === "failed" && <button type="button" className="rx-btn" onClick={retry}>Retry</button>}
          </div>
          <PyEditor
            ref={editor}
            value={value}
            onChange={(v) => {
              if (!replacing.current) setUndo(null);
              onChange(v);
            }}
            onRun={() => void run()}
            onCheck={() => void check()}
            label="main.py, Python code editor. Press Escape, then Tab, to leave the editor."
            errorLine={mark}
            height="100%"
          />
          <div className="py-actions">
            <MacOnly>
              <span className="py-hint" aria-hidden="true">
                <Keys keys={["mod", "enter"]} /> run{!ungraded && <> · <Keys keys={["mod", "shift", "enter"]} /> check</>}<span className="py-hint-esc"> · <Keys keys={["esc"]} /> then Tab leaves the editor</span>
              </span>
            </MacOnly>
            {undo !== null ? (
              <button type="button" className="rx-btn ghost" onClick={() => { replaceCode(undo); setUndo(null); }}>
                <Undo2 size={13} /> Undo reset
              </button>
            ) : (
              <button type="button" className="rx-btn ghost" onClick={reset} disabled={value === starter} title="Put the starter code back">
                <RotateCcw size={13} /> Reset
              </button>
            )}
            {busy ? (
              <button type="button" className="rx-btn" onClick={stopPython}>
                <CircleStop size={14} /> Stop
              </button>
            ) : (
              <button type="button" className="rx-btn" onClick={() => void run()} disabled={status === "failed"}>
                <Play size={13} /> Run code
              </button>
            )}
            {!ungraded && <button type="button" className="rx-btn primary" onClick={() => void check()} disabled={busy !== null || status === "failed"}>
              <Check size={14} /> {busy === "check" ? "Checking…" : "Check answer"}
            </button>}
          </div>
          <div ref={summaryRef} className="py-summary-wrap" aria-live="polite" aria-atomic="true">
            {last === "check" && busy === "check" && <p className="py-summary-busy">Checking your program from a fresh start…</p>}
            {last === "check" && !busy && checked && (
              <CheckSummary
                report={checked.report}
                edited={checked.code !== value}
                onLine={goTo}
                onAll={showAllChecks}
                banner={checkBanner?.(checked.report)}
                headingRef={summaryHeading}
              />
            )}
          </div>
          {undo !== null && <p className="py-undo-note" role="status">Starter code restored. Your previous code can still be brought back with Undo reset.</p>}
          {status === "failed" && failure && <p className="py-fail" role="alert">{failure} Your code is safe; press Retry to load Python again.</p>}
        </div>
      }
      second={
        <div className="py-out" ref={outRef}>
          <div className="py-out-tabs" role="tablist" aria-label="Output">
            <button type="button" role="tab" id="py-tab-console" aria-controls="py-panel-console" aria-selected={panel === "console"} onClick={() => setPanel("console")}>
              Console
            </button>
            {!ungraded && <button type="button" role="tab" id="py-tab-checks" aria-controls="py-panel-checks" aria-selected={panel === "checks"} onClick={() => setPanel("checks")}>
              Checks
              {checked && <span className={`py-count ${checked.report.ok ? "ok" : "bad"}`}>{checked.report.passed}/{checked.report.total}</span>}
            </button>}
          </div>
          <div id="py-panel-console" role="tabpanel" aria-labelledby="py-tab-console" hidden={panel !== "console"} className="py-panel">
            {interrupted === "run" && <p className="py-meta">Another program on this page started, so this run was stopped. Run it again when you&apos;re ready.</p>}
            <ConsoleView busy={busy === "run"} live={live} ran={ran} edited={!!ran && ran.code !== value} onLine={goTo} />
          </div>
          <div id="py-panel-checks" role="tabpanel" aria-labelledby="py-tab-checks" hidden={panel !== "checks"} className="py-panel">
            {interrupted === "check" && <p className="py-meta">Another program on this page started, so this check was stopped before it finished. Nothing was graded; check again when you&apos;re ready.</p>}
            <ChecksView busy={busy === "check"} checked={checked} edited={!!checked && checked.code !== value} onLine={goTo} />
          </div>
        </div>
      }
    />
  );
});
