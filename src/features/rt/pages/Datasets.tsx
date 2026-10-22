"use client";

import { useRouter } from "next/navigation";
import type { CanonicalDatasetId } from "@/data/datasets/learning-map";
import { CENTRAL_TABLE, datasetName, tableQuery, toolDataset } from "@/content/tools/datasets";
import { Shell } from "../Shell";
import { CourseUsage, DatasetPicker, DatasetSummary, RelationshipList, TableList, WatchList } from "../DatasetBrowser";

const playgroundHref = (id: CanonicalDatasetId) => (id === "retail" ? "/sql/playground" : `/sql/playground/${id}`);

/**
 * One place to get to know a dataset: what it holds, what to watch for, and where the course uses it.
 * The data on the left, the course's use of it on the right; writing SQL happens in the Playground,
 * which each table opens with its query.
 */
export function Datasets({ dataset }: { dataset: CanonicalDatasetId }) {
  const router = useRouter();
  const m = toolDataset(dataset).metadata;

  return (
    <Shell
      path={[{ label: "sql" }, { label: "datasets" }, { label: dataset }]}
      section="tools"
      status={["SQL", "datasets", `sqlite · ${datasetName(dataset)}`]}
    >
      <div className="rx-task rx-lesson">
        <div className="rx-task-split">
          <article className="rx-brief" aria-labelledby="ds-title">
            <p className="rx-prompt-line"><b>datasets</b> the data behind every lesson and tool</p>
            <h1 id="ds-title" className="rx-task-title">Datasets</h1>
            <p className="rx-prose" style={{ margin: "10px 0" }}>Get to know a dataset before you query it: what one row means, how the tables join, and what to watch for.</p>
            <DatasetPicker value={dataset} onChange={(id) => router.push(`/sql/datasets/${id}`, { scroll: false })} />
            <DatasetSummary id={dataset} />

            {(m.qualityNotes.length > 0 || m.edgeCases.length > 0) && (
              <>
                <p className="rx-label sec">what to watch for</p>
                <div className="rx-ds-watch">
                  <WatchList title="How to read it" items={m.qualityNotes.map((text) => ({ text }))} />
                  <WatchList title="Tricky rows" items={m.edgeCases.map((text) => ({ text }))} />
                </div>
              </>
            )}

            <p className="rx-label sec">tables</p>
            <p className="rx-cap">Open a table to see what one row means, its columns and keys, and a preview. Start from <b className="mono">{CENTRAL_TABLE[dataset]}</b>: it is the dataset&apos;s central table.</p>
            <TableList
              id={dataset}
              queryLabel="Query in Playground"
              onQuery={(t) => router.push(`${playgroundHref(dataset)}?sql=${encodeURIComponent(tableQuery(t))}`)}
            />
            <p className="rx-label sec">relationships</p>
            <p className="rx-cap">How to join these tables. Left column matches the right column.</p>
            <RelationshipList id={dataset} />
          </article>
          <section className="rx-work rx-lesson-work rx-ds-side" aria-labelledby="ds-usage">
            <p id="ds-usage" className="rx-label">where the course uses it</p>
            <p className="rx-cap">The lessons, practice questions and projects that run on {datasetName(dataset)}.</p>
            <CourseUsage id={dataset} />
          </section>
        </div>
      </div>
    </Shell>
  );
}
