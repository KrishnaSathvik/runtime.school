"use client";

import { forwardRef, useState, type ReactNode } from "react";
import { Play, Square, X } from "lucide-react";
import type { PyEditionFile } from "@/content/python-v2/datasets";
import { SIZES, allFiles, formatBytes, formatLabel, sizeFor, toolDataset, toolDatasets, type ToolDataset } from "@/content/python-v2/tools/friendly";
import type { PyOutputChunk, PyRunResult } from "@/engine/python/client";
import { PyEditor, type PyEditorHandle } from "@/features/py/PyEditor";
import { Keys, MacOnly } from "@/features/rt/Keys";
import { Select } from "@/features/rt/Select";
import { FilePreview } from "./DataFile";
import { ConsoleView } from "./Results";

/*
 * The building blocks every Python tool shares with the SQL tools: the same cell (name, ⌘↵ hint, editor, Run at the
 * bottom right, output underneath), the same labelled dataset picker, summary and table cards. Python tools are laid
 * out exactly like SQL's: a brief on the left (rx-brief), the work on the right (rx-work), a status line at the bottom.
 */

/** One-line summary of a finished run for the output header, SQL-style ("ok · …" / the error). */
function runSummary(r: PyRunResult | null, busy: boolean): { text: string; ok: boolean } {
  if (busy) return { text: "running…", ok: true };
  if (!r) return { text: "", ok: true };
  switch (r.status) {
    case "ok": return { text: `ok · ran in ${r.durationMs.toLocaleString("en-US")} ms`, ok: true };
    case "syntax-error": return { text: `${r.error.type}${r.error.line ? ` · line ${r.error.line}` : ""}`, ok: false };
    case "runtime-error": return { text: `${r.error.type}${r.error.line ? ` · ${r.error.file && r.error.file !== "main.py" ? `${r.error.file} ` : ""}line ${r.error.line}` : ""}`, ok: false };
    case "timeout": return { text: "stopped · took too long", ok: false };
    case "output-limit": return { text: "stopped · too much output", ok: false };
    case "stopped": return { text: "stopped", ok: false };
    default: return { text: "Python couldn't run", ok: false };
  }
}

/** The output panel under a Python cell, in SQL's rx-out style. */
export function PyOut({ result, live, busy, onLine, onClose, children }: { result: PyRunResult | null; live: PyOutputChunk[]; busy: boolean; onLine?: (n: number) => void; onClose?: () => void; children?: ReactNode }) {
  const s = runSummary(result, busy);
  if (!busy && !result) return null;
  return (
    <div className="rx-out" aria-live="polite">
      <div className="rx-out-meta">
        <span className={s.ok ? "ok" : "bad"}>{s.text}</span>
        {onClose && !busy && <span className="acts"><button type="button" className="rx-btn ghost" onClick={onClose} aria-label="Close output"><X size={13} /> Close</button></span>}
      </div>
      <ConsoleView live={live} result={result} busy={false} onLine={onLine} />
      {children}
    </div>
  );
}

