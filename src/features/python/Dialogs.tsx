"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/* Small modal dialogs for the Python tools: never the browser's own prompt/confirm, which block the page. */

function useModal(open: boolean) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return ref;
}

/** Ask for a name, with live validation. */
export function NameDialog({ open, title, label, initial, problem, confirm, onConfirm, onClose }: {
  open: boolean;
  title: string;
  label: string;
  initial: string;
  problem: (name: string) => string | null;
  confirm: string;
  onConfirm: (name: string) => void;
  onClose: () => void;
}) {
  const ref = useModal(open);
  const [name, setName] = useState(initial);
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    if (open) { setName(initial); setTouched(false); }
  }, [open, initial]);
  const issue = problem(name.trim());
  return (
    <dialog ref={ref} className="pt-modal" onClose={onClose} aria-labelledby="name-dialog-title">
      <form
        method="dialog"
        onSubmit={(e) => {
          e.preventDefault();
          setTouched(true);
          if (!issue) onConfirm(name.trim());
        }}
      >
        <h2 id="name-dialog-title">{title}</h2>
        <label className="pt-field">
          <span>{label}</span>
          <input
            value={name}
            autoFocus
            spellCheck={false}
            autoCapitalize="off"
            onChange={(e) => { setName(e.target.value); setTouched(true); }}
            onFocus={(e) => { const dot = e.target.value.lastIndexOf("."); e.target.setSelectionRange(0, dot > 0 ? dot : e.target.value.length); }}
            aria-invalid={touched && !!issue}
            aria-describedby="name-dialog-problem"
          />
        </label>
        <p id="name-dialog-problem" className="pt-problem" role="status">{touched && issue ? issue : ""}</p>
        <div className="pt-modal-actions">
          <button type="button" className="rx-btn ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="rx-btn primary" disabled={touched && !!issue}>{confirm}</button>
        </div>
      </form>
    </dialog>
  );
}

/** Confirm (or choose between) actions. */
export function ConfirmDialog({ open, title, children, actions, onClose }: {
  open: boolean;
  title: string;
  children?: ReactNode;
  actions: { label: string; onClick: () => void; primary?: boolean; danger?: boolean }[];
  onClose: () => void;
}) {
  const ref = useModal(open);
  return (
    <dialog ref={ref} className="pt-modal" onClose={onClose} aria-labelledby="confirm-dialog-title">
      <h2 id="confirm-dialog-title">{title}</h2>
      {children}
      <div className="pt-modal-actions">
        <button type="button" className="rx-btn ghost" onClick={onClose}>Cancel</button>
        {actions.map((a) => (
          <button key={a.label} type="button" className={`rx-btn ${a.primary ? "primary" : ""} ${a.danger ? "pt-danger" : ""}`} onClick={() => { a.onClick(); onClose(); }}>
            {a.label}
          </button>
        ))}
      </div>
    </dialog>
  );
}
