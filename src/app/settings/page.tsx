"use client";

import {sourceLinks} from "@/content";
import { useShortcutModifier } from "@/lib/keyboard-shortcuts";
import { importFailureMessage } from "@/lib/feedback-copy";
import { useRef, useState } from "react";
import { useLearning, type ThemePreference } from "@/lib/learning-state";

export default function SettingsPage() {
  const modifier = useShortcutModifier();
  const preference = useLearning((s) => s.preferences.theme);
  const collapsed = useLearning((s) => s.preferences.collapsed);
  const setTheme = useLearning((s) => s.setTheme);
  const setCollapsed = useLearning((s) => s.setCollapsed);
  const exportProgress = useLearning((s) => s.exportProgress);
  const importProgress = useLearning((s) => s.importProgress);
  const resetProgress = useLearning((s) => s.resetProgress);
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  return (
    <div className="canvas settings">

      <h1>Settings</h1>
      <p className="lead">
        Choose your appearance, see keyboard shortcuts, and back up or restore your progress.
      </p>

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
        <h2>Navigation preferences</h2>
        <label className="mt-4 flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={collapsed}
            onChange={(e) => setCollapsed(e.target.checked)}
          />
          Collapse desktop sidebar by default
        </label>
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
            onClick={() => {
              if (
                window.confirm(
                  "Delete all saved progress, SQL drafts, and project work in this browser? Download a backup first if you want to keep them.",
                )
              ) {
                resetProgress();
                setMessage("Saved progress and work have been deleted from this browser.");
                setImportError(null);
              }
            }}
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
                  throw new Error("This file could not be read. Choose a SQL Studio progress backup (.json).");
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
        <details className="mt-4 text-sm"><summary className="cursor-pointer">Backup compatibility</summary><p className="mt-2">SQL Studio can restore its earlier progress formats (versions 1–3). Progress is stored in this browser under <code>sql-studio-v1</code>.</p></details>
      </section>

      <section className="mt-8 border-t border-[var(--border)] pt-6">
        <h2 id="about">About / Credits</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
          SQL Studio runs in your browser without an account. It uses SQLite
          (via sql.js), Geist fonts, and Lucide icons.
        </p>
        <details className="mt-3 text-sm"><summary>SQL reference sources</summary><ul className="mt-3 space-y-3">{sourceLinks.map(([title,url])=><li key={url}><a className="text-[var(--accent)]" href={url} target="_blank" rel="noopener noreferrer">{title}</a></li>)}</ul></details>
        <details className="mt-3 text-sm"><summary className="cursor-pointer">Technical credits and licenses</summary><p className="mt-2">Built from the original ChatGPT Sites SQL Studio. SQLite runs through sql.js (WebAssembly). License notices are in <code>/public/vendor</code> and <code>/public/fonts</code>.</p></details>
      </section>
    </div>
  );
}
