"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, Play, RotateCcw, X } from "lucide-react";
import { executeSql, isEngineBootError, type ExecuteRequest, type ExecuteResponse } from "@/engine/sql-client";
import { errorKind, track, type AnalyticsProps } from "@/lib/analytics";
import { Editor } from "./Editor";
import { Output } from "./Output";
import { visibleChecks, type VisibleCheck } from "./checks";
import type { FeedbackContext } from "./feedback";
import { prettySql } from "@/components/editor/pretty-sql";
import { Keys, MacOnly } from "./Keys";
import { SqlCode } from "./SqlCode";
import { revealRange } from "./reveal";

type Panel = "results" | "checks";
type CheckReport = { checks: VisibleCheck[]; ok: boolean; passed: number };

/**
 * A read-only cell: SQL you can run. Results open under the cell after the first run
 * (not shown empty in the lesson brief before they click Run).
 */
export function RunCell({
  query,
  name,
  allowWrites = false,
  seedSql,
  children,
}: {
  query: string;
  name: string;
  allowWrites?: boolean;
  /** The canonical dataset (directive seed) the query runs on. */
  seedSql: string;
  /** Optional note shown under the output once it has run. */
  children?: ReactNode;
}) {
  const [res, setRes] = useState<ExecuteResponse | null>(null);
  const [open, setOpen] = useState(true);
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  const [interrupted, setInterrupted] = useState(false);
  const run = async () => {
    if (running.current) return;
    running.current = true;
    setInterrupted(false);
    setBusy(true);
    try {
      const r = await executeSql({ seed: seedSql, query, allowWrites });
      if (r.superseded) setInterrupted(true);
      else {
        setRes(r);
        setOpen(true);
      }
    } finally {
      running.current = false;
      setBusy(false);
    }
  };
  return (
    <>
      <div className="rx-cell">
        <div className="rx-cell-head">
          <span className="name">{name}</span>
          <span className="acts">
            <button type="button" className="rx-btn" onClick={() => void run()} disabled={busy}>
              {res ? <RotateCcw size={13} /> : <Play size={13} />} {busy ? "Running…" : res ? "Run again" : "Run"}
            </button>
          </span>
        </div>
        <div className="rx-cell-in">
          <span className="p" aria-hidden="true">sql›</span>
          <SqlCode source={prettySql(query)} label={name} />
        </div>
        {interrupted && <p className="rx-small" role="status">Another query started, so this run was stopped. Run it again.</p>}
      </div>

      {res && (
        <div className="rx-results">
          <div className="rx-results-tabs" role="tablist" aria-label="Output">
            <span role="tab" aria-selected="true">Output</span>
          </div>
          <div className="rx-results-pane" role="tabpanel">
            {!open ? (
              <p className="rx-results-empty">
                Output hidden.
                <button type="button" className="rx-btn ghost" onClick={() => setOpen(true)}>Show</button>
              </p>
            ) : (
              <>
                <Output
                  res={res}
                  query={query}
                  actions={
                    <>
                      {isEngineBootError(res.error) && (
                        <button type="button" className="rx-btn" onClick={() => void run()} disabled={busy}>
                          <RotateCcw size={13} /> Retry
                        </button>
                      )}
                      <button type="button" className="rx-btn ghost" onClick={() => setOpen(false)}>Hide</button>
                      <button type="button" className="rx-btn ghost" onClick={() => setRes(null)} aria-label="Close output">
                        <X size={13} /> Close
                      </button>
                    </>
                  }
                />
                {children}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export type Gradable = Pick<
  ExecuteRequest,
  "answer" | "ordered" | "required" | "validate" | "planValidation" | "repeatCheck" | "stateQueries"
> & { allowWrites?: boolean; seedSql: string; mutationSql?: string };

/**
 * An editable cell with Run and Check. Output lives in one panel under the
 * editor (as in Python practice), not inside the cell.
 */
export function TaskCell({
  name,
  value,
  onChange,
  task,
  onGraded,
  onExecuted,
  focus = false,
  footer,
  checkLabel = "Check",
  graded = true,
  minHeight,
  observe,
  tables,
  analytics,
  feedback,
  nextAction,
  head = true,
}: {
  name: string;
  value: string;
  onChange: (v: string) => void;
  task: Gradable;
  onGraded?: (res: ExecuteResponse, ok: boolean) => void;
  onExecuted?: (res: ExecuteResponse, query: string) => void;
  focus?: boolean;
  /** Extra controls in the footer (hints, reset…). */
  footer?: ReactNode;
  checkLabel?: string;
  graded?: boolean;
  minHeight?: string;
  /** Plain-language note on what the run did (Database Lab). */
  observe?: (res: ExecuteResponse, ran: string) => string | null;
  /** Tables to prefer in SQL autocomplete for this task. */
  tables?: string[];
  /** Coarse ids for product analytics (never include SQL). */
  analytics?: AnalyticsProps;
  /** What a failed check may refer to (taught constructs, expected rows already on the page). Wording only. */
  feedback?: Omit<FeedbackContext, "query" | "tables">;
  /** Where to go once every check passes (shown under the verdict; never navigates by itself). */
  nextAction?: ReactNode;
  /** The file name bar. Off when a tab above the editor already shows the name. */
  head?: boolean;
}) {
  const [res, setRes] = useState<ExecuteResponse | null>(null);
  const [mode, setMode] = useState<"run" | "check">("run");
  const [ran, setRan] = useState("");
  const [open, setOpen] = useState(true);
  const [panel, setPanel] = useState<Panel>("results");
  const [report, setReport] = useState<CheckReport | null>(null);
  const [busy, setBusy] = useState<"run" | "check" | null>(null);
  const runGen = useRef(0);
  const running = useRef(false);
  const [interrupted, setInterrupted] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);
  const footRef = useRef<HTMLDivElement>(null);

  // Keep Run / Check on screen and bring the panel (verdict or first rows) into view under them.
  useEffect(() => {
    if (!res || !open || !footRef.current || !resultRef.current) return;
    const checksEl = resultRef.current.querySelector<HTMLElement>(".rx-checks");
    const frame = requestAnimationFrame(() => {
      const share = Math.round((window.visualViewport?.height ?? window.innerHeight) * 0.6);
      if (footRef.current && resultRef.current) revealRange(footRef.current, checksEl ?? resultRef.current, checksEl ? Infinity : share);
    });
    return () => cancelAnimationFrame(frame);
  }, [res, open, ran, panel]);

  const exec = async (check: boolean) => {
    if (running.current) return;
    running.current = true;
    setInterrupted(false);
    const id = ++runGen.current;
    setBusy(check ? "check" : "run");
    try {
      const r = await executeSql({
        seed: task.seedSql,
        query: value,
        answer: check ? task.answer : null,
        ordered: task.ordered,
        mutation: check ? (task.mutationSql ?? null) : null,
        allowWrites: task.allowWrites,
        repeatCheck: check && task.repeatCheck,
        stateQueries: check ? task.stateQueries : undefined,
        planValidation: check ? task.planValidation : null,
        validate: check ? task.validate : null,
        required: check ? task.required : null,
      });
      if (id !== runGen.current) return;
      if (r.superseded) { setInterrupted(true); return; }
      setRes(r);
      setRan(value);
      setMode(check ? "check" : "run");
      setOpen(true);
      setPanel(check ? "checks" : "results");
      if (check) {
        const list = visibleChecks(r, !!task.ordered, { ...feedback, query: value, tables });
        setReport({ checks: list, ok: !!r.grade?.ok, passed: list.filter((c) => c.state === "pass").length });
      }
      onExecuted?.(r, value);
      if (analytics) {
        track("query_run", { ...analytics, check, ok: !r.error && (!check || !!r.grade?.ok) });
        if (r.error) track("query_error", { ...analytics, kind: errorKind(r.error), check });
      }
      if (check) onGraded?.(r, !!r.grade?.ok);
    } finally {
      if (id === runGen.current) { running.current = false; setBusy(null); }
    }
  };

  const stale = !!res && value !== ran;
  const showChecks = graded && panel === "checks";
  const showResults = panel === "results";

  return (
    <>
      <div className={`rx-cell ${focus ? "focus" : ""}`}>
        {head && (
          <div className="rx-cell-head">
            <span className="name">{name}</span>
            <span className="acts" aria-hidden="true">
              <MacOnly>
                <Keys keys={["mod", "enter"]} /> <span>run</span>
                {graded && <><Keys keys={["mod", "shift", "enter"]} /> <span>check</span></>}
              </MacOnly>
            </span>
          </div>
        )}
        <Editor
          value={value}
          onChange={onChange}
          onRun={() => void exec(false)}
          onCheck={graded ? () => void exec(true) : undefined}
          label={name}
          minHeight={minHeight}
          tables={tables}
          seedSql={task.seedSql}
        />
        <div className="rx-cell-foot" ref={footRef}>
          <span className="hint">{stale ? "edited since the last run" : " "}</span>
          {footer}
          <button type="button" className="rx-btn" disabled={busy !== null} onClick={() => void exec(false)}>
            <Play size={13} /> {busy === "run" ? "Running…" : "Run"}
          </button>
          {graded && (
            <button type="button" className="rx-btn primary" disabled={busy !== null} onClick={() => void exec(true)}>
              <Check size={14} /> {busy === "check" ? "Checking…" : checkLabel}
            </button>
          )}
        </div>
        {interrupted && <p className="rx-small" role="status">Another query started, so this run was stopped. Run or check it again.</p>}
      </div>

      <div className="rx-results" ref={resultRef}>
        <div className="rx-results-tabs" role="tablist" aria-label="Output">
          <span role="tab" aria-selected="true">Output</span>
        </div>

        {showResults && res && (
          <div className="rx-results-pane" role="tabpanel">
            {!open ? (
              <p className="rx-results-empty">
                Output hidden.
                <button type="button" className="rx-btn ghost" onClick={() => setOpen(true)}>Show</button>
              </p>
            ) : (
              <>
                {stale && <p className="rx-small" role="status">Previous run — code changed</p>}
                {observe && observe(res, ran) && <p className="rx-observe"><span className="mono">observed ›</span> {observe(res, ran)}</p>}
                <Output
                  res={res}
                  query={ran}
                  echo={graded}
                  tables={tables}
                  surface={graded ? "exercise" : task.allowWrites ? "lab" : "playground"}
                  actions={
                    <>
                      {isEngineBootError(res.error) && (
                        <button type="button" className="rx-btn" disabled={busy !== null} onClick={() => void exec(mode === "check")}>
                          <RotateCcw size={13} /> Retry
                        </button>
                      )}
                      <button type="button" className="rx-btn ghost" onClick={() => setOpen(false)}>Hide</button>
                      <button type="button" className="rx-btn ghost" onClick={() => { setRes(null); setReport(null); }} aria-label="Close output"><X size={13} /> Close</button>
                    </>
                  }
                />
              </>
            )}
          </div>
        )}

        {showChecks && (
          <div className="rx-results-pane" role="tabpanel">
            {!report ? (
              <p className="rx-results-empty">Press Check to grade your query.</p>
            ) : (
              <>
                {stale && <p className="rx-small" role="status">Previous check — code changed</p>}
                <p className={`rx-verdict ${report.ok ? "ok" : "bad"}`} role="status">
                  {report.ok ? "✓ all checks passed" : `${report.passed} of ${report.checks.length} checks passed`}
                </p>
                {report.ok && nextAction && <div className="rx-next">{nextAction}</div>}
                <ul className="rx-checks">
                  {report.checks.map((c) => (
                    <li key={c.label} className={c.state}>
                      <span className="g" aria-hidden="true">{c.state === "pass" ? "✓" : c.state === "fail" ? "✕" : "·"}</span>
                      <span>
                        <span className="sr-only">{c.state === "pass" ? "Passed: " : c.state === "fail" ? "Failed: " : "Not checked yet: "}</span>
                        {c.label}
                        {c.detail && <span className="detail">{c.detail}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
