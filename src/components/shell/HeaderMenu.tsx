"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";

/** Small disclosure menu for the header: closes on outside click, Escape, and navigation. */
export function HeaderMenu({
  label,
  buttonLabel,
  children,
  align = "start",
  className = "",
}: {
  label: ReactNode;
  /** Accessible name when the visible label is short or an icon. */
  buttonLabel?: string;
  children: ReactNode;
  align?: "start" | "end";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        ref.current?.querySelector<HTMLButtonElement>("button")?.focus();
      }
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={`rt-menu ${className}`}>
      <button
        type="button"
        className="rt-menu-button"
        aria-expanded={open}
        aria-controls={id}
        aria-label={buttonLabel}
        onClick={() => setOpen((o) => !o)}
      >
        {label}
        <ChevronDown size={14} strokeWidth={2} aria-hidden="true" />
      </button>
      {open && (
        <div id={id} className={`rt-menu-panel ${align === "end" ? "end" : ""}`} onClick={(e) => {
          if ((e.target as HTMLElement).closest("a")) setOpen(false);
        }}>
          {children}
        </div>
      )}
    </div>
  );
}
