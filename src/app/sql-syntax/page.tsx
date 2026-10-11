"use client";
import Link from "next/link";
import {Suspense,useEffect,useState} from "react";
import {useSearchParams} from "next/navigation";
import {syntaxNotes} from "@/content/syntax-notes";
import {dialectGuide,seed} from "@/content";
import {PageHeader} from "@/components/layout/PageHeader";
import {executeSql,type ExecuteResponse} from "@/engine/sql-client";
import {ResultsTable} from "@/components/editor/ResultsTable";
const conceptId=(title:string)=>title.toLowerCase().replace(/[^a-z0-9]+/g,"-");
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
  const [search,setSearch]=useState("");
  const params=useSearchParams();
  const filtered=dialectGuide.filter(row=>row.join(" ").toLowerCase().includes(search.trim().toLowerCase()));
  const selected=filtered.find(row=>conceptId(row[0])===params.get("concept"))??filtered[0];
  const note=selected?syntaxNotes[selected[0]]:undefined;
  return <div className="canvas comparison-page">
    <PageHeader title="Compare SQL syntax" description="See one idea written for SQLite, PostgreSQL and SQL Server. Everything you run in SQL Studio uses SQLite; the other two are for reference."/>
    <div className="syntax-layout">
      <nav className="syntax-rail" aria-label="SQL concepts">
        <label className="filter-field">Search {dialectGuide.length} concepts<input className="filter-select" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Dates, NULL, temp tables…"/></label>
        <ul className="mt-3">{filtered.map(row=>{const id=conceptId(row[0]);const active=selected?.[0]===row[0];return <li key={id}><Link href={`/sql-syntax?concept=${id}`} scroll={false} aria-current={active?"page":undefined} className={active?"active":""}>{row[0]}</Link></li>;})}</ul>
        {filtered.length===0&&<p className="metadata mt-3" role="status">No concepts match. <button className="btn mt-2" onClick={()=>setSearch("")}>Clear search</button></p>}
      </nav>
      {selected&&<section className="min-w-0" aria-labelledby="concept-title">
        <h2 id="concept-title">{selected[0]}</h2>
        <p className="mt-2 text-[var(--text-secondary)]">{note?.purpose}</p>
        <div className="key-difference mt-5" aria-label="Key difference">
          <h3>What is different</h3>
          <p>{note?.difference}</p>
        </div>
        <div className="dialect-panels mt-6">{DIALECTS.map(([label,tag,index])=><section key={label} className="dialect-panel">
          <h3>{label} <span className="metadata font-normal">· {tag}</span></h3>
          <pre tabIndex={0} className="sql-mono mt-3">{note?.examples?.[index-1]??selected[index]}</pre>
          {index===1&&(note?.sqlite?<SqliteOutput sql={note.examples?.[0]??selected[1]} writes={note.sqlite==="lab"}/>:<p className="metadata mt-3">SQLite has no direct equivalent, so there is nothing to run here.</p>)}
          {index===1&&note?.sqlite&&<Link className="metadata mt-3 inline-block text-[var(--accent)]" href={note.sqlite==="lab"?"/database-lab":"/playground"}>Try it in {note.sqlite==="lab"?"Database Lab":"SQL Playground"} →</Link>}
        </section>)}</div>
      </section>}
    </div>
    <p className="metadata mt-8">Database capabilities differ. These examples do not enable other database engines here. <Link href="/settings#about" className="text-[var(--accent)]">Sources and credits</Link></p>
  </div>;
}
export default function SqlSyntaxPage(){return <Suspense fallback={<div className="canvas"><h1>Compare SQL syntax</h1></div>}><SyntaxBrowser/></Suspense>;}
