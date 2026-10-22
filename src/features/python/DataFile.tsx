"use client";

import { useEffect, useState } from "react";
import type { PyColumn, PyEditionFile } from "@/content/python-v2/datasets";
import { formatBytes, formatLabel } from "@/content/python-v2/tools/friendly";
import { csvHead } from "./csv";

/**
 * A contained preview of one dataset file, in a box that scrolls inside itself: CSV as a table, JSON and GeoJSON
 * pretty-printed, JSON Lines record by record, XML as text, Parquet as its columns (it's binary). Only the start
 * of a file is fetched for text formats, so big files preview quickly.
 */
const TEXT_PREVIEW_BYTES = 48_000;

async function head(url: string, bytes: number): Promise<string> {
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  while (text.length < bytes) {
    const { value, done } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
  }
  void reader.cancel();
  return text;
}

/** The shape of a JSON value: lists cut to their first items (with a count of the rest), long strings shortened. */
export function abbreviate(v: unknown, depth = 0): unknown {
  if (Array.isArray(v)) {
    const keep = depth === 0 ? 3 : 2;
    const head = v.slice(0, keep).map((x) => abbreviate(x, depth + 1));
    return v.length > keep ? [...head, `… ${(v.length - keep).toLocaleString("en-US")} more`] : head;
  }
  if (v && typeof v === "object") {
    if (depth > 6) return "{…}";
    return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, abbreviate(x, depth + 1)]));
  }
  if (typeof v === "string" && v.length > 160) return `${v.slice(0, 157)}…`;
  return v;
}

type Loaded = { kind: "table"; rows: string[][] } | { kind: "text"; text: string; note?: string } | { kind: "error" };

export function FilePreview({ file, columns, rows = 50 }: { file: PyEditionFile; columns?: PyColumn[]; rows?: number }) {
  const fmt = file.path.endsWith(".xml") ? "xml" : file.format ?? "csv";
  const [state, setState] = useState<{ url: string; data: Loaded | null }>({ url: file.url, data: null });
  useEffect(() => {
    if (fmt === "parquet") return;
    let live = true;
    const done = (data: Loaded) => live && setState({ url: file.url, data });
    (async () => {
      try {
        if (fmt === "csv") return done({ kind: "table", rows: await csvHead(file.url, rows) });
        const whole = file.bytes <= TEXT_PREVIEW_BYTES;
        const text = await head(file.url, TEXT_PREVIEW_BYTES);
        if (fmt === "jsonl") {
          const lines = text.split("\n").filter(Boolean).slice(0, 5);
          const shown = lines.map((l, i) => { try { return `# record ${i + 1}\n${JSON.stringify(JSON.parse(l), null, 2)}`; } catch { return null; } }).filter(Boolean);
          return done({ kind: "text", text: shown.join("\n\n"), note: `First ${shown.length} of ${file.rows.toLocaleString("en-US")} records` });
        }
        if ((fmt === "json" || fmt === "geojson") && file.bytes <= 8e6) {
          const full = whole ? text : await (await fetch(file.url)).text();
          return done({ kind: "text", text: JSON.stringify(abbreviate(JSON.parse(full)), null, 2), note: "Its structure: long lists show their first items" });
        }
        return done({ kind: "text", text: text.slice(0, 12_000), note: whole ? undefined : "The start of the file" });
      } catch {
        done({ kind: "error" });
      }
    })();
    return () => { live = false; };
  }, [file.url, file.bytes, file.rows, fmt, rows]);

  if (fmt === "parquet") {
    return (
      <div className="pg-preview" tabIndex={0} role="region" aria-label={`Columns of ${file.path}`}>
        <p className="pt-muted pg-preview-note">Parquet is a binary, column-based format: it stores each column’s type, so dates and numbers load as dates and numbers. Its columns:</p>
        <table className="pg-cols">
          <tbody>{(columns ?? []).map((c) => <tr key={c.name}><td><code>{c.name}</code></td><td>{c.type}</td></tr>)}</tbody>
        </table>
      </div>
    );
  }
  const data = state.url === file.url ? state.data : null;
  if (!data) return <p className="pt-muted" role="status">Loading a preview…</p>;
  if (data.kind === "error") return <p className="pt-muted">The preview couldn&apos;t load. Check your connection.</p>;
  if (data.kind === "text") {
    return (
      <div className="pg-preview" tabIndex={0} role="region" aria-label={`Start of ${file.path}`}>
        {data.note && <p className="pt-muted pg-preview-note">{data.note}</p>}
        <pre>{data.text}</pre>
      </div>
    );
  }
  const r = data.rows;
  if (!r.length) return <p className="pt-muted">This file is empty.</p>;
  return (
    <div className="pg-preview" tabIndex={0} role="region" aria-label={`First rows of ${file.path}`}>
      <table className="pg-table">
        <thead><tr><th className="n" scope="col" title="Row number">#</th>{r[0].map((h, i) => <th key={i} title={columns?.find((c) => c.name === h)?.description}>{h}</th>)}</tr></thead>
        <tbody>{r.slice(1).map((row, i) => <tr key={i}><td className="n">{i + 1}</td>{row.map((v, j) => <td key={j} className={v === "" ? "empty" : undefined} title={v.length > 40 ? v : undefined}>{v === "" ? "—" : v}</td>)}</tr>)}</tbody>
      </table>
      <p className="pt-muted pg-preview-note">First {r.length - 1} of {file.rows.toLocaleString("en-US")} rows</p>
    </div>
  );
}

/** "CSV · 1,301 rows · 180 KB" */
export function fileFacts(f: PyEditionFile): string {
  return `${formatLabel(f)} · ${f.rows.toLocaleString("en-US")} ${f.format === "csv" || f.format === "parquet" || !f.format ? "rows" : "records"} · ${formatBytes(f.bytes)}`;
}
