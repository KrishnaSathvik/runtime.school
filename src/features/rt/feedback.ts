import type { SqlResult } from "@/engine/grading";
import type { ExecuteResponse } from "@/engine/sql-client";
import { stripSql } from "@/engine/explain";

/**
 * Learner-facing wording for a failed check. The grader decides pass or fail; this module only
 * explains a failure it already reported, using the result previews the worker sent back (up to
 * 200 rows each) and the text of the query. It never changes a verdict.
 */
export type FeedbackContext = {
  /** The SQL that was checked. */
  query?: string;
  /** Tables the task reads; joins are only mentioned when a task uses more than one. */
  tables?: string[];
  /** Whether the learner has been taught a construct (lesson pages). Absent: no curriculum limit. */
  taught?: (construct: string) => boolean;
  /** Expected rows already shown on the page. An expected value is quoted only if its row is one of these. */
  visibleExpected?: unknown[][];
};

const same = (x: unknown, y: unknown) =>
  typeof x === "number" && typeof y === "number"
    ? Math.abs(x - y) <= 1e-8 * Math.max(1, Math.abs(x), Math.abs(y))
    : x === y;
const sameRow = (a: unknown[], b: unknown[]) => a.length === b.length && a.every((v, i) => same(v, b[i]));
const key = (r: unknown[]) => JSON.stringify(r);
const sortRows = (rows: unknown[][]) => [...rows].sort((x, y) => (key(x) < key(y) ? -1 : key(x) > key(y) ? 1 : 0));

function show(v: unknown): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") {
    const s = String(v);
    return s.length > 14 ? `${v.toFixed(6)}…` : s;
  }
  const s = String(v);
  return `'${s.length > 40 ? s.slice(0, 40) + "…" : s}'`;
}

/** Plain words for what the query text can tell us, limited to what the learner has met. */
function vocabulary(ctx: FeedbackContext) {
  const clean = stripSql(ctx.query ?? "").toUpperCase();
  const uses = (re: RegExp) => re.test(clean);
  const taught = (c: string) => (ctx.taught ? ctx.taught(c) : true);
  const usesJoin = uses(/\bJOIN\b/);
  return {
    clean,
    join: usesJoin || ((ctx.tables?.length ?? 0) > 1 && (taught("JOIN") || taught("LEFT JOIN"))),
    usesJoin,
    group: uses(/\bGROUP\s+BY\b/),
    orderBy: uses(/\bORDER\s+BY\b/),
    limit: uses(/\bLIMIT\b/),
    window: uses(/\bOVER\b/),
    round: uses(/\bROUND\s*\(/) || taught("ROUND"),
    strict: /(^|[^<>!=])[<>](?![=>])/.test(clean),
    where: uses(/\bWHERE\b/) || uses(/\bHAVING\b/),
  };
}

const joinList = (parts: string[]) =>
  parts.length <= 1 ? parts.join("") : `${parts.slice(0, -1).join(", ")} or ${parts[parts.length - 1]}`;

/** Detail for a wrong row count, naming only constructs the learner used or has been taught. */
export function rowCountDetail(actualCount: number, expectedCount: number, ctx: FeedbackContext = {}, actual?: SqlResult | null): string {
  const v = vocabulary(ctx);
  const query = ctx.query ?? "";
  if (actualCount === 0) {
    const literal = /'(?:''|[^'])+'/.test(query.replace(/--[^\n]*|\/\*[\s\S]*?\*\//g, " "));
    return literal
      ? "Yours returned 0: no row matched. Text comparisons must match exactly, including upper and lower case. Check the values in your conditions."
      : "Yours returned 0: no row matched. Check your conditions.";
  }
  if (actualCount < expectedCount) {
    const causes: string[] = [];
    if (v.strict) causes.push("`>` or `<` that leaves out the boundary value itself");
    if (v.where) causes.push("a condition that is too strict");
    if (v.usesJoin || v.join) causes.push("a JOIN that drops rows without a match");
    if (v.limit) causes.push("a LIMIT that cuts the result short");
    return `Yours returned ${actualCount}, fewer than expected.${causes.length ? ` Look for ${joinList(causes)}.` : " Check which rows the task asks for."}`;
  }
  const causes: string[] = [];
  const dup = actual && actual.values.length > 1 && new Set(actual.values.map(key)).size < actual.values.length;
  causes.push(v.where ? "a condition that is missing or too loose" : "a missing condition");
  if (v.usesJoin || v.join) causes.push("a JOIN that repeats rows");
  if (v.group) causes.push("grouping by more columns than the task asks for");
  return `Yours returned ${actualCount}, more than expected.${dup ? " Some of your rows are exact duplicates." : ""} Look for ${joinList(causes)}.`;
}

