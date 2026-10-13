# Current to proposed course order

This is a recommendation. `courseOrder` in `src/content/content-pack.json` is unchanged.

Related notes: [LEARNING_SEQUENCE_AUDIT.md](LEARNING_SEQUENCE_AUDIT.md), [PREREQUISITE_MAP.md](PREREQUISITE_MAP.md), [PLACEMENT_AND_PROGRESS_IMPACT.md](PLACEMENT_AND_PROGRESS_IMPACT.md), [SEQUENCE_IMPLEMENTATION_PLAN.md](SEQUENCE_IMPLEMENTATION_PLAN.md).

Module ids in the proposed column are the existing module ids. The implementation plan also renames the labels of modules 1 and 3. Those renames are not shown in this table.

Positions are 1-based places in `courseOrder`. Lesson ids stay the ids they are today. A shifted position means other lessons moved ahead of this one. A relocated lesson is one of seven lessons whose own place in the path changes.

The unrelocated sequence is identical before and after the seven moves. From lesson 58 through lesson 87, the order is identical to today, including performance, warehouse, and integration lessons.

INNER JOIN (14) stays immediately before LEFT JOIN (15), so the current all-pass placement successor remains lesson 15.

## Recommended sequence

| Pos | ID | Title | Proposed module |
| ---: | ---: | --- | --- |
| 1 | 0 | Meet your first SELECT | 0 SQL foundations |
| 2 | 1 | Aliases & calculated columns | 0 SQL foundations |
| 3 | 3 | Filter with WHERE | 1 Filtering & unique values |
| 4 | 4 | Comparisons & ranges | 1 Filtering & unique values |
| 5 | 5 | Combine conditions | 1 Filtering & unique values |
| 6 | 6 | Lists & text patterns | 1 Filtering & unique values |
| 7 | 7 | Understand NULL | 1 Filtering & unique values |
| 8 | 8 | Sort & limit | 1 Filtering & unique values |
| 9 | 2 | Unique values with DISTINCT | 2 Calculations & data quality |
| 10 | 9 | COUNT, SUM & AVG | 2 Calculations & data quality |
| 11 | 10 | Group into summaries | 2 Calculations & data quality |
| 12 | 30 | MIN, MAX & the grain of a result | 2 Calculations & data quality |
| 13 | 11 | Filter groups with HAVING | 2 Calculations & data quality |
| 14 | 12 | Make decisions with CASE | 2 Calculations & data quality |
| 15 | 13 | Conditional aggregation | 2 Calculations & data quality |
| 16 | 56 | CAST, text types & NULL arithmetic | 2 Calculations & data quality |
| 17 | 54 | Databases, schemas, tables & keys | 3 Joins & aggregation |
| 18 | 14 | Connect tables with JOIN | 3 Joins & aggregation |
| 19 | 15 | Keep unmatched rows | 3 Joins & aggregation |
| 20 | 32 | Ratios, ROUND & NULLIF | 3 Joins & aggregation |
| 21 | 16 | Revenue across tables | 3 Joins & aggregation |
| 22 | 34 | Self-joins & referral relationships | 3 Joins & aggregation |
| 23 | 35 | CROSS JOIN & a complete date grid | 3 Joins & aggregation |
| 24 | 36 | FULL OUTER JOIN & unmatched records | 3 Joins & aggregation |
| 25 | 37 | ON versus WHERE in a LEFT JOIN | 3 Joins & aggregation |
| 26 | 19 | Combine sets with UNION | 3 Joins & aggregation |
| 27 | 38 | INTERSECT & EXCEPT | 3 Joins & aggregation |
| 28 | 17 | Subqueries | 4 Dates, strings & subqueries |
| 29 | 18 | Ask whether a row exists | 4 Dates, strings & subqueries |
| 30 | 31 | NOT IN and the NULL trap | 4 Dates, strings & subqueries |
| 31 | 20 | Readable queries with CTEs | 4 Dates, strings & subqueries |
| 32 | 26 | Dates & monthly analysis | 4 Dates, strings & subqueries |
| 33 | 33 | Clean strings & cast values | 4 Dates, strings & subqueries |
| 34 | 39 | Date boundaries & monthly buckets | 4 Dates, strings & subqueries |
| 35 | 21 | Window functions: ROW_NUMBER | 5 Window functions |
| 36 | 22 | RANK & DENSE_RANK | 5 Window functions |
| 37 | 23 | Running totals | 5 Window functions |
| 38 | 55 | Logical query processing & row grain | 5 Window functions |
| 39 | 24 | Compare rows with LAG | 5 Window functions |
| 40 | 25 | Latest row per group | 5 Window functions |
| 41 | 40 | LEAD & the next event | 5 Window functions |
| 42 | 41 | FIRST_VALUE, LAST_VALUE & frames | 5 Window functions |
| 43 | 42 | Rolling averages & missing dates | 5 Window functions |
| 44 | 43 | Share of total with windows | 5 Window functions |
| 45 | 53 | Top N per group & ties | 5 Window functions |
| 46 | 57 | NTILE & balanced ranking buckets | 5 Window functions |
| 47 | 27 | Recursive CTEs | 6 Advanced product analysis |
| 48 | 28 | Query plans & indexes | 6 Advanced product analysis |
| 49 | 29 | Capstone: customer insights | 6 Advanced product analysis |
| 50 | 44 | Deduplicate event retries | 6 Advanced product analysis |
| 51 | 45 | Daily active users & engagement | 6 Advanced product analysis |
| 52 | 46 | Ordered conversion funnels | 6 Advanced product analysis |
| 53 | 47 | Cohorts & exact-day retention | 6 Advanced product analysis |
| 54 | 48 | Sessionize an event stream | 6 Advanced product analysis |
| 55 | 49 | Multi-grain joins without fan-out | 6 Advanced product analysis |
| 56 | 50 | Revenue & payment reconciliation | 6 Advanced product analysis |
| 57 | 51 | AI usage cost & contribution margin | 6 Advanced product analysis |
| 58 | 52 | Experiment conversion denominators | 6 Advanced product analysis |
| 59 | 58 | DDL: create, alter & inspect a table | 7 Database engineering |
| 60 | 59 | DML: INSERT, UPDATE & DELETE | 7 Database engineering |
| 61 | 60 | Constraints protect the data contract | 7 Database engineering |
| 62 | 61 | Transactions & savepoint recovery | 7 Database engineering |
| 63 | 62 | Views: reusable query definitions | 7 Database engineering |
| 64 | 63 | CTEs, CTAS & temporary tables | 7 Database engineering |
| 65 | 64 | Triggers & visible audit effects | 7 Database engineering |
| 66 | 65 | Stored procedures: parameters & contracts | 7 Database engineering |
| 67 | 66 | Indexes: observe a real access path | 8 Performance & query plans |
| 68 | 67 | SARGable ranges, not speed commandments | 8 Performance & query plans |
| 69 | 68 | Partitioning & workload trade-offs | 8 Performance & query plans |
| 70 | 75 | Review AI-generated SQL with evidence | 8 Performance & query plans |
| 71 | 69 | Bronze: inspect raw data before cleaning | 9 Warehouse & reporting projects |
| 72 | 70 | Silver: clean, map & deduplicate | 9 Warehouse & reporting projects |
| 73 | 71 | Gold: dimensions, facts & quality gates | 9 Warehouse & reporting projects |
| 74 | 72 | EDA: explore before telling the story | 9 Warehouse & reporting projects |
| 75 | 73 | Customer & product reporting contracts | 9 Warehouse & reporting projects |
| 76 | 74 | Monthly change & cumulative reports | 9 Warehouse & reporting projects |
| 77 | 76 | Reconcile extraction & Bronze ingestion | 9 Warehouse & reporting projects |
| 78 | 77 | Integrate CRM + ERP with source authority | 9 Warehouse & reporting projects |
| 79 | 78 | Product validity with LEAD & half-open intervals | 9 Warehouse & reporting projects |
| 80 | 79 | Validate calendar dates before converting | 9 Warehouse & reporting projects |
| 81 | 80 | Quarantine bad rows & reconcile the batch | 9 Warehouse & reporting projects |
| 82 | 81 | Automated star-schema quality tests | 9 Warehouse & reporting projects |
| 83 | 82 | Durable surrogate keys across loads | 9 Warehouse & reporting projects |
| 84 | 83 | Latest-state reporting versus SCD Type 2 | 9 Warehouse & reporting projects |
| 85 | 84 | Idempotent incremental UPSERT & stale updates | 9 Warehouse & reporting projects |
| 86 | 85 | Stage, validate & atomically promote a refresh | 9 Warehouse & reporting projects |
| 87 | 86 | Protect fact grain when joining versions | 9 Warehouse & reporting projects |
| 88 | 87 | Capstone: integrated customers to trusted sales | 9 Warehouse & reporting projects |

