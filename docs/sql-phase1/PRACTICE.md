# Individual Practice audit

All 288 pre-phase exercise IDs remain stable. Two new independent patterns are added: timed sensor islands and reciprocal home/away relationships. The existing activation-funnel question moves to Product / SaaS Analytics with signup, project and invitation roles, making all twelve domains independently practiceable. The manager salary question now also requires an own-department benchmark, so it transfers beyond lesson 34. MIGRATE means canonical identity/fixture migration, including unchanged SQL when the schema already fits. The 176 lesson challenges inherit their individual lesson review; the 114 standalone questions have independent objectives, difficulty reasons and rejected counterexamples below. No question was retired: early repeated syntax is deliberate practice, while later exercises have distinct grains, boundaries or state contracts.

## lc-0-0: Meet your first SELECT · Challenge 1

**MIGRATE · Retail · warmup · write**

Two projections reinforce column selection before filters; small customer and product schemas remain appropriate.

Task: Show the name and city of every customer.

Edge contracts: see the linked lesson review and its quiz.





## lc-0-1: Meet your first SELECT · Challenge 2

**MIGRATE · Retail · warmup · write**

Two projections reinforce column selection before filters; small customer and product schemas remain appropriate.

Task: Show the name and price of every product.

Edge contracts: see the linked lesson review and its quiz.





## lc-1-0: Aliases & calculated columns · Challenge 1

**MIGRATE · Retail · warmup · write**

Transfers a calculated alias from money to quantity without introducing aggregation; quiz distinguishes output from mutation.

Task: Return name and price * 2 as double_price for every product.

Edge contracts: see the linked lesson review and its quiz.





## lc-1-1: Aliases & calculated columns · Challenge 2

**MIGRATE · Retail · warmup · write**

Transfers a calculated alias from money to quantity without introducing aggregation; quiz distinguishes output from mutation.

Task: Return id and quantity * 10 as units_times_ten for every order.

Edge contracts: see the linked lesson review and its quiz.





## lc-3-0: Filter with WHERE · Challenge 1

**REWRITE · Retail · warmup · write**

Replaces a second city-equality task with status filtering on purchase lines; changes the row grain without a syntax jump.

Task: Show name and city for store_customers in Chicago.

Edge contracts: see the linked lesson review and its quiz.





## lc-3-1: Filter with WHERE · Challenge 2

**REWRITE · Retail · warmup · write**

Replaces a second city-equality task with status filtering on purchase lines; changes the row grain without a syntax jump.

Task: Show id and quantity for cancelled purchase lines in store_orders.

Edge contracts: see the linked lesson review and its quiz.





## lc-4-0: Comparisons & ranges · Challenge 1

**MIGRATE · Retail · warmup · write**

Single lower bound transfers to an inclusive two-sided range; exact endpoints matter.

Task: Show name and price for store_products priced at least 45.

Edge contracts: see the linked lesson review and its quiz.





## lc-4-1: Comparisons & ranges · Challenge 2

**MIGRATE · Retail · warmup · write**

Single lower bound transfers to an inclusive two-sided range; exact endpoints matter.

Task: Show name and price for store_products priced between 12 and 80 inclusive.

Edge contracts: see the linked lesson review and its quiz.





## lc-5-0: Combine conditions · Challenge 1

**MIGRATE · Retail · warmup · write**

Conjunction transfers to a grouped disjunction; parentheses and precedence add useful reasoning.

Task: Show name and price for Tech store_products costing less than 100.

Edge contracts: see the linked lesson review and its quiz.





## lc-5-1: Combine conditions · Challenge 2

**MIGRATE · Retail · warmup · write**

Conjunction transfers to a grouped disjunction; parentheses and precedence add useful reasoning.

Task: Show name and price for Home or Stationery store_products costing at least 12.

Edge contracts: see the linked lesson review and its quiz.





## lc-6-0: Lists & text patterns · Challenge 1

**MIGRATE · Retail · warmup · write**

Prefix matching transfers to an explicit membership list; neither requires joins.

Task: Show name for store_customers whose name starts with A.

Edge contracts: see the linked lesson review and its quiz.





## lc-6-1: Lists & text patterns · Challenge 2

**MIGRATE · Retail · warmup · write**

Prefix matching transfers to an explicit membership list; neither requires joins.

Task: Show name and city for store_customers in Austin or Seattle.

Edge contracts: see the linked lesson review and its quiz.





## lc-7-0: Understand NULL · Challenge 1

**MIGRATE · Retail · warmup · write**

Detection of missing values transfers to display fallback; quiz checks UNKNOWN rather than treating NULL as text.

Task: Show name for store_customers whose city is missing.

Edge contracts: see the linked lesson review and its quiz.





## lc-7-1: Understand NULL · Challenge 2

**MIGRATE · Retail · warmup · write**

Detection of missing values transfers to display fallback; quiz checks UNKNOWN rather than treating NULL as text.

Task: Return name and city, replacing missing city with Unknown (alias the column city).

Edge contracts: see the linked lesson review and its quiz.





## lc-8-0: Sort & limit · Challenge 1

**MIGRATE · Retail · warmup · write**

Descending and ascending limits are intentional early repetition; the quiz introduces deterministic tie-breaking.

Task: Show name and price of the 3 most expensive store_products, highest price first.

Edge contracts: see the linked lesson review and its quiz.





## lc-8-1: Sort & limit · Challenge 2

**MIGRATE · Retail · warmup · write**

Descending and ascending limits are intentional early repetition; the quiz introduces deterministic tie-breaking.

Task: Show name and price of the 2 cheapest store_products, lowest price first.

Edge contracts: see the linked lesson review and its quiz.





## lc-2-0: Unique values with DISTINCT · Challenge 1

**MIGRATE · Retail · warmup · write**

City NULL versus category values reinforces distinctness on two small columns.

Task: Show each distinct customer city, including NULL.

Edge contracts: see the linked lesson review and its quiz.





## lc-2-1: Unique values with DISTINCT · Challenge 2

**MIGRATE · Retail · warmup · write**

City NULL versus category values reinforces distinctness on two small columns.

Task: Show each distinct product category.

Edge contracts: see the linked lesson review and its quiz.





## lc-9-0: COUNT, SUM & AVG · Challenge 1

**MIGRATE · Retail · easy · write**

Row count transfers to quantity sum; quiz separates COUNT(*) from COUNT(nullable_column).

Task: Return the number of store_customers as customer_count.

Edge contracts: see the linked lesson review and its quiz.





## lc-9-1: COUNT, SUM & AVG · Challenge 2

**MIGRATE · Retail · easy · write**

Row count transfers to quantity sum; quiz separates COUNT(*) from COUNT(nullable_column).

Task: Return total order quantity as total_units.

Edge contracts: see the linked lesson review and its quiz.





## lc-10-0: Group into summaries · Challenge 1

**MIGRATE · Retail · easy · write**

Category counts transfer to status totals; both explicitly change the result grain.

Task: Show category and product_count for each product category.

Edge contracts: see the linked lesson review and its quiz.





## lc-10-1: Group into summaries · Challenge 2

**MIGRATE · Retail · easy · write**

Category counts transfer to status totals; both explicitly change the result grain.

Task: Show status and total_units (sum of quantity) for each order status.

Edge contracts: see the linked lesson review and its quiz.





## lc-30-0: MIN, MAX & the grain of a result · Challenge 1

**MIGRATE · Product / SaaS Analytics · easy · write**

Global MIN/MAX transfers to grouped maxima; quiz checks the one-row global summary grain.

Task: Return shortest_watch and longest_watch: minimum and maximum watch_seconds across all watch events.

Edge contracts: see the linked lesson review and its quiz.





## lc-30-1: MIN, MAX & the grain of a result · Challenge 2

**MIGRATE · Product / SaaS Analytics · easy · write**

Global MIN/MAX transfers to grouped maxima; quiz checks the one-row global summary grain.

Task: Return video_id and longest_watch: maximum watch_seconds for each video that has events.

Edge contracts: see the linked lesson review and its quiz.





## lc-11-0: Filter groups with HAVING · Challenge 1

**MIGRATE · Retail · easy · write**

Count-based HAVING transfers to a quantity threshold; filtering groups is the common concept.

Task: Show customer_id and order_count for store_customers with at least 2 store_orders.

Edge contracts: see the linked lesson review and its quiz.





## lc-11-1: Filter groups with HAVING · Challenge 2

**MIGRATE · Retail · easy · write**

Count-based HAVING transfers to a quantity threshold; filtering groups is the common concept.

Task: Show customer_id and total_units for store_customers with total quantity greater than 3.

Edge contracts: see the linked lesson review and its quiz.





## lc-12-0: Make decisions with CASE · Challenge 1

**MIGRATE · Retail · warmup · write**

Text classification transfers to a numeric indicator; ELSE and equality boundaries are explicit.

Task: Show name and tier: Premium if price >= 80, otherwise Standard.

Edge contracts: see the linked lesson review and its quiz.





## lc-12-1: Make decisions with CASE · Challenge 2

**MIGRATE · Retail · warmup · write**

Text classification transfers to a numeric indicator; ELSE and equality boundaries are explicit.

Task: Show id and is_paid: 1 for paid store_orders, otherwise 0.

Edge contracts: see the linked lesson review and its quiz.





## lc-13-0: Conditional aggregation · Challenge 1

**MIGRATE · Weather · easy · write**

Weather count transfers to conditional Celsius averaging; missing/flagged values must not become zero.

Task: Return wet_observations: the number of daily_weather rows with element PRCP, raw_value greater than zero and no quality_flag. A missing value does not count as wet.

Edge contracts: see the linked lesson review and its quiz.





## lc-13-1: Conditional aggregation · Challenge 2

**MIGRATE · Weather · medium · write**

Weather count transfers to conditional Celsius averaging; missing/flagged values must not become zero.

Task: For every station_id present in daily_weather, return station_id and avg_tmax_c: the average usable TMAX in Celsius, rounded to two decimals. A usable value has quality_flag NULL and raw_value non-NULL. Divide raw tenths by 10.0. Preserve NULL if no usable TMAX exists; do not average other elements as zeros.

Edge contracts: see the linked lesson review and its quiz.





## lc-56-0: CAST & numeric measurements · Challenge 1

**REWRITE · IoT / Sensors · warmup · write**

Sensor CAST transfers to numeric deviation with Celsius units; quiz now warns that coercion is not validation.

Task: Return device_id, observed_at and temperature_text by casting temperature_c to TEXT for every sensor reading.

Edge contracts: see the linked lesson review and its quiz.





## lc-56-1: CAST & numeric measurements · Challenge 2

**REWRITE · IoT / Sensors · warmup · write**

Sensor CAST transfers to numeric deviation with Celsius units; quiz now warns that coercion is not validation.

Task: Return device_id, observed_at and deviation_c: absolute difference between temperature_c and 20.0 Celsius, rounded to two decimals.

Edge contracts: see the linked lesson review and its quiz.





## lc-54-0: Databases, schemas, tables & keys · Challenge 1

**MIGRATE · Retail · warmup · write**

Schema inspection transfers to a real key-based join; canonical table names now agree with sqlite_schema.

Task: Return name and type for the store_customers, store_products and store_orders tables from sqlite_schema.

Edge contracts: see the linked lesson review and its quiz.





## lc-54-1: Databases, schemas, tables & keys · Challenge 2

**MIGRATE · Retail · easy · write**

Schema inspection transfers to a real key-based join; canonical table names now agree with sqlite_schema.

Task: Return order_id and customer_name by joining store_orders.customer_id to store_customers.id for every order.

Edge contracts: see the linked lesson review and its quiz.





## lc-14-0: Connect tables with JOIN · Challenge 1

**MIGRATE · Retail · easy · write**

Two foreign-key joins intentionally reinforce relationship direction before outer joins.

Task: Return every order id and its customer name (columns id, name).

Edge contracts: see the linked lesson review and its quiz.





## lc-14-1: Connect tables with JOIN · Challenge 2

**MIGRATE · Retail · easy · write**

Two foreign-key joins intentionally reinforce relationship direction before outer joins.

Task: Return every order id and its product name (columns id, name).

Edge contracts: see the linked lesson review and its quiz.





## lc-15-0: Keep unmatched rows · Challenge 1

**MIGRATE · Retail · medium · write**

Preserving all customers transfers to selecting only unmatched customers; COUNT(key) is essential.

Task: Show every customer name and order_count, including store_customers with zero store_orders.

Edge contracts: see the linked lesson review and its quiz.





## lc-15-1: Keep unmatched rows · Challenge 2

**MIGRATE · Retail · easy · write**

Preserving all customers transfers to selecting only unmatched customers; COUNT(key) is essential.

Task: Show name for store_customers with no store_orders.

Edge contracts: see the linked lesson review and its quiz.





## lc-32-0: Ratios, ROUND & NULLIF · Challenge 1

**MIGRATE · Product / SaaS Analytics · medium · write**

Observed-account rates transfer to the full account population; no-request denominators remain NULL.

Task: Return account_id and success_pct (0–100, rounded to 2 decimals) for accounts with requests.

Edge contracts: see the linked lesson review and its quiz.





## lc-32-1: Ratios, ROUND & NULLIF · Challenge 2

**MIGRATE · Product / SaaS Analytics · medium · write**

Observed-account rates transfer to the full account population; no-request denominators remain NULL.

Task: Return id and success_pct for every account, including accounts with no requests (NULL rate). Round to 2 decimals.

Edge contracts: see the linked lesson review and its quiz.





## lc-16-0: Revenue across tables · Challenge 1

**MIGRATE · Retail · easy · write**

Customer revenue transfers to category revenue; purchase-line grain is stated and price multiplication precedes aggregation.

Task: Show customer name and paid revenue (alias revenue), only store_customers with paid store_orders.

Edge contracts: see the linked lesson review and its quiz.





## lc-16-1: Revenue across tables · Challenge 2

**MIGRATE · Retail · easy · write**

Customer revenue transfers to category revenue; purchase-line grain is stated and price multiplication precedes aggregation.

Task: Show category and paid revenue (alias revenue) for each category with paid store_orders.

Edge contracts: see the linked lesson review and its quiz.





## lc-34-0: Self-joins & manager relationships · Challenge 1

**REWRITE · Developer Platform · easy · write**

Developer manager roles replace referral labels; transfer compares employee and direct-manager salaries after joining.

Task: Return employee_id and manager_name for every employee, preserving NULL manager_name when manager_id has no match.

Edge contracts: see the linked lesson review and its quiz.





## lc-34-1: Self-joins & manager relationships · Challenge 2

**REWRITE · Developer Platform · easy · write**

Developer manager roles replace referral labels; transfer compares employee and direct-manager salaries after joining.

Task: Return employee_id and manager_id for employees whose salary is greater than their direct manager’s salary. Exclude employees without a manager.

Edge contracts: see the linked lesson review and its quiz.





## lc-35-0: CROSS JOIN & a complete date grid · Challenge 1

**MIGRATE · Product / SaaS Analytics · medium · write**

A provided date list teaches Cartesian grids before recursion; challenge 2 adds signup eligibility and stays lesson-only.

Task: Return day and viewer_id for every day from 2025-01-01 through 2025-01-03 inclusive and every viewer, including pre-signup combinations.

Edge contracts: see the linked lesson review and its quiz.





## lc-35-1: CROSS JOIN & a complete date grid · Challenge 2

**MIGRATE · Product / SaaS Analytics · medium · write**

A provided date list teaches Cartesian grids before recursion; challenge 2 adds signup eligibility and stays lesson-only.

Task: Return day and viewer_id for the same date range, keeping only combinations on or after that viewer's signup_at.

Edge contracts: see the linked lesson review and its quiz.





## lc-36-0: FULL OUTER JOIN & unmatched records · Challenge 1

**MIGRATE · Product / SaaS Analytics · easy · write**

Matched and unmatched invoice/payment rows transfer to orphan detection; split payments remain separate rows.

Task: Return invoice_id and payment_id for every invoice/payment match, retaining unmatched rows on either side. Keep split invoice_payments as separate rows.

Edge contracts: see the linked lesson review and its quiz.





## lc-36-1: FULL OUTER JOIN & unmatched records · Challenge 2

**MIGRATE · Product / SaaS Analytics · easy · write**

Matched and unmatched invoice/payment rows transfer to orphan detection; split payments remain separate rows.

Task: Return payment_id for invoice_payments whose invoice_id has no matching invoice, including NULL invoice_id.

Edge contracts: see the linked lesson review and its quiz.





## lc-37-0: ON versus WHERE in a LEFT JOIN · Challenge 1

**REWRITE · Healthcare · medium · write**

Healthcare provider counts transfer to the registered-patient denominator; ON filtering and COUNT(key) preserve zero groups.

Task: Return provider_id and completed_visits for every provider. Include zero for providers with no completed encounter.

Edge contracts: see the linked lesson review and its quiz.





## lc-37-1: ON versus WHERE in a LEFT JOIN · Challenge 2

**REWRITE · Healthcare · medium · write**

Healthcare provider counts transfer to the registered-patient denominator; ON filtering and COUNT(key) preserve zero groups.

Task: Return patient_id and cancelled_visits for every patient. Count only cancelled encounters, retaining patients with no cancelled encounters as zero.

Edge contracts: see the linked lesson review and its quiz.





## lc-19-0: Combine sets with UNION · Challenge 1

**MIGRATE · Retail · easy · write**

UNION versus UNION ALL intentionally contrast set and bag behavior; duplicates are the transfer edge case.

Task: Return distinct city values from Chicago store_customers and Austin store_customers using UNION.

Edge contracts: see the linked lesson review and its quiz.





## lc-19-1: Combine sets with UNION · Challenge 2

**MIGRATE · Retail · easy · write**

UNION versus UNION ALL intentionally contrast set and bag behavior; duplicates are the transfer edge case.

Task: Stack name from store_customers and name from store_products, keeping duplicates.

Edge contracts: see the linked lesson review and its quiz.





