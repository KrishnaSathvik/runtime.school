"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
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
  type PyOutputChunk,
  type PyRunResult,
  type PySyntaxError,
} from "@/engine/python/client";
import { checkPython, type PyCheckOutcome, type PyGradeReport, type PyTask } from "@/engine/python/grading";
import { Keys, MacOnly } from "@/features/rt/Keys";
import { PyEditor, type PyEditorHandle } from "./PyEditor";
import { Split } from "./Split";

export type PyExercise = {
  id: string;
  title: string;
  /** Short context line above the title, e.g. "foundations · practice". */
  kicker?: string;
  prompt: ReactNode;
  requirements: ReactNode[];
  /** Plain-language list of what Check Answer verifies. */
  checking: ReactNode[];
  starter: string;
  task: PyTask;
};

type Busy = null | "run" | "check";
type Panel = "console" | "checks";

function appendChunk(list: PyOutputChunk[], c: PyOutputChunk): PyOutputChunk[] {
  const last = list.at(-1);
  if (last && last.stream === c.stream) return [...list.slice(0, -1), { ...last, text: last.text + c.text }];
  return [...list, c];
}

function errorLineOf(r: PyRunResult | PyGradeReport | null): number | null {
  if (!r) return null;
  if ("outcome" in r) {
    if (r.error?.line) return r.error.line;
    return r.checks.find((c) => c.status === "fail" && c.line)?.line ?? null;
  }
  return r.status === "syntax-error" || r.status === "runtime-error" ? r.error.line : null;
}

/**
 * The Python learning workspace: task on the left; main.py, Run/Check/Stop/Reset and the
 * Console and Checks on the right. Run shows what the program did; Check shows whether it
 * meets the exercise. Each uses its own fresh interpreter (see engine/python/client.ts).
 */
