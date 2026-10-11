"use client";
import Link from "next/link";
import {useEffect} from "react";
import {useRouter,useSearchParams} from "next/navigation";
import {ArrowRight} from "lucide-react";
import {useHydrated,useLearning} from "@/lib/learning-state";
import {practiceContinuation} from "@/features/discovery/selectors";
import {Continuation} from "@/features/discovery/Continuation";
import {PageHeader} from "@/components/layout/PageHeader";
import {browserUrl,FILTER_KEYS} from "./browser";
export function PracticeHub(){const s=useLearning();const ready=useHydrated();const params=useSearchParams();const router=useRouter();const legacy=FILTER_KEYS.some(k=>params.has(k));useEffect(()=>{if(legacy)router.replace(browserUrl(new URLSearchParams(params)));},[legacy,params,router]);const activity=practiceContinuation(s);
 return <div className="canvas"><PageHeader title="Practice SQL." description="Choose how you'd like to practice."/>{legacy?<p role="status">Opening your questions…</p>:<>{ready&&activity&&<Continuation activity={activity}/>}<div className="editorial-list mt-8">{[["Browse SQL questions","Find problems by topic, difficulty, or type","questions"],["Follow a practice track","Work through questions in a recommended order","tracks"],["Solve a case study","Answer connected questions using one database","cases"]].map(([title,description,route])=><Link key={route} href={`/practice/${route}`} className="discovery-row"><div><h2>{title}</h2><p className="metadata mt-2">{description}</p></div><ArrowRight size={18} aria-hidden/></Link>)}</div></>}</div>;}