## lc-38-0: INTERSECT & EXCEPT · Challenge 1

**MIGRATE · Product / SaaS Analytics · easy · write**

INTERSECT and EXCEPT contrast shared membership with one-sided exclusion; each output is distinct.

Task: Return viewer_id for viewers who watched both video 1 and video 2. Each viewer appears once.

Edge contracts: see the linked lesson review and its quiz.





## lc-38-1: INTERSECT & EXCEPT · Challenge 2

**MIGRATE · Product / SaaS Analytics · easy · write**

INTERSECT and EXCEPT contrast shared membership with one-sided exclusion; each output is distinct.

Task: Return viewer_id for viewers who watched video 1 but never video 2. Each viewer appears once.

Edge contracts: see the linked lesson review and its quiz.





## lc-17-0: Subqueries · Challenge 1

**REWRITE · Retail · easy · write**

Replaces a second overall average with an own-category correlated benchmark; explanation and quiz now teach correlation.

Task: Return name and price for store_products priced above the overall average product price.

Edge contracts: see the linked lesson review and its quiz.





## lc-17-1: Subqueries · Challenge 2

**REWRITE · Retail · easy · write**

Replaces a second overall average with an own-category correlated benchmark; explanation and quiz now teach correlation.

Task: Return name and price for store_products priced above the average price in their own category. A product equal to its category average does not qualify.

Edge contracts: see the linked lesson review and its quiz.





## lc-18-0: Ask whether a row exists · Challenge 1

**MIGRATE · Retail · easy · write**

EXISTS versus NOT EXISTS intentionally contrast positive and negative quantification without fan-out.

Task: Show name of store_customers who have at least one paid order.

Edge contracts: see the linked lesson review and its quiz.





## lc-18-1: Ask whether a row exists · Challenge 2

**MIGRATE · Retail · easy · write**

EXISTS versus NOT EXISTS intentionally contrast positive and negative quantification without fan-out.

Task: Show name of store_customers who have no paid store_orders.

Edge contracts: see the linked lesson review and its quiz.





## lc-31-0: NOT IN and the NULL trap · Challenge 1

**MIGRATE · Product / SaaS Analytics · easy · write**

Nullable anti-membership transfers to a known-country exclusion; lesson makes UNKNOWN explicit.

Task: Return id for viewers who have not referred anyone. A referred_by value identifies the referrer, and NULL means no referrer.

Edge contracts: see the linked lesson review and its quiz.





## lc-31-1: NOT IN and the NULL trap · Challenge 2

**MIGRATE · Product / SaaS Analytics · warmup · write**

Nullable anti-membership transfers to a known-country exclusion; lesson makes UNKNOWN explicit.

Task: Return id and country for viewers outside US and GB.

Edge contracts: see the linked lesson review and its quiz.





## lc-20-0: Readable queries with CTEs · Challenge 1

**MIGRATE · Retail · medium · write**

Two named aggregate CTEs reinforce decomposition before windows; no unnecessary staging tables.

Task: Use a CTE to return customer_id and units for store_customers whose total quantity exceeds 3.

Edge contracts: see the linked lesson review and its quiz.





## lc-20-1: Readable queries with CTEs · Challenge 2

**MIGRATE · Retail · medium · write**

Two named aggregate CTEs reinforce decomposition before windows; no unnecessary staging tables.

Task: Use a CTE to return category and avg_price for categories with average price greater than 30.

Edge contracts: see the linked lesson review and its quiz.





## lc-26-0: Dates & monthly analysis · Challenge 1

**REWRITE · Mobility · easy · write**

Mobility pickup-month trip counts transfer to card meter-fare totals; pickup time, cents and tips are distinguished.

Task: Return month (YYYY-MM) and trip_count for every observed pickup month in trips.

Edge contracts: see the linked lesson review and its quiz.





## lc-26-1: Dates & monthly analysis · Challenge 2

**REWRITE · Mobility · easy · write**

Mobility pickup-month trip counts transfer to card meter-fare totals; pickup time, cents and tips are distinguished.

Task: Return month (YYYY-MM) and fare_cents for pickup months. Sum meter fare_cents only for card payments (payment_type=1); exclude tips.

Edge contracts: see the linked lesson review and its quiz.





## lc-33-0: Clean strings & cast values · Challenge 1

**MIGRATE · Product / SaaS Analytics · warmup · write**

Normalization transfers to domain extraction; preserving NULL is explicit, and this is not general email validation.

Task: Return id and clean_email for every member: trim outside spaces and lowercase the email; preserve NULL.

Edge contracts: see the linked lesson review and its quiz.





## lc-33-1: Clean strings & cast values · Challenge 2

**MIGRATE · Product / SaaS Analytics · warmup · write**

Normalization transfers to domain extraction; preserving NULL is explicit, and this is not general email validation.

Task: Return id and email_domain: lowercase, trim, and take the email text after @. Preserve NULL.

Edge contracts: see the linked lesson review and its quiz.





## lc-39-0: Date boundaries & monthly buckets · Challenge 1

**REWRITE · U.S. Flights · easy · write**

Flight schedule boundaries use explicit UTC half-open intervals; transfer counts distinct scheduled aircraft by month.

Task: Return id and scheduled_departure for flights scheduled in January 2025, including the full final day and excluding February.

Edge contracts: see the linked lesson review and its quiz.





## lc-39-1: Date boundaries & monthly buckets · Challenge 2

**REWRITE · U.S. Flights · easy · write**

Flight schedule boundaries use explicit UTC half-open intervals; transfer counts distinct scheduled aircraft by month.

Task: Return month (YYYY-MM) and scheduled_aircraft: distinct aircraft_id values in each scheduled-departure month. Include cancelled flights.

Edge contracts: see the linked lesson review and its quiz.





## lc-21-0: Window functions: ROW_NUMBER · Challenge 1

**MIGRATE · Retail · easy · write**

Chronological row numbering transfers to partitioned price ordering with deterministic ties.

Task: Return id, customer_id and order_number: number each customer's store_orders by ordered_at then id.

Edge contracts: see the linked lesson review and its quiz.





## lc-21-1: Window functions: ROW_NUMBER · Challenge 2

**MIGRATE · Retail · easy · write**

Chronological row numbering transfers to partitioned price ordering with deterministic ties.

Task: Return name, category and price_rank: number store_products within category by price descending then id.

Edge contracts: see the linked lesson review and its quiz.





## lc-22-0: RANK & DENSE_RANK · Challenge 1

**REWRITE · Sports · hard · write**

Sports goal ranking includes unused players; transfer ranks within teams and distinguishes RANK from DENSE_RANK.

Task: Return player_id, goals and rank for every player. goals is the total across appearances, zero with none. Use RANK by goals descending; equal totals share a rank.

Edge contracts: see the linked lesson review and its quiz.





## lc-22-1: RANK & DENSE_RANK · Challenge 2

**REWRITE · Sports · hard · write**

Sports goal ranking includes unused players; transfer ranks within teams and distinguishes RANK from DENSE_RANK.

Task: Return player_id, team_id, goals and rank for every player. Rank total goals within the registered team using DENSE_RANK descending, with zero goals for players without appearances.

Edge contracts: see the linked lesson review and its quiz.





## lc-23-0: Running totals · Challenge 1

**REWRITE · Finance / Payments · medium · write**

Payments cumulative posted debits transfer from global to account partitions; explicitly excludes refunds and starting balance.

Task: Return id, amount_cents and running_debits_cents for every settlement. Accumulate amount_cents by posted_at then id using a ROWS frame.

Edge contracts: see the linked lesson review and its quiz.





## lc-23-1: Running totals · Challenge 2

**REWRITE · Finance / Payments · medium · write**

Payments cumulative posted debits transfer from global to account partitions; explicitly excludes refunds and starting balance.

Task: Return settlement_id, account_id and running_debits_cents for every settlement. Accumulate only that account’s settlements, ordered by posted_at then settlement id.

Edge contracts: see the linked lesson review and its quiz.





## lc-55-0: Logical query processing & row grain · Challenge 1

**MIGRATE · Retail · easy · write**

Grouped totals contrast with a window retaining every input row; the quiz tests logical WHERE order.

Task: Return customer_id and units for paid store_orders grouped by customer; keep groups with units >2. Sort units descending, then customer_id ascending.

Edge contracts: see the linked lesson review and its quiz.





## lc-55-1: Logical query processing & row grain · Challenge 2

**MIGRATE · Retail · medium · write**

Grouped totals contrast with a window retaining every input row; the quiz tests logical WHERE order.

Task: Keep every paid order row and return id, customer_id, quantity and customer_units (sum of paid quantity for that customer using a window).

Edge contracts: see the linked lesson review and its quiz.





## lc-24-0: Compare rows with LAG · Challenge 1

**MIGRATE · U.S. Flights · medium · write**

Flight predecessor selection transfers from all scheduled rows to operated rows before LAG; cancellations change membership.

Task: Return id, route_id and previous_delay for every scheduled flight. previous_delay is the departure_delay_minutes of the previous scheduled flight on that route, ordered by scheduled_departure then id. Keep cancelled flights and their NULL delays.

Edge contracts: see the linked lesson review and its quiz.





## lc-24-1: Compare rows with LAG · Challenge 2

**MIGRATE · U.S. Flights · medium · write**

Flight predecessor selection transfers from all scheduled rows to operated rows before LAG; cancellations change membership.

Task: Return id, route_id and delay_change for operated flights only (cancelled=0). Compare departure_delay_minutes with the previous operated flight on the same route, ordered by scheduled_departure then id. The first operated flight on each route has NULL change.

Edge contracts: see the linked lesson review and its quiz.





## lc-25-0: Latest row per group · Challenge 1

**MIGRATE · Retail · medium · write**

Latest-per-customer transfers to highest-per-category with a different tie rule.

Task: Return id, customer_id and ordered_at for the latest order per customer; break date ties by highest id.

Edge contracts: see the linked lesson review and its quiz.





## lc-25-1: Latest row per group · Challenge 2

**MIGRATE · Retail · medium · write**

Latest-per-customer transfers to highest-per-category with a different tie rule.

Task: Return name, category and price for the most expensive product per category; break price ties by lowest id.

Edge contracts: see the linked lesson review and its quiz.





## lc-40-0: LEAD & the next event · Challenge 1

**REWRITE · Logistics · medium · write**

Logistics LEAD uses physical time and an id tie-breaker; transfer calculates seconds and retains final NULLs and raw retries.

Task: Return id, package_id and next_scan_at for every tracking_events row. The next scan is within the package, ordered by occurred_at then id.

Edge contracts: see the linked lesson review and its quiz.





## lc-40-1: LEAD & the next event · Challenge 2

**REWRITE · Logistics · medium · write**

Logistics LEAD uses physical time and an id tie-breaker; transfer calculates seconds and retains final NULLs and raw retries.

Task: Return id and seconds_to_next for every received scan. Use the same package order and subtract current occurred_at from the next occurred_at in seconds. The last scan gets NULL.

Edge contracts: see the linked lesson review and its quiz.





## lc-41-0: FIRST_VALUE, LAST_VALUE & frames · Challenge 1

**REWRITE · IoT / Sensors · medium · write**

IoT full-frame LAST_VALUE transfers to deviation from FIRST_VALUE; default frame and baseline semantics differ.

Task: Return device_id, observed_at and final_temperature_c for every sensor_readings row. Repeat that device’s final observed temperature across all its rows.

Edge contracts: see the linked lesson review and its quiz.





## lc-41-1: FIRST_VALUE, LAST_VALUE & frames · Challenge 2

**REWRITE · IoT / Sensors · medium · write**

IoT full-frame LAST_VALUE transfers to deviation from FIRST_VALUE; default frame and baseline semantics differ.

Task: Return device_id, observed_at and change_from_first_c: temperature_c minus the device’s first observed temperature, rounded to two decimals.

Edge contracts: see the linked lesson review and its quiz.





## lc-42-0: Rolling averages & missing dates · Challenge 1

**REWRITE · Weather · medium · write**

Weather observed-row averaging transfers to a complete calendar; absent temperatures stay unknown rather than invented zeros.

Task: Return station_id, date and rolling_tmax_c for usable TMAX observations only. Average current and previous two observed temperatures, divide raw tenths by 10.0 and round to two decimals. Usable means raw_value non-NULL and quality_flag NULL. Order by station_id,date.

Edge contracts: see the linked lesson review and its quiz.





## lc-42-1: Rolling averages & missing dates · Challenge 2

**REWRITE · Weather · hard · write**

Weather observed-row averaging transfers to a complete calendar; absent temperatures stay unknown rather than invented zeros.

Task: Return station_id, date and rolling_tmax_c for every station and calendar date. Average usable TMAX values in the current and previous two calendar dates, ignoring missing values; an entirely missing window is NULL. Round Celsius averages to two decimals. Order by station_id,date.

Edge contracts: see the linked lesson review and its quiz.





## lc-43-0: Share of total with windows · Challenge 1

**REWRITE · Energy · medium · write**

Energy global fuel share transfers to regional denominators; ratio of sums and zero-denominator handling are explicit.

Task: Return fuel, output_mw and share_pct of all generation. Sum output_mw by fuel; share_pct is 0–100, rounded to two decimals, or NULL if the denominator is zero.

Edge contracts: see the linked lesson review and its quiz.





## lc-43-1: Share of total with windows · Challenge 2

**REWRITE · Energy · medium · write**

Energy global fuel share transfers to regional denominators; ratio of sums and zero-denominator handling are explicit.

Task: Return region_id, fuel, output_mw and share_pct of that region’s generation, rounded to two decimals. Use NULL if a region’s total is zero.

Edge contracts: see the linked lesson review and its quiz.





## lc-53-0: Top N per group & ties · Challenge 1

**MIGRATE · Product / SaaS Analytics · medium · write**

Exactly two items transfers to all top ties; ROW_NUMBER and DENSE_RANK answer different business contracts.

Task: Return creator_id, video_id and watch_seconds for the top 2 watched videos per creator, excluding videos with no events. Rank by total seconds descending, break ties by smallest video_id.

Edge contracts: see the linked lesson review and its quiz.





## lc-53-1: Top N per group & ties · Challenge 2

**MIGRATE · Product / SaaS Analytics · medium · write**

Exactly two items transfers to all top ties; ROW_NUMBER and DENSE_RANK answer different business contracts.

Task: Return creator_id, video_id and watch_seconds for each creator's most-watched video(s), including ties. Exclude videos with no events.

Edge contracts: see the linked lesson review and its quiz.





## lc-57-0: NTILE & balanced ranking buckets · Challenge 1

**REWRITE · Sports · easy · write**

Sports appearance buckets transfer from league-wide to team partitions; NTILE can split equal minutes.

Task: Return game_id, player_id, minutes and bucket using NTILE(4) across appearances, ordered in the window by minutes descending, game_id then player_id.

Edge contracts: see the linked lesson review and its quiz.





## lc-57-1: NTILE & balanced ranking buckets · Challenge 2

**REWRITE · Sports · medium · write**

Sports appearance buckets transfer from league-wide to team partitions; NTILE can split equal minutes.

Task: Return game_id, player_id, team_id and bucket using NTILE(2) within each player’s registered team. Order by minutes descending, game_id then player_id.

Edge contracts: see the linked lesson review and its quiz.





## lc-27-0: Recursive CTEs · Challenge 1

**MIGRATE · Developer Platform · medium · write**

Recursive numeric anchor transfers to a multi-level developer hierarchy; acyclic input is a declared assumption.

Task: Use a recursive CTE to return n with integers 1 through 5.

Edge contracts: see the linked lesson review and its quiz.





## lc-27-1: Recursive CTEs · Challenge 2

**MIGRATE · Developer Platform · hard · write**

Recursive numeric anchor transfers to a multi-level developer hierarchy; acyclic input is a declared assumption.

Task: Return developer_id and depth for every developer reachable from a root whose manager_id is NULL. Roots have depth 0; each reporting edge adds 1. The supplied management graph is acyclic. Use a recursive CTE to follow all levels.

Edge contracts: see the linked lesson review and its quiz.





## lc-28-0: Query plans & indexes · Challenge 1

**MIGRATE · Retail · warmup · write**

Keeps SQLite plan inspection conceptual; these two tasks stay lesson-only because they require Explain mode.

Task: Show name for Chicago store_customers. Run the reference with Explain mode to inspect the plan.

Edge contracts: see the linked lesson review and its quiz.





## lc-28-1: Query plans & indexes · Challenge 2

**MIGRATE · Retail · warmup · write**

Keeps SQLite plan inspection conceptual; these two tasks stay lesson-only because they require Explain mode.

Task: Show id and quantity for paid store_orders. Inspect its plan with Explain mode.

Edge contracts: see the linked lesson review and its quiz.





## lc-29-0: Capstone: customer insights · Challenge 1

**MIGRATE · Retail · hard · write**

Capstone combines joins, aggregates and dense ranking at two reporting grains; repetition is deliberate synthesis.

Task: Show name, paid_revenue and revenue_rank for store_customers with paid store_orders. Use DENSE_RANK, highest revenue first in the rank calculation.

Edge contracts: see the linked lesson review and its quiz.





## lc-29-1: Capstone: customer insights · Challenge 2

**MIGRATE · Retail · hard · write**

Capstone combines joins, aggregates and dense ranking at two reporting grains; repetition is deliberate synthesis.

Task: Show category, paid_revenue and revenue_rank for product categories with paid store_orders. Use DENSE_RANK by revenue descending.

Edge contracts: see the linked lesson review and its quiz.





## lc-44-0: Deduplicate event retries · Challenge 1

**MIGRATE · Product / SaaS Analytics · medium · write**

Latest ingestion per event key transfers to summaries after deduplication; id resolves ingestion-time ties.

Task: Return id, event_key and member_id for the latest ingested row of each event_key. Break ingestion ties by highest id.

Edge contracts: see the linked lesson review and its quiz.





