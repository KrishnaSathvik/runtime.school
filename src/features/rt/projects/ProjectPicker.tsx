"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { List, X } from "lucide-react";
import { projectsByLevel } from "@/content/projects";
import { sqlProjectHref } from "@/content/projects/paths";

export function ProjectPicker({ currentId }: { currentId: string }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const escape = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener("pointerdown", outside); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);
  return <div className="project-picker" ref={root}>
    <button className="rx-btn ghost" ref={trigger} aria-expanded={open} aria-controls="project-picker-list" onClick={() => setOpen(v => !v)}><List size={14} aria-hidden="true" />All projects</button>
    {open && <div className="rx-drawer" id="project-picker-list"><div className="rx-drawer-head"><span className="rx-small">SQL projects</span><button className="rx-btn ghost" aria-label="Close project list" onClick={() => { setOpen(false); trigger.current?.focus(); }}><X size={14} /></button></div><nav aria-label="Choose a project"><ol>{(["beginner", "intermediate", "advanced"] as const).map(level => <li key={level}><p className="rx-drawer-group">{level[0].toUpperCase() + level.slice(1)}</p><ul className="rx-drawer-sub">{projectsByLevel(level).map(project => <li key={project.id}><Link href={sqlProjectHref(project.id)} aria-current={currentId === project.id ? "page" : undefined} onClick={() => setOpen(false)}>{project.title}</Link></li>)}</ul></li>)}</ol></nav></div>}
  </div>;
}
