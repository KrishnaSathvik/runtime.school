"use client";
import CodeMirror from "@uiw/react-codemirror";
import { sql } from "@codemirror/lang-sql";
import { keymap, EditorView } from "@codemirror/view";
import { editorTheme } from "@/components/editor/editor-theme";
import { PyEditor } from "@/features/py/PyEditor";
import { useMemo, type ReactNode } from "react";
import { Keys, MacOnly } from "@/features/rt/Keys";
import { temporarilySetTabFocusMode } from "@codemirror/commands";
import { Prec } from "@codemirror/state";

/** A tool's editor as the SQL and Python tools show it: a named cell, the editor, actions at the bottom right. */
export function ToolEditor({ language, code, onChange, onRun, label, name, footer }: { language: "sql" | "python"; code: string; onChange: (s: string) => void; onRun: () => void; label: string; name?: string; footer?: ReactNode }) {
  const extensions = useMemo(() => [sql(), editorTheme, EditorView.lineWrapping, EditorView.contentAttributes.of({ "aria-label": label, spellcheck: "false" }), Prec.highest(keymap.of([{ key: "Mod-Enter", run: () => { onRun(); return true; } }, { key: "Escape", run: (view) => { temporarilySetTabFocusMode(view); return false; } }]))], [onRun, label]);
  return (
    <div className="rx-cell ps-cell">
      <div className="rx-cell-head">
        <span className="name">{name ?? (language === "python" ? "experiment.py" : "experiment.sql")}</span>
        <span className="acts" aria-hidden="true"><MacOnly><Keys keys={["mod", "enter"]} /> <span>run</span></MacOnly></span>
      </div>
      {language === "python" ? <PyEditor value={code} onChange={onChange} onRun={onRun} label={label} minHeight="220px" /> : <CodeMirror value={code} onChange={onChange} extensions={extensions} minHeight="220px" theme="none" aria-label={label} />}
      {footer && <div className="rx-cell-foot">{footer}</div>}
    </div>
  );
}
