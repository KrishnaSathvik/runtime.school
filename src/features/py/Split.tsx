"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

/**
 * Two panes with a draggable divider. Works with pointer and keyboard (arrows, Home, End;
 * double-click or Enter resets). The share is remembered per browser as a convenience only.
 */
export function Split({
  direction,
  first,
  second,
  label,
  storageKey,
  initial,
  min,
  max,
  className = "",
}: {
  /** "columns": side by side. "rows": stacked. */
  direction: "columns" | "rows";
  first: ReactNode;
  second: ReactNode;
  label: string;
  storageKey: string;
  /** Initial share of the first pane, 0–1. */
  initial: number;
  min: number;
  max: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [share, setShare] = useState(initial);
  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem(storageKey));
      if (saved >= min && saved <= max) setShare(saved);
    } catch {}
  }, [storageKey, min, max]);
  const commit = useCallback(
    (next: number) => {
      const v = Math.min(max, Math.max(min, next));
      setShare(v);
      try {
        localStorage.setItem(storageKey, String(v));
      } catch {}
    },
    [storageKey, min, max],
  );
  const reset = () => {
    setShare(initial);
    try {
      localStorage.removeItem(storageKey);
    } catch {}
  };
  const cols = direction === "columns";
  const style = { "--py-share": `${(share * 100).toFixed(2)}%` } as CSSProperties;
  return (
    <div ref={ref} className={`py-split ${cols ? "cols" : "rows"} ${className}`} style={style}>
      <div className="py-split-a">{first}</div>
      <div
        className="py-divider"
        role="separator"
        tabIndex={0}
        aria-label={label}
        aria-orientation={cols ? "vertical" : "horizontal"}
        aria-valuemin={Math.round(min * 100)}
        aria-valuemax={Math.round(max * 100)}
        aria-valuenow={Math.round(share * 100)}
        aria-valuetext={`${Math.round(share * 100)}%`}
        onDoubleClick={reset}
        onKeyDown={(e) => {
          const step = e.shiftKey ? 0.1 : 0.03;
          const back = cols ? "ArrowLeft" : "ArrowUp";
          const fwd = cols ? "ArrowRight" : "ArrowDown";
          if (e.key === back) commit(share - step);
          else if (e.key === fwd) commit(share + step);
          else if (e.key === "Home") commit(min);
          else if (e.key === "End") commit(max);
          else if (e.key === "Enter") reset();
          else return;
          e.preventDefault();
        }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          e.preventDefault();
        }}
        onPointerMove={(e) => {
          if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
          const box = ref.current?.getBoundingClientRect();
          if (!box) return;
          commit(cols ? (e.clientX - box.left) / box.width : (e.clientY - box.top) / box.height);
        }}
        onPointerUp={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
        }}
      />
      <div className="py-split-b">{second}</div>
    </div>
  );
}
