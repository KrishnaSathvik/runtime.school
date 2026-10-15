import { BRAND_NAME } from "@/platform/brand";
import type { SqlResult } from "./grading";
import { datasetForUrl, learningDatasets } from "@/data/datasets/learning";
import { databaseOf } from "./sql-client";

/**
 * Deterministic explanations for SQLite errors and failed checks.
 *
 * Rule: only state a cause the database output (or a direct inspection of the
 * query text against the real schema) establishes. Otherwise describe what the
 * message means and how to investigate — never guess.
 */
export type Explanation = {
  /** Short headline, e.g. "There is no column called `nme`". */
  title: string;
  /** What happened, in plain language. */
  detail: string;
  /** One concrete thing to try next. */
  next: string;
  /** The original database / grader message, shown under "Technical details". */
  technical?: string;
  kind: "error" | "result";
};

/* ------------------------------------------------------------------ */
/* Schema of the canonical datasets                                    */
/* ------------------------------------------------------------------ */

const CONSTRAINT_START = /^(PRIMARY|UNIQUE|CHECK|FOREIGN|CONSTRAINT)\b/i;

function splitTopLevel(body: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  let quote: string | null = null;
  for (const ch of body) {
    if (quote) {
      current += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"') quote = ch;
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      parts.push(current);
      current = "";
    } else current += ch;
  }
  if (current.trim()) parts.push(current);
  return parts;
}

/** Table → column names, parsed from CREATE TABLE statements. */
/** Index of the first top-level occurrence of a keyword (outside parentheses and quotes), or -1. */
function topLevelKeyword(sql: string, keyword: RegExp): number {
  let depth = 0;
  let quote: string | null = null;
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (quote) { if (ch === quote) quote = null; continue; }
    if (ch === "'" || ch === '"') quote = ch;
    else if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (ch === ";" && depth === 0) return -1;
    else if (depth === 0 && /\w/.test(ch) && !/\w/.test(sql[i - 1] ?? "") && keyword.test(sql.slice(i, i + 12))) return i;
  }
  return -1;
}

