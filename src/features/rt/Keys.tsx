"use client";

import { useShortcutModifier } from "@/lib/keyboard-shortcuts";

type Key = "mod" | "shift" | "enter" | "k" | "esc";

/**
 * A keyboard shortcut drawn as one chip per key, in the platform's usual order:
 * ⇧ ⌘ ↵ on Apple devices, Ctrl Shift Enter elsewhere.
 */
export function Keys({ keys, label }: { keys: Key[]; label?: string }) {
  const mod = useShortcutModifier();
  const mac = mod === "⌘";
  const known = mod === "⌘" || mod === "Ctrl";
  const text: Record<Key, string> = {
    mod: mac ? "⌘" : "Ctrl",
    shift: mac ? "⇧" : "Shift",
    enter: mac ? "↵" : "Enter",
    k: "K",
    esc: "Esc",
  };
  // Apple lists Shift before Command (⇧⌘↵); other platforms write Ctrl+Shift+Enter.
  const order = mac ? [...keys].sort((a, b) => (a === "shift" ? -1 : b === "shift" ? 1 : 0)) : keys;
  if (!known) return null; // the platform is not known until the page loads in the browser
  return (
    <span className="rx-keys" aria-label={label ?? order.map((k) => text[k]).join(" ")}>
      {order.map((k) => <kbd key={k} aria-hidden="true">{text[k]}</kbd>)}
    </span>
  );
}
