"use client";
import Link from "next/link";
import { useState } from "react";
import { Shell } from "@/features/rt/Shell";
import { Select } from "@/features/rt/Select";
import { ConfirmDialog } from "@/features/python/Dialogs";
import { datasetEditions, EDITION_LABEL, psDatasetHref, psDatasets, type PsEdition } from "@/content/pyspark/content";
import { DOMAIN_EXAMPLES, domainProgram } from "@/content/pyspark/tool-examples";
import { usePs, usePsReady } from "@/lib/pyspark-progress";
import { PsWorkbench } from "./PsWorkbench";
import { ToolData, ToolRelated } from "./ToolContext";
export function PlaygroundScreen({ edition: asked, dataset: askedDataset, incoming, from }: { edition?: string; dataset?: string; incoming?: string; from?: string }) {
  const ready = usePsReady();
  const built = psDatasets.filter((x) => x.built);
  const [id, setId] = useState<string>(() => built.find((x) => x.id === `PS-${(askedDataset ?? "").toUpperCase()}`)?.id ?? built[0].id);
  const d = built.find((x) => x.id === id)!;
  const editions = datasetEditions(d);
  const [chosen, setEdition] = useState<PsEdition>((asked as PsEdition) ?? "practice");
  const edition = editions.includes(chosen) ? chosen : editions[0];
  const [tab, setTab] = useState("main");
  const [proposal, setProposal] = useState<string | null>(null);
  const [dismissed, dismiss] = useState(false);
  const key = tab === "main" ? d.id : `${d.id}:${tab}`;
  const saved = usePs((s) => s.playground);
  const draft = saved[key];
  let tabs = ["main"];
  try {
    const parsed: unknown = JSON.parse(saved[`${d.id}:tabs`] ?? "[]");
    if (Array.isArray(parsed)) tabs = [...new Set(["main", ...parsed.filter((v): v is string => typeof v === "string" && /^example(?:-\d+)?$/.test(v))])];
  } catch { /* recover the main program if the tab list is damaged */ }
  if (saved[`${d.id}:example`] !== undefined && !tabs.includes("example")) tabs.push("example");
  function openExample(code: string) {
    let next = "example";
    for (let i = 2; tabs.includes(next); i++) next = `example-${i}`;
    usePs.getState().setPlayground(`${d.id}:${next}`, code);
    usePs.getState().setPlayground(`${d.id}:tabs`, JSON.stringify([...tabs, next]));
    setTab(next);
  }
  const starter = domainProgram(d.id);
  const returnTo = `/pyspark/tools/playground?dataset=${d.id.replace("PS-", "").toLowerCase()}&edition=${edition}`;
  const offer = incoming && !dismissed ? incoming : proposal;
  return <Shell subject="pyspark" section="tools" path={[{ label: "pyspark", href: "/pyspark" }, { label: "tools" }, { label: "playground" }]} status={["PySpark", "playground · not graded", d.title, "runs on Apache Spark"]}>
    <div className="rx-task rx-lesson ps-tool">
      <div className="rx-task-split">
        <article className="rx-brief" aria-labelledby="ps-pg-title">
          <p className="rx-prompt-line"><b>playground</b> write any PySpark · no grades</p>
          <h1 id="ps-pg-title" className="rx-task-title">PySpark Playground</h1>
          <p className="rx-prose ps-intro">Explore {d.title.toLowerCase()} on Apache Spark. Every table, <code>spark</code> and <code>display(df, name)</code> are ready in your code. Nothing here affects course progress.</p>
          {from?.startsWith("/pyspark/") && <p className="rx-small"><Link href={from}>← Return to where you were</Link></p>}
          <Select id="ps-pg-example" label="start from" disabled={!ready} value="" onChange={(v) => { if (v) setProposal(v === "summary" ? starter : `display(${DOMAIN_EXAMPLES[d.id].table}, "Source records")\n`); }} options={[{ value: "", label: "Choose an example…" }, { value: "summary", label: DOMAIN_EXAMPLES[d.id].title }, { value: "source", label: "Inspect source records" }]} />
          <Select id="ps-pg-dataset" label="dataset" disabled={!ready} value={d.id} onChange={(v) => { setId(v); setTab("main"); }} options={built.map((x) => ({ value: x.id, label: x.title }))} />
          {editions.length > 1 && <Select id="ps-pg-rows" label="rows" value={edition} onChange={(v) => setEdition(v as PsEdition)} options={editions.map((e) => ({ value: e, label: EDITION_LABEL[e] }))} />}
          <p className="rx-small"><Link href={psDatasetHref(d.id)}>About this data →</Link></p>
          <p className="rx-label sec">tables</p>
          <p className="rx-cap">Open a table to see its columns and a few sample rows. Your code reads every selected row.</p>
          <ToolData dataset={d} edition={edition} />
          <ToolRelated dataset={d.id} returnTo={returnTo} />
        </article>
        <section className="rx-work rx-lesson-work rx-tool-work p2 ps-tool-work" aria-label="Playground workspace">
          {tabs.length > 1 && <div className="py-filetabs ps-programs" role="tablist" aria-label="Your programs">{tabs.map((t) => <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>{t === "main" ? "playground.py" : `${t}.py`}</button>)}</div>}
          {!ready ? <p className="rx-small" role="status">Loading your draft…</p> : <PsWorkbench key={`${d.id}:${tab}`} identity={`${d.id}:${d.built!.version}:${edition}`} label="Playground" fileName={`${tab === "main" ? "playground" : tab}.py`} value={draft ?? starter} onChange={(v) => usePs.getState().setPlayground(key, v)} starter={starter} request={(_, code) => ({ mode: "playground", dataset: d.id, edition, code })} gradable={false} />}
        </section>
      </div>
      <ConfirmDialog open={!!offer && ready} title="Open this example?" onClose={() => { setProposal(null); dismiss(true); }} actions={[...(tabs.length < 20 ? [{ label: "Open in new tab", primary: true, onClick: () => openExample(offer!) }] : []), { label: "Replace current code", onClick: () => usePs.getState().setPlayground(key, offer!) }]}><p>Opening a new tab keeps every existing draft. You can keep up to 20 programs per dataset. Replace current code replaces the selected tab.</p></ConfirmDialog>
    </div>
  </Shell>;
}
