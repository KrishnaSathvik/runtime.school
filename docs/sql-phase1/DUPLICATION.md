# Challenge duplication review

Each lesson pair is reviewed below. Structural similarity is a diagnostic: a high score does not distinguish a necessary NULL/tie/frame variation from filler. Fourteen lessons were rewritten; two bank exercises were rewritten for independent benchmarks and native SaaS activation. Remaining repetition in foundational clauses, rollback versus commit, set/bag semantics and parameterized reporting is intentional. Same-context second challenges remain lesson-only when they depend on a prior definition.

| Lesson | SQL skeleton similarity | Judgment |
| --- | --- | --- |
| 0 | 1.00 | Two projections reinforce column selection before filters; small customer and product schemas remain appropriate. |
| 1 | 1.00 | Transfers a calculated alias from money to quantity without introducing aggregation; quiz distinguishes output from mutation. |
| 3 | 1.00 | Replaces a second city-equality task with status filtering on purchase lines; changes the row grain without a syntax jump. |
| 4 | 0.43 | Single lower bound transfers to an inclusive two-sided range; exact endpoints matter. |
| 5 | 0.21 | Conjunction transfers to a grouped disjunction; parentheses and precedence add useful reasoning. |
| 6 | 0.11 | Prefix matching transfers to an explicit membership list; neither requires joins. |
| 7 | 0.00 | Detection of missing values transfers to display fallback; quiz checks UNKNOWN rather than treating NULL as text. |
| 8 | 0.50 | Descending and ascending limits are intentional early repetition; the quiz introduces deterministic tie-breaking. |
| 2 | 1.00 | City NULL versus category values reinforces distinctness on two small columns. |
| 9 | 0.22 | Row count transfers to quantity sum; quiz separates COUNT(*) from COUNT(nullable_column). |
| 10 | 0.42 | Category counts transfer to status totals; both explicitly change the result grain. |
| 30 | 0.45 | Global MIN/MAX transfers to grouped maxima; quiz checks the one-row global summary grain. |
| 11 | 0.41 | Count-based HAVING transfers to a quantity threshold; filtering groups is the common concept. |
| 12 | 0.73 | Text classification transfers to a numeric indicator; ELSE and equality boundaries are explicit. |
| 13 | 0.38 | Weather count transfers to conditional Celsius averaging; missing/flagged values must not become zero. |
| 56 | 0.31 | Sensor CAST transfers to numeric deviation with Celsius units; quiz now warns that coercion is not validation. |
| 54 | 0.00 | Schema inspection transfers to a real key-based join; canonical table names now agree with sqlite_schema. |
| 14 | 1.00 | Two foreign-key joins intentionally reinforce relationship direction before outer joins. |
| 15 | 0.24 | Preserving all customers transfers to selecting only unmatched customers; COUNT(key) is essential. |
| 32 | 0.73 | Observed-account rates transfer to the full account population; no-request denominators remain NULL. |
| 16 | 0.88 | Customer revenue transfers to category revenue; purchase-line grain is stated and price multiplication precedes aggregation. |
| 34 | 0.55 | Developer manager roles replace referral labels; transfer compares employee and direct-manager salaries after joining. |
| 35 | 0.82 | A provided date list teaches Cartesian grids before recursion; challenge 2 adds signup eligibility and stays lesson-only. |
| 36 | 0.31 | Matched and unmatched invoice/payment rows transfer to orphan detection; split payments remain separate rows. |
| 37 | 1.00 | Healthcare provider counts transfer to the registered-patient denominator; ON filtering and COUNT(key) preserve zero groups. |
| 19 | 0.13 | UNION versus UNION ALL intentionally contrast set and bag behavior; duplicates are the transfer edge case. |
| 38 | 0.43 | INTERSECT and EXCEPT contrast shared membership with one-sided exclusion; each output is distinct. |
| 17 | 0.77 | Replaces a second overall average with an own-category correlated benchmark; explanation and quiz now teach correlation. |
| 18 | 0.73 | EXISTS versus NOT EXISTS intentionally contrast positive and negative quantification without fan-out. |
| 31 | 0.14 | Nullable anti-membership transfers to a known-country exclusion; lesson makes UNKNOWN explicit. |
| 20 | 0.78 | Two named aggregate CTEs reinforce decomposition before windows; no unnecessary staging tables. |
| 26 | 0.45 | Mobility pickup-month trip counts transfer to card meter-fare totals; pickup time, cents and tips are distinguished. |
| 33 | 0.53 | Normalization transfers to domain extraction; preserving NULL is explicit, and this is not general email validation. |
| 39 | 0.00 | Flight schedule boundaries use explicit UTC half-open intervals; transfer counts distinct scheduled aircraft by month. |
| 21 | 0.82 | Chronological row numbering transfers to partitioned price ordering with deterministic ties. |
| 22 | 0.79 | Sports goal ranking includes unused players; transfer ranks within teams and distinguishes RANK from DENSE_RANK. |
| 23 | 0.58 | Payments cumulative posted debits transfer from global to account partitions; explicitly excludes refunds and starting balance. |
| 55 | 0.35 | Grouped totals contrast with a window retaining every input row; the quiz tests logical WHERE order. |
| 24 | 0.88 | Flight predecessor selection transfers from all scheduled rows to operated rows before LAG; cancellations change membership. |
| 25 | 0.89 | Latest-per-customer transfers to highest-per-category with a different tie rule. |
| 40 | 0.68 | Logistics LEAD uses physical time and an id tie-breaker; transfer calculates seconds and retains final NULLs and raw retries. |
| 41 | 0.46 | IoT full-frame LAST_VALUE transfers to deviation from FIRST_VALUE; default frame and baseline semantics differ. |
| 42 | 0.59 | Weather observed-row averaging transfers to a complete calendar; absent temperatures stay unknown rather than invented zeros. |
| 43 | 0.81 | Energy global fuel share transfers to regional denominators; ratio of sums and zero-denominator handling are explicit. |
| 53 | 0.79 | Exactly two items transfers to all top ties; ROW_NUMBER and DENSE_RANK answer different business contracts. |
| 57 | 0.65 | Sports appearance buckets transfer from league-wide to team partitions; NTILE can split equal minutes. |
| 27 | 0.36 | Recursive numeric anchor transfers to a multi-level developer hierarchy; acyclic input is a declared assumption. |
| 28 | 0.40 | Keeps SQLite plan inspection conceptual; these two tasks stay lesson-only because they require Explain mode. |
| 29 | 0.88 | Capstone combines joins, aggregates and dense ranking at two reporting grains; repetition is deliberate synthesis. |
| 44 | 0.76 | Latest ingestion per event key transfers to summaries after deduplication; id resolves ingestion-time ties. |
| 45 | 0.63 | Distinct daily audience transfers to minutes per active viewer; numerator and denominator share the same day population. |
| 46 | 0.74 | Ordered funnel counts transfer to member-level evidence; earliest valid next steps prevent unordered event membership shortcuts. |
| 47 | 1.00 | D1 and D7 are intentional repetition because cohort maturity changes at the fixed observation cutoff; second stays lesson-only. |
| 48 | 0.87 | Session counts transfer to row-level labels; first row and exact 30-minute boundaries are stated, second stays lesson-only. |
| 49 | 0.78 | Request count transfers to successful tokens while independently aggregated invoices preserve account grain. |
| 50 | 0.79 | Invoice reconciliation transfers to exceptions-only output; shared definition is retained and second stays lesson-only. |
| 51 | 0.43 | Model costs transfer to account contribution margin in a fixed month; fictional prices and non-profit limitation are explicit. |
| 52 | 0.50 | Assigned-user conversion rates transfer to per-assignment flags; the same post-assignment rule preserves the denominator. |
| 58 | 0.73 | Two DDL shapes intentionally reinforce structural changes and schema inspection before data mutation. |
| 59 | 0.30 | Targeted insertion/update/delete transfers to predicate-based bulk changes on isolated logistics inventory. |
| 60 | 0.52 | Nonnegative quantity and unique email test different constraints; NULL requires its own NOT NULL contract. |
| 61 | 0.36 | Whole-transaction rollback transfers to savepoint recovery with earlier pending changes preserved. |
| 62 | 0.29 | Row-filtering view transfers to grouped totals view; validators check object behavior rather than copied output. |
| 63 | 0.76 | Two TEMP materializations reinforce persistence within the connection versus a statement-only CTE. |
| 64 | 0.71 | Single-row trigger exercise transfers to multi-row updates and audit effects; second needs the first trigger definition. |
| 65 | 0.71 | Keeps SQL Server procedure syntax as reference only; executable SQLite tasks practice retrieval contracts and parameter transfer. |
| 66 | 1.00 | Two indexes reinforce observing actual access paths; no unsupported speed claim from a tiny fixture. |
| 67 | 1.00 | Month range transfers to an inclusive named-day interval expressed with an exclusive endpoint; same access-path reasoning is intentional. |
| 68 | 0.00 | Filtering a month transfers to bucketing all months; no physical partition elimination is claimed for SQLite. |
| 75 | 0.38 | COUNT(*) fan-out diagnosis transfers to integer-division and denominator diagnosis; plans alone cannot prove metric correctness. |
| 69 | 0.08 | Duplicate-key profiling transfers to invalid-date profiling without changing raw evidence. |
| 70 | 0.86 | Builds cleaned latest customer rows, then summarizes mapped countries; second retains its prerequisite TEMP-table contract. |
| 71 | 0.79 | Accepted fact construction transfers to reconciliation of rejected rows; state validation checks the built table. |
| 72 | 0.36 | Basic extent/count/total profiling transfers to a metric-union report; literal output labels remain part of the contract. |
| 73 | 0.50 | Customer recency transfers to product segmentation while preserving inactive dimensions; zero totals differ from NULL recency. |
| 74 | 0.62 | Monthly cumulative sales transfer to percentage change; comparison is previous observed month, not necessarily previous calendar month. |
| 76 | 0.06 | Extraction row-count reconciliation transfers to invalid-key evidence; a matching total alone does not establish mapping correctness. |
| 77 | 0.93 | Source-authority integration transfers to grouped resolved values; explicit CRM precedence and fallback remain necessary context. |
| 78 | 0.42 | Next-start validity intervals transfer to an as-of lookup; inclusive start and exclusive end avoid duplicate ownership. |
| 79 | 0.83 | Format-plus-calendar validation transfers to rejected-row selection; date-shaped invalid dates are explicitly tested. |
| 80 | 0.51 | Reasoned quarantine transfers to accepted/rejected reconciliation; each source row must belong to exactly one outcome. |
| 81 | 0.77 | Four independent quality counts transfer to a publish gate; zero orphans alone is insufficient. |
| 82 | 0.25 | An earlier-sorting natural key must not renumber durable keys; updating an existing entity must preserve identity. |
| 83 | 0.17 | Current-state reporting transfers to sale-time history; distinct interval membership changes the business answer. |
| 84 | 0.95 | Batch replay checks idempotency and stale-update rejection; second checks unchanged surrogate keys. |
| 85 | 0.67 | Interrupted promotion rollback contrasts with a successful atomic refresh; state checks distinguish the outcomes. |
| 86 | 0.57 | Current-country aggregation contrasts with historical-country attribution; each protects fact grain against version fan-out. |
| 87 | 0.97 | Integrated customer reporting transfers to country totals; shared validated TEMP outputs support deliberate capstone consolidation. |
