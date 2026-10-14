"use client";

import { useState } from "react";
import { playgroundPresets } from "@/content";
import { practiceDatasets, practiceSeed } from "@/content/question-bank";
import { useLearning } from "@/lib/learning-state";
import { Shell } from "../Shell";
import { TaskCell } from "../Cells";
import { PLAYGROUND_EDITOR_HEIGHT } from "../editor-height";
import { Tables } from "../Tables";
import { Select } from "../Select";
import { prettySql } from "@/components/editor/pretty-sql";

/** Free querying on sample databases. No grades, no progress, real results. */
export function Playground() {
  const [dataset, setDataset] = useState("shop");
  const [pending, setPending] = useState<string | null>(null);
  const drafts = useLearning((s) => s.drafts);
  const setDraft = useLearning((s) => s.setDraft);
  const info = practiceDatasets[dataset];
  const tables = info?.tables ?? [];
  const key = `sql-playground-${dataset}`;
  const starter = `SELECT * FROM ${tables[0] ?? "customers"} LIMIT 20;`;
  const value = drafts[key] ?? starter;
  const presets = playgroundPresets[dataset] ?? [];
  const presetSql = (p: { label: string; query: string }) => `-- ${p.label}\n${prettySql(p.query)}`;
  const loaded = new Set([starter, ...presets.map(presetSql), ...presets.map((p) => `-- ${p.label}\n${p.query}`), ...tables.map((t) => `SELECT * FROM ${t} LIMIT 20;`)]);
  const load = (sql: string) => {
    // Ask only when the editor holds the learner's own edits.
    if (value.trim() && !loaded.has(value)) setPending(sql);
    else { setDraft(key, sql); setPending(null); }
  };

  return (
    <Shell
      path={[{ label: "sql" }, { label: "playground" }, { label: dataset }]}
      section="tools"
      status={["SQL", "playground · not graded", `sqlite · ${info?.name ?? dataset}`, "each run starts from the original data"]}
    >
      <div className="rx-task rx-lesson">
        <div className="rx-task-split">
          <article className="rx-brief" aria-labelledby="pg-title">
            <p className="rx-prompt-line"><b>playground</b> explore data · try ideas · no grades</p>
            <h1 id="pg-title" className="rx-task-title">SQL Playground</h1>
            <p className="rx-prose" style={{ margin: "10px 0" }}>Choose a sample database, write any SELECT query, and look at what comes back. Nothing is graded or saved to your progress.</p>
            <Select
              id="pg-database"
              label="database"
              value={dataset}
              onChange={(v) => { setDataset(v); setPending(null); }}
              options={Object.entries(practiceDatasets).map(([id, d]) => ({ value: id, label: `${d.name} · ${d.tables.length} tables` }))}
            />
            <p className="rx-small" style={{ marginTop: 8, fontFamily: "var(--rx-sans)", fontSize: 14, color: "var(--rx-dim)" }}>{info?.description}</p>
            {presets.length > 0 && (
              <>
                <p className="rx-label">try a query</p>
                <ul className="rx-pick">
                  {presets.map((p) => (
                    <li key={p.label}>
                      <button type="button" onClick={() => load(presetSql(p))}>
                        <span className="g">sql›</span><span className="t">{p.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <p className="rx-label">tables · click a name to query it</p>
            <ul className="rx-pick rx-pick-inline">
              {tables.map((t) => (
                <li key={t}><button type="button" onClick={() => load(`SELECT * FROM ${t} LIMIT 20;`)}><span className="g">⊞</span><span className="t">{t}</span></button></li>
              ))}
            </ul>
            <div className="rx-two-col">
              <Tables tables={tables} open />
            </div>
          </article>
          <section className="rx-work rx-lesson-work" aria-label="Query editor">
            {pending && (
              <div className="rx-confirm" role="group" aria-label="Replace your SQL">
                <p>Replace your current SQL with this query? Your edits will be lost.</p>
                <div className="rx-confirm-acts">
                  <button type="button" className="rx-btn primary" onClick={() => { setDraft(key, pending); setPending(null); }}>Replace my SQL</button>
                  <button type="button" className="rx-btn" onClick={() => setPending(null)}>Keep my SQL</button>
                </div>
              </div>
            )}
            <TaskCell key={dataset} name="query.sql" value={value} onChange={(v) => setDraft(key, v)} graded={false} minHeight={PLAYGROUND_EDITOR_HEIGHT} tables={tables} task={{ seedSql: practiceSeed, allowWrites: dataset === "lab" }} />
            <p className="rx-small">Runs one SELECT or WITH query at a time. Results show up to 200 rows.</p>
          </section>
        </div>
      </div>
    </Shell>
  );
}
