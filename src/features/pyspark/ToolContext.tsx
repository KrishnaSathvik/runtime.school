"use client";
import Link from "next/link";
import { useState } from "react";
import { usesOf, psLessonHref, psQuestionHref, psProjectHref, editionRows, type PsDataset, type PsEdition, type PsTableSnapshot } from "@/content/pyspark/content";
import { PREVIEW_ROWS } from "@/features/rt/Tables";
import { DataTable } from "./parts";
import catalog from "@/content/pyspark/tool-catalog.json";

/** Dataset context follows the learner; these links never write course/project drafts. */
export function ExploreTools({ dataset, from, edition = "practice", open = false }: { dataset: string; from: string; edition?: PsEdition; open?: boolean }) {
  const query = `dataset=${dataset}&edition=${edition}&from=${encodeURIComponent(from)}`;
  const batch = catalog.pipeline.find((e) => e.dataset === dataset);
  const stream = catalog.stream.find((e) => e.dataset === dataset);
  return <details className="ps-tool-links" open={open || undefined}><summary>Explore this data in Tools</summary><ul className="p2-list"><li><Link href={`/pyspark/tools/spark-sql?${query}`}>Query with Spark SQL</Link></li><li><Link href={`/pyspark/tools/query-plans?${query}`}>Inspect a Spark plan</Link></li><li><Link href={`/pyspark/tools/compare?${query}`}>Compare two approaches</Link></li>{batch && <li><Link href={`/pyspark/tools/pipeline-streaming?${query}&experiment=${batch.id}&area=batch`}>Explore the batch pipeline</Link></li>}{stream && <li><Link href={`/pyspark/tools/pipeline-streaming?${query}&experiment=${stream.id}&area=stream`}>Explore event replay and recovery</Link></li>}</ul></details>;
}
/** Each table as the SQL and Python tools show one: what a row is, its columns and keys, and a few sample rows. */
export function ToolData({ dataset, edition }: { dataset: PsDataset; edition: PsEdition }) {
  return <div className="rx-schema rx-ds-tables">{Object.entries(dataset.built?.tables ?? {}).map(([name, t]) => <ToolTable key={name} name={name} table={t} edition={edition} />)}</div>;
}
function ToolTable({ name, table: t, edition }: { name: string; table: PsTableSnapshot; edition: PsEdition }) {
  const [preview, setPreview] = useState(false);
  return (
    <details className="rx-schema-table rx-ds-table">
      <summary><b>{name}</b><span>{(t.rows[edition] ?? 0).toLocaleString("en-US")} rows · {t.columns.length} columns</span></summary>
      <p className="rx-ds-grain">{t.note}</p>
      <ul className="rx-ds-cols" aria-label={`Columns of ${name}`}>
        {t.columns.map((c) => (
          <li key={c.name}><div className="rx-ds-col"><span className="n">{c.name}</span><span className="meta"><span className="ty">{c.type}</span>{t.key.includes(c.name) && <span className="rx-tag amber">key</span>}</span></div></li>
        ))}
      </ul>
      <div className="rx-ds-acts"><button type="button" className="rx-btn" aria-expanded={preview} onClick={() => setPreview((v) => !v)}>{preview ? "Hide preview" : "Preview"}</button></div>
      {preview && <div className="p2 ps-preview"><DataTable columns={t.columns} rows={editionRows(t, edition).slice(0, PREVIEW_ROWS)} label={`${name} sample`} foot="Sample records; a run uses the full selected rows." /></div>}
    </details>
  );
}
export function ToolRelated({ dataset, returnTo }: { dataset: string; returnTo: string }) {
  const uses = usesOf(dataset);
  const links = [...uses.lessons.filter((l) => l.written).slice(0, 3).map((l) => ({ title: l.title, href: psLessonHref(l.slug) })), ...uses.questions.filter((q) => q.authored).slice(0, 2).map((q) => ({ title: q.title, href: psQuestionHref(q.slug) })), ...uses.projects.filter((p) => p.def).map((p) => ({ title: p.title, href: psProjectHref(p.slug) }))];
  return <><p className="rx-label sec">explore this further</p><ul className="p2-list">{links.map((l) => <li key={l.href}><Link href={`${l.href}?from=${encodeURIComponent(returnTo)}`}>{l.title}</Link></li>)}</ul></>;
}
