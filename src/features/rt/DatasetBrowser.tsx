"use client";

import { useState } from "react";
import type { CanonicalDatasetId } from "@/data/datasets/learning-map";
import { TOOL_DATASETS, datasetName, formatCount, relationships, tablesIn, toolDataset } from "@/content/tools/datasets";
import { Select } from "./Select";

/**
 * One canonical-dataset browser for every SQL tool: the same dataset picker, summary, table schema,
 * preview and relationships, so "Retail → orders" looks and means the same thing everywhere.
 */

export function DatasetPicker({ value, onChange, id = "tool-dataset" }: { value: CanonicalDatasetId; onChange: (id: CanonicalDatasetId) => void; id?: string }) {
  return (
    <Select
      id={id}
      label="dataset"
      value={value}
      onChange={(v) => onChange(v as CanonicalDatasetId)}
      options={TOOL_DATASETS.map((d) => ({ value: d, label: datasetName(d) }))}
    />
  );
}

export function DatasetSummary({ id }: { id: CanonicalDatasetId }) {
  const m = toolDataset(id).metadata;
  return (
    <div className="rx-ds-summary">
      <p className="rx-prose">{m.description}</p>
      <p className="rx-ds-facts mono">
        <span>{formatCount(m.totals.rows)} rows</span>
        <span>{m.totals.tables} tables</span>
        <span>{m.coverage.start.slice(0, 7)} – {m.coverage.end.slice(0, 7)}</span>
      </p>
    </div>
  );
}

type Table = ReturnType<typeof toolDataset>["metadata"]["tables"][number];

function TableCard({ id, table, onQuery }: { id: CanonicalDatasetId; table: Table; onQuery?: (table: string) => void }) {
  const [preview, setPreview] = useState(false);
  const d = toolDataset(id);
  const rows = d.metadata.rows[table.name] ?? 0;
  const fk = new Map(table.foreignKeys.flatMap((k) => k.columns.map((c) => [c, k.table] as const)));
  const p = d.previews[table.name];
  return (
    <details className="rx-schema-table rx-ds-table">
      <summary>
        <b>{table.name}</b>
        <span>{formatCount(rows)} rows · {table.columns.length} columns</span>
      </summary>
      <p className="rx-ds-grain">{table.grain}</p>
      <ul className="rx-ds-cols" aria-label={`Columns of ${table.name}`}>
        {table.columns.map((c) => (
          <li key={c.name}>
            <div className="rx-ds-col">
              <span className="n">{c.name}</span>
              <span className="meta">
                <span className="ty">{c.type}{c.nullable ? " · nullable" : ""}</span>
                {table.primaryKey.includes(c.name) && <span className="rx-tag amber">PK</span>}
                {fk.has(c.name) && <span className="rx-tag">→ {fk.get(c.name)}</span>}
              </span>
            </div>
            <p className="m">{c.meaning}</p>
          </li>
        ))}
      </ul>
      <div className="rx-ds-acts">
        {p && (
          <button type="button" className="rx-btn" aria-expanded={preview} onClick={() => setPreview((v) => !v)}>
            {preview ? "Hide preview" : `Preview ${p.result.values.length} rows`}
          </button>
        )}
        {onQuery && <button type="button" className="rx-btn" onClick={() => onQuery(table.name)}>Query this table</button>}
      </div>
      {preview && p && (
        <div className="rx-table-wrap rx-ds-preview" tabIndex={0} role="region" aria-label={`${table.name} preview`}>
          <table className="rx-table rx-data">
            <thead><tr>{p.result.columns.map((c) => <th key={c}><span className="n">{c}</span></th>)}</tr></thead>
            <tbody>
              {p.result.values.map((r, i) => (
                <tr key={i}>{r.map((v, j) => v === null ? <td key={j} className="null">NULL</td> : <td key={j} title={String(v)}>{String(v)}</td>)}</tr>
              ))}
            </tbody>
          </table>
          <p className="rx-table-foot">first {p.result.values.length} of {formatCount(rows)} rows · queries use all of them</p>
        </div>
      )}
    </details>
  );
}

/** Every table of a dataset (or the named subset), each expandable to its schema and a preview. */
export function TableList({ id, only, onQuery }: { id: CanonicalDatasetId; only?: string[]; onQuery?: (table: string) => void }) {
  const tables = toolDataset(id).metadata.tables.filter((t) => !only || only.includes(t.name));
  return (
    <div className="rx-schema rx-ds-tables">
      {tables.map((t) => <TableCard key={`${id}.${t.name}`} id={id} table={t} onQuery={onQuery} />)}
    </div>
  );
}

/** Declared foreign keys as join lines. Optional `only` keeps the project's relevant tables. */
export function RelationshipList({ id, only }: { id: CanonicalDatasetId; only?: string[] }) {
  const allowed = only ? new Set(only) : null;
  const rels = relationships(id).filter((r) => {
    if (!allowed) return true;
    return allowed.has(r.fromTable) && (allowed.has(r.toTable) || r.self);
  });
  if (!rels.length) return null;
  return (
    <ul className="rx-ds-rels mono" aria-label="Relationships">
      {rels.map((r) => {
        const from = `${r.fromTable}.${r.fromColumns.join(", ")}`;
        const to = `${r.toTable}.${r.toColumns.join(", ")}`;
        return (
          <li key={`${from}->${to}`}>
            <b>{from}</b>
            <span aria-hidden="true"> → </span>
            <span className="sr-only"> joins to </span>
            <span>{to}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** The dataset tables a script touches, with their real row counts. */
export function TablesInvolved({ id, sql }: { id: CanonicalDatasetId; sql: string }) {
  const rows = toolDataset(id).metadata.rows;
  const names = tablesIn(id, sql);
  if (!names.length) return null;
  return (
    <ul className="rx-ds-involved mono">
      {names.map((t) => <li key={t}><b>{t}</b> <span>{formatCount(rows[t] ?? 0)} rows</span></li>)}
    </ul>
  );
}
