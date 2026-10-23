"use client";

import type { DatasetPreview as Preview } from "@/data/datasets/learning";

type Column = Preview["columns"][number];

/** Sample rows shown per table; queries always run on every row. */
export const PREVIEW_ROWS = 6;

const KIND: Record<string, string> = { INTEGER: "number", REAL: "decimal", NUMERIC: "number", TEXT: "text", BLOB: "binary" };

/** Plain words under a column name: what it holds, and whether it identifies a row or points to another table. */
function describe(c: Column | undefined, sample?: unknown) {
  if (!c) return "";
  // SQLite stores dates as text; name them by what the values are.
  const date = typeof sample === "string" && /^\d{4}-\d{2}-\d{2}/.test(sample) ? (sample.length > 10 ? "date & time" : "date") : null;
  const kind = date ?? KIND[c.type.toUpperCase()] ?? "";
  const role = c.references ? `links to ${c.references.split(".")[0]}` : c.key === "PK" ? "unique id" : "";
  return [kind, role].filter(Boolean).join(" · ");
}

const cell = (v: unknown, j: number) =>
  v === null ? <td key={j} className="null">NULL</td> : <td key={j} title={String(v)}>{String(v)}</td>;

/** Tables as cards: each column header shows its name with its type underneath, then sample rows. */
export function Tables({ tables, open = false, openTables, previews }: { tables: string[]; open?: boolean; /** Start these tables expanded. Other tables stay closed until the learner opens them. */ openTables?: string[]; previews: Record<string, Preview> }) {
  return (
    <div className="rx-schema">
      {tables.map((t) => {
        const p = previews[t];
        const byName = new Map(p?.columns?.map((c) => [c.name, c]));
        const rows = p?.result.values.slice(0, PREVIEW_ROWS) ?? [];
        const label = (column: string) => describe(byName.get(column), p?.result.values.find((r) => r[p.result.columns.indexOf(column)] !== null)?.[p.result.columns.indexOf(column)]);
        return (
          <details key={t} className={`rx-schema-table${p && (p.columns?.length ?? 0) > 5 ? " rx-schema-dense" : ""}`} open={open || openTables?.includes(t) || false}>
            <summary>
              <b>{t}</b>
              <span>{p ? `${p.columns?.length ?? p.result.columns.length} columns · ${p.total.toLocaleString("en-US")} rows` : "created by the task"}</span>
            </summary>
            {p && (
              <>
                <div className="rx-table-wrap" style={{ padding: "4px 0 0" }} tabIndex={0} role="region" aria-label={`${t} sample rows`}>
                  <table className="rx-table rx-data">
                    <thead>
                      <tr>
                        {p.result.columns.map((c) => (
                          <th key={c} title={`${c} · ${label(c)}`} className={c === "id" ? "id" : undefined}>
                            <span className="n">{c}</span>
                            <span className="t">{label(c)}</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>{rows.map((r, i) => <tr key={i}>{r.map(cell)}</tr>)}</tbody>
                  </table>
                </div>
                <div className="rx-table-records" aria-label={`${t} sample records`}>
                  {rows.map((row, i) => <dl className="rx-table-record" key={i}>
                    {p.result.columns.map((column, j) => <div key={column}>
                      <dt>{column}<span>{label(column)}</span></dt>
                      <dd>{row[j] === null ? <span className="null">NULL</span> : String(row[j])}</dd>
                    </div>)}
                  </dl>)}
                </div>
                <p className="rx-table-foot">
                  {rows.length < p.total ? `first ${rows.length} of ${p.total.toLocaleString("en-US")} rows · your queries use all of them` : `all ${p.total} rows`}
                </p>
              </>
            )}
          </details>
        );
      })}
    </div>
  );
}

/** The result a task expects, in the same card style as the tables, marked so it is not mistaken for data. */
export function ExpectedResult({ columns, rows, total, ordered }: { columns: string[]; rows: unknown[][]; total: number; ordered: boolean }) {
  return (
    <div className="rx-schema-table rx-expected">
      <div className="rx-expected-head">
        <b>expected result</b>
        <span>{total} row{total === 1 ? "" : "s"} · {ordered ? "in this order" : "any order"}</span>
      </div>
      <div className="rx-table-wrap" style={{ padding: "4px 0 0" }} tabIndex={0} role="region" aria-label="Expected result">
        <table className="rx-table rx-data">
          <thead><tr>{columns.map((c) => <th key={c} title={c}><span className="n">{c}</span></th>)}</tr></thead>
          <tbody>{rows.map((r, i) => <tr key={i}>{r.map(cell)}</tr>)}</tbody>
        </table>
      </div>
      <p className="rx-table-foot">{rows.length < total ? `first ${rows.length} of ${total} rows` : `all ${total} rows`}</p>
    </div>
  );
}
