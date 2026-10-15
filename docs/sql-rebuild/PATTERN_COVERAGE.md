# Pattern coverage review

Canonical exercises and exact prompts are in the generated question manifest. `lc-X-*` means the two challenges in lesson X. The following maps the requested reasoning families to executable evidence, including the new shared-library transfer problems.

| Family | Representative evidence |
|---|---|
| Simple filtering | lc-3-*, lc-4-* |
| Sorting, LIMIT, Nth values | lc-8-*, lc-21-*, lc-25-* |
| Aggregation and HAVING | lc-9-*, lc-10-*, lc-11-* |
| Inner and outer joins | lc-14-*, lc-15-*, lc-36-* |
| Anti-joins and EXISTS | lc-18-*, qb-0093 |
| Self joins and hierarchies | lc-34-*, lc-27-1, qb-0097 |
| Cross joins and missing sequences | lc-35-*, qb-0090 |
| Conditional logic and aggregation | lc-12-*, lc-13-* |
| Percentages, safe rates, NULL | lc-7-*, lc-31-*, lc-32-*, qb-0102, qb-0106 |
| Scalar/correlated subqueries | lc-17-*, lc-18-*, qb-0096 |
| CTEs and recursion | lc-20-*, lc-27-*, qb-0097, qb-0103 |
| Ranking, Top-N and ties | lc-21-*, lc-22-*, lc-25-*, lc-53-* |
| First/latest events and frames | lc-25-*, lc-40-*, lc-41-*, qb-0099 |
| Deduplication | lc-44-*, qb-0112 |
| LAG/LEAD | lc-24-* (scheduled versus operated flights), lc-40-* |
| Running and rolling totals | lc-23-*, lc-42-*, lc-74-* |
| Dates and exact boundaries | lc-39-*, lc-67-*, qb-0104 |
| Consecutive events, gaps and islands | lc-48-*, qb-0053–0057, qb-0100 |
| Interval validity/overlaps | lc-78-*, lc-83-1, lc-86-1 |
| Interval merging, including nesting | qb-0100 |
| Retention and cohorts | lc-47-*, product-activation-review |
| Pivot and unpivot | qb-0089, qb-0095 |
| Median and percentiles | qb-0046 median (odd/even groups); qb-0069 checkout p90 |
| Histograms | qb-0098 |
| Relational division | qb-0062, qb-0093 |
| Graph-like SQL | qb-0094 (directed review edges), qb-0097 (transitive manager paths) |
| Fill-forward / last-known state | qb-0096 |
| Event state | qb-0099; logistics Lab |
| Capacity/allocation | qb-0084–0088 |
| Strings and validation | lc-33-*, lc-79-*, qb-0064–0066 |
| Set operations | lc-19-*, lc-38-*, qb-0095, qb-0105 |
| DML, constraints and recovery | lc-58–65, lc-82–85; Dataset Lab staging/rollback scripts |
| Reconciliation and multi-grain joins | lc-49-*, lc-50-*, qb-0091–0092, qb-0111; grid-balance-review |
| Query optimization | lc-28-*, lc-66–68, qb-0049–0052; two flagship plan comparisons |

The new bank has 12 authored Write tasks plus six new tasks in each reasoning mode. Prediction rows remain small enough to infer from visible samples. Larger editions serve exploration and investigation; bigger row counts alone do not make an exercise better.

Remaining limits are explicit: recursive exercises assume an acyclic manager graph; interval merging excludes open incidents; synthetic flight timestamps are UTC; no geographic extension, distributed SQL, causal inference grader or universal optimizer score is implied.
