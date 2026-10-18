import { courseOrder } from "@/content";

/**
 * SQL constructs a learner may be graded on, and the lesson that first explains each one.
 * Lesson ids are content ids. Course order, not the id number, decides what is "earlier".
 *
 * Graded SQL (a lesson challenge answer, or a practice solution) may use a construct only
 * when this lesson or an earlier lesson has explained it.
 *
 * LIMIT is the one preview exception, and only outside graded SQL: a worked example may
 * use LIMIT to show a few rows before the sorting lesson, if the lesson says so. It is
 * not part of the pattern and it is not graded. Result-changing functions such as
 * ROUND, date(), and julianday never get that exception.
 */
export type SqlConstruct = {
  name: string;
  taughtIn: number;
  /** Allowed in non-graded worked examples before `taughtIn`. Never allowed in graded SQL. */
  previewOnly?: boolean;
  match: (sql: string) => boolean;
};

/** Last course-order index of the Retail foundation (lessons 01–09). */
export const BEGINNER_SPINE_END = 8;

const word = (name: string) => (sql: string) => new RegExp(`\\b${name}\\b`).test(sql);
const call = (name: string) => (sql: string) => new RegExp(`\\b${name}\\s*\\(`).test(sql);

function bareJoin(sql: string): boolean {
  const stripped = sql
    .replace(/\bFULL\s+OUTER\s+JOIN\b/g, " ")
    .replace(/\bLEFT\s+OUTER\s+JOIN\b/g, " ")
    .replace(/\bRIGHT\s+OUTER\s+JOIN\b/g, " ")
    .replace(/\bLEFT\s+JOIN\b/g, " ")
    .replace(/\bRIGHT\s+JOIN\b/g, " ")
    .replace(/\bCROSS\s+JOIN\b/g, " ")
    .replace(/\bINNER\s+JOIN\b/g, " ");
  return /\bJOIN\b/.test(stripped);
}

export const SQL_CONSTRUCTS: SqlConstruct[] = [
  { name: "AS", taughtIn: 1, match: word("AS") },
  { name: "WHERE", taughtIn: 3, match: word("WHERE") },
  { name: "BETWEEN", taughtIn: 4, match: word("BETWEEN") },
  { name: "AND", taughtIn: 4, match: word("AND") },
  { name: "OR", taughtIn: 5, match: word("OR") },
  { name: "NOT", taughtIn: 5, match: word("NOT") },
  { name: "IN", taughtIn: 6, match: (sql) => /\bIN\s*\(/.test(sql) },
  { name: "LIKE", taughtIn: 6, match: word("LIKE") },
  { name: "IS NULL", taughtIn: 7, match: (sql) => /\bIS\s+NULL\b/.test(sql) },
  { name: "IS NOT NULL", taughtIn: 7, match: (sql) => /\bIS\s+NOT\s+NULL\b/.test(sql) },
  { name: "COALESCE", taughtIn: 7, match: call("COALESCE") },
  { name: "ORDER BY", taughtIn: 8, match: (sql) => /\bORDER\s+BY\b/.test(sql) },
  { name: "LIMIT", taughtIn: 8, previewOnly: true, match: word("LIMIT") },
  { name: "DISTINCT", taughtIn: 2, match: word("DISTINCT") },
  { name: "COUNT", taughtIn: 9, match: call("COUNT") },
  { name: "SUM", taughtIn: 9, match: call("SUM") },
  { name: "AVG", taughtIn: 9, match: call("AVG") },
  { name: "ROUND", taughtIn: 9, match: call("ROUND") },
  { name: "GROUP BY", taughtIn: 10, match: (sql) => /\bGROUP\s+BY\b/.test(sql) },
  { name: "HAVING", taughtIn: 11, match: word("HAVING") },
  { name: "CASE", taughtIn: 12, match: word("CASE") },
  { name: "CAST", taughtIn: 56, match: call("CAST") },
  { name: "JOIN", taughtIn: 54, match: bareJoin },
  { name: "LEFT JOIN", taughtIn: 15, match: (sql) => /\bLEFT\s+(OUTER\s+)?JOIN\b/.test(sql) },
  { name: "CROSS JOIN", taughtIn: 35, match: (sql) => /\bCROSS\s+JOIN\b/.test(sql) },
  { name: "FULL OUTER JOIN", taughtIn: 36, match: (sql) => /\bFULL\s+OUTER\s+JOIN\b/.test(sql) },
  { name: "NULLIF", taughtIn: 32, match: call("NULLIF") },
  { name: "WITH", taughtIn: 20, match: word("WITH") },
  { name: "RECURSIVE", taughtIn: 27, match: word("RECURSIVE") },
  { name: "EXISTS", taughtIn: 18, match: word("EXISTS") },
  { name: "UNION", taughtIn: 19, match: word("UNION") },
  { name: "INTERSECT", taughtIn: 38, match: word("INTERSECT") },
  { name: "EXCEPT", taughtIn: 38, match: word("EXCEPT") },
  { name: "strftime", taughtIn: 26, match: call("STRFTIME") },
  { name: "substr", taughtIn: 33, match: call("SUBSTR") },
  { name: "TRIM", taughtIn: 33, match: call("TRIM") },
  { name: "date", taughtIn: 45, match: call("DATE") },
  { name: "julianday", taughtIn: 41, match: call("JULIANDAY") },
  { name: "OVER", taughtIn: 21, match: word("OVER") },
  { name: "ROW_NUMBER", taughtIn: 21, match: call("ROW_NUMBER") },
  { name: "RANK", taughtIn: 22, match: call("RANK") },
  { name: "DENSE_RANK", taughtIn: 22, match: call("DENSE_RANK") },
  { name: "LAG", taughtIn: 24, match: call("LAG") },
  { name: "LEAD", taughtIn: 40, match: call("LEAD") },
  { name: "FIRST_VALUE", taughtIn: 41, match: call("FIRST_VALUE") },
  { name: "LAST_VALUE", taughtIn: 41, match: call("LAST_VALUE") },
];

/** Strip comments and string literals so words inside them are not constructs. */
export function scanSql(sql: string): string {
  return sql
    .replace(/--[^\n]*/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/'(?:''|[^'])*'/g, " '' ")
    .toUpperCase();
}

export function courseIndex(lessonId: number): number {
  const index = courseOrder.indexOf(lessonId);
  if (index < 0) throw new Error(`Lesson ${lessonId} is not in the course order.`);
  return index;
}

/** Course-order index of the latest prerequisite. No prerequisites means the first lesson only. */
export function latestCourseIndex(lessonIds: number[]): number {
  if (lessonIds.length === 0) return 0;
  return Math.max(...lessonIds.map(courseIndex));
}

export function isBeginnerSpine(lessonIds: number[]): boolean {
  return latestCourseIndex(lessonIds) <= BEGINNER_SPINE_END;
}

/**
 * Constructs in `sql` that are taught after `allowedIndex`.
 * Graded SQL never treats previewOnly as an excuse. Non-graded scans skip those constructs.
 */
export function futureConstructs(sql: string, allowedIndex: number, graded: boolean): string[] {
  const scanned = scanSql(sql);
  return SQL_CONSTRUCTS.filter((construct) => {
    if (!graded && construct.previewOnly) return false;
    if (!construct.match(scanned)) return false;
    return courseIndex(construct.taughtIn) > allowedIndex;
  }).map((construct) => construct.name);
}
