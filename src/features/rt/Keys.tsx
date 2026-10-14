"use client";

import type { ReactNode } from "react";
import { useMacKeyboard } from "@/lib/keyboard-shortcuts";

type Key = "mod" | "shift" | "enter" | "k" | "esc";

/** Renders only on a Mac desktop. Other browsers keep the shortcuts, without the key chips. */
export function MacOnly({ children }: { children: ReactNode }) {
  const mac = useMacKeyboard();
  if (!mac) return null;
  return children;
}

/**
 * A keyboard shortcut drawn as one chip per key. Shown on Mac only: ⇧ ⌘ ↵.
 */
export function Keys({ keys, label }: { keys: Key[]; label?: string }) {
  const mac = useMacKeyboard();
  if (!mac) return null;
  const text: Record<Key, string> = { mod: "⌘", shift: "⇧", enter: "↵", k: "K", esc: "Esc" };
  // Apple lists Shift before Command (⇧⌘↵).
  const order = [...keys].sort((a, b) => (a === "shift" ? -1 : b === "shift" ? 1 : 0));
  return (
    <span className="rx-keys" aria-label={label ?? order.map((k) => text[k]).join(" ")}>
      {order.map((k) => <kbd key={k} aria-hidden="true">{text[k]}</kbd>)}
    </span>
  );
}