## lc-44-1: Deduplicate event retries · Challenge 2

**MIGRATE · Product / SaaS Analytics · medium · write**

Latest ingestion per event key transfers to summaries after deduplication; id resolves ingestion-time ties.

Task: After keeping the latest ingested row per event_key (tie: highest id), return event_type and event_count by event_type.

Edge contracts: see the linked lesson review and its quiz.





## lc-45-0: Daily active users & engagement · Challenge 1

**MIGRATE · Product / SaaS Analytics · easy · write**

Distinct daily audience transfers to minutes per active viewer; numerator and denominator share the same day population.

Task: Return day (YYYY-MM-DD) and active_viewers (distinct viewers) for every observed watch date.

Edge contracts: see the linked lesson review and its quiz.





## lc-45-1: Daily active users & engagement · Challenge 2

**MIGRATE · Product / SaaS Analytics · easy · write**

Distinct daily audience transfers to minutes per active viewer; numerator and denominator share the same day population.

Task: Return day, active_viewers and minutes_per_active_viewer, rounded to 2 decimals, for each observed watch date.

Edge contracts: see the linked lesson review and its quiz.





## lc-46-0: Ordered conversion funnels · Challenge 1

**MIGRATE · Product / SaaS Analytics · hard · write**

Ordered funnel counts transfer to member-level evidence; earliest valid next steps prevent unordered event membership shortcuts.

Task: Return one row: viewed, signed_up, purchased as member counts for the ordered view → signup → purchase funnel. Equal times are allowed; use each member's earliest valid next step.

Edge contracts: see the linked lesson review and its quiz.





## lc-46-1: Ordered conversion funnels · Challenge 2

**MIGRATE · Product / SaaS Analytics · hard · write**

Ordered funnel counts transfer to member-level evidence; earliest valid next steps prevent unordered event membership shortcuts.

Task: Return member_id, viewed_at, signed_at and purchased_at for members who complete that ordered funnel.

Edge contracts: see the linked lesson review and its quiz.





## lc-47-0: Cohorts & exact-day retention · Challenge 1

**MIGRATE · Product / SaaS Analytics · hard · write**

D1 and D7 are intentional repetition because cohort maturity changes at the fixed observation cutoff; second stays lesson-only.

Task: With observation cutoff Jan 15 2025, return cohort_day, cohort_size, retained_viewers and retention_pct (0–100, 2 decimals) for exact-day D1 retention. Include only mature cohorts.

Edge contracts: see the linked lesson review and its quiz.





## lc-47-1: Cohorts & exact-day retention · Challenge 2

**MIGRATE · Product / SaaS Analytics · hard · write**

D1 and D7 are intentional repetition because cohort maturity changes at the fixed observation cutoff; second stays lesson-only.

Task: Use the same output and cutoff for exact-day D7 retention (signup date +7 days); include only mature cohorts.

Edge contracts: see the linked lesson review and its quiz.





## lc-48-0: Sessionize an event stream · Challenge 1

**MIGRATE · Product / SaaS Analytics · hard · write**

Session counts transfer to row-level labels; first row and exact 30-minute boundaries are stated, second stays lesson-only.

Task: Using raw social_events, return member_id and session_count. Start a new session on the first event or a gap of at least 30 minutes; order by event_at then id per member.

Edge contracts: see the linked lesson review and its quiz.





## lc-48-1: Sessionize an event stream · Challenge 2

**MIGRATE · Product / SaaS Analytics · hard · write**

Session counts transfer to row-level labels; first row and exact 30-minute boundaries are stated, second stays lesson-only.

Task: Using the same rule, return id, member_id and session_number for every raw social event.

Edge contracts: see the linked lesson review and its quiz.





## lc-49-0: Multi-grain joins without fan-out · Challenge 1

**MIGRATE · Product / SaaS Analytics · hard · write**

Request count transfers to successful tokens while independently aggregated invoices preserve account grain.

Task: Return id, request_count and billed_amount for every account across all dates. Aggregate requests and invoices separately to avoid multiplication; use zeros for missing totals.

Edge contracts: see the linked lesson review and its quiz.





## lc-49-1: Multi-grain joins without fan-out · Challenge 2

**MIGRATE · Product / SaaS Analytics · hard · write**

Request count transfers to successful tokens while independently aggregated invoices preserve account grain.

Task: Return id, output_tokens and billed_amount for every account across all dates. Sum only successful output tokens and aggregate invoices separately. Use zeros for missing totals.

Edge contracts: see the linked lesson review and its quiz.





## lc-50-0: Revenue & payment reconciliation · Challenge 1

**MIGRATE · Product / SaaS Analytics · hard · write**

Invoice reconciliation transfers to exceptions-only output; shared definition is retained and second stays lesson-only.

Task: Return id, billed_amount, net_collected and gap for every invoice across all periods. Net collected = invoice_payments - invoice_refunds; gap = billed - net collected. Treat missing totals as zero.

Edge contracts: see the linked lesson review and its quiz.





## lc-50-1: Revenue & payment reconciliation · Challenge 2

**MIGRATE · Product / SaaS Analytics · hard · write**

Invoice reconciliation transfers to exceptions-only output; shared definition is retained and second stays lesson-only.

Task: Using the same definition, return invoice_id and gap only for invoices with nonzero gap.

Edge contracts: see the linked lesson review and its quiz.





## lc-51-0: AI usage cost & contribution margin · Challenge 1

**MIGRATE · Product / SaaS Analytics · medium · write**

Model costs transfer to account contribution margin in a fixed month; fictional prices and non-profit limitation are explicit.

Task: Return model and usage_cost in fictional USD, rounded to 6 decimals, for successful requests across all dates.

Edge contracts: see the linked lesson review and its quiz.





## lc-51-1: AI usage cost & contribution margin · Challenge 2

**MIGRATE · Product / SaaS Analytics · hard · write**

Model costs transfer to account contribution margin in a fixed month; fictional prices and non-profit limitation are explicit.

Task: Return id, billed_amount, usage_cost and contribution_margin for every account for Jan 2025. Use January invoices and successful requests only; missing totals are zero. Round cost and margin to 6 decimals. Margin = billed - usage cost.

Edge contracts: see the linked lesson review and its quiz.





## lc-52-0: Experiment conversion denominators · Challenge 1

**MIGRATE · Product / SaaS Analytics · hard · write**

Assigned-user conversion rates transfer to per-assignment flags; the same post-assignment rule preserves the denominator.

Task: Return variant, assigned, converted and conversion_pct (0–100, 2 decimals). A member converts with any purchase on/after assigned_at and before Feb 1 2025. Include all assigned members.

Edge contracts: see the linked lesson review and its quiz.





## lc-52-1: Experiment conversion denominators · Challenge 2

**MIGRATE · Product / SaaS Analytics · medium · write**

Assigned-user conversion rates transfer to per-assignment flags; the same post-assignment rule preserves the denominator.

Task: Return member_id, variant and converted (1 or 0) for every assignment using the same post-assignment purchase definition and cutoff.

Edge contracts: see the linked lesson review and its quiz.





## lc-58-0: DDL: create, alter & inspect a table · Challenge 1

**MIGRATE · Logistics · easy · write**

Two DDL shapes intentionally reinforce structural changes and schema inspection before data mutation.

Task: Create practice_people with id INTEGER PRIMARY KEY and name TEXT; add city TEXT with ALTER TABLE. Return name and type from pragma_table_info('practice_people').

Edge contracts: see the linked lesson review and its quiz.





## lc-58-1: DDL: create, alter & inspect a table · Challenge 2

**MIGRATE · Logistics · easy · write**

Two DDL shapes intentionally reinforce structural changes and schema inspection before data mutation.

Task: Create practice_totals with account_id INTEGER and total REAL. Return name and type from pragma_table_info('practice_totals').

Edge contracts: see the linked lesson review and its quiz.





## lc-59-0: DML: INSERT, UPDATE & DELETE · Challenge 1

**MIGRATE · Logistics · easy · write**

Targeted insertion/update/delete transfers to predicate-based bulk changes on isolated logistics inventory.

Task: Insert lab item (4, Pen, 8); add 5 to price for id=1; delete id=2. Return id, name, price for remaining items.

Edge contracts: see the linked lesson review and its quiz.





## lc-59-1: DML: INSERT, UPDATE & DELETE · Challenge 2

**MIGRATE · Logistics · easy · write**

Targeted insertion/update/delete transfers to predicate-based bulk changes on isolated logistics inventory.

Task: Double every lab item price below 50, then delete items with price >100. Return id, name, price.

Edge contracts: see the linked lesson review and its quiz.





## lc-60-0: Constraints protect the data contract · Challenge 1

**MIGRATE · Logistics · medium · write**

Nonnegative quantity and unique email test different constraints; NULL requires its own NOT NULL contract.

Task: Create inventory with sku TEXT PRIMARY KEY NOT NULL and quantity INTEGER NOT NULL CHECK(quantity>=0); insert (A,2). Return sku and quantity.

Edge contracts: see the linked lesson review and its quiz.





## lc-60-1: Constraints protect the data contract · Challenge 2

**MIGRATE · Logistics · medium · write**

Nonnegative quantity and unique email test different constraints; NULL requires its own NOT NULL contract.

Task: Create contacts with id INTEGER PRIMARY KEY and email TEXT NOT NULL UNIQUE; insert (1,a@example.com) and (2,b@example.com). Return id,email.

Edge contracts: see the linked lesson review and its quiz.





## lc-61-0: Transactions & savepoint recovery · Challenge 1

**MIGRATE · Logistics · easy · write**

Whole-transaction rollback transfers to savepoint recovery with earlier pending changes preserved.

Task: Begin a transaction, add 10 to every lab item price, then roll back. Return id and price; all values should be original.

Edge contracts: see the linked lesson review and its quiz.





## lc-61-1: Transactions & savepoint recovery · Challenge 2

**MIGRATE · Logistics · easy · write**

Whole-transaction rollback transfers to savepoint recovery with earlier pending changes preserved.

Task: Begin; add 5 to price for id=1; create SAVEPOINT partial; delete id=2; roll back to partial; commit. Return id and price.

Edge contracts: see the linked lesson review and its quiz.





## lc-62-0: Views: reusable query definitions · Challenge 1

**MIGRATE · Retail · easy · write**

Row-filtering view transfers to grouped totals view; validators check object behavior rather than copied output.

Task: Create view paid_orders exposing id, customer_id and quantity for paid store_orders. Return those columns by selecting the view.

Edge contracts: see the linked lesson review and its quiz.





## lc-62-1: Views: reusable query definitions · Challenge 2

**MIGRATE · Retail · medium · write**

Row-filtering view transfers to grouped totals view; validators check object behavior rather than copied output.

Task: Create view product_totals with category and total_price (sum of price). Return category and total_price from the view.

Edge contracts: see the linked lesson review and its quiz.





## lc-63-0: CTEs, CTAS & temporary tables · Challenge 1

**MIGRATE · Retail · medium · write**

Two TEMP materializations reinforce persistence within the connection versus a statement-only CTE.

Task: Materialize a TEMP table customer_units with customer_id and total quantity as units. Return customer_id and units for units >3.

Edge contracts: see the linked lesson review and its quiz.





## lc-63-1: CTEs, CTAS & temporary tables · Challenge 2

**MIGRATE · Retail · medium · write**

Two TEMP materializations reinforce persistence within the connection versus a statement-only CTE.

Task: Materialize a TEMP table category_prices with category and average price as avg_price. Return category and avg_price for avg_price >30.

Edge contracts: see the linked lesson review and its quiz.





## lc-64-0: Triggers & visible audit effects · Challenge 1

**MIGRATE · Logistics · medium · write**

Single-row trigger exercise transfers to multi-row updates and audit effects; second needs the first trigger definition.

Task: Create a price_audit trigger AFTER UPDATE OF price on inventory_items, logging changed prices in inventory_audit; add 5 to id=1 price. Return item_id,old_price,new_price from inventory_audit.

Edge contracts: see the linked lesson review and its quiz.





## lc-64-1: Triggers & visible audit effects · Challenge 2

**MIGRATE · Logistics · medium · write**

Single-row trigger exercise transfers to multi-row updates and audit effects; second needs the first trigger definition.

Task: Create the same trigger, then double prices for all items with price<50. Return item_id,old_price,new_price from inventory_audit.

Edge contracts: see the linked lesson review and its quiz.





## lc-65-0: Stored procedures: parameters & contracts · Challenge 1

**MIGRATE · Retail · warmup · write**

Keeps SQL Server procedure syntax as reference only; executable SQLite tasks practice retrieval contracts and parameter transfer.

Task: For customer_id=1, return id, customer_id and quantity from store_orders. This practices a procedure’s retrieval contract; no procedure is created in SQLite.

Edge contracts: see the linked lesson review and its quiz.





## lc-65-1: Stored procedures: parameters & contracts · Challenge 2

**MIGRATE · Retail · warmup · write**

Keeps SQL Server procedure syntax as reference only; executable SQLite tasks practice retrieval contracts and parameter transfer.

Task: For customer_id=2, return id, customer_id and quantity for paid store_orders only.

Edge contracts: see the linked lesson review and its quiz.





## lc-66-0: Indexes: observe a real access path · Challenge 1

**MIGRATE · Retail · easy · write**

Two indexes reinforce observing actual access paths; no unsupported speed claim from a tiny fixture.

Task: Create idx_orders_customer on store_orders(customer_id), then return id and quantity for customer_id=1. Run Query plan after the script to inspect the final SELECT.

Edge contracts: see the linked lesson review and its quiz.





## lc-66-1: Indexes: observe a real access path · Challenge 2

**MIGRATE · Retail · easy · write**

Two indexes reinforce observing actual access paths; no unsupported speed claim from a tiny fixture.

Task: Create idx_products_category on store_products(category), then return name and price for Tech store_products.

Edge contracts: see the linked lesson review and its quiz.





## lc-67-0: SARGable ranges, not speed commandments · Challenge 1

**MIGRATE · Product / SaaS Analytics · easy · write**

Month range transfers to an inclusive named-day interval expressed with an exclusive endpoint; same access-path reasoning is intentional.

Task: Create idx_watch_time on watched_at; return id and watched_at for Jan 2025 using a half-open timestamp range.

Edge contracts: see the linked lesson review and its quiz.





## lc-67-1: SARGable ranges, not speed commandments · Challenge 2

**MIGRATE · Product / SaaS Analytics · easy · write**

Month range transfers to an inclusive named-day interval expressed with an exclusive endpoint; same access-path reasoning is intentional.

Task: Create idx_watch_time on watched_at; return id and watched_at for Jan 1–7 2025 inclusive, using a half-open range.

Edge contracts: see the linked lesson review and its quiz.





## lc-68-0: Partitioning & workload trade-offs · Challenge 1

**MIGRATE · Retail · warmup · write**

Filtering a month transfers to bucketing all months; no physical partition elimination is claimed for SQLite.

Task: Return sale_key, order_date and sales for Feb 2025 from fact_sales. Use a half-open range.

Edge contracts: see the linked lesson review and its quiz.





## lc-68-1: Partitioning & workload trade-offs · Challenge 2

**MIGRATE · Retail · easy · write**

Filtering a month transfers to bucketing all months; no physical partition elimination is claimed for SQLite.

Task: Return month (YYYY-MM) and sales (sum) by month from fact_sales.

Edge contracts: see the linked lesson review and its quiz.





## lc-75-0: Review AI-generated SQL with evidence · Challenge 1

**MIGRATE · Product / SaaS Analytics · medium · write**

COUNT(*) fan-out diagnosis transfers to integer-division and denominator diagnosis; plans alone cannot prove metric correctness.

Task: Fix the proposed COUNT(*) LEFT JOIN query. Return id and request_count for every account, including zero-request accounts.

Edge contracts: see the linked lesson review and its quiz.





## lc-75-1: Review AI-generated SQL with evidence · Challenge 2

**MIGRATE · Product / SaaS Analytics · medium · write**

COUNT(*) fan-out diagnosis transfers to integer-division and denominator diagnosis; plans alone cannot prove metric correctness.

Task: Fix an AI query that divides integers or filters out inactive accounts. Return id and success_pct for every account, NULL with no requests, 2 decimals.

Edge contracts: see the linked lesson review and its quiz.





## lc-69-0: Bronze: inspect raw data before cleaning · Challenge 1

**MIGRATE · Retail · medium · write**

Duplicate-key profiling transfers to invalid-date profiling without changing raw evidence.

Task: Return customer_id (trimmed raw_id) and versions for non-NULL duplicate customer keys in bronze_customers. Keep only keys with more than one version.

Edge contracts: see the linked lesson review and its quiz.





## lc-69-1: Bronze: inspect raw data before cleaning · Challenge 2

**MIGRATE · Retail · easy · write**

Duplicate-key profiling transfers to invalid-date profiling without changing raw evidence.

Task: Return row_id and order_date for bronze sales whose date is invalid (date(order_date) IS NULL).

Edge contracts: see the linked lesson review and its quiz.





## lc-70-0: Silver: clean, map & deduplicate · Challenge 1

**MIGRATE · Retail · hard · write**

Builds cleaned latest customer rows, then summarizes mapped countries; second retains its prerequisite TEMP-table contract.

Task: Create TEMP silver_customers: trim keys/names; discard NULL/empty keys; keep latest updated_at per trimmed key. Map US/USA→United States, GB/UK→United Kingdom, IND→India, CA→Canada. Return customer_id,name,country.

Edge contracts: see the linked lesson review and its quiz.





## lc-70-1: Silver: clean, map & deduplicate · Challenge 2

**MIGRATE · Retail · hard · write**

Builds cleaned latest customer rows, then summarizes mapped countries; second retains its prerequisite TEMP-table contract.

Task: Create the same TEMP silver_customers, then return country and customer_count per mapped country.

Edge contracts: see the linked lesson review and its quiz.





## lc-71-0: Gold: dimensions, facts & quality gates · Challenge 1

