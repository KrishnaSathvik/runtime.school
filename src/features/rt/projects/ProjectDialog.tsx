"use client";
import { useEffect, useRef, type ReactNode } from "react";
export function ProjectDialog({ title, close, children }: { title: string; close: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    dialog?.showModal();
    return () => { dialog?.close(); previous?.focus(); };
  }, []);
  return <dialog ref={ref} className="project-dialog" aria-label={title} onCancel={close} onClick={e => { if (e.target === e.currentTarget) close(); }}>
    <header><h2>{title}</h2><button className="rx-btn ghost" onClick={close} aria-label={`Close ${title}`}>Close</button></header>
    {children}
  </dialog>;
}
