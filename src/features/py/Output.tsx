"use client";

import type { PyOutputChunk, PyRunResult, PySyntaxError } from "@/engine/python/client";
import type React from "react";
import type { PyCheckOutcome, PyGradeReport } from "@/engine/python/grading";

/* Console and Checks rendering shared by the workspace, lesson challenges and example cells. */

export function appendChunk(list: PyOutputChunk[], c: PyOutputChunk): PyOutputChunk[] {
  const last = list.at(-1);
  if (last && last.stream === c.stream) return [...list.slice(0, -1), { ...last, text: last.text + c.text }];
  return [...list, c];
}

export function errorLineOf(r: PyRunResult | PyGradeReport | null): number | null {
  if (!r) return null;
  if ("outcome" in r) {
    if (r.error?.line) return r.error.line;
    return r.checks.find((c) => c.status === "fail" && c.line)?.line ?? null;
  }
  return r.status === "syntax-error" || r.status === "runtime-error" ? r.error.line : null;
}


export function LineButton({ line, onLine }: { line: number | null | undefined; onLine?: (n: number) => void }) {
  if (!line) return null;
  if (!onLine) return <span className="py-line-text">line {line}</span>;
  return (
    <button type="button" className="py-line" onClick={() => onLine(line)}>
      line {line}
    </button>
  );
}

export function SyntaxBlock({ e, onLine }: { e: PySyntaxError; onLine?: (n: number) => void }) {
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

export function RuntimeBlock({ type, message, line, traceback, onLine }: { type: string; message: string; line: number | null | undefined; traceback?: string; onLine?: (n: number) => void }) {
  return (
    <div className="py-err">
      <p className="py-err-head">
        <b>{type}</b>{message ? `: ${message}` : ""} <LineButton line={line} onLine={onLine} />
      </p>
      {traceback && <pre className="py-err-src">{traceback}</pre>}
    </div>
  );
}

export function Stream({ chunks }: { chunks: PyOutputChunk[] }) {
  return (
    <pre className="py-stream">
      {chunks.map((c, i) => <span key={i} className={c.stream}>{c.text}</span>)}
    </pre>
  );
}

export function ConsoleView({
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
  onLine?: (n: number) => void;
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

export function RunEnd({ r, onLine, empty }: { r: PyRunResult; onLine?: (n: number) => void; empty: boolean }) {
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

export function CheckItem({ c, onLine }: { c: PyCheckOutcome; onLine?: (n: number) => void }) {
  return (
    <li className={c.status}>
      <span className="g" aria-hidden="true">{GLYPH[c.status]}</span>
      <span>
        <span className="sr-only">{SR[c.status]}</span>
        {c.label}
        {c.detail && <span className="detail">{c.detail} <LineButton line={c.line} onLine={onLine} /></span>}
        {c.tip && <span className="detail py-tip"><b>Tip:</b> {c.tip}</span>}
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

export function ChecksView({
  busy,
  checked,
  edited,
  onLine,
}: {
  busy: boolean;
  checked: { report: PyGradeReport; code: string } | null;
  edited: boolean;
  onLine?: (n: number) => void;
}) {
  const r = checked?.report;
  return (
    <div className="py-checksview" aria-label="Checks">
      <p className="py-panel-note">Whether your program meets this exercise. Check answer runs your code again from a fresh start, then tests it.</p>
      {!r && !busy && <p className="py-empty">Press Check answer when you think your program is ready.</p>}
      {busy && <p className="py-meta">checking…</p>}
      {r && (
        <>
          <p className={`py-verdict ${r.ok ? "ok" : "bad"}`}>
            {verdictText(r)}
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

/** Verdict line shared by the summary and the Checks panel. */
export function verdictText(r: PyGradeReport): string {
  return r.ok ? `✓ All ${r.total} checks passed` : r.outcome === "failed" ? `✕ ${r.passed} of ${r.total} checks passed` : "✕ Not checked: your program didn't finish";
}

/**
 * The result of Check answer, shown directly under the controls: the verdict and the first thing
 * to fix (with its line), so the learner never has to hunt for it. The full list stays in Checks.
 */
export function CheckSummary({
  report,
  edited,
  onLine,
  onAll,
  banner,
  headingRef,
}: {
  report: PyGradeReport;
  edited: boolean;
  onLine?: (n: number) => void;
  onAll: () => void;
  banner?: React.ReactNode;
  headingRef?: React.Ref<HTMLParagraphElement>;
}) {
  const first = report.checks.find((c) => c.status === "fail");
  return (
    <div className={`py-summary ${report.ok ? "ok" : "bad"}`}>
      <p className="py-summary-verdict" ref={headingRef} tabIndex={-1}>{verdictText(report)}</p>
      {!report.ok && report.outcome === "failed" && first && (
        <p className="py-summary-first">
          <span className="k">First to fix:</span> <b>{first.label}</b>. {first.detail} <LineButton line={first.line} onLine={onLine} />
          {first.tip && <span className="py-summary-tip"><b>Tip:</b> {first.tip}</span>}
        </p>
      )}
      {!report.ok && report.outcome !== "failed" && (
        <p className="py-summary-first">
          {report.summary} <LineButton line={report.error?.line} onLine={onLine} />
        </p>
      )}
      {banner}
      <p className="py-summary-foot">
        {!report.ok && <button type="button" className="py-link" onClick={onAll}>See all {report.total} checks</button>}
        {edited && <span>You&apos;ve edited the code since this check.</span>}
      </p>
    </div>
  );
}