type Mismatch = { row: number; col: number; yours: unknown; expected: unknown };

function firstMismatch(a: unknown[][], e: unknown[][]): Mismatch | null {
  for (let i = 0; i < Math.min(a.length, e.length); i++)
    for (let j = 0; j < e[i].length; j++) if (!same(a[i][j], e[i][j])) return { row: i, col: j, yours: a[i][j], expected: e[i][j] };
  return null;
}

/** What kind of difference column `col` shows across the aligned preview rows. */
function columnPattern(a: unknown[][], e: unknown[][], col: number, wholeDivision: boolean): "rounding" | "integer" | "hundred" | "larger" | "smaller" | "other" {
  const pairs: Array<[number, number]> = [];
  for (let i = 0; i < Math.min(a.length, e.length); i++) {
    const x = a[i][col], y = e[i][col];
    if (same(x, y)) continue;
    if (typeof x !== "number" || typeof y !== "number") return "other";
    pairs.push([x, y]);
  }
  if (!pairs.length) return "other";
  if (pairs.every(([x, y]) => y !== 0 && Math.abs(x * 100 - y) <= 0.011 * Math.abs(y))) return "hundred";
  // Whole-number results from a division written without any decimal number: integer division.
  if (wholeDivision && pairs.every(([x, y]) => Number.isInteger(x) && Math.abs(x) <= Math.abs(y))) return "integer";
  if (pairs.every(([x, y]) => Math.abs(x - y) < 0.5 && Math.abs(x - y) < Math.max(0.05, Math.abs(y) * 0.01))) return "rounding";
  if (pairs.every(([x, y]) => x > y)) return "larger";
  if (pairs.every(([x, y]) => x < y)) return "smaller";
  return "other";
}

/**
 * Pairs rows by their text columns (e.g. a category or month) when those identify each row in both
 * results, so a wrong number is reported in the right row even when it also changed the sort order.
 */
function alignByKey(actual: unknown[][], expected: unknown[][]): { a: unknown[][]; e: unknown[][]; keys: number[] } | null {
  if (!expected.length || actual.length !== expected.length) return null;
  const width = expected[0].length;
  const keys = [...Array(width).keys()].filter((j) => [...actual, ...expected].every((r) => typeof r[j] === "string"));
  if (!keys.length || keys.length === width) return null;
  const k = (r: unknown[]) => JSON.stringify(keys.map((j) => r[j]));
  const byKey = new Map(actual.map((r) => [k(r), r]));
  if (byKey.size !== actual.length || new Set(expected.map(k)).size !== expected.length) return null;
  const a = expected.map((r) => byKey.get(k(r)));
  if (a.some((r) => !r)) return null;
  return { a: a as unknown[][], e: expected, keys };
}

/**
 * Detail for "right columns and row count, but the values check failed".
 * Order-only problems are named as such; otherwise the first differing column is named.
 */
