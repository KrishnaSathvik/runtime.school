import { teachingSchema } from "@/engine/explain";
import type { Difficulty, TopicId } from "./types";

/**
 * Difficulty rubric. Scores what the reference solution must actually do —
 * tables and relationships, aggregation, nesting, windows, writes and checked
 * constraints — never the module a challenge lives in or how long the SQL is.
 */
export type SqlFeatures = {
  tables: string[];
  joins: number;
  leftJoin: boolean;
  selfJoin: boolean;
  crossOrFull: boolean;
  aggregate: boolean;
  groupBy: boolean;
  having: boolean;
  conditionalAgg: boolean;
  distinctCount: boolean;
  distinct: boolean;
  subqueries: number;
  exists: boolean;
  ctes: number;
  recursive: boolean;
  windows: number;
  partition: boolean;
  frame: boolean;
  lagLead: boolean;
  ranking: boolean;
  caseExpr: boolean;
  dates: boolean;
  strings: boolean;
  nullFns: boolean;
  setOps: boolean;
  where: boolean;
  like: boolean;
  inList: boolean;
  between: boolean;
  isNull: boolean;
  orderBy: boolean;
  limit: boolean;
  alias: boolean;
  writes: string[]; // CREATE, INSERT, UPDATE, DELETE, VIEW, INDEX, TRIGGER, TRANSACTION, UPSERT
  validators: number;
};