**MIGRATE · Retail · hard · write**

Accepted fact construction transfers to reconciliation of rejected rows; state validation checks the built table.

Task: Build TEMP built_fact from bronze_sales and dimension lookups. Validate numeric positive quantity, valid date and matching trimmed natural keys. Recompute sales = quantity × dim_product.price. Return sale_key,customer_key,product_key,quantity,sales,order_date.

Edge contracts: see the linked lesson review and its quiz.





## lc-71-1: Gold: dimensions, facts & quality gates · Challenge 2

**MIGRATE · Retail · hard · write**

Accepted fact construction transfers to reconciliation of rejected rows; state validation checks the built table.

Task: Build the same TEMP built_fact; return rejected_rows as source row count minus built fact row count.

Edge contracts: see the linked lesson review and its quiz.





## lc-72-0: EDA: explore before telling the story · Challenge 1

**MIGRATE · Retail · easy · write**

Basic extent/count/total profiling transfers to a metric-union report; literal output labels remain part of the contract.

Task: Return first_sale, last_sale, sales_lines and total_sales as one summary row from fact_sales.

Edge contracts: see the linked lesson review and its quiz.





## lc-72-1: EDA: explore before telling the story · Challenge 2

**MIGRATE · Retail · easy · write**

Basic extent/count/total profiling transfers to a metric-union report; literal output labels remain part of the contract.

Task: Return metric and value using UNION ALL for Total sales (sum of sales), Units (sum of quantity), and Active customers (distinct customer_key) from fact_sales.

Edge contracts: see the linked lesson review and its quiz.





## lc-73-0: Customer & product reporting contracts · Challenge 1

**MIGRATE · Retail · medium · write**

Customer recency transfers to product segmentation while preserving inactive dimensions; zero totals differ from NULL recency.

Task: Return customer_id,name,sales_lines,total_sales,recency_days for every dim_customer. Missing sales total=0; recency=NULL with no sales. Recency = days from last order_date to 2025-04-01, integer.

Edge contracts: see the linked lesson review and its quiz.





## lc-73-1: Customer & product reporting contracts · Challenge 2

**MIGRATE · Retail · medium · write**

Customer recency transfers to product segmentation while preserving inactive dimensions; zero totals differ from NULL recency.

Task: Return product_id,name,total_sales,total_units,performance_segment for every dim_product. Missing totals=0. High if total_sales>=200, otherwise Standard.

Edge contracts: see the linked lesson review and its quiz.





## lc-74-0: Monthly change & cumulative reports · Challenge 1

**MIGRATE · Retail · medium · write**

Monthly cumulative sales transfer to percentage change; comparison is previous observed month, not necessarily previous calendar month.

Task: Return month (YYYY-MM),sales,running_sales for observed months; cumulative sales ordered by month. Sort output by month.

Edge contracts: see the linked lesson review and its quiz.





## lc-74-1: Monthly change & cumulative reports · Challenge 2

**MIGRATE · Retail · hard · write**

Monthly cumulative sales transfer to percentage change; comparison is previous observed month, not necessarily previous calendar month.

Task: Return month,sales,previous_sales,change_pct for observed months. Compare to previous observed month; percentage rounded to 2 decimals, NULL with no/nonzero denominator. Sort by month.

Edge contracts: see the linked lesson review and its quiz.





## lc-76-0: Reconcile extraction & Bronze ingestion · Challenge 1

**MIGRATE · Retail · hard · write**

Extraction row-count reconciliation transfers to invalid-key evidence; a matching total alone does not establish mapping correctness.

Task: Return source_name,expected_rows,landed_rows,difference (landed minus expected) for CRM and ERP using load_manifest and the raw tables.

Edge contracts: see the linked lesson review and its quiz.





## lc-76-1: Reconcile extraction & Bronze ingestion · Challenge 2

**MIGRATE · Retail · easy · write**

Extraction row-count reconciliation transfers to invalid-key evidence; a matching total alone does not establish mapping correctness.

Task: Return source_row and customer_id for CRM records with a missing or whitespace-only customer key. Do not modify Bronze.

Edge contracts: see the linked lesson review and its quiz.





## lc-77-0: Integrate CRM + ERP with source authority · Challenge 1

**MIGRATE · Retail · hard · write**

Source-authority integration transfers to grouped resolved values; explicit CRM precedence and fallback remain necessary context.

Task: Return customer_id,name,gender,country,birth_date using the integration contract in Understand. Use latest normalized CRM keys, CRM-first gender, ERP fallback, mapped country, and valid nonfuture birth date.

Edge contracts: see the linked lesson review and its quiz.





## lc-77-1: Integrate CRM + ERP with source authority · Challenge 2

**MIGRATE · Retail · hard · write**

Source-authority integration transfers to grouped resolved values; explicit CRM precedence and fallback remain necessary context.

Task: Use the same integration contract; return gender and customer_count grouped by the resolved gender.

Edge contracts: see the linked lesson review and its quiz.





## lc-78-0: Product validity with LEAD & half-open intervals · Challenge 1

**MIGRATE · Retail · medium · write**

Next-start validity intervals transfer to an as-of lookup; inclusive start and exclusive end avoid duplicate ownership.

Task: Return version_id,product_id,valid_from,valid_to. valid_to is the next start for the same product, NULL for the latest version.

Edge contracts: see the linked lesson review and its quiz.





## lc-78-1: Product validity with LEAD & half-open intervals · Challenge 2

**MIGRATE · Retail · medium · write**

Next-start validity intervals transfer to an as-of lookup; inclusive start and exclusive end avoid duplicate ownership.

Task: As of 2025-02-01, return product_id,cost for the version effective on that date using inclusive start and exclusive end.

Edge contracts: see the linked lesson review and its quiz.





## lc-79-0: Validate calendar dates before converting · Challenge 1

**MIGRATE · Retail · medium · write**

Format-plus-calendar validation transfers to rejected-row selection; date-shaped invalid dates are explicitly tested.

Task: Return row_id,raw_date,clean_date for every raw_dates row. Accept exactly eight digits and a valid calendar day; invalid values become NULL.

Edge contracts: see the linked lesson review and its quiz.





## lc-79-1: Validate calendar dates before converting · Challenge 2

**MIGRATE · Retail · medium · write**

Format-plus-calendar validation transfers to rejected-row selection; date-shaped invalid dates are explicitly tested.

Task: Return row_id and raw_date only for invalid or missing dates under the same rule.

Edge contracts: see the linked lesson review and its quiz.





## lc-80-0: Quarantine bad rows & reconcile the batch · Challenge 1

**MIGRATE · Retail · hard · write**

Reasoned quarantine transfers to accepted/rejected reconciliation; each source row must belong to exactly one outcome.

Task: Create TEMP checked_dates using the validation rule and TEMP date_rejects with invalid rows. Return row_id,raw_date,reason: missing for NULL, format for not exactly eight digits, otherwise calendar.

Edge contracts: see the linked lesson review and its quiz.





## lc-80-1: Quarantine bad rows & reconcile the batch · Challenge 2

**MIGRATE · Retail · hard · write**

Reasoned quarantine transfers to accepted/rejected reconciliation; each source row must belong to exactly one outcome.

Task: Create TEMP checked_dates; return source_rows,accepted_rows,rejected_rows,reconciled (1 if accepted+rejected equals source count).

Edge contracts: see the linked lesson review and its quiz.





## lc-81-0: Automated star-schema quality tests · Challenge 1

**MIGRATE · Retail · hard · write**

Four independent quality counts transfer to a publish gate; zero orphans alone is insufficient.

Task: Return test,failures for duplicate_line_ids (number of duplicated id groups), orphan_customers (rows), orphan_products (rows), and invalid_quantity (NULL or <=0 rows) in dq_sales.

Edge contracts: see the linked lesson review and its quiz.





## lc-81-1: Automated star-schema quality tests · Challenge 2

**MIGRATE · Retail · hard · write**

Four independent quality counts transfer to a publish gate; zero orphans alone is insufficient.

Task: Return blocking_failures as the sum of the four failure counts, and can_publish as 1 only if that sum is zero.

Edge contracts: see the linked lesson review and its quiz.





## lc-82-0: Durable surrogate keys across loads · Challenge 1

**MIGRATE · Retail · easy · write**

An earlier-sorting natural key must not renumber durable keys; updating an existing entity must preserve identity.

Task: Insert natural key C000, name New earlier key, updated_at 2025-02-01 into current_people without supplying customer_key. Return customer_id,customer_key for all rows.

Edge contracts: see the linked lesson review and its quiz.





## lc-82-1: Durable surrogate keys across loads · Challenge 2

**MIGRATE · Retail · easy · write**

An earlier-sorting natural key must not renumber durable keys; updating an existing entity must preserve identity.

Task: Update C001 name to Alice Updated without changing its key. Return customer_id,customer_key,name for all current_people rows.

Edge contracts: see the linked lesson review and its quiz.





## lc-83-0: Latest-state reporting versus SCD Type 2 · Challenge 1

**MIGRATE · Retail · easy · write**

Current-state reporting transfers to sale-time history; distinct interval membership changes the business answer.

Task: Return customer_id,country for the current version of every customer_history customer.

Edge contracts: see the linked lesson review and its quiz.





## lc-83-1: Latest-state reporting versus SCD Type 2 · Challenge 2

**MIGRATE · Retail · medium · write**

Current-state reporting transfers to sale-time history; distinct interval membership changes the business answer.

Task: Join fact_sales to dim_customer for natural customer_id and customer_history at sale time. Return sale_key,customer_id,country as of each order_date.

Edge contracts: see the linked lesson review and its quiz.





## lc-84-0: Idempotent incremental UPSERT & stale updates · Challenge 1

**MIGRATE · Retail · medium · write**

Batch replay checks idempotency and stale-update rejection; second checks unchanged surrogate keys.

Task: Apply incoming_people to current_people with INSERT ON CONFLICT(customer_id) DO UPDATE only if the incoming updated_at is newer. Apply that same batch twice. Return customer_id,name,updated_at.

Edge contracts: see the linked lesson review and its quiz.





## lc-84-1: Idempotent incremental UPSERT & stale updates · Challenge 2

**MIGRATE · Retail · medium · write**

Batch replay checks idempotency and stale-update rejection; second checks unchanged surrogate keys.

Task: Apply that UPSERT once. Return customer_id,customer_key for all current_people rows, showing that old keys stayed stable.

Edge contracts: see the linked lesson review and its quiz.





## lc-85-0: Stage, validate & atomically promote a refresh · Challenge 1

**MIGRATE · Retail · medium · write**

Interrupted promotion rollback contrasts with a successful atomic refresh; state checks distinguish the outcomes.

Task: Simulate an interrupted promotion: BEGIN, DELETE published_totals, INSERT from refresh_stage, ROLLBACK. Return customer_id,total_sales; the old snapshot must remain.

Edge contracts: see the linked lesson review and its quiz.





## lc-85-1: Stage, validate & atomically promote a refresh · Challenge 2

**MIGRATE · Retail · medium · write**

Interrupted promotion rollback contrasts with a successful atomic refresh; state checks distinguish the outcomes.

Task: Promote the known-valid refresh_stage in a transaction: DELETE old rows, INSERT staged rows, COMMIT. Return customer_id,total_sales.

Edge contracts: see the linked lesson review and its quiz.





## lc-86-0: Protect fact grain when joining versions · Challenge 1

**MIGRATE · Retail · medium · write**

Current-country aggregation contrasts with historical-country attribution; each protects fact grain against version fan-out.

Task: Return country,total_sales using CURRENT customer_history version, for facts with a customer history match. Group by current country.

Edge contracts: see the linked lesson review and its quiz.





## lc-86-1: Protect fact grain when joining versions · Challenge 2

**MIGRATE · Retail · medium · write**

Current-country aggregation contrasts with historical-country attribution; each protects fact grain against version fan-out.

Task: Return country,total_sales using the customer_history version effective at each sale date; group by historical country.

Edge contracts: see the linked lesson review and its quiz.





## lc-87-0: Capstone: integrated customers to trusted sales · Challenge 1

**MIGRATE · Retail · hard · write**

Integrated customer reporting transfers to country totals; shared validated TEMP outputs support deliberate capstone consolidation.

Task: Create TEMP integrated_customers using the integration contract, and TEMP built_sales using the Gold validation rules from lesson Gold: dimensions, facts & quality gates. Return customer_id,name,gender,country,sales_lines,total_sales for valid CRM customers with a dimension match; preserve customers with no valid sales as 0 totals.

Edge contracts: see the linked lesson review and its quiz.





## lc-87-1: Capstone: integrated customers to trusted sales · Challenge 2

**MIGRATE · Retail · hard · write**

Integrated customer reporting transfers to country totals; shared validated TEMP outputs support deliberate capstone consolidation.

Task: Create the same two TEMP outputs. Return country,total_sales at integrated country grain, preserving countries with no sales as 0.

Edge contracts: see the linked lesson review and its quiz.





## qb-0001: Shopper contact list

**MIGRATE · Retail · warmup · write**

Choose specific columns with SELECT. One table, two named columns, no filtering.

Task: Return the name and email of every shopper.

Edge contracts: Include shoppers whose email is missing (it shows as NULL).

Tested wrong approaches: returns every column; drops shoppers without an email.

Prerequisite lesson IDs: 0.

## qb-0002: Shoppers in the West region

**MIGRATE · Retail · warmup · write**

Filter rows with WHERE and a text value. A single equality filter on one table.

Task: Return the id and name of shoppers whose region is West.

Edge contracts: Region values are capitalised exactly as 'West'.

Tested wrong approaches: reversed condition; no filter.

Prerequisite lesson IDs: 3.

## qb-0003: Catalog from most to least expensive

**MIGRATE · Retail · warmup · write**

Sort descending and break ties with a second key. One table and one sort, plus a stated tie-breaker.

Task: Return the name and price of every catalog item, most expensive first.

Edge contracts: When two items have the same price, list them by name A→Z.

Tested wrong approaches: cheapest first; no tie-breaker.

Prerequisite lesson IDs: 8.

## qb-0004: Orders with no delivery date

**MIGRATE · Retail · warmup · write**

Find missing values with IS NULL. One IS NULL test on one table.

Task: Return the id and status of every order whose delivered_date is missing.

Edge contracts: Look at delivered_date itself — one delivered order is missing its date, and it should be included.

Tested wrong approaches: = NULL is never true; uses status instead of the date.

Prerequisite lesson IDs: 7.

## qb-0005: The three cheapest items

**MIGRATE · Retail · warmup · write**

Combine ORDER BY with LIMIT. One sort plus LIMIT on one table.

Task: Return the name and price of the 3 cheapest catalog items, cheapest first.

Edge contracts: Break price ties by name A→Z.

Tested wrong approaches: most expensive instead; no LIMIT.

Prerequisite lesson IDs: 8.

## qb-0006: Rename a column

**MIGRATE · Developer Platform · warmup · write**

Name an output column with AS. One table, one alias.

Task: Return each employee's name and salary, naming the salary column annual_salary.

Edge contracts: see the linked lesson review and its quiz.

Tested wrong approaches: column not renamed; changes the value.

Prerequisite lesson IDs: 1.

## qb-0007: Office locations

**MIGRATE · Developer Platform · warmup · write**

Remove duplicate values with DISTINCT. DISTINCT on a single column.

Task: Return each department location once (column location).

Edge contracts: see the linked lesson review and its quiz.

Tested wrong approaches: duplicates kept.

Prerequisite lesson IDs: 2.

## qb-0008: Hired during 2023

**MIGRATE · Developer Platform · warmup · write**

Filter an inclusive date range. One inclusive date range on one table.

Task: Return the name and hired_at of employees hired during 2023.

Edge contracts: Include 1 January 2023 and 31 December 2023. Dates are stored as YYYY-MM-DD text.

Tested wrong approaches: excludes both boundary days; no upper bound.

Prerequisite lesson IDs: 4.

## qb-0009: Orders by status

**MIGRATE · Retail · easy · write**

Count rows per group. One GROUP BY with COUNT on one table.

Task: Return each order status and how many orders have it (order_count).

Edge contracts: see the linked lesson review and its quiz.

Tested wrong approaches: counts shoppers, not orders; no grouping.

Prerequisite lesson IDs: 10.

## qb-0010: Items nobody has ordered

**MIGRATE · Retail · easy · write**

Find rows with no match in another table. A LEFT JOIN anti-join between two tables.

Task: Return the id and name of catalog items that appear on no order line.

Edge contracts: Any order line counts, whatever the order's status.

Tested wrong approaches: returns items that were ordered; compares to the wrong key.

Prerequisite lesson IDs: 15.

## qb-0011: Repeat shoppers

**MIGRATE · Retail · easy · write**

Filter groups with HAVING. GROUP BY with a HAVING condition on one table.

Task: Return shopper_id and order_count for shoppers who placed at least 2 orders.

Edge contracts: Count orders of every status, including cancelled ones.

Tested wrong approaches: excludes exactly 2; drops cancelled orders.

Prerequisite lesson IDs: 11.

## qb-0012: Delivered revenue by category

**MIGRATE · Retail · easy · write**

Aggregate a calculated value across joined tables. Two joins and one SUM per group; no nesting.

Task: For delivered orders only, return category and revenue: the sum of quantity × unit_price from order_lines.

Edge contracts: Use order_lines.unit_price (what was charged), not the catalog's current price. Round revenue to 2 decimals.

Tested wrong approaches: uses the catalog price; includes every status.

Prerequisite lesson IDs: 16.

## qb-0013: Signups in the last 30 days

**MIGRATE · Retail · easy · write**

Turn a rolling period into exact date boundaries. One table, but the inclusive 30-day window must be worked out.

Task: Return the name and signup_date of shoppers who signed up in the 30 days ending on 2025-03-31.

Edge contracts: The 30 days are 2025-03-02 through 2025-03-31, both included.

Tested wrong approaches: misses the last day; 31 days, no end.

