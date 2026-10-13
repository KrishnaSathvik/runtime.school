"use client";

import { useState } from "react";
import { executeSql, type ExecuteResponse } from "@/engine/sql-client";
import { practiceSeed } from "@/content/question-bank";
import { ResultsTable } from "@/components/editor/ResultsTable";
import { SqlError } from "@/components/editor/Explanation";
import type { CasePrepDemo as Demo } from "@/content/question-bank/case-studies";

/** Ungraded inspection query for case preparation. Does not record progress. */
export function CasePrepDemo({ demo }: { demo: Demo }) {
  const [response, setResponse] = useState<ExecuteResponse | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <li className="border-b border-[var(--border)] pb-4">
      <strong>{demo.title}</strong>
      <p className="mt-1 text-[var(--text-secondary)]">{demo.description}</p>
      <pre tabIndex={0} className="sql-mono mt-2 overflow-x-auto text-xs">
        {demo.query}
      </pre>
      <button
        type="button"
        className="btn mt-3"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const r = await executeSql({ seed: practiceSeed, query: demo.query, allowWrites: false });
            if (!r.superseded) setResponse(r);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Running…" : "Run this inspection"}
      </button>
      <div aria-live="polite" aria-busy={busy}>
        {response?.result && <ResultsTable result={response.result} total={response.total} />}
        {response?.error && <SqlError error={response.error} query={demo.query} />}
      </div>
    </li>
  );
}
