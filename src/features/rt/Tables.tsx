"use client";

import previews from "@/content/table-previews.json";

type Column = { name: string; type: string; key: string | null; references?: string };
type Preview = {
  columns: Column[];
  result: { columns: string[]; values: unknown[][] };
  total: number;
};
const data = previews as Record<string, Preview>;

/** "integer · key", "integer → shoppers": the type and any key, read under the column name. */
function describe(c: Column | undefined) {
  if (!c) return "";
  const type = c.type.toLowerCase() || "any";
  if (c.references) return `${type} → ${c.references.split(".")[0]}`;
  return c.key === "PK" ? `${type} · key` : type;
}

const cell = (v: unknown, j: number) =>
  v === null ? <td key={j} className="null">NULL</td> : <td key={j} title={String(v)}>{String(v)}</td>;

/** Tables as cards: each column header shows its name with its type underneath, then sample rows. */
export function Tables({ tables, open = false }: { tables: string[]; open?: boolean }) {
  return (
    <div className="rx-schema">
      {tables.map((t) => {
        const p = data[t];
        const byName = new Map(p?.columns.map((c) => [c.name, c]));
        return (
          <details key={t} className="rx-schema-table" open={open}>
            <summary>
              <b>{t}</b>
              <span>{p ? `${p.columns.length} columns · ${p.total} rows` : "created by the task"}</span>
            </summary>
            {p && (
              <>
                <div className="rx-table-wrap" style={{ padding: "4px 0 0" }} tabIndex={0} role="region" aria-label={`${t} sample rows`}>
                  <table className="rx-table rx-data">
                    <thead>
                      <tr>
                        {p.result.columns.map((c) => (
                          <th key={c} title={`${c} · ${describe(byName.get(c))}`} className={c === "id" ? "id" : undefined}>
                            <span className="n">{c}</span>
                            <span className="t">{describe(byName.get(c))}</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>{p.result.values.map((r, i) => <tr key={i}>{r.map(cell)}</tr>)}</tbody>
                  </table>
                </div>
                <p className="rx-table-foot">
                  {p.result.values.length < p.total ? `showing ${p.result.values.length} of ${p.total} rows` : `all ${p.total} rows`}
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
