"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { CanonicalDatasetId } from "@/data/datasets/learning-map";
import { CANONICAL_VERSION } from "@/data/datasets/learning";
import { CENTRAL_TABLE, STARTER_QUERY, datasetName, tableQuery, toolDataset } from "@/content/tools/datasets";
import { preloadDatabase } from "@/engine/sql-client";
import { Shell } from "../Shell";
import { TaskCell } from "../Cells";
import { PLAYGROUND_EDITOR_HEIGHT } from "../editor-height";
import { DatasetPicker, DatasetSummary, RelationshipList, TableList } from "../DatasetBrowser";
import { ReplaceConfirm, useScriptSlot, useSqlParam } from "../ScriptSlot";

/** Pick one of Runtime's twelve datasets and explore it with SQL. Nothing is graded. */
export function Playground({ dataset }: { dataset: CanonicalDatasetId }) {
  const router = useRouter();
  const d = toolDataset(dataset);
  const tables = d.metadata.tables.map((t) => t.name);
  const loaded = new Set([STARTER_QUERY[dataset], ...tables.map(tableQuery)]);
  const slot = useScriptSlot(`sql-playground-${dataset}@${CANONICAL_VERSION}`, STARTER_QUERY[dataset], (sql) => loaded.has(sql));
  useSqlParam(slot.load);
  // Start the download while the learner reads the schema.
  useEffect(() => preloadDatabase(d.seed), [d.seed]);

  return (
    <Shell
      path={[{ label: "sql" }, { label: "playground" }, { label: dataset }]}
      section="tools"
      status={["SQL", "playground · not graded", `sqlite · ${datasetName(dataset)}`, "read-only"]}
    >
      <div className="rx-task rx-lesson">
        <div className="rx-task-split">
          <article className="rx-brief" aria-labelledby="pg-title">
            <p className="rx-prompt-line"><b>playground</b> explore freely · no grades</p>
            <h1 id="pg-title" className="rx-task-title">SQL Playground</h1>
            <p className="rx-prose" style={{ margin: "10px 0" }}>Explore any Runtime dataset with SQL. Nothing here affects course progress.</p>
            <DatasetPicker value={dataset} onChange={(id) => router.push(`/sql/playground/${id}`, { scroll: false })} />
            <DatasetSummary id={dataset} />
            <p className="rx-label sec">tables</p>
            <p className="rx-cap">Open a table to see what one row means, its columns and keys, and a preview. Start from <b className="mono">{CENTRAL_TABLE[dataset]}</b>: it is the dataset&apos;s central table.</p>
            <TableList id={dataset} onQuery={(t) => slot.load(tableQuery(t))} />
            <p className="rx-label sec">relationships</p>
            <p className="rx-cap">How to join these tables. Left column matches the right column.</p>
            <RelationshipList id={dataset} />
          </article>
          <section className="rx-work rx-lesson-work rx-tool-work" aria-label="Query editor">
            <ReplaceConfirm sql={slot.pending} onConfirm={slot.confirm} onCancel={slot.cancel} />
            <TaskCell
              key={dataset}
              name="query.sql"
              value={slot.value}
              onChange={slot.set}
              graded={false}
              minHeight={PLAYGROUND_EDITOR_HEIGHT}
              tables={tables}
              task={{ seedSql: d.seed }}
              analytics={{ subject: "sql", surface: "playground", dataset }}
            />
            <p className="rx-small">Runs one SELECT or WITH query at a time on all {d.metadata.totals.rows.toLocaleString("en-US")} rows. Results show up to 200 rows. To change data, use Database Lab.</p>
          </section>
        </div>
      </div>
    </Shell>
  );
}
