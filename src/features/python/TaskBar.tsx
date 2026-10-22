"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { List, X } from "lucide-react";
import { Pager } from "@/features/rt/Pager";

export type TaskBarRow = { id: string; href: string; title: string; group: string; glyph: "✓" | "◑" | "·"; key?: string; difficulty?: "easy" | "medium" | "hard" };

const LEVELS = [["easy", "Easy"], ["medium", "Medium"], ["hard", "Hard"]] as const;

/**
 * The bar above a lesson or question, exactly as SQL has it (features/rt/pages/Lesson.tsx and Practice.tsx):
 * "All lessons" / "All questions" opens the course drawer, then the position, then Prev / Next.
 * Lessons list in course order under their module; practice (`byLevel`) lists under Easy, Medium and Hard.
 * Every row keeps its course number, so it matches the position shown on its page.
 */
export function TaskBar({
  label,
  heading,
  rows,
  currentId,
  position,
  total,
  prev,
  next,
  children,
  byLevel = false,
}: {
  label: string;
  heading: string;
  rows: TaskBarRow[];
  currentId: string;
  position: number;
  total: number;
  prev: { href: string; label: string } | null;
  next: { href: string; label: string } | null;
  children: ReactNode;
  /** Group under difficulty headings (practice) instead of modules (lessons). */
  byLevel?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const listRef = useRef<HTMLOListElement>(null);
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView({ block: "center" });
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [open]);

  const sections = useMemo(() => {
    const numbered = rows.map((r, i) => ({ ...r, n: i + 1 }));
    if (byLevel) return LEVELS.map(([d, name]) => ({ label: name, items: numbered.filter((r) => r.difficulty === d) })).filter((g) => g.items.length > 0);
    const out: { label: string; items: typeof numbered }[] = [];
    for (const r of numbered) {
      const last = out[out.length - 1];
      if (last && last.label === r.group) last.items.push(r);
      else out.push({ label: r.group, items: [r] });
    }
    return out;
  }, [rows, byLevel]);

  return (
    <div className="rx-task" style={{ maxWidth: "none" }}>
      <div className="rx-task-bar">
        <button type="button" className="rx-btn ghost" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <List size={14} /> {label}
        </button>
        <span className="mono rx-small" style={{ margin: 0 }}>{String(position).padStart(2, "0")} / {total}</span>
        <span className="push" />
        <Pager prev={prev} next={next} />
      </div>
      {open && (
        <div className="rx-drawer p2-drawer" role="dialog" aria-label={label}>
          <div className="rx-drawer-head">
            <span className="rx-small" style={{ flex: 1, margin: 0 }}>{heading}</span>
            <button type="button" className="rx-btn ghost" onClick={() => setOpen(false)} aria-label="Close list"><X size={14} /></button>
          </div>
          <ol ref={listRef}>
            {sections.map(({ label: name, items }) => (
              <li key={`${items[0].n}-${name}`}>
                <p className="rx-drawer-group mono">{byLevel ? `${name} · ${items.length}` : name}</p>
                <ul className="rx-drawer-sub">
                  {items.map((r) => (
                    <li key={r.id}>
                      <Link href={r.href} aria-current={r.id === currentId ? "page" : undefined} onClick={() => setOpen(false)}>
                        <span className={`mono g ${r.glyph === "✓" ? "ok" : ""}`}>{r.glyph}</span>
                        <span><span className="mono p2-drawer-n">{String(r.n).padStart(2, "0")}</span> {r.title}</span>
                        {r.key && <span className="mono k">{r.key}</span>}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </div>
      )}
      {children}
    </div>
  );
}
