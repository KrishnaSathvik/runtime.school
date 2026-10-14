import { SQLite } from "@codemirror/lang-sql";
import { isSqlFunctionCall } from "@/components/editor/sql-functions";

const KEYWORDS = new Set(
  String(SQLite.spec.keywords ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.toUpperCase()),
);

/** Same buckets as the editor: null and booleans use the number color, not amber. */
const NUMBER_WORDS = new Set(["NULL", "TRUE", "FALSE"]);

export type SqlTokenKind = "text" | "kw" | "fn" | "str" | "num" | "com";

export type SqlToken = { kind: SqlTokenKind; text: string };

const TOKEN =
  /(--[^\n]*|\/\*[\s\S]*?\*\/|\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$[\s\S]*?\$\1\$|'(?:''|[^'])*'|"(?:""|[^"])*"|`(?:``|[^`])*`|\[[^\]]*\]|(?:[$:@][A-Za-z_][A-Za-z0-9_]*|\$\d+|\?\d*)|\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b|\b[A-Za-z_][A-Za-z0-9_]*\b|\s+|.)/g;

/** Split SQL into the same roles the editor paints. */
export function highlightSql(source: string): SqlToken[] {
  TOKEN.lastIndex = 0;
  return Array.from(source.matchAll(TOKEN), (match) => {
    const text = match[0];
    return { kind: kindOf(text, source, match.index ?? 0), text };
  });
}

function kindOf(text: string, source: string, index: number): SqlTokenKind {
  if (text.startsWith("--") || text.startsWith("/*")) return "com";
  if (text.startsWith("'") || isDollarQuote(text)) return "str";
  if (/^\d/.test(text)) return "num";
  if (/^[A-Za-z_]/.test(text)) {
    const word = text.toUpperCase();
    if (NUMBER_WORDS.has(word)) return "num";
    if (isSqlFunctionCall(source, index, text)) return "fn";
    if (KEYWORDS.has(word)) return "kw";
  }
  return "text";
}

function isDollarQuote(text: string): boolean {
  return text.startsWith("$$") || /^\$[A-Za-z_][A-Za-z0-9_]*\$[\s\S]*\$$/.test(text);
}
