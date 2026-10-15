# Six-track review

All six existing track IDs remain stable. Master SQL Joins now places three-table revenue before zero-preserving grouped joins to avoid a downward difficulty step after migration. Prerequisite IDs resolve to retained Learn IDs. SQL from Zero deliberately favors a small schema; other tracks vary domains as the concept requires. No new tracks were created.

## SQL from Zero

Read a table, pick columns, filter rows, handle missing values and sort results with confidence.

| Step | Question | Difficulty | Dataset | Primary concept |
| --- | --- | --- | --- | --- |
| 1 | qb-0001 | warmup | Retail | basics.select |
| 2 | lc-1-0 | warmup | Retail | basics.alias |
| 3 | qb-0002 | warmup | Retail | filtering.where |
| 4 | lc-5-1 | warmup | Retail | filtering.logic |
| 5 | lc-6-0 | warmup | Retail | filtering.like |
| 6 | qb-0004 | warmup | Retail | filtering.null |
| 7 | lc-7-1 | warmup | Retail | filtering.null |
| 8 | qb-0003 | warmup | Retail | basics.order-by |
| 9 | qb-0005 | warmup | Retail | basics.limit |
| 10 | qb-0008 | warmup | Developer Platform | filtering.between |
| 11 | lc-2-0 | warmup | Retail | basics.distinct |
| 12 | qb-0017 | easy | Retail | filtering.like |
| 13 | qb-0018 | easy | Retail | filtering.logic |

## Master SQL Joins

Choose the right join, keep or find unmatched rows, join a table to itself and aggregate across joins without double counting.

| Step | Question | Difficulty | Dataset | Primary concept |
| --- | --- | --- | --- | --- |
| 1 | lc-14-0 | easy | Retail | joins.inner |
| 2 | qb-0015 | easy | Developer Platform | joins.inner |
| 3 | qb-0016 | easy | Developer Platform | joins.left |
| 4 | lc-15-1 | easy | Retail | joins.left |
| 5 | qb-0010 | easy | Retail | joins.anti |
| 6 | lc-34-0 | easy | Developer Platform | joins.self |
| 7 | lc-38-1 | easy | Product / SaaS Analytics | joins.set-ops |
| 8 | lc-16-0 | easy | Retail | joins.multi |
| 9 | lc-15-0 | medium | Retail | joins.left |
| 10 | lc-37-0 | medium | Healthcare | joins.left |
| 11 | qb-0029 | medium | Developer Platform | joins.self |
| 12 | qb-0032 | medium | Retail | joins.fan-out |
| 13 | lc-49-0 | hard | Product / SaaS Analytics | joins.fan-out |
| 14 | qb-0048 | hard | Retail | warehousing.reconciliation |

## SQL Interview Essentials

Solve the classic interview patterns: grouped metrics, HAVING, “never”/“at least” conditions, CTEs, top-N, Nth highest and deduplication.

| Step | Question | Difficulty | Dataset | Primary concept |
| --- | --- | --- | --- | --- |
| 1 | qb-0009 | easy | Retail | aggregation.group-by |
| 2 | qb-0011 | easy | Retail | aggregation.having |
| 3 | qb-0012 | easy | Retail | aggregation.group-by |
| 4 | qb-0021 | easy | Retail | dates.buckets |
| 5 | lc-17-0 | easy | Retail | subqueries.scalar |
| 6 | qb-0014 | easy | Retail | cleaning.strings |
| 7 | lc-18-1 | easy | Retail | subqueries.exists |
| 8 | lc-20-0 | medium | Retail | subqueries.cte |
| 9 | qb-0025 | medium | Retail | subqueries.correlated |
| 10 | qb-0034 | medium | Retail | subqueries.exists |
| 11 | qb-0033 | medium | Retail | aggregation.conditional |
| 12 | qb-0027 | medium | Retail | windows.rank |
| 13 | qb-0040 | medium | Developer Platform | windows.rank |
| 14 | lc-25-0 | medium | Retail | windows.top-n |
| 15 | qb-0037 | medium | Retail | cleaning.dedupe |

