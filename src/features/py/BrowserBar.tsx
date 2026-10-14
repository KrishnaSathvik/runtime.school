"use client";
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { List, X } from 'lucide-react';
import { Pager } from '@/features/rt/Pager';

export type BrowserItem = { href: string; label: string; group?: string; status?: string };

/** SQL's task bar and searchable drawer, using Python destinations and progress. */
export function BrowserBar({ label, items, current, browseHref, browseLabel }: {
  label: string; items: BrowserItem[]; current: string; browseHref: string; browseLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const trigger = useRef<HTMLButtonElement>(null);
  const at = items.findIndex(i => i.href === current);
  useEffect(() => {
    if (!open) return;
    const close = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); trigger.current?.focus(); } };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [open]);
  const close = () => { setOpen(false); trigger.current?.focus(); };
  return <div className="rx-task rx-lesson">
    <div className="rx-task-bar">
      <button ref={trigger} type="button" className="rx-btn ghost" aria-expanded={open} onClick={() => setOpen(!open)}><List size={14} />{label}</button>
      <span className="mono rx-small" style={{margin:0}}>{at + 1} / {items.length}</span>
      <span className="push" />
      <Pager prev={items[at-1] ?? null} next={items[at+1] ?? null} />
    </div>
    {open && <div className="rx-drawer" role="dialog" aria-label={label}>
      <div className="rx-drawer-head"><input aria-label={`Filter ${label.toLowerCase()}`} placeholder="filter…" value={filter} onChange={e => setFilter(e.target.value)} autoFocus /><button className="rx-btn ghost" aria-label="Close list" onClick={close}><X size={14} /></button></div>
      <p><Link className="rx-link" href={browseHref}>{browseLabel} →</Link></p>
      <ol>{items.filter(i => `${i.label} ${i.group ?? ''}`.toLowerCase().includes(filter.toLowerCase())).map(i => <li key={i.href}>
        <Link href={i.href} aria-current={i.href === current ? 'page' : undefined} onClick={() => setOpen(false)}><span>{i.label}</span><span className="mono k">{i.status ?? i.group}</span></Link>
      </li>)}</ol>
    </div>}
  </div>;
}
