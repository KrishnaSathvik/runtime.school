"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown, ChevronRight, Play, RotateCcw, X } from "lucide-react";
import { seed as lessonSeed, fixtureMutation } from "@/content";
import { executeSql, isEngineBootError, type ExecuteRequest, type ExecuteResponse } from "@/engine/sql-client";
import { errorKind, track, type AnalyticsProps } from "@/lib/analytics";
import { Editor } from "./Editor";
import { Output } from "./Output";
import { visibleChecks } from "./checks";
import { prettySql } from "@/components/editor/pretty-sql";
import { Keys, MacOnly } from "./Keys";
import { SqlCode } from "./SqlCode";

/**
 * A read-only cell: SQL you can run. The output opens underneath.
 * Hide keeps the output (Show reopens it without rerunning); Close clears it.
 */
export function RunCell({
  query,
  name,
  allowWrites = false,
  seedSql = lessonSeed,
  children,
}: {
  query: string;
  name: string;
  allowWrites?: boolean;
  seedSql?: string;
  /** Optional note shown under the output once it has run. */
  children?: ReactNode;
}) {
  const [res, setRes] = useState<ExecuteResponse | null>(null);
  const [open, setOpen] = useState(true);
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      const r = await executeSql({ seed: seedSql, query, allowWrites });
      if (!r.superseded) {
        setRes(r);
        setOpen(true);
      }
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="rx-cell">
      <div className="rx-cell-head">
        <span className="name">{name}</span>
        <span className="acts">
          {res && (
            <button type="button" className="rx-btn ghost" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
              {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />} {open ? "Hide" : "Show"}
            </button>
          )}
          <button type="button" className="rx-btn" onClick={() => void run()} disabled={busy}>
            {res ? <RotateCcw size={13} /> : <Play size={13} />} {busy ? "Running…" : res ? "Run again" : "Run"}
          </button>
        </span>
      </div>
      <div className="rx-cell-in">
        <span className="p" aria-hidden="true">sql›</span>
        <SqlCode source={prettySql(query)} label={name} />
      </div>
      {res && open && (
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
  );
}

export type Gradable = Pick<
  ExecuteRequest,
  "answer" | "ordered" | "required" | "validate" | "planValidation" | "repeatCheck" | "stateQueries"
> & { allowWrites?: boolean; seedSql?: string; mutationSql?: string };

/**
 * An editable cell with Run and Check. Check runs the real grader and shows
 * each check it passed or failed (from Concept C), then the output.
 */
export function TaskCell({
  name,
  value,
  onChange,
  task,
  onGraded,
  focus = false,
  footer,
  checkLabel = "Check",
  graded = true,
  minHeight,
  observe,
  tables,
  analytics,
}: {
  name: string;
  value: string;
  onChange: (v: string) => void;
  task: Gradable;
  onGraded?: (res: ExecuteResponse, ok: boolean) => void;
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
}) {
  const [res, setRes] = useState<ExecuteResponse | null>(null);
  const [mode, setMode] = useState<"run" | "check">("run");
  const [ran, setRan] = useState("");
  const [open, setOpen] = useState(true);
  const [busy, setBusy] = useState<"run" | "check" | null>(null);
  const runGen = useRef(0);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (res && open) resultRef.current?.scrollIntoView({ block: "nearest" });
  }, [res, open]);

  const exec = async (check: boolean) => {
    const id = ++runGen.current;
    setBusy(check ? "check" : "run");
    try {
      const r = await executeSql({
        seed: task.seedSql ?? lessonSeed,
        query: value,
        answer: check ? task.answer : null,
        ordered: task.ordered,
        mutation: check ? (task.mutationSql ?? fixtureMutation) : null,
        allowWrites: task.allowWrites,
        repeatCheck: check && task.repeatCheck,
        stateQueries: check ? task.stateQueries : undefined,
        planValidation: check ? task.planValidation : null,
        validate: check ? task.validate : null,
        required: check ? task.required : null,
      });
      if (id !== runGen.current || r.superseded) return;
      setRes(r);
      setRan(value);
      setMode(check ? "check" : "run");
      setOpen(true);
      if (analytics) {
        track("query_run", { ...analytics, check, ok: !r.error && (!check || !!r.grade?.ok) });
        if (r.error) track("query_error", { ...analytics, kind: errorKind(r.error), check });
      }
      if (check) onGraded?.(r, !!r.grade?.ok);
    } finally {
      if (id === runGen.current) setBusy(null);
    }
  };

  const checks = res && mode === "check" ? visibleChecks(res, !!task.ordered) : null;
  const passed = checks?.filter((c) => c.state === "pass").length ?? 0;
  const ok = mode === "check" && !!res?.grade?.ok;

  return (
    <div className={`rx-cell ${focus ? "focus" : ""}`}>
      <div className="rx-cell-head">
        <span className="name">{name}</span>
        <span className="acts" aria-hidden="true">
          <MacOnly>
            <Keys keys={["mod", "enter"]} /> <span>run</span>
            {graded && <><Keys keys={["mod", "shift", "enter"]} /> <span>check</span></>}
          </MacOnly>
        </span>
      </div>
      <Editor
        value={value}
        onChange={onChange}
        onRun={() => void exec(false)}
        onCheck={graded ? () => void exec(true) : undefined}
        label={name}
        minHeight={minHeight}
        tables={tables}
      />
      <div className="rx-cell-foot">
        <span className="hint">{res && value !== ran ? "edited since the last run" : " "}</span>
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
      {res && open && (
        <div ref={resultRef}>
          {checks && (
            <>
              <p className={`rx-verdict ${ok ? "ok" : "bad"}`} role="status">
                {ok ? "✓ all checks passed" : `${passed} of ${checks.length} checks passed`}
              </p>
              <ul className="rx-checks">
                {checks.map((c) => (
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
          {observe && observe(res, ran) && <p className="rx-observe"><span className="mono">observed ›</span> {observe(res, ran)}</p>}
          <Output
            res={res}
            query={ran}
            actions={
              <>
                {isEngineBootError(res.error) && (
                  <button type="button" className="rx-btn" disabled={busy !== null} onClick={() => void exec(mode === "check")}>
                    <RotateCcw size={13} /> Retry
                  </button>
                )}
                <button type="button" className="rx-btn ghost" onClick={() => setOpen(false)}>Hide</button>
                <button type="button" className="rx-btn ghost" onClick={() => setRes(null)} aria-label="Close output"><X size={13} /> Close</button>
              </>
            }
          />
        </div>
      )}
      {res && !open && (
        <div className="rx-out-meta">
          <span>output hidden</span>
          <span className="acts"><button type="button" className="rx-btn ghost" onClick={() => setOpen(true)}>Show</button></span>
        </div>
      )}
    </div>
  );
}
