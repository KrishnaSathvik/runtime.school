import { syntaxTree } from "@codemirror/language";
import { RangeSetBuilder } from "@codemirror/state";
import { Decoration, EditorView, ViewPlugin, type DecorationSet, type ViewUpdate } from "@codemirror/view";
import { isSqlFunctionCall } from "./sql-functions";

const functionMark = Decoration.mark({ class: "cm-sql-fn" });

/**
 * Recolors COUNT(, COALESCE(, and the other SQL functions.
 * The SQLite grammar tags many of them as keywords or plain names.
 */
export const sqlFunctionHighlight = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = marks(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) this.decorations = marks(update.view);
    }
  },
  { decorations: (plugin) => plugin.decorations },
);

function marks(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const text = view.state.doc.toString();
  for (const range of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from: range.from,
      to: range.to,
      enter(node) {
        if (node.name !== "Keyword" && node.name !== "Identifier" && node.name !== "Builtin") return;
        const word = text.slice(node.from, node.to);
        if (!isSqlFunctionCall(text, node.from, word)) return;
        builder.add(node.from, node.to, functionMark);
      },
    });
  }
  return builder.finish();
}
