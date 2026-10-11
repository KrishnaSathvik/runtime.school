"use client";
import Link from "next/link";
import {ArrowRight} from "lucide-react";
import {tracks} from "@/content/question-bank/tracks";
import {useHydrated,useLearning} from "@/lib/learning-state";
import {trackProgress,trackRange} from "@/features/practice/tracks";
import {PageHeader} from "@/components/layout/PageHeader";
export default function TracksPage(){const s=useLearning();const ready=useHydrated();return <div className="canvas"><Link href="/practice" className="metadata">← Practice</Link><PageHeader title="Practice tracks" description="Build confidence with questions in a recommended order."/><ol className="editorial-list mt-8">{tracks.map(t=>{const p=trackProgress(t,s);return <li key={t.id}><Link href={`/practice/tracks/${t.id}`} className="discovery-row"><div><h2>{t.title}</h2><p className="metadata mt-2">{t.summary}</p><p className="metadata mt-2">{trackRange(t)} · {p.total} questions{ready?` · ${p.solved} solved without hints`:""}</p></div><span className="row-action">{ready&&p.complete?"Review track":ready&&s.tracks[t.id]?"Continue":"Explore"}<ArrowRight size={14} aria-hidden/></span></Link></li>;})}</ol></div>;}