Prerequisite lesson IDs: 39.

## qb-0014: Emails used more than once

**MIGRATE · Retail · easy · write**

Normalise text before comparing it. String normalisation plus GROUP BY/HAVING on one table.

Task: Some shoppers share an email once you ignore letter case and surrounding spaces. Return clean_email and shopper_count for every such email used by more than one shopper.

Edge contracts: clean_email = the email trimmed and lowercased. Ignore shoppers with no email.

Tested wrong approaches: no normalisation; spaces not trimmed.

Prerequisite lesson IDs: 33, 11.

## qb-0015: Employees and their departments

**MIGRATE · Developer Platform · easy · write**

Join two tables on a key. One INNER JOIN on a foreign key.

Task: Return employee (the employee's name) and department (the department's name) for employees who belong to a department.

Edge contracts: Employees without a department are not listed.

Tested wrong approaches: includes employees without a department; wrong join key.

Prerequisite lesson IDs: 14.

## qb-0016: Every employee, with a department label

**MIGRATE · Developer Platform · easy · write**

Keep unmatched rows and label them. LEFT JOIN plus COALESCE for the missing side.

Task: Return employee and department for every employee. Use 'Unassigned' as the department when an employee has none.

Edge contracts: see the linked lesson review and its quiz.

Tested wrong approaches: drops unassigned employees; NULL instead of 'Unassigned'.

Prerequisite lesson IDs: 15, 7.

## qb-0017: Find the lamps

**MIGRATE · Retail · easy · write**

Search text with LIKE and wildcards. One LIKE pattern, but case behaviour matters.

Task: Return the id and name of catalog items whose name contains “lamp” anywhere, in any letter case.

Edge contracts: “Desk Lamp” and “Floor lamp” both count.

Tested wrong approaches: only names starting with lamp; GLOB is case-sensitive.

Prerequisite lesson IDs: 6.

## qb-0018: Open orders in February and March

**MIGRATE · Retail · easy · write**

Combine conditions without precedence mistakes. IN plus BETWEEN combined correctly; operator precedence is the trap.

Task: Return id, status and order_date for orders that are shipped or processing and were placed from 2025-02-01 through 2025-03-31.

Edge contracts: Both boundary dates are included.

Tested wrong approaches: OR without parentheses; no date range.

Prerequisite lesson IDs: 5, 6.

## qb-0019: Average salary by department

**MIGRATE · Developer Platform · easy · write**

Average per group across a join. One join, one AVG per group, rounding.

Task: Return department (name) and avg_salary for every department that has at least one employee.

Edge contracts: Round avg_salary to 2 decimals.

Tested wrong approaches: lists empty departments; averages the wrong column.

Prerequisite lesson IDs: 9, 14.

## qb-0020: Price bands

**MIGRATE · Retail · easy · write**

Bucket values with CASE. A three-way CASE with exact boundaries.

Task: Return name and price_band for every catalog item: 'budget' when price is under 25, 'standard' from 25 up to (not including) 100, 'premium' at 100 or more.

Edge contracts: An item priced exactly 25 is standard.

Tested wrong approaches: 25 classed as budget.

Prerequisite lesson IDs: 12.

## qb-0021: Active buyers per month

**MIGRATE · Retail · easy · write**

Count distinct people per calendar month. Month bucketing plus a distinct count, one table.

Task: Return month (YYYY-MM) and active_shoppers: how many different shoppers placed at least one non-cancelled order that month.

Edge contracts: Cancelled orders don't count. A shopper with several orders in a month counts once.

Tested wrong approaches: counts orders; includes cancelled orders.

Prerequisite lesson IDs: 26, 39.

## qb-0022: How long did delivery take?

**MIGRATE · Retail · easy · write**

Subtract dates correctly in SQLite. One date difference with a NULL guard.

Task: For delivered orders that have a delivered_date, return id and days_to_deliver: the number of whole days from order_date to delivered_date.

Edge contracts: Skip orders without a delivered_date. Return a whole number (integer).

Tested wrong approaches: text subtraction; keeps the order with no date.

Prerequisite lesson IDs: 26.

## qb-0023: Create a wishlist table

**MIGRATE · Retail · easy · write**

Define a table with a composite primary key and NOT NULL columns. One CREATE TABLE with a composite key and two inserts.

Task: Create a table wishlist with shopper_id INTEGER NOT NULL, item_id INTEGER NOT NULL and added_on TEXT, where (shopper_id, item_id) is the primary key. Insert (1, 12, '2025-03-01') and (2, 4, '2025-03-02'), then return all wishlist rows ordered by shopper_id.

Edge contracts: The same shopper can't list the same item twice. Neither id may be NULL.

Tested wrong approaches: no primary key; ids can be NULL; output only, no table.

Prerequisite lesson IDs: 58, 60.

## qb-0024: Reprice the garden range

**MIGRATE · Retail · easy · write**

Change and remove rows safely with WHERE. One UPDATE and one DELETE with WHERE, then a SELECT.

Task: Raise the price of every Garden item by 10%, and delete the item named 'Wall Clock' (it was never sold). Then return id, name and price of all catalog items.

Edge contracts: Round price to 2 decimals in the output. Other categories keep their prices.

Tested wrong approaches: repriced every item; item not deleted.

Prerequisite lesson IDs: 59.

## qb-0025: Big spenders for their region

**MIGRATE · Retail · medium · write**

Compare each row with an aggregate of its own group. Aggregate per shopper, then compare with a per-region average (correlated subquery or CTE); NULL regions excluded.

Task: A shopper's spend is the sum of quantity × unit_price over their delivered orders. Return name, region and spend for shoppers whose spend is greater than the average spend of shoppers in the same region.

Edge contracts: Only shoppers with at least one delivered order are part of a region's average. Shoppers with no region are excluded. Round spend to 2 decimals (compare unrounded values).

Tested wrong approaches: compares with the overall average; counts every order status.

Prerequisite lesson IDs: 17, 20, 16.

## qb-0026: Monthly revenue after refunds

**MIGRATE · Retail · medium · write**

Combine line totals and refunds without double counting. Two child tables at order grain must be aggregated separately to avoid fan-out; NULL refunds must become 0.

Task: For delivered orders, return month (YYYY-MM of order_date) and net_revenue: line revenue (quantity × unit_price) minus refunds for those orders.

Edge contracts: Orders without refunds subtract 0. Round net_revenue to 2 decimals. Months with no delivered orders aren't listed.

Tested wrong approaches: fan-out between lines and refunds; NULL refunds drop whole orders.

Prerequisite lesson IDs: 26, 49, 50.

## qb-0027: Bestsellers within each category

**MIGRATE · Retail · medium · write**

Rank aggregated values per group with DENSE_RANK. Aggregate after a join, then rank within groups with a stated tie rule.

Task: For non-cancelled orders, total the units (quantity) sold per catalog item. Return category, name, units and category_rank, where rank 1 is the item with the most units in its category.

Edge contracts: Tied items share a rank and the next rank is not skipped (1, 1, 2). Items with no units sold are not listed.

Tested wrong approaches: RANK skips after ties; ranks across all categories.

Prerequisite lesson IDs: 22, 25.

## qb-0028: Seven-day rolling active shoppers

**MIGRATE · Retail · medium · write**

Use a RANGE frame so missing days count as zero. Deduplicate to daily counts, then a calendar-based (not row-based) window frame over gaps.

Task: For each date in app_logins, return login_date, active_shoppers (different shoppers who logged in that day) and rolling_7d: the sum of active_shoppers over that date and the 6 calendar days before it.

Edge contracts: A shopper logging in twice in a day counts once. Days with no logins contribute 0 — the window is 7 calendar days, not 7 rows.

Tested wrong approaches: 7 rows, not 7 days; duplicate logins counted.

Prerequisite lesson IDs: 42, 45.

## qb-0029: Above the manager and department benchmark

**REWRITE · Developer Platform · medium · write**

Combine a self join with a correlated department benchmark. Two role aliases plus an own-group average require two separate comparisons; unknown relationships are excluded.

Task: Return employee, employee_salary, manager and manager_salary for employees who earn strictly more than both their direct manager and the average salary in their own department. Exclude employees without a department or manager.

Edge contracts: Equal salaries don't count. Employees without a manager can't qualify. The department average includes all employees assigned to that department, including the employee being tested. Both comparisons are strict; equality does not qualify.

Tested wrong approaches: includes equal salaries; join direction reversed; Checks only the manager and ignores the department benchmark..

Prerequisite lesson IDs: 17, 34.

## qb-0030: Days with no orders

**MIGRATE · Retail · medium · write**

Find missing dates by building a calendar. Requires generating a date series (recursive CTE) and an anti-join against it.

Task: From 2025-03-01 through 2025-03-14, return each day (column day, YYYY-MM-DD) on which no order was placed, earliest first.

Edge contracts: Both boundary days are included. Any order status counts as an order.

Tested wrong approaches: stops a day early; days with orders.

Prerequisite lesson IDs: 35, 18.

## qb-0031: First order versus latest order

**MIGRATE · Retail · medium · write**

Pick first and last rows per group, not minimum and maximum values. Order totals, then picking first and last rows per shopper with explicit tie rules.

Task: For shoppers with at least two non-cancelled orders, return shopper_id, first_order_value and latest_order_value. An order's value is the sum of its lines' quantity × unit_price.

Edge contracts: “First” and “latest” go by order_date; on the same date, the higher order id is later. Round values to 2 decimals.

Tested wrong approaches: smallest/largest instead of first/latest; includes cancelled orders.

Prerequisite lesson IDs: 25, 41.

## qb-0032: Orders whose payments don't match

**MIGRATE · Retail · medium · write**

Compare totals from two child tables without fan-out. Two child tables at different grains (lines, split payments) plus missing payments.

Task: For delivered or shipped orders, return id, order_total (sum of quantity × unit_price), paid_total (sum of payments) and balance (order_total − paid_total) where paid_total differs from order_total.

Edge contracts: Orders with no payment have paid_total 0. Round all three amounts to 2 decimals and compare the rounded totals.

Tested wrong approaches: unpaid orders disappear; fan-out between lines and payments.

Prerequisite lesson IDs: 49, 15.

## qb-0033: Order status mix by region

**MIGRATE · Retail · medium · write**

Turn rows into columns with SUM(CASE …). Pivot with conditional aggregation across a join, plus a NULL group label.

Task: Return region and four columns — delivered, shipped, processing, cancelled — counting the orders of shoppers in that region with each status.

Edge contracts: Shoppers with no region are grouped under 'Unknown'. A region with no orders of a status shows 0.

Tested wrong approaches: COUNT counts the zeros too; NULL region not labelled.

Prerequisite lesson IDs: 13, 14.

## qb-0034: Loyal shoppers who never needed a refund

**MIGRATE · Retail · medium · write**

Combine “at least N” with “never” conditions. Combines a counted EXISTS-style condition with a NOT EXISTS across two hops.

Task: Return the id and name of shoppers who have at least two delivered orders and have never received a refund on any of their orders.

Edge contracts: A refund on any order — delivered or not — disqualifies the shopper.

Tested wrong approaches: only skips the refunded orders; counts every status.

Prerequisite lesson IDs: 18, 11.

## qb-0035: Average order value by month

**MIGRATE · Retail · medium · write**

Aggregate to the right grain before averaging. The average must be over orders, not lines — a two-step aggregation.

Task: For delivered orders, return month (YYYY-MM of order_date) and avg_order_value: the average of each order's total (sum of quantity × unit_price).

Edge contracts: Round to 2 decimals.

Tested wrong approaches: averages lines.

Prerequisite lesson IDs: 26, 20.

## qb-0036: Payroll versus budget

**MIGRATE · Developer Platform · medium · write**

Report every group, including empty ones, and classify it. LEFT JOIN aggregation with zero-filled groups and a strict comparison.

Task: For every department, return department, headcount, payroll (sum of salaries) and status: 'over' when payroll exceeds the budget, otherwise 'within'.

Edge contracts: Departments with no employees show headcount 0 and payroll 0. Payroll equal to the budget is 'within'.

Tested wrong approaches: COUNT(*) reports 1 for empty departments; equal counted as over.

Prerequisite lesson IDs: 15, 12.

## qb-0037: Keep one account per email

**MIGRATE · Retail · medium · write**

Deduplicate by a cleaned key, keeping a defined survivor. Normalisation plus a ranked pick per group with a tie-breaker.

Task: Treat emails as equal after trimming spaces and lowercasing. For each email, keep the shopper who signed up first. Return id, name and clean_email for the kept shoppers.

Edge contracts: Ties on signup_date go to the lower id. Shoppers with no email are excluded.

Tested wrong approaches: partitions by the raw email; keeps the newest account.

Prerequisite lesson IDs: 44, 33.

## qb-0038: A covering index for unit totals

**MIGRATE · Retail · medium · write**

Design a composite index that covers a query. Requires understanding composite index column order, verified on the built index.

Task: The report “units sold per item” reads order_lines.item_id and quantity. Create an index named idx_lines_item_qty on order_lines that starts with item_id and also contains quantity, so SQLite can answer from the index alone. Then return item_id and units (sum of quantity) per item.

Edge contracts: Column order in the index matters: item_id first, then quantity.

Tested wrong approaches: columns in the wrong order; not covering; no index.

Prerequisite lesson IDs: 66, 67.

## qb-0039: A reusable shopper totals view

**MIGRATE · Retail · medium · write**

Encapsulate a correct aggregate in a view. A view over a join that must count orders, not lines; checked on the view's definition.

Task: Create a view shopper_order_totals with columns shopper_id, orders (number of non-cancelled orders) and total_spend (sum of quantity × unit_price over those orders, 2 decimals). Then return the view's rows where total_spend is above 150.

Edge contracts: orders counts orders, not order lines. Only shoppers with at least one non-cancelled order appear in the view.

Tested wrong approaches: counts lines; no view created.

Prerequisite lesson IDs: 62, 20.

## qb-0040: Second-highest salary per department

**MIGRATE · Developer Platform · medium · write**

Find the Nth distinct value per group, returning NULL when it doesn't exist. Distinct values, ranking per group, and a NULL result when there is no second value.

Task: For each department that has employees, return department and second_highest_salary: the second-highest distinct salary in that department.

Edge contracts: Equal salaries count once (distinct values). If a department has only one distinct salary, second_highest_salary is NULL.

Tested wrong approaches: ties not treated as one value; drops departments without a second salary.

Prerequisite lesson IDs: 22, 53.

## qb-0041: Next-month retention by signup cohort

**MIGRATE · Retail · hard · write**

Build a cohort retention table with a maturity rule. Cohort assignment, a relative calendar month, an observation cutoff and decimal ratios.

Task: Group shoppers into cohorts by signup month. A shopper is retained if they placed a non-cancelled order in the calendar month after their signup month. Return cohort_month, cohort_size, retained and retention_pct.

