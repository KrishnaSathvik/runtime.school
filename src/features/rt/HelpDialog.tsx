"use client";

import { useId, useLayoutEffect, useRef } from "react";
import styles from "./HelpDialog.module.css";

/** Native modal supplies focus containment, Escape and restoration to the invoking control. */
export function HelpDialog({ open, kind = "answer", onConfirm, onClose }: {
  open: boolean;
  kind?: "answer" | "hint";
  onConfirm: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const title = useId();
  const description = useId();
  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog || dialog.open) return;
    dialog.showModal();
  }, [open]);
  // Stay out of the server HTML. useId() does not match across this render, so a closed
  // dialog in the SSR markup hydrates with different aria ids.
  if (!open) return null;
  return (
    <dialog ref={ref} className={styles.dialog} aria-labelledby={title} aria-describedby={description}
      onCancel={onClose} onClose={onClose}>
      <h2 id={title}>{kind === "answer" ? "Show the answer?" : "Show a hint?"}</h2>
      <p id={description}>
        {kind === "answer" ? "Revealing the answer" : "Using a hint"} means this attempt counts as assisted. You can try again independently afterward.
      </p>
      <div className={styles.actions}>
        <button type="button" className="rx-btn" autoFocus onClick={() => { ref.current?.close(); onClose(); }}>Keep trying</button>
        <button type="button" className="rx-btn primary" onClick={() => {
          // Restore trigger focus before the revealed content schedules its own focus.
          ref.current?.close(); onClose(); onConfirm();
        }}>{kind === "answer" ? "Show answer" : "Show hint"}</button>
      </div>
    </dialog>
  );
}
