"use client";
import Link from "next/link";
import {useSearchParams} from "next/navigation";
import {useEffect,useState} from "react";
import {allQuestions} from "@/content/question-bank";
import {useHydrated,useLearning} from "@/lib/learning-state";
import {filteredQuestions,questionLink,safeBrowserReturn} from "./browser";
export function saveBrowserSequence(back:string,ids:string[]){try{sessionStorage.setItem(`sql-browser:${back}`,JSON.stringify(ids));}catch{/* Navigation still works when session storage is unavailable. */}}
export function BrowserNavigation({questionId,nextOnly=false}:{questionId:string;nextOnly?:boolean}){
 const params=useSearchParams();const ready=useHydrated();const raw=params.get("return");const back=safeBrowserReturn(raw);const [ids,setIds]=useState<string[]>([]);
 useEffect(()=>{if(!ready||!raw)return;let sequence:string[]=[];try{const value=JSON.parse(sessionStorage.getItem(`sql-browser:${back}`)??"null");if(Array.isArray(value)&&value.every(v=>typeof v==="string"))sequence=value;}catch{}
 if(!sequence.includes(questionId)){sequence=filteredQuestions(new URL(back,"http://sql.local").searchParams,useLearning.getState()).map(q=>q.id);if(!sequence.includes(questionId))sequence.push(questionId);saveBrowserSequence(back,sequence);}setIds(sequence);
 },[back,questionId,ready,raw]);
 if(!raw||params.has("track"))return null;const records=new Map(allQuestions().map(q=>[q.id,q]));const i=ids.indexOf(questionId);const prev=records.get(ids[i-1]);const next=records.get(ids[i+1]);
 if(nextOnly)return next?<Link className="btn primary" href={questionLink(next,back)}>Next question: {next.title}</Link>:<Link className="btn" href={back}>Back to questions</Link>;
 return <nav aria-label="Question browser navigation" className="browser-context"><Link href={back}>← Back to questions</Link><div className="flex gap-4">{prev?<Link href={questionLink(prev,back)}>Previous question</Link>:<span aria-disabled="true" className="metadata">Previous question</span>}{next?<Link href={questionLink(next,back)}>Next question</Link>:<span aria-disabled="true" className="metadata">Next question</span>}</div></nav>;
}
