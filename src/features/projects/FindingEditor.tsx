"use client";

import type { MilestoneState } from "@/lib/learning-state";

type Verified = {
  ok?: boolean;
  sql?: string;
  columns?: string[];
  values?: unknown[][];
  truncated?: boolean;
  rowCount?: number;
  guided?: boolean;
};

type Props = {
  projectId: number;
  lessonId: number;
  milestone: MilestoneState | undefined;
  draftSql: string;
  activeVariant: number;
  onChange: (notes: string) => void;
  /** Compact variant for the finish/review panel. */
  compact?: boolean;
};

/**
 * Single optional writing area for a milestone finding.
 * Notes never affect SQL credit or mastery.
 */
export function FindingEditor({
  milestone,
  draftSql,
  activeVariant,
  onChange,
  compact,
}: Props) {
  const verified = milestone?.results?.[activeVariant] as Verified | undefined;
  const verifiedSql = verified?.ok ? verified.sql ?? milestone?.queries?.[activeVariant] : undefined;
  const draftDiffers =
    !!verifiedSql && draftSql.trim().length > 0 && draftSql.trim() !== verifiedSql.trim();

  return (
    <div className={compact ? "mt-4" : "mt-0"}>
      <label htmlFor="milestone-notes" className={compact ? "block text-sm" : "eyebrow block"}>
        What did you find? <span className="metadata font-normal">(optional)</span>
      </label>
      <p className="metadata mt-1 max-w-xl">
        In your own words: what the results show, what evidence supports that, and why it matters for
        this business question. Passing Check answer does not verify your finding.
      </p>
      <textarea
        id="milestone-notes"
        className="notes-field mt-2"
        rows={compact ? 4 : 5}
        value={milestone?.notes ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Example: Weekend viewing is higher than weekdays in the sample; daily active viewers peak on Saturday…"
        aria-label="What did you find? (optional)"
      />

      {(verifiedSql || draftDiffers) && (
        <div className="mt-4 space-y-3 border-t border-[var(--border)] pt-4">
          <p className="metadata">Evidence from Check answer (not Run query)</p>
          {verifiedSql ? (
            <>
              <pre className="sql-mono overflow-x-auto bg-[var(--secondary)] p-3 text-xs">{verifiedSql}</pre>
              {verified?.columns?.length ? (
                <div>
                  <p className="metadata">
                    Checked result
                    {verified.truncated
                      ? ` · showing ${verified.values?.length ?? 0} of ${verified.rowCount ?? "many"} rows (storage cap)`
                      : ` · ${verified.values?.length ?? 0} row${(verified.values?.length ?? 0) === 1 ? "" : "s"}`}
                    {verified.guided ? " · solved with help" : ""}
                  </p>
                  <div className="mt-2 max-h-40 overflow-auto text-xs">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          {verified.columns.map((c) => (
                            <th key={c} className="border border-[var(--border)] px-2 py-1 text-left">
                              {c}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(verified.values ?? []).slice(0, 8).map((row, i) => (
                          <tr key={i}>
                            {row.map((cell, j) => (
                              <td key={j} className="border border-[var(--border)] px-2 py-1">
                                {cell === null || cell === undefined ? "NULL" : String(cell)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {(verified.values?.length ?? 0) > 8 && (
                      <p className="metadata mt-1">Preview of first 8 rows; full saved evidence is in the project report.</p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="metadata">Verified SQL is saved; no result table was stored for this check.</p>
              )}
            </>
          ) : (
            <p className="metadata">No verified Check answer yet for this challenge. Run query explores; Check answer grades and saves evidence.</p>
          )}
          {draftDiffers && (
            <p className="metadata text-[var(--warning,var(--muted))]">
              The editor draft differs from the last verified SQL. Re-check to attach new evidence — the
              draft is not treated as verified.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
