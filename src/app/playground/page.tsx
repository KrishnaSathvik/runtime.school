"use client";

import Link from "next/link";
import {TableInspector} from "@/components/editor/TableInspector";
import { useMemo, useState } from "react";
import { playgroundPresets } from "@/content";
import { practiceDatasets as datasetCatalog, practiceSeed } from "@/content/question-bank";
import { SqlWorkspace } from "@/components/editor/SqlWorkspace";
import { useLearning } from "@/lib/learning-state";

export default function PlaygroundPage() {
  const [dataset, setDataset] = useState("shop");
  const [replacement,setReplacement]=useState<string|null>(null);
  const drafts = useLearning((s) => s.drafts);
  const setDraft = useLearning((s) => s.setDraft);
  const key = `sql-playground-${dataset}`;
  const tables = useMemo(
    () => datasetCatalog[dataset]?.tables ?? [],
    [dataset],
  );
  const starter = useMemo(
    () => `SELECT * FROM ${tables[0] ?? "customers"} LIMIT 20;`,
    [tables],
  );
  const sql = drafts[key] ?? starter;
  const questions = playgroundPresets[dataset] ?? [];

  return (
    <div className="workspace-page flex min-h-full flex-col">
      <div className="workspace-header">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1>SQL Playground</h1>
          <span className="metadata">Explore any sample database with your own SQL. Nothing is graded, and each run starts with the original data.</span>
        </div>
      </div>
      <div className="practice-layout">
        <aside className="task-pane">
          <label className="text-xs text-[var(--muted)]">
            Sample database
            <select
              value={dataset}
              onChange={(e) => {setDataset(e.target.value);setReplacement(null);}}
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--main)] px-2 py-2 text-sm"
            >
              {Object.entries(datasetCatalog).map(([id, info]) => (
                <option key={id} value={id}>
                  {info.name}
                </option>
              ))}
            </select>
          </label>
          <p className="mt-4 text-sm leading-relaxed text-[var(--text-secondary)]">
            {datasetCatalog[dataset]?.description}
          </p>
          <div className="my-5 h-px bg-[var(--border)]" />
          <TableInspector tables={tables}/>
          <div className="my-5 h-px bg-[var(--border)]" />
          <div className="eyebrow">Try a question</div>
          <p className="metadata mt-1">
            Loads a working query into the editor. Run it, then change it.
          </p>
          <ul className="mt-3 space-y-1">
            {questions.map((q) => (
              <li key={q.label}>
                <button
                  type="button"
                  className="btn ghost w-full !justify-start text-left"
                  onClick={() => {const next=`-- ${q.label}\n${q.query}`;if(sql!==starter&&sql.trim())setReplacement(next);else setDraft(key,next);}}
                >
                  {q.label} →
                </button>
              </li>
            ))}
          </ul>
          {replacement!==null&&<div className="mt-4" role="group" aria-label="Replace playground draft"><p>Replace your current SQL with this example?</p><button className="btn mt-2" onClick={()=>{setDraft(key,replacement);setReplacement(null);}}>Replace draft</button><button className="btn ghost" onClick={()=>setReplacement(null)}>Keep draft</button></div>}
          <p className="metadata mt-6 leading-relaxed">
            Run one SELECT or WITH query at a time. SQL Studio stops waiting after 3 seconds,
            and results show up to 200 rows. To create or change tables, use the{" "}
            <Link href="/database-lab" className="text-[var(--accent)]">
              Database Lab
            </Link>
            .
          </p>
        </aside>
        <SqlWorkspace
          value={sql}
          onChange={(v) => setDraft(key, v)}
          graded={false}
          allowWrites={dataset === "lab"}
          seedSql={practiceSeed}
          taskKey={dataset}
          tables={tables}
          editorLabel="Playground SQL editor"
          starter={starter}
          autoRun
        />
      </div>
    </div>
  );
}