Edge contracts: cohort_month is YYYY-MM; cohort_size counts every shopper who signed up that month, even those who never ordered. Only include cohorts whose following month ends on or before 2025-03-31 (later months aren't fully observed). retention_pct is 0–100 with 2 decimals.

Tested wrong approaches: integer division; any later month counts; includes immature cohorts.

Prerequisite lesson IDs: 47, 26.

## qb-0042: Longest login streak

**MIGRATE · Retail · hard · write**

Find runs of consecutive days. Gaps-and-islands: deduplicate, derive a group key from dates minus row numbers, then aggregate twice.

Task: For each shopper in app_logins, return shopper_id and longest_streak: the most consecutive calendar days on which they logged in.

Edge contracts: Several logins on the same day count as one day. Streaks may cross a month boundary.

Tested wrong approaches: duplicate logins break the islands; total days, not a streak.

Prerequisite lesson IDs: 21, 35.

## qb-0043: Salary at the time of each review

**MIGRATE · Developer Platform · hard · write**

Join facts to the history version valid at the event date. As-of lookup over half-open, open-ended intervals with overlapping bad data and missing history.

Task: For every performance review, return review_id, employee_id, review_date and salary_at_review: the salary from salary_history whose period contains the review date.

Edge contracts: A period covers a date when valid_from ≤ date and (valid_to is NULL or date < valid_to). If more than one period covers the date (bad data), use the one with the latest valid_from. If no period covers it, salary_at_review is NULL — keep the review.

Tested wrong approaches: uses today's salary; duplicates on overlaps and drops uncovered reviews; closed interval and earliest version.

Prerequisite lesson IDs: 78, 86.

## qb-0044: Detect overlapping history periods

**MIGRATE · Developer Platform · hard · write**

Validate that history intervals don't overlap. Interval-overlap logic on a self-join with half-open bounds, open ends and no duplicate pairs.

Task: Within one employee's salary_history, periods must not overlap. Return employee_id, first_from and second_from for every pair of overlapping periods, where first_from is the earlier valid_from.

Edge contracts: A period runs from valid_from up to but not including valid_to; NULL valid_to means it is still open. Periods that touch (one ends the day the next starts) do not overlap. Report each overlapping pair once.

Tested wrong approaches: touching periods flagged; pairs reported twice / in both orders.

Prerequisite lesson IDs: 78, 34.

## qb-0045: Management chain for every employee

**MIGRATE · Developer Platform · hard · write**

Traverse a tree with a recursive CTE. A recursive walk of a hierarchy with several roots, carrying depth and a path string.

Task: Starting from every employee with no manager, return id, name, level (top = 1) and chain: the names from the top of the hierarchy down to the employee, joined by ' > '.

Edge contracts: There can be more than one person with no manager — each starts their own tree. A top-level chain is just that person's name.

Tested wrong approaches: only one root; levels start at 0.

Prerequisite lesson IDs: 27, 34.

## qb-0046: Median order value by region

**MIGRATE · Retail · hard · write**

Compute a median with window functions. No MEDIAN in SQLite: needs order totals, per-group positions and correct even/odd handling.

Task: An order's value is the sum of quantity × unit_price over its lines. For non-cancelled orders, return region and median_order_value per shopper region.

Edge contracts: With an odd number of orders, the median is the middle value; with an even number, the average of the two middle values. Exclude shoppers with no region. Round to 2 decimals.

Tested wrong approaches: mean, not median; even counts use one middle value.

Prerequisite lesson IDs: 21, 43.

## qb-0047: Build a region history from snapshots

**MIGRATE · Retail · hard · write**

Compress snapshots into change history. Gaps-and-islands with NULL as a real value, non-adjacent repeats, and LEAD for end dates (an SCD Type 2 build).

Task: shopper_snapshots records each shopper's region at month end. Return shopper_id, region, valid_from and valid_to — one row per unbroken run of the same region.

Edge contracts: valid_from is the run's first snapshot_date; valid_to is the first snapshot_date of the shopper's next run, or NULL for the latest run. A missing region (NULL) is its own value: consecutive NULL snapshots form one run. If a shopper returns to an earlier region later, that's a new run.

Tested wrong approaches: merges non-adjacent runs; <> ignores changes to and from NULL.

Prerequisite lesson IDs: 83, 40.

## qb-0048: Reconcile orders, payments and refunds

**MIGRATE · Retail · hard · write**

Reconcile several sources without double counting and classify mismatches. Three child tables at different grains, classification rules, and NULL/rounding handling.

Task: For every non-cancelled order, compute order_total (lines), paid (payments) and refunded (refunds), and classify payment_check: 'unpaid' when nothing was paid, 'underpaid' when paid < order_total, 'overpaid' when paid > order_total, otherwise 'ok'. Return id, order_total, paid, refunded and payment_check for orders that are not 'ok'.

Edge contracts: Missing payments or refunds count as 0. Round order_total, paid and refunded to 2 decimals and classify using the rounded values. Refunds don't change payment_check (a refund is a separate event).

Tested wrong approaches: fan-out across three child tables; unpaid orders dropped; refunds change the payment check.

Prerequisite lesson IDs: 50, 49.

## qb-0049: Design a purchase lookup index

**MIGRATE · Retail · hard · write**

Combine two equality predicates and a timestamp range in a composite index. Choose equality-prefix and range-key order, preserve a half-open boundary, and satisfy a catalog plus plan contract.

Task: Retail needs the purchases for shopper 42 on January 4, 2025. Create a full index with exactly (shopper_id, event_kind, event_at), in that order, then return id, event_at and amount for those purchases. The submitted SELECT must use an indexed search through that index.

Edge contracts: Use event_kind = purchase and the half-open timestamp interval [2025-01-04 00:00:00, 2025-01-05 00:00:00). Order by event_at, then id, ascending. Choose any index name; do not change source rows. This controlled archive contains 12,005 rows. Indexed access is the learning objective, not a claim about elapsed execution time.

Tested wrong approaches: Returns the right rows without creating the required index.; Puts the range key before the second equality key.; Creates the index but scans the table instead of using it.; Includes the next day at midnight..

Prerequisite lesson IDs: 66, 67, 39.

## qb-0050: Cover the event export

**MIGRATE · Retail · hard · write**

Build an index that supplies the selected payload without a table lookup. Separate filter keys from payload columns and demonstrate covering access while preserving a time boundary.

Task: Export event_at and amount for shopper 7 on January 4, 2025. Create a full index with exactly (shopper_id, event_at, amount) and make the final query use a covering indexed search.

Edge contracts: Use the half-open interval [2025-01-04 00:00:00, 2025-01-05 00:00:00). Order by event_at then amount, ascending. Choose any index name. Keep the source data unchanged. This task checks covering access, not execution time.

Tested wrong approaches: Omits the payload column from the index.; Does not use the covering index..

Prerequisite lesson IDs: 66, 67, 68.

## qb-0051: Make the event-day filter SARGable

**MIGRATE · Retail · medium · write**

Preserve day-filter semantics while enabling a timestamp index search. Rewrite a function-wrapped timestamp predicate as a half-open range and verify the resulting access.

Task: The starting approach is SELECT id,event_at,amount FROM market_query_log WHERE date(event_at)='2025-01-04' ORDER BY event_at,id. Rewrite the filter, create a full index on exactly (event_at), and return the same rows using an indexed search.

Edge contracts: Timestamps are normalized UTC ISO strings. Include midnight on January 4, exclude midnight on January 5. Order by event_at then id ascending. Do not change source rows or use an expression index.

Tested wrong approaches: Leaves a function on the indexed column: correct output, wrong access.; Includes next-day midnight..

Prerequisite lesson IDs: 66, 67, 68.

## qb-0052: Top events without a temporary sort

**MIGRATE · Retail · hard · write**

Use reverse index traversal to satisfy a tie-broken top-N request without a temporary B-tree. Align equality filtering, two descending sort keys and a deterministic top-N boundary with index traversal.

Task: Return the eight highest-amount events for shopper 5, breaking ties by larger id first. Build a full index with exactly (shopper_id, amount, id). Require an indexed search and no temporary sorting B-tree in the final plan.

Edge contracts: Order by amount DESC, id DESC, limit 8. Keep source rows unchanged. This exercise expressly requires avoiding temporary sorting; no general speed claim is made.

Tested wrong approaches: Computes the sort key and forces a temporary sort despite correct output.; Uses the wrong tie-break direction..

Prerequisite lesson IDs: 66, 67, 68.

## qb-0053: A truly ordered workspace activation

**REWRITE · Product / SaaS Analytics · hard · write**

Find an ordered activation path while ignoring duplicate deliveries and late ingestion. Combines three event roles, relative-time bounds and bag-to-set output while distinguishing ingestion from behavior.

Task: Return account_id for each workspace with signup followed by project_created followed by invite_sent, all within seven days of that signup. Equal event times are allowed. Use physical occurred_at timestamps, and return each qualifying workspace once.

Edge contracts: Match all three events within the same workspace. The seven-day endpoint is inclusive. A workspace qualifies if any valid path exists; repeated event deliveries must not duplicate its output.

Tested wrong approaches: Checks stage membership without sequence or deadline.; Accepts an invitation after the seven-day activation deadline..

Prerequisite lesson IDs: 18, 20, 46.

## qb-0054: Identify abandoned checkout attempts

**MIGRATE · Retail · medium · write**

Find checkout attempts without a timely later purchase of the same cart. Use a same-cart anti-join with a temporal deadline and distinguish attempts from shoppers.

Task: At the fixed observation cutoff 2025-05-03 00:00:00, list each canonical checkout that had no later purchase of the same cart within 30 minutes. Return checkout_id, shopper_id, cart_id and its deadline.

Edge contracts: Deduplicate globally by event_key, keeping the smallest id; a retry may have a conflicting payload. Use (occurred_at, id) as the total event order; equal timestamps follow id order. All times are UTC. All provided checkout deadlines are before the observation cutoff. A purchase at the deadline counts as timely. Different checkout keys are separate attempts even if timestamps match. Order by checkout_id.

Tested wrong approaches: Lets a purchase of a different cart rescue checkout.; Treats a much later recovery as a timely conversion..

Prerequisite lesson IDs: 20, 21, 24, 48.

## qb-0055: Audit conflicting event retries

**MIGRATE · Retail · medium · write**

Separate logical event identity from ingestion row identity. Select a canonical row while retaining multiplicity and detecting retries with conflicting payload.

Task: Report only retried event keys. Return event_key, the smallest id as canonical_id, the event_type from that canonical row as canonical_type, and the number of additional ingestion rows as retry_count.

Edge contracts: Deduplicate globally by event_key, keeping the smallest id; a retry may have a conflicting payload. Use (occurred_at, id) as the total event order; equal timestamps follow id order. All times are UTC. Count all retry rows even when their payload differs. Order by event_key.

Tested wrong approaches: Takes the smallest event type rather than the canonical row payload.; Counts the original event as a retry..

Prerequisite lesson IDs: 20, 21, 24, 48.

## qb-0056: Sessionize retries and exact boundaries

**MIGRATE · Retail · hard · write**

Build stable session identifiers from canonical events and inactivity gaps. Deduplicate before LAG, flag strict inactivity boundaries and use a row-based running sum with deterministic ties.

Task: Assign each canonical website event a session_no for its shopper. Return shopper_id, event_id and session_no, in shopper and event order.

Edge contracts: Deduplicate globally by event_key, keeping the smallest id; a retry may have a conflicting payload. Use (occurred_at, id) as the total event order; equal timestamps follow id order. All times are UTC. A shopper starts a session at the first canonical event or after a gap strictly greater than 30 minutes from their previous canonical event. Exactly 30 minutes stays in the same session; midnight alone does not split it. Session numbers start at 1 per shopper and include every event type, including heartbeat and purchase-only sessions. Order by shopper_id, occurred_at, id; occurred_at is only a sort key, not an output column.

Tested wrong approaches: Starts a new session at exactly 30 minutes.; Includes retries as additional events..

Prerequisite lesson IDs: 20, 21, 24, 48.

## qb-0057: Attribute session conversion to first touch

**MIGRATE · Retail · hard · write**

Measure session-level conversion using a deterministic acquisition channel. Combine sessionization, first-touch attribution and an ordered same-cart funnel without counting event rows as sessions.

Task: For each first-touch channel, count sessions and converted_sessions, then return conversion_pct rounded to two decimals. A converted session contains an ordered view → checkout → purchase of the same cart within that session.

Edge contracts: Deduplicate globally by event_key, keeping the smallest id; a retry may have a conflicting payload. Use (occurred_at, id) as the total event order; equal timestamps follow id order. All times are UTC. A shopper starts a session at the first canonical event or after a gap strictly greater than 30 minutes from their previous canonical event. Exactly 30 minutes stays in the same session; midnight alone does not split it. Session numbers start at 1 per shopper and include every event type, including heartbeat and purchase-only sessions. Attribute the whole session to the channel of its first event. Conversion is binary per session, regardless of how many carts convert. There is no additional view-to-purchase time limit. Include zero-conversion channels. Order by channel.

Tested wrong approaches: Counts successful paths instead of binary converted sessions.; Truncates the rate with integer division..

Prerequisite lesson IDs: 20, 21, 24, 48.

## qb-0058: Build a replay-safe ledger load

**MIGRATE · Retail · hard · write**

Implement an idempotent upsert that handles duplicate source versions and late stale records. Resolve conflicting source versions, preserve newer target records and prove repeated execution is safe.

Task: Merge market_load_feed into market_ledger. For each external_id choose the highest source version, breaking ties by greatest feed id. Insert missing keys and replace a target only when the source version is at least its version. Return the entire final ledger.

Edge contracts: Do not delete target-only or newer target rows. Z starts at version 9, amount 90 and must survive its stale feed record. Order by external_id. Your complete script is tested twice on the same database to check that it is safe to rerun. This is checked with both the sample data and different data. The feed is immutable; do not clear it or use a one-shot marker to bypass processing.

Tested wrong approaches: Overwrites a newer target with a stale source version.; Works once but fails when the whole script is replayed.; Chooses the wrong source record at a tied version..

Prerequisite lesson IDs: 59, 84.

## qb-0059: Enforce the reservation boundary

**MIGRATE · Retail · hard · write**

Separate staging cleanup from durable relational and domain constraints. Filter invalid references and storage types before deduplicating, then enforce equivalent rules for future writes.

Task: Create safe_reservations with shopper_id, item_id and quantity. Load the latest valid feed row for each shopper/item pair, then return the loaded rows. Valid input has existing shopper and item keys and an integer-stored quantity from 1 through 5.

Edge contracts: Filter invalid feed rows before choosing greatest feed id per pair. A later invalid row must not suppress an earlier valid one. The target must reject NULL keys, orphan keys, duplicate pairs, NULL quantity, fractional quantity and quantities outside 1–5; valid new rows must remain insertable. Use a composite primary key, NOT NULL, foreign keys and a quantity CHECK including typeof(quantity). Order by shopper_id,item_id.

Tested wrong approaches: Produces correct initial rows but accepts invalid future quantities.; Omits foreign keys: future orphan reservations succeed.; Loads the oldest valid row instead of the latest..

Prerequisite lesson IDs: 58, 60, 65.

## qb-0060: Recover a failed stock allocation

**MIGRATE · Retail · hard · write**

Verify recovery by the final state of all affected tables, not transaction keywords. Recover both stock and audit effects of a rejected batch, preserve history and apply a valid batch atomically.

Task: The rejected batch cannot fit available stock: its item 2 request exceeds availability. Demonstrate recovery from a provisional reservation of 2 units of item 1 and a rejected audit entry, then apply only the accepted batch. Return item_id, available and reserved from the final stock table.

Edge contracts: Use a savepoint to undo the provisional stock and audit work, then commit the accepted batch. Your answer is checked by looking at the resulting tables, without requiring particular SQL keywords. Every stock row starts with available=capacity and reserved=0. Preserve all capacities and the historical audit row (units=5). End with one accepted audit row whose units equal the accepted feed total, no rejected audit row, and each stock balance adjusted exactly once for its accepted quantity. Order by item_id.

Tested wrong approaches: Commits the rejected provisional stock and audit changes.; Returns correct stock but leaves a rejected audit artifact..

Prerequisite lesson IDs: 61, 85.

## qb-0061: Measure co-purchased product pairs

**MIGRATE · Retail · medium · write**

Count distinct baskets supporting each unordered product combination. Self-join a bridge table while eliminating self-pairs, mirrored pairs and quantity weighting.

Task: Find unordered pairs of distinct products appearing together in delivered orders. Return the smaller item id as item_a, the larger as item_b, and the number of shared orders.

Edge contracts: Count an order once regardless of item quantities. The order_lines primary key is (order_id,item_id). Only delivered orders qualify. Order by shared_orders descending, then item_a,item_b ascending.

Tested wrong approaches: Counts both mirrored versions of each pair.; Weights basket support by quantities..

Prerequisite lesson IDs: 16, 18, 49.

## qb-0062: Find shoppers in every category

**MIGRATE · Retail · hard · write**

Find entities related to every member of a changing required set. Express relational division over a dynamic category universe, respecting delivered-order membership.

Task: Return shoppers who bought at least one item from every distinct category currently in catalog_items, considering only delivered orders.

Edge contracts: Derive the required category set from the catalog; do not hardcode four categories or named categories. Multiple products and orders in one category count only once. Include every qualifying shopper and order by shopper_id. This exercise adds two illustrative orders to the standard Retail data; previews include them.

Tested wrong approaches: Lets a cancelled order satisfy a required category.; Hardcodes the initial number of categories..

Prerequisite lesson IDs: 16, 18, 49.

## qb-0063: Compare category audience overlap

**MIGRATE · Retail · hard · write**

Compute Jaccard overlap without inflating membership by line-item or repeat-order counts. Reduce the bridge to shopper/category membership before computing set intersections and unions.

Task: For each alphabetically ordered pair of categories sharing at least one delivered-order shopper, return shared_buyers, union_buyers and jaccard = shared / union rounded to three decimals.

Edge contracts: A shopper belongs to a category once, regardless of repeat orders or quantities. Include only pairs with shared buyers. Use category_a < category_b. Order by category_a,category_b.

Tested wrong approaches: Lets repeat purchases multiply memberships and intersections.; Double-counts shared shoppers in the union..

Prerequisite lesson IDs: 16, 18, 49.

## qb-0064: Parse malformed product codes

**MIGRATE · Retail · medium · write**

Normalize and validate a fixed-format identifier before parsing it. Validate the entire token before extracting typed fields; CAST alone accepts malformed numeric prefixes.

Task: Normalize raw_code by trimming ASCII spaces and uppercasing it. Keep only codes of the exact form HM-DDDD-AA, where DDDD is four ASCII digits representing 1–9999 and AA is two ASCII letters. Return import_id, integer item_number and uppercase region.

Edge contracts: Reject NULL, 0000, extra characters, internal spaces and malformed delimiters. Order by import_id. Region is any pair of ASCII letters, not a lookup against a country list.

Tested wrong approaches: Accepts malformed digits because CAST returns a numeric prefix.; Rejects valid lowercase import codes instead of normalizing them..

Prerequisite lesson IDs: 33, 56.

## qb-0065: Normalize contact import collisions

**MIGRATE · Retail · medium · write**

Find normalized duplicate contacts while excluding malformed identifiers. Apply an explicit normalization and validity contract before grouping, without collapsing meaningful aliases.

Task: Find duplicate valid emails after lowercasing and trimming outer ASCII spaces, tabs, carriage returns and line feeds. Return normalized_email, source_rows and the smallest source id as first_id.

Edge contracts: For this exercise only: exactly one @; a nonempty local part; domain has a dot that is neither its first nor last character; no consecutive domain dots; no ASCII space, tab, CR or LF anywhere after trimming. This is a deliberately limited import rule, not full email-standard validation. Keep plus aliases distinct; do not remove dots or plus suffixes. Return only groups with more than one valid source row, ordered by normalized_email.

Tested wrong approaches: Leaves tabs and line breaks around otherwise matching addresses.; Allows multiple @ symbols and groups malformed addresses..

Prerequisite lesson IDs: 33, 56.

## qb-0066: Parse money into exact integer cents

**MIGRATE · Retail · hard · write**

Turn validated decimal text into exact integer minor units. Validate sign, decimal grammar and digit limits, then compute cents without permissive casts or floating-point rounding.

Task: For every import row, parse raw_amount into cents or NULL and label status valid or invalid. Trim outer ASCII spaces. Accept an optional leading + or -, one to six ASCII whole-number digits, and optionally a decimal point followed by one or two ASCII digits.

Edge contracts: Leading zeros count toward the six-digit limit. Signed zero is valid. Missing whole digits, a trailing dot, exponents, separators, currency symbols and NULL are invalid. Use integer cents: 19.99 is 1999 and -0.29 is -29. No floating-point tolerance is intended. Return every row ordered by import_id.

Tested wrong approaches: Treats permissive casts as validation and uses floating-point money.; Accepts a whole-number part beyond the stated digit limit..

Prerequisite lesson IDs: 33, 56.

## qb-0067: Checkout review 1: establish the baseline

**MIGRATE · Retail · medium · write**

Establish the daily population before interpreting checkout performance. Aggregate at session grain, assign cross-midnight sessions to their start day, and distinguish sessions from shoppers.

Task: Retail is investigating checkout reliability. First build a daily session baseline: session_date, sessions, distinct shoppers and returning_sessions. A returning session is any session numbered greater than 1 for that shopper in this observation dataset.

Edge contracts: This stage starts from the original event tables in a fresh database. Recompute any intermediate results; nothing is carried over from earlier stages. Deduplicate globally by event_key, keeping the smallest id; a retry may have a conflicting payload. Use (occurred_at, id) as the total event order; equal timestamps follow id order. All times are UTC. A shopper starts a session at the first canonical event or after a gap strictly greater than 30 minutes from their previous canonical event. Exactly 30 minutes stays in the same session; midnight alone does not split it. Session numbers start at 1 per shopper and include every event type, including heartbeat and purchase-only sessions. Assign the whole session to the UTC date of its first event, even if it crosses midnight. Order by session_date.

Tested wrong approaches: Counts people instead of sessions.; Labels every first observed session as returning..

Prerequisite lesson IDs: 20, 21, 24, 46, 48.

## qb-0068: Checkout review 2: locate funnel drop-off

**MIGRATE · Retail · hard · write**

Diagnose the funnel stage at which eligible sessions stop progressing. Build nested ordered-funnel populations before calculating stage-to-stage losses.

Task: Continue the checkout review by returning three rows: view, checkout and purchase. Count sessions reaching each ordered stage. Return stage_no (1–3), stage, sessions and dropoff from the preceding stage.

Edge contracts: This stage starts from the original event tables in a fresh database. Recompute any intermediate results; nothing is carried over from earlier stages. Deduplicate globally by event_key, keeping the smallest id; a retry may have a conflicting payload. Use (occurred_at, id) as the total event order; equal timestamps follow id order. All times are UTC. A shopper starts a session at the first canonical event or after a gap strictly greater than 30 minutes from their previous canonical event. Exactly 30 minutes stays in the same session; midnight alone does not split it. Session numbers start at 1 per shopper and include every event type, including heartbeat and purchase-only sessions. A converted session has a view → checkout → purchase in that order, with all three events for the same shopper/cart within the session. Use the total event order. No extra view-to-purchase time limit applies. View requires any view. Checkout requires an earlier same-cart view. Purchase requires the full ordered funnel. Count a session at most once per stage. dropoff is previous-stage sessions minus current-stage sessions; use NULL for view. Order by stage_no.

Tested wrong approaches: Accepts a view that occurs after checkout in the conversion path.; Reverses stage losses into negative values..

Prerequisite lesson IDs: 20, 21, 24, 46, 48.

## qb-0069: Checkout review 3: measure the delay tail

**MIGRATE · Retail · hard · write**

Measure checkout latency without weighting sessions by repeated attempts. Choose a deterministic successful attempt per session and calculate a discrete percentile at the correct grain.

Task: For each first-touch channel with converted sessions, report converted_sessions, avg_seconds from checkout to purchase rounded to two decimals, and the nearest-rank p90_seconds.

Edge contracts: This stage starts from the original event tables in a fresh database. Recompute any intermediate results; nothing is carried over from earlier stages. Deduplicate globally by event_key, keeping the smallest id; a retry may have a conflicting payload. Use (occurred_at, id) as the total event order; equal timestamps follow id order. All times are UTC. A shopper starts a session at the first canonical event or after a gap strictly greater than 30 minutes from their previous canonical event. Exactly 30 minutes stays in the same session; midnight alone does not split it. Session numbers start at 1 per shopper and include every event type, including heartbeat and purchase-only sessions. A converted session has a view → checkout → purchase in that order, with all three events for the same shopper/cart within the session. Use the total event order. No extra view-to-purchase time limit applies. Within a session choose the earliest qualifying purchase in total event order. For that purchase choose the latest preceding same-cart checkout that has an earlier same-cart view in the session. Measure elapsed seconds from that checkout to purchase. Attribute to the session’s first-event channel. For n sessions, nearest-rank p90 is the sorted value at ceil(0.9*n), one-based. Include no unconverted sessions; order by channel.

Tested wrong approaches: Uses the first rather than the last eligible checkout before the chosen purchase.; Measures from session start instead of the selected checkout.; Reports the fastest session as the 90th percentile..

Prerequisite lesson IDs: 20, 21, 24, 46, 48.

## qb-0070: Checkout review 4: find later recoveries

**MIGRATE · Retail · hard · write**

Distinguish same-session conversion from later recovery. Link abandoned sessions to a later same-cart purchase within a bounded window without multiplying attempts.

Task: An abandoned session contains checkout but no full ordered conversion. Find abandoned sessions with a same-cart purchase in a strictly later session within 24 hours of a checkout in the abandoned session. Return shopper_id, abandoned_session, recovery_session and recovery_minutes.

Edge contracts: This stage starts from the original event tables in a fresh database. Recompute any intermediate results; nothing is carried over from earlier stages. Deduplicate globally by event_key, keeping the smallest id; a retry may have a conflicting payload. Use (occurred_at, id) as the total event order; equal timestamps follow id order. All times are UTC. A shopper starts a session at the first canonical event or after a gap strictly greater than 30 minutes from their previous canonical event. Exactly 30 minutes stays in the same session; midnight alone does not split it. Session numbers start at 1 per shopper and include every event type, including heartbeat and purchase-only sessions. A converted session has a view → checkout → purchase in that order, with all three events for the same shopper/cart within the session. Use the total event order. No extra view-to-purchase time limit applies. A recovery needs a purchase only; the later session need not repeat the view/checkout funnel. Match shopper and cart. The 24-hour bound is inclusive. Choose the earliest qualifying later purchase per abandoned session, then the latest qualifying checkout for that purchase. Return one row per recovered abandoned session, rounded minutes to two decimals, ordered by shopper_id,abandoned_session.

Tested wrong approaches: Calls a same-session unordered purchase a later recovery.; Uses a 12-hour recovery window instead of 24 hours..

Prerequisite lesson IDs: 20, 21, 24, 46, 48.

## qb-0071: Checkout review 5: prioritize channel fixes

**MIGRATE · Retail · hard · write**

Translate the connected review into a channel-level prioritization table. Reconcile session, abandonment and recovery populations before ranking unresolved losses with shared ranks for ties.

Task: Prioritize channels by unrecovered abandoned sessions. For each session’s first-touch channel, return sessions, abandoned_sessions, recovered_sessions, unrecovered_sessions and priority_rank.

Edge contracts: This stage starts from the original event tables in a fresh database. Recompute any intermediate results; nothing is carried over from earlier stages. Deduplicate globally by event_key, keeping the smallest id; a retry may have a conflicting payload. Use (occurred_at, id) as the total event order; equal timestamps follow id order. All times are UTC. A shopper starts a session at the first canonical event or after a gap strictly greater than 30 minutes from their previous canonical event. Exactly 30 minutes stays in the same session; midnight alone does not split it. Session numbers start at 1 per shopper and include every event type, including heartbeat and purchase-only sessions. A converted session has a view → checkout → purchase in that order, with all three events for the same shopper/cart within the session. Use the total event order. No extra view-to-purchase time limit applies. Abandoned means the session has checkout but no full ordered conversion. Recovered means it has a same-cart purchase in a strictly later session within 24 hours (inclusive) of any checkout in the abandoned session. Count each abandoned session at most once in recovery, even with several purchases. unrecovered_sessions = abandoned_sessions − recovered_sessions. Keep all first-touch channels, including zeros. Use dense descending rank of unrecovered_sessions, with ties sharing rank. Order by priority_rank, then channel.

Tested wrong approaches: Treats all abandoned sessions as unrecovered.; Assigns different priorities to tied unresolved counts..

Prerequisite lesson IDs: 20, 21, 24, 46, 48.

## qb-0072: Predict: members with and without bookings

**MIGRATE · Sports · easy · predict**

Reason about the exact result of a fixed SQL query. Track row membership, NULLs, ties and the explicit ordering in a small fixture.

Task: Predict every member id and matched fee. Members without bookings must remain in the LEFT JOIN result.

Edge contracts: Use the sample data shown here. NULL is not zero or empty text. Keep duplicate result rows.

Tested wrong approaches: Wrong output columns and values..

Prerequisite lesson IDs: 15.

## qb-0073: Predict: unknown credits in a filter

**MIGRATE · Sports · easy · predict**

Reason about the exact result of a fixed SQL query. Track row membership, NULLs, ties and the explicit ordering in a small fixture.

Task: Predict which member ids survive a comparison with 80. Return one numeric id per row.

Edge contracts: Use the sample data shown here. NULL is not zero or empty text. Keep duplicate result rows.

Tested wrong approaches: Wrong output columns and values..

Prerequisite lesson IDs: 7.

## qb-0074: Predict: count rows or known values?

**MIGRATE · Sports · medium · predict**

Reason about the exact result of a fixed SQL query. Track row membership, NULLs, ties and the explicit ordering in a small fixture.

Task: Predict one summary per team. Count every member separately from members whose credits are known.

Edge contracts: Use the sample data shown here. NULL is not zero or empty text. Keep duplicate result rows.

Tested wrong approaches: Wrong output columns and values..

Prerequisite lesson IDs: 9, 10.

## qb-0075: Predict: positions and shared ranks

**MIGRATE · Sports · medium · predict**

Reason about the exact result of a fixed SQL query. Track row membership, NULLs, ties and the explicit ordering in a small fixture.

Task: Predict row positions, ranks and dense ranks for members with known credits. The position breaks ties by id; the ranks compare credits only.

Edge contracts: Use the sample data shown here. NULL is not zero or empty text. Keep duplicate result rows.

Tested wrong approaches: Wrong output columns and values..

Prerequisite lesson IDs: 21, 22.

## qb-0076: Predict: a frame that includes peers

**MIGRATE · Sports · hard · predict**

Reason about the exact result of a fixed SQL query. Track row membership, NULLs, ties and the explicit ordering in a small fixture.

Task: Predict the two running totals. RANGE includes every peer at the current credit value; ROWS walks the deterministic credits,id ordering.

Edge contracts: Use the sample data shown here. NULL is not zero or empty text. Keep duplicate result rows.

Tested wrong approaches: Wrong output columns and values..

Prerequisite lesson IDs: 23, 41.

## qb-0077: Predict: the previous member within a team

**MIGRATE · Sports · medium · predict**

Reason about the exact result of a fixed SQL query. Track row membership, NULLs, ties and the explicit ordering in a small fixture.

Task: Predict each member’s previous credits within their team, in id order. A team’s first member has no previous row.

Edge contracts: Use the sample data shown here. NULL is not zero or empty text. Keep duplicate result rows.

Tested wrong approaches: Wrong output columns and values..

Prerequisite lesson IDs: 24.

## qb-0078: Debug: find members with unknown credits

**MIGRATE · Sports · easy · debug**

Repair query semantics and verify the correction on changed data. Identify the logical mistake and write a correction that also handles unseen edge cases.

Task: Fix the filter to return ids of members whose credits are unknown, ordered by id.

Edge contracts: Use the sample data shown here. NULL is not zero or empty text. Keep duplicate result rows.

Tested wrong approaches: Equality with NULL is unknown. Use IS NULL to test for a missing value..

Prerequisite lesson IDs: 7.

## qb-0079: Debug: retain members without paid bookings

**MIGRATE · Sports · medium · debug**

Repair query semantics and verify the correction on changed data. Identify the logical mistake and write a correction that also handles unseen edge cases.

Task: Return every member and each of their bookings with fee at least 25. Members without a qualifying booking need one NULL fee row. Order by member id then booking id.

Edge contracts: Use the sample data shown here. NULL is not zero or empty text. Keep duplicate result rows.

Tested wrong approaches: Filter eligible matches in ON. A WHERE filter removes the NULL-extended member rows.; Members with only nonqualifying bookings are still lost..

Prerequisite lesson IDs: 15, 37.

## qb-0080: Debug: count zero bookings correctly

**MIGRATE · Sports · medium · debug**

Repair query semantics and verify the correction on changed data. Identify the logical mistake and write a correction that also handles unseen edge cases.

Task: Return one row per member with the number of matching bookings, including bookings whose fee is NULL. Members without bookings need zero.

Edge contracts: Use the sample data shown here. NULL is not zero or empty text. Keep duplicate result rows.

Tested wrong approaches: The unmatched LEFT JOIN row is counted by COUNT(*). Count the non-null booking key; counting fee would miss a real booking with an unknown fee.; Unknown fees are still real bookings..

Prerequisite lesson IDs: 9, 15.

## qb-0081: Debug: the second distinct credit balance

**MIGRATE · Sports · medium · debug**

Repair query semantics and verify the correction on changed data. Identify the logical mistake and write a correction that also handles unseen edge cases.

Task: Return the second-highest distinct known credit balance once. Return no rows if fewer than two distinct known balances exist.

Edge contracts: Use the sample data shown here. NULL is not zero or empty text. Keep duplicate result rows.

Tested wrong approaches: The second row can repeat the highest value. Rank distinct balances or remove duplicate values before OFFSET.; ROW_NUMBER ranks rows, not distinct balances..

Prerequisite lesson IDs: 22.

## qb-0082: Debug: April bookings at the boundary

**MIGRATE · Sports · easy · debug**

Repair query semantics and verify the correction on changed data. Identify the logical mistake and write a correction that also handles unseen edge cases.

Task: Return all booking ids in April 2026, ordered by id. Use a half-open month interval so May 1 is excluded.

Edge contracts: Use the sample data shown here. NULL is not zero or empty text. Keep duplicate result rows.

Tested wrong approaches: BETWEEN includes both endpoints. An inclusive lower bound and exclusive next-month bound preserve the month boundary..

Prerequisite lesson IDs: 39.

## qb-0083: Debug: the last balance in each team

**MIGRATE · Sports · hard · debug**

Repair query semantics and verify the correction on changed data. Identify the logical mistake and write a correction that also handles unseen edge cases.

Task: For each member, return the credits of the team’s last member in id order. Keep NULL if that last member has unknown credits. Return rows ordered by id.

Edge contracts: Use the sample data shown here. NULL is not zero or empty text. Keep duplicate result rows.

Tested wrong approaches: With ORDER BY, the default frame ends at the current peer group. LAST_VALUE needs a frame reaching UNBOUNDED FOLLOWING to see the partition’s last row.; Largest value is not the last value; MAX also ignores NULL..

Prerequisite lesson IDs: 41.

## qb-0084: Capacity 1: current regional totals

**MIGRATE · Energy · medium · write**

Produce reproducible capacity reports with explicit units, dates and grain. Combine explicit time boundaries with grain-aware aggregation while preserving missing groups.

Task: Summarize active capacity on the snapshot date for every region, including empty regions as zero. Exclude sites without a mapped region. Order by region id.

Edge contracts: Every stage runs on a fresh database; earlier queries do not carry forward. One unit is one MW of generation capacity. Snapshot date: 2026-04-01. Capacity intervals include valid_from and exclude valid_to; NULL valid_to means no end. Future supply is incremental capacity, available on delivery_date. The snapshot excludes same-day deliveries, so projections add them once.

Tested wrong approaches: Distinct quantities are not distinct capacity records; equal quantities at different sites must both count.; Includes expired and future capacity.; Drops an empty region..

Prerequisite lesson IDs: 15, 20, 39, 49.

## qb-0085: Capacity 2: retain missing and unmapped sites

**MIGRATE · Energy · medium · write**

Produce reproducible capacity reports with explicit units, dates and grain. Combine explicit time boundaries with grain-aware aggregation while preserving missing groups.

Task: Report every site, its region name (NULL for unmapped sites), and active capacity on the snapshot date. Missing active capacity is zero. Order by site id.

Edge contracts: Every stage runs on a fresh database; earlier queries do not carry forward. One unit is one MW of generation capacity. Snapshot date: 2026-04-01. Capacity intervals include valid_from and exclude valid_to; NULL valid_to means no end. Future supply is incremental capacity, available on delivery_date. The snapshot excludes same-day deliveries, so projections add them once.

Tested wrong approaches: Drops unmapped sites.; Drops sites without active capacity..

Prerequisite lesson IDs: 15, 20, 39, 49.

## qb-0086: Capacity 3: the next delivery date and all ties

**MIGRATE · Energy · hard · write**

Produce reproducible capacity reports with explicit units, dates and grain. Combine explicit time boundaries with grain-aware aggregation while preserving missing groups.

Task: For each site, find the earliest delivery date on or after the snapshot date and sum every delivery tied on that date. Use NULL date and zero units when none exists. Order by site id.

Edge contracts: Every stage runs on a fresh database; earlier queries do not carry forward. One unit is one MW of generation capacity. Snapshot date: 2026-04-01. Capacity intervals include valid_from and exclude valid_to; NULL valid_to means no end. Future supply is incremental capacity, available on delivery_date. The snapshot excludes same-day deliveries, so projections add them once.

Tested wrong approaches: Selects an already-past delivery.; Drops tied deliveries..

Prerequisite lesson IDs: 15, 20, 39, 49.

## qb-0087: Capacity 4: reconcile capacity and incoming supply

**MIGRATE · Energy · hard · write**

Produce reproducible capacity reports with explicit units, dates and grain. Combine explicit time boundaries with grain-aware aggregation while preserving missing groups.

Task: For every site report snapshot capacity and the sum of deliveries from April 1 through April 30 inclusive in separate columns. Avoid multiplying current capacity by the number of deliveries. Order by site id.

Edge contracts: Every stage runs on a fresh database; earlier queries do not carry forward. One unit is one MW of generation capacity. Snapshot date: 2026-04-01. Capacity intervals include valid_from and exclude valid_to; NULL valid_to means no end. Future supply is incremental capacity, available on delivery_date. The snapshot excludes same-day deliveries, so projections add them once.

Tested wrong approaches: Raw fact joins multiply capacity and supply.; Excludes deliveries on the final day..

Prerequisite lesson IDs: 15, 20, 39, 49.

## qb-0088: Capacity 5: project regional capacity at month end

**MIGRATE · Energy · hard · write**

Produce reproducible capacity reports with explicit units, dates and grain. Combine explicit time boundaries with grain-aware aggregation while preserving missing groups.

Task: Project every region’s capacity on April 30, 2026: sum capacity records valid on April 30 plus incremental deliveries arriving April 1 through April 30 inclusive. Exclude unmapped sites and include empty regions as zero. Assume deliveries remain available through the cutoff. Order by region id.

Edge contracts: Every stage runs on a fresh database; earlier queries do not carry forward. One unit is one MW of generation capacity. Snapshot date: 2026-04-01. Capacity intervals include valid_from and exclude valid_to; NULL valid_to means no end. Future supply is incremental capacity, available on delivery_date. The snapshot excludes same-day deliveries, so projections add them once.

Tested wrong approaches: Carries capacity that expires before the cutoff; exposed by changed data.; Includes next-month supply..

Prerequisite lesson IDs: 15, 20, 39, 49.

## qb-0089: Two temperatures, one station day

**MIGRATE · Weather · medium · write**

Pivot long-form measurements without inventing values. Changes long-form measurement grain into a daily row while preserving missing observations.

Task: Return one row per station and date present in daily_weather, with station_id, date, tmin_c and tmax_c. Use only unflagged TMIN/TMAX values for temperatures and divide raw tenths by 10.0. Keep NULL when a usable measurement is missing.

Edge contracts: A non-NULL quality_flag excludes that value, not the whole station-day. Do not replace missing temperatures with zero.

Tested wrong approaches: mixes precipitation and snow with temperature.

Prerequisite lesson IDs: 13.

## qb-0090: Observation coverage by station

**MIGRATE · Weather · medium · write**

Measure coverage using expected observation opportunities. Uses a complete calendar denominator rather than counting only observed measurements.

Task: For every station, return station_id, expected_days and usable_tmax_days. expected_days is the number of dates in calendar. A usable TMAX has a non-NULL raw_value and NULL quality_flag. Include stations with no usable observations.

Edge contracts: Count each station-date once. Use calendar, not the observed weather rows, for expected days.

Tested wrong approaches: drops stations without observations and derives the denominator from observations.

Prerequisite lesson IDs: 32, 35.

## qb-0091: Signed invoice totals

**MIGRATE · Retail · medium · write**

Keep source accounting signs and distinguish invoice labels from stable keys. Preserves cancellation signs and observed-header grain instead of treating all invoice lines as positive sales.

Task: Return order_id and net_gbp for every observed order header. Sum quantity multiplied by unit_price_gbp and round the total to two decimals. Include cancellations and zero-value lines.

Edge contracts: Use order_id, not the possibly repeated invoice label. Retain negative quantities; do not apply ABS.

Tested wrong approaches: turns cancellations into positive sales.

Prerequisite lesson IDs: 10, 16.

## qb-0092: What actually moved money?

**MIGRATE · Finance / Payments · hard · write**

Reconcile a ledger independently from authorization attempts. Combines debit and credit grains without multiplying multiple refunds or counting authorization retries.

Task: Return account_id and balance_cents for every account. Start with opening_cents, subtract posted settlements and add posted refunds, including chargebacks. Approved but unsettled attempts and retries do not move money.

Edge contracts: All amounts are integer USD cents. Accounts with no settlements retain their opening balance.

Tested wrong approaches: subtracts attempts, retries and unsettled approvals instead of ledger debits.

Prerequisite lesson IDs: 49, 50.

## qb-0093: Has the whole shipment arrived?

**MIGRATE · Logistics · hard · write**

Use universal qualification across a parent-child relationship. Requires every package to qualify and explicitly handles the empty-package case.

Task: Return shipment_id for shipments that have at least one package and for which every package has a delivered scan. Repeated delivered scans must not duplicate a shipment. An empty shipment does not qualify.

Edge contracts: Any undelivered package makes the shipment incomplete. A delivery can be late and still qualify for this completion report.

Tested wrong approaches: accepts partial shipments.

Prerequisite lesson IDs: 18.

## qb-0094: Repeat reviews, distinct changes

**MIGRATE · Developer Platform · medium · write**

Count relationship strength at change grain rather than action grain. Separates review actions from distinct reviewed changes in a directed relationship.

Task: For every author/reviewer pair appearing in reviews, return author_id, reviewer_id and reviewed_changes: the number of distinct pull requests reviewed. Repeated review actions on the same change count once.

Edge contracts: The pair is directed: author and reviewer are different roles. Include unmerged pull requests.

Tested wrong approaches: counts repeated review actions.

Prerequisite lesson IDs: 14.

## qb-0095: Two measures, one observation stream

**MIGRATE · Energy · medium · write**

Return two rows per region-hour in hourly_demand: one with measure demand and demand_mw as mw, and one with measure forecast and forecast_mw as mw. Keep both even when their values match. Reason about grain, boundaries and missing observations on a shared dataset.

Task: Return two rows per region-hour in hourly_demand: one with measure demand and demand_mw as mw, and one with measure forecast and forecast_mw as mw. Keep both even when their values match.

Edge contracts: Return exactly the named columns. Preserve unknown values unless the task says otherwise.

Tested wrong approaches: Drops the forecast observation..

Prerequisite lesson IDs: 19.

## qb-0096: Last known daily maximum

**MIGRATE · Weather · hard · write**

For every station and calendar date, return the most recent usable TMAX at or before that date, divided by 10.0. A usable observation has a non-NULL raw_value and NULL quality_flag. Return NULL if no earlier usable value exists. Do not borrow from a future date. Reason about grain, boundaries and missing observations on a shared dataset.

Task: For every station and calendar date, return the most recent usable TMAX at or before that date, divided by 10.0. A usable observation has a non-NULL raw_value and NULL quality_flag. Return NULL if no earlier usable value exists. Do not borrow from a future date.

Edge contracts: Return exactly the named columns. Preserve unknown values unless the task says otherwise.

Tested wrong approaches: Only returns observed dates and never carries the last known value..

Prerequisite lesson IDs: 17, 18.

## qb-0097: Everyone below a manager

**MIGRATE · Developer Platform · hard · write**

Return every direct or indirect manager/descendant pair from developers. Direct reports have depth 1. Exclude self-pairs. The supplied manager hierarchy is acyclic. Reason about grain, boundaries and missing observations on a shared dataset.

Task: Return every direct or indirect manager/descendant pair from developers. Direct reports have depth 1. Exclude self-pairs. The supplied manager hierarchy is acyclic.

Edge contracts: Return exactly the named columns. Preserve unknown values unless the task says otherwise.

Tested wrong approaches: Omits indirect descendants..

Prerequisite lesson IDs: 27.

## qb-0098: Reliability bands

**MIGRATE · U.S. Flights · medium · write**

Count scheduled flights in four bands: cancelled; early for operated flights with negative delay; on_time for delays from 0 through 14 minutes; late for delays at least 15. Return each band that occurs, with its count as flights. Reason about grain, boundaries and missing observations on a shared dataset.

Task: Count scheduled flights in four bands: cancelled; early for operated flights with negative delay; on_time for delays from 0 through 14 minutes; late for delays at least 15. Return each band that occurs, with its count as flights.

Edge contracts: Return exactly the named columns. Preserve unknown values unless the task says otherwise.

Tested wrong approaches: Treats cancellations as on-time departures..

Prerequisite lesson IDs: 13.

## qb-0099: State as of an operational cutoff

**MIGRATE · Logistics · hard · write**

For every package, return its latest physical status at or before 2025-01-06T03:00:00Z. Break equal occurred_at timestamps by highest ingestion row id. Include packages with no qualifying event with NULL status. Use occurred_at, not ingested_at, for the cutoff and ordering. Reason about grain, boundaries and missing observations on a shared dataset.

Task: For every package, return its latest physical status at or before 2025-01-06T03:00:00Z. Break equal occurred_at timestamps by highest ingestion row id. Include packages with no qualifying event with NULL status. Use occurred_at, not ingested_at, for the cutoff and ordering.

Edge contracts: Return exactly the named columns. Preserve unknown values unless the task says otherwise.

Tested wrong approaches: Confuses ingestion time with physical event time..

Prerequisite lesson IDs: 21, 25.

## qb-0100: Continuous incident coverage

**MIGRATE · Developer Platform · hard · write**

Merge all resolved incident intervals across the platform into continuous coverage periods. Include overlapping and exactly touching intervals in the same period. Exclude unresolved incidents. Return starts_at and ends_at for each merged period. Reason about grain, boundaries and missing observations on a shared dataset.

Task: Merge all resolved incident intervals across the platform into continuous coverage periods. Include overlapping and exactly touching intervals in the same period. Exclude unresolved incidents. Return starts_at and ends_at for each merged period.

Edge contracts: Return exactly the named columns. Preserve unknown values unless the task says otherwise.

Tested wrong approaches: Leaves overlapping incident intervals unmerged..

Prerequisite lesson IDs: 23, 24.

## qb-0101: Predict: integer and decimal ratios

**MIGRATE · Energy · medium · predict**

Predict both ratios for the first three hourly_demand rows ordered by region_id,hour. SQLite divides integers using integer arithmetic unless an operand is real. Trace a short fixed query, including SQLite NULL and boundary semantics.

Task: Predict both ratios for the first three hourly_demand rows ordered by region_id,hour. SQLite divides integers using integer arithmetic unless an operand is real.

Edge contracts: Return exactly the named columns. Preserve unknown values unless the task says otherwise.

Tested wrong approaches: Incorrect result shape and values..

Prerequisite lesson IDs: 13.

## qb-0102: Predict: missing tips in an average

**MIGRATE · Mobility · medium · predict**

Predict the count of known tips and both tip averages for trip ids 1 through 5. Round averages to two decimal places. Trace a short fixed query, including SQLite NULL and boundary semantics.

Task: Predict the count of known tips and both tip averages for trip ids 1 through 5. Round averages to two decimal places.

Edge contracts: Return exactly the named columns. Preserve unknown values unless the task says otherwise.

Tested wrong approaches: Incorrect result shape and values..

Prerequisite lesson IDs: 7, 31.

## qb-0103: Predict: a recursive reporting path

**MIGRATE · Developer Platform · medium · predict**

Predict the manager path starting at developer 1 and following manager_id upward. The start has depth zero. Stop when no manager exists. Trace a short fixed query, including SQLite NULL and boundary semantics.

Task: Predict the manager path starting at developer 1 and following manager_id upward. The start has depth zero. Stop when no manager exists.

Edge contracts: Return exactly the named columns. Preserve unknown values unless the task says otherwise.

Tested wrong approaches: Incorrect result shape and values..

Prerequisite lesson IDs: 27.

## qb-0104: Predict: a date across midnight

**MIGRATE · U.S. Flights · medium · predict**

Predict the scheduled departure date and actual arrival date for flight ids 1 through 3. DATE extracts the UTC calendar date from these ISO timestamps. Trace a short fixed query, including SQLite NULL and boundary semantics.

Task: Predict the scheduled departure date and actual arrival date for flight ids 1 through 3. DATE extracts the UTC calendar date from these ISO timestamps.

Edge contracts: Return exactly the named columns. Preserve unknown values unless the task says otherwise.

Tested wrong approaches: Incorrect result shape and values..

Prerequisite lesson IDs: 26, 39.

## qb-0105: Predict: duplicate observations in a set

**MIGRATE · Energy · medium · predict**

Predict the complete result, retaining duplicate rows. The first branch selects ids up to 2; the second branch selects id 2 again. Trace a short fixed query, including SQLite NULL and boundary semantics.

Task: Predict the complete result, retaining duplicate rows. The first branch selects ids up to 2; the second branch selects id 2 again.

Edge contracts: Return exactly the named columns. Preserve unknown values unless the task says otherwise.

Tested wrong approaches: Incorrect result shape and values..

Prerequisite lesson IDs: 19.

## qb-0106: Predict: membership with an unknown alternative

**MIGRATE · Mobility · medium · predict**

Predict the payment ids returned by this predicate. Evaluate UNKNOWN with OR before deciding which rows pass WHERE. Trace a short fixed query, including SQLite NULL and boundary semantics.

Task: Predict the payment ids returned by this predicate. Evaluate UNKNOWN with OR before deciding which rows pass WHERE.

Edge contracts: Return exactly the named columns. Preserve unknown values unless the task says otherwise.

Tested wrong approaches: Incorrect result shape and values..

Prerequisite lesson IDs: 7, 31.

## qb-0107: Debug: observable tip coverage

**MIGRATE · Mobility · medium · debug**

Fix the report to count known tip amounts per payment type. A zero observed card tip counts as known; a NULL cash tip does not. Repair a plausible query that silently uses the wrong denominator or grain.

Task: Fix the report to count known tip amounts per payment type. A zero observed card tip counts as known; a NULL cash tip does not.

Edge contracts: Return exactly the named columns. Preserve unknown values unless the task says otherwise.

Tested wrong approaches: COUNT(column) counts observed values, including zero. COUNT(*) counts trips whether the tip was observed or not..

Prerequisite lesson IDs: 7, 31.

## qb-0108: Debug: delay among operated flights

**MIGRATE · U.S. Flights · medium · debug**

Fix the mean departure delay per airline, rounded to two decimals. Include early departures and exclude cancellations from the delay denominator. Repair a plausible query that silently uses the wrong denominator or grain.

Task: Fix the mean departure delay per airline, rounded to two decimals. Include early departures and exclude cancellations from the delay denominator.

Edge contracts: Return exactly the named columns. Preserve unknown values unless the task says otherwise.

Tested wrong approaches: A cancelled flight has no departure delay. Filling its NULL with zero invents an on-time departure and dilutes the average..

Prerequisite lesson IDs: 9.

## qb-0109: Debug: forecast accuracy

**MIGRATE · Energy · medium · debug**

Fix the mean absolute forecast error by region, rounded to two decimals. Measure error magnitude for each region-hour before averaging. Repair a plausible query that silently uses the wrong denominator or grain.

Task: Fix the mean absolute forecast error by region, rounded to two decimals. Measure error magnitude for each region-hour before averaging.

Edge contracts: Return exactly the named columns. Preserve unknown values unless the task says otherwise.

Tested wrong approaches: Positive and negative errors cancel inside an average. Apply ABS to each error first to measure typical magnitude..

Prerequisite lesson IDs: 32.

## qb-0110: Debug: teams without repositories

**MIGRATE · Developer Platform · medium · debug**

Fix the report to include every team and count its repositories, returning zero for teams without any. Repair a plausible query that silently uses the wrong denominator or grain.

Task: Fix the report to include every team and count its repositories, returning zero for teams without any.

Edge contracts: Return exactly the named columns. Preserve unknown values unless the task says otherwise.

Tested wrong approaches: The outer join supplies one unmatched row for a team with no repositories. Count the matched repository key, not the joined row..

Prerequisite lesson IDs: 15.

## qb-0111: Debug: visits after an observation join

**MIGRATE · Healthcare · medium · debug**

Fix the count of completed encounters with at least one observation by provider. Multiple observations from one encounter must count as one visit. Return providers with qualifying visits. Repair a plausible query that silently uses the wrong denominator or grain.

Task: Fix the count of completed encounters with at least one observation by provider. Multiple observations from one encounter must count as one visit. Return providers with qualifying visits.

Edge contracts: Return exactly the named columns. Preserve unknown values unless the task says otherwise.

Tested wrong approaches: A visit produces several operational observations. The join changes row grain to observation, so count distinct encounter keys..

Prerequisite lesson IDs: 49.

## qb-0112: Debug: a scan retry is not a new event

**MIGRATE · Logistics · medium · debug**

Fix the number of distinct logical scans per package appearing in tracking_events. Retries repeat scan_key but have different ingestion row ids. Repair a plausible query that silently uses the wrong denominator or grain.

Task: Fix the number of distinct logical scans per package appearing in tracking_events. Retries repeat scan_key but have different ingestion row ids.

Edge contracts: Return exactly the named columns. Preserve unknown values unless the task says otherwise.

Tested wrong approaches: The ingestion primary key identifies deliveries. The logical scan key identifies physical events and survives retries..

Prerequisite lesson IDs: 44.

## qb-0113: A sustained warm interval

**NEW · IoT / Sensors · hard · write**

Identify sustained threshold breaches without bridging missing or cool readings. Combine an explicit time-adjacency rule with per-device islands; adjacent rows alone do not prove continuous telemetry.

Task: Return device_id, starts_at, ends_at and readings for maximal runs of at least three consecutive sensor readings with temperature_c >= 20. Consecutive means exactly ten minutes apart for the same device. A missing timestamp or a temperature below 20 breaks the run.

Edge contracts: Use the source timestamps as supplied; no timezone conversion. Endpoints are the first and last observed timestamps, not an assumed duration after the last reading.

Tested wrong approaches: Combines separate warm periods and crosses missing timestamps..

Prerequisite lesson IDs: 24, 40, 48.

## qb-0114: Opponents who hosted each other

**NEW · Sports · medium · write**

Find symmetric relationships while returning each pair once. Recognize a reciprocal directed relationship, avoid same-direction matches, and normalize each unordered pair.

Task: For each season, return team_a and team_b for pairs that completed at least one game with A at home against B and another with B at home against A. Return season, team_a, team_b with team_a < team_b. Cancelled games do not count.

Edge contracts: Both directions must occur in the same season. Repeated meetings must not duplicate a pair.

Tested wrong approaches: Accepts a pair with only one direction completed..

Prerequisite lesson IDs: 18, 34.
