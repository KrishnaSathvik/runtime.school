"use client";

import { Fragment } from "react";
import previews from "@/content/table-previews.json";
import { ResultsTable } from "./ResultsTable";

type Preview = {
  columns: { name: string; type: string; key: string | null; references?: string }[];
  result: { columns: string[]; values: unknown[][] };
  total: number;
};

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

export function TableInspector({ tables, relevantTables = tables.slice(0, 2), showRelations = false }: {
  tables: string[];
  relevantTables?: string[];
  showRelations?: boolean;
}) {
  const data = previews as Record<string, Preview>;
  const relations = showRelations ? tableRelations(tables, data) : [];
  const relevant = new Set(relevantTables);
  const ordered = [...tables.filter(t => relevant.has(t)), ...tables.filter(t => !relevant.has(t))];
  return <section aria-label="Tables and sample data" className="table-inspector">
    <h3 className="text-sm font-semibold">Tables and sample data</h3>
    {relations.length > 0 && <div className="table-relations mt-2" aria-label="How the tables connect">
      <span className="metadata">How the tables connect:</span>
      {relations.map(r => <code key={r}>{r}</code>)}
    </div>}
    {ordered.map((table, i) => {
      const p = data[table];
      const firstOther = i > 0 && !relevant.has(table) && relevant.has(ordered[i - 1]);
      return <Fragment key={table}>{firstOther && <p className="eyebrow mt-5">Other tables in this dataset · not needed for this task</p>}<details open={relevant.has(table)} className="table-preview">
        <summary><code>{table}</code><span className="metadata block mt-1">
          {p?.columns.map(c => c.name).join(" · ") || "Created by this task"}
        </span></summary>
        {p ? <>
          <ul className="schema-columns metadata mt-3">{p.columns.map(c => <li key={c.name}>
            <code>{c.name}</code> · {c.type}{c.key ? ` · ${c.key}` : ""}{c.references ? ` → ${c.references}` : ""}
          </li>)}</ul>
          <p className="metadata my-3">First {p.result.values.length} of {p.total} rows · original sample data</p>
          <div className="overflow-auto" tabIndex={0} role="region" aria-label={`${table} sample rows`}>
            <ResultsTable result={p.result} compact />
          </div>
        </> : <p className="metadata mt-3">This table is created by the task. Run your script to inspect its rows.</p>}
      </details></Fragment>;
    })}
  </section>;
}
