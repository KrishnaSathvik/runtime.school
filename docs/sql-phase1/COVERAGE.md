# Learn + Practice coverage

L denotes a retained lesson ID; Q denotes the numbered standalone question (`Q29` = `qb-0029`). Coverage means an executable task or an explicit concept check, not merely a keyword. The full per-question primary/secondary topic matrix is generated in `docs/question-bank/TOPIC_COVERAGE.md`.

| Area | Learn | Independent Practice / transfer |
| --- | --- | --- |
| SELECT, aliases, calculated expressions | L0–1 | Q1, Q6 |
| DISTINCT | L2 | Q7, Q21 |
| WHERE, comparisons, IN, BETWEEN, LIKE | L3–6 | Q2, Q8, Q13, Q17–18 |
| Boolean precedence | L5 | Q18, Q106 Predict |
| NULL and three-valued logic | L7, L31 | Q4, Q73 Predict, Q78 Debug, Q106 Predict |
| ORDER BY, LIMIT, deterministic ties | L8 | Q3, Q5, Q52 |
| CASE and classification | L12 | Q20, Q98 |
| COUNT / SUM / AVG / MIN / MAX | L9–10, L30 | Q9, Q19, Q74 Predict |
| GROUP BY and result grain | L10, L55 | Q9, Q19, Q36 |
| HAVING | L11 | Q11, Q14 |
| Conditional aggregation / SQLite pivot | L13 | Q33, Q89 |
| Distinct counts | L39, L45 | Q21, Q94 |
| INNER and multi-table joins | L14, L16 | Q12, Q15 |
| LEFT, no-match and zero groups | L15, L37 | Q16, Q72 Predict, Q79–80 Debug, Q110 Debug |
| FULL OUTER and orphan rows | L36 | Q48 reconciliation; full join itself remains a Learn task |
| Anti joins / NOT EXISTS | L15, L18, L31 | Q10, Q30, Q34 |
| Self joins and role aliases | L34 | Q29 (manager plus correlated benchmark), Q61, Q114 |
| CROSS JOIN / complete populations | L35, L42 | Q30, Q90, Q96 |
| Cardinality / fan-out | L49, L86 | Q32, Q48, Q63, Q87, Q111 Debug |
| UNION / UNION ALL / INTERSECT / EXCEPT | L19, L38 | Q95, Q105 Predict |
| Temporal / range joins | L78, L83 | Q43, Q44 |
| Scalar and correlated subqueries | L17 | Q25, Q29, Q96 |
| EXISTS / NOT EXISTS / relational division | L18 | Q34, Q62, Q93 |
| CTE decomposition | L20 | Q31, Q41, Q48 |
| Recursive CTEs and hierarchy variants | L27 | Q45, Q97, Q103 Predict |
| ROW_NUMBER / first / latest / dedupe | L21, L25, L44 | Q31, Q37, Q55, Q99 |
| RANK / DENSE_RANK and ties | L22, L53 | Q27, Q40, Q75 Predict, Q81 Debug |
| NTILE / balanced buckets | L57 | L57 challenges are independently available; histogram bands in Q98 |
| LAG / LEAD | L24, L40, L78 | Q47, Q56, Q77 Predict |
| FIRST_VALUE / LAST_VALUE / frames | L41 | Q76 Predict, Q83 Debug |
| Running totals | L23, L74 | Q76 Predict, Q92 ledger balance |
| Rolling observations versus calendar windows | L42 | Q28, Q96 fill-forward |
| Top N per group | L25, L53 | Q27, Q40 |
| Date filtering and boundaries | L39 | Q8, Q13, Q18, Q82 Debug |
| Date differences / midnight | L40 | Q22, Q104 Predict |
| Date bucketing | L26, L39, L74 | Q21, Q26, Q41 |
| Missing dates / date sequences | L35, L42 | Q28, Q30, Q96 |
| String normalization / extraction | L33 | Q14, Q64–65 |
| COALESCE / NULLIF | L7, L32 | Q16, Q36, Q92 |
| Conversion versus validation | L56, L79 | Q64, Q66 |
| Event deduplication | L44 | Q55, Q56, Q112 Debug |
| Cohorts / retention / observation maturity | L47 | Q41, Q70 |
| Funnels / conversion ordering | L46, L52 | Q53–54, Q57, Q68 |
| Sessionization | L48 | Q56, Q67, Q70 |
| Medians and tail distributions | Concept introduced by independent task | Q46 median, Q69 p90 |
| Ratios / shares / safe denominators | L32, L43 | Q36, Q63, Q101 Predict, Q107–109 Debug |
| Consecutive events / gaps and islands | L48 session boundary foundation | Q42 daily streaks, Q47 history runs, Q113 timed sensor runs |
| Interval overlap | L78 interval foundation | Q44 |
| Interval merging / nested and touching intervals | CTE/window prerequisites L20, L21 | Q100 |
| Fill-forward | L41 and L42 prerequisites | Q96 (no future borrowing) |
| Histogram / distributions | L12, L57 | Q20, Q98 |
| Symmetric relationships / graph-like pairs | L34 | Q61 unordered co-purchases; Q114 reciprocal directed games |
| SQLite unpivot | L19 set/bag prerequisites | Q95 UNION ALL measures |
| DDL / schema inspection | L54, L58 | Q23 |
| DML / resulting state | L59 | Q24, Q58 |
| Constraints / NULL / write failure | L60 | Q23, Q59 |
| Transactions / savepoints / recovery | L61, L85 | Q60 |
| Views / TEMP / CTAS / triggers | L62–64 | Q39; lesson challenges validate object/state behavior |
| Indexes and actual query plans | L28, L66–68 | Q38, Q49–52 |
| Reconciliation / multiple child grains | L50, L76, L80 | Q32, Q48, Q87–88, Q92 |
| History / SCD / as-of intervals | L78, L83, L86 | Q43–44, Q47 |
| Idempotency / stale events / durable keys | L82, L84 | Q58 |
| Data-quality logic / quarantine / gates | L69–71, L79–81, L87 | Q59, Q64–66 |

Only two new questions were needed after the preceding expansion: Q113 provides richer timed islands with missing observations; Q114 covers reciprocal relationships rather than simple co-occurrence. Existing Q89/Q95 already cover SQLite-compatible pivot/unpivot, Q96 fill-forward, Q100 interval merging, Q97 hierarchy variants and Q62/Q93 relational division.

Native SQL Server procedures and physical partition elimination remain explicitly non-executable reference concepts (L65/L68). This phase does not pretend SQLite implements them. The exercise engine compares semantic output and, for engineering tasks, resulting state/catalog behavior; it does not demand exact reference SQL text. Required-construct checks remain only where the exercise explicitly teaches that construct.
