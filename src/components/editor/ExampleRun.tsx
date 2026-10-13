"use client";

import { useId, useState } from "react";
import { ChevronDown, ChevronRight, Play, X } from "lucide-react";
import { seed } from "@/content";
import { executeSql, type ExecuteResponse } from "@/engine/sql-client";
import { ResultsTable } from "./ResultsTable";
import { SqlError } from "./Explanation";

/**
 * A runnable SQL example with an inline, collapsible result.
 * Hide keeps the result so Show reopens it without rerunning; Close discards it.
 * Running never affects progress.
 */
export function ExampleRun({
  query,
  allowWrites = false,
  title,
  runLabel = "Run example",
  small = false,
  describe = false,
}: {
  query: string;
  allowWrites?: boolean;
  /** Label in the example header, e.g. "example.sql · SQLite". */
  title?: string;
  runLabel?: string;
  /** Smaller code text for step-by-step snippets. */
  small?: boolean;
  /** Add a one-line plain-language summary of what the query returned. */
  describe?: boolean;
}) {
  const [response, setResponse] = useState<ExecuteResponse | null>(null);
  const [open, setOpen] = useState(true);
  const [busy, setBusy] = useState(false);
  const resultId = useId();

  const run = async () => {
    setBusy(true);
    try {
      const res = await executeSql({ seed, query, allowWrites });
      if (!res.superseded) {
        setResponse(res);
        setOpen(true);
      }
    } finally {
      setBusy(false);
    }
  };

  const rows = response?.result ? (response.total ?? response.result.values.length) : 0;
  const summary = response?.error
    ? "The query returned an error"
    : response?.result
      ? `${rows} row${rows === 1 ? "" : "s"} returned${rows > response.result.values.length ? ` · showing first ${response.result.values.length}` : ""} · SQLite`
      : "The statement ran · no rows to show";

  return (
    <div className="example-run">
      <div className="example-run-bar">
        <span className="metadata">{title}</span>
        <div className="example-run-actions">
          {response && (
            <button
              type="button"
              className="btn ghost"
              aria-expanded={open}
              aria-controls={resultId}
              onClick={() => setOpen((o) => !o)}
            >
              {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              {open ? "Hide result" : "Show result"}
            </button>
          )}
          <button type="button" className="btn outline" disabled={busy} onClick={() => void run()}>
            <Play size={14} /> {busy ? "Running…" : runLabel}
          </button>
        </div>
      </div>
      <pre tabIndex={0} className={`sql-mono overflow-x-auto ${small ? "text-xs" : ""}`}>{query}</pre>
      <div aria-live="polite" aria-busy={busy}>
        {response && open && (
          <section id={resultId} className="example-run-result" aria-label="Example result">
            <div className="example-run-result-bar">
              <span className="metadata">{summary}</span>
              <button
                type="button"
                className="btn ghost"
                onClick={() => setResponse(null)}
                aria-label="Close result"
              >
                <X size={14} /> Close
              </button>
            </div>
            {describe && response.result && (
              <p className="metadata px-4 pb-2">
                <strong>What happened?</strong> The query returned {rows} row{rows === 1 ? "" : "s"} with{" "}
                {response.result.columns.length} column{response.result.columns.length === 1 ? "" : "s"}:{" "}
                {response.result.columns.join(", ")}.
              </p>
            )}
            {response.result && <ResultsTable result={response.result} total={response.total} compact />}
            {response.error && (
              <div className="p-4">
                <SqlError error={response.error} query={query} />
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
