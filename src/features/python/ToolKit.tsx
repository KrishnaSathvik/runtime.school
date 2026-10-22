"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";
import { PyEditor } from "@/features/py/PyEditor";
import { csvHead } from "./csv";

/* Pieces shared by the Python tools: drafts kept in this browser, a small "more" menu, an editor cell, a data preview. */

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* storage blocked: the value lasts for this visit */
  }
}

/** A code draft saved in this browser under `key`. Starts from `initial` until edited; reset() returns to it. */
export function useDraft(key: string, initial: string) {
  const [state, setState] = useState<{ key: string; value: string }>({ key, value: initial });
  useEffect(() => {
    setState({ key, value: read(key) ?? initial });
  }, [key, initial]);
  const value = state.key === key ? state.value : initial;
  const set = useCallback((v: string) => {
    setState({ key, value: v });
    write(key, v === initial ? null : v);
  }, [key, initial]);
  const reset = useCallback(() => set(initial), [set, initial]);
  return { value, set, reset, edited: value !== initial };
}

/** A small value kept in this browser (a chosen tab, a database, the current dataset). */
export function useStored(key: string, initial: string) {
  const [value, setValue] = useState(initial);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setValue(read(key) ?? initial);
    setReady(true);
  }, [key, initial]);
  const set = useCallback((v: string) => {
    setValue(v);
    write(key, v);
  }, [key]);
  return [value, set, ready] as const;
}

/** "⋯" with a short list of less frequent actions. */
export function MoreMenu({ items, label = "More actions" }: { items: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean }[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("pointerdown", down);
    window.addEventListener("keydown", key);
    return () => { window.removeEventListener("pointerdown", down); window.removeEventListener("keydown", key); };
  }, [open]);
  return (
    <div className="pt-more" ref={ref}>
      <button type="button" className="rx-btn ghost pt-icon" aria-label={label} aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen((o) => !o)}>
        <MoreHorizontal size={16} aria-hidden="true" />
      </button>
      {open && (
        <div className="pt-menu" role="menu">
          {items.map((it) => (
            <button key={it.label} type="button" role="menuitem" disabled={it.disabled} className={it.danger ? "danger" : undefined} onClick={() => { setOpen(false); it.onClick(); }}>
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** An editable Python file with a one-line label. */
export function CodeCell({ title, value, onChange, onRun, errorLine, minHeight = "160px", children, actions }: {
  title: ReactNode;
  value: string;
  onChange: (v: string) => void;
  onRun?: () => void;
  errorLine?: number | null;
  minHeight?: string;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  const [mark, setMark] = useState<{ line: number; token: number } | null>(null);
  useEffect(() => {
    setMark(errorLine ? { line: errorLine, token: Date.now() } : null);
  }, [errorLine]);
  return (
    <section className="rx-cell pt-cell" aria-label={typeof title === "string" ? title : undefined}>
      <div className="rx-cell-head"><span className="name">{title}</span>{actions && <span className="acts">{actions}</span>}</div>
      <PyEditor value={value} onChange={onChange} onRun={onRun} onCheck={onRun} label={typeof title === "string" ? title : "Code"} errorLine={mark} minHeight={minHeight} />
      {children}
    </section>
  );
}

/** A few real rows of a dataset file, in a box that scrolls inside itself. */
export function DataPreview({ url, rows = 6, label }: { url: string; rows?: number; label: string }) {
  const [data, setData] = useState<{ url: string; rows: string[][] | null }>({ url, rows: null });
  useEffect(() => {
    let live = true;
    csvHead(url, rows).then((r) => live && setData({ url, rows: r })).catch(() => live && setData({ url, rows: [] }));
    return () => { live = false; };
  }, [url, rows]);
  const r = data.url === url ? data.rows : null;
  if (!r) return <p className="pt-muted" role="status">Loading a preview…</p>;
  if (!r.length) return <p className="pt-muted">The preview couldn&apos;t load. Check your connection.</p>;
  return (
    <div className="pt-preview" tabIndex={0} role="region" aria-label={label}>
      <table>
        <thead><tr>{r[0].map((h) => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>{r.slice(1).map((row, i) => <tr key={i}>{row.map((v, j) => <td key={j} className={v === "" ? "empty" : undefined}>{v === "" ? "—" : v}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

/** Text with `code` spans. */
export function Inline({ text }: { text: string }) {
  return <>{text.split(/(`[^`]+`)/).map((part, i) => (part.startsWith("`") && part.endsWith("`") ? <code key={i}>{part.slice(1, -1)}</code> : part))}</>;
}
