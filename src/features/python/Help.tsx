"use client";

import { useEffect, useRef, useState } from "react";
import { Eye, Lightbulb } from "lucide-react";
import { Inline } from "./Md";
import { HelpDialog } from "@/features/rt/HelpDialog";

/** "Hint", then "Next hint (2 of 3)", then "All 3 hints shown" (disabled): never reads as hints already used. */
export function hintLabel(shown: number, count: number): string {
  if (!shown) return "Hint";
  return shown >= count ? `All ${count} hint${count === 1 ? "" : "s"} shown` : `Next hint (${shown + 1} of ${count})`;
}

/** Hint / Answer buttons for the workbench action bar. */
export function HelpButtons({ hintsShown, hintCount, revealed, onHint, onAnswer }: { hintsShown: number; hintCount: number; revealed: boolean; onHint: () => void; onAnswer?: () => void }) {
  const [confirm, setConfirm] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const frame = useRef<number | null>(null);
  useEffect(() => () => { if (frame.current !== null) cancelAnimationFrame(frame.current); }, []);
  const reveal = (action: () => void) => {
    // Scope to the active exercise, including prediction questions outside Workbench.
    const scope = trigger.current?.closest(".p2-predict, .p2-work");
    action();
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const panel = scope?.querySelector<HTMLElement>(".p2-help");
      if (!panel?.isConnected) return;
      panel.focus({ preventScroll: true });
      panel.scrollIntoView({ block: "nearest" });
    });
  };
  return (
    <>
      <button type="button" ref={trigger} className="p2-btn" onClick={() => reveal(onHint)} disabled={hintsShown >= hintCount}>
        <Lightbulb size={14} aria-hidden="true" /> {hintLabel(hintsShown, hintCount)}
      </button>
      {onAnswer && !revealed && (
        <button type="button" className="p2-btn" onClick={() => setConfirm(true)}>
          <Eye size={14} aria-hidden="true" /> Answer
        </button>
      )}
      <HelpDialog open={confirm} onClose={() => setConfirm(false)} onConfirm={() => { setConfirm(false); if (onAnswer) reveal(onAnswer); }} />
    </>
  );
}

/** The hints and answer the learner has asked for so far, plus the way back to an unassisted attempt. */
export function HelpPanel({ hints, shown, answer, revealed, assisted, onFresh, free }: { hints: string[]; shown: number; answer?: string; revealed: boolean; assisted: boolean; onFresh?: () => void; free?: boolean }) {
  if (!shown && !revealed) return null;
  return (
    <div className="p2-help" role="region" aria-label={revealed ? "Answer and hints" : "Hints"} tabIndex={-1} aria-live="polite">
      {shown > 0 && (
        <>
          <b>Hints</b>
          <ol>
            {hints.slice(0, shown).map((h, i) => (
              <li key={i}><Inline text={h} /></li>
            ))}
          </ol>
        </>
      )}
      {revealed && answer && (
        <>
          <b>Answer</b>
          <pre>{answer}</pre>
        </>
      )}
      {!free && assisted && (
        <p className="p2-note">
          This attempt used help, so a correct check counts as solved with help.{" "}
          {onFresh && <button type="button" className="p2-small-btn" onClick={onFresh}>Try again without help</button>}
        </p>
      )}
    </div>
  );
}
