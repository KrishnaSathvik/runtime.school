/**
 * Curated practice tracks: ordered selections of existing questions.
 * Tracks reference canonical question ids only — they never copy a question's
 * definition, grading or progress. Rules (enforced by tests/tracks.test.ts):
 * every id exists and is practice-eligible; no repeats within a track; difficulty rises at most one level per step;
 * easier consolidation steps need an explicit rationale; neighbouring questions never share
 * a reasoning pattern; each track spans at least three topics.
 *
 * Ordering follows the Learn `courseOrder` for foundational concepts (e.g. WHERE before DISTINCT).
 */
export type Track = {
  id: string;
  title: string;
  /** One line shown in the track list. */
  summary: string;
  /** What the learner can do after finishing. */
  objective: string;
  /** Who it is for / what to know first. */
  startingPoint: string;
  skills: string[];
  questionIds: string[];
  /** Intentional easier steps, keyed by question id with a teaching rationale. */
  consolidation?: Record<string, string>;
  /** Editorial section title keyed by the first question id in that section. */
  sections?: Record<string, string>;
};

export const tracks: Track[] = [
  {
    id: "sql-from-zero",
    title: "SQL from Zero",
    summary: "SELECT, WHERE, sorting, NULLs and the first traps.",
    objective: "Read a table, pick columns, filter rows, handle missing values and sort results with confidence.",
    startingPoint: "No joins required. Every question uses one table.",
    skills: ["SELECT & aliases", "WHERE, AND/OR, LIKE", "NULL", "ORDER BY & LIMIT", "DISTINCT", "date ranges"],
    sections: {
      "qb-0001": "Read and shape rows",
      "qb-0002": "Filter with conditions",
      "qb-0004": "Missing values",
      "qb-0003": "Sort and limit",
      "lc-2-0": "Unique values",
      "qb-0017": "Richer filters",
    },
    questionIds: [
      "qb-0001", // select columns
      "lc-1-0", // calculated column + alias
      "qb-0002", // WHERE equality (before DISTINCT)
      "lc-5-1", // AND + OR
      "lc-6-0", // LIKE prefix
      "qb-0004", // IS NULL
      "lc-7-1", // COALESCE a missing value
      "qb-0003", // ORDER BY with tie-breaker
      "qb-0005", // ORDER BY + LIMIT
      "qb-0008", // inclusive date range
      "lc-2-0", // DISTINCT after filter/sort foundations
      "qb-0017", // LIKE anywhere, case
      "qb-0018", // IN + BETWEEN, precedence trap
    ],
  },
  {
    id: "master-joins",
    title: "Master SQL Joins",
    summary: "INNER, LEFT, self joins, anti-joins and fan-out.",
    objective: "Choose the right join, keep or find unmatched rows, join a table to itself and aggregate across joins without double counting.",
    startingPoint: "Comfortable with SELECT, WHERE and GROUP BY.",
    skills: ["INNER JOIN", "LEFT JOIN & COALESCE", "anti-joins", "self joins", "set operations", "fan-out at two and three grains"],
    sections: {
      "lc-14-0": "Match related rows",
      "qb-0016": "Keep unmatched rows",
      "lc-34-0": "Self-joins and set logic",
      "lc-15-0": "Join filters and multi-table grain",
      "qb-0032": "Fan-out and reconciliation",
    },
    questionIds: [
      "lc-14-0", // inner join
      "qb-0015", // inner join, aliasing same-named columns
      "qb-0016", // left join + label
      "lc-15-1", // anti-join (customers without orders)
      "qb-0010", // anti-join on a line table
      "lc-34-0", // self join (referrer)
      "lc-38-1", // EXCEPT
      "lc-15-0", // left join with zero counts
      "lc-37-0", // ON vs WHERE in a left join
      "lc-16-0", // three tables + revenue
      "qb-0029", // self join across roles
      "qb-0032", // two child grains, missing payments
      "lc-49-0", // multi-grain fan-out
      "qb-0048", // three child grains
    ],
  },
  {
    id: "interview-essentials",
    title: "SQL Interview Essentials",
    summary: "Aggregation, subqueries, CTEs and ranking.",
    objective: "Solve the classic interview patterns: grouped metrics, HAVING, “never”/“at least” conditions, CTEs, top-N, Nth highest and deduplication.",
    startingPoint: "Know SELECT, WHERE and basic JOINs.",
    skills: ["GROUP BY & HAVING", "subqueries & EXISTS", "CTEs", "conditional aggregation", "RANK / DENSE_RANK", "deduplication"],
    sections: {
      "qb-0009": "Group and filter aggregates",
      "lc-17-0": "Subqueries and existence",
      "lc-20-0": "CTEs and correlated logic",
      "qb-0033": "Conditional metrics and ranking",
      "lc-25-0": "Latest row and deduplication",
    },
    questionIds: [
      "qb-0009", // group by count
      "qb-0011", // having
      "qb-0012", // revenue by category across joins (foundational agg+join)
      "qb-0021", // distinct count per month
      "lc-17-0", // scalar subquery vs average
      "qb-0014", // normalised duplicates
      "lc-18-1", // NOT EXISTS
      "lc-20-0", // CTE + filter on aggregate
      "qb-0025", // correlated comparison with own group
      "qb-0034", // “at least two” and “never”
      "qb-0033", // pivot with conditional aggregation
      "qb-0027", // dense rank within groups
      "qb-0040", // second-highest distinct value
      "lc-25-0", // latest row per group
      "qb-0037", // keep one row per cleaned key
    ],
  },
  {
    id: "advanced-challenges",
    title: "Advanced SQL Challenges",
    summary: "Window functions, date series, streaks, recursion and medians.",
    objective: "Use window functions and recursive CTEs to answer questions about sequences, gaps, hierarchies and distributions.",
    startingPoint: "Solid with CTEs and GROUP BY; seen ROW_NUMBER once.",
    skills: ["LAG / LEAD", "running & rolling windows", "top-N with ties", "date series", "gaps & islands", "recursive CTEs", "medians", "sessions & history builds"],
    sections: {
      "lc-24-0": "Compare and accumulate rows",
      "qb-0031": "Numbering and top-N",
      "qb-0028": "Rolling windows and calendars",
      "qb-0042": "Streaks, recursion and distributions",
      "lc-48-0": "Sessions and history builds",
    },
    questionIds: [
      "lc-24-0", // LAG per customer
      "lc-23-1", // running total per customer
      "qb-0031", // first vs latest order
      "lc-53-1", // top per group with ties
      "qb-0028", // calendar rolling window
      "qb-0030", // generate a date series
      "lc-42-1", // rolling average over a completed calendar
      "qb-0042", // longest streak (gaps & islands)
      "qb-0045", // recursive hierarchy
      "qb-0046", // median without MEDIAN()
      "lc-48-0", // sessionize events
      "qb-0047", // build history from snapshots
    ],
  },
  {
    id: "real-world-analytics",
    title: "Real-World Data Analytics",
    summary: "Revenue, shares, funnels, cohorts and reconciliation.",
    objective: "Turn business questions into correct metrics: ratios with safe denominators, order-level revenue, funnels, cohorts and reconciled totals.",
    startingPoint: "Comfortable with joins, GROUP BY and CTEs.",
    skills: ["ratios & NULLIF", "average order value", "net revenue", "share of total", "funnels", "experiments", "cohorts", "reconciliation"],
    sections: {
      "lc-32-0": "Safe rates and revenue grain",
      "lc-43-0": "Shares and reporting contracts",
      "lc-46-0": "Funnels, experiments and retention",
      "lc-51-1": "Margin and reconciliation",
    },
    questionIds: [
      "lc-32-0", // success rate
      "qb-0035", // average order value at the right grain
      "qb-0026", // net revenue after refunds
      "lc-43-0", // share of total with windows
      "qb-0036", // payroll vs budget
      "lc-73-0", // reporting contract (medium, before harder product analytics)
      "lc-29-0", // revenue ranking capstone
      "lc-46-0", // ordered funnel
      "lc-52-0", // experiment denominators
      "lc-47-0", // exact-day retention
      "qb-0041", // monthly cohort retention
      "lc-51-1", // contribution margin
      "lc-50-0", // invoice reconciliation
    ],
  },
  {
    id: "data-engineering",
    title: "SQL for Data Engineers",
    summary: "Constraints, transactions, views, history, loads and quality checks.",
    objective: "Build and change tables safely, protect data with constraints and transactions, and validate history and loads.",
    startingPoint: "Know SELECT and JOIN; no database administration needed. Every run uses a throwaway database.",
    skills: ["CREATE & keys", "INSERT/UPDATE/DELETE", "constraints", "transactions & savepoints", "views & triggers", "indexes", "UPSERT", "history validation", "quality gates"],
    sections: {
      "lc-58-0": "Create and change data",
      "lc-60-0": "Protect writes",
      "qb-0039": "Views, triggers and indexes",
      "lc-84-0": "Incremental loads",
      "lc-83-0": "History, Silver and quality gates",
    },
    consolidation: {
      "lc-61-1": "Revisit savepoint recovery after you have practiced constraints that block bad writes.",
      "lc-83-0": "Pause on latest-state reporting before deeper history-interval work.",
    },
    questionIds: [
      "lc-58-0", // create & alter
      "qb-0023", // composite key + NOT NULL
      "lc-59-0", // insert/update/delete
      "qb-0024", // targeted update/delete
      "lc-60-0", // constraints that block bad writes
      "lc-61-1", // savepoint recovery (after constraints)
      "qb-0039", // view with correct grain
      "lc-64-0", // audit trigger
      "qb-0038", // covering index
      "lc-84-0", // idempotent upsert
      "lc-85-0", // atomic promotion
      "lc-83-0", // current rows in history (consolidation before interval/as-of work)
      "lc-78-0", // validity intervals with LEAD
      "qb-0044", // overlapping periods
      "qb-0043", // as-of lookup
      "lc-70-0", // silver cleaning
      "lc-81-0", // automated quality tests
    ],
  },
];

export const trackById = new Map(tracks.map((t) => [t.id, t]));
