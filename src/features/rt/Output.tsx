"use client";

import { useState, type ReactNode } from "react";
import type { ExecuteResponse } from "@/engine/sql-client";
import { explainError, type ErrorSurface, type Explanation } from "@/engine/explain";

/** Rows shown before "Show all", so a large result does not push the page down. */
const FIRST_ROWS = 10;

/** Query output styled like the database answered: rows, columns, then the table. */
export function Output({ res, query, actions, tables, surface, echo = true }: {
  res: ExecuteResponse;
  query: string;
  /** Repeat the SQL that ran above the rows. Off where the editor right above already shows it. */
  echo?: boolean;
  actions?: ReactNode;
  /** Tables of the dataset this ran on, so an unknown-table error suggests only those. */
  tables?: string[];
  /** Where the SQL ran, for wording that fits a graded exercise or an ungraded tool. */
  surface?: ErrorSurface;
}) {
  const [expanded, setExpanded] = useState(false);
  const result = res.result;
  const total = res.total ?? result?.values.length ?? 0;
  const returned = result?.values.length ?? 0;
  const rows = result ? (expanded ? result.values : result.values.slice(0, FIRST_ROWS)) : [];
  const explained = res.error ? explainError(res.error, query, tables ?? [], surface) : null;
  return (
    <div className="rx-out" aria-live="polite">
      <div className="rx-out-meta">
        {explained ? (
          <span className={explained.tone === "info" ? "ok" : "bad"}>{explained.title}</span>
        ) : result ? (
          <span className="ok">
            {total.toLocaleString("en-US")} row{total === 1 ? "" : "s"} · {result.columns.length} column{result.columns.length === 1 ? "" : "s"}
          </span>
        ) : (
          <span className="ok">ok · statement ran, no rows returned</span>
        )}
        {actions && <span className="acts">{actions}</span>}
      </div>
      {echo && query.trim() && (
        <pre className="rx-out-sql" tabIndex={0}><code>{query.trim()}</code></pre>
      )}
      {res.failure && res.failure.completed > 0 && (
        <p className="rx-failure mono">
          {res.failure.completed} statement{res.failure.completed === 1 ? "" : "s"} ran, then statement {res.failure.statement} stopped the script:
          <code>{res.failure.sql}</code>
          {res.failure.openTransaction ? "An open transaction was rolled back." : ""}
        </p>
      )}
      {explained && <ErrorText explanation={explained} />}
      {result && (
        <div className="rx-table-wrap" tabIndex={0} role="region" aria-label={`Output: ${result.columns.join(", ")}`}>
          <table className="rx-table">
            <thead>
              <tr>
                <th className="rn">#</th>
                {result.columns.map((c) => <th key={c}>{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {result.values.length === 0 ? (
                <tr><td colSpan={result.columns.length + 1} className="null">no rows</td></tr>
              ) : (
                rows.map((row, i) => (
                  <tr key={i}>
                    <td className="rn">{i + 1}</td>
                    {row.map((v, j) => (v === null ? <td key={j} className="null">NULL</td> : <td key={j}>{String(v)}</td>))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      {result && returned > FIRST_ROWS && (
        <div className="rx-out-more">
          <span>
            {expanded
              ? total > returned ? `showing the first ${returned} of ${total.toLocaleString("en-US")} rows` : `showing all ${returned} rows`
              : `showing ${FIRST_ROWS} of ${total.toLocaleString("en-US")} rows`}
          </span>
          <button type="button" className="rx-btn ghost" aria-expanded={expanded} onClick={() => setExpanded((e) => !e)}>
            {expanded ? "Show fewer" : total > returned ? `Show first ${returned}` : `Show all ${returned}`}
          </button>
        </div>
      )}
    </div>
  );
}

function ErrorText({ explanation }: { explanation: Explanation }) {
  return (
    <div className="rx-error">
      {/* Plain language only: the raw engine message is never shown to learners. */}
      <span className="why">
        {explanation.detail} {explanation.next}
      </span>
    </div>
  );
}
