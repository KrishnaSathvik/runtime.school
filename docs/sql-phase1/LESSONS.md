# Individual lesson audit

All 88 IDs and their two challenge IDs remain stable. MIGRATE retains the reviewed learning objective while moving schema and execution to the canonical domain; REWRITE changes the teaching or transfer task. Nothing was retired. Each note evaluates the two challenges together, including intentional consolidation. The companion audit.json records the reviewed concept, worked examples, hints, quiz and answers for every lesson.

| ID | Lesson | Decision | Dataset | Review |
| --- | --- | --- | --- | --- |
| 0 | Meet your first SELECT | MIGRATE | Retail | Two projections reinforce column selection before filters; small customer and product schemas remain appropriate. |
| 1 | Aliases & calculated columns | MIGRATE | Retail | Transfers a calculated alias from money to quantity without introducing aggregation; quiz distinguishes output from mutation. |
| 3 | Filter with WHERE | REWRITE | Retail | Replaces a second city-equality task with status filtering on purchase lines; changes the row grain without a syntax jump. |
| 4 | Comparisons & ranges | MIGRATE | Retail | Single lower bound transfers to an inclusive two-sided range; exact endpoints matter. |
| 5 | Combine conditions | MIGRATE | Retail | Conjunction transfers to a grouped disjunction; parentheses and precedence add useful reasoning. |
| 6 | Lists & text patterns | MIGRATE | Retail | Prefix matching transfers to an explicit membership list; neither requires joins. |
| 7 | Understand NULL | MIGRATE | Retail | Detection of missing values transfers to display fallback; quiz checks UNKNOWN rather than treating NULL as text. |
| 8 | Sort & limit | MIGRATE | Retail | Descending and ascending limits are intentional early repetition; the quiz introduces deterministic tie-breaking. |
| 2 | Unique values with DISTINCT | MIGRATE | Retail | City NULL versus category values reinforces distinctness on two small columns. |
| 9 | COUNT, SUM & AVG | MIGRATE | Retail | Row count transfers to quantity sum; quiz separates COUNT(*) from COUNT(nullable_column). |
| 10 | Group into summaries | MIGRATE | Retail | Category counts transfer to status totals; both explicitly change the result grain. |
| 30 | MIN, MAX & the grain of a result | MIGRATE | Product / SaaS Analytics | Global MIN/MAX transfers to grouped maxima; quiz checks the one-row global summary grain. |
| 11 | Filter groups with HAVING | MIGRATE | Retail | Count-based HAVING transfers to a quantity threshold; filtering groups is the common concept. |
| 12 | Make decisions with CASE | MIGRATE | Retail | Text classification transfers to a numeric indicator; ELSE and equality boundaries are explicit. |
| 13 | Conditional aggregation | MIGRATE | Weather | Weather count transfers to conditional Celsius averaging; missing/flagged values must not become zero. |
| 56 | CAST & numeric measurements | REWRITE | IoT / Sensors | Sensor CAST transfers to numeric deviation with Celsius units; quiz now warns that coercion is not validation. |
| 54 | Databases, schemas, tables & keys | MIGRATE | Retail | Schema inspection transfers to a real key-based join; canonical table names now agree with sqlite_schema. |
| 14 | Connect tables with JOIN | MIGRATE | Retail | Two foreign-key joins intentionally reinforce relationship direction before outer joins. |
| 15 | Keep unmatched rows | MIGRATE | Retail | Preserving all customers transfers to selecting only unmatched customers; COUNT(key) is essential. |
| 32 | Ratios, ROUND & NULLIF | MIGRATE | Product / SaaS Analytics | Observed-account rates transfer to the full account population; no-request denominators remain NULL. |
| 16 | Revenue across tables | MIGRATE | Retail | Customer revenue transfers to category revenue; purchase-line grain is stated and price multiplication precedes aggregation. |
| 34 | Self-joins & manager relationships | REWRITE | Developer Platform | Developer manager roles replace referral labels; transfer compares employee and direct-manager salaries after joining. |
| 35 | CROSS JOIN & a complete date grid | MIGRATE | Product / SaaS Analytics | A provided date list teaches Cartesian grids before recursion; challenge 2 adds signup eligibility and stays lesson-only. |
| 36 | FULL OUTER JOIN & unmatched records | MIGRATE | Product / SaaS Analytics | Matched and unmatched invoice/payment rows transfer to orphan detection; split payments remain separate rows. |
| 37 | ON versus WHERE in a LEFT JOIN | REWRITE | Healthcare | Healthcare provider counts transfer to the registered-patient denominator; ON filtering and COUNT(key) preserve zero groups. |
| 19 | Combine sets with UNION | MIGRATE | Retail | UNION versus UNION ALL intentionally contrast set and bag behavior; duplicates are the transfer edge case. |
| 38 | INTERSECT & EXCEPT | MIGRATE | Product / SaaS Analytics | INTERSECT and EXCEPT contrast shared membership with one-sided exclusion; each output is distinct. |
| 17 | Subqueries | REWRITE | Retail | Replaces a second overall average with an own-category correlated benchmark; explanation and quiz now teach correlation. |
| 18 | Ask whether a row exists | MIGRATE | Retail | EXISTS versus NOT EXISTS intentionally contrast positive and negative quantification without fan-out. |
| 31 | NOT IN and the NULL trap | MIGRATE | Product / SaaS Analytics | Nullable anti-membership transfers to a known-country exclusion; lesson makes UNKNOWN explicit. |
| 20 | Readable queries with CTEs | MIGRATE | Retail | Two named aggregate CTEs reinforce decomposition before windows; no unnecessary staging tables. |
| 26 | Dates & monthly analysis | REWRITE | Mobility | Mobility pickup-month trip counts transfer to card meter-fare totals; pickup time, cents and tips are distinguished. |
| 33 | Clean strings & cast values | MIGRATE | Product / SaaS Analytics | Normalization transfers to domain extraction; preserving NULL is explicit, and this is not general email validation. |
| 39 | Date boundaries & monthly buckets | REWRITE | U.S. Flights | Flight schedule boundaries use explicit UTC half-open intervals; transfer counts distinct scheduled aircraft by month. |
| 21 | Window functions: ROW_NUMBER | MIGRATE | Retail | Chronological row numbering transfers to partitioned price ordering with deterministic ties. |
| 22 | RANK & DENSE_RANK | REWRITE | Sports | Sports goal ranking includes unused players; transfer ranks within teams and distinguishes RANK from DENSE_RANK. |
| 23 | Running totals | REWRITE | Finance / Payments | Payments cumulative posted debits transfer from global to account partitions; explicitly excludes refunds and starting balance. |
| 55 | Logical query processing & row grain | MIGRATE | Retail | Grouped totals contrast with a window retaining every input row; the quiz tests logical WHERE order. |
| 24 | Compare rows with LAG | MIGRATE | U.S. Flights | Flight predecessor selection transfers from all scheduled rows to operated rows before LAG; cancellations change membership. |
| 25 | Latest row per group | MIGRATE | Retail | Latest-per-customer transfers to highest-per-category with a different tie rule. |
| 40 | LEAD & the next event | REWRITE | Logistics | Logistics LEAD uses physical time and an id tie-breaker; transfer calculates seconds and retains final NULLs and raw retries. |
| 41 | FIRST_VALUE, LAST_VALUE & frames | REWRITE | IoT / Sensors | IoT full-frame LAST_VALUE transfers to deviation from FIRST_VALUE; default frame and baseline semantics differ. |
| 42 | Rolling averages & missing dates | REWRITE | Weather | Weather observed-row averaging transfers to a complete calendar; absent temperatures stay unknown rather than invented zeros. |
| 43 | Share of total with windows | REWRITE | Energy | Energy global fuel share transfers to regional denominators; ratio of sums and zero-denominator handling are explicit. |
| 53 | Top N per group & ties | MIGRATE | Product / SaaS Analytics | Exactly two items transfers to all top ties; ROW_NUMBER and DENSE_RANK answer different business contracts. |
| 57 | NTILE & balanced ranking buckets | REWRITE | Sports | Sports appearance buckets transfer from league-wide to team partitions; NTILE can split equal minutes. |
| 27 | Recursive CTEs | MIGRATE | Developer Platform | Recursive numeric anchor transfers to a multi-level developer hierarchy; acyclic input is a declared assumption. |
| 28 | Query plans & indexes | MIGRATE | Retail | Keeps SQLite plan inspection conceptual; these two tasks stay lesson-only because they require Explain mode. |
| 29 | Capstone: customer insights | MIGRATE | Retail | Capstone combines joins, aggregates and dense ranking at two reporting grains; repetition is deliberate synthesis. |
| 44 | Deduplicate event retries | MIGRATE | Product / SaaS Analytics | Latest ingestion per event key transfers to summaries after deduplication; id resolves ingestion-time ties. |
| 45 | Daily active users & engagement | MIGRATE | Product / SaaS Analytics | Distinct daily audience transfers to minutes per active viewer; numerator and denominator share the same day population. |
| 46 | Ordered conversion funnels | MIGRATE | Product / SaaS Analytics | Ordered funnel counts transfer to member-level evidence; earliest valid next steps prevent unordered event membership shortcuts. |
| 47 | Cohorts & exact-day retention | MIGRATE | Product / SaaS Analytics | D1 and D7 are intentional repetition because cohort maturity changes at the fixed observation cutoff; second stays lesson-only. |
| 48 | Sessionize an event stream | MIGRATE | Product / SaaS Analytics | Session counts transfer to row-level labels; first row and exact 30-minute boundaries are stated, second stays lesson-only. |
| 49 | Multi-grain joins without fan-out | MIGRATE | Product / SaaS Analytics | Request count transfers to successful tokens while independently aggregated invoices preserve account grain. |
| 50 | Revenue & payment reconciliation | MIGRATE | Product / SaaS Analytics | Invoice reconciliation transfers to exceptions-only output; shared definition is retained and second stays lesson-only. |
| 51 | AI usage cost & contribution margin | MIGRATE | Product / SaaS Analytics | Model costs transfer to account contribution margin in a fixed month; fictional prices and non-profit limitation are explicit. |
| 52 | Experiment conversion denominators | MIGRATE | Product / SaaS Analytics | Assigned-user conversion rates transfer to per-assignment flags; the same post-assignment rule preserves the denominator. |
| 58 | DDL: create, alter & inspect a table | MIGRATE | Logistics | Two DDL shapes intentionally reinforce structural changes and schema inspection before data mutation. |
| 59 | DML: INSERT, UPDATE & DELETE | MIGRATE | Logistics | Targeted insertion/update/delete transfers to predicate-based bulk changes on isolated logistics inventory. |
| 60 | Constraints protect the data contract | MIGRATE | Logistics | Nonnegative quantity and unique email test different constraints; NULL requires its own NOT NULL contract. |
| 61 | Transactions & savepoint recovery | MIGRATE | Logistics | Whole-transaction rollback transfers to savepoint recovery with earlier pending changes preserved. |
| 62 | Views: reusable query definitions | MIGRATE | Retail | Row-filtering view transfers to grouped totals view; validators check object behavior rather than copied output. |
| 63 | CTEs, CTAS & temporary tables | MIGRATE | Retail | Two TEMP materializations reinforce persistence within the connection versus a statement-only CTE. |
| 64 | Triggers & visible audit effects | MIGRATE | Logistics | Single-row trigger exercise transfers to multi-row updates and audit effects; second needs the first trigger definition. |
| 65 | Stored procedures: parameters & contracts | MIGRATE | Retail | Keeps SQL Server procedure syntax as reference only; executable SQLite tasks practice retrieval contracts and parameter transfer. |
| 66 | Indexes: observe a real access path | MIGRATE | Retail | Two indexes reinforce observing actual access paths; no unsupported speed claim from a tiny fixture. |
| 67 | SARGable ranges, not speed commandments | MIGRATE | Product / SaaS Analytics | Month range transfers to an inclusive named-day interval expressed with an exclusive endpoint; same access-path reasoning is intentional. |
| 68 | Partitioning & workload trade-offs | MIGRATE | Retail | Filtering a month transfers to bucketing all months; no physical partition elimination is claimed for SQLite. |
| 75 | Review AI-generated SQL with evidence | MIGRATE | Product / SaaS Analytics | COUNT(*) fan-out diagnosis transfers to integer-division and denominator diagnosis; plans alone cannot prove metric correctness. |
| 69 | Bronze: inspect raw data before cleaning | MIGRATE | Retail | Duplicate-key profiling transfers to invalid-date profiling without changing raw evidence. |
| 70 | Silver: clean, map & deduplicate | MIGRATE | Retail | Builds cleaned latest customer rows, then summarizes mapped countries; second retains its prerequisite TEMP-table contract. |
| 71 | Gold: dimensions, facts & quality gates | MIGRATE | Retail | Accepted fact construction transfers to reconciliation of rejected rows; state validation checks the built table. |
| 72 | EDA: explore before telling the story | MIGRATE | Retail | Basic extent/count/total profiling transfers to a metric-union report; literal output labels remain part of the contract. |
| 73 | Customer & product reporting contracts | MIGRATE | Retail | Customer recency transfers to product segmentation while preserving inactive dimensions; zero totals differ from NULL recency. |
| 74 | Monthly change & cumulative reports | MIGRATE | Retail | Monthly cumulative sales transfer to percentage change; comparison is previous observed month, not necessarily previous calendar month. |
| 76 | Reconcile extraction & Bronze ingestion | MIGRATE | Retail | Extraction row-count reconciliation transfers to invalid-key evidence; a matching total alone does not establish mapping correctness. |
| 77 | Integrate CRM + ERP with source authority | MIGRATE | Retail | Source-authority integration transfers to grouped resolved values; explicit CRM precedence and fallback remain necessary context. |
| 78 | Product validity with LEAD & half-open intervals | MIGRATE | Retail | Next-start validity intervals transfer to an as-of lookup; inclusive start and exclusive end avoid duplicate ownership. |
| 79 | Validate calendar dates before converting | MIGRATE | Retail | Format-plus-calendar validation transfers to rejected-row selection; date-shaped invalid dates are explicitly tested. |
| 80 | Quarantine bad rows & reconcile the batch | MIGRATE | Retail | Reasoned quarantine transfers to accepted/rejected reconciliation; each source row must belong to exactly one outcome. |
| 81 | Automated star-schema quality tests | MIGRATE | Retail | Four independent quality counts transfer to a publish gate; zero orphans alone is insufficient. |
| 82 | Durable surrogate keys across loads | MIGRATE | Retail | An earlier-sorting natural key must not renumber durable keys; updating an existing entity must preserve identity. |
| 83 | Latest-state reporting versus SCD Type 2 | MIGRATE | Retail | Current-state reporting transfers to sale-time history; distinct interval membership changes the business answer. |
| 84 | Idempotent incremental UPSERT & stale updates | MIGRATE | Retail | Batch replay checks idempotency and stale-update rejection; second checks unchanged surrogate keys. |
| 85 | Stage, validate & atomically promote a refresh | MIGRATE | Retail | Interrupted promotion rollback contrasts with a successful atomic refresh; state checks distinguish the outcomes. |
| 86 | Protect fact grain when joining versions | MIGRATE | Retail | Current-country aggregation contrasts with historical-country attribution; each protects fact grain against version fan-out. |
| 87 | Capstone: integrated customers to trusted sales | MIGRATE | Retail | Integrated customer reporting transfers to country totals; shared validated TEMP outputs support deliberate capstone consolidation. |
