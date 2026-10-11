/** Conservative SQLite formatter: only whitespace changes, never SQL tokens.
 * Strings, quoted identifiers and comments stay byte-for-byte intact.
 * Works on incomplete drafts too; no parser or dialect rewrite is involved.
 */
export function formatSql(source: string): string {
  const tokens = source.match(/--[^\r\n]*|\/\*[\s\S]*?(?:\*\/|$)|'(?:''|[^'])*(?:'|$)|"(?:""|[^"])*(?:"|$)|`(?:``|[^`])*(?:`|$)|\[[^\]]*(?:\]|$)|\s+|[A-Za-z_][\w$]*|./g) ?? [];
  let depth = 0;
  let output = "";
  let pending = "";
  let lineComment = false;
  let previous = "";
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (/^\s+$/.test(token)) { pending = " "; continue; }
    const word = token.toUpperCase();
    const nextIndex = /^\s+$/.test(tokens[i + 1] ?? "") ? i + 2 : i + 1;
    const next = tokens[nextIndex]?.toUpperCase();
    const clause = depth === 0 && (
      /^(SELECT|FROM|WHERE|HAVING|LIMIT|UNION|EXCEPT|INTERSECT|RETURNING|VALUES|SET)$/.test(word) ||
      (/^(GROUP|ORDER)$/.test(word) && next === "BY") ||
      (/^(LEFT|RIGHT|INNER|FULL|CROSS)$/.test(word) && (next === "JOIN" || next === "OUTER")) ||
      (word === "JOIN" && !/^(LEFT|RIGHT|INNER|FULL|CROSS|OUTER)$/.test(previous))
    );
    const newLine = lineComment || previous === ";" || clause;
    output += (output ? newLine ? "\n" : pending : "") + token;
    pending = "";
    lineComment = token.startsWith("--");
    if (token === "(") depth++;
    if (token === ")") depth = Math.max(0, depth - 1);
    previous = word;
  }
  return output;
}
