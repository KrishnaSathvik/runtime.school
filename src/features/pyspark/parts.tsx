"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight, Play, RotateCcw, Square } from "lucide-react";
import { Code } from "@/features/python/Code";
import { ExpectedResult, Tables } from "@/features/rt/Tables";
import type { DatasetPreview } from "@/data/datasets/learning";
import { Md } from "@/features/python/Md";
import { editionRows, psDataset, type PsAlso, type PsEdition, type PsExpected, type PsItemSpec, type PsRecorded } from "@/content/pyspark/content";
import { runnerHealth, runnerUrl, sparkJob, type PsCheckRow, type PsError, type PsJobState, type PsRunResult } from "@/engine/pyspark/client";

export type Connection = "checking" | "connected" | "unreachable" | "none";
let health: Promise<boolean> | null = null;

/** Whether a real Spark runner is reachable. Checked once per page load and shared by everything on the page. */
export function useSparkConnection(): [Connection, (c: Connection) => void] {
  const [c, setC] = useState<Connection>(() => (runnerUrl() ? "checking" : "none"));
  useEffect(() => {
    if (!runnerUrl()) return;
    let live = true;
    health ??= runnerHealth();
    void health.then((ok) => {
      if (!ok) health = null;
      if (live) setC(ok ? "connected" : "unreachable");
    });
    return () => { live = false; };
  }, []);
  return [c, setC];
}

/* Pieces every PySpark screen shares: tables, state tags, the "your data" panel, Spark errors and job status. */