## Mapping for every lesson

| ID | Title | Old position | Proposed position | Module now | Proposed module | Change | Justification |
| ---: | --- | ---: | ---: | --- | --- | --- | --- |
| 0 | Meet your first SELECT | 1 | 1 | 0 SQL foundations | 0 SQL foundations | Unchanged | Same course position, same module, same exercises. |
| 1 | Aliases & calculated columns | 2 | 2 | 0 SQL foundations | 0 SQL foundations | Unchanged | Same course position, same module, same exercises. |
| 2 | Unique values with DISTINCT | 3 | 9 | 0 SQL foundations | 2 Calculations & data quality | Relocated | Relocated from course position 3 to just after ORDER BY. Both challenges are single-table DISTINCT, and the concept check asks what DISTINCT returns. It is a summary, so it belongs with COUNT and GROUP BY, after learners can filter. |
| 3 | Filter with WHERE | 6 | 3 | 1 Filtering & unique values | 1 Filtering & unique values | Shift only | Not relocated. Its neighbors among lessons that stay put are unchanged. The position number moves because lessons ahead of it are reordered. |
| 4 | Comparisons & ranges | 7 | 4 | 1 Filtering & unique values | 1 Filtering & unique values | Shift only | Not relocated. Its neighbors among lessons that stay put are unchanged. The position number moves because lessons ahead of it are reordered. |
| 5 | Combine conditions | 8 | 5 | 1 Filtering & unique values | 1 Filtering & unique values | Shift only | Not relocated. Its neighbors among lessons that stay put are unchanged. The position number moves because lessons ahead of it are reordered. |
| 6 | Lists & text patterns | 9 | 6 | 1 Filtering & unique values | 1 Filtering & unique values | Shift only | Not relocated. Its neighbors among lessons that stay put are unchanged. The position number moves because lessons ahead of it are reordered. |
| 7 | Understand NULL | 10 | 7 | 1 Filtering & unique values | 1 Filtering & unique values | Shift only | Not relocated. Its neighbors among lessons that stay put are unchanged. The position number moves because lessons ahead of it are reordered. |
| 8 | Sort & limit | 11 | 8 | 1 Filtering & unique values | 1 Filtering & unique values | Shift only | Not relocated. Its neighbors among lessons that stay put are unchanged. The position number moves because lessons ahead of it are reordered. |
| 9 | COUNT, SUM & AVG | 13 | 10 | 2 Calculations & data quality | 2 Calculations & data quality | Shift only | Not relocated. Its neighbors among lessons that stay put are unchanged. The position number moves because lessons ahead of it are reordered. |
| 10 | Group into summaries | 14 | 11 | 2 Calculations & data quality | 2 Calculations & data quality | Shift only | Not relocated. Its neighbors among lessons that stay put are unchanged. The position number moves because lessons ahead of it are reordered. |
| 11 | Filter groups with HAVING | 15 | 13 | 2 Calculations & data quality | 2 Calculations & data quality | Shift only | Not relocated. Its neighbors among lessons that stay put are unchanged. The position number moves because lessons ahead of it are reordered. |
| 12 | Make decisions with CASE | 16 | 14 | 2 Calculations & data quality | 2 Calculations & data quality | Shift only | Not relocated. Its neighbors among lessons that stay put are unchanged. The position number moves because lessons ahead of it are reordered. |
| 13 | Conditional aggregation | 17 | 15 | 2 Calculations & data quality | 2 Calculations & data quality | Shift only | Not relocated. Its neighbors among lessons that stay put are unchanged. The position number moves because lessons ahead of it are reordered. |
| 14 | Connect tables with JOIN | 21 | 18 | 3 Joins & aggregation | 3 Joins & aggregation | Shift only | Not relocated. Its neighbors among lessons that stay put are unchanged. The position number moves because lessons ahead of it are reordered. |
| 15 | Keep unmatched rows | 22 | 19 | 3 Joins & aggregation | 3 Joins & aggregation | Shift only | Not relocated. Its neighbors among lessons that stay put are unchanged. The position number moves because lessons ahead of it are reordered. |
| 16 | Revenue across tables | 23 | 21 | 3 Joins & aggregation | 3 Joins & aggregation | Shift only | Not relocated. Its neighbors among lessons that stay put are unchanged. The position number moves because lessons ahead of it are reordered. |
| 17 | Subqueries | 29 | 28 | 4 Dates, strings & subqueries | 4 Dates, strings & subqueries | Shift only | Not relocated. Its neighbors among lessons that stay put are unchanged. The position number moves because lessons ahead of it are reordered. |
| 18 | Ask whether a row exists | 30 | 29 | 4 Dates, strings & subqueries | 4 Dates, strings & subqueries | Shift only | Not relocated. Its neighbors among lessons that stay put are unchanged. The position number moves because lessons ahead of it are reordered. |
| 19 | Combine sets with UNION | 46 | 26 | 6 Advanced product analysis | 3 Joins & aggregation | Relocated | Relocated to immediately before INTERSECT and EXCEPT. Those lessons declare UNION as a prerequisite, and UNION is currently 18 positions later. UNION’s own challenges stack single-table results. Its declared prerequisite is EXISTS, which this lesson does not use; the implementation plan changes that array. |
| 20 | Readable queries with CTEs | 31 | 31 | 4 Dates, strings & subqueries | 4 Dates, strings & subqueries | Unchanged | Same course position, same module, same exercises. |
| 21 | Window functions: ROW_NUMBER | 35 | 35 | 5 Window functions | 5 Window functions | Unchanged | Same course position, same module, same exercises. |
| 22 | RANK & DENSE_RANK | 36 | 36 | 5 Window functions | 5 Window functions | Unchanged | Same course position, same module, same exercises. |
| 23 | Running totals | 37 | 37 | 5 Window functions | 5 Window functions | Unchanged | Same course position, same module, same exercises. |
| 24 | Compare rows with LAG | 38 | 39 | 5 Window functions | 5 Window functions | Shift only | Not relocated. Its neighbors among lessons that stay put are unchanged. The position number moves because lessons ahead of it are reordered. |
| 25 | Latest row per group | 39 | 40 | 5 Window functions | 5 Window functions | Shift only | Not relocated. Its neighbors among lessons that stay put are unchanged. The position number moves because lessons ahead of it are reordered. |
| 26 | Dates & monthly analysis | 32 | 32 | 4 Dates, strings & subqueries | 4 Dates, strings & subqueries | Unchanged | Same course position, same module, same exercises. |
| 27 | Recursive CTEs | 47 | 47 | 6 Advanced product analysis | 6 Advanced product analysis | Unchanged | Same course position, same module, same exercises. |
| 28 | Query plans & indexes | 48 | 48 | 6 Advanced product analysis | 6 Advanced product analysis | Unchanged | Same course position, same module, same exercises. |
| 29 | Capstone: customer insights | 49 | 49 | 6 Advanced product analysis | 6 Advanced product analysis | Unchanged | Same course position, same module, same exercises. |
| 30 | MIN, MAX & the grain of a result | 4 | 12 | 0 SQL foundations | 2 Calculations & data quality | Relocated | Relocated from course position 4 to immediately after GROUP BY. Challenge 1 is one overall MIN/MAX row. Challenge 2 is the maximum per video, which is GROUP BY. The declared prerequisite is lesson 9 (COUNT), currently nine positions later. |
| 31 | NOT IN and the NULL trap | 12 | 30 | 1 Filtering & unique values | 4 Dates, strings & subqueries | Relocated | Relocated from inside the filter module to immediately after EXISTS. The concept and the concept check are the NOT IN NULL trap. Declared prerequisites are lessons 7 and 18. Lesson 18 is currently 18 positions later. |
| 32 | Ratios, ROUND & NULLIF | 18 | 20 | 2 Calculations & data quality | 3 Joins & aggregation | Relocated | Relocated to immediately after LEFT JOIN. Challenge 1 is a single-table success rate. Challenge 2 keeps every account, including accounts with no requests. Declared prerequisites include lesson 15, which is currently later. The concept check is about NULLIF and matches this lesson. |
| 33 | Clean strings & cast values | 33 | 33 | 4 Dates, strings & subqueries | 4 Dates, strings & subqueries | Unchanged | Same course position, same module, same exercises. |
| 34 | Self-joins & referral relationships | 24 | 22 | 3 Joins & aggregation | 3 Joins & aggregation | Shift only | Not relocated. Its neighbors among lessons that stay put are unchanged. The position number moves because lessons ahead of it are reordered. |
| 35 | CROSS JOIN & a complete date grid | 25 | 23 | 3 Joins & aggregation | 3 Joins & aggregation | Shift only | Not relocated. Its neighbors among lessons that stay put are unchanged. The position number moves because lessons ahead of it are reordered. |
| 36 | FULL OUTER JOIN & unmatched records | 26 | 24 | 3 Joins & aggregation | 3 Joins & aggregation | Shift only | Not relocated. Its neighbors among lessons that stay put are unchanged. The position number moves because lessons ahead of it are reordered. |
| 37 | ON versus WHERE in a LEFT JOIN | 27 | 25 | 3 Joins & aggregation | 3 Joins & aggregation | Shift only | Not relocated. Its neighbors among lessons that stay put are unchanged. The position number moves because lessons ahead of it are reordered. |
| 38 | INTERSECT & EXCEPT | 28 | 27 | 3 Joins & aggregation | 3 Joins & aggregation | Shift only | Not relocated. Its neighbors among lessons that stay put are unchanged. The position number moves because lessons ahead of it are reordered. |
| 39 | Date boundaries & monthly buckets | 34 | 34 | 4 Dates, strings & subqueries | 4 Dates, strings & subqueries | Unchanged | Same course position, same module, same exercises. |
| 40 | LEAD & the next event | 40 | 41 | 5 Window functions | 5 Window functions | Shift only | Not relocated. Its neighbors among lessons that stay put are unchanged. The position number moves because lessons ahead of it are reordered. |
| 41 | FIRST_VALUE, LAST_VALUE & frames | 41 | 42 | 5 Window functions | 5 Window functions | Shift only | Not relocated. Its neighbors among lessons that stay put are unchanged. The position number moves because lessons ahead of it are reordered. |
| 42 | Rolling averages & missing dates | 42 | 43 | 5 Window functions | 5 Window functions | Shift only | Not relocated. Its neighbors among lessons that stay put are unchanged. The position number moves because lessons ahead of it are reordered. |
| 43 | Share of total with windows | 43 | 44 | 5 Window functions | 5 Window functions | Shift only | Not relocated. Its neighbors among lessons that stay put are unchanged. The position number moves because lessons ahead of it are reordered. |
| 44 | Deduplicate event retries | 50 | 50 | 6 Advanced product analysis | 6 Advanced product analysis | Unchanged | Same course position, same module, same exercises. |
| 45 | Daily active users & engagement | 51 | 51 | 6 Advanced product analysis | 6 Advanced product analysis | Unchanged | Same course position, same module, same exercises. |
| 46 | Ordered conversion funnels | 52 | 52 | 6 Advanced product analysis | 6 Advanced product analysis | Unchanged | Same course position, same module, same exercises. |
| 47 | Cohorts & exact-day retention | 53 | 53 | 6 Advanced product analysis | 6 Advanced product analysis | Unchanged | Same course position, same module, same exercises. |
| 48 | Sessionize an event stream | 54 | 54 | 6 Advanced product analysis | 6 Advanced product analysis | Unchanged | Same course position, same module, same exercises. |
| 49 | Multi-grain joins without fan-out | 55 | 55 | 6 Advanced product analysis | 6 Advanced product analysis | Unchanged | Same course position, same module, same exercises. |
| 50 | Revenue & payment reconciliation | 56 | 56 | 6 Advanced product analysis | 6 Advanced product analysis | Unchanged | Same course position, same module, same exercises. |
| 51 | AI usage cost & contribution margin | 57 | 57 | 6 Advanced product analysis | 6 Advanced product analysis | Unchanged | Same course position, same module, same exercises. |
| 52 | Experiment conversion denominators | 58 | 58 | 6 Advanced product analysis | 6 Advanced product analysis | Unchanged | Same course position, same module, same exercises. |
| 53 | Top N per group & ties | 44 | 45 | 5 Window functions | 5 Window functions | Shift only | Not relocated. Its neighbors among lessons that stay put are unchanged. The position number moves because lessons ahead of it are reordered. |
| 54 | Databases, schemas, tables & keys | 5 | 17 | 0 SQL foundations | 3 Joins & aggregation | Relocated | Relocated from course position 5 to immediately before INNER JOIN. The concept is primary and foreign keys. Challenge 1 reads sqlite_schema. Challenge 2 joins orders to customers. Lesson 0 already teaches rows, columns, and SELECT. This lesson does not become lesson 1, because that would put a join in the first lesson. |
| 55 | Logical query processing & row grain | 19 | 38 | 2 Calculations & data quality | 5 Window functions | Relocated | Relocated to immediately after running totals. The concept check is WHEN versus GROUP BY. Challenge 2 adds a window sum on each paid order. Declared prerequisites include lesson 23, which is currently later. |
| 56 | CAST, text types & NULL arithmetic | 20 | 16 | 2 Calculations & data quality | 2 Calculations & data quality | Shift only | Not relocated. Its neighbors among lessons that stay put are unchanged. The position number moves because lessons ahead of it are reordered. |
| 57 | NTILE & balanced ranking buckets | 45 | 46 | 5 Window functions | 5 Window functions | Shift only | Not relocated. Its neighbors among lessons that stay put are unchanged. The position number moves because lessons ahead of it are reordered. |
| 58 | DDL: create, alter & inspect a table | 59 | 59 | 7 Database engineering | 7 Database engineering | Unchanged | Same course position, same module, same exercises. |
| 59 | DML: INSERT, UPDATE & DELETE | 60 | 60 | 7 Database engineering | 7 Database engineering | Unchanged | Same course position, same module, same exercises. |
| 60 | Constraints protect the data contract | 61 | 61 | 7 Database engineering | 7 Database engineering | Unchanged | Same course position, same module, same exercises. |
| 61 | Transactions & savepoint recovery | 62 | 62 | 7 Database engineering | 7 Database engineering | Unchanged | Same course position, same module, same exercises. |
| 62 | Views: reusable query definitions | 63 | 63 | 7 Database engineering | 7 Database engineering | Unchanged | Same course position, same module, same exercises. |
| 63 | CTEs, CTAS & temporary tables | 64 | 64 | 7 Database engineering | 7 Database engineering | Unchanged | Same course position, same module, same exercises. |
| 64 | Triggers & visible audit effects | 65 | 65 | 7 Database engineering | 7 Database engineering | Unchanged | Same course position, same module, same exercises. |
| 65 | Stored procedures: parameters & contracts | 66 | 66 | 7 Database engineering | 7 Database engineering | Unchanged | Same course position, same module, same exercises. |
| 66 | Indexes: observe a real access path | 67 | 67 | 8 Performance & query plans | 8 Performance & query plans | Unchanged | Same course position, same module, same exercises. |
| 67 | SARGable ranges, not speed commandments | 68 | 68 | 8 Performance & query plans | 8 Performance & query plans | Unchanged | Same course position, same module, same exercises. |
| 68 | Partitioning & workload trade-offs | 69 | 69 | 8 Performance & query plans | 8 Performance & query plans | Unchanged | Same course position, same module, same exercises. |
| 69 | Bronze: inspect raw data before cleaning | 71 | 71 | 9 Warehouse & reporting projects | 9 Warehouse & reporting projects | Unchanged | Same course position, same module, same exercises. |
| 70 | Silver: clean, map & deduplicate | 72 | 72 | 9 Warehouse & reporting projects | 9 Warehouse & reporting projects | Unchanged | Same course position, same module, same exercises. |
| 71 | Gold: dimensions, facts & quality gates | 73 | 73 | 9 Warehouse & reporting projects | 9 Warehouse & reporting projects | Unchanged | Same course position, same module, same exercises. |
| 72 | EDA: explore before telling the story | 74 | 74 | 9 Warehouse & reporting projects | 9 Warehouse & reporting projects | Unchanged | Same course position, same module, same exercises. |
| 73 | Customer & product reporting contracts | 75 | 75 | 9 Warehouse & reporting projects | 9 Warehouse & reporting projects | Unchanged | Same course position, same module, same exercises. |
| 74 | Monthly change & cumulative reports | 76 | 76 | 9 Warehouse & reporting projects | 9 Warehouse & reporting projects | Unchanged | Same course position, same module, same exercises. |
| 75 | Review AI-generated SQL with evidence | 70 | 70 | 8 Performance & query plans | 8 Performance & query plans | Unchanged | Same course position, same module, same exercises. |
| 76 | Reconcile extraction & Bronze ingestion | 77 | 77 | 9 Warehouse & reporting projects | 9 Warehouse & reporting projects | Unchanged | Same course position, same module, same exercises. |
| 77 | Integrate CRM + ERP with source authority | 78 | 78 | 9 Warehouse & reporting projects | 9 Warehouse & reporting projects | Unchanged | Same course position, same module, same exercises. |
| 78 | Product validity with LEAD & half-open intervals | 79 | 79 | 9 Warehouse & reporting projects | 9 Warehouse & reporting projects | Unchanged | Same course position, same module, same exercises. |
| 79 | Validate calendar dates before converting | 80 | 80 | 9 Warehouse & reporting projects | 9 Warehouse & reporting projects | Unchanged | Same course position, same module, same exercises. |
| 80 | Quarantine bad rows & reconcile the batch | 81 | 81 | 9 Warehouse & reporting projects | 9 Warehouse & reporting projects | Unchanged | Same course position, same module, same exercises. |
| 81 | Automated star-schema quality tests | 82 | 82 | 9 Warehouse & reporting projects | 9 Warehouse & reporting projects | Unchanged | Same course position, same module, same exercises. |
| 82 | Durable surrogate keys across loads | 83 | 83 | 9 Warehouse & reporting projects | 9 Warehouse & reporting projects | Unchanged | Same course position, same module, same exercises. |
| 83 | Latest-state reporting versus SCD Type 2 | 84 | 84 | 9 Warehouse & reporting projects | 9 Warehouse & reporting projects | Unchanged | Same course position, same module, same exercises. |
| 84 | Idempotent incremental UPSERT & stale updates | 85 | 85 | 9 Warehouse & reporting projects | 9 Warehouse & reporting projects | Unchanged | Same course position, same module, same exercises. |
| 85 | Stage, validate & atomically promote a refresh | 86 | 86 | 9 Warehouse & reporting projects | 9 Warehouse & reporting projects | Unchanged | Same course position, same module, same exercises. |
| 86 | Protect fact grain when joining versions | 87 | 87 | 9 Warehouse & reporting projects | 9 Warehouse & reporting projects | Unchanged | Same course position, same module, same exercises. |
| 87 | Capstone: integrated customers to trusted sales | 88 | 88 | 9 Warehouse & reporting projects | 9 Warehouse & reporting projects | Unchanged | Same course position, same module, same exercises. |