/** A Python cell: the SQL cell's layout with the Python editor. */
export const PyCell = forwardRef<PyEditorHandle, {
  name: string;
  value: string;
  onChange: (v: string) => void;
  onRun: () => void;
  onStop?: () => void;
  busy: boolean;
  result: PyRunResult | null;
  live?: PyOutputChunk[];
  minHeight?: string;
  errorLine?: { line: number; token: number } | null;
  /** Extra controls in the footer, left of Run (reset…). */
  footer?: ReactNode;
  runLabel?: string;
  onLine?: (n: number) => void;
  onCloseOutput?: () => void;
  /** Shown under the output (files written, database changes…). */
  after?: ReactNode;
  /** Above the editor, inside the cell (file tabs). */
  top?: ReactNode;
  focus?: boolean;
}>(function PyCell({ name, value, onChange, onRun, onStop, busy, result, live = [], minHeight = "220px", errorLine = null, footer, runLabel = "Run", onLine, onCloseOutput, after, top, focus }, ref) {
  return (
    <div className={`rx-cell ${focus ? "focus" : ""}`}>
      <div className="rx-cell-head">
        <span className="name">{name}</span>
        <span className="acts" aria-hidden="true">
          <MacOnly><Keys keys={["mod", "enter"]} /> <span>run</span></MacOnly>
        </span>
      </div>
      {top}
      <PyEditor ref={ref} value={value} onChange={onChange} onRun={onRun} onCheck={onRun} label={name} minHeight={minHeight} errorLine={errorLine} />
      <div className="rx-cell-foot">
        <span className="hint"> </span>
        {footer}
        {busy && onStop ? (
          <button type="button" className="rx-btn" onClick={onStop}><Square size={12} /> Stop</button>
        ) : (
          <button type="button" className="rx-btn" disabled={busy} onClick={onRun}><Play size={13} /> {busy ? "Running…" : runLabel}</button>
        )}
      </div>
      {(busy || result) && <div className="rx-result"><PyOut result={result} live={live} busy={busy} onLine={onLine} onClose={onCloseOutput}>{after}</PyOut></div>}
    </div>
  );
});

/** The labelled dataset picker, as in every SQL tool. */
export function PyDatasetPicker({ value, onChange, id = "py-dataset", allowNone = false, label = "dataset" }: { value: string; onChange: (id: string) => void; id?: string; allowNone?: boolean; label?: string }) {
  return (
    <Select
      id={id}
      label={label}
      value={value}
      onChange={onChange}
      options={[...(allowNone ? [{ value: "", label: "No dataset (plain Python)" }] : []), ...toolDatasets.map((d) => ({ value: d.id, label: d.name }))]}
    />
  );
}