/** A table of real rows. `null` shows as null, the way Spark prints it. */
export function DataTable({ columns, rows, label, foot }: { columns: { name: string; type?: string }[]; rows: unknown[][]; label: string; foot?: ReactNode }) {
  return (
    <div className="p2-table-wrap" tabIndex={0} role="region" aria-label={label}>
      <table aria-label={label}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.name} scope="col">
                {c.name}
                {c.type && <small>{c.type}</small>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={columns.length} className="null">no rows</td></tr>
          ) : (
            rows.map((r, i) => (
              <tr key={i}>
                {r.map((v, j) => (
                  <td key={j} className={v === null ? "null" : undefined}><NestedValue value={v} /></td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
      {foot && <div className="p2-data-foot">{foot}</div>}
    </div>
  );
}

/** A DataFrame's schema as Spark reports it: name, type, nullable. */
export function Schema({ fields }: { fields: { name: string; type: string; nullable?: boolean }[] }) {
  return (
    <ul className="ps-schema" aria-label="Schema">
      {fields.map((f) => (
        <li key={f.name}><code>{f.name}</code> <span>{f.type}{f.nullable === false ? " not null" : ""}</span></li>
      ))}
    </ul>
  );
}

/** Said wherever a page shows something that isn't written yet. */
export function PlannedNote({ what }: { what: string }) {
  return (
    <p className="ps-planned" role="note">
      <b>Planned.</b> This {what} isn&apos;t written yet. What&apos;s shown is its place in the course and the data it will use; nothing here runs.
    </p>
  );
}

/** A Spark or Python error as the learner needs it: what, where (their line), and Spark's error name. */
export function SparkError({ error, onLine }: { error: PsError; onLine?: (line: number) => void }) {
  const caret = error.column && error.text ? `\n${" ".repeat(Math.max(0, error.column - 1))}^` : "";
  return (
    <div className="p2-err ps-err" role="alert">
      <div>
        <b>{error.type}</b>
        {error.message ? `: ${error.message}` : ""}
      </div>
      {error.text && <pre>{error.text}{caret}</pre>}
      <div className="p2-note">
        {error.line ? (
          <>
            In your code at{" "}
            {onLine ? <button type="button" className="p2-linebtn" onClick={() => onLine(error.line!)} aria-label={`Go to line ${error.line}`}>line {error.line}</button> : `line ${error.line}`}.
          </>
        ) : null}
        {error.condition && <> Spark error: <code>{error.condition}</code></>}
      </div>
      {error.traceback && (
        <details>
          <summary>Python traceback</summary>
          <pre>{error.traceback}</pre>
        </details>
      )}
    </div>
  );
}

const SAY: Record<PsJobState, string> = {
  queued: "Waiting for a free Spark slot…",
  starting: "Starting Spark…",
  running: "Running on Spark…",
  checking: "Checking on Spark…",
  done: "Done.",
  error: "The runner couldn't finish.",
  cancelled: "Stopped.",
};

/** The live state of a Spark job, with the seconds since it started. */
export function JobLine({ state, since, detail }: { state: PsJobState; since: number; detail?: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);
  return (
    <span className={`ps-job ${state}`} role="status" aria-live="polite">
      <i aria-hidden="true" />
      {SAY[state]}
      {detail && <span className="ps-job-detail"> {detail}</span>}
      <span className="ps-job-time"> {((now - since) / 1000).toFixed(1)} s</span>
    </span>
  );
}


/**
 * A lesson example on real Spark. Run runs it now; the console stays empty until then, as in SQL and Python.
 * When Spark isn't connected, the output recorded from a real run can be shown instead, and says so.
 */
export function SparkExample({ block, n, dataset, edition, recorded, connection }: {
  block: { kind: "example" | "error-example"; id: string; title: string; code: string; note?: string };
  n: number;
  dataset: string;
  edition: PsEdition;
  recorded?: PsRecorded;
  connection: Connection;
}) {
  const name = `example-${n}.py`;
  const [state, setState] = useState<{ job: PsJobState; since: number } | null>(null);
  const [out, setOut] = useState<{ stdout: string; error: PsError | null; recorded: boolean } | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [open, setOpen] = useState(true);
  const abort = useRef<AbortController | null>(null);
  useEffect(() => () => abort.current?.abort(), []);

  async function run() {
    const ctl = new AbortController();
    abort.current = ctl;
    setProblem(null);
    setState({ job: "queued", since: Date.now() });
    const r = await sparkJob<PsRunResult>({ mode: "playground", dataset, edition, code: block.code }, { signal: ctl.signal, onState: (job) => setState((s) => (s ? { ...s, job } : s)) });
    abort.current = null;
    setState(null);
    if (r.state === "done") {
      const c = r.result.cases[0];
      setOut({ stdout: c?.stdout ?? "", error: c?.error ?? r.result.error ?? null, recorded: false });
      setOpen(true);
    } else if (r.state !== "cancelled") setProblem(r.message);
  }
  const rec = recorded?.examples[block.id];
  const live = connection === "connected";
  return (
    <div className="p2-example ps-example">
      <div className="p2-example-head">
        <span>{name} · {block.title}</span>
        <span className="p2-example-acts">
          {out && (
            <button type="button" className="p2-small-btn" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
              {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />} {open ? "Hide" : "Show"}
            </button>
          )}
          {state ? (
            <button type="button" className="p2-small-btn" onClick={() => abort.current?.abort()}><Square size={12} /> Stop</button>
          ) : live ? (
            <button type="button" className="p2-small-btn" onClick={() => void run()} aria-label={`${out && !out.recorded ? "Run again" : "Run"}: ${block.title}`}>
              {out && !out.recorded ? <RotateCcw size={13} /> : <Play size={13} />} {out && !out.recorded ? "Run again" : "Run"}
            </button>
          ) : rec && !out ? (
            <button type="button" className="p2-small-btn" onClick={() => setOut({ ...rec, recorded: true })}>Show recorded output</button>
          ) : null}
        </span>
      </div>
      <Code code={block.code} label={name} />
      {state && <div className="ps-example-state"><JobLine state={state.job} since={state.since} /></div>}
      {problem && <p className="p2-note" role="status">{problem}</p>}
      {out && open && (
        <>
          {out.stdout && <pre className="p2-py-console ps-console" aria-live="polite" aria-label="Spark output">{out.stdout.replace(/\n+$/, "")}</pre>}
          {out.error && <SparkError error={out.error} />}
          {out.recorded && <p className="ps-ranon">Recorded from a real run on Apache Spark {recorded?.engine?.spark}. Spark isn&apos;t connected here, so this wasn&apos;t run now.</p>}
          {block.note && <div className="note"><Md text={block.note} /></div>}
        </>
      )}
    </div>
  );
}

/** Inspect nested values without replacing Spark types with SQL approximations. */
export function NestedValue({ value }: { value: unknown }) {
  if (value === null || value === undefined) return <>null</>;
  if (typeof value !== "object") {
    if (typeof value === "string" && /^[\[{]/.test(value)) {
      try { const parsed: unknown = JSON.parse(value); if (parsed && typeof parsed === "object") return <NestedValue value={parsed} />; } catch { /* readable raw value */ }
    }
    return <>{String(value)}</>;
  }
  return <details className="ps-nested"><summary>{Array.isArray(value) ? `${value.length} items` : `${Object.keys(value).length} fields`}</summary><dl>{Object.entries(value).map(([k, v]) => <div key={k}><dt>{k}</dt><dd><NestedValue value={v} /></dd></div>)}</dl></details>;
}

/** A built dataset's tables in the shape SQL's table cards take: columns with keys and links, sample rows, totals. */
export function psPreviews(datasetId: string, edition: PsEdition, tables: string[], sample?: Record<string, (string | null)[][]>): Record<string, DatasetPreview> {
  const d = psDataset(datasetId)?.built;
  if (!d) return {};
  const refs = Object.fromEntries(d.relationships.map((r) => [r.from, r.to]));
  return Object.fromEntries(tables.filter((t) => d.tables[t]).map((t) => {
    const s = d.tables[t];
    const columns = s.columns.map((c) => ({
      name: c.name,
      type: c.type,
      key: s.key.length === 1 && s.key[0] === c.name ? "PK" : null,
      references: refs[`${t}.${c.name}`],
    }));
    const values = sample?.[t] ?? editionRows(s, edition);
    return [t, { columns, result: { columns: s.columns.map((c) => c.name), values }, total: sample?.[t] ? values.length : s.rows[edition] ?? 0 }];
  }));
}

/** The tables an exercise uses, as SQL shows them: collapsed cards with columns, a few real rows and the row count.
 *  `sample` is an item's own sample tables, shown in place of the edition's rows. */
export function DatasetCards({ datasetId, tables, edition, sample, open = false, also = [] }: { datasetId: string; tables: string[]; edition: PsEdition; sample?: Record<string, (string | null)[][]>; open?: boolean; also?: PsAlso[] }) {
  const previews = Object.assign({}, ...also.map((a) => psPreviews(a.id, edition, a.tables.filter((t) => tables.includes(t)), sample)), psPreviews(datasetId, edition, tables, sample));
  // An item's own sample is small on purpose: show all of it.
  return <Tables tables={tables} open={open} previews={previews} usesAll="your code runs on all of them" shown={sample ? Infinity : undefined} />;
}

/** The dataset tables a predict program names, in the dataset's order. */
export const tablesRead = (spec: PsItemSpec) =>
  Object.keys(psDataset(spec.dataset.id)?.built?.tables ?? {}).filter((t) => new RegExp(`\\b${t}\\b`).test(spec.program ?? ""));

/** A predict program's input tables, under SQL's "data" label; nothing when the program reads no table. */
export function ProgramTables({ spec }: { spec: PsItemSpec }) {
  const tables = tablesRead(spec);
  if (tables.length === 0) return null;
  return (
    <>
      <p className="rx-label sec">data the program reads</p>
      <DatasetCards datasetId={spec.dataset.id} tables={tables} edition={spec.edition ?? "lesson"} />
    </>
  );
}

/** The expected result for a visible case, in SQL's expected-result card.
 *  Lessons and practice pass `collapsed` so the rows stay hidden until the learner opens the card. */
export function Expected({ expected, caseId, ordered = false, collapsed = false }: { expected: PsExpected; caseId: string; ordered?: boolean; collapsed?: boolean }) {
  const e = expected.visible[caseId];
  if (!e) return null;
  return <ExpectedResult columns={e.schema.map((c) => c.name)} rows={e.rows} total={e.row_count ?? e.rows.length} ordered={ordered} collapsed={collapsed} />;
}

/** One row per check: what was checked, and for a failure why, with quoted rows for visible cases only. */
export function CheckRows({ checks, onLine, columns, caseLabels }: { checks: PsCheckRow[]; onLine: (n: number) => void; columns?: string[]; caseLabels?: Record<string, string> }) {
  const named = (id: string) => caseLabels?.[id] ?? (id === "example" ? "small example" : id === "project" ? "project export" : undefined);
  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0 }} aria-label="Checks">
      {checks.map((c) => (
        <li key={c.id} className="p2-check">
          <span className={`p2-mark ${c.passed ? "pass" : "fail"}`} aria-hidden="true">{c.passed ? "✓" : "✗"}</span>
          <div>
            <span className="p2-sr">{c.passed ? "Passed" : "Failed"}: </span>
            {c.id === "technique" ? c.label.charAt(0).toUpperCase() + c.label.slice(1) : c.visible ? (named(c.id) ? `The ${named(c.id)}` : "The sample") : <>Hidden: {c.label}</>}
            {!c.passed && (
              <div className="p2-note">
                {c.message}
                {c.error?.line ? <> <button type="button" className="p2-linebtn" onClick={() => onLine(c.error!.line!)}>line {c.error.line}</button></> : null}
              </div>
            )}
            {!c.passed && c.missing && c.missing.length > 0 && <RowsBlock title="Missing from your result" rows={c.missing} columns={columns ?? []} />}
            {!c.passed && c.unexpected && c.unexpected.length > 0 && <RowsBlock title="In your result but shouldn't be" rows={c.unexpected} columns={columns ?? []} />}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function RowsBlock({ title, rows, columns }: { title: string; rows: unknown[][]; columns: string[] }) {
  return (
    <div className="ps-rows">
      <span className="ps-rows-title">{title}</span>
      <DataTable columns={rows[0].map((_, i) => ({ name: columns[i] ?? `column ${i + 1}` }))} rows={rows} label={title} />
    </div>
  );
}
