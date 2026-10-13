"use client";

import { Fragment } from "react";
import previews from "@/content/table-previews.json";
import { useHorizontalOverflow } from "./use-horizontal-overflow";
import { ResultsTable } from "./ResultsTable";
import { SchemaColumns } from "./SchemaColumns";

type Preview = {
  columns: { name: string; type: string; key: string | null; references?: string }[];
  result: { columns: string[]; values: unknown[][] };
  total: number;
};

function PreviewRows({ table, preview }: { table: string; preview: Preview }) {
  const { ref, overflows } = useHorizontalOverflow<HTMLDivElement>();
  return (
    <>
      <p className="metadata my-3">
        First {preview.result.values.length} of {preview.total} rows · original sample data
        {overflows ? " · scroll sideways for more columns" : ""}
      </p>
      <div
        ref={ref}
        className="table-scroll"
        tabIndex={0}
        role="region"
        aria-label={`${table} sample rows`}
      >
        <ResultsTable result={preview.result} compact />
      </div>
    </>
  );
}

/** Declared foreign keys first, then same-name joins (viewer_id → viewers.id) between the listed tables. */
export function tableRelations(tables: string[], data: Record<string, Preview>) {
  const set = new Set(tables);
  const out: string[] = [];
  for (const t of tables) for (const c of data[t]?.columns ?? []) {
    if (c.references) { out.push(`${t}.${c.name} → ${c.references}`); continue; }
    const m = c.name.match(/^(\w+)_id$/);
    const target = m && [`${m[1]}s`, `${m[1]}es`, m[1]].find(x => set.has(x) && x !== t && data[x]?.columns.some(k => k.name === "id"));
    if (target) out.push(`${t}.${c.name} → ${target}.id`);
  }
  return out;
}

/** Extra tables in a catalog browse vs. tables beyond the current task focus. */
export function extraTablesLabel(catalog: boolean) {
  return catalog ? "Also in this database" : "Other tables in this database (optional)";
}

/** Without a task, every listed table is relevant. A catalog highlights the first tables; the rest stay labeled but visible. */
export function focusedTables(tables: string[], relevantTables: string[] | undefined, catalog: boolean) {
  return relevantTables ?? (catalog ? tables.slice(0, 2) : tables);
}

export function TableInspector({ tables, relevantTables, catalog = false, showRelations = false, heading = true, title = "Tables and sample data", caption, layout = "stack", collapsed = false }: {
  tables: string[];
  relevantTables?: string[];
  /** Browse a database that is not attached to one task. */
  catalog?: boolean;
  showRelations?: boolean;
  /** When false, the parent already provides a section label. */
  heading?: boolean;
  title?: string;
  caption?: string;
  /** "grid" places tables side by side when there is room (reading pages). */
  layout?: "stack" | "grid";
  /** Show each table as a one-line summary that expands to its schema and rows. */
  collapsed?: boolean;
}) {
  const data = previews as Record<string, Preview>;
  const relations = showRelations ? tableRelations(tables, data) : [];
  const relevant = new Set(focusedTables(tables, relevantTables, catalog));
  const otherLabel = extraTablesLabel(catalog);
  const ordered = [...tables.filter(t => relevant.has(t)), ...tables.filter(t => !relevant.has(t))];
  return (
    <section aria-label={title} className="table-inspector">
      {heading && (
        <>
          <h3 className="text-sm font-semibold">{title}</h3>
          {caption && <p className="metadata mt-1">{caption}</p>}
        </>
      )}
      {relations.length > 0 && (
        <div className="table-relations mt-2" aria-label="How the tables connect">
          <span className="metadata">How the tables connect:</span>
          {relations.map((r) => (
            <code key={r}>{r}</code>
          ))}
        </div>
      )}
      <div className={collapsed ? "table-summary-list mt-3" : layout === "grid" ? "table-grid mt-3" : "mt-2 space-y-5"}>
        {ordered.map((table, i) => {
          const p = data[table];
          const firstOther = i > 0 && !relevant.has(table) && relevant.has(ordered[i - 1]);
          const body = p ? (
            <>
              <SchemaColumns className="mt-2" columns={p.columns} />
              <PreviewRows table={table} preview={p} />
            </>
          ) : (
            <p className="metadata mt-3">
              This table is created by the task. Run your script to inspect its rows.
            </p>
          );
          return (
            <Fragment key={table}>
              {firstOther && <p className="eyebrow table-group-label">{otherLabel}</p>}
              {collapsed ? (
                <details id={`table-${table}`} className="table-preview table-summary scroll-mt-14">
                  <summary>
                    <code className="font-mono text-sm font-semibold">{table}</code>
                    {p && (
                      <span className="metadata">
                        {p.columns.length} columns · {p.total} rows ·{" "}
                        {p.columns.slice(0, 4).map((c) => c.name).join(", ")}
                        {p.columns.length > 4 ? ", …" : ""}
                      </span>
                    )}
                  </summary>
                  {body}
                </details>
              ) : (
                <div id={`table-${table}`} className="table-preview scroll-mt-14">
                  <code className="font-mono text-sm font-semibold">{table}</code>
                  {body}
                </div>
              )}
            </Fragment>
          );
        })}
      </div>
    </section>
  );
}
