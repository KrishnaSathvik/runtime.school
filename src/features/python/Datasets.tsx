"use client";

import { useRouter } from "next/navigation";
import { UsageLists, WatchList, type CourseUse } from "@/features/rt/DatasetBrowser";
import { useEffect, useState } from "react";
import { PY_PLAYGROUND_HREF, pyDatasetHref } from "@/content/python-v2/paths";
import type { PyEditionFile } from "@/content/python-v2/datasets";
import { loadSnippet, sizeFor, toolDataset, toolDatasets, type ToolDataset } from "@/content/python-v2/tools/friendly";
import { Shell } from "@/features/rt/Shell";
import { sendHandoff } from "./handoff";
import { PyDatasetPicker, PyDatasetSummary, PySizePicker, PyTableList, pyStatus } from "./ToolParts";

/** Datasets whose licence (ODbL: Open Food Facts, OpenStreetMap) requires visible credit wherever the data is shared. */
const CREDITED = new Set(["D09", "D14"]);

/**
 * T02 Datasets, laid out like SQL Datasets: the data on the left (what it is, its files, how they join), where the
 * course uses it on the right. Writing code happens in the Playground, which each file opens with code that loads it.
 */
export function DatasetsScreen({ id, usage }: { id?: string; usage: CourseUse }) {
  const router = useRouter();
  const d: ToolDataset = toolDataset(id) ?? toolDatasets[0];
  const [size, setSize] = useState(sizeFor(d, "starter"));
  useEffect(() => setSize(sizeFor(d, "starter")), [d]);

  const quality = (d.manifest.editions[size]?.quality ?? []).filter((q) => q.count > 0);
  const links = Object.entries(d.manifest.tables).flatMap(([t, x]) => x.foreignKeys.map((fk) => ({ from: `${t}.${fk.column}`, to: fk.references })));
  const credit = CREDITED.has(d.id) ? d.manifest.attribution : undefined;
  const used = usage.lessons.length + usage.practice.length + usage.projects.length > 0;
  const openInPlayground = (f: PyEditionFile) => {
    sendHandoff({ kind: "playground", code: loadSnippet(f), from: "Datasets", dataset: d.id, size, name: `${f.table}.py` });
    router.push(PY_PLAYGROUND_HREF);
  };

  return (
    <Shell subject="python" section="tools" path={[{ label: "python", href: "/python" }, { label: "datasets" }, { label: d.name }]} status={pyStatus("datasets", d.id)}>
      <div className="rx-task rx-lesson">
        <div className="rx-task-split">
          <article className="rx-brief" aria-labelledby="ds-title">
            <p className="rx-prompt-line"><b>datasets</b> real and made-up data to practise on</p>
            <h1 id="ds-title" className="rx-task-title">Datasets</h1>
            <p className="rx-prose" style={{ margin: "10px 0" }}>Data for the Playground, Database Lab and Performance Lab. Pick one and open its files.</p>
            <PyDatasetPicker id="ds-pick" value={d.id} onChange={(v) => router.push(pyDatasetHref(v), { scroll: false })} />
            <PySizePicker d={d} value={size} onChange={setSize} />
            <PyDatasetSummary d={d} size={size} />

            {quality.length > 0 && (
              <>
                <p className="rx-label sec">what to watch for</p>
                <div className="rx-ds-watch">
                  <WatchList title="Tricky rows" items={quality.map((q) => ({ text: q.description, count: q.count }))} />
                </div>
              </>
            )}

            <p className="rx-label sec">files</p>
            <p className="rx-cap">Open a file to see what one row means, its columns and a preview. <b>Open in Playground</b> starts a new file there with code that loads it.</p>
            <PyTableList d={d} size={size} action={openInPlayground} actionLabel="Open in Playground" />

            {links.length > 0 && (
              <>
                <p className="rx-label sec">relationships</p>
                <p className="rx-cap">How to join these tables. Left column matches the right column.</p>
                <ul className="rx-ds-rels mono">{links.map((l) => <li key={l.from}><b>{l.from}</b> → <span>{l.to}</span></li>)}</ul>
              </>
            )}
            {/* The source credit the licence requires: a footnote at the end of the left side on desktop, at the end of the page when stacked. */}
            {credit && <p className="rx-small rx-ds-credit rx-ds-credit-side">{credit}</p>}
          </article>

          <section className="rx-work rx-lesson-work rx-ds-side" aria-labelledby="ds-usage">
            <p id="ds-usage" className="rx-label">where the course uses it</p>
            {used ? (
              <>
                <p className="rx-cap">Lessons and practice questions use small samples of {d.name}; projects open its files.</p>
                <UsageLists usage={usage} />
              </>
            ) : (
              <p className="rx-cap">The course doesn&apos;t use {d.name}. It&apos;s here to explore in the Playground, Database Lab and Performance Lab.</p>
            )}
            {credit && <p className="rx-small rx-ds-credit rx-ds-credit-stacked">{credit}</p>}
          </section>
        </div>
      </div>
    </Shell>
  );
}
