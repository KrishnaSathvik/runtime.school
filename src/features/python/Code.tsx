import { highlightCode, tagHighlighter, tags as t } from "@lezer/highlight";
import { pythonLanguage } from "@codemirror/lang-python";
import type { ReactNode } from "react";

/**
 * Read-only Python with the editor's colours: the same parser CodeMirror uses, so examples, programs to predict and
 * read-only files look exactly like code in the editor. The tag rules mirror src/components/editor/editor-theme.ts.
 */
const highlighter = tagHighlighter([
  { tag: [t.keyword, t.operatorKeyword, t.modifier, t.typeName], class: "hl-kw" },
  { tag: [t.function(t.variableName), t.function(t.name), t.standard(t.name)], class: "hl-fn" },
  { tag: t.string, class: "hl-str" },
  { tag: [t.comment, t.lineComment, t.blockComment], class: "hl-com" },
  { tag: [t.number, t.bool, t.null], class: "hl-num" },
]);
export function Code({ code, label, className = "" }: { code: string; label?: string; className?: string }) {
  const text = code.replace(/\n$/, "");
  const out: ReactNode[] = [];
  let k = 0;
  highlightCode(
    text,
    pythonLanguage.parser.parse(text),
    highlighter,
    (t, cls) => out.push(cls ? <span key={k++} className={cls}>{t}</span> : t),
    () => out.push("\n"),
  );
  return (
    <pre className={`p2-code ${className}`} tabIndex={0} aria-label={label}>
      {out}
    </pre>
  );
}
