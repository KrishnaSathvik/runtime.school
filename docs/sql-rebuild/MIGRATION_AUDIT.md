# SQL content migration audit

Generated from canonical content by npm run qb:report. KEEP preserves a tested concept contract; MIGRATE changes data and transfer behavior while retaining IDs. No exercises are retired. Foundation repetition is deliberate scaffolding; advanced transfer is expanded in the independent bank. Existing project milestone sequences remain intact.

## Lessons

| ID | Lesson | Decision | Dataset | Rationale |
|---|---|---|---|---|
| 0 | Meet your first SELECT | KEEP | shop | Preserve inspectable foundation data; each clause is introduced before larger-domain transfer in Practice. |
| 1 | Aliases & calculated columns | KEEP | shop | Preserve inspectable foundation data; each clause is introduced before larger-domain transfer in Practice. |
| 3 | Filter with WHERE | KEEP | shop | Preserve inspectable foundation data; each clause is introduced before larger-domain transfer in Practice. |
| 4 | Comparisons & ranges | KEEP | shop | Preserve inspectable foundation data; each clause is introduced before larger-domain transfer in Practice. |
| 5 | Combine conditions | KEEP | shop | Preserve inspectable foundation data; each clause is introduced before larger-domain transfer in Practice. |
| 6 | Lists & text patterns | KEEP | shop | Preserve inspectable foundation data; each clause is introduced before larger-domain transfer in Practice. |
| 7 | Understand NULL | KEEP | shop | Preserve inspectable foundation data; each clause is introduced before larger-domain transfer in Practice. |
| 8 | Sort & limit | KEEP | shop | Preserve inspectable foundation data; each clause is introduced before larger-domain transfer in Practice. |
| 2 | Unique values with DISTINCT | KEEP | shop | Preserve inspectable foundation data; each clause is introduced before larger-domain transfer in Practice. |
| 9 | COUNT, SUM & AVG | KEEP | shop | Preserve inspectable foundation data; each clause is introduced before larger-domain transfer in Practice. |
| 10 | Group into summaries | KEEP | shop | Preserve inspectable foundation data; each clause is introduced before larger-domain transfer in Practice. |
| 30 | MIN, MAX & the grain of a result | KEEP | stream | Preserve the existing concept and explicit boundary/tie/NULL contract; shared-domain Practice provides transfer without invalidating saved drafts. |
| 11 | Filter groups with HAVING | KEEP | shop | Preserve inspectable foundation data; each clause is introduced before larger-domain transfer in Practice. |
| 12 | Make decisions with CASE | KEEP | shop | Preserve inspectable foundation data; each clause is introduced before larger-domain transfer in Practice. |
| 13 | Conditional aggregation | MIGRATE | weather | Weather measurements transfer conditional counts to averages with missing-value and unit semantics. |
| 56 | CAST, text types & NULL arithmetic | KEEP | lab | Preserve the existing concept and explicit boundary/tie/NULL contract; shared-domain Practice provides transfer without invalidating saved drafts. |
| 54 | Databases, schemas, tables & keys | KEEP | shop | Preserve the existing concept and explicit boundary/tie/NULL contract; shared-domain Practice provides transfer without invalidating saved drafts. |
| 14 | Connect tables with JOIN | KEEP | shop | Preserve the existing concept and explicit boundary/tie/NULL contract; shared-domain Practice provides transfer without invalidating saved drafts. |
| 15 | Keep unmatched rows | KEEP | shop | Preserve the existing concept and explicit boundary/tie/NULL contract; shared-domain Practice provides transfer without invalidating saved drafts. |
| 32 | Ratios, ROUND & NULLIF | KEEP | ai | Preserve linked project narrative and its specialized event/warehouse semantics; new investigations add larger-domain transfer. |
| 16 | Revenue across tables | KEEP | shop | Preserve the existing concept and explicit boundary/tie/NULL contract; shared-domain Practice provides transfer without invalidating saved drafts. |
| 34 | Self-joins & referral relationships | KEEP | social | Preserve the existing concept and explicit boundary/tie/NULL contract; shared-domain Practice provides transfer without invalidating saved drafts. |
| 35 | CROSS JOIN & a complete date grid | KEEP | stream | Preserve the existing concept and explicit boundary/tie/NULL contract; shared-domain Practice provides transfer without invalidating saved drafts. |
| 36 | FULL OUTER JOIN & unmatched records | KEEP | ai | Preserve the existing concept and explicit boundary/tie/NULL contract; shared-domain Practice provides transfer without invalidating saved drafts. |
| 37 | ON versus WHERE in a LEFT JOIN | KEEP | ai | Preserve the existing concept and explicit boundary/tie/NULL contract; shared-domain Practice provides transfer without invalidating saved drafts. |
| 19 | Combine sets with UNION | KEEP | shop | Preserve the existing concept and explicit boundary/tie/NULL contract; shared-domain Practice provides transfer without invalidating saved drafts. |
| 38 | INTERSECT & EXCEPT | KEEP | stream | Preserve the existing concept and explicit boundary/tie/NULL contract; shared-domain Practice provides transfer without invalidating saved drafts. |
| 17 | Subqueries | KEEP | shop | Preserve the existing concept and explicit boundary/tie/NULL contract; shared-domain Practice provides transfer without invalidating saved drafts. |
| 18 | Ask whether a row exists | KEEP | shop | Preserve the existing concept and explicit boundary/tie/NULL contract; shared-domain Practice provides transfer without invalidating saved drafts. |
| 31 | NOT IN and the NULL trap | KEEP | stream | Preserve the existing concept and explicit boundary/tie/NULL contract; shared-domain Practice provides transfer without invalidating saved drafts. |
| 20 | Readable queries with CTEs | KEEP | shop | Preserve the existing concept and explicit boundary/tie/NULL contract; shared-domain Practice provides transfer without invalidating saved drafts. |
| 26 | Dates & monthly analysis | KEEP | shop | Preserve the existing concept and explicit boundary/tie/NULL contract; shared-domain Practice provides transfer without invalidating saved drafts. |
| 33 | Clean strings & cast values | KEEP | social | Preserve the existing concept and explicit boundary/tie/NULL contract; shared-domain Practice provides transfer without invalidating saved drafts. |
| 39 | Date boundaries & monthly buckets | KEEP | stream | Preserve the existing concept and explicit boundary/tie/NULL contract; shared-domain Practice provides transfer without invalidating saved drafts. |
| 21 | Window functions: ROW_NUMBER | KEEP | shop | Preserve the existing concept and explicit boundary/tie/NULL contract; shared-domain Practice provides transfer without invalidating saved drafts. |
| 22 | RANK & DENSE_RANK | KEEP | shop | Preserve the existing concept and explicit boundary/tie/NULL contract; shared-domain Practice provides transfer without invalidating saved drafts. |
| 23 | Running totals | KEEP | shop | Preserve the existing concept and explicit boundary/tie/NULL contract; shared-domain Practice provides transfer without invalidating saved drafts. |
| 55 | Logical query processing & row grain | KEEP | shop | Preserve the existing concept and explicit boundary/tie/NULL contract; shared-domain Practice provides transfer without invalidating saved drafts. |
| 24 | Compare rows with LAG | MIGRATE | flights | Flights transfer previous scheduled row to previous operated row; filtering changes window membership. |
| 25 | Latest row per group | KEEP | shop | Preserve the existing concept and explicit boundary/tie/NULL contract; shared-domain Practice provides transfer without invalidating saved drafts. |
| 40 | LEAD & the next event | KEEP | stream | Preserve the existing concept and explicit boundary/tie/NULL contract; shared-domain Practice provides transfer without invalidating saved drafts. |
| 41 | FIRST_VALUE, LAST_VALUE & frames | KEEP | stream | Preserve the existing concept and explicit boundary/tie/NULL contract; shared-domain Practice provides transfer without invalidating saved drafts. |
| 42 | Rolling averages & missing dates | KEEP | stream | Preserve linked project narrative and its specialized event/warehouse semantics; new investigations add larger-domain transfer. |
| 43 | Share of total with windows | KEEP | ai | Preserve the existing concept and explicit boundary/tie/NULL contract; shared-domain Practice provides transfer without invalidating saved drafts. |
| 53 | Top N per group & ties | KEEP | stream | Preserve linked project narrative and its specialized event/warehouse semantics; new investigations add larger-domain transfer. |
| 57 | NTILE & balanced ranking buckets | KEEP | stream | Preserve the existing concept and explicit boundary/tie/NULL contract; shared-domain Practice provides transfer without invalidating saved drafts. |
| 27 | Recursive CTEs | MIGRATE | developer | Developer management hierarchy extends a number sequence to recursive relationships. |
| 28 | Query plans & indexes | KEEP | shop | Preserve the existing concept and explicit boundary/tie/NULL contract; shared-domain Practice provides transfer without invalidating saved drafts. |
| 29 | Capstone: customer insights | KEEP | shop | Preserve the existing concept and explicit boundary/tie/NULL contract; shared-domain Practice provides transfer without invalidating saved drafts. |
| 44 | Deduplicate event retries | KEEP | social | Preserve linked project narrative and its specialized event/warehouse semantics; new investigations add larger-domain transfer. |
| 45 | Daily active users & engagement | KEEP | stream | Preserve linked project narrative and its specialized event/warehouse semantics; new investigations add larger-domain transfer. |
| 46 | Ordered conversion funnels | KEEP | social | Preserve linked project narrative and its specialized event/warehouse semantics; new investigations add larger-domain transfer. |
| 47 | Cohorts & exact-day retention | KEEP | stream | Preserve linked project narrative and its specialized event/warehouse semantics; new investigations add larger-domain transfer. |
| 48 | Sessionize an event stream | KEEP | social | Preserve linked project narrative and its specialized event/warehouse semantics; new investigations add larger-domain transfer. |
| 49 | Multi-grain joins without fan-out | KEEP | ai | Preserve linked project narrative and its specialized event/warehouse semantics; new investigations add larger-domain transfer. |
| 50 | Revenue & payment reconciliation | KEEP | ai | Preserve linked project narrative and its specialized event/warehouse semantics; new investigations add larger-domain transfer. |
| 51 | AI usage cost & contribution margin | KEEP | ai | Preserve linked project narrative and its specialized event/warehouse semantics; new investigations add larger-domain transfer. |
| 52 | Experiment conversion denominators | KEEP | social | Preserve linked project narrative and its specialized event/warehouse semantics; new investigations add larger-domain transfer. |
| 58 | DDL: create, alter & inspect a table | KEEP | lab | Preserve executable SQLite engineering contract, state validation, and guided project continuity. |
| 59 | DML: INSERT, UPDATE & DELETE | KEEP | lab | Preserve executable SQLite engineering contract, state validation, and guided project continuity. |
| 60 | Constraints protect the data contract | KEEP | lab | Preserve executable SQLite engineering contract, state validation, and guided project continuity. |
| 61 | Transactions & savepoint recovery | KEEP | lab | Preserve executable SQLite engineering contract, state validation, and guided project continuity. |
| 62 | Views: reusable query definitions | KEEP | shop | Preserve executable SQLite engineering contract, state validation, and guided project continuity. |
| 63 | CTEs, CTAS & temporary tables | KEEP | shop | Preserve executable SQLite engineering contract, state validation, and guided project continuity. |
| 64 | Triggers & visible audit effects | KEEP | lab | Preserve executable SQLite engineering contract, state validation, and guided project continuity. |
| 65 | Stored procedures: parameters & contracts | KEEP | shop | Preserve executable SQLite engineering contract, state validation, and guided project continuity. |
| 66 | Indexes: observe a real access path | KEEP | shop | Preserve executable SQLite engineering contract, state validation, and guided project continuity. |
| 67 | SARGable ranges, not speed commandments | KEEP | stream | Preserve executable SQLite engineering contract, state validation, and guided project continuity. |
| 68 | Partitioning & workload trade-offs | KEEP | warehouse | Preserve executable SQLite engineering contract, state validation, and guided project continuity. |
| 75 | Review AI-generated SQL with evidence | KEEP | ai | Preserve executable SQLite engineering contract, state validation, and guided project continuity. |
| 69 | Bronze: inspect raw data before cleaning | KEEP | warehouse | Preserve executable SQLite engineering contract, state validation, and guided project continuity. |
| 70 | Silver: clean, map & deduplicate | KEEP | warehouse | Preserve executable SQLite engineering contract, state validation, and guided project continuity. |
| 71 | Gold: dimensions, facts & quality gates | KEEP | warehouse | Preserve executable SQLite engineering contract, state validation, and guided project continuity. |
| 72 | EDA: explore before telling the story | KEEP | warehouse | Preserve executable SQLite engineering contract, state validation, and guided project continuity. |
| 73 | Customer & product reporting contracts | KEEP | warehouse | Preserve executable SQLite engineering contract, state validation, and guided project continuity. |
| 74 | Monthly change & cumulative reports | KEEP | warehouse | Preserve executable SQLite engineering contract, state validation, and guided project continuity. |
| 76 | Reconcile extraction & Bronze ingestion | KEEP | integration | Preserve executable SQLite engineering contract, state validation, and guided project continuity. |
| 77 | Integrate CRM + ERP with source authority | KEEP | integration | Preserve executable SQLite engineering contract, state validation, and guided project continuity. |
| 78 | Product validity with LEAD & half-open intervals | KEEP | integration | Preserve executable SQLite engineering contract, state validation, and guided project continuity. |
| 79 | Validate calendar dates before converting | KEEP | integration | Preserve executable SQLite engineering contract, state validation, and guided project continuity. |
| 80 | Quarantine bad rows & reconcile the batch | KEEP | integration | Preserve executable SQLite engineering contract, state validation, and guided project continuity. |
| 81 | Automated star-schema quality tests | KEEP | integration | Preserve executable SQLite engineering contract, state validation, and guided project continuity. |
| 82 | Durable surrogate keys across loads | KEEP | integration | Preserve executable SQLite engineering contract, state validation, and guided project continuity. |
| 83 | Latest-state reporting versus SCD Type 2 | KEEP | integration | Preserve executable SQLite engineering contract, state validation, and guided project continuity. |
| 84 | Idempotent incremental UPSERT & stale updates | KEEP | integration | Preserve executable SQLite engineering contract, state validation, and guided project continuity. |
| 85 | Stage, validate & atomically promote a refresh | KEEP | integration | Preserve executable SQLite engineering contract, state validation, and guided project continuity. |
| 86 | Protect fact grain when joining versions | KEEP | integration | Preserve executable SQLite engineering contract, state validation, and guided project continuity. |
| 87 | Capstone: integrated customers to trusted sales | KEEP | integration | Preserve executable SQLite engineering contract, state validation, and guided project continuity. |

