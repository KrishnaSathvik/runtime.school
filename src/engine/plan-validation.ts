/** Opt-in contracts for the bundled SQLite runtime, never a performance score. */
export type PlanValidation = {
  indexes: Array<{
    /** Logical identifier used by access assertions; learner index names are unrestricted. */
    id: string;
    table: string;
    /** Exact ordered key columns of a full, ordinary B-tree index. */
    columns: string[];
    unique?: boolean;
  }>;
  /** Only specify an access strategy when the task explicitly requires it. */
  access?: Array<{
    index: string;
    strategy: "search" | "covering-search" | "index-scan";
  }>;
  noTempSort?: boolean;
  /** Strict whole-plan rule: rejects unindexed SCAN nodes, including CTE scans. */
  noFullScans?: boolean;
};
