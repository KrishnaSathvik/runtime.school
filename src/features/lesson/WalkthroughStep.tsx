"use client";
import {useState} from "react";
import {executeSql,type ExecuteResponse} from "@/engine/sql-client";
import {seed} from "@/content";
import {ResultsTable} from "@/components/editor/ResultsTable";
import {SqlError} from "@/components/editor/Explanation";
export function WalkthroughStep({query,allowWrites}:{query:string;allowWrites:boolean}){const [response,setResponse]=useState<ExecuteResponse|null>(null);const [busy,setBusy]=useState(false);return <><pre tabIndex={0} className="sql-mono mt-2 overflow-x-auto text-xs">{query}</pre><button className="btn mt-3" disabled={busy} onClick={async()=>{setBusy(true);try{const r=await executeSql({seed,query,allowWrites});if(!r.superseded)setResponse(r);}finally{setBusy(false);}}}>{busy?"Running…":"Run this step"}</button><div aria-live="polite" aria-busy={busy}>{response?.result&&<ResultsTable result={response.result} total={response.total}/>} {response?.error&&<SqlError error={response.error} query={query}/>}</div></>;}
