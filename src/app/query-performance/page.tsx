"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import {planComparisons,seed} from "@/content";
import {executeSql,type ExecuteResponse} from "@/engine/sql-client";
import {ResultsTable} from "@/components/editor/ResultsTable";
import {SqlError} from "@/components/editor/Explanation";
import {PageHeader} from "@/components/layout/PageHeader";
import {formatSql} from "@/components/editor/format-sql";
import {shownForChoice, type ShownComparison} from "@/lib/shown-comparison";

type Observed=NonNullable<ExecuteResponse["comparison"]>[number];

/** Reads the actual EXPLAIN QUERY PLAN rows; nothing here is canned. */
function readPlan(observed:Observed){
  const steps=observed.plan.values.map(row=>String(row.at(-1)));
  const text=steps.join("; ");
  const index=text.match(/USING (?:COVERING )?INDEX (\w+)/)?.[1]??null;
  const access:"SEARCH"|"SCAN"|"Other"=/\bSEARCH\b/.test(text)?"SEARCH":/\bSCAN\b/.test(text)?"SCAN":"Other";
  return {steps,index,access,rows:observed.result.values.length};
}
/** Describe what the plan actually says: a SCAN through an index still visits every entry. */
function accessText(p:ReturnType<typeof readPlan>){
  if(p.access==="SEARCH")return p.index?`Jumps straight to matching entries in ${p.index}`:"Jumps straight to matching rows";
  if(p.access==="SCAN")return p.index?`Reads every entry of ${p.index}, then filters`:"Reads every row of the table, then filters";
  return "See the plan steps";
}

/** Split "setup; query;" so learners see what prepares the database and what is measured. */
function splitStatements(sql:string){
  const parts=sql.split(/;\s*/).map(s=>s.trim()).filter(Boolean);
  return {setup:parts.slice(0,-1),query:parts.at(-1)??""};
}