export function valuesDetail(res: ExecuteResponse, ordered: boolean, ctx: FeedbackContext = {}): string | undefined {
  const actual = res.result, expected = res.expected;
  if (!actual || !expected) return undefined;
  const v = vocabulary(ctx);
  const sa = sortRows(actual.values), se = sortRows(expected.values);
  const sameSet = sa.length === se.length && sa.every((r, i) => sameRow(r, se[i]));
  // Ordered tasks compare row by row; unordered ones compare the sorted rows.
  const [a, e] = ordered ? [actual.values, expected.values] : [sa, se];
  const miss = firstMismatch(a, e);
  if (!miss) {
    // The previews (first 200 rows) match; the difference is further down.
    return "Your first 200 rows match; some values differ after that. Check the calculation and the conditions for every row.";
  }
  if (ordered && sameSet) {
    return v.orderBy
      ? "Your rows are right, but not in the requested order. Check the ORDER BY columns, ASC or DESC, and any tie-breaker the task asks for."
      : "Your rows are right, but not in the requested order. Add ORDER BY as the task describes.";
  }
  // Prefer pairing rows by their text columns; fall back to position (ordered) or sorted order.
  const keyed = alignByKey(actual.values, expected.values);
  const pa = keyed?.a ?? a, pe = keyed?.e ?? e;
  const found = (keyed && firstMismatch(pa, pe)) || miss;
  const col = expected.columns[found.col] ?? actual.columns[found.col];
  const where = keyed
    ? `the row for ${keyed.keys.map((j) => `${expected.columns[j]} ${show(pe[found.row][j])}`).join(", ")}`
    : ordered ? `row ${found.row + 1}` : "one row";
  const visible = ctx.visibleExpected?.some((r) => sameRow(r, pe[found.row]));
  const pair = visible
    ? `In ${where} yours is ${show(found.yours)}; the expected result shows ${show(found.expected)}.`
    : `In ${where} yours is ${show(found.yours)}.`;
  const wholeDivision = v.clean.includes("/") && !/\d\.\d|\bCAST\s*\(/.test(v.clean);
  let why: string;
  switch (columnPattern(pa, pe, found.col, wholeDivision)) {
    case "rounding":
      why = `It looks like rounding: check how many decimal places the task asks for${v.round ? " (ROUND(value, places))" : ""}.`;
      break;
    case "integer":
      why = "Dividing two whole numbers in SQLite drops the decimals. Multiply by 1.0 (or 100.0 for a percentage) before dividing.";
      break;
    case "hundred":
      why = "Your values look 100 times too small. For a percentage, multiply by 100.0.";
      break;
    case "larger":
      why = `Your values are larger than expected.${v.join ? " Rows may be counted more than once, for example when a JOIN matches several rows per key." : " Some rows may be counted more than once, or a condition may be missing."}`;
      break;
    case "smaller":
      why = `Your values are smaller than expected.${v.join ? " Some rows may be left out, for example by a JOIN that drops rows without a match, or by a condition." : " Some rows may be left out by a condition."}`;
      break;
    default:
      why = v.window
        ? "Check the calculation, the conditions, and the window definition (PARTITION BY and ORDER BY inside OVER)."
        : `Check the calculation and the conditions${v.join ? ", and which columns the JOIN matches on" : ""}.`;
  }
  return `\`${col}\` differs. ${pair} ${why}`;
}

/* ------------------------------------------------------------------ */
/* Changed-data failures                                               */
/* ------------------------------------------------------------------ */

const LITERAL = /'((?:''|[^'])*)'|(?<![\w.])(-?\d+(?:\.\d+)?)(?![\w.])/g;