export function PythonWorkspace({
  exercise,
  value,
  onChange,
  onGraded,
  footer,
}: {
  exercise: PyExercise;
  value: string;
  onChange: (code: string) => void;
  /** Called after every finished Check. Only report.ok means the exercise was met. */
  onGraded?: (report: PyGradeReport) => void;
  /** Extra controls under the task (hints, answer…) for later milestones. */
  footer?: ReactNode;
}) {
  const status = useSyncExternalStore(subscribePythonStatus, getPythonStatus, () => "idle" as const);
  const failure = useSyncExternalStore(subscribePythonStatus, getPythonFailure, () => null);
  const version = useSyncExternalStore(subscribePythonStatus, getPythonVersion, () => null);
  const editor = useRef<PyEditorHandle>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [panel, setPanel] = useState<Panel>("console");
  const [live, setLive] = useState<PyOutputChunk[]>([]);
  const [ran, setRan] = useState<{ result: PyRunResult; code: string } | null>(null);
  const [checked, setChecked] = useState<{ report: PyGradeReport; code: string } | null>(null);
  const [mark, setMark] = useState<{ line: number; token: number } | null>(null);
  const [undo, setUndo] = useState<string | null>(null);
  const busyRef = useRef<Busy>(null);
  busyRef.current = busy;
  /** True while Reset/Undo replaces the code, so that change doesn't count as the learner editing. */
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

  useEffect(() => {
    preloadPython();
    return () => {
      stopPython();
      releasePython();
    };
  }, []);

  const markError = (line: number | null) => setMark(line ? { line, token: Date.now() } : null);

  const run = async () => {
    if (busyRef.current) return;
    const code = value;
    setBusy("run");
    setPanel("console");
    setLive([]);
    setRan(null);
    setMark(null);
    const r = await runPython(code, { onOutput: (c) => setLive((l) => appendChunk(l, c)) });
    if (r.status === "superseded") return;
    setBusy(null);
    setRan({ result: r, code });
    markError(errorLineOf(r));
  };

  const check = async () => {
    if (busyRef.current) return;
    const code = value;
    setBusy("check");
    setPanel("checks");
    setChecked(null);
    setMark(null);
    const report = await checkPython(exercise.task, code);
    if (report.outcome === "superseded") return;
    setBusy(null);
    setChecked({ report, code });
    markError(errorLineOf(report));
    onGraded?.(report);
  };

  const reset = () => {
    if (value === exercise.starter) return;
    setUndo(value);
    replaceCode(exercise.starter);
    setMark(null);
  };

  const retry = () => {
    releasePython();
    preloadPython();
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

  return (
    <div className="py-ws">
      <Split
        direction="columns"
        storageKey="runtime-python-split-task"
        label="Resize task and code"
        initial={0.38}
        min={0.24}
        max={0.6}
        className="py-ws-split"
        first={
          <section className="py-task" aria-labelledby="py-task-title">
            {exercise.kicker && <p className="rx-prompt-line"><b>python</b> {exercise.kicker}</p>}
            <h1 id="py-task-title" className="py-task-title">{exercise.title}</h1>
            <p className="rx-label sec">your task</p>
            <div className="py-prompt">{exercise.prompt}</div>
            <p className="rx-label sec">requirements</p>
            <ul className="py-list">{exercise.requirements.map((r, i) => <li key={i}>{r}</li>)}</ul>
            <p className="rx-label sec">what check answer verifies</p>
            <ul className="py-list">{exercise.checking.map((r, i) => <li key={i}>{r}</li>)}</ul>
            {footer}
          </section>
        }
        second={
          <section className="py-work" aria-label="Your code">
            <Split
              direction="rows"
              storageKey="runtime-python-split-console"
              label="Resize code and output"
              initial={0.58}
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
                    {status === "failed" && (
                      <button type="button" className="rx-btn" onClick={retry}>Retry</button>
                    )}
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
                    label="main.py, Python code editor"
                    errorLine={mark}
                    height="100%"
                  />
                  <div className="py-actions">
                    <MacOnly>
                      <span className="py-hint" aria-hidden="true">
                        <Keys keys={["mod", "enter"]} /> run · <Keys keys={["mod", "shift", "enter"]} /> check · <Keys keys={["esc"]} /> then Tab leaves the editor
                      </span>
                    </MacOnly>
                    {undo !== null ? (
                      <button type="button" className="rx-btn ghost" onClick={() => { replaceCode(undo); setUndo(null); }}>
                        <Undo2 size={13} /> Undo reset
                      </button>
                    ) : (
                      <button type="button" className="rx-btn ghost" onClick={reset} disabled={value === exercise.starter} title="Put the starter code back">
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
                    <button type="button" className="rx-btn primary" onClick={() => void check()} disabled={busy !== null || status === "failed"}>
                      <Check size={14} /> {busy === "check" ? "Checking…" : "Check answer"}
                    </button>
                  </div>
                  {undo !== null && <p className="py-undo-note" role="status">Starter code restored. Your previous code can still be brought back with Undo reset.</p>}
                  {status === "failed" && failure && <p className="py-fail" role="alert">{failure} Your code is safe; press Retry to load Python again.</p>}
                </div>
              }
              second={
                <div className="py-out">
                  <div className="py-out-tabs" role="tablist" aria-label="Output">
                    <button type="button" role="tab" id="py-tab-console" aria-controls="py-panel-console" aria-selected={panel === "console"} onClick={() => setPanel("console")}>
                      Console
                    </button>
                    <button type="button" role="tab" id="py-tab-checks" aria-controls="py-panel-checks" aria-selected={panel === "checks"} onClick={() => setPanel("checks")}>
                      Checks
                      {checked && <span className={`py-count ${checked.report.ok ? "ok" : "bad"}`}>{checked.report.passed}/{checked.report.total}</span>}
                    </button>
                  </div>
                  <div id="py-panel-console" role="tabpanel" aria-labelledby="py-tab-console" hidden={panel !== "console"} className="py-panel">
                    <ConsoleView busy={busy === "run"} live={live} ran={ran} edited={!!ran && ran.code !== value} onLine={goTo} />
                  </div>
                  <div id="py-panel-checks" role="tabpanel" aria-labelledby="py-tab-checks" hidden={panel !== "checks"} className="py-panel">
                    <ChecksView busy={busy === "check"} checked={checked} edited={!!checked && checked.code !== value} onLine={goTo} />
                  </div>
                </div>
              }
            />
          </section>
        }
      />
    </div>
  );
}

function LineButton({ line, onLine }: { line: number | null | undefined; onLine: (n: number) => void }) {
  if (!line) return null;
  return (
    <button type="button" className="py-line" onClick={() => onLine(line)}>
      line {line}
    </button>
  );
}

function SyntaxBlock({ e, onLine }: { e: PySyntaxError; onLine: (n: number) => void }) {
  const caret = e.column && e.text ? " ".repeat(Math.max(0, e.column - 1)) + "^" : null;
  return (
    <div className="py-err">
      <p className="py-err-head">
        <b>{e.type}</b>: {e.message} <LineButton line={e.line} onLine={onLine} />
      </p>
      {e.text && (
        <pre className="py-err-src" aria-label={`Line ${e.line ?? ""} of your code`}>
          {e.text}
          {caret && <>{"\n"}<span className="caret">{caret}</span></>}
        </pre>
      )}
      <p className="py-err-note">Python couldn&apos;t read your code, so none of it ran.</p>
    </div>
  );
}

function RuntimeBlock({ type, message, line, traceback, onLine }: { type: string; message: string; line: number | null | undefined; traceback?: string; onLine: (n: number) => void }) {
  return (
    <div className="py-err">
      <p className="py-err-head">
        <b>{type}</b>{message ? `: ${message}` : ""} <LineButton line={line} onLine={onLine} />
      </p>
      {traceback && <pre className="py-err-src">{traceback}</pre>}
    </div>
  );
}

function Stream({ chunks }: { chunks: PyOutputChunk[] }) {
  return (
    <pre className="py-stream">
      {chunks.map((c, i) => <span key={i} className={c.stream}>{c.text}</span>)}
    </pre>
  );
}

function ConsoleView({
  busy,
  live,
  ran,
  edited,
  onLine,
}: {
  busy: boolean;
  live: PyOutputChunk[];
  ran: { result: PyRunResult; code: string } | null;
  edited: boolean;
  onLine: (n: number) => void;
}) {
  const r = ran?.result;
  const chunks = r && "output" in r ? r.output : live;
  return (
    <div className="py-console" role="log" aria-live="polite" aria-label="Console">
      <p className="py-panel-note">What your program printed when you pressed Run. Run doesn&apos;t grade anything.</p>
      {!r && !busy && <p className="py-empty">Press Run code to see what your program does.</p>}
      {(chunks.length > 0 || busy) && <Stream chunks={chunks} />}
      {busy && <p className="py-meta">running…</p>}
      {r && <RunEnd r={r} onLine={onLine} empty={chunks.length === 0} />}
      {r && edited && <p className="py-meta">You&apos;ve edited the code since this run.</p>}
    </div>
  );
}

function RunEnd({ r, onLine, empty }: { r: PyRunResult; onLine: (n: number) => void; empty: boolean }) {
  switch (r.status) {
    case "ok":
      return <p className="py-meta ok">{empty ? "Program finished without printing anything." : "Program finished."}</p>;
    case "syntax-error":
      return <SyntaxBlock e={r.error} onLine={onLine} />;
    case "runtime-error":
      return (
        <>
          <RuntimeBlock type={r.error.type} message={r.error.message} line={r.error.line} traceback={r.error.traceback} onLine={onLine} />
          <p className="py-err-note">Your program stopped at this error. Anything printed above ran before it.</p>
        </>
      );
    case "timeout":
      return <p className="py-meta bad">Stopped after {Math.round(r.limitMs / 1000)} seconds: the program was still running. Look for a loop that never ends. Python has been restarted.</p>;
    case "output-limit":
      return <p className="py-meta bad">Stopped: the program printed more than {r.limit.toLocaleString("en-US")} characters. Python has been restarted.</p>;
    case "stopped":
      return <p className="py-meta">You stopped the program. Python has been restarted and is ready to run again.</p>;
    case "crashed":
      return <p className="py-meta bad">{r.message}</p>;
    case "unavailable":
      return <p className="py-meta bad">{r.message}</p>;
    default:
      return null;
  }
}

const GLYPH = { pass: "✓", fail: "✕", "not-run": "·" } as const;
const SR = { pass: "Passed: ", fail: "Failed: ", "not-run": "Not checked: " } as const;

function CheckItem({ c, onLine }: { c: PyCheckOutcome; onLine: (n: number) => void }) {
  return (
    <li className={c.status}>
      <span className="g" aria-hidden="true">{GLYPH[c.status]}</span>
      <span>
        <span className="sr-only">{SR[c.status]}</span>
        {c.label}
        {c.detail && <span className="detail">{c.detail} <LineButton line={c.line} onLine={onLine} /></span>}
        {c.cases && c.cases.length > 0 && (
          <ul className="py-cases" aria-label={`Test inputs for ${c.label}`}>
            {c.cases.map((k) => (
              <li key={k.index} className={k.ok ? "pass" : "fail"}>
                <span className="g" aria-hidden="true">{k.ok ? "✓" : "✕"}</span>
                <span className="sr-only">{k.ok ? "Passed: " : "Failed: "}</span>
                {k.hidden ? (
                  <span>hidden test input</span>
                ) : (
                  <span>
                    <code>{k.call}</code> → {k.ok ? <code>{k.actual}</code> : <>{k.actual !== undefined ? <>got <code>{k.actual}</code>, </> : null}expected <code>{k.expected}</code></>}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </span>
    </li>
  );
}

function ChecksView({
  busy,
  checked,
  edited,
  onLine,
}: {
  busy: boolean;
  checked: { report: PyGradeReport; code: string } | null;
  edited: boolean;
  onLine: (n: number) => void;
}) {
  const r = checked?.report;
  return (
    <div className="py-checksview" aria-live="polite" aria-label="Checks">
      <p className="py-panel-note">Whether your program meets this exercise. Check answer runs your code again from a fresh start, then tests it.</p>
      {!r && !busy && <p className="py-empty">Press Check answer when you think your program is ready.</p>}
      {busy && <p className="py-meta">checking…</p>}
      {r && (
        <>
          <p className={`py-verdict ${r.ok ? "ok" : "bad"}`} role="status">
            {r.ok ? `✓ All ${r.total} checks passed` : r.outcome === "failed" ? `${r.passed} of ${r.total} checks passed` : "Not checked: your program didn't finish"}
          </p>
          {r.outcome === "syntax-error" && r.error && (
            <SyntaxBlock e={{ type: r.error.type ?? "SyntaxError", message: r.error.message, line: r.error.line ?? null, column: r.error.column ?? null, text: r.error.text ?? "" }} onLine={onLine} />
          )}
          {r.outcome === "runtime-error" && r.error && (
            <>
              <RuntimeBlock type={r.error.type ?? "Error"} message={r.error.message} line={r.error.line} traceback={r.error.traceback} onLine={onLine} />
              <p className="py-err-note">Your program stopped at this error, so the checks below didn&apos;t run.</p>
            </>
          )}
          {r.outcome !== "passed" && r.outcome !== "failed" && r.outcome !== "syntax-error" && r.outcome !== "runtime-error" && (
            <p className="py-meta bad">{r.summary}</p>
          )}
          <ul className="rx-checks py-checks">
            {r.checks.map((c) => <CheckItem key={c.id} c={c} onLine={onLine} />)}
          </ul>
          {r.stdout && (
            <details className="py-checkout">
              <summary>Output printed during the check</summary>
              <Stream chunks={[{ stream: "stdout", text: r.stdout }, ...(r.stderr ? [{ stream: "stderr" as const, text: r.stderr }] : [])]} />
            </details>
          )}
          {edited && <p className="py-meta">You&apos;ve edited the code since this check.</p>}
        </>
      )}
    </div>
  );
}