/** Output column names of a SELECT, from aliases and column references; `*` expands from known tables. */
function selectColumns(body: string, known: Record<string, string[]>): string[] {
  const select = topLevelKeyword(body, /^SELECT\b/i);
  if (select < 0) return [];
  const rest = body.slice(select + 6);
  const from = topLevelKeyword(rest, /^FROM\b/i);
  const end = from >= 0 ? from : (() => { const semi = rest.indexOf(";"); return semi >= 0 ? semi : rest.length; })();
  const list = rest.slice(0, end).replace(/^\s*(DISTINCT|ALL)\s+/i, "");
  const source = from >= 0 ? rest.slice(from + 4).match(/^\s*([A-Za-z_]\w*)/)?.[1]?.toLowerCase() : undefined;
  return splitTopLevel(list).flatMap((item) => {
    const text = item.trim();
    const alias = text.match(/\bAS\s+["`[]?([A-Za-z_]\w*)["`\]]?\s*$/i)?.[1];
    if (alias) return [alias];
    if (/^(\w+\.)?\*$/.test(text)) return known[(text.split(".")[0] === "*" ? source : text.split(".")[0])?.toLowerCase() ?? ""] ?? [];
    const ref = text.match(/(?:^|\.)["`[]?([A-Za-z_]\w*)["`\]]?$/)?.[1];
    return ref ? [ref] : [];
  });
}

/** Views and CREATE TABLE … AS SELECT tables in seed SQL, with their inferred column names. */
function derivedTables(sql: string, known: Record<string, string[]>): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  const re = /CREATE\s+(?:TEMP(?:ORARY)?\s+)?(?:VIEW|TABLE)\s+(?:IF\s+NOT\s+EXISTS\s+)?([A-Za-z_]\w*)\s*(?:\(([^()]*)\))?\s*AS\s+/gi;
  for (const m of sql.matchAll(re)) {
    const cols = m[2] ? m[2].split(",").map((c) => c.trim().replace(/["`[\]]/g, "")) : selectColumns(sql.slice((m.index ?? 0) + m[0].length), { ...known, ...out });
    if (cols.length) out[m[1].toLowerCase()] = cols;
  }
  return out;
}

export function parseSchema(sql: string): Record<string, string[]> {
  const schema: Record<string, string[]> = Object.fromEntries(
    Object.entries(canonicalSchema(sql)).map(([t, cols]) => [t, cols.map((c) => c.name)]),
  );
  const re = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*\(/gi;
  for (const m of sql.matchAll(re)) {
    const start = (m.index ?? 0) + m[0].length;
    let depth = 1;
    let i = start;
    for (; i < sql.length && depth > 0; i++) {
      if (sql[i] === "(") depth++;
      else if (sql[i] === ")") depth--;
    }
    schema[m[1].toLowerCase()] = splitTopLevel(sql.slice(start, i - 1))
      .map((d) => d.trim())
      .filter((d) => d && !CONSTRAINT_START.test(d))
      .map((d) => d.split(/\s+/)[0].replace(/["`[\]]/g, ""));
  }
  return { ...schema, ...derivedTables(sql, schema) };
}

let cachedSchema: Record<string, string[]> | null = null;
export function teachingSchema(): Record<string, string[]> {
  // Every table a learner can query, across the twelve canonical datasets. Tables that share a
  // name in different datasets (customers, calendar…) list the union of their columns.
  if (cachedSchema) return cachedSchema;
  const schema: Record<string, string[]> = {};
  for (const d of Object.values(learningDatasets)) {
    for (const t of d.metadata.tables) schema[t.name] = [...new Set([...(schema[t.name] ?? []), ...t.columns.map((c) => c.name)])];
  }
  return (cachedSchema = schema);
}

/* ------------------------------------------------------------------ */
/* Query-text helpers                                                  */
/* ------------------------------------------------------------------ */

/** Removes comments and string literals so keyword checks don't match inside them. */
export function stripSql(sql: string): string {
  return sql.replace(/--[^\n]*|\/\*[\s\S]*?\*\//g, " ").replace(/'(?:''|[^'])*'/g, "''");
}

const KEYWORDS = new Set(
  "on where join left right inner outer cross full group order limit having union using as natural except intersect window select from set values".split(
    " ",
  ),
);

/** Tables and aliases introduced in FROM / JOIN clauses and CTEs: alias → table. */
export function tableRefs(sql: string): Map<string, string> {
  const refs = new Map<string, string>();
  const clean = stripSql(sql);
  const re = /\b(?:FROM|JOIN)\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s+(?:AS\s+)?([A-Za-z_][A-Za-z0-9_]*))?/gi;
  for (const m of clean.matchAll(re)) {
    const table = m[1].toLowerCase();
    refs.set(table, table);
    const alias = m[2]?.toLowerCase();
    if (alias && !KEYWORDS.has(alias)) refs.set(alias, table);
  }
  const cte = /(?:\bWITH\b|,)\s*([A-Za-z_][A-Za-z0-9_]*)\s*(?:\([^)]*\))?\s+AS\s*\(/gi;
  for (const m of clean.matchAll(cte)) refs.set(m[1].toLowerCase(), m[1].toLowerCase());
  return refs;
}

function editDistance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
  return d[a.length][b.length];
}

/** Closest candidate within a small edit distance (a likely typo), else null. */
export function closest(word: string, candidates: string[]): string | null {
  const w = word.toLowerCase();
  let best: string | null = null;
  let bestD = Infinity;
  for (const c of candidates) {
    const d = editDistance(w, c.toLowerCase());
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  const limit = w.length <= 4 ? 1 : 2;
  return best && bestD > 0 && bestD <= limit ? best : null;
}

const list = (xs: string[]) => xs.map((x) => `\`${x}\``).join(", ");

/* ------------------------------------------------------------------ */
/* Database errors                                                     */
/* ------------------------------------------------------------------ */

// The worker appends its own hints to some messages; match on the SQLite part.
const WORKER_SUFFIX = / (Check the schema and aliases|Qualify the column with its table alias)\.$/;

export function explainError(error: string, query: string, tables: string[] = []): Explanation {
  const technical = error;
  const raw = error.replace(WORKER_SUFFIX, "");
  const schema = teachingSchema();
  const refs = tableRefs(query);
  const clean = stripSql(query);
  const make = (title: string, detail: string, next: string): Explanation => ({
    title,
    detail,
    next,
    technical,
    kind: "error",
  });
  let m: RegExpMatchArray | null;

  if ((m = raw.match(/^no such table: (?:main\.)?(\S+)/i))) {
    const name = m[1];
    const available = tables.length ? tables : Object.keys(schema);
    const guess = closest(name, Object.keys(schema));
    return make(
      `There is no table called \`${name}\``,
      guess
        ? `This database has no \`${name}\` table. \`${guess}\` is a close match — it may be a typo.`
        : `This database has no \`${name}\` table.`,
      guess ? `Did you mean \`${guess}\`?` : `Use one of the tables for this exercise: ${list(available)}.`,
    );
  }

  if ((m = raw.match(/^no such column: (\S+)/i))) {
    const name = m[1];
    const [qualifier, column] = name.includes(".") ? name.split(".") : [null, name];
    if (qualifier) {
      const table = refs.get(qualifier.toLowerCase());
      if (!table) {
        const aliases = [...refs.entries()].filter(([a, t]) => a !== t).map(([a]) => a);
        return make(
          `\`${qualifier}\` isn't a table or alias in this query`,
          `\`${name}\` uses the prefix \`${qualifier}\`, but no table in FROM or JOIN is named or aliased \`${qualifier}\`.`,
          aliases.length
            ? `Use one of the aliases you defined (${list(aliases)}), or give a table that alias, e.g. \`FROM customers ${qualifier}\`.`
            : `Give the table that alias in FROM/JOIN (e.g. \`FROM customers ${qualifier}\`), or use the table's name as the prefix.`,
        );
      }
      const cols = schema[table];
      if (cols && !cols.some((c) => c.toLowerCase() === column.toLowerCase())) {
        const guess = closest(column, cols);
        return make(
          `\`${table}\` has no column \`${column}\``,
          `\`${qualifier}\` refers to \`${table}\`, whose columns are ${list(cols)}.` +
            (guess ? ` \`${guess}\` is a close match.` : ""),
          guess ? `Did you mean \`${qualifier}.${guess}\`?` : `Check which table holds \`${column}\` and use that table's alias.`,
        );
      }
      return make(
        `SQLite can't find \`${name}\` here`,
        `\`${table}\` does have \`${column}\`, but \`${qualifier}\` isn't visible at this point of the query (for example, an alias from inside a subquery used outside it).`,
        "Use the alias in the same SELECT where its table is listed in FROM/JOIN.",
      );
    }

    const inQuery = [...new Set(refs.values())].filter((t) => schema[t]);
    const everywhere = [...new Set(Object.values(schema).flat())];
    const known = everywhere.some((c) => c.toLowerCase() === column.toLowerCase());
    if (!known) {
      const valueLike = new RegExp(`(=|<>|!=|\\bIN\\s*\\([^)]*|\\bLIKE)\\s*${column}\\b`, "i").test(clean);
      if (valueLike) {
        return make(
          `\`${column}\` was read as a column name`,
          `No table has a column called \`${column}\`, and SQL treats unquoted words as column names.`,
          `If \`${column}\` is a text value, wrap it in single quotes: \`'${column}'\`.`,
        );
      }
      const pool = inQuery.flatMap((t) => schema[t]);
      const guess = closest(column, pool.length ? pool : everywhere);
      const selectAliases = [...clean.matchAll(/\bAS\s+([A-Za-z_]\w*)/gi)].map((x) => x[1].toLowerCase());
      if (selectAliases.includes(column.toLowerCase())) {
        return make(
          `\`${column}\` is an alias SQLite can't see here`,
          `\`${column}\` is a name you gave with AS. It isn't a table column, and it isn't available in this part of the query (for example inside the same SELECT list, or inside a subquery).`,
          "Repeat the expression instead of the alias, or compute it in a subquery/CTE and select from that.",
        );
      }
      return make(
        `There is no column called \`${column}\``,
        inQuery.length
          ? `None of the tables in your query (${list(inQuery)}) has a \`${column}\` column.` +
              (guess ? ` \`${guess}\` is a close match.` : "")
          : `No table in this database has a \`${column}\` column.`,
        guess
          ? `Did you mean \`${guess}\`?`
          : inQuery.length
            ? `Available: ${inQuery.map((t) => `${t} (${schema[t].join(", ")})`).join("; ")}.`
            : "Check the table list next to the task for the right column names.",
      );
    }
    const owners = Object.entries(schema)
      .filter(([, cols]) => cols.some((c) => c.toLowerCase() === column.toLowerCase()))
      .map(([t]) => t);
    return make(
      `\`${column}\` isn't in the tables you're reading`,
      inQuery.length
        ? `\`${column}\` exists in ${list(owners)}, but your query reads ${list(inQuery)}.`
        : `\`${column}\` exists in ${list(owners)}, but the query has no FROM clause that includes it.`,
      `Add the table that has \`${column}\` to FROM/JOIN, or use a column from the tables you already read.`,
    );
  }

  if ((m = raw.match(/^ambiguous column name: (\S+)/i))) {
    const column = m[1];
    const holders = [
      ...new Set(
        [...refs.entries()]
          .filter(([a, t]) => a !== t || ![...refs.entries()].some(([a2, t2]) => a2 !== t2 && t2 === t))
          .filter(([, t]) => schema[t]?.some((c) => c.toLowerCase() === column.toLowerCase()))
          .map(([a]) => a),
      ),
    ];
    return make(
      `\`${column}\` is in more than one table`,
      holders.length > 1
        ? `Both ${list(holders)} have a \`${column}\` column, so SQLite doesn't know which one you mean.`
        : `More than one table in the query has a \`${column}\` column, so SQLite doesn't know which one you mean.`,
      `Prefix it with the table or alias, e.g. \`${holders[0] ?? "t"}.${column}\`.`,
    );
  }

  if (/^misuse of aggregate/i.test(raw)) {
    const beforeGroup = clean.split(/\bGROUP\s+BY\b/i)[0];
    const inWhere = /\bWHERE\b[\s\S]*\b(COUNT|SUM|AVG|MIN|MAX|TOTAL|GROUP_CONCAT)\s*\(/i.test(beforeGroup);
    return make(
      "An aggregate is used where it isn't allowed",
      inWhere
        ? "WHERE filters individual rows before any grouping happens, so it can't use COUNT, SUM, AVG, MIN or MAX."
        : "Aggregates like COUNT or SUM summarise groups of rows. They can't go in WHERE or GROUP BY, or directly inside another aggregate.",
      inWhere
        ? "Move that condition into HAVING, after GROUP BY: `GROUP BY … HAVING COUNT(*) > 2`."
        : "Filter on an aggregate with HAVING, or compute it in a subquery/CTE first.",
    );
  }

  if (/aggregate functions are not allowed in the GROUP BY clause/i.test(raw)) {
    return make(
      "GROUP BY can't contain an aggregate",
      "GROUP BY lists the columns that define each group; COUNT, SUM and the like are computed per group.",
      "Put the plain columns in GROUP BY and the aggregate in SELECT.",
    );
  }

  if ((m = raw.match(/^near "(.*)": syntax error/i))) {
    const token = m[1];
    const first = clean.match(/^[A-Za-z_][A-Za-z0-9_]*/)?.[0] ?? "";
    // SELEC … never gets as far as a column error. Say so before the generic "near this token" line.
    if (first && !/^(SELECT|WITH|EXPLAIN)$/i.test(first)) {
      const meant = closest(first, ["SELECT", "WITH", "EXPLAIN", "FROM", "WHERE"]);
      return make(
        "SQL syntax error",
        `\`${first}\` isn't a SQL command.`,
        meant ? `Did you mean \`${meant}\`?` : "Start with SELECT, or WITH.",
      );
    }
    const beforeFrom = clean.split(/\bFROM\b/i)[0] ?? "";
    let detail = `SQLite stopped understanding the query at \`${token}\`. The mistake is usually just before that point.`;
    let next = `Look right before \`${token}\` for a missing comma, a misspelled keyword, or an unclosed parenthesis.`;
    if (/^FROM$/i.test(token) && /,\s*$/.test(beforeFrom)) {
      detail = "There's a comma right before FROM, so SQLite expected another column.";
      next = "Remove the comma after the last column in SELECT.";
    } else if (/^FROM$/i.test(token) && /\bSELECT\s*$/i.test(beforeFrom)) {
      detail = "SELECT has no columns listed before FROM.";
      next = "List the columns you want after SELECT, for example `SELECT column_a, column_b`.";
    } else if (/^[A-Za-z]+$/.test(token) && /^(SELEC|SELCT|SLECT|FORM|FRMO|WHER|WEHRE|GROPU|ODER|ORDR)$/i.test(token)) {
      detail = `\`${token}\` looks like a misspelled keyword.`;
      next = "Check the spelling of SQL keywords (SELECT, FROM, WHERE, GROUP BY, ORDER BY).";
    }
    return make("SQL syntax error", detail, next);
  }

  if (/^incomplete input/i.test(raw)) {
    const open = (clean.match(/\(/g) ?? []).length - (clean.match(/\)/g) ?? []).length;
    const tail = clean.match(/\b(FROM|WHERE|JOIN|ON|AND|OR|BY|SELECT|HAVING|LIMIT)\s*;?\s*$/i);
    return make(
      "The query ends too early",
      open > 0
        ? `There ${open === 1 ? "is" : "are"} ${open} unclosed parenthes${open === 1 ? "is" : "es"}.`
        : tail
          ? `The query ends right after \`${tail[1].toUpperCase()}\`, which needs something after it.`
          : "SQLite reached the end while it still expected more (a table name, a condition, or a closing parenthesis).",
      open > 0 ? "Add the missing `)`." : tail ? `Finish the ${tail[1].toUpperCase()} clause.` : "Complete the last clause you started.",
    );
  }

  if ((m = raw.match(/^no such function: (\w+)/i))) {
    const fn = m[1].toUpperCase();
    const map: Record<string, string> = {
      NOW: "`datetime('now')`",
      GETDATE: "`datetime('now')`",
      CURDATE: "`date('now')`",
      LEN: "`LENGTH(...)`",
      ISNULL: "`IFNULL(a, b)` or `COALESCE(a, b)`",
      NVL: "`COALESCE(a, b)`",
      DATEDIFF: "`julianday(a) - julianday(b)`",
      DATE_TRUNC: "`strftime('%Y-%m', d)` (for months)",
      YEAR: "`strftime('%Y', d)`",
      MONTH: "`strftime('%m', d)`",
      TO_CHAR: "`strftime(...)`",
      CONCAT: "the `||` operator: `a || ' ' || b`",
    };
    return make(
      `SQLite has no ${fn}() function`,
      map[fn]
        ? `${fn}() comes from another database. SQLite's equivalent is ${map[fn]}.`
        : `${fn}() isn't available in SQLite — it may come from another database, or be misspelled.`,
      map[fn] ? `Use ${map[fn]}.` : "See Compare Syntax for SQLite equivalents.",
    );
  }

  if ((m = raw.match(/^wrong number of arguments to function (\w+)/i))) {
    return make(
      `${m[1]}() got the wrong number of values`,
      `The call to ${m[1]}() has too many or too few values inside its parentheses.`,
      "Check the commas inside the call.",
    );
  }

  if ((m = raw.match(/^(UNIQUE|NOT NULL|CHECK|FOREIGN KEY|PRIMARY KEY) constraint failed:?\s*(.*)$/i))) {
    const kind = m[1].toUpperCase();
    const target = m[2] ? ` (\`${m[2]}\`)` : "";
    const detail: Record<string, string> = {
      UNIQUE: `A row would duplicate a value that must be unique${target}.`,
      "PRIMARY KEY": `A row would reuse an existing key${target}.`,
      "NOT NULL": `A required column was left empty${target}.`,
      CHECK: `A value broke the table's CHECK rule${target}.`,
      "FOREIGN KEY": "A row points to a parent row that doesn't exist, or a parent row still has children.",
    };
    const next: Record<string, string> = {
      UNIQUE: "Change the duplicate value, or use INSERT … ON CONFLICT to update instead.",
      "PRIMARY KEY": "Use a new key, or update the existing row instead of inserting.",
      "NOT NULL": "Provide a value for that column in the INSERT or UPDATE.",
      CHECK: "Look at the CHECK in CREATE TABLE and use a value that satisfies it.",
      "FOREIGN KEY": "Insert the parent row first, or reference a parent id that exists.",
    };
    return make(`The ${kind} rule blocked the change`, detail[kind], next[kind]);
  }

  if ((m = raw.match(/^table (\w+) already exists/i))) {
    return make(
      `\`${m[1]}\` already exists`,
      `Your script creates \`${m[1]}\`, but a table with that name is already in the database — from the teaching data or earlier in the same script. (Every run starts fresh, so earlier runs aren't the cause.)`,
      "Use a different name, or `CREATE TABLE IF NOT EXISTS`.",
    );
  }

  if ((m = raw.match(/(\d+)(?:st|nd|rd|th) ORDER BY term out of range/i))) {
    return make(
      "ORDER BY points to a column that isn't there",
      `ORDER BY ${m[1]} means "sort by result column ${m[1]}", but the result has fewer columns.`,
      "Use a column name, or a number between 1 and the number of selected columns.",
    );
  }

  if (/do not have the same number of result columns/i.test(raw)) {
    return make(
      "UNION parts return different numbers of columns",
      "Every SELECT joined by UNION / UNION ALL must return the same number of columns.",
      "Make both SELECT lists the same length and order.",
    );
  }

  if ((m = raw.match(/sub-select returns (\d+) columns - expected 1/i))) {
    return make(
      "The subquery returns too many columns",
      `A subquery used as a single value (or with IN) must return one column; this one returns ${m[1]}.`,
      "Select just one column inside the subquery.",
    );
  }

  if (/Use a read-only SELECT, WITH, or EXPLAIN query/i.test(raw)) {
    const first = clean.match(/^[A-Za-z_][A-Za-z0-9_]*/)?.[0] ?? "";
    const write = /^(INSERT|REPLACE|UPDATE|DELETE|CREATE|DROP|ALTER|ATTACH|DETACH|REINDEX|VACUUM|BEGIN|COMMIT|END|ROLLBACK|SAVEPOINT|RELEASE|ANALYZE)$/i.test(first);
    // The worker rejects anything that does not start with SELECT, WITH, or EXPLAIN, including a typo like SELEC.
    if (!write) {
      const meant = closest(first, ["SELECT", "WITH", "EXPLAIN", "FROM", "WHERE"]);
      return {
        title: "SQL syntax error",
        detail: first ? `\`${first}\` isn't a SQL command.` : "This isn't a query SQLite can run.",
        next: meant ? `Did you mean \`${meant}\`?` : "Start with SELECT, or WITH.",
        kind: "error",
      };
    }
  }

  if (/Use a read-only SELECT, WITH, or EXPLAIN query/i.test(raw) || /readonly database/i.test(raw)) {
    return make(
      "This exercise only reads data",
      "Here, queries can look at data but can't create or change it.",
      "Start with SELECT (or WITH). To practise CREATE, INSERT or UPDATE, use the Database Lab.",
    );
  }

  if (/Run one SQL statement at a time/i.test(raw)) {
    return make(
      "One query at a time",
      "This exercise checks a single query, and the editor contains more than one statement (separated by `;`).",
      "Keep only the query you want to run, or comment the others out with `--`.",
    );
  }

  if (/End your lab script with a SELECT/i.test(raw) || /The query must return one table/i.test(raw)) {
    return make(
      "Nothing to show yet",
      "The SQL ran, but its last statement doesn't return rows, so there's no result to show or check.",
      "Finish with a SELECT that shows the result, e.g. `SELECT * FROM your_table;`.",
    );
  }

  if (/Write a query first/i.test(raw)) {
    return make("The editor is empty", "There's no SQL to run yet.", "Type a query, then press Run query.");
  }

  if (/timed out while starting/i.test(raw) || /engine worker failed/i.test(raw)) {
    return make(
      "SQL is still starting",
      "The in-browser database took too long to load (common on a cold first run).",
      "Press Retry to start it again.",
    );
  }

  if (/timed out/i.test(raw)) {
    return make(
      "The query took too long",
      `${BRAND_NAME} stopped waiting for a result after 3 seconds.`,
      "Try again. If it keeps happening, check JOIN conditions and make sure recursive queries have a stopping condition.",
    );
  }

  if (/engine (could not load|stopped)|worker failed/i.test(raw)) {
    return make(
      "SQL is temporarily unavailable",
      "The in-browser database stopped responding.",
      "Press Retry to start it again.",
    );
  }

  return make(
    "Your SQL couldn't run",
    "SQLite could not complete this query. Its original error is available in Technical details.",
    "Review the error and your SQL, then try Run query again.",
  );
}

/* ------------------------------------------------------------------ */
/* Failed checks (the query ran, but the output is wrong)              */
/* ------------------------------------------------------------------ */

const AGG = /\b(COUNT|SUM|AVG|MIN|MAX|TOTAL|GROUP_CONCAT)\s*\(/i;

function hasDuplicates(values: unknown[][]): boolean {
  const seen = new Set<string>();
  for (const row of values) {
    const k = JSON.stringify(row);
    if (seen.has(k)) return true;
    seen.add(k);
  }
  return false;
}

/** True when every mismatching cell is numeric and the difference is under 0.5 (a rounding issue). */
function onlyRoundingDiffers(actual: SqlResult, expected: SqlResult, ordered: boolean): boolean {
  const key = (r: unknown[]) => JSON.stringify(r.map((v) => (typeof v === "number" ? Math.round(v) : v)));
  const sort = (rows: unknown[][]) => (ordered ? rows : [...rows].sort((a, b) => key(a).localeCompare(key(b))));
  const a = sort(actual.values);
  const e = sort(expected.values);
  let numericDiff = false;
  for (let i = 0; i < a.length; i++)
    for (let j = 0; j < a[i].length; j++) {
      const x = a[i][j];
      const y = e[i]?.[j];
      if (x === y) continue;
      if (typeof x !== "number" || typeof y !== "number") return false;
      if (Math.abs(x - y) >= 0.5) return false;
      numericDiff = true;
    }
  return numericDiff;
}

export function explainGrade(args: {
  message: string;
  variationFailed?: boolean;
  planFailed?: boolean;
  query: string;
  actual?: SqlResult | null;
  expected?: SqlResult | null;
  ordered?: boolean;
}): Explanation {
  const { message, query, actual, expected, ordered = false } = args;
  const clean = stripSql(query);
  const make = (title: string, detail: string, next: string): Explanation => ({
    title,
    detail,
    next,
    technical: message,
    kind: "result",
  });

  if (args.planFailed) {
    return make(
      "Your result is correct, but the performance requirement isn't met",
      `${args.variationFailed ? "With different sample data, the" : "The"} query returns the right rows, but its indexes or query plan do not match the task. A query plan shows how SQLite reads tables and uses indexes to find rows.`,
      "Check the required index columns and how the task asks SQLite to find rows. Technical details show which requirement was missed and the query plan when available.",
    );
  }

  if (/changed-data check failed/i.test(message)) {
    return make(
      "Correct on the sample data, but not on different data",
      "Your query returns the expected result here, but not when the sample data changes. It may rely on particular values or miss cases such as ties or missing rows.",
      "Check your filters, joins and calculations against the task's rules, including any edge cases. Avoid copying fixed values from the sample result.",
    );
  }

  const required = message.match(/requires you to use (.+) in the actual script/i);
  if (required) {
    return make(
      `This exercise needs ${required[1]}`,
      `Your output is correct, but the exercise is practising ${required[1]}, and your SQL doesn't use it.`,
      `Rewrite the query using ${required[1]}.`,
    );
  }

  if (/required constraint is missing|required object|required database state|was not created correctly|valid write was rejected/i.test(message)) {
    return make(
      "The output matches, but the database object doesn't",
      /invalid write succeeded/i.test(message)
        ? "The checker tried an invalid write and it succeeded — the table is missing a constraint the task asks for."
        : "The checker inspected the table, view or index you built and it doesn't match the requirements.",
      "Re-read the task for required constraints, column definitions or indexes, and build them in CREATE.",
    );
  }

  if (/returned no table/i.test(message)) {
    return make(
      "No result to compare",
      "Your SQL didn't return a table of rows.",
      "Make sure the final statement is a SELECT that returns the requested columns.",
    );
  }

  if (actual && expected && actual.columns.length !== expected.columns.length) {
    const extra = actual.columns.length > expected.columns.length;
    return make(
      extra ? "Too many columns" : "Too few columns",
      `The task needs ${expected.columns.length} column${expected.columns.length === 1 ? "" : "s"} (${list(expected.columns)}); your query returns ${actual.columns.length} (${list(actual.columns)}).`,
      /SELECT\s+(DISTINCT\s+)?\*/i.test(clean)
        ? "Replace `SELECT *` with only the columns the task asks for."
        : extra
          ? "Remove the columns the task didn't ask for."
          : "Add the missing columns to SELECT.",
    );
  }

  if (actual && expected && actual.columns.some((c, i) => c.toLowerCase() !== expected.columns[i]?.toLowerCase())) {
    const wrong = actual.columns
      .map((c, i) => [c, expected.columns[i]] as const)
      .filter(([a, e]) => a.toLowerCase() !== e.toLowerCase());
    const sameSet =
      actual.columns.map((c) => c.toLowerCase()).sort().join() ===
      expected.columns.map((c) => c.toLowerCase()).sort().join();
    return make(
      sameSet ? "Columns are in a different order" : "Column names don't match",
      sameSet
        ? `You have the right columns, but the task expects this order: ${list(expected.columns)}.`
        : `Expected ${list(expected.columns)}. ${wrong.map(([a, e]) => `\`${a}\` should be named \`${e}\``).join("; ")}.`,
      sameSet ? "Reorder the columns in SELECT." : `Name calculated columns with AS, e.g. \`… AS ${wrong[0][1]}\`.`,
    );
  }

  // Results arrive capped at 200 rows; the grader's message carries the full row counts.
  const counted = message.match(/Expected (\d+) rows; got (\d+)/);
  const expectedRows = counted ? Number(counted[1]) : expected?.values.length ?? 0;
  const actualRows = counted ? Number(counted[2]) : actual?.values.length ?? 0;
  if (actual && expected && actualRows !== expectedRows) {
    const more = actualRows > expectedRows;
    const dup = more && hasDuplicates(actual.values) && !hasDuplicates(expected.values);
    const aggregateNoGroup = AGG.test(clean) && !/\bGROUP\s+BY\b/i.test(clean);
    let detail = `The expected result has ${expectedRows} row${expectedRows === 1 ? "" : "s"}; yours has ${actualRows}.`;
    let next = more
      ? "Look for a missing WHERE condition, a JOIN that matches more rows than intended, or rows that should be combined."
      : "Look for a WHERE condition that's too strict, an INNER JOIN that drops unmatched rows, or a LIMIT.";
    if (dup) {
      detail += " Some of your rows are exact duplicates.";
      next = /\bJOIN\b/i.test(clean)
        ? "A JOIN repeats rows when a key matches several rows. Check the ON condition, or aggregate before joining."
        : "Use DISTINCT if each value should appear once.";
    } else if (aggregateNoGroup && actualRows === 1 && expectedRows > 1) {
      detail += " An aggregate without GROUP BY always produces a single summary row.";
      next = "Add GROUP BY with the column(s) that define each group.";
    }
    return make(more ? "Too many rows" : "Too few rows", detail, next);
  }

  if (actual && expected && onlyRoundingDiffers(actual, expected, ordered)) {
    return make(
      "Close — only the decimals differ",
      "Your numbers are within rounding of the expected ones.",
      "Check the task's rounding instruction (e.g. `ROUND(x, 2)`), and whether a division needs decimals (`* 1.0`).",
    );
  }

  if (/order differ/i.test(message)) {
    return make(
      "Rows are out of order, or values differ",
      "This task checks row order, and your rows don't line up with the expected sequence.",
      /\bORDER\s+BY\b/i.test(clean)
        ? "Compare your ORDER BY columns and directions (ASC/DESC) with the task, including any tie-breaker."
        : "Add ORDER BY as the task describes.",
    );
  }

  if (/values differ/i.test(message)) {
    return make(
      "Right shape, different values",
      "You return the right columns and number of rows, but some values differ from the expected answer.",
      "Check calculations, filter conditions, join keys, and how NULLs are handled (COALESCE; COUNT(col) vs COUNT(*)).",
    );
  }

  return make("Not quite yet", message, "Compare your output with what the task asks for.");
}

export type ColumnDef = { name: string; type: string; key: "PK" | "FK" | null; references?: string };

/** Column names, declared types and keys for each table (for the schema panel). */
/** Tables of the canonical database named by a seed's directive line (none for plain SQL seeds). */
function canonicalSchema(seed: string): Record<string, ColumnDef[]> {
  const ref = databaseOf(seed);
  const dataset = ref ? datasetForUrl(ref.url) : undefined;
  if (!dataset) return {};
  return Object.fromEntries(dataset.metadata.tables.map((t) => [t.name, t.columns.map((c) => {
    const fk = t.foreignKeys.find((f) => f.columns.includes(c.name));
    return { name: c.name, type: c.type, key: t.primaryKey.includes(c.name) ? "PK" as const : fk ? "FK" as const : null, references: fk ? `${fk.table}.${fk.references[fk.columns.indexOf(c.name)]}` : undefined };
  })]));
}

export function parseSchemaDetailed(sql: string): Record<string, ColumnDef[]> {
  const out: Record<string, ColumnDef[]> = canonicalSchema(sql);
  const re = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*\(/gi;
  for (const m of sql.matchAll(re)) {
    const start = (m.index ?? 0) + m[0].length;
    let depth = 1;
    let i = start;
    for (; i < sql.length && depth > 0; i++) {
      if (sql[i] === "(") depth++;
      else if (sql[i] === ")") depth--;
    }
    const defs = splitTopLevel(sql.slice(start, i - 1)).map((d) => d.trim());
    const tablePk = defs
      .filter((d) => /^PRIMARY\s+KEY\s*\(/i.test(d))
      .flatMap((d) => d.replace(/^PRIMARY\s+KEY\s*\(|\)$/gi, "").split(",").map((c) => c.trim().toLowerCase()));
    out[m[1].toLowerCase()] = defs
      .filter((d) => d && !CONSTRAINT_START.test(d))
      .map((d) => {
        const [name, ...rest] = d.split(/\s+/);
        const restText = rest.join(" ");
        const type = (restText.match(/^(INTEGER|TEXT|REAL|NUMERIC|BLOB)/i)?.[1] ?? "").toUpperCase();
        const ref = restText.match(/REFERENCES\s+(\w+)\s*\((\w+)\)/i);
        const pk = /PRIMARY\s+KEY/i.test(restText) || tablePk.includes(name.toLowerCase());
        return { name, type, key: pk ? "PK" : ref ? "FK" : null, references: ref ? `${ref[1]}.${ref[2]}` : undefined };
      });
  }
  const known = Object.fromEntries(Object.entries(out).map(([t, cols]) => [t, cols.map((c) => c.name)]));
  for (const [t, cols] of Object.entries(derivedTables(sql, known))) out[t] = cols.map((name) => ({ name, type: "", key: null }));
  return out;
}
