/**
 * Readable SQL layout for display and for scripts loaded into an editor.
 *
 * Only whitespace changes: every token (keywords, identifiers, strings, comments, operators)
 * is emitted exactly as written, so the SQL runs identically. Line breaks go before clauses
 * at every nesting level, sub-queries are indented, long SELECT/GROUP BY/ORDER BY lists put
 * one item per line, and long CASE expressions put each WHEN on its own line.
 */

type Tok = { t: string; u: string; space: boolean };

const TOKEN = /--[^\r\n]*|\/\*[\s\S]*?(?:\*\/|$)|'(?:''|[^'])*(?:'|$)|"(?:""|[^"])*(?:"|$)|`(?:``|[^`])*(?:`|$)|\[[^\]]*(?:\]|$)|\s+|[A-Za-z_][\w$]*|\d+(?:\.\d+)?|<>|<=|>=|!=|==|\|\||::|./g;

// Clause starters (single words); multi-word ones are recognised by their first word.
const CLAUSE = new Set([
  "SELECT", "FROM", "WHERE", "GROUP", "HAVING", "ORDER", "LIMIT", "OFFSET", "UNION", "INTERSECT", "EXCEPT",
  "WINDOW", "SET", "RETURNING", "JOIN", "LEFT", "RIGHT", "INNER", "FULL", "CROSS", "NATURAL",
  "INSERT", "UPDATE", "DELETE", "CREATE", "ALTER", "DROP", "WITH", "BEGIN", "COMMIT", "ROLLBACK", "SAVEPOINT", "RELEASE", "REPLACE",
]);
// Words that are only a clause start when they begin a statement or follow these patterns.
const JOIN_LEAD = new Set(["LEFT", "RIGHT", "INNER", "FULL", "CROSS", "NATURAL"]);
const LIST_CLAUSES = new Set(["SELECT", "GROUP", "ORDER", "SET", "RETURNING"]);
const WIDTH = 72;

function tokenize(source: string): Tok[] {
  const raw = source.match(TOKEN) ?? [];
  const out: Tok[] = [];
  let space = false;
  for (const t of raw) {
    if (/^\s+$/.test(t)) { space = true; continue; }
    out.push({ t, u: t.toUpperCase(), space });
    space = false;
  }
  return out;
}

/** Index of the matching close paren for toks[i] === "(" (or toks.length if unbalanced). */
function closeOf(toks: Tok[], i: number) {
  let d = 0;
  for (let j = i; j < toks.length; j++) {
    if (toks[j].t === "(") d++;
    else if (toks[j].t === ")" && --d === 0) return j;
  }
  return toks.length;
}

const isSubquery = (toks: Tok[], open: number) => ["SELECT", "WITH", "VALUES"].includes(toks[open + 1]?.u ?? "");

/** Join tokens on one line, keeping a space only where the source had whitespace. */
function inline(toks: Tok[], indent: string): string {
  let s = "";
  for (let i = 0; i < toks.length; i++) {
    const k = toks[i];
    if (k.t === "(" && isSubquery(toks, i)) {
      const end = closeOf(toks, i);
      s += (s && k.space ? " " : "") + "(\n" + layout(toks.slice(i + 1, end), indent + "  ") + "\n" + indent + (end < toks.length ? ")" : "");
      i = end;
      continue;
    }
    if (k.u === "CASE") {
      const end = caseEnd(toks, i);
      const flat = toks.slice(i, end + 1).map((x, j) => (j && x.space ? " " : "") + x.t).join("");
      if (flat.length > 48 && toks.slice(i, end).some((x) => x.u === "WHEN")) {
        s += (s && k.space ? " " : "") + caseBlock(toks.slice(i, end + 1), indent);
        i = end;
        continue;
      }
    }
    s += (s && k.space ? " " : "") + k.t;
    if (k.t.startsWith("--")) s += "\n" + indent;
  }
  return s;
}

function caseEnd(toks: Tok[], i: number) {
  let d = 0;
  for (let j = i; j < toks.length; j++) {
    if (toks[j].u === "CASE") d++;
    else if (toks[j].u === "END" && --d === 0) return j;
  }
  return toks.length - 1;
}

/** CASE … END with each WHEN / ELSE on its own line. */
function caseBlock(toks: Tok[], indent: string): string {
  const inner = indent + "  ";
  let s = "";
  let part: Tok[] = [];
  const flush = () => {
    if (!part.length) return;
    let text = inline(part, inner);
    if (inner.length + text.length > WIDTH && !text.includes("\n")) {
      // Long WHEN condition: continue before top-level AND / OR / THEN.
      const pieces = splitBefore(part, ["AND", "OR", "THEN"]);
      text = pieces.map((pc, j) => (j ? "\n" + inner + "  " : "") + inline(pc, inner + "  ")).join("");
    }
    s += (s ? "\n" + inner : "") + text;
    part = [];
  };
  let d = 0;
  for (let i = 0; i < toks.length; i++) {
    const k = toks[i];
    if (k.u === "CASE") d++;
    if (d === 1 && i > 0 && (k.u === "WHEN" || k.u === "ELSE")) flush();
    if (d === 1 && k.u === "END" && i === toks.length - 1) {
      flush();
      s += "\n" + indent + k.t;
      return s;
    }
    if (k.u === "END") d--;
    part.push(k);
  }
  flush();
  return s;
}

/** Split a clause's tokens on top-level commas. */
function splitCommas(toks: Tok[]): Tok[][] {
  const parts: Tok[][] = [[]];
  let d = 0;
  let c = 0;
  for (const k of toks) {
    if (k.t === "(") d++;
    if (k.t === ")") d--;
    if (k.u === "CASE") c++;
    if (k.u === "END" && c > 0) c--;
    if (k.t === "," && d === 0 && c === 0) { parts[parts.length - 1].push(k); parts.push([]); continue; }
    parts[parts.length - 1].push(k);
  }
  return parts.filter((p) => p.length);
}

/** Split a clause before top-level occurrences of the given words (BETWEEN … AND stays together). */
function splitBefore(toks: Tok[], words: string[]): Tok[][] {
  const parts: Tok[][] = [[]];
  let d = 0;
  let c = 0;
  let between = false;
  toks.forEach((k, i) => {
    if (k.t === "(") d++;
    if (k.t === ")") d--;
    if (k.u === "CASE") c++;
    if (k.u === "END" && c > 0) c--;
    if (k.u === "BETWEEN") between = true;
    const top = d === 0 && c === 0 && i > 0;
    if (top && k.u === "AND" && between) { between = false; parts[parts.length - 1].push(k); return; }
    if (top && words.includes(k.u)) parts.push([]);
    parts[parts.length - 1].push(k);
  });
  return parts.filter((p) => p.length);
}

/** Does toks[i] begin a clause at this level? */
function startsClause(toks: Tok[], i: number, prevWord: string): boolean {
  const u = toks[i].u;
  if (!CLAUSE.has(u)) return false;
  if (i === 0) return true;
  if (JOIN_LEAD.has(u)) return ["JOIN", "OUTER"].includes(toks[i + 1]?.u) || toks[i + 2]?.u === "JOIN";
  if (u === "JOIN") return !JOIN_LEAD.has(prevWord) && prevWord !== "OUTER";
  if (u === "REPLACE") return prevWord === ";";
  if (u === "WITH") return prevWord === ";" || prevWord === "AS" || prevWord === "";
  // "INSERT … SELECT", "CREATE TABLE … AS SELECT": still break before SELECT.
  return true;
}

/** Lay out a sequence of statements/clauses at one nesting level. */
function layout(toks: Tok[], indent: string): string {
  const lines: string[] = [];
  let clause: Tok[] = [];
  let d = 0;
  let c = 0;
  let prev = "";
  const flush = () => {
    if (!clause.length) return;
    const head = clause[0].u;
    const one = inline(clause, indent);
    const firstLine = one.split("\n")[0];
    const lead = head === "GROUP" || head === "ORDER" ? 2 : clause[1]?.u === "DISTINCT" ? 2 : 1;
    const items = LIST_CLAUSES.has(head) ? splitCommas(clause.slice(lead)) : [];
    if (items.length > 1 && (one.includes("\n") || indent.length + firstLine.length > WIDTH)) {
      // Keyword line(s) up to the first item, then one item per line.
      lines.push(indent + inline(clause.slice(0, lead), indent));
      for (const it of items) lines.push(indent + "  " + inline(it, indent + "  "));
    } else if (indent.length + firstLine.length > WIDTH && !one.includes("\n")) {
      // Long JOIN … ON / WHERE / HAVING: continue before top-level ON, AND, OR.
      const parts = splitBefore(clause, ["ON", "AND", "OR"]);
      lines.push(indent + inline(parts[0], indent));
      for (const p of parts.slice(1)) lines.push(indent + "  " + inline(p, indent + "  "));
    } else {
      lines.push(indent + one);
    }
    clause = [];
  };
  for (let i = 0; i < toks.length; i++) {
    const k = toks[i];
    if (d === 0 && c === 0 && startsClause(toks, i, prev) && !(clause.length && isInsertTarget(clause, k))) flush();
    if (k.t === "(") d++;
    if (k.t === ")") d--;
    if (k.u === "CASE") c++;
    if (k.u === "END" && c > 0) c--;
    clause.push(k);
    if (d === 0 && c === 0 && k.t === ";") { flush(); prev = ";"; continue; }
    prev = k.u;
  }
  flush();
  return lines.join("\n");
}

/** Keep "INSERT INTO t (…) VALUES" / "CREATE TABLE … AS" heads together with their next word where it reads better. */
function isInsertTarget(clause: Tok[], k: Tok) {
  return clause[0].u === "DELETE" && k.u === "FROM" && clause.length === 1;
}

export function prettySql(source: string): string {
  const toks = tokenize(source);
  if (!toks.length) return source;
  return layout(toks, "").replace(/[ \t]+$/gm, "");
}
