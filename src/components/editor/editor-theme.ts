import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { EditorView } from "@codemirror/view";
import { tags as t } from "@lezer/highlight";

/**
 * Editorial IDE editor theme. Colours come from CSS tokens, so the editor
 * follows light/dark automatically and every token pair meets WCAG AA
 * (CodeMirror's stock dark theme put keywords at 4.43:1 on the active line).
 */
export const editorTheme = [
  EditorView.theme({
    "&": {
      color: "var(--code)",
      backgroundColor: "var(--editor)",
      fontSize: "var(--editor-font-size)",
    },
    ".cm-content": {
      fontFamily: "var(--font-mono)",
      caretColor: "var(--accent)",
      padding: "10px 0",
    },
    ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--accent)", borderLeftWidth: "2px" },
    "&.cm-focused": { outline: "none" },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": {
      backgroundColor: "var(--accent-soft) !important",
    },
    ".cm-activeLine": { backgroundColor: "var(--secondary)" },
    ".cm-gutters": {
      backgroundColor: "var(--editor)",
      color: "var(--muted)",
      border: "none",
      fontFamily: "var(--font-mono)",
    },
    ".cm-activeLineGutter": { backgroundColor: "var(--secondary)", color: "var(--text)" },
    ".cm-placeholder": { color: "var(--muted)" },
    ".cm-matchingBracket": { backgroundColor: "var(--accent-soft)", outline: "1px solid var(--strong)" },
    ".cm-tooltip": {
      backgroundColor: "var(--main)",
      color: "var(--text)",
      border: "1px solid var(--border)",
      borderRadius: "6px",
      boxShadow: "var(--shadow)",
    },
    ".cm-tooltip.cm-tooltip-autocomplete > ul": { fontFamily: "var(--font-mono)", maxHeight: "12em" },
    ".cm-tooltip.cm-tooltip-autocomplete > ul > li": { padding: "2px 8px" },
    ".cm-tooltip.cm-tooltip-autocomplete > ul > li[aria-selected]": {
      backgroundColor: "var(--accent-soft)",
      color: "var(--text)",
    },
    ".cm-completionMatchedText": { textDecoration: "none", fontWeight: "700", color: "var(--accent-strong)" },
    ".cm-completionIcon": { color: "var(--muted)" },
  }),
  syntaxHighlighting(
    HighlightStyle.define([
      { tag: [t.keyword, t.operatorKeyword, t.modifier], color: "var(--kw)", fontWeight: "600" },
      { tag: [t.string, t.special(t.string)], color: "var(--str)" },
      { tag: [t.comment, t.lineComment, t.blockComment], color: "var(--com)", fontStyle: "italic" },
      { tag: [t.number, t.bool, t.null], color: "var(--num)" },
      { tag: [t.typeName, t.standard(t.name)], color: "var(--kw)" },
      { tag: [t.operator, t.punctuation, t.paren, t.bracket], color: "var(--text-secondary)" },
      { tag: [t.name, t.propertyName, t.variableName, t.special(t.name)], color: "var(--code)" },
    ]),
  ),
];
