"use client";

import type { ReactNode } from "react";
import type { PyFile, PyOutputChunk, PyRunResult, PySyntaxError, PyTable } from "@/engine/python/client";
import type { PyGradeReport, PyTask } from "@/engine/python/grading";
import { presentReport, readsCsv, typeErrorHint, type ShownCheck, type ShownDiff } from "./feedback";

/* What a run printed and what a check found. Shared by every Python screen. */

export function errorLineOf(r: PyRunResult | PyGradeReport | null): number | null {
  if (!r) return null;
  if ("outcome" in r) return r.error?.line ?? r.checks.find((c) => c.status === "fail" && c.line)?.line ?? null;
  return r.status === "syntax-error" || r.status === "runtime-error" ? r.error.line : null;
}

export function errorFileOf(r: PyRunResult | PyGradeReport | null): string | undefined {
  if (!r) return undefined;
  const e = "outcome" in r ? r.error : r.status === "runtime-error" ? r.error : undefined;
  if (!e) return undefined;
  return ("file" in e ? e.file ?? undefined : undefined) ?? [...(e.traceback ?? "").matchAll(/File "([^"<>]+)", line \d+/g)].at(-1)?.[1];
}

function LineButton({ line, file, onLine, bare = false, label }: { line?: number | null; file?: string; onLine?: (n: number, file?: string) => void; bare?: boolean; label?: string }) {
  if (!line) return null;
  return onLine ? (
    <button type="button" className="p2-linebtn" onClick={() => onLine(line, file)} aria-label={`Go to line ${line}`}>
      {label ?? `line ${line}`}
    </button>
  ) : (
    <span>{bare ? `line ${line}` : ` (line ${line})`}</span>
  );
}

function SyntaxError({ e, onLine, note = true }: { e: PySyntaxError; onLine?: (n: number, file?: string) => void; note?: boolean }) {
  const caret = e.column && e.text ? " ".repeat(Math.max(0, e.column - 1)) + "^" : "";
  return (
    <div className="p2-err" role="alert">
      <b>{e.type}</b>: {e.message} <LineButton line={e.line} onLine={onLine} />
      {e.text && <pre>{e.text + (caret ? "\n" + caret : "")}</pre>}
      {note && <div className="p2-note">Python couldn&apos;t read the program, so none of it ran.</div>}
    </div>
  );
}

/**
 * A runtime error, said once: the traceback when there is one (it already ends with the type and message), otherwise
 * the type and message. `stopped` adds where the program stopped, as a link to the line.
 */
function RuntimeError({ type, message, line, file, traceback, onLine, stopped = false, csv = false }: { type: string; message: string; line?: number | null; file?: string | null; traceback?: string; onLine?: (n: number, file?: string) => void; stopped?: boolean; csv?: boolean }) {
  const sourceFile = file ?? [...(traceback ?? "").matchAll(/File "([^"<>]+)", line \d+/g)].at(-1)?.[1];
  const hint = typeErrorHint(type, message, csv);
  const where = sourceFile && sourceFile !== "main.py" ? ` of ${sourceFile}` : "";
  return (
    <div className="p2-err" role="alert">
      {traceback ? (
        <pre>{traceback}</pre>
      ) : (
        <>
          <b>{type}</b>
          {message ? `: ${message}` : ""}
        </>
      )}
      {stopped ? (
        <div className="p2-note">
          {line ? <>The program stopped at <LineButton line={line} file={sourceFile} onLine={onLine} bare />{where}. </> : "The program stopped here. "}
          Anything printed above ran before the error.
        </div>
      ) : (
        line && onLine && <div className="p2-note">Error at <LineButton line={line} file={sourceFile} onLine={onLine} bare />{where}</div>
      )}
      {hint && <div className="p2-note"><b>Hint:</b> {hint}</div>}
    </div>
  );
}