const strip = (sql: string) =>
  sql.replace(/--[^\n]*|\/\*[\s\S]*?\*\//g, " ").replace(/'(?:''|[^'])*'/g, "''");

export function sqlFeatures(sql: string, validators = 0): SqlFeatures {
  const s = strip(sql);
  const u = s.toUpperCase();
  const count = (re: RegExp) => (u.match(re) ?? []).length;
  const cteNames = [...s.matchAll(/(?:\bWITH\b(?:\s+RECURSIVE)?|,)\s*([A-Za-z_]\w*)\s*(?:\([^)]*\))?\s+AS\s*\(/gi)].map(
    (m) => m[1].toLowerCase(),
  );
  // Candidate names after FROM/JOIN/INTO/UPDATE/TABLE are only accepted when they
  // are real tables in the SQLite schema, or objects this script creates. Keyword
  // look-alikes ("UPDATE OF price" in a trigger, "DO UPDATE SET" in an upsert) are not tables.
  const created = new Set(
    [...s.matchAll(/\bCREATE\s+(?:TEMP\s+|TEMPORARY\s+)?(?:TABLE|VIEW)\s+(?:IF\s+NOT\s+EXISTS\s+)?([A-Za-z_]\w*)/gi)].map((m) =>
      m[1].toLowerCase(),
    ),
  );
  const known = teachingSchema();
  const onTargets = [...s.matchAll(/\bCREATE\s+(?:TEMP\s+)?(?:UNIQUE\s+)?(?:TRIGGER|INDEX)\b[^;]*?\bON\s+([A-Za-z_]\w*)/gi)].map((m) => m[1]);
  const refs = [...[...s.matchAll(/\b(?:FROM|JOIN|INTO|UPDATE|TABLE)\s+([A-Za-z_]\w*)/gi)].map((m) => m[1]), ...onTargets]
    .map((m) => m.toLowerCase())
    .filter((t) => !cteNames.includes(t) && (t in known || created.has(t)));
  const tables = [...new Set(refs)];
  const joinTargets = [...s.matchAll(/\bJOIN\s+([A-Za-z_]\w*)/gi)].map((m) => m[1].toLowerCase());
  const fromTargets = [...s.matchAll(/\bFROM\s+([A-Za-z_]\w*)/gi)].map((m) => m[1].toLowerCase());
  const writes: string[] = [];
  if (/\bCREATE\s+(TEMP\s+|TEMPORARY\s+)?TABLE\b/.test(u)) writes.push("CREATE");
  if (/\bALTER\s+TABLE\b/.test(u)) writes.push("ALTER");
  if (/\bINSERT\b/.test(u)) writes.push("INSERT");
  if (/\bUPDATE\s+\w+\s+SET\b/.test(u)) writes.push("UPDATE");
  if (/\bDELETE\s+FROM\b/.test(u)) writes.push("DELETE");
  if (/\bCREATE\s+(TEMP\s+)?VIEW\b/.test(u)) writes.push("VIEW");
  if (/\bCREATE\s+(UNIQUE\s+)?INDEX\b/.test(u)) writes.push("INDEX");
  if (/\bCREATE\s+(TEMP\s+)?TRIGGER\b/.test(u)) writes.push("TRIGGER");
  if (/\b(BEGIN|SAVEPOINT|ROLLBACK|COMMIT)\b/.test(u)) writes.push("TRANSACTION");
  if (/\bON\s+CONFLICT\b/.test(u)) writes.push("UPSERT");
  return {
    tables,
    joins: count(/\bJOIN\b/g),
    leftJoin: /\bLEFT\s+(OUTER\s+)?JOIN\b/.test(u),
    selfJoin: joinTargets.some((t) => fromTargets.includes(t) || joinTargets.filter((x) => x === t).length > 1),
    crossOrFull: /\b(CROSS|FULL)\s+(OUTER\s+)?JOIN\b/.test(u),
    aggregate: /\b(COUNT|SUM|AVG|MIN|MAX|TOTAL|GROUP_CONCAT)\s*\(/.test(u.replace(/\bOVER\s*\([^)]*\)/g, "")),
    groupBy: /\bGROUP\s+BY\b/.test(u),
    having: /\bHAVING\b/.test(u),
    conditionalAgg: /\b(SUM|COUNT|AVG|MAX|MIN)\s*\(\s*(DISTINCT\s+)?CASE\b/.test(u) || /\bFILTER\s*\(\s*WHERE\b/.test(u),
    distinctCount: /\bCOUNT\s*\(\s*DISTINCT\b/.test(u),
    distinct: /\bSELECT\s+DISTINCT\b/.test(u),
    subqueries: count(/\(\s*SELECT\b/g),
    exists: /\bEXISTS\s*\(/.test(u),
    ctes: cteNames.length,
    recursive: /\bWITH\s+RECURSIVE\b/.test(u),
    windows: count(/\bOVER\s*\(/g),
    partition: /\bPARTITION\s+BY\b/.test(u),
    frame: /\b(ROWS|RANGE|GROUPS)\s+BETWEEN\b/.test(u),
    lagLead: /\b(LAG|LEAD|FIRST_VALUE|LAST_VALUE|NTH_VALUE)\s*\(/.test(u),
    ranking: /\b(ROW_NUMBER|RANK|DENSE_RANK|NTILE|PERCENT_RANK|CUME_DIST)\s*\(/.test(u),
    caseExpr: /\bCASE\b/.test(u),
    dates: /\b(STRFTIME|DATE|DATETIME|JULIANDAY|UNIXEPOCH)\s*\(/.test(u),
    strings: /\b(TRIM|LTRIM|RTRIM|LOWER|UPPER|SUBSTR|SUBSTRING|REPLACE|INSTR|LENGTH|PRINTF)\s*\(|\|\|/.test(u),
    nullFns: /\b(COALESCE|NULLIF|IFNULL)\s*\(/.test(u),
    setOps: /\b(UNION|INTERSECT|EXCEPT)\b/.test(u),
    where: /\bWHERE\b/.test(u),
    like: /\bLIKE\b|\bGLOB\b/.test(u),
    inList: /\bIN\s*\(/.test(u),
    between: /\bBETWEEN\b/.test(u.replace(/\b(ROWS|RANGE|GROUPS)\s+BETWEEN\b/g, "")),
    isNull: /\bIS\s+(NOT\s+)?NULL\b/.test(u),
    orderBy: /\bORDER\s+BY\b/.test(u.replace(/\bOVER\s*\([^)]*\)/g, "")),
    limit: /\bLIMIT\b/.test(u),
    alias: /\bAS\s+[A-Za-z_]/.test(u),
    writes,
    validators,
  };
}

export function rubricScore(f: SqlFeatures): number {
  let s = 0;
  s += Math.min(3, Math.max(0, f.tables.length - 1));
  if (f.joins) s += 1;
  if (f.leftJoin) s += 0.5;
  if (f.selfJoin) s += 1;
  if (f.crossOrFull) s += 0.5;
  if (f.aggregate) s += 1;
  if (f.groupBy) s += 0.5;
  if (f.having) s += 1;
  if (f.conditionalAgg) s += 1;
  if (f.distinctCount) s += 0.5;
  s += Math.min(2, f.subqueries);
  if (f.exists) s += 0.5;
  s += Math.min(3, f.ctes * 0.75);
  if (f.recursive) s += 2;
  if (f.windows) s += 2 + Math.min(1, (f.windows - 1) * 0.5);
  if (f.partition) s += 0.5;
  if (f.frame) s += 1;
  if (f.lagLead) s += 0.5;
  if (f.caseExpr) s += 0.5;
  if (f.dates) s += 0.5;
  if (f.strings) s += 0.5;
  if (f.nullFns) s += 0.5;
  if (f.setOps) s += 1;
  const w = new Set(f.writes);
  if (w.has("CREATE") || w.has("ALTER")) s += 1;
  s += Math.min(1, ["INSERT", "UPDATE", "DELETE"].filter((x) => w.has(x)).length * 0.5);
  if (w.has("VIEW") || w.has("INDEX")) s += 0.5;
  if (w.has("TRIGGER")) s += 1.5;
  if (w.has("TRANSACTION")) s += 1.5;
  if (w.has("UPSERT")) s += 1;
  s += Math.min(2, f.validators);
  return Math.round(s * 100) / 100;
}

export function rubricDifficulty(score: number, f: SqlFeatures): Difficulty {
  const singleConcept = f.tables.length <= 1 && !f.aggregate && !f.joins && !f.windows && !f.subqueries && !f.ctes && f.writes.length === 0;
  if (score < 1 && singleConcept) return "warmup";
  if (score < 3) return "easy";
  if (score < 6) return "medium";
  return "hard";
}

/** Secondary topic tags inferred from features. */
export function featureTags(f: SqlFeatures): TopicId[] {
  const t: TopicId[] = [];
  if (f.where) t.push("filtering.where");
  if (f.like) t.push("filtering.like");
  if (f.inList && !f.subqueries) t.push("filtering.in");
  if (f.between) t.push("filtering.between");
  if (f.isNull) t.push("filtering.null");
  if (f.distinct) t.push("basics.distinct");
  if (f.orderBy) t.push("basics.order-by");
  if (f.limit) t.push("basics.limit");
  if (f.aggregate) t.push("aggregation.basic");
  if (f.groupBy) t.push("aggregation.group-by");
  if (f.having) t.push("aggregation.having");
  if (f.conditionalAgg) t.push("aggregation.conditional");
  if (f.distinctCount) t.push("aggregation.distinct-count");
  if (f.joins && !f.leftJoin && !f.selfJoin) t.push("joins.inner");
  if (f.leftJoin) t.push("joins.left");
  if (f.selfJoin) t.push("joins.self");
  if (f.joins >= 2) t.push("joins.multi");
  if (f.setOps) t.push("joins.set-ops");
  if (f.exists) t.push("subqueries.exists");
  else if (f.subqueries) t.push("subqueries.scalar");
  if (f.ctes) t.push("subqueries.cte");
  if (f.recursive) t.push("subqueries.recursive");
  if (f.ranking) t.push("windows.rank");
  if (f.lagLead) t.push("windows.lag-lead");
  if (f.frame) t.push("windows.rolling");
  if (f.caseExpr) t.push("cleaning.case");
  if (f.strings) t.push("cleaning.strings");
  if (f.nullFns) t.push("cleaning.coalesce");
  if (f.dates) t.push("dates.filter");
  const w = new Set(f.writes);
  if (w.has("CREATE") || w.has("ALTER")) t.push("engineering.ddl");
  if (w.has("INSERT") || w.has("UPDATE") || w.has("DELETE")) t.push("engineering.dml");
  if (w.has("VIEW") || w.has("TRIGGER")) t.push("engineering.views");
  if (w.has("INDEX")) t.push("optimization.indexes");
  if (w.has("TRANSACTION")) t.push("engineering.transactions");
  if (w.has("UPSERT")) t.push("warehousing.incremental");
  if (f.validators) t.push("engineering.constraints");
  return [...new Set(t)];
}

/** Structure signature: keywords and functions with identifiers/literals removed. */
export function skeleton(sql: string): string {
  return strip(sql)
    .toUpperCase()
    .replace(/''/g, "?")
    .replace(/\b\d+(\.\d+)?\b/g, "#")
    .match(/\b(SELECT|DISTINCT|FROM|JOIN|LEFT|CROSS|FULL|ON|WHERE|AND|OR|NOT|IN|EXISTS|BETWEEN|LIKE|IS|NULL|GROUP|BY|HAVING|ORDER|LIMIT|UNION|ALL|INTERSECT|EXCEPT|WITH|RECURSIVE|AS|CASE|WHEN|THEN|ELSE|END|OVER|PARTITION|ROWS|RANGE|COUNT|SUM|AVG|MIN|MAX|ROUND|COALESCE|NULLIF|LAG|LEAD|ROW_NUMBER|RANK|DENSE_RANK|NTILE|FIRST_VALUE|LAST_VALUE|STRFTIME|DATE|JULIANDAY|TRIM|LOWER|UPPER|SUBSTR|CREATE|TABLE|INSERT|UPDATE|DELETE|VIEW|INDEX|TRIGGER|BEGIN|COMMIT|ROLLBACK|SAVEPOINT|CONFLICT|DESC|ASC)\b|[(),*=<>]/g)
    ?.join(" ") ?? "";
}

/** Jaccard similarity of skeleton token bigrams. */
export function similarity(a: string, b: string): number {
  const grams = (s: string) => {
    const t = s.split(" ");
    return new Set(t.slice(1).map((x, i) => `${t[i]} ${x}`));
  };
  const A = grams(a);
  const B = grams(b);
  if (!A.size && !B.size) return 1;
  let inter = 0;
  for (const g of A) if (B.has(g)) inter++;
  return inter / (A.size + B.size - inter);
}
