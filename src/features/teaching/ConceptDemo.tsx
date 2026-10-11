"use client";

import { useEffect, useState } from "react";
import { executeSql, type ExecuteResponse } from "@/engine/sql-client";
import { ResultsTable } from "@/components/editor/ResultsTable";
import { teachingDemos } from "./demos";
import { SqlError } from "@/components/editor/Explanation";

export function ConceptDemo({ kind }: { kind: string }) {
  const demo = teachingDemos[kind];
  const [choice, setChoice] = useState(0);
  const [execution, setExecution] = useState<{ sql: string; response: ExecuteResponse } | null>(null);
  const selected = demo.choices[choice];
  const result = execution?.sql === selected.sql ? execution.response : null;
  useEffect(() => {
    let active = true;
    setExecution(null);
    void executeSql({ seed: "", query: selected.sql }).then((r) => {
      if (active) setExecution({ sql: selected.sql, response: r });
    });
    return () => { active = false; };
  }, [selected]);
  return <section className="mt-8 border border-[var(--border)] p-4 sm:p-6" aria-label={demo.title}>
    <div className="eyebrow">Try an example · not graded</div>
    <h3 className="mt-2 text-lg font-semibold">{demo.title}</h3>
    <p className="mt-2 text-sm text-[var(--text-secondary)]">{demo.question}</p>
    <div className="mt-4 grid gap-4 sm:grid-cols-2">
      {demo.inputs.map((input) => <div key={input.label} className="min-w-0">
        <p className="metadata mb-2">{input.label}</p>
        <ResultsTable result={{ columns: input.columns, values: input.rows }} compact />
      </div>)}
    </div>
    <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Change the SQL example">
      {demo.choices.map((option, i) => <button key={option.label} type="button" className={`btn ${choice === i ? "primary" : ""}`} aria-pressed={choice === i} onClick={() => setChoice(i)}>{option.label}</button>)}
    </div>
    <details className="mt-4"><summary className="metadata cursor-pointer">See the SQL and sample data</summary><pre tabIndex={0} className="sql-mono mt-2 overflow-x-auto text-xs">{selected.sql}</pre></details>
    <div className="mt-4" aria-live="polite" aria-busy={!result}>
      {!result && <p className="metadata">Calculating the result…</p>}
      {result?.result && <><ResultsTable result={result.result} total={result.total} /><p className="mt-4 text-sm"><strong>Why it changed: </strong>{selected.why}</p></>}
      {result?.superseded && <p className="metadata">Another query interrupted this example. Choose a different option to run it.</p>}
      {result?.error && <SqlError error={result.error} query={selected.sql} />}
    </div>
  </section>;
}