## Advanced SQL Challenges

Use window functions and recursive CTEs to answer questions about sequences, gaps, hierarchies and distributions.

| Step | Question | Difficulty | Dataset | Primary concept |
| --- | --- | --- | --- | --- |
| 1 | lc-24-0 | medium | U.S. Flights | windows.lag-lead |
| 2 | lc-23-1 | medium | Finance / Payments | windows.running |
| 3 | qb-0031 | medium | Retail | windows.row-number |
| 4 | lc-53-1 | medium | Product / SaaS Analytics | windows.top-n |
| 5 | qb-0028 | medium | Retail | windows.rolling |
| 6 | qb-0030 | medium | Retail | dates.series |
| 7 | lc-42-1 | hard | Weather | windows.rolling |
| 8 | qb-0042 | hard | Retail | windows.gaps-islands |
| 9 | qb-0045 | hard | Developer Platform | subqueries.recursive |
| 10 | qb-0046 | hard | Retail | analytics.statistics |
| 11 | lc-48-0 | hard | Product / SaaS Analytics | dates.sessions |
| 12 | qb-0047 | hard | Retail | warehousing.history |

## Real-World Data Analytics

Turn business questions into correct metrics: ratios with safe denominators, order-level revenue, funnels, cohorts and reconciled totals.

| Step | Question | Difficulty | Dataset | Primary concept |
| --- | --- | --- | --- | --- |
| 1 | lc-32-0 | medium | Product / SaaS Analytics | analytics.statistics |
| 2 | qb-0035 | medium | Retail | analytics.revenue |
| 3 | qb-0026 | medium | Retail | analytics.revenue |
| 4 | lc-43-0 | medium | Energy | analytics.statistics |
| 5 | qb-0036 | medium | Developer Platform | aggregation.group-by |
| 6 | lc-73-0 | medium | Retail | analytics.segmentation |
| 7 | lc-29-0 | hard | Retail | analytics.segmentation |
| 8 | lc-46-0 | hard | Product / SaaS Analytics | analytics.conversion |
| 9 | lc-52-0 | hard | Product / SaaS Analytics | analytics.conversion |
| 10 | lc-47-0 | hard | Product / SaaS Analytics | analytics.retention |
| 11 | qb-0041 | hard | Retail | analytics.retention |
| 12 | lc-51-1 | hard | Product / SaaS Analytics | analytics.revenue |
| 13 | lc-50-0 | hard | Product / SaaS Analytics | warehousing.reconciliation |

## SQL for Data Engineers

Build and change tables safely, protect data with constraints and transactions, and validate history and loads.

| Step | Question | Difficulty | Dataset | Primary concept |
| --- | --- | --- | --- | --- |
| 1 | lc-58-0 | easy | Logistics | engineering.ddl |
| 2 | qb-0023 | easy | Retail | engineering.ddl |
| 3 | lc-59-0 | easy | Logistics | engineering.dml |
| 4 | qb-0024 | easy | Retail | engineering.dml |
| 5 | lc-60-0 | medium | Logistics | engineering.constraints |
| 6 | lc-61-1 | easy | Logistics | engineering.transactions |
| 7 | qb-0039 | medium | Retail | engineering.views |
| 8 | lc-64-0 | medium | Logistics | engineering.views |
| 9 | qb-0038 | medium | Retail | optimization.indexes |
| 10 | lc-84-0 | medium | Retail | warehousing.incremental |
| 11 | lc-85-0 | medium | Retail | engineering.transactions |
| 12 | lc-83-0 | easy | Retail | warehousing.history |
| 13 | lc-78-0 | medium | Retail | warehousing.history |
| 14 | qb-0044 | hard | Developer Platform | cleaning.validation |
| 15 | qb-0043 | hard | Developer Platform | warehousing.history |
| 16 | lc-70-0 | hard | Retail | warehousing.layers |
| 17 | lc-81-0 | hard | Retail | warehousing.reconciliation |
