"use client";
import { PageHeader } from "@/components/layout/PageHeader";

import { BRAND_NAME } from "@/platform/brand";
import { sourceLinks } from "@/content";
import { useShortcutModifier } from "@/lib/keyboard-shortcuts";
import { importFailureMessage } from "@/lib/feedback-copy";
import { useEffect, useRef, useState } from "react";
import { useLearning, type ThemePreference } from "@/lib/learning-state";

export default function SettingsPage() {
  const modifier = useShortcutModifier();
  const preference = useLearning((s) => s.preferences.theme);
  const setTheme = useLearning((s) => s.setTheme);
  const exportProgress = useLearning((s) => s.exportProgress);
  const importProgress = useLearning((s) => s.importProgress);
  const resetProgress = useLearning((s) => s.resetProgress);
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [deleteStep, setDeleteStep] = useState<"closed" | "describe" | "confirm">("closed");
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (deleteStep === "closed") return;
    cancelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setDeleteStep("closed");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deleteStep]);

  const confirmDelete = () => {
    if (deleteStep !== "confirm") return;
    resetProgress();
    setDeleteStep("closed");
    setMessage("Saved progress and work have been deleted from this browser.");
    setImportError(null);
  };

  return (
    <div className="canvas settings">

      <PageHeader title="Settings" description="Choose your appearance, see keyboard shortcuts, and back up or restore your progress." />
      <div className="settings-grid">
      <section className="mt-10 border-t border-[var(--border)] pt-6">
        <h2>Appearance</h2>
        <div className="mt-4 flex gap-2">
          {(["light", "dark", "system"] as ThemePreference[]).map((t) => (
            <button
              key={t}
              type="button"
              className={`btn ${preference === t ? "primary" : ""}`}
              aria-pressed={preference === t}
              onClick={() => setTheme(t)}
            >
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-8 border-t border-[var(--border)] pt-6">
        <h2>Keyboard shortcuts</h2>
        <ul className="mt-4 space-y-2 text-sm text-[var(--text-secondary)]">
          <li>
            <kbd className="rounded border border-[var(--border)] px-1">{modifier} + K</kbd>{" "}
            Search
          </li>
          <li>
            <kbd className="rounded border border-[var(--border)] px-1">{modifier} + Enter</kbd>{" "}
            Run query
          </li>
          <li>
            <kbd className="rounded border border-[var(--border)] px-1">Esc</kbd>{" "}
            Close search
          </li>
        </ul>
      </section>

      <section className="mt-8 border-t border-[var(--border)] pt-6">
        <h2>Your saved progress</h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Your progress is saved in this browser. Download a backup to keep a copy
          or move it to another browser. Restoring a backup replaces the progress here.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="btn"
            onClick={() => {
              const data = exportProgress();
              const blob = new Blob([JSON.stringify(data, null, 2)], {
                type: "application/json",
              });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "sql-studio-progress.json";
              a.click();
              URL.revokeObjectURL(url);
              setMessage("Progress backup downloaded.");
              setImportError(null);
            }}
          >
            Download progress backup
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => fileRef.current?.click()}
          >
            Restore progress backup
          </button>
          <button
            type="button"
            className="btn ghost feedback-err"
            onClick={() => setDeleteStep("describe")}
          >
            Delete saved progress
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                const text = await file.text();
                let data: unknown;
                try {
                  data = JSON.parse(text);
                } catch {
                  throw new Error(`This file could not be read. Choose a ${BRAND_NAME} progress backup (.json).`);
                }
                importProgress(data);
                setMessage("Progress restored from your backup.");
                setImportError(null);
              } catch (err) {
                setMessage(importFailureMessage());
                setImportError(err instanceof Error ? err.message : "Unknown import error.");
              } finally {
                e.target.value = "";
              }
            }}
          />
        </div>
        <p className="metadata mt-3" role="status">
          {message}
        </p>
        {importError && <details className="mt-2 text-sm"><summary className="cursor-pointer">Technical details</summary><p className="mt-2">{importError}</p></details>}
        <details className="mt-4 text-sm"><summary className="cursor-pointer">Backup compatibility</summary><p className="mt-2">{BRAND_NAME} can restore backups saved by this app, including earlier formats. Progress stays in this browser until you delete it or restore a backup.</p></details>
      </section>

      <section className="mt-8 border-t border-[var(--border)] pt-6">
        <h2 id="about">About / Credits</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
          {BRAND_NAME} runs in your browser without an account. It uses SQLite
          (via sql.js), Geist fonts, and Lucide icons.
        </p>
        <details className="mt-3 text-sm"><summary>SQL reference sources</summary><ul className="mt-3 space-y-3">{sourceLinks.map(([title,url])=><li key={url}><a className="text-[var(--accent)]" href={url} target="_blank" rel="noopener noreferrer">{title}</a></li>)}</ul></details>
        <details className="mt-3 text-sm"><summary className="cursor-pointer">Technical credits and licenses</summary><p className="mt-2">SQLite runs through sql.js (WebAssembly). License notices for the database engine and the fonts are included with the app.</p></details>
      </section>
      </div>
      {deleteStep !== "closed" && (
        <div
          className="delete-progress-backdrop fixed inset-0 z-50 bg-black/30 p-4"
          onClick={() => setDeleteStep("closed")}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-progress-title"
            className="mx-auto mt-[18vh] max-w-lg rounded-lg border border-[var(--border)] bg-[var(--main)] p-6 shadow-[var(--shadow)]"
            onClick={(event) => event.stopPropagation()}
          >
            {deleteStep === "describe" ? (
              <>
                <h2 id="delete-progress-title">Delete saved progress?</h2>
                <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                  This removes the following from this browser:
                </p>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[var(--text-secondary)]">
                  <li>Lesson progress and concept checks</li>
                  <li>SQL drafts</li>
                  <li>Practice progress</li>
                  <li>Project notes and checked results</li>
                </ul>
                <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                  Download a backup first if you want to keep them. Without a backup, this browser’s copy cannot be restored. Your theme preference stays.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <button ref={cancelRef} type="button" className="btn primary" onClick={() => setDeleteStep("closed")}>
                    Cancel
                  </button>
                  <button type="button" className="btn" onClick={() => setDeleteStep("confirm")}>
                    Continue
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 id="delete-progress-title">Delete everything saved in this browser?</h2>
                <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                  Cancel keeps your lessons, drafts, practice progress, and project notes. Deleting them cannot be undone without a backup.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <button ref={cancelRef} type="button" className="btn primary" onClick={() => setDeleteStep("closed")}>
                    Cancel
                  </button>
                  <button type="button" className="btn ghost feedback-err" onClick={confirmDelete}>
                    Yes, delete saved progress
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
