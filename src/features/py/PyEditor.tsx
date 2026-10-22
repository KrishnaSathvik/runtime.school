"use client";

import CodeMirror, { type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { indentUnit } from "@codemirror/language";
import { temporarilySetTabFocusMode, isolateHistory } from "@codemirror/commands";
import { EditorSelection, Prec, StateEffect, StateField, type Extension } from "@codemirror/state";
import { Decoration, EditorView, keymap, placeholder as cmPlaceholder, type DecorationSet } from "@codemirror/view";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import { editorTheme } from "@/components/editor/editor-theme";

/** Mark the line Python reported an error on (1-based), or clear it with null. */
const setErrorLine = StateEffect.define<number | null>();
const errorLineMark = Decoration.line({ class: "cm-py-error-line" });
const errorLineField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(deco, tr) {
    deco = deco.map(tr.changes);
    for (const e of tr.effects) {
      if (!e.is(setErrorLine)) continue;
      if (e.value === null || e.value < 1 || e.value > tr.state.doc.lines) deco = Decoration.none;
      else deco = Decoration.set([errorLineMark.range(tr.state.doc.line(e.value).from)]);
    }
    // Editing clears the mark: it described the code as it was when it ran.
    return tr.docChanged ? Decoration.none : deco;
  },
  provide: (f) => EditorView.decorations.from(f),
});

export type PyEditorHandle = {
  /** Move the cursor to a line and focus the editor (e.g. from an error message). */
  goToLine: (line: number) => void;
  focus: () => void;
  /**
   * Replace the whole document as an editor change (onChange fires). Use this for Reset/Undo:
   * a new `value` prop is deferred by @uiw while the learner is typing and could land later,
   * over newer typing.
   */
  replaceAll: (text: string) => void;
  /** Insert text at the cursor (on its own lines) as an editor change, and focus. */
  insert: (text: string) => void;
};

/**
 * The Python editor: CPython-style 4-space indentation, Python highlighting, line numbers,
 * current-line and bracket highlighting. Mod+Enter runs, Shift+Mod+Enter checks.
 * Tab indents; Escape then Tab moves focus out of the editor.
 */
export const PyEditor = forwardRef<PyEditorHandle, {
  value: string;
  onChange: (v: string) => void;
  onRun?: () => void;
  onCheck?: () => void;
  label: string;
  /** Line to mark, with a token so the same line can be marked again after an edit cleared it. */
  errorLine?: { line: number; token: number } | null;
  minHeight?: string;
  height?: string;
  /** Shown while the editor is empty. */
  placeholder?: string;
}>(function PyEditor({ value, onChange, onRun, onCheck, label, errorLine = null, minHeight, height, placeholder }, ref) {
  const cm = useRef<ReactCodeMirrorRef>(null);
  const handlers = useRef({ onRun, onCheck });
  handlers.current = { onRun, onCheck };

  const extensions = useMemo<Extension[]>(
    () => [
      python(),
      indentUnit.of("    "),
      EditorView.lineWrapping,
      editorTheme,
      errorLineField,
      ...(placeholder ? [cmPlaceholder(placeholder)] : []),
      EditorView.contentAttributes.of({ "aria-label": label, "aria-multiline": "true", spellcheck: "false", autocorrect: "off", autocapitalize: "off" }),
      Prec.highest(
        keymap.of([
          { key: "Mod-Enter", run: () => (handlers.current.onRun?.(), true) },
          { key: "Shift-Mod-Enter", run: () => ((handlers.current.onCheck ?? handlers.current.onRun)?.(), true) },
          // Let the next Tab leave the editor; Escape keeps its usual meaning too.
          { key: "Escape", run: (view) => (temporarilySetTabFocusMode(view), false) },
        ]),
      ),
    ],
    [label, placeholder],
  );

  useEffect(() => {
    cm.current?.view?.dispatch({ effects: setErrorLine.of(errorLine?.line ?? null) });
  }, [errorLine]);

  useImperativeHandle(ref, () => ({
    goToLine: (line: number) => {
      const view = cm.current?.view;
      if (!view) return;
      const n = Math.min(Math.max(1, line), view.state.doc.lines);
      const at = view.state.doc.line(n);
      view.dispatch({ selection: EditorSelection.cursor(at.from), effects: EditorView.scrollIntoView(at.from, { y: "center" }) });
      view.focus();
    },
    focus: () => cm.current?.view?.focus(),
    replaceAll: (text: string) => {
      const view = cm.current?.view;
      if (!view) return;
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text }, selection: EditorSelection.cursor(text.length), annotations: isolateHistory.of("full") });
    },
    insert: (text: string) => {
      const view = cm.current?.view;
      if (!view) return;
      const at = view.state.selection.main.head;
      const line = view.state.doc.lineAt(at);
      // Start on a fresh line, so inserted code never splits the line the cursor is on.
      const before = line.text.trim() ? "\n" : "";
      const pos = line.text.trim() ? line.to : line.from;
      const insert = before + text;
      view.dispatch({ changes: { from: pos, insert }, selection: EditorSelection.cursor(pos + insert.length), effects: EditorView.scrollIntoView(pos + insert.length, { y: "center" }) });
      view.focus();
    },
  }));

  return (
    <div className="py-editor">
      <CodeMirror
        ref={cm}
        value={value}
        onChange={onChange}
        extensions={extensions}
        onCreateEditor={(view) => { view.scrollDOM.tabIndex = 0; view.scrollDOM.setAttribute("aria-label", "Scroll Python code"); }}
        theme="none"
        height={height}
        minHeight={minHeight}
        indentWithTab
        basicSetup={{
          lineNumbers: true,
          highlightActiveLine: true,
          highlightActiveLineGutter: true,
          bracketMatching: true,
          closeBrackets: true,
          indentOnInput: true,
          foldGutter: false,
          autocompletion: false,
          searchKeymap: false,
          highlightSelectionMatches: false,
          tabSize: 4,
        }}
      />
    </div>
  );
});
