"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Phone-only summary of the active challenge. It appears (fixed at the top)
 * once the full task in the task pane has scrolled out of view, so the
 * learner never loses the instruction while editing. Expanding it shows the
 * complete task and tables without leaving the editor.
 */
export function MobileTaskBar({
  watchId,
  label,
  prompt,
  tables,
}: {
  /** id of the element holding the full task; the bar shows when it's off-screen. */
  watchId: string;
  label: string;
  prompt: string;
  tables: string[];
}) {
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const target = document.getElementById(watchId);
    if (!target || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => {
      // Only when the task is above the viewport, i.e. the learner scrolled to the editor.
      setVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    });
    io.observe(target);
    return () => io.disconnect();
  }, [watchId]);

  useEffect(() => {
    if (!visible) setOpen(false);
  }, [visible]);

  return (
    <div className="mobile-task-bar" data-visible={visible || undefined} aria-hidden={!visible}>
      <button
        type="button"
        className="mobile-task-toggle"
        aria-expanded={open}
        aria-controls="mobile-task-full"
        tabIndex={visible ? 0 : -1}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="eyebrow shrink-0">{label}</span>
        <span className={`min-w-0 flex-1 text-left text-[13px] ${open ? "" : "truncate"}`}>{prompt}</span>
        {open ? <ChevronUp size={16} aria-hidden /> : <ChevronDown size={16} aria-hidden />}
        <span className="sr-only">{open ? "Hide full task" : "Show full task"}</span>
      </button>
      {open && (
        <div id="mobile-task-full" className="px-4 pb-3 text-xs text-[var(--text-secondary)]">
          Tables: <span className="font-mono">{tables.join(", ")}</span>
        </div>
      )}
    </div>
  );
}
