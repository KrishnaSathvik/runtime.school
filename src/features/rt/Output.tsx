"use client";

import type { ReactNode } from "react";
import type { ExecuteResponse } from "@/engine/sql-client";
import { explainError, type Explanation } from "@/engine/explain";

/** Query output styled like the database answered: rows, columns, then the table. */
export function Output({ res, query, actions }: { res: ExecuteResponse; query: string; actions?: ReactNode }) {
  const result = res.result;
  const total = res.total ?? result?.values.length ?? 0;
  const explained = res.error ? explainError(res.error, query, []) : null;
  return (
    <div className="rx-out" aria-live="polite">
      <div className="rx-out-meta">
        {explained ? (
          <span className="bad">{explained.title}</span>
        ) : result ? (
          <span className="ok">
            {total} row{total === 1 ? "" : "s"} · {result.columns.length} column{result.columns.length === 1 ? "" : "s"}
            {total > result.values.length ? ` · showing ${result.values.length}` : ""}
          </span>
        ) : (
          <span className="ok">ok · statement ran, no rows returned</span>
        )}
        {actions && <span className="acts">{actions}</span>}
      </div>
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
                result.values.map((row, i) => (
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
    </div>
  );
}

function ErrorText({ explanation }: { explanation: Explanation }) {
  return (
    <div className="rx-error">
      <span className="why">
        {explanation.detail} {explanation.next}
      </span>
      {explanation.technical && <span className="why mono" style={{ fontSize: 12, opacity: 0.75 }}>{explanation.technical}</span>}
    </div>
  );
}
