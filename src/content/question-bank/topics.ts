import type { TopicId } from "./types";

export type TopicFamily = {
  id: string;
  label: string;
  topics: Array<{ id: TopicId; label: string }>;
};

/** Canonical taxonomy (families A–L). Display labels live here only. */
export const topicFamilies: TopicFamily[] = [
  {
    id: "basics",
    label: "SQL basics",
    topics: [
      { id: "basics.select", label: "SELECT columns" },
      { id: "basics.alias", label: "Column aliases" },
      { id: "basics.distinct", label: "DISTINCT" },
      { id: "basics.order-by", label: "ORDER BY" },
      { id: "basics.limit", label: "LIMIT" },
      { id: "basics.schema", label: "Tables & keys" },
    ],
  },
  {
    id: "filtering",
    label: "Filtering",
    topics: [
      { id: "filtering.where", label: "WHERE" },
      { id: "filtering.logic", label: "AND / OR / NOT" },
      { id: "filtering.in", label: "IN" },
      { id: "filtering.between", label: "BETWEEN & ranges" },
      { id: "filtering.like", label: "LIKE" },
      { id: "filtering.null", label: "NULL handling" },
    ],
  },
  {
    id: "aggregation",
    label: "Aggregation",
    topics: [
      { id: "aggregation.basic", label: "COUNT / SUM / AVG / MIN / MAX" },
      { id: "aggregation.group-by", label: "GROUP BY" },
      { id: "aggregation.having", label: "HAVING" },
      { id: "aggregation.conditional", label: "Conditional aggregation" },
      { id: "aggregation.distinct-count", label: "Distinct counts" },
    ],
  },
  {
    id: "joins",
    label: "Joins",
    topics: [
      { id: "joins.inner", label: "INNER JOIN" },
      { id: "joins.left", label: "LEFT JOIN" },
      { id: "joins.self", label: "Self joins" },
      { id: "joins.multi", label: "Multiple joins" },
      { id: "joins.anti", label: "Missing relationships / anti-joins" },
      { id: "joins.fan-out", label: "Join fan-out & cardinality" },
      { id: "joins.set-ops", label: "UNION / INTERSECT / EXCEPT" },
    ],
  },
  {
    id: "subqueries",
    label: "Subqueries & CTEs",
    topics: [
      { id: "subqueries.scalar", label: "Scalar subqueries" },
      { id: "subqueries.exists", label: "IN / EXISTS / NOT EXISTS" },
      { id: "subqueries.correlated", label: "Correlated subqueries" },
      { id: "subqueries.cte", label: "CTEs" },
      { id: "subqueries.recursive", label: "Recursive CTEs" },
    ],
  },
  {
    id: "windows",
    label: "Window functions",
    topics: [
      { id: "windows.row-number", label: "ROW_NUMBER" },
      { id: "windows.rank", label: "RANK / DENSE_RANK" },
      { id: "windows.lag-lead", label: "LAG / LEAD" },
      { id: "windows.running", label: "Running totals" },
      { id: "windows.rolling", label: "Rolling windows & frames" },
      { id: "windows.top-n", label: "Top-N per group" },
      { id: "windows.gaps-islands", label: "Gaps & islands" },
    ],
  },
  {
    id: "dates",
    label: "Dates & time",
    topics: [
      { id: "dates.filter", label: "Date filtering" },
      { id: "dates.buckets", label: "Monthly / weekly buckets" },
      { id: "dates.diff", label: "Date differences" },
      { id: "dates.series", label: "Date series & missing days" },
      { id: "dates.sessions", label: "Sessions & sequences" },
    ],
  },
  {
    id: "cleaning",
    label: "Strings & data cleaning",
    topics: [
      { id: "cleaning.strings", label: "TRIM / LOWER / SUBSTR / REPLACE" },
      { id: "cleaning.coalesce", label: "COALESCE & NULLIF" },
      { id: "cleaning.case", label: "CASE" },
      { id: "cleaning.dedupe", label: "Deduplication" },
      { id: "cleaning.validation", label: "Validation & types" },
    ],
  },
  {
    id: "analytics",
    label: "Business analytics",
    topics: [
      { id: "analytics.revenue", label: "Revenue & order value" },
      { id: "analytics.active-users", label: "Active users & engagement" },
      { id: "analytics.conversion", label: "Funnels & conversion" },
      { id: "analytics.retention", label: "Cohorts & retention" },
      { id: "analytics.segmentation", label: "Segmentation & ranking" },
      { id: "analytics.statistics", label: "Medians, shares & ratios" },
    ],
  },
  {
    id: "engineering",
    label: "Database engineering",
    topics: [
      { id: "engineering.ddl", label: "CREATE / ALTER" },
      { id: "engineering.dml", label: "INSERT / UPDATE / DELETE" },
      { id: "engineering.constraints", label: "Constraints" },
      { id: "engineering.transactions", label: "Transactions" },
      { id: "engineering.views", label: "Views, temp tables & triggers" },
    ],
  },
  {
    id: "optimization",
    label: "Query optimization",
    topics: [
      { id: "optimization.indexes", label: "Indexes" },
      { id: "optimization.plans", label: "Query plans & SARGable filters" },
    ],
  },
  {
    id: "warehousing",
    label: "Data warehousing",
    topics: [
      { id: "warehousing.layers", label: "Bronze / Silver / Gold" },
      { id: "warehousing.history", label: "History, SCD & as-of" },
      { id: "warehousing.incremental", label: "Incremental & idempotent loads" },
      { id: "warehousing.reconciliation", label: "Reconciliation & quality gates" },
    ],
  },
];

export const topicLabel: Record<TopicId, string> = Object.fromEntries(
  topicFamilies.flatMap((f) => f.topics.map((t) => [t.id, t.label])),
);

export const familyOf = (topic: TopicId) => topic.split(".")[0];

export const familyLabel: Record<string, string> = Object.fromEntries(
  topicFamilies.map((f) => [f.id, f.label]),
);

export const allTopicIds = new Set(Object.keys(topicLabel));
