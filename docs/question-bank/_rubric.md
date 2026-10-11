## Four learner-facing levels

| Level | Purpose | Typical shape |
| --- | --- | --- |
| **Warm-up** | Learn one basic SQL action | One table, one construct, minimal reasoning (SELECT columns, one filter, IS NULL, one sort, LIMIT, an alias) |
| **Easy** | Apply familiar features correctly | One or two connected ideas: WHERE with AND/OR/IN/BETWEEN/LIKE, DISTINCT, COUNT/SUM/AVG, simple GROUP BY/HAVING, one JOIN, a basic CASE, date filters — often with one deliberate trap |
| **Medium** | Combine skills to solve a data problem | Multiple joins with aggregation, HAVING, CTEs, (correlated) subqueries, EXISTS, conditional aggregation, window functions, deduplication, date series, avoiding fan-out |
| **Hard** | Multi-step reasoning with difficult edge cases | Gaps and islands, cohorts, as-of history, interval validation, recursive hierarchies, medians, multi-source reconciliation, SCD builds |

Topic and difficulty are independent: a JOIN can be Easy (connect two tables), Medium (aggregate while avoiding fan-out) or Hard (as-of history). Module position never decides difficulty.

## Rubric (src/content/question-bank/rubric.ts)

Scores what the **reference solution must actually do**, not its length:

| Feature | Points |
| --- | --- |
| Each table beyond the first (max 3) | +1 |
| Any JOIN / LEFT JOIN / self join / CROSS-FULL | +1 / +0.5 / +1 / +0.5 |
| Aggregate / GROUP BY / HAVING / conditional aggregate / COUNT(DISTINCT) | +1 / +0.5 / +1 / +1 / +0.5 |
| Each subquery (max 2) / EXISTS | +1 / +0.5 |
| Each CTE (max 3 pts) / RECURSIVE | +0.75 / +2 |
| Window function (first / each extra, max +1) / PARTITION / frame / LAG-LEAD | +2 / +0.5 / +0.5 / +1 / +0.5 |
| CASE · date functions · string functions · COALESCE/NULLIF · set operations | +0.5 each (set ops +1) |
| CREATE/ALTER · INSERT/UPDATE/DELETE (max 1) · VIEW/INDEX · TRIGGER · TRANSACTION · UPSERT | +1 · +0.5 each · +0.5 · +1.5 · +1.5 · +1 |
| Each object/constraint validator (max 2) | +1 |

Thresholds: **< 1 and a single-construct, single-table query → Warm-up; < 3 → Easy; < 6 → Medium; ≥ 6 → Hard.**

The rubric is a first pass. A reviewer then checks each question against the qualitative criteria — independent concepts, prerequisites, tables and relationships, reasoning steps, NULLs/duplicates/ties/missing records, required advanced features, meaningful edge cases — and records every override with a reason. The rubric over-counts stacked syntax and cannot see edge-case reasoning; both directions of error are listed below.
