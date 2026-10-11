# Practice platform research

**Purpose:** borrow the *structure* of established SQL practice platforms, not their content. No problem statements, datasets, solutions or editorials were copied; every SQL Studio question, dataset and requirement is original.

## Sources and limitations

| Source | What it gave | Access |
| --- | --- | --- |
| leetcode.com/studyplan/top-sql-50, /studyplan/premium-sql-50, /problem-list/database | — | **Blocked**: automated requests returned HTTP 403. Nothing was scraped, and no gated or premium content was accessed. |
| Public GitHub repositories that index the SQL 50 plan (e.g. Karthik-S-R/Leetcode-SQL-50, ArpanSurin/SQL-50, Camio1945/leetcode-study-plan-top-sql-50) | Study-plan **section names** only: Select · Basic Joins · Basic Aggregate Functions · Sorting and Grouping · Advanced Select and Joins · Subqueries · Advanced String Functions / Regex / Clause | Public; read for structure only |
| Public articles on LeetCode SQL practice (e.g. filipchabik.ghost.is/leetcode-sql) and LeetCode's own support article on test cases | Problem-page anatomy: input table schemas, task, example input/output, constraints, editable test cases, submission feedback | Public |
| General SQL assessment practice (interview question patterns, Bloom-style progression), the existing 176 SQL Studio challenges, and the brief | Difficulty criteria, topic taxonomy, gap analysis | — |

Because the primary pages were unavailable, the observations below describe widely documented platform conventions rather than a first-hand inspection of current LeetCode pages.

## Patterns worth adopting

| Pattern | Why it works | SQL Studio implementation |
| --- | --- | --- |
| **Independent problem list** separate from courses | Learners can practise by need, not only in sequence | `/practice` hub; lesson mastery is untouched |
| **Difficulty label on every problem** | Sets expectations; lets learners choose a challenge level | Four levels: Warm-up, Easy, Medium, Hard. Rubric plus review, with every reason recorded |
| **Topic tags** (one primary, several secondary) | Practice by skill; find weak areas | Canonical ids in 12 families (`joins.self`, `windows.gaps-islands` …) |
| **Study-plan style progression** (sections from basics to advanced) | A path through the bank | "Learning path" sort places each problem after its prerequisite lessons |
| **Problem page anatomy:** schema, task, exact output, examples, constraints | Removes guessing about what to return | Task, rules (ties, NULLs, boundaries, rounding), required columns, row-order note, example output, full table schemas with keys, live row preview |
| **Status per problem** (solved / attempted) and filter to unsolved | Shows progress; supports "what's next" | Not attempted / Attempted / Solved with help / Solved, plus a "Not solved yet" filter |
| **Run vs Submit** | Exploring shouldn't count as an attempt | Run query vs Check answer (only checks are recorded) |
| **Hidden test cases** beyond the visible example | Prevents hard-coding the example | Every check reruns on a changed-data fixture; tests prove hard-coding fails for all 48 problems |
| **Wrong-answer feedback** | Learners need to know *what* is wrong | Deterministic explanations: wrong columns/order, too many/few rows with duplicate detection, rounding, ordering, changed data, missing objects |

## Patterns deliberately not adopted

| Pattern | Reason |
| --- | --- |
| Acceptance rate, global leaderboards, company tags, premium locks | Local, single-user product: no server, no accounts, no paywall |
| Multiple SQL dialects per problem (MySQL / PostgreSQL / Pandas) | The runtime is SQLite. Compare SQL Syntax covers dialect differences as reference |
| Runtime/memory percentile rankings | Tiny datasets make timings meaningless; optimization questions check index structure and plans |
| Discussion threads and community solutions | No backend; one curated solution plus an explanation is shown on request (marks the attempt guided) |
| Separate tiny input per test case | SQL Studio uses one realistic dataset per domain plus a changed-data fixture, so questions on the same data build intuition about it |
| Dense dashboard tiles and cards | Keeps the Editorial IDE direction: index rows, quiet metadata, essential task information visible by default |

## Concepts commonly assessed (used for the taxonomy and gap analysis)

- **Beginner:** column selection and aliases, WHERE with AND/OR/IN/BETWEEN/LIKE, NULL tests, ORDER BY/LIMIT, DISTINCT, COUNT/SUM/AVG, GROUP BY/HAVING, inner and left joins, CASE, basic date filters.
- **Intermediate:** multi-table aggregation without fan-out, anti-joins, self-joins, (correlated) subqueries and EXISTS, CTEs, conditional aggregation, ROW_NUMBER/RANK/DENSE_RANK, LAG/LEAD, running and rolling windows, Nth-highest per group, deduplication, date series and missing dates.
- **Advanced:** gaps and islands, sessionization, cohort retention, funnels, medians and percentiles, recursive hierarchies, as-of history joins, SCD builds, interval overlap validation, multi-source reconciliation, idempotent loads and transactions.

The SQL 50 section order (select → joins → aggregation → sorting/grouping → advanced select/joins → subqueries → strings) matches SQL Studio's first five curriculum modules. The bank's main additions are therefore beyond those sections: hierarchy, history, gaps-and-islands, medians and engineering on new data.