/** Dataset description and facts line, as SQL's DatasetSummary. */
export function PyDatasetSummary({ d, size }: { d: ToolDataset; size: string }) {
  const files = allFiles(d, size);
  const main = files.find((f) => f.table === d.start && f.format === "csv");
  return (
    <div className="rx-ds-summary">
      <p className="rx-prose">{d.blurb}</p>
      <p className="rx-ds-facts mono">
        {main && <span><b>{main.rows.toLocaleString("en-US")}</b> {d.unit}</span>}
        <span><b>{d.tables.length}</b> table{d.tables.length === 1 ? "" : "s"}</span>
        <span>{monthRange(d.manifest.window[0], d.manifest.window[1])}</span>
      </p>
    </div>
  );
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const month = (iso: string) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
/** "Mar 2025", "Jan 2025 – Jun 2025". */
function monthRange(from: string, to: string): string {
  return from.slice(0, 7) === to.slice(0, 7) ? month(from) : `${month(from)} – ${month(to)}`;
}

/** Sizes a dataset has, as a labelled select. */
export function PySizePicker({ d, value, onChange, id = "py-size" }: { d: ToolDataset; value: string; onChange: (s: string) => void; id?: string }) {
  const options = Object.entries(SIZES).filter(([k]) => d.manifest.editions[k]?.files).map(([k, label]) => {
    const f = d.manifest.editions[k].files!.find((x) => x.table === d.start && x.format === "csv");
    return { value: k, label: `${label}${f ? ` · ${f.rows.toLocaleString("en-US")} ${d.unit}` : ""}` };
  });
  return <Select id={id} label="size" value={sizeFor(d, value)} onChange={onChange} options={options} />;
}

/**
 * Every file of a dataset size as SQL-style table cards: what one row means, columns with keys, a preview, and an
 * action (load it in code). Non-table files (JSON, API pages, Parquet, XML) are cards too, grouped by folder.
 */
export function PyTableList({ d, size, action, actionLabel = "Load in code" }: { d: ToolDataset; size: string; action?: (f: PyEditionFile) => void; actionLabel?: string }) {
  const files = allFiles(d, size).filter((f) => f.layer === "clean");
  const tables = files.filter((f) => f.format === "csv");
  const others = files.filter((f) => f.format !== "csv");
  const folders = new Map<string, PyEditionFile[]>();
  for (const f of others) {
    const k = f.path.includes("/") ? f.path.slice(0, f.path.lastIndexOf("/") + 1) : "";
    (folders.get(k) ?? folders.set(k, []).get(k)!).push(f);
  }
  return (
    <div className="rx-schema rx-ds-tables">
      {tables.map((f) => <PyFileCard key={f.url} d={d} f={f} action={action} actionLabel={actionLabel} />)}
      {[...folders.entries()].map(([dir, list]) =>
        dir && list.length > 2 ? (
          <details key={dir} className="rx-schema-table rx-ds-table">
            <summary><b>data/{dir}</b><span>{list.length} {formatLabel(list[0])} files</span></summary>
            <p className="rx-ds-grain">{d.manifest.tables[list[0].table]?.description} The same records split across files, as an API or a log writer produces them.</p>
            <ul className="rx-ds-cols">
              {list.map((f) => (
                <li key={f.url}>
                  <div className="rx-ds-col"><span className="n">{f.path.slice(dir.length)}</span><span className="meta"><span className="ty">{f.rows.toLocaleString("en-US")} records · {formatBytes(f.bytes)}</span></span></div>
                </li>
              ))}
            </ul>
            {action && <div className="rx-ds-acts"><button type="button" className="rx-btn" onClick={() => action(list[0])}>{actionLabel}</button></div>}
          </details>
        ) : (
          list.map((f) => <PyFileCard key={f.url} d={d} f={f} action={action} actionLabel={actionLabel} />)
        ),
      )}
    </div>
  );
}

function PyFileCard({ d, f, action, actionLabel }: { d: ToolDataset; f: PyEditionFile; action?: (f: PyEditionFile) => void; actionLabel: string }) {
  const [preview, setPreview] = useState(false);
  const t = d.manifest.tables[f.table];
  const isTable = f.format === "csv" || f.format === "parquet";
  const fk = new Map((t?.foreignKeys ?? []).map((k) => [k.column, k.references.split(".")[0]]));
  return (
    <details className="rx-schema-table rx-ds-table">
      <summary>
        <b>{f.format === "csv" ? f.table : `data/${f.path}`}</b>
        <span>{f.rows.toLocaleString("en-US")} {isTable ? "rows" : "records"}{isTable && t ? ` · ${t.columns.length} columns` : ""} · {formatLabel(f)}</span>
      </summary>
      {t && <p className="rx-ds-grain">{t.description}</p>}
      <p className="rx-ds-grain mono">In your code: data/{f.path}</p>
      {isTable && t && (
        <ul className="rx-ds-cols" aria-label={`Columns of ${f.table}`}>
          {t.columns.map((c) => (
            <li key={c.name}>
              <div className="rx-ds-col">
                <span className="n">{c.name}</span>
                <span className="meta">
                  <span className="ty">{c.type}{c.nullable ? " · can be empty" : ""}</span>
                  {t.primaryKey.includes(c.name) && <span className="rx-tag amber">key</span>}
                  {fk.has(c.name) && <span className="rx-tag">→ {fk.get(c.name)}</span>}
                </span>
              </div>
              <p className="m">{c.description}</p>
            </li>
          ))}
        </ul>
      )}
      <div className="rx-ds-acts">
        {f.format !== "parquet" && <button type="button" className="rx-btn" aria-expanded={preview} onClick={() => setPreview((v) => !v)}>{preview ? "Hide preview" : "Preview"}</button>}
        {action && <button type="button" className="rx-btn" onClick={() => action(f)}>{actionLabel}</button>}
      </div>
      {preview && <div className="py-ds-preview"><FilePreview file={f} columns={t?.columns} rows={12} /></div>}
    </details>
  );
}

/** "Python · playground · not graded · Online Store · runs in your browser" */
export function pyStatus(tool: string, datasetId?: string | null): string[] {
  const d = toolDataset(datasetId);
  return ["Python", `${tool} · not graded`, ...(d ? [d.name] : []), "runs in your browser"];
}
