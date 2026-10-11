"use client";

import { useState } from "react";
import { labExperiments, labLessonPresets } from "@/content";
import { SqlWorkspace } from "@/components/editor/SqlWorkspace";
import { useLearning } from "@/lib/learning-state";

const toRun: Record<string, string> = {
  "create-table": "Run the script as written. It creates notes, then reads the table definition back from sqlite_master.",
  insert: "Run it to insert two rows, then add your own INSERT before the final SELECT.",
  update: "Run it once, then remove the WHERE clause and run again to see every row change.",
  delete: "Run it, then change the WHERE condition and watch which rows survive.",
  view: "Run it to create the view and query it like a table.",
  constraints: "Run the valid insert first, then choose “Try a duplicate tag” and run again.",
  transactions: "Run it, then change ROLLBACK to COMMIT and run again to compare the count.",
};

const observations: Record<string, string> = {
  "create-table": "The result shows the notes table name and its CREATE TABLE definition, including the primary key and required body.",
  insert: "The notes table contains two new rows: first note and second note.",
  update: "Only row 1 changes from draft to published; row 2 still says keep.",
  delete: "Only the row whose body says keep remains.",
  view: "The view returns only paid orders, with id, customer_id and quantity.",
  constraints: "The starter inserts one valid tag. Try a duplicate below to see the UNIQUE rule reject it.",
  transactions: "The remaining count is 0 because ROLLBACK undoes both inserted rows.",
};

export default function DatabaseLabPage() {
  const [replacement,setReplacement]=useState<string|null>(null);
  const [experimentId, setExperimentId] = useState(labExperiments[0]?.id);
  const experiment =
    labExperiments.find((e) => e.id === experimentId) ?? labExperiments[0];
  const drafts = useLearning((s) => s.drafts);
  const setDraft = useLearning((s) => s.setDraft);
  const key = `sql-lab-${experiment.id}`;
  const sql = drafts[key] ?? experiment.sql;

  return (
    <div className="workspace-page flex min-h-full flex-col">
      <div className="workspace-header">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1>Database Lab</h1>
          <span className="metadata">Create tables and change data safely. Each run starts from the original sample data, so nothing you change is kept.</span>
        </div>
      </div>
      <div className="practice-layout">
        <aside className="task-pane">
          <div className="eyebrow">Experiments</div>
          <div className="experiment-list mt-2" role="group" aria-label="Choose an experiment">
            {labExperiments.map(e => (
              <button key={e.id} type="button" aria-pressed={e.id === experiment.id} onClick={() => { setExperimentId(e.id); setReplacement(null); }}>
                {e.title}
              </button>
            ))}
          </div>
          <div className="my-5 h-px bg-[var(--border)]" />
          <h2 className="!text-lg font-semibold">{experiment.title}</h2>
          <dl className="lab-steps mt-3">
            <dt>What it teaches</dt>
            <dd>{experiment.description}</dd>
            <dt>What to run</dt>
            <dd>{toRun[experiment.id]}</dd>
            <dt>What you should see</dt>
            <dd>{observations[experiment.id]}</dd>
          </dl>
          {experiment.id === "constraints" && <button type="button" className="btn mt-3" onClick={() => {
            const duplicate = experiment.sql + "\nINSERT INTO tags(name) VALUES('sql');";
            if (sql !== experiment.sql && sql.trim()) setReplacement(duplicate); else setDraft(key, duplicate);
          }}>Try a duplicate tag</button>}
          <p className="metadata mt-4">
            Your SQL is saved in this browser. End your script with a
            SELECT to see its results.
          </p>
          <div className="my-5 h-px bg-[var(--border)]" />
          <details><summary>Lesson examples</summary>
          <ul className="mt-3 max-h-48 space-y-1 overflow-auto">
            {labLessonPresets.map((l) => (
              <li key={l.id}>
                <button
                  type="button"
                  className="btn ghost !justify-start text-left"
                  onClick={() => {if(sql!==experiment.sql&&sql.trim())setReplacement(l.example);else setDraft(key,l.example);}}
                >
                  {l.title}
                </button>
              </li>
            ))}
          </ul></details>
          {replacement!==null&&<div className="mt-4" role="group" aria-label="Replace lab draft"><p>Replace your current SQL with this example?</p><button className="btn mt-2" onClick={()=>{setDraft(key,replacement);setReplacement(null);}}>Replace draft</button><button className="btn ghost" onClick={()=>setReplacement(null)}>Keep draft</button></div>}
        </aside>
        <SqlWorkspace
          observation={(r,ran)=>r.error ? (experiment.id==="constraints" && /UNIQUE constraint failed: tags.name/.test(r.error) ? "The script reached a constraint violation. The breakdown below shows which statements ran before the write was rejected." : "The script could not finish. Review the error and your SQL.") : r.result ? `The final statement returned ${r.total??r.result.values.length} row${(r.total??r.result.values.length)===1?"":"s"} with columns ${r.result.columns.join(", ")}. ${ran===experiment.sql&&experiment.id==="transactions"?"These are the rows after the rollback.":"Inspect the values to understand the script’s effect."}` : "The script produced no table of rows."}
          value={sql}
          onChange={(v) => setDraft(key, v)}
          graded={false}
          allowWrites
          starter={experiment.sql}
          taskKey={experiment.id}
          autoRun
          editorLabel={`Database Lab editor: ${experiment.title}`}
        />
      </div>
    </div>
  );
}
