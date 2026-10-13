"use client";
import { PageHeader } from "@/components/layout/PageHeader";
import { WorkspaceSplit } from "@/components/editor/WorkspaceSplit";

import { useState } from "react";
import { labExperiments, labLessonPresets } from "@/content";
import { SqlWorkspace } from "@/components/editor/SqlWorkspace";
import { useLearning } from "@/lib/learning-state";
import { labObservations as observations, labToRun as toRun } from "@/content/lab-guides";

export default function DatabaseLabPage() {
  // The pending replacement shows its confirmation next to the control that asked for it.
  const [replacement,setReplacement]=useState<{sql:string;from:"duplicate"|"more"}|null>(null);
  const [experimentId, setExperimentId] = useState(labExperiments[0]?.id);
  const experiment =
    labExperiments.find((e) => e.id === experimentId) ?? labExperiments[0];
  const drafts = useLearning((s) => s.drafts);
  const setDraft = useLearning((s) => s.setDraft);
  const key = `sql-lab-${experiment.id}`;
  const sql = drafts[key] ?? experiment.sql;
  const duplicateTag = experiment.sql + "\nINSERT INTO tags(name) VALUES('sql');";
  // Ask before replacing only when the editor holds the learner's own edits.
  const loaded = new Set([experiment.sql, duplicateTag, ...labLessonPresets.map((l) => l.example)]);
  const hasOwnEdits = !!sql.trim() && !loaded.has(sql);
  const load = (next: string, from: "duplicate" | "more") => {
    if (hasOwnEdits) setReplacement({ sql: next, from });
    else { setDraft(key, next); setReplacement(null); }
  };

  const confirm = replacement && (
    <div className="replace-confirm mt-4" role="group" aria-label="Replace your SQL">
      <p>Replace your current SQL with this example? Your edits will be lost.</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button className="btn" onClick={() => { setDraft(key, replacement.sql); setReplacement(null); }}>Replace my SQL</button>
        <button className="btn ghost" onClick={() => setReplacement(null)}>Keep my SQL</button>
      </div>
    </div>
  );

  return (
    <div className="workspace-page flex min-h-full flex-col">
      <div className="tool-header">
        <PageHeader
          title="Database Lab"
          description="Learn how databases change. Create tables, insert and update records, add constraints, and test transactions in a safe environment that resets after each run."
        />
      </div>
      <WorkspaceSplit>
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
          {experiment.id === "constraints" && <button type="button" className="btn mt-3" onClick={() => load(duplicateTag, "duplicate")}>Try a duplicate tag</button>}
          {replacement?.from === "duplicate" && confirm}
          <p className="metadata mt-4">
            Every run starts from a fresh temporary database, so tables and rows you create are not
            kept between runs. Your SQL itself is saved in this browser. End your script with a
            SELECT to see what changed.
          </p>
          <div className="my-5 h-px bg-[var(--border)]" />
          <section aria-labelledby="more-experiments">
            <h3 id="more-experiments" className="text-sm font-semibold">More database experiments</h3>
            <p className="metadata mt-1">Scripts from the lessons. Choose one to load it into the editor, then run it.</p>
            <ul className="mt-3 space-y-1">
              {labLessonPresets.map((l) => (
                <li key={l.id}>
                  <button
                    type="button"
                    className="btn ghost w-full !justify-start text-left"
                    onClick={() => load(l.example, "more")}
                  >
                    {l.title}
                  </button>
                </li>
              ))}
            </ul>
            {replacement?.from === "more" && confirm}
          </section>
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
      </WorkspaceSplit>
    </div>
  );
}