## Module membership after the recommendation

| Module | Name | Lessons now | Lessons proposed |
| ---: | --- | ---: | ---: |
| 0 | SQL foundations | 5 (0, 1, 2, 30, 54) | 2 (0, 1) |
| 1 | Filtering & unique values | 7 (3, 4, 5, 6, 7, 8, 31) | 6 (3, 4, 5, 6, 7, 8) |
| 2 | Calculations & data quality | 8 (9, 10, 11, 12, 13, 32, 55, 56) | 8 (2, 9, 10, 30, 11, 12, 13, 56) |
| 3 | Joins & aggregation | 8 (14, 15, 16, 34, 35, 36, 37, 38) | 11 (54, 14, 15, 32, 16, 34, 35, 36, 37, 19, 38) |
| 4 | Dates, strings & subqueries | 6 (17, 18, 20, 26, 33, 39) | 7 (17, 18, 31, 20, 26, 33, 39) |
| 5 | Window functions | 11 (21, 22, 23, 24, 25, 40, 41, 42, 43, 53, 57) | 12 (21, 22, 23, 55, 24, 25, 40, 41, 42, 43, 53, 57) |
| 6 | Advanced product analysis | 13 (19, 27, 28, 29, 44, 45, 46, 47, 48, 49, 50, 51, 52) | 12 (27, 28, 29, 44, 45, 46, 47, 48, 49, 50, 51, 52) |
| 7 | Database engineering | 8 (58, 59, 60, 61, 62, 63, 64, 65) | 8 (58, 59, 60, 61, 62, 63, 64, 65) |
| 8 | Performance & query plans | 4 (66, 67, 68, 75) | 4 (66, 67, 68, 75) |
| 9 | Warehouse & reporting projects | 18 (69, 70, 71, 72, 73, 74, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87) | 18 (69, 70, 71, 72, 73, 74, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87) |
