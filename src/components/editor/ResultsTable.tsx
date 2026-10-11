import type { SqlResult } from "@/engine/grading";

export function ResultsTable({
  result,
  total,
  compact = false,
  label = "Result table",
}: {
  result: SqlResult;
  total?: number;
  label?: string;
  /** Small inline table without the row-count header (examples, previews). */
  compact?: boolean;
}) {
  const shown = result.values.length;
  const all = total ?? shown;
  return (
    <div>
      <div className={`metadata px-4 py-3 ${compact ? "hidden" : ""}`}>
        {all} row{all === 1 ? "" : "s"}
        {all > shown ? ` · showing first ${shown}` : ""} · SQLite
      </div>
      <div
        className={compact ? "overflow-auto" : "overflow-auto px-4 pb-4"}
        tabIndex={0}
        role="region"
        aria-label={`${label}: ${result.columns.join(", ")}`}
      >
        <table className={`results-table ${compact ? "compact" : ""}`}>
          <thead>
            <tr>
              <th>#</th>
              {result.columns.map((c) => (
                <th key={c}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.values.length === 0 ? (
              <tr>
                <td colSpan={result.columns.length + 1} className="text-[var(--muted)]">
                  No rows returned. The column names are shown above.
                </td>
              </tr>
            ) : (
              result.values.map((row, i) => (
                <tr key={i}>
                  <td className="text-[var(--muted)]">{i + 1}</td>
                  {row.map((cell, j) => (
                    <td key={j}>
                      {cell === null ? (
                        <span className="text-[var(--muted)]">NULL</span>
                      ) : (
                        String(cell)
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