export function TableView({ text, n }: { text: string; n: number }) {
  let t: PyTable;
  try {
    t = JSON.parse(text);
  } catch {
    return null;
  }
  return (
    <div className="p2-table-wrap" tabIndex={0} role="region" aria-label={`Table ${n}: ${t.shape[0]} rows, ${t.shape[1]} columns`}>
      <table>
        <thead>
          <tr>
            <th scope="col">{t.index || <span className="sr-only">Row</span>}</th>
            {t.columns.map((c, i) => (
              <th key={i} scope="col">
                {c}
                <small>{t.dtypes[i]}</small>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {t.rows.map((r, i) => (
            <tr key={i}>
              {r.map((cell, j) => (
                <td key={j} className={cell === null ? "null" : undefined}>
                  {cell ?? "NaN"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {t.shape[0] > t.rows.length && <div className="p2-data-foot">first {t.rows.length} of {t.shape[0].toLocaleString("en-US")} rows</div>}
    </div>
  );
}

function Stream({ chunks }: { chunks: PyOutputChunk[] }) {
  let figures = 0;
  let tables = 0;
  return (
    <>
      {chunks.map((c, i) =>
        c.stream === "figure" ? (
          // eslint-disable-next-line @next/next/no-img-element -- a PNG data URL drawn by the learner's own program
          <img key={i} src={c.text} alt={`Figure ${++figures} drawn by your program`} />
        ) : c.stream === "table" ? (
          <TableView key={i} text={c.text} n={++tables} />
        ) : c.stream === "stdin" ? (
          // The line input() read, marked as typed: Python never printed it, so the printed lines stay as they are.
          <kbd key={i} className="stdin" title="Typed input that input() read. Your program did not print this.">
            <span className="sr-only">typed: </span>
            {c.text.replace(/\r?\n$/, "")}
          </kbd>
        ) : (
          <span key={i} className={c.stream}>
            {c.text}
          </span>
        ),
      )}
    </>
  );
}

/** Only the tables or only the figures a run produced (the Playground's Tables and Charts tabs). */
export function OnlyView({ chunks, kind }: { chunks: PyOutputChunk[]; kind: "table" | "figure" }) {
  const picked = chunks.filter((c) => c.stream === kind);
  if (!picked.length)
    return <p className="p2-empty">{kind === "table" ? "No tables yet. display(df) shows a DataFrame here." : "No charts yet. Draw with matplotlib and call plt.show()."}</p>;
  return (
    <div className="p2-console">
      <Stream chunks={picked} />
    </div>
  );
}

/** What went wrong in the last run: the error with its line, and anything written to stderr. */
export function ErrorsView({ result, onLine, csv = false }: { result: PyRunResult | null; onLine?: (n: number, file?: string) => void; csv?: boolean }) {
  const stderr = result && "stderr" in result ? result.stderr : "";
  const failed = result && result.status !== "ok" && result.status !== "superseded";
  if (!failed && !stderr) return <p className="p2-empty">{result ? "No errors in the last run." : "Errors and warnings from a run appear here."}</p>;
  return (
    <div className="p2-console" role="log" aria-label="Errors">
      {stderr && <span className="stderr">{stderr}</span>}
      {failed && <RunEnd r={result} onLine={onLine} empty={false} csv={csv} />}
    </div>
  );
}

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name.split("/").pop() ?? name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function FilesView({ files, download: canDownload = true, empty }: { files: PyFile[]; download?: boolean; empty?: string }) {
  if (!files.length) return <p className="p2-empty">{empty ?? "Your program didn\u2019t write any files."}</p>;
  return (
    <ul className="p2-console" style={{ listStyle: "none", margin: 0 }}>
      {files.map((f) => (
        <li key={f.path}>
          {f.path} {f.truncated ? <span className="meta">(too large to preview)</span> : canDownload && <button type="button" className="p2-small-btn" onClick={() => download(f.path, f.text)}>⤓ download</button>}
          {!f.truncated && <pre style={{ margin: "4px 0 10px", maxHeight: 180, overflow: "auto" }}>{f.text.slice(0, 4000)}</pre>}
        </li>
      ))}
    </ul>
  );
}

export function ConsoleView({ live, result, busy, onLine, csv = false }: { live: PyOutputChunk[]; result: PyRunResult | null; busy: boolean; onLine?: (n: number, file?: string) => void; csv?: boolean }) {
  const chunks = result && "output" in result ? result.output : live;
  if (!result && !busy && chunks.length === 0) return null;
  return (
    <div className="p2-console" role="log" aria-live="polite" aria-label="Console">
      <Stream chunks={chunks} />
      {busy && <div className="meta">running…</div>}
      {result && <RunEnd r={result} onLine={onLine} empty={chunks.length === 0} csv={csv} />}
    </div>
  );
}

export function RunEnd({ r, onLine, empty, csv = false }: { r: PyRunResult; onLine?: (n: number, file?: string) => void; empty: boolean; csv?: boolean }) {
  switch (r.status) {
    case "ok":
      return empty ? <div className="meta">Finished without printing anything.</div> : null;
    case "syntax-error":
      return <SyntaxError e={r.error} onLine={onLine} />;
    case "runtime-error":
      return <RuntimeError type={r.error.type} message={r.error.message} line={r.error.line} file={r.error.file} traceback={r.error.traceback} onLine={onLine} stopped csv={csv} />;
    case "timeout":
      return <div className="bad">Stopped after {Math.round(r.limitMs / 1000)} s: the program was still running. Look for a loop that never ends.</div>;
    case "output-limit":
      return <div className="bad">Stopped: more than {r.limit.toLocaleString("en-US")} characters of output.</div>;
    case "stopped":
      return <div className="meta">You stopped the program. Python is ready to run again.</div>;
    case "crashed":
    case "unavailable":
      return <div className="bad">{r.message}</div>;
    default:
      return null;
  }
}

const MARK = { pass: "✓", fail: "✗", "not-run": "·" } as const;
const SAY = { pass: "Passed", fail: "Failed", "not-run": "Not checked" } as const;

/** Text with every space shown as · (so 4 spaces and 2 spaces look different), with the first difference marked. */
function Spaced({ text, mark }: { text: string; mark: number }) {
  const show = (t: string) => t.replace(/ /g, "·").replace(/\t/g, "→");
  if (mark < 0 || mark >= text.length) return <>{show(text)}{mark >= text.length && mark >= 0 && <mark className="p2-diff-end" aria-label="ends here"> </mark>}</>;
  return (
    <>
      {show(text.slice(0, mark))}
      <mark>{show(text[mark])}</mark>
      {show(text.slice(mark + 1))}
    </>
  );
}

function DiffView({ d }: { d: ShownDiff }) {
  const e = d.expected ?? "";
  const a = d.actual ?? "";
  let at = 0;
  while (at < e.length && at < a.length && e[at] === a[at]) at++;
  return (
    <div className="p2-case p2-diff" aria-label={`Line ${d.line}, expected and yours`}>
      <span>expected</span>
      <span>{d.expected === null ? <i>no line {d.line}</i> : <Spaced text={e} mark={d.actual === null ? -1 : at} />}</span>
      <span>yours</span>
      <span className="bad">{d.actual === null ? <i>no line {d.line}</i> : <Spaced text={a} mark={d.expected === null ? -1 : at} />}</span>
    </div>
  );
}

function CheckRow({ c, onLine }: { c: ShownCheck; onLine?: (n: number, file?: string) => void }) {
  const visible = c.cases?.filter((k) => !k.hidden) ?? [];
  const hidden = c.cases?.filter((k) => k.hidden) ?? [];
  const hiddenPassed = hidden.filter((k) => k.ok).length;
  // The detail may already name the line ("… (line 4)."): then only offer the jump, without repeating the number.
  const saysLine = !!c.line && new RegExp(`\\bline ${c.line}\\b`).test(c.detail ?? "");
  return (
    <li className="p2-check">
      <span className={`p2-mark ${c.status}`} aria-hidden="true">{MARK[c.status]}</span>
      <div>
        <span className="p2-sr">{SAY[c.status]}: </span>
        {c.label}
        {c.status === "fail" && c.detail && (
          <div className="p2-note">
            {c.detail}{" "}
            {saysLine ? onLine && <LineButton line={c.line} onLine={onLine} label="show in code" /> : <LineButton line={c.line} onLine={onLine} />}
          </div>
        )}
        {c.status === "fail" && c.diff && <DiffView d={c.diff} />}
        {c.status === "fail" && c.setup && <pre className="p2-case-setup" aria-label="Test data this check uses">{c.setup}</pre>}
        {c.status === "fail" && c.parts && (
          <div className="p2-case p2-parts">
            {c.parts.map((p, i) => (
              <div key={i} className={p.ok ? "ok" : "bad"}>
                <span className="p2-sr">{p.ok ? "Matches" : "Different"}: </span>
                <code>{p.what}</code> gave <code>{p.actual}</code>{p.ok ? " ✓" : <>, expected <code>{p.expected}</code></>}
              </div>
            ))}
          </div>
        )}
        {c.status === "fail" && c.tip && <div className="p2-note"><b>Tip:</b> {c.tip}</div>}
        {visible.filter((k) => !k.ok).slice(0, 2).map((k) => (
          <div key={k.index} className="p2-case">
            <span>call</span><span>{k.call}</span>
            <span>expected</span><span>{k.expected}</span>
            <span>yours</span><span className="bad">{k.actual ?? k.detail ?? "—"}</span>
          </div>
        ))}
        {hidden.length > 0 && !c.hideHiddenCount && (
          <div className="p2-note">
            {hidden.length === 1 ? `Hidden test: ${hiddenPassed ? "passes" : "doesn\u2019t pass yet"}. Its input stays hidden.` : `Hidden tests: ${hiddenPassed} of ${hidden.length} pass. Their inputs stay hidden.`}
          </div>
        )}
      </div>
    </li>
  );
}

/** "All 3 checks pass", "The check passes", "Not yet: 1 of 3 checks pass", "Not yet: the check doesn't pass". */
export function verdictText(ok: boolean, passed: number, total: number): string {
  if (ok) return total === 1 ? "The check passes" : `All ${total} checks pass`;
  return total === 1 ? "Not yet: the check doesn\u2019t pass" : `Not yet: ${passed} of ${total} checks pass`;
}

/** `next` (shown in a passing verdict) is where to go now: the next challenge, question or step. */
export function ChecksView({ report: raw, busy, onLine, task, fileNames, next }: { report: PyGradeReport | null; busy: boolean; onLine?: (n: number, file?: string) => void; task?: PyTask; fileNames?: string[]; next?: ReactNode }) {
  if (busy) return <p className="p2-empty" role="status">Checking: running your program from a fresh start…</p>;
  if (!raw) return <p className="p2-empty">Press Check when you think your program is ready. Check runs it again from a fresh start, then tests it.</p>;
  // Wording only: which checks passed, and report.ok, come from the grader unchanged.
  const report = presentReport(raw, task, fileNames);
  const csv = readsCsv(task, fileNames);
  return (
    <div aria-live="polite">
      <div className={`p2-verdict ${report.ok ? "pass" : "fail"}`}>
        <span className={`p2-mark ${report.ok ? "pass" : "fail"}`} aria-hidden="true">{report.ok ? "✓" : "✗"}</span>
        <div>
          <b>{verdictText(report.ok, report.passed, report.total)}</b>
          {!report.ok && report.note && <span className="p2-note">{report.note}</span>}
          {report.ok && next && <div className="p2-verdict-next">{next}</div>}
        </div>
      </div>
      {report.outcome === "syntax-error" && report.error && (
        <div style={{ padding: "0 14px" }}>
          <SyntaxError e={{ type: report.error.type ?? "SyntaxError", message: report.error.message, line: report.error.line ?? null, column: report.error.column ?? null, text: report.error.text ?? "" }} onLine={onLine} note={false} />
        </div>
      )}
      {report.outcome === "runtime-error" && report.error && (
        <div style={{ padding: "0 14px" }}>
          <RuntimeError type={report.error.type ?? "Error"} message={report.error.message} line={report.error.line} traceback={report.error.traceback} onLine={onLine} csv={csv} />
        </div>
      )}
      <ul style={{ listStyle: "none", margin: 0, padding: 0 }} aria-label="Checks">
        {report.checks.map((c) => (
          <CheckRow key={c.id} c={c} onLine={onLine} />
        ))}
      </ul>
    </div>
  );
}

/** The console a task expects. The prompt already says what to do, so this is only the lines.
 * `simple` (lesson challenges) drops line numbers and the line count, like SQL's challenge card. */
export function ExpectedOutput({ task, simple = false }: { task: { stdin?: string; checks: { kind: string; expected?: unknown; hidden?: boolean }[] }; simple?: boolean }) {
  const check = task.checks.find((c) => c.kind === "output" && !c.hidden && typeof c.expected === "string");
  if (!check) return null;
  const text = (check.expected as string).replace(/\n$/, "");
  const rows = text === "" ? [] : text.split("\n");
  const typed = (task.stdin ?? "").replace(/\n$/, "").split("\n").filter((line) => line.length > 0);
  const typedNote = typed.length === 0 ? "" : typed.length === 1 ? `typed ${typed[0]}` : `typed ${typed.join(", then ")}`;
  const count = rows.length === 0 ? "prints nothing" : simple ? "" : `${rows.length} line${rows.length === 1 ? "" : "s"}`;
  const note = [count, typedNote].filter(Boolean).join(" · ");
  return (
    <div className={simple ? "p2-expected simple" : "p2-expected"}>
      <div className="p2-expected-head">
        <b>Expected output</b>
        {note && <span>{note}</span>}
      </div>
      {rows.length > 0 && (
        <ol aria-label="Expected output">
          {rows.map((line, i) => (
            <li key={i}>
              {!simple && <span className="n">{i + 1}</span>}
              {line.length === 0 ? <span className="blank">blank line</span> : <span className="txt">{line}</span>}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
