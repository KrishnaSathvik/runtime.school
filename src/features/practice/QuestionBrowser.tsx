"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {useRouter,useSearchParams} from "next/navigation";
import {DIFFICULTIES,DIFFICULTY_LABEL,EXERCISE_LABEL,practiceDatasets,topicFamilies,topicLabel} from "@/content/question-bank";
import {useHydrated,useLearning} from "@/lib/learning-state";
import {PageHeader} from "@/components/layout/PageHeader";
import {saveBrowserSequence} from "./BrowserNavigation";
import {DifficultyBadge,StatusMark} from "./Badges";
import {STATUS_LABEL,statusOf,questionStatusText} from "./status";
import {browserParams,browserUrl,questionLink,questionPage,PAGE_SIZE} from "./browser";
export function QuestionBrowser(){
 const s=useLearning();const ready=useHydrated();const params=useSearchParams();const router=useRouter();const normalized=browserParams(new URLSearchParams(params));const {rows,page,pages,visible}=questionPage(normalized,s);if(page===1)normalized.delete("page");else normalized.set("page",String(page));const url=browserUrl(normalized);
 const [search,setSearch]=useState(params.get("q")??"");const [advanced,setAdvanced]=useState(false);
 useEffect(()=>setSearch(params.get("q")??""),[params]);
 useEffect(()=>{if(ready&&`/practice/questions${params.size?`?${params}`:""}`!==url)router.replace(url,{scroll:false});},[ready,params,router,url]);
 useEffect(()=>{if(search===(params.get("q")??""))return;const timer=setTimeout(()=>{const p=new URLSearchParams(params);p.set("q",search);p.delete("page");router.replace(browserUrl(p),{scroll:false});},250);return()=>clearTimeout(timer);},[search,params,router]);
 const change=(key:string,value:string)=>{const p=new URLSearchParams(params);p.set(key,value);if(key!=="page")p.delete("page");router.push(browserUrl(p),{scroll:false});};
 const select=(key:string,label:string,options:[string,string][]) => <label className="filter-field" key={key}>{label}<select aria-label={label} className="filter-select" value={normalized.get(key)??(key==="sort"?"path":"all")} onChange={e=>change(key,e.target.value)}>{options.map(([v,t])=><option key={v} value={v}>{t}</option>)}</select></label>;
 const count=["dataset","status","source","sort"].filter(k=>normalized.has(k)).length;
 return <div className="canvas"><Link href="/practice" className="metadata">← Practice</Link><PageHeader title="Browse questions" description="Find a problem by topic, difficulty, or the way you want to practice."/>
 <section aria-label="Filters" className="browser-filters"><label className="filter-field">Search questions<input className="filter-select" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search titles, topics, or tasks"/></label><div className="filter-toolbar">
 {select("difficulty","Difficulty",[["all","All difficulties"],...DIFFICULTIES.map(d=>[d,DIFFICULTY_LABEL[d]] as [string,string])])}
 <label className="filter-field">Topic<select aria-label="Topic" className="filter-select" value={normalized.get("topic")??"all"} onChange={e=>change("topic",e.target.value)}><option value="all">All topics</option>{topicFamilies.map(f=><optgroup key={f.id} label={f.label}><option value={f.id}>All {f.label.toLowerCase()}</option>{f.topics.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}</optgroup>)}</select></label>
 {select("type","Type",[["all","All types"],...Object.entries(EXERCISE_LABEL)])}
 <button className="btn" aria-expanded={advanced} aria-controls="advanced-filters" onClick={()=>setAdvanced(!advanced)}>More filters ({count})</button></div>
 {count>0&&!advanced&&<p className="metadata mt-3">{["dataset","status","source","sort"].filter(k=>normalized.has(k)).map(k=>`${k}: ${normalized.get(k)}`).join(" · ")}</p>}
 <div id="advanced-filters" hidden={!advanced}><div className="filter-toolbar mt-4">{select("dataset","Sample database",[["all","All sample databases"],...Object.entries(practiceDatasets).map(([id,d])=>[id,d.name] as [string,string])])}{select("status","Status",[["all","Any status"],["unsolved","Not solved yet"],...Object.entries(STATUS_LABEL)])}{select("source","Question source",[["all","All questions"],["new","Additional practice"],["lessons","Lesson challenges"]])}{select("sort","Sort",[["path","Learning path"],["difficulty","Difficulty"],["recent","Recent activity"]])}</div></div></section>
 {!ready?<p role="status">Loading your saved progress…</p>:<section aria-label="Questions"><div className="flex flex-wrap items-center justify-between gap-3 py-4"><p className="metadata" role="status">Showing {rows.length?(page-1)*PAGE_SIZE+1:0}–{Math.min(page*PAGE_SIZE,rows.length)} of {rows.length} questions</p><Link className="btn ghost" href="/practice/questions">Clear filters</Link></div><ul className="editorial-list">{visible.map(q=><li key={q.id}><Link className="question-row" onClick={()=>saveBrowserSequence(url,rows.map(row=>row.id))} href={questionLink(q,url)}><StatusMark status={statusOf(q,s)} label={questionStatusText(q,s)}/><div className="min-w-0"><h2 className="!text-sm">{q.title}</h2><p className="metadata mt-1">{topicLabel[q.primaryTopic]} · {EXERCISE_LABEL[q.exerciseType??"write"]}</p></div><DifficultyBadge difficulty={q.difficulty}/></Link></li>)}</ul>{!rows.length&&<p className="py-8">No questions match these filters. Clear filters to see more.</p>}
 <nav aria-label="Question pages" className="pagination"><button className="btn" disabled={page===1} onClick={()=>change("page",String(page-1))}>Previous</button><span aria-current="page">Page {page} of {pages}</span><button className="btn" disabled={page===pages} onClick={()=>change("page",String(page+1))}>Next</button></nav></section>}</div>;
}