export default function QueryPerformancePage(){
  const [choice,setChoice]=useState(0);
  const [busy,setBusy]=useState(false);
  const [shown,setShown]=useState<ShownComparison<ExecuteResponse>|null>(null);
  const run=useRef(0);
  const comparison=planComparisons[choice];
  const compare=useCallback(async(index:number)=>{
    const id=++run.current;
    setBusy(true);setShown(null);
    try{
      // The engine runs one query at a time. If another run on the page interrupts
      // this one, run it again rather than leaving the comparison empty.
      for(let attempt=0;attempt<3;attempt++){
        const res=await executeSql({seed,query:"SELECT 1",allowWrites:true,compare:planComparisons[index].cases});
        if(id!==run.current)return;
        if(!res.superseded){setShown({choice:index,value:res});return;}
      }
    }finally{if(id===run.current)setBusy(false);}
  },[]);
  // Choosing a comparison shows its real plans and output immediately; the page is read-only,
  // so there is nothing to rerun. Choosing it again retries only if it could not run.
  useEffect(()=>{void compare(choice);},[choice,compare]);
  const response=shownForChoice(choice,shown);
  const plans=response?.comparison?.map(readPlan);

  return <div className="canvas comparison-page">
    <PageHeader title="Why some SQL queries are faster" description="Compare real SQLite query plans side by side: watch a table scan turn into an index search, and see what changed. A query plan lists the steps the database chose."/>
    <div role="group" aria-labelledby="comparison-label">
      <p id="comparison-label" className="eyebrow">Choose a comparison</p>
      <div className="comparison-choices mt-2">
        {planComparisons.map((p,i)=><button key={p.title} type="button" aria-pressed={i===choice} onClick={()=>{if(i===choice){if(!busy&&!response?.comparison)void compare(i);return;}setShown(null);setChoice(i);}}>
          <span className="comparison-choice-title">{p.title}</span>
          <span className="metadata">{p.question}</span>
        </button>)}
      </div>
    </div>

    <section className="perf-question mt-6" aria-live="polite" aria-busy={busy}>
      <p className="eyebrow">The question</p>
      <p className="mt-1 text-[17px]">{comparison.question}</p>
      {busy&&<p className="metadata mt-3">Running both queries on the sample data…</p>}
      {response?.error&&<div className="mt-3"><SqlError error={response.error} query={comparison.cases[0].query}/></div>}
      {plans&&<>
        <table className="results-table perf-summary mt-4" aria-label="What changed between the two approaches">
          <thead><tr><th scope="col">Observed</th>{comparison.cases.map((c,i)=><th key={c.label} scope="col">{i===0?"A":"B"} · {c.label}</th>)}</tr></thead>
          <tbody>
            <tr><th scope="row">How SQLite reads the table</th>{plans.map((p,i)=><td key={i}><strong className={p.access==="SEARCH"?"feedback-ok":p.access==="SCAN"?"feedback-err":""}>{p.access}</strong> · {accessText(p)}</td>)}</tr>
            <tr><th scope="row">Index in the plan</th>{plans.map((p,i)=><td key={i}>{p.index?<code>{p.index}</code>:"None"}</td>)}</tr>
            <tr><th scope="row">Rows returned</th>{plans.map((p,i)=><td key={i}>{p.rows}</td>)}</tr>
            <tr><th scope="row">Same output?</th><td colSpan={2}>{response?.equivalent===undefined?"Not checked for this example.":response.equivalent?"Yes. Both return identical rows, so only the access path differs.":"No. The queries answer different questions, so compare results before plans."}</td></tr>
          </tbody>
        </table>
        {comparison.takeaway&&<p className="mt-3 text-sm"><strong>What to notice:</strong> {comparison.takeaway}</p>}
        <p className="metadata mt-3">{plans[0].access!==plans[1].access?`${plans[0].index&&plans[0].index===plans[1].index?`Both plans mention ${plans[0].index}, but only B can search it: A`:"A"} has to ${plans[0].access==="SCAN"?"visit every entry":"take another path"}, while B goes directly to the matching range. With millions of rows, that difference is what matters. On this small sample both finish instantly, so the plan is the evidence, not the timing.`:"Both approaches use the same access method here. Compare the plan steps below for smaller differences."}</p>
      </>}
    </section>

    <div className="comparison-columns mt-8">{comparison.cases.map((spec,i)=>{const observed=response?.comparison?.[i];const {setup,query}=splitStatements(spec.query);return <section className="plan-panel" key={spec.label}>
      <p className="metadata">{i===0?"Approach A":"Approach B"}</p>
      <h2 className="mt-1 !text-base">{spec.label}</h2>
      {setup.length>0&&<><p className="metadata mt-4">Setup</p><pre tabIndex={0} className="sql-mono mt-1 overflow-auto text-xs">{setup.map(s=>formatSql(s)+";").join("\n")}</pre></>}
      <p className="metadata mt-4">Query</p>
      <pre tabIndex={0} className="sql-mono mt-1 overflow-auto text-xs">{formatSql(query)};</pre>
      {observed?<>
        <h3 className="mt-5 text-sm font-semibold">Query plan · EXPLAIN QUERY PLAN</h3>
        <ol className="plan-steps mt-2">{readPlan(observed).steps.map((s,j)=><li key={j}><code>{s}</code></li>)}</ol>
        <h3 className="mt-5 text-sm font-semibold">Query output</h3>
        <p className="metadata mt-1">First {Math.min(5,observed.result.values.length)} of {observed.result.values.length} rows</p>
        <div className="mt-2 border border-[var(--border)]"><ResultsTable result={{...observed.result,values:observed.result.values.slice(0,5)}} label={`Approach ${i===0?"A":"B"} output`} compact/></div>
      </>:<p className="metadata mt-4">{busy?"Running…":"The plan appears here after the comparison runs."}</p>}
    </section>;})}</div>

    <section className="mt-8 border-y border-[var(--border)] py-5"><h2>How to read a query plan</h2><p className="metadata mt-3">SCAN reads rows in sequence. That can be fine for small tables or for queries that need most rows. SEARCH finds matching rows directly, usually through an index. A covering index can supply every needed value without reading the table. An index does not make every query faster.</p></section>
  </div>;
}
