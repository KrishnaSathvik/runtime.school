"use client";
import Link from "next/link";
import {Suspense,useEffect,useState} from "react";
import {useSearchParams} from "next/navigation";
import {REFERENCE_ONLY_CONCEPTS,syntaxNotes} from "@/content/syntax-notes";
import {dialectGuide,seed} from "@/content";
import { BRAND_NAME } from "@/platform/brand";
import { PageHeader } from "@/components/layout/PageHeader";
import {executeSql,type ExecuteResponse} from "@/engine/sql-client";
import {ResultsTable} from "@/components/editor/ResultsTable";
const conceptId=(title:string)=>title.toLowerCase().replace(/[^a-z0-9]+/g,"-");
/** Navigation names; the concept id and detail title stay as written in the guide. */
const NAV_LABEL:Record<string,string>={"Stored procedure":"Stored procedures"};
const DIALECTS=[["SQLite","runs here",1],["PostgreSQL","reference",3],["SQL Server / T-SQL","reference",2]] as const;

/** Runs the SQLite version for real, so the comparison shows an actual result, not only code. */
function SqliteOutput({sql,writes}:{sql:string;writes:boolean}){
  const [res,setRes]=useState<ExecuteResponse|null>(null);
  useEffect(()=>{let live=true;setRes(null);void executeSql({seed,query:sql,allowWrites:writes}).then(r=>{if(live&&!r.superseded)setRes(r);});return()=>{live=false;};},[sql,writes]);
  if(!res)return <p className="metadata mt-3">Running in SQLite…</p>;
  if(res.error)return <p className="metadata mt-3">SQLite: {res.error}</p>;
  return res.result?<div className="mt-3"><p className="metadata">Output in SQLite</p><div className="mt-1 border border-[var(--border)]"><ResultsTable result={res.result} total={res.total} compact/></div></div>:null;
}

function SyntaxBrowser(){
  const params=useSearchParams();
  const selected=dialectGuide.find(row=>conceptId(row[0])===params.get("concept"))??dialectGuide[0];
  const referenceOnly=selected?REFERENCE_ONLY_CONCEPTS.has(selected[0]):false;
  const note=selected?syntaxNotes[selected[0]]:undefined;
  return <div className="canvas comparison-page">
    <PageHeader title="Compare SQL syntax" description={`One concept, three SQL dialects. Everything you run in ${BRAND_NAME} uses SQLite; PostgreSQL and SQL Server are shown for reference.`}/>
    <div className="syntax-layout">
      <nav className="syntax-rail" aria-label="SQL concepts">
        <p className="eyebrow">{dialectGuide.length} concepts</p>
        <ul className="mt-3">{dialectGuide.map(row=>{const id=conceptId(row[0]);const active=selected?.[0]===row[0];return <li key={id}><Link href={`/sql-syntax?concept=${id}`} scroll={false} aria-current={active?"page":undefined} className={active?"active":""}>{NAV_LABEL[row[0]]??row[0]}</Link></li>;})}</ul>
      </nav>
      {selected&&<section className="min-w-0" aria-labelledby="concept-title">
        <h2 id="concept-title">{selected[0]}</h2>
        {referenceOnly&&<p className="mt-2"><span className="reference-badge">Reference</span></p>}
        <p className="mt-2 text-[var(--text-secondary)]">{note?.purpose}</p>
        <div className="key-difference mt-5" aria-label="Key difference">
          <h3>What is different</h3>
          <p>{note?.difference}</p>
        </div>
        <div className="dialect-panels mt-6">{DIALECTS.map(([label,tag,index])=><section key={label} className="dialect-panel">
          <h3>{label} <span className="metadata font-normal">· {tag}</span></h3>
          <pre tabIndex={0} className="sql-mono mt-3">{note?.examples?.[index-1]??selected[index]}</pre>

        </section>)}</div>
        {note?.sqlite ? <section className="mt-6" aria-label="SQLite example output"><h3 className="text-sm font-semibold">Actual SQLite output</h3><SqliteOutput sql={note.examples?.[0] ?? selected[1]} writes={note.sqlite === "lab"} /><Link className="btn mt-3" href={note.sqlite === "lab" ? "/database-lab" : "/playground"}>Try it in {note.sqlite === "lab" ? "Database Lab" : "SQL Playground"} →</Link></section> : <p className="metadata mt-4">SQLite has no direct equivalent, so there is nothing to run here.</p>}

      </section>}
    </div>
    <p className="metadata mt-8">Database capabilities differ. These examples do not enable other database engines here. <Link href="/settings#about" className="text-[var(--accent)]">Sources and credits</Link></p>
  </div>;
}
export default function SqlSyntaxPage(){return <Suspense fallback={<div className="canvas"><h1>Compare SQL syntax</h1></div>}><SyntaxBrowser/></Suspense>;}
