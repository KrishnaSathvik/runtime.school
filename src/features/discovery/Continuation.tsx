import Link from "next/link";
import {ArrowRight} from "lucide-react";
import type {Continuation as Activity} from "./selectors";
export function Continuation({activity}: {activity:Activity}) {return <section className="continuation" aria-label={`Continue ${activity.kind.toLowerCase()}`}><div><p className="metadata">{activity.kind}</p><h2>{activity.title}</h2><p className="metadata mt-2">{activity.reason}</p></div><Link className="btn primary" href={activity.href}>{activity.kind.startsWith("Practice")?"Continue practice":activity.kind==="Review"?"Start review":"Continue"}<ArrowRight size={14} aria-hidden/></Link></section>;}
