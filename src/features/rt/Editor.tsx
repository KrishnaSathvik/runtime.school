"use client";

import CodeMirror from "@uiw/react-codemirror";
import { sql, SQLite } from "@codemirror/lang-sql";
import { autocompletion } from "@codemirror/autocomplete";
import { EditorView, keymap } from "@codemirror/view";
import { Prec } from "@codemirror/state";
import { useEffect, useMemo, useRef, useState } from "react";
import { editorTheme } from "@/components/editor/editor-theme";
import { sqlFunctionHighlight } from "@/components/editor/sql-function-highlight";
import { teachingSchema, parseSchema } from "@/engine/explain";

/** True on desktop/trackpad; false on phones so the popup does not cover typing. */
function useActivateOnTyping() {
  const [on, setOn] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(hover: none) and (pointer: coarse)");
    const apply = () => setOn(!mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return on;
}

/** The SQL editor used in every Runtime cell. Mod+Enter runs, Shift+Mod+Enter checks. */
export function Editor({
  value,
  onChange,
  onRun,
  onCheck,
  label,
  minHeight = "96px",
  autoFocus = false,
  tables,
  seedSql,
}: {
  value: string;
  onChange: (v: string) => void;
  onRun?: () => void;
  onCheck?: () => void;
  label: string;
  minHeight?: string;
  autoFocus?: boolean;
  /** Prefer these tables for completion; omit to offer the full teaching schema. */
  tables?: string[];
  seedSql?: string;
}) {
  // Keep the latest handlers without rebuilding the editor extensions.
  const handlers = useRef({ onRun, onCheck });
  handlers.current = { onRun, onCheck };
  const activateOnTyping = useActivateOnTyping();
  const tableKey = tables?.join(",") ?? "";

  const extensions = useMemo(() => {
    const all = seedSql ? parseSchema(seedSql) : teachingSchema();
    const names = tableKey
      ? tableKey.split(",").map((t) => t.trim()).filter(Boolean)
      : Object.keys(all);
    const schema = Object.fromEntries(
      names
        .map((t) => [t, all[t.toLowerCase()] ?? all[t] ?? []] as const)
        .filter(([, cols]) => cols.length),
    );
    const schemaNames = Object.keys(schema);
    return [
      sql({
        dialect: SQLite,
        schema,
        defaultTable: schemaNames[0],
        upperCaseKeywords: true,
      }),
      // Ctrl/Cmd-Space always works; typing opens the list on pointer devices only.
      autocompletion({ activateOnTyping }),
      EditorView.lineWrapping,
      editorTheme,
      sqlFunctionHighlight,
      EditorView.contentAttributes.of({ "aria-label": label }),
      Prec.highest(
        keymap.of([
          {
            key: "Mod-Enter",
            run: () => {
              handlers.current.onRun?.();
              return true;
            },
          },
          {
            key: "Shift-Mod-Enter",
            run: () => {
              (handlers.current.onCheck ?? handlers.current.onRun)?.();
              return true;
            },
          },
        ]),
      ),
    ];
  }, [label, tableKey, activateOnTyping, seedSql]);

  return (
    <div className="rx-editor">
      <CodeMirror
        value={value}
        onChange={onChange}
        extensions={extensions}
        theme="none"
        minHeight={minHeight}
        autoFocus={autoFocus}
        basicSetup={{ lineNumbers: true, foldGutter: false, autocompletion: false, highlightActiveLine: true }}
      />
    </div>
  );
}