/** Literals in the query that are also cells of the expected result. */
function copiedValues(query: string, expected: SqlResult | null | undefined): string[] {
  if (!expected) return [];
  const cells = new Set(expected.values.flat().filter((c) => c !== null).map((c) => String(c)));
  const noComments = query.replace(/--[^\n]*|\/\*[\s\S]*?\*\//g, " ");
  const hits = new Set<string>();
  for (const m of noComments.matchAll(LITERAL)) {
    const text = m[1] !== undefined ? m[1].replace(/''/g, "'") : m[2];
    if (text === undefined || text.length < 2 || /%|_/.test(m[1] ?? "")) continue;
    if (cells.has(text) || (m[2] !== undefined && cells.has(String(Number(text))))) hits.add(text);
  }
  return [...hits];
}

/**
 * Detail for "right on the original data, wrong on the changed data". Hardcoding is only named
 * when the query reads no table or contains several values copied from the expected result.
 */
export function changedDataDetail(res: ExecuteResponse, ctx: FeedbackContext = {}): string {
  const query = ctx.query ?? "";
  const clean = stripSql(query);
  const v = vocabulary(ctx);
  const readsNoTable = !/\bFROM\b/i.test(clean) || /\bFROM\s*\(\s*VALUES\b/i.test(clean);
  const copied = copiedValues(query, res.expected);
  if (readsNoTable || copied.length >= 5) {
    return readsNoTable
      ? "Your query matches this data, but it doesn't read the tables, so it can't follow when the data changes. Compute the answer FROM the tables instead of typing the result."
      : `Your query matches this data, but it contains values copied from the result (${copied.slice(0, 3).map((c) => `'${c}'`).join(", ")}…), so it breaks when the data changes. Compute them from the tables instead.`;
  }
  const lead = "Your query matches this data, but returns a different result when the data changes, so part of it only happens to work here.";
  const raw = query.replace(/--[^\n]*|\/\*[\s\S]*?\*\//g, " ");
  const between = raw.match(/\bBETWEEN\s+'[^']*'\s+AND\s+'(\d{4}-\d{2}-\d{2})'/i);
  if (between) {
    return `${lead} \`BETWEEN … AND '${between[1]}'\` stops at the very start of ${between[1]}: a value such as '${between[1]} 14:00' is later than '${between[1]}', so it is left out. To include the whole last day, compare with \`<\` and the next day.`;
  }
  const lte = raw.match(/<=\s*'(\d{4}-\d{2}-\d{2})'/);
  if (lte) {
    return `${lead} \`<= '${lte[1]}'\` stops at the very start of ${lte[1]}: a value such as '${lte[1]} 14:00' is later than '${lte[1]}', so it is left out. To include the whole day, compare with \`<\` and the next day.`;
  }
  const prefix = raw.match(/\bLIKE\s+'([^'%_][^']*%)'/i);
  if (prefix) {
    return `${lead} \`LIKE '${prefix[1]}'\` only matches text that starts with ${prefix[1].slice(0, -1).trim()}. If the words can appear anywhere in the text, put % on both sides.`;
  }
  const suffix = raw.match(/\bLIKE\s+'(%[^'%]+)'/i);
  if (suffix) {
    return `${lead} \`LIKE '${suffix[1]}'\` only matches text that ends with ${suffix[1].slice(1).trim()}. If the words can appear anywhere in the text, put % on both sides.`;
  }
  if (v.limit) {
    return `${lead} LIMIT keeps a fixed number of rows; when the data changes, the right number of rows can change too. Use a condition that picks the rows the task describes.`;
  }
  const causes = ["each condition and range boundary follows the task's rules, not just the rows in this sample"];
  if (v.usesJoin) causes.push("rows without a match, or with several matches, are handled");
  if (v.group || /\b(COUNT|SUM|AVG|MIN|MAX)\s*\(/i.test(clean)) causes.push("ties and NULLs are handled");
  return `${lead} Check that ${joinList(causes)}.`;
}

/**
 * The text to show for a failed grade, or the grader's own message when no better diagnosis applies.
 * Pass/fail always comes from `res.grade.ok`.
 */
export function gradeFeedback(res: ExecuteResponse, ordered: boolean, ctx: FeedbackContext = {}): string {
  const grade = res.grade;
  if (!grade || grade.ok) return grade?.message ?? "";
  if (grade.planFailed) return grade.message;
  if (/requires you to use|required constraint|required database state|valid write was rejected|repeat|idempotent|Repeated execution/i.test(grade.message)) return grade.message;
  if (grade.variationFailed) return /changed-data check failed/i.test(grade.message) ? changedDataDetail(res, ctx) : grade.message;
  const actual = res.result, expected = res.expected;
  if (!actual || !expected) return grade.message;
  if (actual.columns.length !== expected.columns.length || actual.columns.some((c, i) => c.toLowerCase() !== expected.columns[i].toLowerCase())) return grade.message;
  const actualCount = res.total ?? actual.values.length;
  const expectedCount = res.expectedTotal ?? expected.values.length;
  if (actualCount !== expectedCount) return `Expected ${expectedCount} rows. ${rowCountDetail(actualCount, expectedCount, ctx, actual)}`;
  if (/order differ|values differ/i.test(grade.message)) return valuesDetail(res, ordered, ctx) ?? grade.message;
  return grade.message;
}
