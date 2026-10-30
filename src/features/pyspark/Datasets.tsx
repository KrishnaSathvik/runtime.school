"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "@/features/rt/Shell";
import { Select } from "@/features/rt/Select";
import { UsageLists } from "@/features/rt/DatasetBrowser";
import { datasetEditions, EDITION_LABEL, psDatasetBySlug, psDatasetHref, psDatasets, psLessonHref, psPlaygroundHref, psProjectHref, psQuestionHref, usesOf, type PsEdition } from "@/content/pyspark/content";
import { DOMAIN_EXAMPLES } from "@/content/pyspark/tool-examples";
import { ExploreTools, ToolData } from "./ToolContext";
import { PlannedNote } from "./parts";

export function DatasetsScreen() {
  const [search, setSearch] = useState("");
  const [interactive, setInteractive] = useState(false);
  useEffect(() => setInteractive(true), []);
  return (
    <Shell subject="pyspark" section="tools" path={[{ label: "pyspark", href: "/pyspark" }, { label: "datasets" }]} status={["PySpark", "datasets · not graded", "runs on Apache Spark"]}>
      <div className="rx-page rx-project-library">
        <h1 className="rx-title">Datasets</h1>
        <p className="rx-lead">The data every PySpark lesson, question, project and tool shares. Open one to see its tables, columns and real rows.</p>
        <div className="rx-field ps-search"><label className="rx-label" htmlFor="ps-ds-search">find a dataset or table</label><input id="ps-ds-search" type="search" disabled={!interactive} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search datasets…" /></div>
        <ul className="rx-project-list ps-datasets">
          {psDatasets.filter((d) => `${d.title} ${d.tables.join(" ")} ${DOMAIN_EXAMPLES[d.id]?.about}`.toLowerCase().includes(search.toLowerCase())).map((d) => {
            const body = (
              <>
                <span className="rx-project-card-title">{d.title}</span>
                <span className="rx-project-card-ask">{DOMAIN_EXAMPLES[d.id]?.about}</span>
                <span className="rx-project-card-ask">{(d.built ? Object.keys(d.built.tables) : d.tables).join(", ")}</span>
                <span className="rx-project-card-meta mono">{d.built ? `${Object.keys(d.built.tables).length} tables` : "not built yet"}</span>
              </>
            );
            return <li key={d.id}>{d.built ? <Link className="rx-project-card" href={psDatasetHref(d.id)}>{body}</Link> : <div className="rx-project-card">{body}</div>}</li>;
          })}
        </ul>
        {search && !psDatasets.some((d) => `${d.title} ${d.tables.join(" ")} ${DOMAIN_EXAMPLES[d.id]?.about}`.toLowerCase().includes(search.toLowerCase())) && <p role="status">No datasets match. Try a domain or table name.</p>}
      </div>
    </Shell>
  );
}

export function DatasetScreen({ slug }: { slug: string }) {
  const router = useRouter();
  const d = psDatasetBySlug(slug)!;
  const uses = usesOf(d.id);
  const [edition, setEdition] = useState<PsEdition>("lesson");
  const built = d.built;
  const unbuilt = built ? d.tables.filter((t) => !(t in built.tables)) : d.tables;
  const tables = built ? Object.values(built.tables) : [];
  const lessons = uses.lessons.filter((l) => l.written);
  const questions = uses.questions.filter((q) => q.authored);
  const projects = uses.projects.filter((p) => p.steps.some((x) => x.item));
  return (
    <Shell subject="pyspark" section="tools" path={[{ label: "pyspark", href: "/pyspark" }, { label: "datasets", href: "/pyspark/tools/datasets" }, { label: d.title }]} status={["PySpark", "datasets · not graded", d.title, "runs on Apache Spark"]}>
      <div className="rx-task rx-lesson ps-tool">
        <div className="rx-task-split">
          <article className="rx-brief" aria-labelledby="ps-ds-title">
            <p className="rx-prompt-line"><b>datasets</b> <Link href="/pyspark/tools/datasets">all datasets</Link></p>
            <h1 id="ps-ds-title" className="rx-task-title">{d.title}</h1>
            <p className="rx-prose ps-intro">{DOMAIN_EXAMPLES[d.id]?.about ?? "The data PySpark lessons, questions and projects here use."}</p>
            <Select id="ps-ds-pick" label="dataset" value={d.id} onChange={(v) => router.push(psDatasetHref(v), { scroll: false })} options={psDatasets.map((x) => ({ value: x.id, label: x.built ? x.title : `${x.title} (not built yet)` }))} />
            {!built && <PlannedNote what="dataset" />}
            {built && (
              <>
                {datasetEditions(d).length > 1 && <Select id="ps-ds-rows" label="rows" value={edition} onChange={(v) => setEdition(v as PsEdition)} options={datasetEditions(d).map((e) => ({ value: e, label: EDITION_LABEL[e] }))} />}
                <p className="rx-ds-facts mono">
                  <span><b>{tables.length}</b> table{tables.length === 1 ? "" : "s"}</span>
                  <span><b>{tables.reduce((n, t) => n + (t.rows[edition] ?? 0), 0).toLocaleString("en-US")}</b> rows</span>
                  <span>version {built.version}</span>
                </p>
                <p className="py-row"><Link className="rx-btn primary" href={psPlaygroundHref(d.id, edition)}>Open in Playground</Link></p>
                <p className="rx-label sec">rules</p>
                <ul className="p2-list ps-rules">{built.rules.map((r) => <li key={r}><span>{r}</span></li>)}</ul>
                <p className="rx-label sec">tables</p>
                <p className="rx-cap">Open a table to see its columns, its key and a few sample rows.</p>
                <ToolData dataset={d} edition={edition} />
                {built.relationships.length > 0 && (
                  <>
                    <p className="rx-label sec">relationships</p>
                    <p className="rx-cap">How to join these tables. The left column matches the right column.</p>
                    <ul className="rx-ds-rels mono">{built.relationships.map((r) => <li key={r.from}><b>{r.from}</b> → <span>{r.to}</span></li>)}</ul>
                  </>
                )}
              </>
            )}
            {!built && (
              <>
                <p className="rx-label sec">tables</p>
                <ul className="ps-tables">{unbuilt.map((t) => <li key={t}><code>{t}</code></li>)}</ul>
              </>
            )}
          </article>
          <section className="rx-work rx-lesson-work rx-ds-side" aria-labelledby="ps-ds-usage">
            <p id="ps-ds-usage" className="rx-label">where the course uses it</p>
            {lessons.length + questions.length + projects.length > 0 ? (
              <>
                <p className="rx-cap">Lessons and practice questions use small samples of {d.title}; projects use its full export.</p>
                <UsageLists usage={{ lessons: lessons.map((l) => ({ title: l.title, href: psLessonHref(l.slug) })), practice: questions.map((q) => ({ title: q.title, href: psQuestionHref(q.slug) })), projects: projects.map((p) => ({ title: p.title, href: psProjectHref(p.slug) })) }} />
              </>
            ) : (
              <p className="rx-cap">The course doesn&apos;t use {d.title} yet.</p>
            )}
            {built && <><p className="rx-label sec">explore it in tools</p><ExploreTools open dataset={d.id} edition={edition} from={psDatasetHref(d.id)} /></>}
          </section>
        </div>
      </div>
    </Shell>
  );
}
