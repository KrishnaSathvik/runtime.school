"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { CanonicalDatasetId } from "@/data/datasets/learning-map";
import { CANONICAL_VERSION } from "@/data/datasets/learning";
import { datasetName, isToolDataset, toolDataset } from "@/content/tools/datasets";
import { LAB_GROUPS, experimentsFor } from "@/content/tools/lab";
import { preloadDatabase } from "@/engine/sql-client";
import { Shell } from "../Shell";
import { TaskCell } from "../Cells";
import { LAB_EDITOR_HEIGHT } from "../editor-height";
import { Select } from "../Select";
import { DatasetPicker, TableList, TablesInvolved } from "../DatasetBrowser";
import { ReplaceConfirm, useScriptSlot, useSqlParam } from "../ScriptSlot";

/** Database Lab: change a real dataset safely. Every run starts from a fresh disposable copy. */
export function Lab() {
  const params = useSearchParams();
  const router = useRouter();
  const requested = params.get("dataset");
  const dataset: CanonicalDatasetId = isToolDataset(requested) ? requested : "retail";
  const available = experimentsFor(dataset);
  const wanted = params.get("experiment") ?? (params.get("sql") ? "scratch" : null);
  const experiment = available.find((e) => e.id === wanted) ?? available[0];
  const script = experiment.scripts[dataset]!;
  const d = toolDataset(dataset);

  const go = (next: { dataset?: CanonicalDatasetId; experiment?: string }) => {
    const ds = next.dataset ?? dataset;
    // Keep the experiment when the new dataset has it too.
    const exp = next.experiment ?? (experimentsFor(ds).some((e) => e.id === experiment.id) ? experiment.id : experimentsFor(ds)[0].id);
    router.replace(`/sql/lab?dataset=${ds}&experiment=${exp}`, { scroll: false });
  };

  const slot = useScriptSlot(
    `sql-lab-${dataset}-${experiment.id}@${CANONICAL_VERSION}`,
    script.sql,
    (sql) => sql === script.sql || sql === script.variant?.sql,
  );
  useSqlParam(slot.load);
  useEffect(() => preloadDatabase(d.seed), [d.seed]);

  const name = `${experiment.id}.sql`;

  return (
    <Shell
      path={[{ label: "sql" }, { label: "database-lab" }, { label: dataset }, { label: name }]}
      section="tools"
      status={["SQL", "database lab · not graded", `sqlite · ${datasetName(dataset)}`, "resets on every run"]}
    >
      <div className="rx-task rx-lesson">
        <div className="rx-task-split">
          <article className="rx-brief" aria-labelledby="lab-title">
            <p className="rx-prompt-line"><b>database lab</b> change data safely · resets every run</p>
            <h1 id="lab-title" className="rx-task-title">Database Lab</h1>
            <p className="rx-prose" style={{ margin: "10px 0" }}>Run database experiments in a disposable copy. Nothing changes the shared Runtime dataset.</p>
            <DatasetPicker value={dataset} onChange={(id) => go({ dataset: id })} />
            <Select
              id="lab-experiment"
              label="experiment"
              value={experiment.id}
              onChange={(id) => go({ experiment: id })}
              groups={LAB_GROUPS
                .map((g) => ({ label: g.label, options: available.filter((e) => e.group === g.id).map((e) => ({ value: e.id, label: e.title })) }))
                .filter((g) => g.options.length)}
            />
            <p className="rx-small">{available.length - 1} experiments fit {datasetName(dataset)}. Other datasets offer others.</p>

            <h2 className="rx-task-title" style={{ marginTop: 26, fontSize: "1.5rem" }}>{experiment.title}</h2>
            <p className="rx-lead" style={{ fontSize: "1.05rem", marginTop: 8 }}>{experiment.summary}</p>
            <dl className="rx-dl">
              <dt>what you&apos;ll try</dt><dd>{script.tryThis}</dd>
              <dt>what you should see</dt><dd>{script.observe}</dd>
            </dl>
            {script.variant && (
              <p style={{ marginTop: 14 }}>
                <button type="button" className="rx-btn" onClick={() => slot.load(script.variant!.sql)}>Try it: {script.variant.label.toLowerCase()}</button>
              </p>
            )}
            <p className="rx-label sec">tables involved</p>
            <TablesInvolved id={dataset} sql={slot.value} />

            <p className="rx-label sec">how the lab works</p>
            <p className="rx-prose" style={{ marginTop: 0, fontSize: 15 }}>
              Every Run starts from the original {datasetName(dataset)} database. Tables you create and rows you change exist only for that run. End the script with a SELECT to see the effect. Your SQL is saved in this browser.
            </p>
            <p className="rx-label sec">all {datasetName(dataset)} tables</p>
            <TableList id={dataset} />
          </article>
          <section className="rx-work rx-lesson-work rx-tool-work" aria-label="Script editor">
            <ReplaceConfirm sql={slot.pending} onConfirm={slot.confirm} onCancel={slot.cancel} what="script" />
            <TaskCell
              key={`${dataset}-${experiment.id}`}
              name={name}
              value={slot.value}
              onChange={slot.set}
              graded={false}
              minHeight={LAB_EDITOR_HEIGHT}
              tables={d.metadata.tables.map((t) => t.name)}
              task={{ seedSql: d.seed, allowWrites: true }}
              analytics={{ subject: "sql", surface: "lab", dataset, experiment: experiment.id }}
              observe={(res, ran) =>
                // A script that ran but ends without a SELECT is not an error; the output says so once.
                res.error && ran !== script.variant?.sql && /^End your lab script with a SELECT/.test(res.error)
                  ? null
                  : res.error
                  ? ran === script.variant?.sql
                    ? script.variant.observe
                    : "The script stopped with an error. Statements before it ran on this copy; see where it stopped below. Nothing is kept after the run."
                  : res.result
                    ? ran === script.sql
                      ? script.observe
                      : `The final statement returned ${res.total ?? res.result.values.length} row${(res.total ?? res.result.values.length) === 1 ? "" : "s"}.`
                    : "The script ran. End it with a SELECT to see the effect."
              }
            />
            <button type="button" className="rx-btn ghost" onClick={() => { slot.cancel(); slot.set(script.sql); }}>
              Reset to the original script
            </button>
          </section>
        </div>
      </div>
    </Shell>
  );
}
