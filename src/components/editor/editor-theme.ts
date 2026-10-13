import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { EditorView } from "@codemirror/view";
import { tags as t } from "@lezer/highlight";

/**
 * Coding surface driven by `--ide-*` tokens so the editor follows light/dark
 * app theme while keeping its own syntax colors.
 */
export const editorTheme = [
  EditorView.theme({
    "&": {
      color: "var(--ide-text)",
      backgroundColor: "var(--ide-bg)",
      fontSize: "var(--editor-font-size)",
    },
    ".cm-content": {
      fontFamily: "var(--font-mono)",
      caretColor: "var(--ide-text)",
      padding: "12px 0",
    },
    ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--ide-text)", borderLeftWidth: "2px" },
    "&.cm-focused": { outline: "none" },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": {
      backgroundColor: "var(--ide-selection) !important",
    },
    ".cm-activeLine": { backgroundColor: "var(--ide-active)" },
    ".cm-gutters": {
      backgroundColor: "var(--ide-bg)",
      color: "var(--ide-muted)",
      borderRight: "1px solid var(--ide-border)",
      fontFamily: "var(--font-mono)",
    },
    ".cm-activeLineGutter": { backgroundColor: "var(--ide-active)", color: "var(--ide-text)" },
    ".cm-placeholder": { color: "var(--ide-muted)" },
    ".cm-matchingBracket": { backgroundColor: "var(--ide-elevated)", outline: "1px solid var(--ide-kw)" },
    ".cm-tooltip": {
      backgroundColor: "var(--ide-chrome)",
      color: "var(--ide-text)",
      border: "1px solid var(--ide-border)",
      borderRadius: "6px",
    },
    ".cm-tooltip.cm-tooltip-autocomplete > ul": { fontFamily: "var(--font-mono)", maxHeight: "12em" },
    ".cm-tooltip.cm-tooltip-autocomplete > ul > li": { padding: "2px 8px" },
    ".cm-tooltip.cm-tooltip-autocomplete > ul > li[aria-selected]": {
      backgroundColor: "var(--ide-selection)",
      color: "var(--ide-text)",
    },
    ".cm-completionMatchedText": { textDecoration: "none", fontWeight: "700", color: "var(--ide-kw)" },
    ".cm-completionIcon": { color: "var(--ide-muted)" },
  }),
  syntaxHighlighting(
    HighlightStyle.define([
      { tag: [t.keyword, t.operatorKeyword, t.modifier], color: "var(--ide-kw)", fontWeight: "600" },
      { tag: [t.string, t.special(t.string)], color: "var(--ide-str)" },
      { tag: [t.comment, t.lineComment, t.blockComment], color: "var(--ide-com)", fontStyle: "italic" },
      { tag: [t.number, t.bool, t.null], color: "var(--ide-num)" },
      { tag: [t.typeName, t.standard(t.name)], color: "var(--ide-kw)" },
      { tag: [t.operator, t.punctuation, t.paren, t.bracket], color: "var(--ide-text)" },
      { tag: [t.name, t.propertyName, t.variableName, t.special(t.name)], color: "var(--ide-text)" },
    ]),
  ),
];