## Every exercise

| ID | Exercise | Decision | Dataset | Primary topic |
|---|---|---|---|---|
| lc-0-0 | Meet your first SELECT · Challenge 1 | KEEP | shop | basics.select |
| lc-0-1 | Meet your first SELECT · Challenge 2 | KEEP | shop | basics.select |
| lc-1-0 | Aliases & calculated columns · Challenge 1 | KEEP | shop | basics.alias |
| lc-1-1 | Aliases & calculated columns · Challenge 2 | KEEP | shop | basics.alias |
| lc-3-0 | Filter with WHERE · Challenge 1 | KEEP | shop | filtering.where |
| lc-3-1 | Filter with WHERE · Challenge 2 | KEEP | shop | filtering.where |
| lc-4-0 | Comparisons & ranges · Challenge 1 | KEEP | shop | filtering.between |
| lc-4-1 | Comparisons & ranges · Challenge 2 | KEEP | shop | filtering.between |
| lc-5-0 | Combine conditions · Challenge 1 | KEEP | shop | filtering.logic |
| lc-5-1 | Combine conditions · Challenge 2 | KEEP | shop | filtering.logic |
| lc-6-0 | Lists & text patterns · Challenge 1 | KEEP | shop | filtering.like |
| lc-6-1 | Lists & text patterns · Challenge 2 | KEEP | shop | filtering.like |
| lc-7-0 | Understand NULL · Challenge 1 | KEEP | shop | filtering.null |
| lc-7-1 | Understand NULL · Challenge 2 | KEEP | shop | filtering.null |
| lc-8-0 | Sort & limit · Challenge 1 | KEEP | shop | basics.order-by |
| lc-8-1 | Sort & limit · Challenge 2 | KEEP | shop | basics.order-by |
| lc-2-0 | Unique values with DISTINCT · Challenge 1 | KEEP | shop | basics.distinct |
| lc-2-1 | Unique values with DISTINCT · Challenge 2 | KEEP | shop | basics.distinct |
| lc-9-0 | COUNT, SUM & AVG · Challenge 1 | KEEP | shop | aggregation.basic |
| lc-9-1 | COUNT, SUM & AVG · Challenge 2 | KEEP | shop | aggregation.basic |
| lc-10-0 | Group into summaries · Challenge 1 | KEEP | shop | aggregation.group-by |
| lc-10-1 | Group into summaries · Challenge 2 | KEEP | shop | aggregation.group-by |
| lc-30-0 | MIN, MAX & the grain of a result · Challenge 1 | KEEP | stream | aggregation.basic |
| lc-30-1 | MIN, MAX & the grain of a result · Challenge 2 | KEEP | stream | aggregation.basic |
| lc-11-0 | Filter groups with HAVING · Challenge 1 | KEEP | shop | aggregation.having |
| lc-11-1 | Filter groups with HAVING · Challenge 2 | KEEP | shop | aggregation.having |
| lc-12-0 | Make decisions with CASE · Challenge 1 | KEEP | shop | cleaning.case |
| lc-12-1 | Make decisions with CASE · Challenge 2 | KEEP | shop | cleaning.case |
| lc-13-0 | Conditional aggregation · Challenge 1 | MIGRATE | weather | aggregation.conditional |
| lc-13-1 | Conditional aggregation · Challenge 2 | MIGRATE | weather | aggregation.conditional |
| lc-56-0 | CAST, text types & NULL arithmetic · Challenge 1 | KEEP | lab | cleaning.validation |
| lc-56-1 | CAST, text types & NULL arithmetic · Challenge 2 | KEEP | lab | cleaning.validation |
| lc-54-0 | Databases, schemas, tables & keys · Challenge 1 | KEEP | shop | basics.schema |
| lc-54-1 | Databases, schemas, tables & keys · Challenge 2 | KEEP | shop | basics.schema |
| lc-14-0 | Connect tables with JOIN · Challenge 1 | KEEP | shop | joins.inner |
| lc-14-1 | Connect tables with JOIN · Challenge 2 | KEEP | shop | joins.inner |
| lc-15-0 | Keep unmatched rows · Challenge 1 | KEEP | shop | joins.left |
| lc-15-1 | Keep unmatched rows · Challenge 2 | KEEP | shop | joins.left |
| lc-32-0 | Ratios, ROUND & NULLIF · Challenge 1 | KEEP | ai | analytics.statistics |
| lc-32-1 | Ratios, ROUND & NULLIF · Challenge 2 | KEEP | ai | analytics.statistics |
| lc-16-0 | Revenue across tables · Challenge 1 | KEEP | shop | joins.multi |
| lc-16-1 | Revenue across tables · Challenge 2 | KEEP | shop | joins.multi |
| lc-34-0 | Self-joins & referral relationships · Challenge 1 | KEEP | social | joins.self |
| lc-34-1 | Self-joins & referral relationships · Challenge 2 | KEEP | social | joins.self |
| lc-35-0 | CROSS JOIN & a complete date grid · Challenge 1 | KEEP | stream | dates.series |
| lc-35-1 | CROSS JOIN & a complete date grid · Challenge 2 | KEEP | stream | dates.series |
| lc-36-0 | FULL OUTER JOIN & unmatched records · Challenge 1 | KEEP | ai | joins.anti |
| lc-36-1 | FULL OUTER JOIN & unmatched records · Challenge 2 | KEEP | ai | joins.anti |
| lc-37-0 | ON versus WHERE in a LEFT JOIN · Challenge 1 | KEEP | ai | joins.left |
| lc-37-1 | ON versus WHERE in a LEFT JOIN · Challenge 2 | KEEP | ai | joins.left |
| lc-19-0 | Combine sets with UNION · Challenge 1 | KEEP | shop | joins.set-ops |
| lc-19-1 | Combine sets with UNION · Challenge 2 | KEEP | shop | joins.set-ops |
| lc-38-0 | INTERSECT & EXCEPT · Challenge 1 | KEEP | stream | joins.set-ops |
| lc-38-1 | INTERSECT & EXCEPT · Challenge 2 | KEEP | stream | joins.set-ops |
| lc-17-0 | Subqueries · Challenge 1 | KEEP | shop | subqueries.scalar |
| lc-17-1 | Subqueries · Challenge 2 | KEEP | shop | subqueries.scalar |
| lc-18-0 | Ask whether a row exists · Challenge 1 | KEEP | shop | subqueries.exists |
| lc-18-1 | Ask whether a row exists · Challenge 2 | KEEP | shop | subqueries.exists |
| lc-31-0 | NOT IN and the NULL trap · Challenge 1 | KEEP | stream | filtering.null |
| lc-31-1 | NOT IN and the NULL trap · Challenge 2 | KEEP | stream | filtering.null |
| lc-20-0 | Readable queries with CTEs · Challenge 1 | KEEP | shop | subqueries.cte |
| lc-20-1 | Readable queries with CTEs · Challenge 2 | KEEP | shop | subqueries.cte |
| lc-26-0 | Dates & monthly analysis · Challenge 1 | KEEP | shop | dates.buckets |
| lc-26-1 | Dates & monthly analysis · Challenge 2 | KEEP | shop | dates.buckets |
| lc-33-0 | Clean strings & cast values · Challenge 1 | KEEP | social | cleaning.strings |
| lc-33-1 | Clean strings & cast values · Challenge 2 | KEEP | social | cleaning.strings |
| lc-39-0 | Date boundaries & monthly buckets · Challenge 1 | KEEP | stream | dates.filter |
| lc-39-1 | Date boundaries & monthly buckets · Challenge 2 | KEEP | stream | dates.filter |
| lc-21-0 | Window functions: ROW_NUMBER · Challenge 1 | KEEP | shop | windows.row-number |
| lc-21-1 | Window functions: ROW_NUMBER · Challenge 2 | KEEP | shop | windows.row-number |
| lc-22-0 | RANK & DENSE_RANK · Challenge 1 | KEEP | shop | windows.rank |
| lc-22-1 | RANK & DENSE_RANK · Challenge 2 | KEEP | shop | windows.rank |
| lc-23-0 | Running totals · Challenge 1 | KEEP | shop | windows.running |
| lc-23-1 | Running totals · Challenge 2 | KEEP | shop | windows.running |
| lc-55-0 | Logical query processing & row grain · Challenge 1 | KEEP | shop | aggregation.group-by |
| lc-55-1 | Logical query processing & row grain · Challenge 2 | KEEP | shop | aggregation.group-by |
| lc-24-0 | Compare rows with LAG · Challenge 1 | MIGRATE | flights | windows.lag-lead |
| lc-24-1 | Compare rows with LAG · Challenge 2 | MIGRATE | flights | windows.lag-lead |
| lc-25-0 | Latest row per group · Challenge 1 | KEEP | shop | windows.top-n |
| lc-25-1 | Latest row per group · Challenge 2 | KEEP | shop | windows.top-n |
| lc-40-0 | LEAD & the next event · Challenge 1 | KEEP | stream | windows.lag-lead |
| lc-40-1 | LEAD & the next event · Challenge 2 | KEEP | stream | windows.lag-lead |
| lc-41-0 | FIRST_VALUE, LAST_VALUE & frames · Challenge 1 | KEEP | stream | windows.rolling |
| lc-41-1 | FIRST_VALUE, LAST_VALUE & frames · Challenge 2 | KEEP | stream | windows.rolling |
| lc-42-0 | Rolling averages & missing dates · Challenge 1 | KEEP | stream | windows.rolling |
| lc-42-1 | Rolling averages & missing dates · Challenge 2 | KEEP | stream | windows.rolling |
| lc-43-0 | Share of total with windows · Challenge 1 | KEEP | ai | analytics.statistics |
| lc-43-1 | Share of total with windows · Challenge 2 | KEEP | ai | analytics.statistics |
| lc-53-0 | Top N per group & ties · Challenge 1 | KEEP | stream | windows.top-n |
| lc-53-1 | Top N per group & ties · Challenge 2 | KEEP | stream | windows.top-n |
| lc-57-0 | NTILE & balanced ranking buckets · Challenge 1 | KEEP | stream | windows.rank |
| lc-57-1 | NTILE & balanced ranking buckets · Challenge 2 | KEEP | stream | windows.rank |
| lc-27-0 | Recursive CTEs · Challenge 1 | MIGRATE | developer | subqueries.recursive |
| lc-27-1 | Recursive CTEs · Challenge 2 | MIGRATE | developer | subqueries.recursive |
| lc-28-0 | Query plans & indexes · Challenge 1 | KEEP | shop | optimization.plans |
| lc-28-1 | Query plans & indexes · Challenge 2 | KEEP | shop | optimization.plans |
| lc-29-0 | Capstone: customer insights · Challenge 1 | KEEP | shop | analytics.segmentation |
| lc-29-1 | Capstone: customer insights · Challenge 2 | KEEP | shop | analytics.segmentation |
| lc-44-0 | Deduplicate event retries · Challenge 1 | KEEP | social | cleaning.dedupe |
| lc-44-1 | Deduplicate event retries · Challenge 2 | KEEP | social | cleaning.dedupe |
| lc-45-0 | Daily active users & engagement · Challenge 1 | KEEP | stream | analytics.active-users |
| lc-45-1 | Daily active users & engagement · Challenge 2 | KEEP | stream | analytics.active-users |
| lc-46-0 | Ordered conversion funnels · Challenge 1 | KEEP | social | analytics.conversion |
| lc-46-1 | Ordered conversion funnels · Challenge 2 | KEEP | social | analytics.conversion |
| lc-47-0 | Cohorts & exact-day retention · Challenge 1 | KEEP | stream | analytics.retention |
| lc-47-1 | Cohorts & exact-day retention · Challenge 2 | KEEP | stream | analytics.retention |
| lc-48-0 | Sessionize an event stream · Challenge 1 | KEEP | social | dates.sessions |
| lc-48-1 | Sessionize an event stream · Challenge 2 | KEEP | social | dates.sessions |
| lc-49-0 | Multi-grain joins without fan-out · Challenge 1 | KEEP | ai | joins.fan-out |
| lc-49-1 | Multi-grain joins without fan-out · Challenge 2 | KEEP | ai | joins.fan-out |
| lc-50-0 | Revenue & payment reconciliation · Challenge 1 | KEEP | ai | warehousing.reconciliation |
| lc-50-1 | Revenue & payment reconciliation · Challenge 2 | KEEP | ai | warehousing.reconciliation |
| lc-51-0 | AI usage cost & contribution margin · Challenge 1 | KEEP | ai | analytics.revenue |
| lc-51-1 | AI usage cost & contribution margin · Challenge 2 | KEEP | ai | analytics.revenue |
| lc-52-0 | Experiment conversion denominators · Challenge 1 | KEEP | social | analytics.conversion |
| lc-52-1 | Experiment conversion denominators · Challenge 2 | KEEP | social | analytics.conversion |
| lc-58-0 | DDL: create, alter & inspect a table · Challenge 1 | KEEP | lab | engineering.ddl |
| lc-58-1 | DDL: create, alter & inspect a table · Challenge 2 | KEEP | lab | engineering.ddl |
| lc-59-0 | DML: INSERT, UPDATE & DELETE · Challenge 1 | KEEP | lab | engineering.dml |
| lc-59-1 | DML: INSERT, UPDATE & DELETE · Challenge 2 | KEEP | lab | engineering.dml |
| lc-60-0 | Constraints protect the data contract · Challenge 1 | KEEP | lab | engineering.constraints |
| lc-60-1 | Constraints protect the data contract · Challenge 2 | KEEP | lab | engineering.constraints |
| lc-61-0 | Transactions & savepoint recovery · Challenge 1 | KEEP | lab | engineering.transactions |
| lc-61-1 | Transactions & savepoint recovery · Challenge 2 | KEEP | lab | engineering.transactions |
| lc-62-0 | Views: reusable query definitions · Challenge 1 | KEEP | shop | engineering.views |
| lc-62-1 | Views: reusable query definitions · Challenge 2 | KEEP | shop | engineering.views |
| lc-63-0 | CTEs, CTAS & temporary tables · Challenge 1 | KEEP | shop | engineering.views |
| lc-63-1 | CTEs, CTAS & temporary tables · Challenge 2 | KEEP | shop | engineering.views |
| lc-64-0 | Triggers & visible audit effects · Challenge 1 | KEEP | lab | engineering.views |
| lc-64-1 | Triggers & visible audit effects · Challenge 2 | KEEP | lab | engineering.views |
| lc-65-0 | Stored procedures: parameters & contracts · Challenge 1 | KEEP | shop | engineering.constraints |
| lc-65-1 | Stored procedures: parameters & contracts · Challenge 2 | KEEP | shop | engineering.constraints |
| lc-66-0 | Indexes: observe a real access path · Challenge 1 | KEEP | shop | optimization.indexes |
| lc-66-1 | Indexes: observe a real access path · Challenge 2 | KEEP | shop | optimization.indexes |
| lc-67-0 | SARGable ranges, not speed commandments · Challenge 1 | KEEP | stream | optimization.plans |
| lc-67-1 | SARGable ranges, not speed commandments · Challenge 2 | KEEP | stream | optimization.plans |
| lc-68-0 | Partitioning & workload trade-offs · Challenge 1 | KEEP | warehouse | optimization.plans |
| lc-68-1 | Partitioning & workload trade-offs · Challenge 2 | KEEP | warehouse | optimization.plans |
| lc-75-0 | Review AI-generated SQL with evidence · Challenge 1 | KEEP | ai | optimization.plans |
| lc-75-1 | Review AI-generated SQL with evidence · Challenge 2 | KEEP | ai | optimization.plans |
| lc-69-0 | Bronze: inspect raw data before cleaning · Challenge 1 | KEEP | warehouse | warehousing.layers |
| lc-69-1 | Bronze: inspect raw data before cleaning · Challenge 2 | KEEP | warehouse | warehousing.layers |
| lc-70-0 | Silver: clean, map & deduplicate · Challenge 1 | KEEP | warehouse | warehousing.layers |
| lc-70-1 | Silver: clean, map & deduplicate · Challenge 2 | KEEP | warehouse | warehousing.layers |
| lc-71-0 | Gold: dimensions, facts & quality gates · Challenge 1 | KEEP | warehouse | warehousing.layers |
| lc-71-1 | Gold: dimensions, facts & quality gates · Challenge 2 | KEEP | warehouse | warehousing.layers |
| lc-72-0 | EDA: explore before telling the story · Challenge 1 | KEEP | warehouse | aggregation.basic |
| lc-72-1 | EDA: explore before telling the story · Challenge 2 | KEEP | warehouse | aggregation.basic |
| lc-73-0 | Customer & product reporting contracts · Challenge 1 | KEEP | warehouse | analytics.segmentation |
| lc-73-1 | Customer & product reporting contracts · Challenge 2 | KEEP | warehouse | analytics.segmentation |
| lc-74-0 | Monthly change & cumulative reports · Challenge 1 | KEEP | warehouse | windows.running |
| lc-74-1 | Monthly change & cumulative reports · Challenge 2 | KEEP | warehouse | windows.running |
| lc-76-0 | Reconcile extraction & Bronze ingestion · Challenge 1 | KEEP | integration | warehousing.reconciliation |
| lc-76-1 | Reconcile extraction & Bronze ingestion · Challenge 2 | KEEP | integration | warehousing.reconciliation |
| lc-77-0 | Integrate CRM + ERP with source authority · Challenge 1 | KEEP | integration | warehousing.layers |
| lc-77-1 | Integrate CRM + ERP with source authority · Challenge 2 | KEEP | integration | warehousing.layers |
| lc-78-0 | Product validity with LEAD & half-open intervals · Challenge 1 | KEEP | integration | warehousing.history |
| lc-78-1 | Product validity with LEAD & half-open intervals · Challenge 2 | KEEP | integration | warehousing.history |
| lc-79-0 | Validate calendar dates before converting · Challenge 1 | KEEP | integration | cleaning.validation |
| lc-79-1 | Validate calendar dates before converting · Challenge 2 | KEEP | integration | cleaning.validation |
| lc-80-0 | Quarantine bad rows & reconcile the batch · Challenge 1 | KEEP | integration | warehousing.reconciliation |
| lc-80-1 | Quarantine bad rows & reconcile the batch · Challenge 2 | KEEP | integration | warehousing.reconciliation |
| lc-81-0 | Automated star-schema quality tests · Challenge 1 | KEEP | integration | warehousing.reconciliation |
| lc-81-1 | Automated star-schema quality tests · Challenge 2 | KEEP | integration | warehousing.reconciliation |
| lc-82-0 | Durable surrogate keys across loads · Challenge 1 | KEEP | integration | warehousing.incremental |
| lc-82-1 | Durable surrogate keys across loads · Challenge 2 | KEEP | integration | warehousing.incremental |
| lc-83-0 | Latest-state reporting versus SCD Type 2 · Challenge 1 | KEEP | integration | warehousing.history |
| lc-83-1 | Latest-state reporting versus SCD Type 2 · Challenge 2 | KEEP | integration | warehousing.history |
| lc-84-0 | Idempotent incremental UPSERT & stale updates · Challenge 1 | KEEP | integration | warehousing.incremental |
| lc-84-1 | Idempotent incremental UPSERT & stale updates · Challenge 2 | KEEP | integration | warehousing.incremental |
| lc-85-0 | Stage, validate & atomically promote a refresh · Challenge 1 | KEEP | integration | engineering.transactions |
| lc-85-1 | Stage, validate & atomically promote a refresh · Challenge 2 | KEEP | integration | engineering.transactions |
| lc-86-0 | Protect fact grain when joining versions · Challenge 1 | KEEP | integration | joins.fan-out |
| lc-86-1 | Protect fact grain when joining versions · Challenge 2 | KEEP | integration | joins.fan-out |
| lc-87-0 | Capstone: integrated customers to trusted sales · Challenge 1 | KEEP | integration | warehousing.layers |
| lc-87-1 | Capstone: integrated customers to trusted sales · Challenge 2 | KEEP | integration | warehousing.layers |
| qb-0001 | Shopper contact list | KEEP | market | basics.select |
| qb-0002 | Shoppers in the West region | KEEP | market | filtering.where |
| qb-0003 | Catalog from most to least expensive | KEEP | market | basics.order-by |
| qb-0004 | Orders with no delivery date | KEEP | market | filtering.null |
| qb-0005 | The three cheapest items | KEEP | market | basics.limit |
| qb-0006 | Rename a column | KEEP | org | basics.alias |
| qb-0007 | Office locations | KEEP | org | basics.distinct |
| qb-0008 | Hired during 2023 | KEEP | org | filtering.between |
| qb-0009 | Orders by status | KEEP | market | aggregation.group-by |
| qb-0010 | Items nobody has ordered | KEEP | market | joins.anti |
| qb-0011 | Repeat shoppers | KEEP | market | aggregation.having |
| qb-0012 | Delivered revenue by category | KEEP | market | aggregation.group-by |
| qb-0013 | Signups in the last 30 days | KEEP | market | dates.filter |
| qb-0014 | Emails used more than once | KEEP | market | cleaning.strings |
| qb-0015 | Employees and their departments | KEEP | org | joins.inner |
| qb-0016 | Every employee, with a department label | KEEP | org | joins.left |
| qb-0017 | Find the lamps | KEEP | market | filtering.like |
| qb-0018 | Open orders in February and March | KEEP | market | filtering.logic |
| qb-0019 | Average salary by department | KEEP | org | aggregation.basic |
| qb-0020 | Price bands | KEEP | market | cleaning.case |
| qb-0021 | Active buyers per month | KEEP | market | dates.buckets |
| qb-0022 | How long did delivery take? | KEEP | market | dates.diff |
| qb-0023 | Create a wishlist table | KEEP | market | engineering.ddl |
| qb-0024 | Reprice the garden range | KEEP | market | engineering.dml |
| qb-0025 | Big spenders for their region | KEEP | market | subqueries.correlated |
| qb-0026 | Monthly revenue after refunds | KEEP | market | analytics.revenue |
| qb-0027 | Bestsellers within each category | KEEP | market | windows.rank |
| qb-0028 | Seven-day rolling active shoppers | KEEP | market | windows.rolling |
| qb-0029 | Earning more than the manager | KEEP | org | joins.self |
| qb-0030 | Days with no orders | KEEP | market | dates.series |
| qb-0031 | First order versus latest order | KEEP | market | windows.row-number |
| qb-0032 | Orders whose payments don't match | KEEP | market | joins.fan-out |
| qb-0033 | Order status mix by region | KEEP | market | aggregation.conditional |
| qb-0034 | Loyal shoppers who never needed a refund | KEEP | market | subqueries.exists |
| qb-0035 | Average order value by month | KEEP | market | analytics.revenue |
| qb-0036 | Payroll versus budget | KEEP | org | aggregation.group-by |
| qb-0037 | Keep one account per email | KEEP | market | cleaning.dedupe |
| qb-0038 | A covering index for unit totals | KEEP | market | optimization.indexes |
| qb-0039 | A reusable shopper totals view | KEEP | market | engineering.views |
| qb-0040 | Second-highest salary per department | KEEP | org | windows.rank |
| qb-0041 | Next-month retention by signup cohort | KEEP | market | analytics.retention |
| qb-0042 | Longest login streak | KEEP | market | windows.gaps-islands |
| qb-0043 | Salary at the time of each review | KEEP | org | warehousing.history |
| qb-0044 | Detect overlapping history periods | KEEP | org | cleaning.validation |
| qb-0045 | Management chain for every employee | KEEP | org | subqueries.recursive |
| qb-0046 | Median order value by region | KEEP | market | analytics.statistics |
| qb-0047 | Build a region history from snapshots | KEEP | market | warehousing.history |
| qb-0048 | Reconcile orders, payments and refunds | KEEP | market | warehousing.reconciliation |
| qb-0049 | Design a purchase lookup index | KEEP | market | optimization.indexes |
| qb-0050 | Cover the event export | KEEP | market | optimization.indexes |
| qb-0051 | Make the event-day filter SARGable | KEEP | market | optimization.plans |
| qb-0052 | Top events without a temporary sort | KEEP | market | optimization.plans |
| qb-0053 | Find a truly ordered cart funnel | KEEP | market | analytics.conversion |
| qb-0054 | Identify abandoned checkout attempts | KEEP | market | analytics.conversion |
| qb-0055 | Audit conflicting event retries | KEEP | market | cleaning.dedupe |
| qb-0056 | Sessionize retries and exact boundaries | KEEP | market | dates.sessions |
| qb-0057 | Attribute session conversion to first touch | KEEP | market | analytics.conversion |
| qb-0058 | Build a replay-safe ledger load | KEEP | market | engineering.dml |
| qb-0059 | Enforce the reservation boundary | KEEP | market | engineering.constraints |
| qb-0060 | Recover a failed stock allocation | KEEP | market | engineering.transactions |
| qb-0061 | Measure co-purchased product pairs | KEEP | market | joins.self |
| qb-0062 | Find shoppers in every category | KEEP | market | subqueries.exists |
| qb-0063 | Compare category audience overlap | KEEP | market | joins.fan-out |
| qb-0064 | Parse malformed product codes | KEEP | market | cleaning.strings |
| qb-0065 | Normalize contact import collisions | KEEP | market | cleaning.strings |
| qb-0066 | Parse money into exact integer cents | KEEP | market | cleaning.validation |
| qb-0067 | Checkout review 1: establish the baseline | KEEP | market | analytics.active-users |
| qb-0068 | Checkout review 2: locate funnel drop-off | KEEP | market | analytics.conversion |
| qb-0069 | Checkout review 3: measure the delay tail | KEEP | market | analytics.statistics |
| qb-0070 | Checkout review 4: find later recoveries | KEEP | market | analytics.retention |
| qb-0071 | Checkout review 5: prioritize channel fixes | KEEP | market | analytics.segmentation |
| qb-0072 | Predict: members with and without bookings | KEEP | reasoning | joins.left |
| qb-0073 | Predict: unknown credits in a filter | KEEP | reasoning | filtering.null |
| qb-0074 | Predict: count rows or known values? | KEEP | reasoning | aggregation.group-by |
| qb-0075 | Predict: positions and shared ranks | KEEP | reasoning | windows.rank |
| qb-0076 | Predict: a frame that includes peers | KEEP | reasoning | windows.rolling |
| qb-0077 | Predict: the previous member within a team | KEEP | reasoning | windows.lag-lead |
| qb-0078 | Debug: find members with unknown credits | KEEP | reasoning | filtering.null |
| qb-0079 | Debug: retain members without paid bookings | KEEP | reasoning | joins.left |
| qb-0080 | Debug: count zero bookings correctly | KEEP | reasoning | aggregation.basic |
| qb-0081 | Debug: the second distinct credit balance | KEEP | reasoning | windows.rank |
| qb-0082 | Debug: April bookings at the boundary | KEEP | reasoning | dates.filter |
| qb-0083 | Debug: the last balance in each team | KEEP | reasoning | windows.rolling |
| qb-0084 | Capacity 1: current regional totals | KEEP | capacity | aggregation.group-by |
| qb-0085 | Capacity 2: retain missing and unmapped sites | KEEP | capacity | joins.left |
| qb-0086 | Capacity 3: the next delivery date and all ties | KEEP | capacity | subqueries.cte |
| qb-0087 | Capacity 4: reconcile capacity and incoming supply | KEEP | capacity | joins.multi |
| qb-0088 | Capacity 5: project regional capacity at month end | KEEP | capacity | warehousing.reconciliation |
| qb-0089 | Two temperatures, one station day | ADD | weather | aggregation.conditional |
| qb-0090 | Observation coverage by station | ADD | weather | analytics.statistics |
| qb-0091 | Signed invoice totals | ADD | retail | analytics.revenue |
| qb-0092 | What actually moved money? | ADD | payments | warehousing.reconciliation |
| qb-0093 | Has the whole shipment arrived? | ADD | logistics | subqueries.exists |
| qb-0094 | Repeat reviews, distinct changes | ADD | developer | aggregation.distinct-count |
| qb-0095 | Two measures, one observation stream | ADD | energy | joins.set-ops |
| qb-0096 | Last known daily maximum | ADD | weather | subqueries.correlated |
| qb-0097 | Everyone below a manager | ADD | developer | subqueries.recursive |
| qb-0098 | Reliability bands | ADD | flights | aggregation.conditional |
| qb-0099 | State as of an operational cutoff | ADD | logistics | windows.row-number |
| qb-0100 | Continuous incident coverage | ADD | developer | windows.gaps-islands |
| qb-0101 | Predict: integer and decimal ratios | ADD | energy | aggregation.conditional |
| qb-0102 | Predict: missing tips in an average | ADD | mobility | filtering.null |
| qb-0103 | Predict: a recursive reporting path | ADD | developer | subqueries.recursive |
| qb-0104 | Predict: a date across midnight | ADD | flights | dates.buckets |
| qb-0105 | Predict: duplicate observations in a set | ADD | energy | joins.set-ops |
| qb-0106 | Predict: membership with an unknown alternative | ADD | mobility | filtering.null |
| qb-0107 | Debug: observable tip coverage | ADD | mobility | filtering.null |
| qb-0108 | Debug: delay among operated flights | ADD | flights | aggregation.basic |
| qb-0109 | Debug: forecast accuracy | ADD | energy | analytics.statistics |
| qb-0110 | Debug: teams without repositories | ADD | developer | joins.left |
| qb-0111 | Debug: visits after an observation join | ADD | healthcare | joins.fan-out |
| qb-0112 | Debug: a scan retry is not a new event | ADD | logistics | cleaning.dedupe |
