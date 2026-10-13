# Learning sequence audit

This audit reads the canonical curriculum in `src/content/content-pack.json`. It does not change `courseOrder`, lesson ids, grading, or saved progress.

The recommended correction is a limited reorder of seven existing lessons, plus module membership so the module pages follow the same path. No new lesson is required. Advanced modules stay in their current internal order. The full id-by-id mapping is [CURRENT_TO_PROPOSED_ORDER.md](CURRENT_TO_PROPOSED_ORDER.md). How to apply it later, and what that application must leave untouched, is [SEQUENCE_IMPLEMENTATION_PLAN.md](SEQUENCE_IMPLEMENTATION_PLAN.md).

## What was checked

For all 88 lessons the record below includes the stable id, title, module, current course position, concept text, runnable example, both challenges, the concept-check question, the correct option, and the explanation. Practice entries are the two lesson challenges `lc-{id}-0` and `lc-{id}-1`, plus any Practice Track that cites them. Project entries are milestone references. The concept is taken from the concept field. Titles were not treated as the concept.

Unique concept-check wording is already true: all 88 questions differ. That fact is not evidence that each question assesses its lesson. Each question and explanation was compared with that lesson’s concept and both challenges.

Two checks still assess a neighboring lesson:

- Lesson 16, “Revenue across tables,” teaches `quantity * price` after joining orders, customers, and products. Both challenges ask for paid revenue. The concept check asks how many rows a raw join of two requests and three invoices can produce, and the explanation says to aggregate both sides first. That is the fan-out objective of lesson 49.
- Lesson 70, “Silver: clean, map & deduplicate,” teaches trimming, mapping, and keeping the latest customer version. Both challenges build `silver_customers`. The concept check asks whether a warehouse should assign surrogate keys with a fresh `ROW_NUMBER` on every load. Stable keys are the objective of lesson 71 and lesson 82.

The other 86 checks describe the operation in that lesson’s concept. That reading is not a claim that every explanation is the best possible teaching of the objective, or that every challenge is free of a later technique. The mismatches that affect order are called out below. Lessons 16 and 70 are content bugs. Reordering the course does not fix them, and this phase does not rewrite them.

## How the path is stored

`courseOrder` is a permutation of lesson ids 0 through 87. It is the global learning path. `lessonsInModule(moduleId)` walks that permutation and keeps lessons whose `group` equals the module id. The module page’s Continue button uses that filtered list. The lesson page’s Next button uses the next id in `courseOrder`.

Changing only `courseOrder` leaves the foundations module as lessons 0, 1, 2, 30, and 54. Continue on that module would still go from aliases to DISTINCT and skip WHERE, because WHERE is module 1. A path correction that learners can actually follow has to change `courseOrder` and the `group` of the lessons that move.

Module URL indexes stay 0 through 9. Nothing in this recommendation inserts, deletes, or renumbers a module.

## The beginning of the course

Current positions 1–12:

| Pos | ID | What the lesson actually teaches | What the challenges require |
| ---: | ---: | --- | --- |
| 1 | 0 | A table is rows and named columns. SELECT reads columns and does not change the table. | Two SELECT statements. No join. |
| 2 | 1 | `AS` names an output column. Arithmetic does not update the stored column. | Two calculated columns. |
| 3 | 2 | DISTINCT drops duplicate output rows and keeps one NULL. | Two DISTINCT lists. |
| 4 | 30 | MIN and MAX, and what one output row means. | Challenge 1 is one overall row. Challenge 2 is MAX per video, which is GROUP BY. Declared prerequisite is lesson 9, at position 13. |
| 5 | 54 | Primary keys, foreign keys, and the SQLite catalog. | Challenge 1 reads `sqlite_schema`. Challenge 2 joins `orders.customer_id` to `customers.id`. Joins are taught at lesson 14, position 21. |
| 6–11 | 3–8 | WHERE, comparisons, AND/OR, LIKE/IN, NULL, ORDER BY. | Single-table filters and sorts. |
| 12 | 31 | `NOT IN` becomes unknown when the list contains NULL. | Challenge 1 depends on that trap. Declared prerequisites include lesson 18 (EXISTS), at position 30. |

The desired early progression is tables and columns, then SELECT, aliases and expressions, filtering and sorting, then distinct values and aggregates, then joins, then grouping and the rest of SQL. Lesson 0 already covers the table idea and SELECT in one lesson, and both of its challenges stay inside SELECT. Lesson 54 is the keys lesson, and its second challenge is a join, so it cannot become the first lesson without putting a join in week one.

The early problems, read from challenges and prerequisites rather than titles:

- DISTINCT (lesson 2) is taught before any filter.
- MIN/MAX (lesson 30) is taught before COUNT, and its second challenge uses GROUP BY before GROUP BY exists.
- Keys (lesson 54) are taught before filters, and the second challenge is a join.
- NOT IN (lesson 31) is taught inside the filter module, before EXISTS.
- Ratios (lesson 32, position 18) ask for every account, including accounts with no requests, before LEFT JOIN (lesson 15, position 22).
- Logical processing (lesson 55, position 19) has a second challenge that adds a window sum. Running totals are lesson 23, position 37.
- INTERSECT and EXCEPT (lesson 38, position 28) declare UNION as a prerequisite. UNION is lesson 19, position 46.

## Later inversions that are real, and two that should not cause a move

Eight lessons declare a prerequisite that is later in today’s `courseOrder`: 30, 31, 32, 55, 35, 20, 26, and 38. Lesson 54’s second challenge is a join even though its declared prerequisite is already earlier. Lesson 3’s prerequisite becomes forward only after DISTINCT moves. The table includes those two cases:

| Lesson | Declared prerequisite that is later | What to do |
| --- | --- | --- |
| 30 MIN/MAX | 9 COUNT | Move 30 to just after GROUP BY (lesson 10), which is after COUNT. |
| 54 keys | none of its declared prerequisites are later; challenge 2 still needs a join | Move 54 to immediately before INNER JOIN. Leave the join challenge in place. |
| 31 NOT IN | 18 EXISTS | Move 31 to immediately after EXISTS. |
| 32 ratios | 15 LEFT JOIN | Move 32 to immediately after LEFT JOIN. |
| 55 logical processing | 23 running totals | Move 55 to immediately after running totals. |
| 35 CROSS JOIN | 27 recursive CTE | Leave 35 where it is. See below. |
| 20 CTEs | 19 UNION | Leave 20 where it is. The lesson’s example is a grouped CTE. It does not use UNION. Change the prerequisite array from 19 to 10. |
| 26 monthly dates | 25 latest row per group | Leave 26 where it is. The lesson groups `strftime('%Y-%m', ordered_at)`. It needs GROUP BY, which is already earlier. Change the prerequisite array from 25 to 10. |
| 38 INTERSECT | 19 UNION | Move 19 to immediately before 38. |
| 3 WHERE | 2 DISTINCT, which becomes later once DISTINCT moves | Change lesson 3’s prerequisite from 2 to 1. |

Lesson 19’s own declared prerequisite is lesson 18 (EXISTS). Moving UNION earlier would make that array point forward. The UNION lesson does not use EXISTS. The implementation changes that array to lesson 3, because the example filters with WHERE before it stacks the results.

Lesson 35 stays in the join block. Its example builds a recursive date spine, and lesson 27 is later, so the declared prerequisite is ahead of the lesson. Moving 35 to after lesson 27 would also put it after lesson 42. Lesson 42 (rolling averages on a complete calendar) declares lesson 35 as a prerequisite. Moving both 35 and 42 would reorder the window block. That is a larger change than the beginner-path problem justifies. The concept check itself asks how many combinations a cross join produces, which matches the lesson. The implementation plan changes the prerequisite array from 27 to 14 so a stuck learner is sent to joins, which they have already passed, and records the recursive spine as remaining content debt.

## Repeated concepts

These are neighboring treatments of one idea, not a reason to merge lessons:

- Rows and columns are lesson 0. Primary and foreign keys are lesson 54. Both stay. They are different objectives, and they should be separated by filters and aggregates.
- COUNT, MIN/MAX, and GROUP BY are three lessons. The correction puts them in that order inside module 2.
- Fan-out is taught in lesson 49. Lesson 16’s concept check already asks the fan-out question. That is a check on the wrong lesson, not a second fan-out lesson to reorder.
- Surrogate-key stability is taught in lessons 71 and 82. Lesson 70’s concept check asks it early.
- Query plans appear in lesson 28 and again, with indexes, in lesson 66. The second lesson is the performance module. Their relative order is already later-and-deeper. They stay.

## Modules whose objectives do not match their lessons

| Module | Stated job | What the lessons do today |
| --- | --- | --- |
| 0 SQL foundations | Read tables, choose columns, calculate values. | SELECT, aliases, DISTINCT, MIN/MAX, and a keys lesson whose second challenge is a join. |
| 1 Filtering & unique values | Find rows and handle missing values. | Filters, NULL, and sort. DISTINCT is in module 0. NOT IN, which needs EXISTS, is in this module. |
| 2 Calculations & data quality | Reliable metrics. | COUNT through conditional aggregation, then ratios that need a left join, then a logical-processing lesson whose second challenge uses a window. |
| 3 Joins & aggregation | Connect tables and summarize. | Joins. GROUP BY already happened in module 2. INTERSECT is here, before UNION. The cross-join lesson’s example is a recursive date spine. |
| 4 Dates, strings & subqueries | Time, text, and staged queries. | The CTE lesson declares UNION, which it does not use. The monthly-dates lesson declares a window lesson, which it does not use. |
| 6 Advanced product analysis | Product questions. | The module opens with UNION, then recursion, then query plans, then a customer capstone, then the product lessons. |

Modules 5, 7, 8, and 9 are internally sequential enough to leave alone. Module 8’s partitioning lesson states that the SQLite example cannot prove physical partition elimination. That honesty is a content property, not an ordering bug. Module 9 runs Bronze, Silver, Gold, reports, then the integration project. Its order stays.

## Walkthroughs

Forty-nine lessons open their walkthrough on a generic `SELECT *` inspection (`Inspect the source` or `Inspect the starting state`). The inventory marks each one. Lesson 0’s first step is also `SELECT *`, and its title is “Start with a table,” followed by a step that chooses columns, so it is not in that count. Aligning those 49 walkthroughs is a later content pass. It is not part of the order correction.

## Practice Tracks and projects

Tracks cite question ids. They do not copy grading, and nothing in the track definition checks course position. This audit does not reorder them.

- SQL from Zero still practices DISTINCT (`lc-2-0`) before WHERE (`qb-0002`). That repeats the course problem inside an optional track. The track’s starting point now says that every question uses one table. Reordering the track belongs to the later Practice-organization pass.
- Master SQL Joins includes lesson 49’s fan-out challenge and later multi-grain questions. Its starting point says the learner is comfortable with SELECT, WHERE, and GROUP BY. Those later questions ask for more than that sentence covers.
- Real-World Data Analytics starts at lesson 32 and also includes warehouse reporting (lesson 73) and the product lessons 46, 47, 50, 51, and 52. After this recommendation, lesson 32 sits just after LEFT JOIN, which matches the track’s join assumption better than today’s placement of ratios before joins. The track still reaches lessons the starting point does not mention.
- SQL for Data Engineers says the learner needs SELECT and JOIN. The track then includes transactions, LEAD validity intervals (lesson 78), upserts, and Silver cleaning. The starting point understates that list.
- Interview Essentials and Advanced SQL Challenges are optional and say so in their starting points. They are not the course path.

Projects, and the lessons they use as milestones:

| Project | Milestone lesson ids | After this recommendation |
| --- | --- | --- |
| Video Product Analytics | 45, 42, 47, 53 | Unchanged, and still late in the path. |
| Social Product Analytics | 44, 46, 48, 52 | Unchanged. |
| AI Platform Economics | 32, 49, 50, 51 | Lesson 32 moves earlier. The project is offered only when the first two milestones are mastered, so lesson 49 still gates it. |
| Warehouse and Reporting | 69, 70, 71, 72, 74, 73 | Unchanged. |
| CRM + ERP Integration | 76–87 | Unchanged. |

There is no beginner project after filters and joins. Adding one is the later project phase. This recommendation does not add a lesson or a milestone to fill that gap.

The module page links “Apply these skills in …” to the first project that has any milestone in that module. Today that link attaches AI Platform Economics to module 2 because lesson 32 is in module 2. After lesson 32 joins module 3, the link follows it. Milestone identity and project progress stay on lesson 32.

## Option A and Option B

**Option A** keeps every `group` and only edits `courseOrder`, plus a few sentences inside lessons that currently assume a later technique.

Global Next would improve. Module Continue would not. Foundations would still list DISTINCT, MIN/MAX, and the keys lesson, and Continue would still skip WHERE. Placement’s all-pass rule would stay coherent only if lesson 15 remained immediately after lesson 14, which Option A can do, but the module pages would keep telling the old story. Option A does not fix the path learners see when they open a module.

**Option B, limited to seven lessons,** moves those lessons in `courseOrder` and changes their `group` so each module’s Continue button walks the same sequence as the global path. Lesson ids, challenge text, and concept checks stay. Modules 7, 8, and 9 do not change membership or order. The window block changes only by inserting lesson 55 after running totals. The product block changes only by removing UNION from its front.

A full reorganization of modules 4–9 would renumber work learners have already mastered inside those modules’ displayed lists, without repairing the beginner sequence. That cost is not justified.

**Recommendation: the limited Option B.** Seven relocations, six prerequisite-array corrections, and two module-label updates. No new lesson. No new module index. No storage migration.

The beginner sequence this produces, in existing lessons:

1. Lesson 0 — rows, columns, and SELECT.
2. Lesson 1 — aliases and expressions.
3. Lessons 3, 4, 5, 6, 7, 8 — filter and sort, including NULL.
4. Lessons 2, 9, 10, 30, 11 — distinct values, aggregates, and grouping.
5. Lessons 12, 13, 56 — per-row decisions, conditional aggregates, and CAST. Lesson 56 only moves up because ratios and logical processing leave the slot in front of it. Its group stays module 2.
6. Lesson 54, then 14 and 15 — keys, then inner and left joins.
7. Lesson 32 — ratios, now that a left join exists.
8. The rest of the join and set lessons, with UNION immediately before INTERSECT.
9. Subqueries, EXISTS, then NOT IN, then CTEs, dates, and windows, with logical processing after running totals.
10. From lesson 58 onward, the current order.

## What this audit does not conclude

The 88 concept checks are unique. They are not, on that evidence, certified as educationally aligned. Lessons 16 and 70 still test another lesson’s objective. Forty-nine walkthroughs still open on a generic `SELECT *`. Lesson 35’s example still uses a recursive date spine before the recursion lesson. Those are recorded so a later content pass can fix them. They are not reasons to reorder the warehouse, the window block, or the projects.

## Inventory of all 88 lessons

Each entry is taken from the lesson record: concept, example, both challenges, and the concept check with its correct option and explanation. The primary concept is the concept text, not the title. Practice challenges are `lc-{lessonId}-{variant}` for the two tasks. Tracks and projects below are references that point at those ids. They are not copied questions.

### 1. Lesson 0 — Meet your first SELECT

- Module: 0 SQL foundations
- Course position: 1
- Concept: A table is a collection of rows and named columns. SELECT chooses the columns you want to see; FROM names the table. A query reads data without changing it.
- Example: `SELECT name, city FROM customers;`
- Challenges: Show the name and city of every customer. || Show the name and price of every product.
- Concept check: SELECT name FROM customers returns what? Correct answer: Every customer row, with only the name column Explanation: SELECT chooses columns. DISTINCT, WHERE, and aggregates change other aspects of the result.
- Declared prerequisites: none
- Practice: lc-0-0, lc-0-1
- Project: none
- Opening walkthrough: Start with a table. Specific to this lesson.

### 2. Lesson 1 — Aliases & calculated columns

- Module: 0 SQL foundations
- Course position: 2
- Concept: AS gives an output column a readable name. You can calculate values for each row with arithmetic. The original table stays unchanged.
- Example: `SELECT name, price * 2 AS double_price FROM products;`
- Challenges: Return name and price * 2 as double_price for every product. || Return id and quantity * 10 as units_times_ten for every order.
- Concept check: What does price * 2 AS double_price do? Correct answer: Returns a calculated column named double_price without changing products Explanation: AS names the output column. Arithmetic in SELECT does not update the stored price.
- Declared prerequisites: 0 (Meet your first SELECT, position 1)
- Practice: lc-1-0, lc-1-1. Tracks: SQL from Zero (lc-1-0)
- Project: none
- Opening walkthrough: Name a calculated column. Specific to this lesson.

### 3. Lesson 2 — Unique values with DISTINCT

- Module: 0 SQL foundations
- Course position: 3
- Concept: DISTINCT removes duplicate output rows. It applies to the whole set of selected columns, not just the first column. NULL is kept once.
- Example: `SELECT DISTINCT city FROM customers;`
- Challenges: Show each distinct customer city, including NULL. || Show each distinct product category.
- Concept check: What does SELECT DISTINCT city return? Correct answer: One row for each different city value Explanation: DISTINCT removes duplicate result rows. Repeated NULL values also appear only once.
- Declared prerequisites: 1 (Aliases & calculated columns, position 2)
- Practice: lc-2-0, lc-2-1. Tracks: SQL from Zero (lc-2-0)
- Project: none
- Opening walkthrough: Inspect the source. Generic SELECT * inspection.

### 4. Lesson 30 — MIN, MAX & the grain of a result

- Module: 0 SQL foundations
- Course position: 4
- Concept: MIN and MAX summarize the smallest and largest values. The grain describes what one output row means. Adding GROUP BY changes that grain from one overall row to one row per group.
- Example: `SELECT MIN(watch_seconds) AS shortest_watch, MAX(watch_seconds) AS longest_watch FROM watch_events;`
- Challenges: Return shortest_watch and longest_watch: minimum and maximum watch_seconds across all watch events. || Return video_id and longest_watch: maximum watch_seconds for each video that has events.
- Concept check: What is the grain of SELECT MIN(price), MAX(price) FROM products without GROUP BY? Correct answer: One summary row for the whole input Explanation: Aggregates without GROUP BY summarize the input into one row. MIN and MAX find the lowest and highest values.
- Declared prerequisites: 9 (COUNT, SUM & AVG, position 13)
- Practice: lc-30-0, lc-30-1
- Project: none
- Opening walkthrough: Inspect the source. Generic SELECT * inspection.

### 5. Lesson 54 — Databases, schemas, tables & keys

- Module: 0 SQL foundations
- Course position: 5
- Concept: SQL is the language; the database engine executes it. Tables contain rows and typed columns. A primary key identifies one row; a foreign key points to another table. SQLite catalogs differ from SQL Server schemas. In this app each worker creates an in-memory SQLite database.
- Example: `SELECT name,type FROM sqlite_schema WHERE type='table' AND name IN('customers','products','orders');`
- Challenges: Return name and type for the customers, products and orders tables from sqlite_schema. || Return order_id and customer_name by joining orders.customer_id to customers.id for every order.
- Concept check: What does a foreign key describe? Correct answer: A relationship from a column to a key in another table Explanation: A foreign key links records to a referenced key. With enforcement enabled, an invalid reference is rejected.
- Declared prerequisites: 0 (Meet your first SELECT, position 1)
- Practice: lc-54-0, lc-54-1
- Project: none
- Opening walkthrough: Inspect the source. Generic SELECT * inspection.

### 6. Lesson 3 — Filter with WHERE

- Module: 1 Filtering & unique values
- Course position: 6
- Concept: WHERE keeps rows for which a condition is true. Text values need single quotes; column names do not. Rows whose comparison evaluates to NULL are not kept.
- Example: `SELECT name, city FROM customers WHERE city = 'Chicago';`
- Challenges: Show name and city for customers in Chicago. || Show name and city for customers in Austin.
- Concept check: What does WHERE city = 'Chicago' keep? Correct answer: Customers whose city is Chicago Explanation: WHERE keeps rows whose condition is true. The quoted text is a city value, not a new column name.
- Declared prerequisites: 2 (Unique values with DISTINCT, position 3)
- Practice: lc-3-0, lc-3-1
- Project: none
- Opening walkthrough: Start with customers. Specific to this lesson.

### 7. Lesson 4 — Comparisons & ranges

- Module: 1 Filtering & unique values
- Course position: 7
- Concept: Use >, >=, < and <= to compare values. BETWEEN includes both endpoints. Decide whether the task includes the boundary before choosing an operator.
- Example: `SELECT name, price FROM products WHERE price >= 45;`
- Challenges: Show name and price for products priced at least 45. || Show name and price for products priced between 12 and 80 inclusive.
- Concept check: Which condition keeps products priced 45 and above? Correct answer: WHERE price >= 45 Explanation: >= includes the boundary. > drops a product whose price is exactly 45.
- Declared prerequisites: 3 (Filter with WHERE, position 6)
- Practice: lc-4-0, lc-4-1
- Project: none
- Opening walkthrough: Include the boundary. Specific to this lesson.

### 8. Lesson 5 — Combine conditions

- Module: 1 Filtering & unique values
- Course position: 8
- Concept: AND requires both conditions. OR requires either. AND binds more tightly than OR, so parentheses make mixed conditions explicit.
- Example: `SELECT name, price FROM products WHERE category = 'Tech' AND price < 100;`
- Challenges: Show name and price for Tech products costing less than 100. || Show name and price for Home or Stationery products costing at least 12.
- Concept check: Which rows does category = 'Tech' AND price < 100 keep? Correct answer: Products that are both Tech and priced under 100 Explanation: AND requires both conditions on the same row. OR would keep a row that meets either one.
- Declared prerequisites: 4 (Comparisons & ranges, position 7)
- Practice: lc-5-0, lc-5-1. Tracks: SQL from Zero (lc-5-1)
- Project: none
- Opening walkthrough: Require both conditions. Specific to this lesson.

### 9. Lesson 6 — Lists & text patterns

- Module: 1 Filtering & unique values
- Course position: 9
- Concept: IN matches any member of a list. LIKE matches text patterns: % means any number of characters and _ means one character. SQLite LIKE is case-insensitive for ASCII by default.
- Example: `SELECT name FROM customers WHERE name LIKE 'A%';`
- Challenges: Show name for customers whose name starts with A. || Show name and city for customers in Austin or Seattle.
- Concept check: What does name LIKE 'A%' match? Correct answer: Names that start with A Explanation: In LIKE, % stands for any number of characters. An equality comparison would look for a literal percent sign.
- Declared prerequisites: 5 (Combine conditions, position 8)
- Practice: lc-6-0, lc-6-1. Tracks: SQL from Zero (lc-6-0)
- Project: none
- Opening walkthrough: Match the start of a name. Specific to this lesson.

### 10. Lesson 7 — Understand NULL

- Module: 1 Filtering & unique values
- Course position: 10
- Concept: NULL means missing or unknown. NULL = NULL is unknown, not true. Use IS NULL and IS NOT NULL. COALESCE returns the first non-NULL argument.
- Example: `SELECT name, COALESCE(city, 'Unknown') AS city FROM customers;`
- Challenges: Show name for customers whose city is missing. || Return name and city, replacing missing city with Unknown (alias the column city).
- Concept check: What happens when WHERE city = NULL is evaluated? Correct answer: The comparison is unknown; those rows are not kept Explanation: Use IS NULL for missing values. Ordinary comparisons with NULL evaluate to unknown.
- Declared prerequisites: 6 (Lists & text patterns, position 9)
- Practice: lc-7-0, lc-7-1. Tracks: SQL from Zero (lc-7-1)
- Project: none
- Opening walkthrough: Inspect the source. Generic SELECT * inspection.

### 11. Lesson 8 — Sort & limit

- Module: 1 Filtering & unique values
- Course position: 11
- Concept: ORDER BY sorts the output; ASC is ascending and DESC descending. LIMIT keeps a number of rows after sorting. Use a secondary key when ties need deterministic ordering.
- Example: `SELECT name, price FROM products ORDER BY price DESC, name ASC LIMIT 3;`
- Challenges: Show name and price of the 3 most expensive products, highest price first. || Show name and price of the 2 cheapest products, lowest price first.
- Concept check: How do you return the three cheapest products consistently? Correct answer: ORDER BY price, id LIMIT 3 Explanation: Ascending price puts cheaper products first. id breaks equal-price ties; LIMIT keeps three rows.
- Declared prerequisites: 7 (Understand NULL, position 10)
- Practice: lc-8-0, lc-8-1
- Project: none
- Opening walkthrough: Inspect the source. Generic SELECT * inspection.

### 12. Lesson 31 — NOT IN and the NULL trap

- Module: 1 Filtering & unique values
- Course position: 12
- Concept: NOT reverses true and false, but unknown stays unknown. If a NOT IN list contains NULL, a nonmatching comparison can become unknown and disappear from WHERE. Prefer NOT EXISTS for nullable relationships.
- Example: `SELECT id FROM viewers WHERE id NOT IN (SELECT referred_by FROM viewers WHERE referred_by IS NOT NULL);`
- Challenges: Return id for viewers who have not referred anyone. A referred_by value identifies the referrer, and NULL means no referrer. || Return id and country for viewers outside US and GB.
- Concept check: Why can NOT IN (SELECT nullable_key ...) unexpectedly return no rows? Correct answer: NULL can turn nonmatching comparisons into unknown Explanation: Unknown does not pass WHERE. Filter NULLs from the list or use NOT EXISTS.
- Declared prerequisites: 7 (Understand NULL, position 10); 18 (Ask whether a row exists, position 30)
- Practice: lc-31-0, lc-31-1
- Project: none
- Opening walkthrough: Inspect nullable relationships. Specific to this lesson.

### 13. Lesson 9 — COUNT, SUM & AVG

- Module: 2 Calculations & data quality
- Course position: 13
- Concept: Aggregate functions collapse rows into a summary. COUNT(*) counts rows; COUNT(column) excludes NULL. SUM adds numeric values; AVG finds their mean.
- Example: `SELECT COUNT(*) AS customer_count FROM customers;`
- Challenges: Return the number of customers as customer_count. || Return total order quantity as total_units.
- Concept check: A table has three rows, and one city is NULL. What do COUNT(*) and COUNT(city) return? Correct answer: 3 and 2 Explanation: COUNT(*) counts every row. COUNT(city) counts only rows with a non-NULL city.
- Declared prerequisites: 8 (Sort & limit, position 11)
- Practice: lc-9-0, lc-9-1
- Project: none
- Opening walkthrough: Inspect the source. Generic SELECT * inspection.

### 14. Lesson 10 — Group into summaries

- Module: 2 Calculations & data quality
- Course position: 14
- Concept: GROUP BY forms one group for each key. Aggregates then summarize each group. Select grouping columns and aggregates to avoid ambiguous output.
- Example: `SELECT category, COUNT(*) AS product_count FROM products GROUP BY category;`
- Challenges: Show category and product_count for each product category. || Show status and total_units (sum of quantity) for each order status.
- Concept check: Products belong to two categories. What is the grain after GROUP BY category? Correct answer: One row per category Explanation: GROUP BY forms one group per category. Each output row summarizes that category.
- Declared prerequisites: 9 (COUNT, SUM & AVG, position 13)
- Practice: lc-10-0, lc-10-1
- Project: none
- Opening walkthrough: Read product rows. Specific to this lesson.

### 15. Lesson 11 — Filter groups with HAVING

- Module: 2 Calculations & data quality
- Course position: 15
- Concept: WHERE filters rows before grouping. HAVING filters groups after aggregation. Think rows → groups → group filter → output.
- Example: `SELECT customer_id, COUNT(*) AS order_count FROM orders GROUP BY customer_id HAVING COUNT(*) >= 2;`
- Challenges: Show customer_id and order_count for customers with at least 2 orders. || Show customer_id and total_units for customers with total quantity greater than 3.
- Concept check: Which clause keeps only groups whose total quantity is greater than 10? Correct answer: HAVING SUM(quantity) > 10 Explanation: HAVING filters after aggregates are calculated. WHERE filters individual rows before grouping.
- Declared prerequisites: 10 (Group into summaries, position 14)
- Practice: lc-11-0, lc-11-1
- Project: none
- Opening walkthrough: Inspect the source. Generic SELECT * inspection.

### 16. Lesson 12 — Make decisions with CASE

- Module: 2 Calculations & data quality
- Course position: 16
- Concept: CASE creates a value based on conditions. SQL checks WHEN branches in order and uses the first match. ELSE covers remaining rows.
- Example: `SELECT name, CASE WHEN price >= 80 THEN 'Premium' ELSE 'Standard' END AS tier FROM products;`
- Challenges: Show name and tier: Premium if price >= 80, otherwise Standard. || Show id and is_paid: 1 for paid orders, otherwise 0.
- Concept check: If no WHEN condition matches a CASE expression, what does ELSE supply? Correct answer: A fallback value Explanation: CASE chooses a value for each row. ELSE is the fallback when no WHEN condition is true.
- Declared prerequisites: 11 (Filter groups with HAVING, position 15)
- Practice: lc-12-0, lc-12-1
- Project: none
- Opening walkthrough: Inspect the source. Generic SELECT * inspection.

### 17. Lesson 13 — Conditional aggregation

- Module: 2 Calculations & data quality
- Course position: 17
- Concept: Put CASE inside SUM to count or add only matching rows. ELSE 0 prevents nonmatching rows from contributing. This can produce multiple summaries in one scan.
- Example: `SELECT SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) AS paid_count FROM orders;`
- Challenges: Return paid_count: the number of paid orders. || Return paid_units: the sum of quantity for paid orders.
- Concept check: What does SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) count? Correct answer: Only paid rows Explanation: Each paid row contributes one; other rows contribute zero. The aggregate adds those contributions.
- Declared prerequisites: 12 (Make decisions with CASE, position 16)
- Practice: lc-13-0, lc-13-1
- Project: none
- Opening walkthrough: Inspect the source. Generic SELECT * inspection.

### 18. Lesson 32 — Ratios, ROUND & NULLIF

- Module: 2 Calculations & data quality
- Course position: 18
- Concept: A rate is numerator divided by denominator. Use a real number (100.0) to avoid integer division. NULLIF(x,0) turns a zero denominator into NULL; ROUND controls displayed precision. Preserve that NULL instead of calling an undefined rate zero.
- Example: `SELECT account_id,ROUND(100.0 * SUM(CASE WHEN status='success' THEN 1 ELSE 0 END)/NULLIF(COUNT(*),0),2) AS success_pct FROM ai_requests GROUP BY account_id;`
- Challenges: Return account_id and success_pct (0–100, rounded to 2 decimals) for accounts with requests. || Return id and success_pct for every account, including accounts with no requests (NULL rate). Round to 2 decimals.
- Concept check: What does NULLIF(denominator, 0) do when the denominator is zero? Correct answer: Returns NULL so a ratio can represent an undefined result Explanation: NULLIF returns NULL when its arguments are equal. Division by that missing denominator produces NULL rather than a meaningful ratio.
- Declared prerequisites: 13 (Conditional aggregation, position 17); 15 (Keep unmatched rows, position 22)
- Practice: lc-32-0, lc-32-1. Tracks: Real-World Data Analytics (lc-32-0)
- Project: AI Platform Economics (project 2, milestone lesson 32)
- Opening walkthrough: Inspect the source. Generic SELECT * inspection.

### 19. Lesson 55 — Logical query processing & row grain

- Module: 2 Calculations & data quality
- Course position: 19
- Concept: Think FROM/JOIN → WHERE → GROUP BY → HAVING → SELECT → ORDER BY. This is a logical model, not a promise about physical execution. Row expressions preserve rows, aggregates collapse them, and windows add context without collapsing.
- Example: `SELECT customer_id,SUM(quantity) AS units FROM orders WHERE status='paid' GROUP BY customer_id HAVING SUM(quantity)>2 ORDER BY units DESC;`
- Challenges: Return customer_id and units for paid orders grouped by customer; keep groups with units >2. Sort units descending, then customer_id ascending. || Keep every paid order row and return id, customer_id, quantity and customer_units (sum of paid quantity for that customer using a window).
- Concept check: When are row conditions in WHERE applied relative to GROUP BY? Correct answer: Before groups are formed Explanation: The logical flow filters source rows with WHERE before grouping them. HAVING then filters the groups.
- Declared prerequisites: 10 (Group into summaries, position 14); 11 (Filter groups with HAVING, position 15); 23 (Running totals, position 37)
- Practice: lc-55-0, lc-55-1
- Project: none
- Opening walkthrough: Start with rows. Specific to this lesson.

### 20. Lesson 56 — CAST, text types & NULL arithmetic

- Module: 2 Calculations & data quality
- Course position: 20
- Concept: CAST changes a value’s representation. SQLite uses type affinity rather than SQL Server’s strict column-type model. CAST alone is not validation: nonnumeric text can become zero. NULL propagates through arithmetic unless a business rule replaces it.
- Example: `SELECT id,CAST(price AS TEXT) AS price_text FROM lab_items;`
- Challenges: Return id and price_text by casting price to TEXT for every lab item. || Return id and absolute_gap as ABS(price - 50) for every lab item.
- Concept check: What does adding a number to NULL produce? Correct answer: NULL Explanation: NULL represents missing or unknown data. Arithmetic with NULL remains NULL; use an explicit policy before substituting a value.
- Declared prerequisites: 1 (Aliases & calculated columns, position 2)
- Practice: lc-56-0, lc-56-1
- Project: none
- Opening walkthrough: Inspect the source. Generic SELECT * inspection.

### 21. Lesson 14 — Connect tables with JOIN

- Module: 3 Joins & aggregation
- Course position: 21
- Concept: INNER JOIN pairs rows whose join condition matches. Aliases keep column references short. One customer can match several orders, so joins can increase row counts.
- Example: `SELECT o.id, c.name FROM orders o JOIN customers c ON c.id = o.customer_id;`
- Challenges: Return every order id and its customer name (columns id, name). || Return every order id and its product name (columns id, name).
- Concept check: What does an INNER JOIN do with a customer who has no matching order? Correct answer: Leaves the customer out of the joined result Explanation: INNER JOIN returns matching pairs only. A customer with several matching orders appears once for each match.
- Declared prerequisites: 13 (Conditional aggregation, position 17)
- Practice: lc-14-0, lc-14-1. Tracks: Master SQL Joins (lc-14-0)
- Project: none
- Opening walkthrough: Inspect the source. Generic SELECT * inspection.

### 22. Lesson 15 — Keep unmatched rows

- Module: 3 Joins & aggregation
- Course position: 22
- Concept: LEFT JOIN keeps every row from the left table. When no match exists, right-side columns are NULL. A right-table filter in WHERE may remove those unmatched rows.
- Example: `SELECT c.name, COUNT(o.id) AS order_count FROM customers c LEFT JOIN orders o ON o.customer_id = c.id GROUP BY c.id, c.name;`
- Challenges: Show every customer name and order_count, including customers with zero orders. || Show name for customers with no orders.
- Concept check: After a LEFT JOIN, how do you count zero orders for a customer with no match? Correct answer: COUNT(o.id) Explanation: The customer row is preserved, but o.id is NULL. COUNT(o.id) ignores that NULL and returns zero.
- Declared prerequisites: 14 (Connect tables with JOIN, position 21)
- Practice: lc-15-0, lc-15-1. Tracks: Master SQL Joins (lc-15-1); Master SQL Joins (lc-15-0)
- Project: none
- Opening walkthrough: Identify the preserved side. Specific to this lesson.

### 23. Lesson 16 — Revenue across tables

- Module: 3 Joins & aggregation
- Course position: 23
- Concept: Join transaction rows to product prices, multiply price by quantity, then aggregate at the desired grain. Filter status before computing paid revenue.
- Example: `SELECT c.name, SUM(o.quantity * p.price) AS revenue FROM orders o JOIN customers c ON c.id=o.customer_id JOIN products p ON p.id=o.product_id WHERE o.status='paid' GROUP BY c.id,c.name;`
- Challenges: Show customer name and paid revenue (alias revenue), only customers with paid orders. || Show category and paid revenue (alias revenue) for each category with paid orders.
- Concept check: Two requests and three invoices belong to one account. How many rows can a raw join produce? Correct answer: Six Explanation: Each request matches each invoice: 2 × 3. Aggregate both sides before joining if you need account totals.
- Declared prerequisites: 15 (Keep unmatched rows, position 22)
- Practice: lc-16-0, lc-16-1. Tracks: Master SQL Joins (lc-16-0)
- Project: none
- Opening walkthrough: Inspect the source. Generic SELECT * inspection.

### 24. Lesson 34 — Self-joins & referral relationships

- Module: 3 Joins & aggregation
- Course position: 24
- Concept: A self-join uses the same table in two roles. Use different aliases for the member and referrer. LEFT JOIN retains members who were not referred.
- Example: `SELECT m.id AS member_id,r.id AS referrer_id FROM members m LEFT JOIN members r ON r.id=m.referrer_id;`
- Challenges: Return member_id and referrer_id for every member, keeping NULL when no referrer exists. || Return member_id and referrer_country for members with a referrer, taking the country from the referrer row.
- Concept check: How does a self-join distinguish the two roles of the same table? Correct answer: By giving each occurrence a different alias Explanation: Aliases let you refer to the same table as different roles, such as employee and manager or customer and referrer.
- Declared prerequisites: 14 (Connect tables with JOIN, position 21)
- Practice: lc-34-0, lc-34-1. Tracks: Master SQL Joins (lc-34-0)
- Project: none
- Opening walkthrough: Inspect the source. Generic SELECT * inspection.

### 25. Lesson 35 — CROSS JOIN & a complete date grid

- Module: 3 Joins & aggregation
- Course position: 25
- Concept: CROSS JOIN creates every pair of rows. It is useful for a deliberate date × entity grid, but careless use multiplies data. A short recursive date spine supplies missing days.
- Example: `WITH RECURSIVE days(day) AS ( SELECT '2025-01-01' UNION ALL SELECT date(day,'+1 day') FROM days WHERE day<'2025-01-03' ) SELECT day,v.id AS viewer_id FROM days CROSS JOIN viewers v;`
- Challenges: Return day and viewer_id for every day from 2025-01-01 through 2025-01-03 inclusive and every viewer, including pre-signup combinations. || Return day and viewer_id for the same date range, keeping only combinations on or after that viewer's signup_at.
- Concept check: How many combinations does a CROSS JOIN of two customers and three dates produce? Correct answer: Six Explanation: A CROSS JOIN pairs every row on one side with every row on the other: two times three combinations.
- Declared prerequisites: 27 (Recursive CTEs, position 47)
- Practice: lc-35-0, lc-35-1
- Project: none
- Opening walkthrough: Inspect the source. Generic SELECT * inspection.

### 26. Lesson 36 — FULL OUTER JOIN & unmatched records

- Module: 3 Joins & aggregation
- Course position: 26
- Concept: FULL OUTER JOIN keeps unmatched rows from both sides. Reconciliation often needs this to find missing records. This SQLite version supports FULL OUTER JOIN; older SQLite versions did not.
- Example: `SELECT i.id AS invoice_id,p.id AS payment_id FROM invoices i FULL OUTER JOIN payments p ON p.invoice_id=i.id;`
- Challenges: Return invoice_id and payment_id for every invoice/payment match, retaining unmatched rows on either side. Keep split payments as separate rows. || Return payment_id for payments whose invoice_id has no matching invoice, including NULL invoice_id.
- Concept check: Which unmatched rows does a FULL OUTER JOIN preserve? Correct answer: Unmatched rows from both sides Explanation: A FULL OUTER JOIN keeps matching pairs and unmatched rows from either side, filling the other side with NULL.
- Declared prerequisites: 15 (Keep unmatched rows, position 22)
- Practice: lc-36-0, lc-36-1
- Project: none
- Opening walkthrough: Inspect the source. Generic SELECT * inspection.

### 27. Lesson 37 — ON versus WHERE in a LEFT JOIN

- Module: 3 Joins & aggregation
- Course position: 27
- Concept: ON decides which right-side rows may match. WHERE filters the joined output. Put a success condition in ON when you need to keep accounts with no successful requests.
- Example: `SELECT a.id,COUNT(r.id) AS successful_requests FROM ai_accounts a LEFT JOIN ai_requests r ON r.account_id=a.id AND r.status='success' GROUP BY a.id;`
- Challenges: Return id and successful_requests for every account, including zero successful requests. || Return id and error_requests for every account, including zero failed requests (status = error).
- Concept check: Why can WHERE o.status = 'paid' after a LEFT JOIN remove customers with no orders? Correct answer: Their right-side status is NULL, so the condition is not true Explanation: WHERE filters the joined result. A condition on the right side rejects the unmatched NULL row; put a match restriction in ON when every customer must remain.
- Declared prerequisites: 15 (Keep unmatched rows, position 22)
- Practice: lc-37-0, lc-37-1. Tracks: Master SQL Joins (lc-37-0)
- Project: none
- Opening walkthrough: The dangerous filter. Specific to this lesson.

### 28. Lesson 38 — INTERSECT & EXCEPT

- Module: 3 Joins & aggregation
- Course position: 28
- Concept: INTERSECT keeps distinct rows appearing in both results. EXCEPT keeps distinct rows from the first result that are absent from the second. Column positions and types should align.
- Example: `SELECT viewer_id FROM watch_events WHERE video_id=1 INTERSECT SELECT viewer_id FROM watch_events WHERE video_id=2;`
- Challenges: Return viewer_id for viewers who watched both video 1 and video 2. Each viewer appears once. || Return viewer_id for viewers who watched video 1 but never video 2. Each viewer appears once.
- Concept check: What does A EXCEPT B return? Correct answer: Distinct rows in A that are absent from B Explanation: EXCEPT subtracts the right result from the left and returns distinct remaining rows.
- Declared prerequisites: 19 (Combine sets with UNION, position 46)
- Practice: lc-38-0, lc-38-1. Tracks: Master SQL Joins (lc-38-1)
- Project: none
- Opening walkthrough: Inspect the source. Generic SELECT * inspection.

### 29. Lesson 17 — Subqueries

- Module: 4 Dates, strings & subqueries
- Course position: 29
- Concept: A subquery is a query inside another query. A scalar subquery produces one value, which can be used in a comparison. Parentheses separate the inner query.
- Example: `SELECT name, price FROM products WHERE price > (SELECT AVG(price) FROM products);`
- Challenges: Show name and price of products above the average product price. || Show id and quantity for orders whose quantity is above the average order quantity.
- Concept check: In price > (SELECT AVG(price) FROM products), what does the inner query supply? Correct answer: One average price used by the outer comparison Explanation: AVG without GROUP BY produces one summary value. The outer query compares each product price with that value.
- Declared prerequisites: 16 (Revenue across tables, position 23)
- Practice: lc-17-0, lc-17-1. Tracks: SQL Interview Essentials (lc-17-0)
- Project: none
- Opening walkthrough: Inspect the source. Generic SELECT * inspection.

### 30. Lesson 18 — Ask whether a row exists

- Module: 4 Dates, strings & subqueries
- Course position: 30
- Concept: EXISTS is true when its subquery returns at least one row. A correlated subquery refers to the outer row. NOT EXISTS is useful for finding missing relationships.
- Example: `SELECT c.name FROM customers c WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id=c.id AND o.status='paid');`
- Challenges: Show name of customers who have at least one paid order. || Show name of customers who have no paid orders.
- Concept check: What does NOT EXISTS test for each outer row? Correct answer: Whether the subquery finds no matching rows Explanation: NOT EXISTS is true when the correlated subquery returns no rows. It tests existence, not the value selected.
- Declared prerequisites: 17 (Subqueries, position 29)
- Practice: lc-18-0, lc-18-1. Tracks: SQL Interview Essentials (lc-18-1)
- Project: none
- Opening walkthrough: Inspect the source. Generic SELECT * inspection.

### 31. Lesson 20 — Readable queries with CTEs

- Module: 4 Dates, strings & subqueries
- Course position: 31
- Concept: WITH names a temporary query result for this statement. Common table expressions help you separate a complicated question into understandable stages. They do not create permanent tables.
- Example: `WITH totals AS ( SELECT customer_id, SUM(quantity) AS units FROM orders GROUP BY customer_id ) SELECT customer_id, units FROM totals WHERE units > 3;`
- Challenges: Use a CTE to return customer_id and units for customers whose total quantity exceeds 3. || Use a CTE to return category and avg_price for categories with average price greater than 30.
- Concept check: What does WITH totals AS (...) create? Correct answer: A named query result available within this statement Explanation: A common table expression names a query result for the current statement. It does not create a permanent table.
- Declared prerequisites: 19 (Combine sets with UNION, position 46)
- Practice: lc-20-0, lc-20-1. Tracks: SQL Interview Essentials (lc-20-0)
- Project: none
- Opening walkthrough: Inspect the source. Generic SELECT * inspection.

### 32. Lesson 26 — Dates & monthly analysis

- Module: 4 Dates, strings & subqueries
- Course position: 32
- Concept: SQLite stores these dates as ISO text. strftime formats dates: %Y-%m extracts a year and month. Group by that expression to build a monthly summary. Other SQL dialects use different date functions.
- Example: `SELECT strftime('%Y-%m', ordered_at) AS month, COUNT(*) AS order_count FROM orders GROUP BY month;`
- Challenges: Return month (YYYY-MM) and order_count for all orders by month. || Return month (YYYY-MM) and paid_units for paid orders by month.
- Concept check: What does GROUP BY strftime('%Y-%m', ordered_at) produce? Correct answer: One row per calendar year and month Explanation: %Y-%m keeps the year and month together. Grouping by the month number alone would mix the same month from different years.
- Declared prerequisites: 25 (Latest row per group, position 39)
- Practice: lc-26-0, lc-26-1
- Project: none
- Opening walkthrough: Read the order dates. Specific to this lesson.

### 33. Lesson 33 — Clean strings & cast values

- Module: 4 Dates, strings & subqueries
- Course position: 33
- Concept: TRIM removes outside spaces, LOWER normalizes case, SUBSTR extracts a portion, and CAST makes a conversion explicit. Keep NULL visible when the source is missing. SQLite uses SUBSTR; many engines also provide SUBSTRING.
- Example: `SELECT id,LOWER(TRIM(email)) AS clean_email FROM members;`
- Challenges: Return id and clean_email for every member: trim outside spaces and lowercase the email; preserve NULL. || Return id and email_domain: lowercase, trim, and take the email text after @. Preserve NULL.
- Concept check: Why apply TRIM before comparing a text identifier? Correct answer: To remove leading and trailing spaces Explanation: TRIM removes surrounding spaces. It keeps internal spaces; case normalization and type conversion are separate operations.
- Declared prerequisites: 7 (Understand NULL, position 10)
- Practice: lc-33-0, lc-33-1
- Project: none
- Opening walkthrough: Inspect the source. Generic SELECT * inspection.

### 34. Lesson 39 — Date boundaries & monthly buckets

- Module: 4 Dates, strings & subqueries
- Course position: 34
- Concept: For timestamps, use a half-open interval: >= start and < next boundary. This includes every time on the last day without guessing the final second. SQLite uses strftime/date; PostgreSQL uses DATE_TRUNC and INTERVAL. All teaching timestamps are UTC.
- Example: `SELECT id,watched_at FROM watch_events WHERE watched_at >= '2025-01-01' AND watched_at < '2025-02-01';`
- Challenges: Return id and watched_at for January 2025 watch events, including the full final day and excluding February. || Return month (YYYY-MM) and active_viewers (distinct viewers) across all watch events by month.
- Concept check: Which range includes every January timestamp and excludes February? Correct answer: >= '2025-01-01' AND < '2025-02-01' Explanation: A half-open interval handles the full last day and excludes the next boundary.
- Declared prerequisites: 26 (Dates & monthly analysis, position 32)
- Practice: lc-39-0, lc-39-1
- Project: none
- Opening walkthrough: Inspect the source. Generic SELECT * inspection.

### 35. Lesson 21 — Window functions: ROW_NUMBER

- Module: 5 Window functions
- Course position: 35
- Concept: Window functions calculate across related rows while keeping each row visible. ROW_NUMBER assigns 1, 2, 3 within a partition using its ORDER BY. Include a tie-breaker for repeatable results.
- Example: `SELECT id, customer_id, ROW_NUMBER() OVER( PARTITION BY customer_id ORDER BY ordered_at, id ) AS order_number FROM orders;`
- Challenges: Return id, customer_id and order_number: number each customer's orders by ordered_at then id. || Return name, category and price_rank: number products within category by price descending then id.
- Concept check: What does ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY ordered_at, id) do? Correct answer: Numbers each customer’s rows from 1, keeping every row Explanation: PARTITION BY starts a new sequence for each customer. ORDER BY sets the sequence; id breaks equal timestamps.
- Declared prerequisites: 20 (Readable queries with CTEs, position 31)
- Practice: lc-21-0, lc-21-1
- Project: none
- Opening walkthrough: Inspect the source. Generic SELECT * inspection.

### 36. Lesson 22 — RANK & DENSE_RANK

- Module: 5 Window functions
- Course position: 36
- Concept: RANK gives ties the same rank, then leaves a gap. DENSE_RANK gives ties the same rank without gaps. ROW_NUMBER always assigns distinct numbers.
- Example: `SELECT customer_id, COUNT(*) AS order_count, DENSE_RANK() OVER(ORDER BY COUNT(*) DESC) AS rank FROM orders GROUP BY customer_id;`
- Challenges: Show customer_id, order_count and rank using DENSE_RANK by order_count descending. || Show customer_id, order_count and rank using RANK by order_count descending.
- Concept check: For tied values 100, 100, 90, what do RANK and DENSE_RANK assign to 90? Correct answer: 3 and 2 Explanation: RANK leaves a gap after a tie. DENSE_RANK counts distinct ranked values without gaps.
- Declared prerequisites: 21 (Window functions: ROW_NUMBER, position 35)
- Practice: lc-22-0, lc-22-1
- Project: none
- Opening walkthrough: Inspect the source. Generic SELECT * inspection.

### 37. Lesson 23 — Running totals

- Module: 5 Window functions
- Course position: 37
- Concept: SUM as a window function keeps each row and accumulates values over a frame. ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW means all earlier rows plus this row.
- Example: `SELECT id, quantity, SUM(quantity) OVER( ORDER BY ordered_at,id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW ) AS running_units FROM orders;`
- Challenges: Show id, quantity and running_units: cumulative quantity ordered by ordered_at then id. || Show id, customer_id and running_units: cumulative quantity per customer ordered by ordered_at then id.
- Concept check: What does a running SUM with ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW include? Correct answer: This row and every earlier row in the sort order Explanation: UNBOUNDED PRECEDING through CURRENT ROW accumulates every row so far. It counts rows in the frame, not a fixed number of days.
- Declared prerequisites: 22 (RANK & DENSE_RANK, position 36)
- Practice: lc-23-0, lc-23-1. Tracks: Advanced SQL Challenges (lc-23-1)
- Project: none
- Opening walkthrough: Keep every order in order. Specific to this lesson.

### 38. Lesson 24 — Compare rows with LAG

- Module: 5 Window functions
- Course position: 38
- Concept: LAG reads a value from a previous row within a window. The first row has no predecessor, so its result is NULL unless you supply a default.
- Example: `SELECT id, customer_id, LAG(quantity) OVER( PARTITION BY customer_id ORDER BY ordered_at,id ) AS previous_quantity FROM orders;`
- Challenges: Show id, customer_id and previous_quantity for the previous order of each customer, ordered by ordered_at then id. || Show id, quantity and change: current quantity minus previous quantity across all orders, ordered by ordered_at then id.
- Concept check: What does LAG(value) return for the first row in a partition when no default is supplied? Correct answer: NULL Explanation: There is no previous row at the start of a partition, so LAG returns NULL unless you supply a default.
- Declared prerequisites: 23 (Running totals, position 37)
- Practice: lc-24-0, lc-24-1. Tracks: Advanced SQL Challenges (lc-24-0)
- Project: none
- Opening walkthrough: Inspect the source. Generic SELECT * inspection.

### 39. Lesson 25 — Latest row per group

- Module: 5 Window functions
- Course position: 39
- Concept: Use a CTE with ROW_NUMBER sorted newest-first, then filter to row number 1. A window result cannot be filtered by WHERE in the same query block.
- Example: `WITH ranked AS ( SELECT *, ROW_NUMBER() OVER(PARTITION BY customer_id ORDER BY ordered_at DESC,id DESC) AS rn FROM orders ) SELECT id,customer_id,ordered_at FROM ranked WHERE rn=1;`
- Challenges: Return id, customer_id and ordered_at for the latest order per customer; break date ties by highest id. || Return name, category and price for the most expensive product per category; break price ties by lowest id.
- Concept check: How do you keep one latest row per customer with ROW_NUMBER? Correct answer: Partition by customer, order newest first with a tie-breaker, then filter rn = 1 in an outer query Explanation: Partitioning separates customers. Ordering identifies the latest row; an outer query filters the window result.
- Declared prerequisites: 24 (Compare rows with LAG, position 38)
- Practice: lc-25-0, lc-25-1. Tracks: SQL Interview Essentials (lc-25-0)
- Project: none
- Opening walkthrough: Inspect the source. Generic SELECT * inspection.

### 40. Lesson 40 — LEAD & the next event

- Module: 5 Window functions
- Course position: 40
- Concept: LEAD looks forward within a partition. Use it to see the next event or compute a gap. The last row has no next event and returns NULL. Deterministic ordering needs a tie-breaker.
- Example: `SELECT id,viewer_id,LEAD(watched_at) OVER( PARTITION BY viewer_id ORDER BY watched_at,id ) AS next_watch_at FROM watch_events;`
- Challenges: Return id, viewer_id and next_watch_at for each viewer's next watch event, ordering each viewer by watched_at then id. || Return id and seconds_to_next: next watched_at minus current watched_at in seconds per viewer, ordered by watched_at then id. Last events get NULL.
- Concept check: What does LEAD(value) return when there is no next row and no default is supplied? Correct answer: NULL Explanation: LEAD reads the next row in the ordered partition. At the end, it returns NULL unless a default is supplied.
- Declared prerequisites: 24 (Compare rows with LAG, position 38)
- Practice: lc-40-0, lc-40-1
- Project: none
- Opening walkthrough: Inspect the source. Generic SELECT * inspection.

### 41. Lesson 41 — FIRST_VALUE, LAST_VALUE & frames

- Module: 5 Window functions
- Course position: 41
- Concept: FIRST_VALUE and LAST_VALUE read endpoints of a window frame. LAST_VALUE with the default ordered frame often returns the current row. Use UNBOUNDED FOLLOWING to reach the final row in the partition.
- Example: `SELECT id,viewer_id,LAST_VALUE(video_id) OVER( PARTITION BY viewer_id ORDER BY watched_at,id ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING ) AS last_video FROM watch_events;`
- Challenges: Return id, viewer_id and last_video for each viewer's final watched video, ordered within viewer by watched_at then id. Repeat that final video on every viewer row. || Return id, viewer_id and first_video for each viewer's first watched video, ordered within viewer by watched_at then id.
- Concept check: Why does LAST_VALUE often return the current row? Correct answer: The default ordered frame may end at the current row Explanation: Extend the frame to UNBOUNDED FOLLOWING to include the final row in the partition.
- Declared prerequisites: 23 (Running totals, position 37)
- Practice: lc-41-0, lc-41-1
- Project: none
- Opening walkthrough: Inspect the source. Generic SELECT * inspection.

### 42. Lesson 42 — Rolling averages & missing dates

- Module: 5 Window functions
- Course position: 42
- Concept: A rolling average smooths variation. ROWS counts rows, not calendar days. When dates are missing, a three-row average differs from a three-day average. Fill missing days with zero only if the business definition says absence means no activity.
- Example: `SELECT day,watch_minutes,ROUND(AVG(watch_minutes) OVER( ORDER BY day ROWS BETWEEN 2 PRECEDING AND CURRENT ROW ),2) AS rolling_avg FROM daily_metrics;`
- Challenges: Return day, watch_minutes and rolling_avg (2 decimals) for the current and previous 2 observed rows in daily_metrics, sorted by day. This task intentionally uses rows, not calendar days. || Return day, watch_minutes and rolling_avg (2 decimals) for every day Jan 1–7 2025, treating absent daily_metrics days as zero. Average current and previous 2 calendar days; early windows use available days. Sort by day.
- Concept check: Does ROWS BETWEEN 2 PRECEDING AND CURRENT ROW always represent three calendar days? Correct answer: Only when there is one complete row per calendar day Explanation: ROWS counts rows. Missing dates require a complete date spine for a calendar-day window.
- Declared prerequisites: 23 (Running totals, position 37); 35 (CROSS JOIN & a complete date grid, position 25)
- Practice: lc-42-0, lc-42-1. Tracks: Advanced SQL Challenges (lc-42-1)
- Project: Video Product Analytics (project 0, milestone lesson 42)
- Opening walkthrough: Notice missing dates. Specific to this lesson.

### 43. Lesson 43 — Share of total with windows

- Module: 5 Window functions
- Course position: 43
- Concept: An aggregate window without GROUP BY can put a grand total alongside each group. Aggregate per model first, then use SUM(request_count) OVER() as the denominator.
- Example: `WITH counts AS(SELECT model,COUNT(*) AS request_count FROM ai_requests GROUP BY model) SELECT model,request_count,ROUND(100.0*request_count/ SUM(request_count) OVER(),2) AS share_pct FROM counts;`
- Challenges: Return model, request_count and share_pct (0–100, 2 decimals) for all request rows by model. || Return model, output_tokens and share_pct (0–100, 2 decimals) of total successful output tokens by model.
- Concept check: Why use SUM(value) OVER () as the denominator for share of total? Correct answer: It repeats the overall total while keeping each detail row Explanation: The window aggregate exposes the total on each row. Divide each row’s value by that total, using appropriate numeric and zero-denominator handling.
- Declared prerequisites: 20 (Readable queries with CTEs, position 31); 32 (Ratios, ROUND & NULLIF, position 18)
- Practice: lc-43-0, lc-43-1. Tracks: Real-World Data Analytics (lc-43-0)
- Project: none
- Opening walkthrough: Inspect the source. Generic SELECT * inspection.

### 44. Lesson 53 — Top N per group & ties

- Module: 5 Window functions
- Course position: 44
- Concept: Aggregate watched seconds per video, then rank videos within creator. ROW_NUMBER gives an exact N with a tie-breaker; DENSE_RANK includes ties and may return more than N. Make the tie policy explicit.
- Example: `WITH totals AS(SELECT v.creator_id,v.id AS video_id, SUM(w.watch_seconds) AS watch_seconds FROM videos v JOIN watch_events w ON w.video_id=v.id GROUP BY v.id,v.creator_id), ranked AS(SELECT *,ROW_NUMBER() OVER(PARTITION BY creator_id ORDER BY watch_seconds DESC,video_id) AS rn FROM totals) SELECT creator_id,video_id,watch_seconds FROM ranked WHERE rn<=2;`
- Challenges: Return creator_id, video_id and watch_seconds for the top 2 watched videos per creator, excluding videos with no events. Rank by total seconds descending, break ties by smallest video_id. || Return creator_id, video_id and watch_seconds for each creator's most-watched video(s), including ties. Exclude videos with no events.
- Concept check: To return exactly two rows per group with deterministic tie handling, which function fits? Correct answer: ROW_NUMBER with a unique tie-breaker Explanation: ROW_NUMBER assigns unique positions. A stable tie-breaker determines which tied rows occupy the two positions; rank functions can include more rows when ties are kept.
- Declared prerequisites: 22 (RANK & DENSE_RANK, position 36); 25 (Latest row per group, position 39)
- Practice: lc-53-0, lc-53-1. Tracks: Advanced SQL Challenges (lc-53-1)
- Project: Video Product Analytics (project 0, milestone lesson 53)
- Opening walkthrough: Inspect the source. Generic SELECT * inspection.

### 45. Lesson 57 — NTILE & balanced ranking buckets

- Module: 5 Window functions
- Course position: 45
- Concept: NTILE divides an ordered partition into a requested number of buckets. Bucket row counts differ by at most one, with larger buckets first. It may separate equal values; use a deterministic tie-breaker if that is acceptable.
- Example: `SELECT id,watch_seconds,NTILE(4) OVER( ORDER BY watch_seconds DESC,id) AS bucket FROM watch_events;`
- Challenges: Return id, watch_seconds and bucket using NTILE(4), ordered within the window by watch_seconds descending then id. || Return id, viewer_id and bucket using NTILE(2) per viewer, ordered within viewer by watched_at then id.
- Concept check: What does NTILE(3) do to six ordered rows? Correct answer: Assigns them to three buckets of two rows each Explanation: NTILE divides the ordered rows into roughly equal buckets while keeping the rows visible. When six rows divide evenly into three buckets, each gets two.
- Declared prerequisites: 22 (RANK & DENSE_RANK, position 36)
- Practice: lc-57-0, lc-57-1
- Project: none
- Opening walkthrough: Inspect the source. Generic SELECT * inspection.

### 46. Lesson 19 — Combine sets with UNION

- Module: 6 Advanced product analysis
- Course position: 46
- Concept: UNION stacks compatible query outputs and removes duplicate rows. UNION ALL retains duplicates. Both sides need the same number of columns in matching positions.
- Example: `SELECT city FROM customers WHERE city='Chicago' UNION SELECT city FROM customers WHERE city='Austin';`
- Challenges: Return distinct city values from Chicago customers and Austin customers using UNION. || Stack name from customers and name from products, keeping duplicates.
- Concept check: What is the difference between UNION and UNION ALL? Correct answer: UNION removes duplicate result rows; UNION ALL keeps them Explanation: Both combine compatible result rows. UNION removes duplicates; UNION ALL preserves them.
- Declared prerequisites: 18 (Ask whether a row exists, position 30)
- Practice: lc-19-0, lc-19-1
- Project: none
- Opening walkthrough: Inspect the source. Generic SELECT * inspection.

### 47. Lesson 27 — Recursive CTEs

- Module: 6 Advanced product analysis
- Course position: 47
- Concept: A recursive CTE has an anchor row and a recursive step joined by UNION ALL. The step uses the previous result until its stopping condition is false. Always include a termination condition.
- Example: `WITH RECURSIVE numbers(n) AS ( SELECT 1 UNION ALL SELECT n+1 FROM numbers WHERE n<5 ) SELECT n FROM numbers;`
- Challenges: Use a recursive CTE to return n with integers 1 through 5. || Use a recursive CTE to return n with integers 1 through 10.
- Concept check: Which part of a recursive CTE supplies the starting rows? Correct answer: The anchor query Explanation: The anchor supplies the starting rows. The recursive part derives subsequent rows from the current result.
- Declared prerequisites: 26 (Dates & monthly analysis, position 32)
- Practice: lc-27-0, lc-27-1
- Project: none
- Opening walkthrough: Inspect the source. Generic SELECT * inspection.

### 48. Lesson 28 — Query plans & indexes

- Module: 6 Advanced product analysis
- Course position: 48
- Concept: An index can help SQLite find or order rows efficiently. EXPLAIN QUERY PLAN shows SCAN versus SEARCH and index use. Indexes cost storage and slow writes; the optimizer may still scan a tiny table.
- Example: `EXPLAIN QUERY PLAN SELECT name FROM customers WHERE city='Chicago';`
- Challenges: Show name for Chicago customers. Run the reference with Explain mode to inspect the plan. || Show id and quantity for paid orders. Inspect its plan with Explain mode.
- Concept check: What does EXPLAIN QUERY PLAN show? Correct answer: SQLite’s chosen access strategy Explanation: A plan shows how SQLite intends to access data. It does not measure execution time or prove a production speedup.
- Declared prerequisites: 27 (Recursive CTEs, position 47)
- Practice: lc-28-0, lc-28-1
- Project: none
- Opening walkthrough: Inspect the source. Generic SELECT * inspection.

### 49. Lesson 29 — Capstone: customer insights

- Module: 6 Advanced product analysis
- Course position: 49
- Concept: Combine filtering, joins, aggregation and ranking to answer a business question. First compute each customer's paid revenue, then rank those customer totals. Write one stage at a time.
- Example: `WITH revenue AS ( SELECT c.name,SUM(o.quantity*p.price) AS paid_revenue FROM customers c JOIN orders o ON o.customer_id=c.id JOIN products p ON p.id=o.product_id WHERE o.status='paid' GROUP BY c.id,c.name ) SELECT name,paid_revenue,DENSE_RANK() OVER(ORDER BY paid_revenue DESC) AS revenue_rank FROM revenue;`
- Challenges: Show name, paid_revenue and revenue_rank for customers with paid orders. Use DENSE_RANK, highest revenue first in the rank calculation. || Show category, paid_revenue and revenue_rank for product categories with paid orders. Use DENSE_RANK by revenue descending.
- Concept check: Why calculate customer revenue before ranking customers? Correct answer: To rank one total per customer instead of individual order lines Explanation: The reporting grain is one customer. Aggregate order-line revenue to that grain before ranking.
- Declared prerequisites: 28 (Query plans & indexes, position 48)
- Practice: lc-29-0, lc-29-1. Tracks: Real-World Data Analytics (lc-29-0)
- Project: none
- Opening walkthrough: Inspect the source. Generic SELECT * inspection.

### 50. Lesson 44 — Deduplicate event retries

- Module: 6 Advanced product analysis
- Course position: 50
- Concept: Ingestion retries can produce several physical rows for one logical event. Define the event key and which version wins. ROW_NUMBER per event_key, ordered by ingested_at and id descending, keeps the latest version.
- Example: `WITH ranked AS(SELECT *,ROW_NUMBER() OVER( PARTITION BY event_key ORDER BY ingested_at DESC,id DESC ) AS rn FROM social_events) SELECT id,event_key,member_id FROM ranked WHERE rn=1;`
- Challenges: Return id, event_key and member_id for the latest ingested row of each event_key. Break ingestion ties by highest id. || After keeping the latest ingested row per event_key (tie: highest id), return event_type and event_count by event_type.
- Concept check: Why deduplicate retries by a stable event identifier before counting events? Correct answer: Retries can otherwise count the same logical event more than once Explanation: Multiple source versions can represent one logical event. A declared identifier and deterministic version order choose one record.
- Declared prerequisites: 25 (Latest row per group, position 39)
- Practice: lc-44-0, lc-44-1
- Project: Social Product Analytics (project 1, milestone lesson 44)
- Opening walkthrough: Find event retries. Specific to this lesson.

### 51. Lesson 45 — Daily active users & engagement

- Module: 6 Advanced product analysis
- Course position: 51
- Concept: DAU counts distinct people with activity on a calendar day, not event rows. Define engagement separately: here it is total seconds divided by active viewers. This result includes observed dates only.
- Example: `SELECT date(watched_at) AS day,COUNT(DISTINCT viewer_id) AS active_viewers FROM watch_events GROUP BY day;`
- Challenges: Return day (YYYY-MM-DD) and active_viewers (distinct viewers) for every observed watch date. || Return day, active_viewers and minutes_per_active_viewer, rounded to 2 decimals, for each observed watch date.
- Concept check: One viewer watches three videos on the same day. How much do they contribute to daily active viewers? Correct answer: One active viewer Explanation: Daily active viewers counts DISTINCT viewer_id for the day. Watch events and engagement seconds are separate measures.
- Declared prerequisites: 10 (Group into summaries, position 14); 39 (Date boundaries & monthly buckets, position 34)
- Practice: lc-45-0, lc-45-1
- Project: Video Product Analytics (project 0, milestone lesson 45)
- Opening walkthrough: Inspect the source. Generic SELECT * inspection.

### 52. Lesson 46 — Ordered conversion funnels

- Module: 6 Advanced product analysis
- Course position: 52
- Concept: A funnel is an ordered journey. Find the first view, then the first signup on or after that view, then the first purchase on or after signup. A purchase that happens before signup does not complete this funnel. Equal timestamps are allowed here.
- Example: `-- Build one row per member at each stage. WITH views AS(SELECT member_id,MIN(event_at) AS viewed_at FROM social_events WHERE event_type='view' GROUP BY member_id), signups AS(SELECT v.member_id,v.viewed_at,MIN(e.event_at) AS signed_at FROM views v LEFT JOIN social_events e ON e.member_id=v.member_id AND e.event_type='signup' AND e.event_at>=v.viewed_at GROUP BY v.member_id,v.viewed_at), funnel AS(SELECT s.member_id,s.viewed_at,s.signed_at,MIN(e.event_at) AS purchased_at FROM signups s LEFT JOIN social_events e ON e.member_id=s.member_id AND e.event_type='purchase' AND e.event_at>=s.signed_at GROUP BY s.member_id,s.viewed_at,s.signed_at) SELECT COUNT(*) AS viewed,COUNT(signed_at) AS signed_up, COUNT(purchased_at) AS purchased FROM funnel;`
- Challenges: Return one row: viewed, signed_up, purchased as member counts for the ordered view → signup → purchase funnel. Equal times are allowed; use each member's earliest valid next step. || Return member_id, viewed_at, signed_at and purchased_at for members who complete that ordered funnel.
- Concept check: A person purchases before signing up, then never purchases again. Did they finish the ordered signup → purchase funnel? Correct answer: No, the purchase must occur on or after signup Explanation: Sequence is part of the metric definition. Independent event counts cannot establish an ordered journey.
- Declared prerequisites: 20 (Readable queries with CTEs, position 31); 37 (ON versus WHERE in a LEFT JOIN, position 27)
- Practice: lc-46-0, lc-46-1. Tracks: Real-World Data Analytics (lc-46-0)
- Project: Social Product Analytics (project 1, milestone lesson 46)
- Opening walkthrough: Find first views. Specific to this lesson.

### 53. Lesson 47 — Cohorts & exact-day retention

- Module: 6 Advanced product analysis
- Course position: 53
- Concept: A cohort groups people by signup date. Exact-day D1 retention asks whether they return on signup +1 day, not anytime later. Count people, include non-returners, and exclude cohorts that have not matured by the observation cutoff.
- Example: `-- D1 retention; observation cutoff is 2025-01-15 SELECT v.signup_at AS cohort_day,COUNT(*) AS cohort_size,SUM(CASE WHEN EXISTS(SELECT 1 FROM watch_events w WHERE w.viewer_id=v.id AND date(w.watched_at)=date(v.signup_at,'+1 days')) THEN 1 ELSE 0 END) AS retained_viewers,ROUND(100.0*SUM(CASE WHEN EXISTS(SELECT 1 FROM watch_events w WHERE w.viewer_id=v.id AND date(w.watched_at)=date(v.signup_at,'+1 days')) THEN 1 ELSE 0 END)/COUNT(*),2) AS retention_pct FROM viewers v WHERE v.signup_at<=date('2025-01-15','-1 days') GROUP BY v.signup_at`
- Challenges: With observation cutoff Jan 15 2025, return cohort_day, cohort_size, retained_viewers and retention_pct (0–100, 2 decimals) for exact-day D1 retention. Include only mature cohorts. || Use the same output and cutoff for exact-day D7 retention (signup date +7 days); include only mature cohorts.
- Concept check: Exact-day D7 retention means a user returns when? Correct answer: On signup date plus seven calendar days Explanation: Exact-day, rolling-window, and unbounded retention use different definitions.
- Declared prerequisites: 18 (Ask whether a row exists, position 30); 39 (Date boundaries & monthly buckets, position 34)
- Practice: lc-47-0, lc-47-1. Tracks: Real-World Data Analytics (lc-47-0)
- Project: Video Product Analytics (project 0, milestone lesson 47)
- Opening walkthrough: Define mature cohorts. Specific to this lesson.

### 54. Lesson 48 — Sessionize an event stream

- Module: 6 Advanced product analysis
- Course position: 54
- Concept: A session starts on a member’s first event or after a gap of at least 30 minutes. LAG finds the prior timestamp, CASE flags boundaries, and a running SUM numbers sessions. Here we use physical rows, including retries. Identical timestamps do not start a new session.
- Example: `WITH previous AS(SELECT *,LAG(event_at) OVER(PARTITION BY member_id ORDER BY event_at,id) AS previous_at FROM social_events), marked AS(SELECT *,CASE WHEN previous_at IS NULL OR unixepoch(event_at)-unixepoch(previous_at)>=1800 THEN 1 ELSE 0 END AS new_session FROM previous), numbered AS(SELECT *,SUM(new_session) OVER(PARTITION BY member_id ORDER BY event_at,id ROWS UNBOUNDED PRECEDING) AS session_number FROM marked) SELECT member_id,MAX(session_number) AS session_count FROM numbered GROUP BY member_id;`
- Challenges: Using raw social_events, return member_id and session_count. Start a new session on the first event or a gap of at least 30 minutes; order by event_at then id per member. || Using the same rule, return id, member_id and session_number for every raw social event.
- Concept check: With a gap rule of at least 30 minutes, does a 30-minute gap start a new session? Correct answer: Yes, use >=1800 seconds Explanation: The boundary is inclusive. Integer timestamp differences keep that definition precise.
- Declared prerequisites: 24 (Compare rows with LAG, position 38); 23 (Running totals, position 37)
- Practice: lc-48-0, lc-48-1. Tracks: Advanced SQL Challenges (lc-48-0)
- Project: Social Product Analytics (project 1, milestone lesson 48)
- Opening walkthrough: Find the previous timestamp. Specific to this lesson.

### 55. Lesson 49 — Multi-grain joins without fan-out

- Module: 6 Advanced product analysis
- Course position: 55
- Concept: Requests and invoices each have many rows per account. Joining raw tables creates requests × invoices and inflates sums. Aggregate each side to one row per account before joining; keep accounts with zero on either side.
- Example: `WITH usage AS(SELECT account_id,COUNT(*) AS request_count FROM ai_requests GROUP BY account_id), billing AS( SELECT account_id,SUM(billed_amount) AS billed_amount FROM invoices GROUP BY account_id) SELECT a.id,COALESCE(u.request_count,0) AS request_count, COALESCE(b.billed_amount,0) AS billed_amount FROM ai_accounts a LEFT JOIN usage u ON u.account_id=a.id LEFT JOIN billing b ON b.account_id=a.id;`
- Challenges: Return id, request_count and billed_amount for every account across all dates. Aggregate requests and invoices separately to avoid multiplication; use zeros for missing totals. || Return id, output_tokens and billed_amount for every account across all dates. Sum only successful output tokens and aggregate invoices separately. Use zeros for missing totals.
- Concept check: Why aggregate requests and invoices separately before joining account totals? Correct answer: To prevent each request from matching every invoice and multiplying totals Explanation: Both child tables can have several rows per account. Aggregating each to one row per account avoids many-to-many fan-out.
- Declared prerequisites: 20 (Readable queries with CTEs, position 31); 16 (Revenue across tables, position 23)
- Practice: lc-49-0, lc-49-1. Tracks: Master SQL Joins (lc-49-0)
- Project: AI Platform Economics (project 2, milestone lesson 49)
- Opening walkthrough: Observe join fan-out. Specific to this lesson.

### 56. Lesson 50 — Revenue & payment reconciliation

- Module: 6 Advanced product analysis
- Course position: 56
- Concept: Reconciliation compares independent totals. Sum payments and refunds by invoice before joining. Net collected is payments minus refunds; gap is billed minus net collected. A refund creates a gap under this definition, even when the original bill was paid.
- Example: `WITH paid AS(SELECT invoice_id,SUM(amount) AS paid_amount FROM payments GROUP BY invoice_id),returned AS(SELECT invoice_id,SUM(amount) AS refund_amount FROM refunds GROUP BY invoice_id) SELECT i.id,i.billed_amount, COALESCE(p.paid_amount,0)-COALESCE(r.refund_amount,0) AS net_collected, i.billed_amount-COALESCE(p.paid_amount,0)+COALESCE(r.refund_amount,0) AS gap FROM invoices i LEFT JOIN paid p ON p.invoice_id=i.id LEFT JOIN returned r ON r.invoice_id=i.id;`
- Challenges: Return id, billed_amount, net_collected and gap for every invoice across all periods. Net collected = payments - refunds; gap = billed - net collected. Treat missing totals as zero. || Using the same definition, return invoice_id and gap only for invoices with nonzero gap.
- Concept check: Why keep invoice totals separate from payment totals before reconciliation? Correct answer: Invoices and payments can have different row grains Explanation: An invoice can have multiple payments. Summarize each source at the reconciliation grain before comparing totals.
- Declared prerequisites: 49 (Multi-grain joins without fan-out, position 55)
- Practice: lc-50-0, lc-50-1. Tracks: Real-World Data Analytics (lc-50-0)
- Project: AI Platform Economics (project 2, milestone lesson 50)
- Opening walkthrough: Inspect split payments. Generic SELECT * inspection.

### 57. Lesson 51 — AI usage cost & contribution margin

- Module: 6 Advanced product analysis
- Course position: 57
- Concept: Usage cost equals input tokens × input rate plus output tokens × output rate, divided by one million. These rates are fictional. Under this exercise’s rule, successful requests are chargeable; errors are excluded. Compare January billed revenue to January successful usage cost, not all-time billing.
- Example: `SELECT r.model,ROUND(SUM(r.input_tokens*m.input_per_million+ r.output_tokens*m.output_per_million)/1000000.0,6) AS usage_cost FROM ai_requests r JOIN model_rates m ON m.model=r.model WHERE r.status='success' GROUP BY r.model;`
- Challenges: Return model and usage_cost in fictional USD, rounded to 6 decimals, for successful requests across all dates. || Return id, billed_amount, usage_cost and contribution_margin for every account for Jan 2025. Use January invoices and successful requests only; missing totals are zero. Round cost and margin to 6 decimals. Margin = billed - usage cost.
- Concept check: Is billed revenue minus model token cost the same as net profit? Correct answer: No; other costs and refunds may still be excluded Explanation: This exercise defines a simplified contribution margin. It does not include all operating costs.
- Declared prerequisites: 49 (Multi-grain joins without fan-out, position 55); 32 (Ratios, ROUND & NULLIF, position 18)
- Practice: lc-51-0, lc-51-1. Tracks: Real-World Data Analytics (lc-51-1)
- Project: AI Platform Economics (project 2, milestone lesson 51)
- Opening walkthrough: Price a request. Specific to this lesson.

### 58. Lesson 52 — Experiment conversion denominators

- Module: 6 Advanced product analysis
- Course position: 58
- Concept: Compare assigned members, including people who do nothing. A conversion is at least one purchase on or after assignment, through Jan 31. Counting purchases instead of members or using only active members biases the denominator. This query estimates rates, not statistical significance.
- Example: `WITH results AS(SELECT a.member_id,a.variant,CASE WHEN EXISTS( SELECT 1 FROM social_events e WHERE e.member_id=a.member_id AND e.event_type='purchase' AND e.event_at>=a.assigned_at AND e.event_at<'2025-02-01') THEN 1 ELSE 0 END AS converted FROM experiment_assignments a) SELECT variant,COUNT(*) AS assigned,SUM(converted) AS converted, ROUND(100.0*SUM(converted)/COUNT(*),2) AS conversion_pct FROM results GROUP BY variant;`
- Challenges: Return variant, assigned, converted and conversion_pct (0–100, 2 decimals). A member converts with any purchase on/after assigned_at and before Feb 1 2025. Include all assigned members. || Return member_id, variant and converted (1 or 0) for every assignment using the same post-assignment purchase definition and cutoff.
- Concept check: What belongs in a conversion-rate denominator for an assigned-user experiment? Correct answer: All assigned users in the defined population Explanation: Include assigned users who do nothing. Restricting the denominator to active users can bias the comparison.
- Declared prerequisites: 18 (Ask whether a row exists, position 30); 32 (Ratios, ROUND & NULLIF, position 18)
- Practice: lc-52-0, lc-52-1. Tracks: Real-World Data Analytics (lc-52-0)
- Project: Social Product Analytics (project 1, milestone lesson 52)
- Opening walkthrough: Inspect the source. Generic SELECT * inspection.

### 59. Lesson 58 — DDL: create, alter & inspect a table

- Module: 7 Database engineering
- Course position: 59
- Concept: DDL changes structure: CREATE, ALTER, DROP. DML changes rows. Use the disposable lab to try both safely. Keep all statements in one script, ending with SELECT; the next execution starts fresh.
- Example: `CREATE TABLE practice_people(id INTEGER PRIMARY KEY,name TEXT); ALTER TABLE practice_people ADD COLUMN city TEXT; SELECT name,type FROM pragma_table_info('practice_people');`
- Challenges: Create practice_people with id INTEGER PRIMARY KEY and name TEXT; add city TEXT with ALTER TABLE. Return name and type from pragma_table_info('practice_people'). || Create practice_totals with account_id INTEGER and total REAL. Return name and type from pragma_table_info('practice_totals').
- Concept check: Which command changes structure rather than row contents? Correct answer: ALTER TABLE Explanation: ALTER is DDL; UPDATE and DELETE modify row contents.
- Declared prerequisites: 54 (Databases, schemas, tables & keys, position 5)
- Practice: lc-58-0, lc-58-1. Tracks: SQL for Data Engineers (lc-58-0)
- Project: none
- Opening walkthrough: Inspect the starting state. Generic SELECT * inspection.

### 60. Lesson 59 — DML: INSERT, UPDATE & DELETE

- Module: 7 Database engineering
- Course position: 60
- Concept: INSERT adds rows; UPDATE changes matching rows; DELETE removes matching rows. Use WHERE to constrain modifications. These exercises touch only disposable copies in memory and are reset on every run.
- Example: `INSERT INTO lab_items VALUES(4,'Pen',8); UPDATE lab_items SET price=price+5 WHERE id=1; DELETE FROM lab_items WHERE id=2; SELECT id,name,price FROM lab_items;`
- Challenges: Insert lab item (4, Pen, 8); add 5 to price for id=1; delete id=2. Return id, name, price for remaining items. || Double every lab item price below 50, then delete items with price >100. Return id, name, price.
- Concept check: Why include a WHERE condition in a targeted UPDATE? Correct answer: It limits which existing rows are changed Explanation: UPDATE modifies matching rows. Without WHERE, every row is eligible; inspect the predicate before running a write.
- Declared prerequisites: 58 (DDL: create, alter & inspect a table, position 59)
- Practice: lc-59-0, lc-59-1. Tracks: SQL for Data Engineers (lc-59-0)
- Project: none
- Opening walkthrough: Inspect the starting state. Generic SELECT * inspection.

### 61. Lesson 60 — Constraints protect the data contract

- Module: 7 Database engineering
- Course position: 61
- Concept: PRIMARY KEY identifies rows; NOT NULL requires a value; UNIQUE prevents duplicate values; CHECK enforces a condition. SQLite CHECK passes NULL unless you also use NOT NULL. Foreign-key enforcement needs PRAGMA foreign_keys=ON; the lab enables it.
- Example: `CREATE TABLE inventory(sku TEXT PRIMARY KEY NOT NULL, quantity INTEGER NOT NULL CHECK(quantity>=0)); INSERT INTO inventory VALUES('A',2); SELECT sku,quantity FROM inventory;`
- Challenges: Create inventory with sku TEXT PRIMARY KEY NOT NULL and quantity INTEGER NOT NULL CHECK(quantity>=0); insert (A,2). Return sku and quantity. || Create contacts with id INTEGER PRIMARY KEY and email TEXT NOT NULL UNIQUE; insert (1,a@example.com) and (2,b@example.com). Return id,email.
- Concept check: Does CHECK(quantity>=0) alone forbid NULL in SQLite? Correct answer: No; also use NOT NULL when missing quantity is invalid Explanation: CHECK passes NULL. NOT NULL is a separate constraint.
- Declared prerequisites: 58 (DDL: create, alter & inspect a table, position 59)
- Practice: lc-60-0, lc-60-1. Tracks: SQL for Data Engineers (lc-60-0)
- Project: none
- Opening walkthrough: Inspect the starting state. Generic SELECT * inspection.

### 62. Lesson 61 — Transactions & savepoint recovery

- Module: 7 Database engineering
- Course position: 62
- Concept: A transaction groups changes. COMMIT keeps them in the current database; ROLLBACK undoes them. SAVEPOINT lets you undo a portion. In this app even committed changes vanish after the run because the entire database is disposable.
- Example: `BEGIN; UPDATE lab_items SET price=price+10; ROLLBACK; SELECT id,price FROM lab_items;`
- Challenges: Begin a transaction, add 10 to every lab item price, then roll back. Return id and price; all values should be original. || Begin; add 5 to price for id=1; create SAVEPOINT partial; delete id=2; roll back to partial; commit. Return id and price.
- Concept check: After ROLLBACK TO a savepoint, what happens to earlier transaction changes? Correct answer: They remain pending in the transaction Explanation: A savepoint rollback undoes only later changes. COMMIT or full ROLLBACK still controls the transaction.
- Declared prerequisites: 59 (DML: INSERT, UPDATE & DELETE, position 60)
- Practice: lc-61-0, lc-61-1. Tracks: SQL for Data Engineers (lc-61-1)
- Project: none
- Opening walkthrough: Inspect the starting state. Generic SELECT * inspection.

### 63. Lesson 62 — Views: reusable query definitions

- Module: 7 Database engineering
- Course position: 63
- Concept: A normal view is a named query definition. It is reusable without storing a snapshot of the result. A view can simplify business logic, but it is not automatically faster or slower than the equivalent query. SQLite views are read-only unless INSTEAD OF triggers support writes.
- Example: `CREATE VIEW paid_orders AS SELECT id,customer_id,quantity FROM orders WHERE status='paid'; SELECT * FROM paid_orders;`
- Challenges: Create view paid_orders exposing id, customer_id and quantity for paid orders. Return those columns by selecting the view. || Create view product_totals with category and total_price (sum of price). Return category and total_price from the view.
- Concept check: What does a normal view store? Correct answer: A named query that runs when you select from it Explanation: A view stores a query definition. Selecting from it runs that query against the current tables. It does not save a copy of the rows.
- Declared prerequisites: 20 (Readable queries with CTEs, position 31)
- Practice: lc-62-0, lc-62-1
- Project: none
- Opening walkthrough: Look at the rows a view will read. Specific to this lesson.

### 64. Lesson 63 — CTEs, CTAS & temporary tables

- Module: 7 Database engineering
- Course position: 64
- Concept: A CTE names an expression for one statement. A view persists a definition. CREATE TEMP TABLE ... AS SELECT materializes an intermediate result for the connection. SQL Server uses SELECT ... INTO #temp; that syntax is not SQLite. CTAS does not carry over source constraints.
- Example: `CREATE TEMP TABLE customer_units AS SELECT customer_id,SUM(quantity) AS units FROM orders GROUP BY customer_id; SELECT customer_id,units FROM customer_units WHERE units>3;`
- Challenges: Materialize a TEMP table customer_units with customer_id and total quantity as units. Return customer_id and units for units >3. || Materialize a TEMP table category_prices with category and average price as avg_price. Return category and avg_price for avg_price >30.
- Concept check: Which object materializes its result for the current connection? Correct answer: A temporary table created AS SELECT Explanation: A temp table stores intermediate rows. A view stores a query definition; SQL Server CTEs are not materialized results.
- Declared prerequisites: 20 (Readable queries with CTEs, position 31)
- Practice: lc-63-0, lc-63-1
- Project: none
- Opening walkthrough: Inspect the starting state. Generic SELECT * inspection.

### 65. Lesson 64 — Triggers & visible audit effects

- Module: 7 Database engineering
- Course position: 65
- Concept: A trigger runs automatically after a matching event. SQLite row triggers use OLD and NEW values. They can record an audit trail but also create hidden side effects. SQL Server triggers are statement-level and use inserted/deleted tables, so their code is different.
- Example: `CREATE TRIGGER price_audit AFTER UPDATE OF price ON lab_items WHEN OLD.price<>NEW.price BEGIN INSERT INTO lab_audit VALUES(NEW.id,OLD.price,NEW.price); END; UPDATE lab_items SET price=price+5 WHERE id=1; SELECT item_id,old_price,new_price FROM lab_audit;`
- Challenges: Create a price_audit trigger AFTER UPDATE OF price on lab_items, logging changed prices in lab_audit; add 5 to id=1 price. Return item_id,old_price,new_price from lab_audit. || Create the same trigger, then double prices for all items with price<50. Return item_id,old_price,new_price from lab_audit.
- Concept check: When does an AFTER INSERT trigger run? Correct answer: After each matching insertion into its table Explanation: The trigger runs in response to the declared table event. An audit trigger can insert a corresponding audit record automatically.
- Declared prerequisites: 59 (DML: INSERT, UPDATE & DELETE, position 60)
- Practice: lc-64-0, lc-64-1. Tracks: SQL for Data Engineers (lc-64-0)
- Project: none
- Opening walkthrough: Inspect the starting state. Generic SELECT * inspection.

### 66. Lesson 65 — Stored procedures: parameters & contracts

- Module: 7 Database engineering
- Course position: 66
- Concept: A SQL Server stored procedure can expose parameters, transactions, and error handling. SQLite has no CREATE PROCEDURE. Here you practice the retrieval contract in SQLite; the separate T-SQL reference shows its SQL Server wrapper. Choose procedures or external orchestration based on the system, not a blanket preference.
- Example: `SELECT id,customer_id,quantity FROM orders WHERE customer_id=1;`
- Challenges: For customer_id=1, return id, customer_id and quantity from orders. This practices a procedure’s retrieval contract; no procedure is created in SQLite. || For customer_id=2, return id, customer_id and quantity for paid orders only.
- Concept check: Can SQLite execute CREATE PROCEDURE from the T-SQL reference? Correct answer: No; this lesson’s procedure wrapper is SQL Server reference only Explanation: The SQLite engine lacks stored procedures. Practice the retrieval contract here and the wrapper in SQL Server.
- Declared prerequisites: 20 (Readable queries with CTEs, position 31)
- Practice: lc-65-0, lc-65-1
- Project: none
- Opening walkthrough: Inspect the source. Generic SELECT * inspection.

### 67. Lesson 66 — Indexes: observe a real access path

- Module: 8 Performance & query plans
- Course position: 67
- Concept: An index offers an access structure at the cost of storage and write work. Use EXPLAIN QUERY PLAN to see SQLite choose SCAN, SEARCH, or a covering index. Plans describe physical access; they are not measured speed. This tiny dataset cannot establish a production performance improvement.
- Example: `CREATE INDEX idx_orders_customer ON orders(customer_id); EXPLAIN QUERY PLAN SELECT id,quantity FROM orders WHERE customer_id=1;`
- Challenges: Create idx_orders_customer on orders(customer_id), then return id and quantity for customer_id=1. Run Query plan after the script to inspect the final SELECT. || Create idx_products_category on products(category), then return name and price for Tech products.
- Concept check: An index changes SCAN to SEARCH on a tiny example. What can you conclude? Correct answer: The optimizer chose a different access path; measure the real workload next Explanation: A plan provides strategy evidence. Timing, reads, selectivity, and write overhead require workload measurement.
- Declared prerequisites: 28 (Query plans & indexes, position 48)
- Practice: lc-66-0, lc-66-1
- Project: none
- Opening walkthrough: Inspect the starting state. Generic SELECT * inspection.

### 68. Lesson 67 — SARGable ranges, not speed commandments

- Module: 8 Performance & query plans
- Course position: 68
- Concept: A direct range on an indexed column can permit an efficient lookup. Wrapping that column in a function can prevent a normal index lookup; expression indexes are a separate option. Compare real plans and preserve the result. OR, correlated subqueries, and joins are not universally slow.
- Example: `CREATE INDEX idx_watch_time ON watch_events(watched_at); SELECT id,watched_at FROM watch_events WHERE watched_at>='2025-01-01' AND watched_at<'2025-02-01';`
- Challenges: Create idx_watch_time on watched_at; return id and watched_at for Jan 2025 using a half-open timestamp range. || Create idx_watch_time on watched_at; return id and watched_at for Jan 1–7 2025 inclusive, using a half-open range.
- Concept check: Which filter can search an index on watched_at? Correct answer: A half-open range written on watched_at itself Explanation: A range on the bare column can SEARCH an index. Wrapping the column in a function often forces a scan unless you add an expression index.
- Declared prerequisites: 39 (Date boundaries & monthly buckets, position 34); 66 (Indexes: observe a real access path, position 67)
- Practice: lc-67-0, lc-67-1
- Project: none
- Opening walkthrough: Filter the timestamp column directly. Specific to this lesson.

### 69. Lesson 68 — Partitioning & workload trade-offs

- Module: 8 Performance & query plans
- Course position: 69
- Concept: Partitioning splits a large table by a defined key. It can aid pruning and lifecycle management, but is not a universal query accelerator. SQLite has no SQL Server partition function/scheme. Practice time-aligned filtering here; use the reference notes to understand native warehouse partitioning.
- Example: `SELECT sale_key,order_date,sales FROM fact_sales WHERE order_date>='2025-02-01' AND order_date<'2025-03-01';`
- Challenges: Return sale_key, order_date and sales for Feb 2025 from fact_sales. Use a half-open range. || Return month (YYYY-MM) and sales (sum) by month from fact_sales.
- Concept check: Does this SQLite example prove physical partition elimination? Correct answer: No; it has no SQL Server native partitions Explanation: A time predicate is transferable; physical partition schemes and pruning are engine-specific.
- Declared prerequisites: 39 (Date boundaries & monthly buckets, position 34)
- Practice: lc-68-0, lc-68-1
- Project: none
- Opening walkthrough: Inspect the source. Generic SELECT * inspection.

### 70. Lesson 75 — Review AI-generated SQL with evidence

- Module: 8 Performance & query plans
- Course position: 70
- Concept: Use assistance to explain or propose alternatives, then verify against the schema, metric definition, edge cases, and real execution plan. A confident answer can still double-count rows or omit zero-activity users. This lesson is a deterministic review exercise; no live AI service is connected.
- Example: `-- Review claim: COUNT(*) after LEFT JOIN counts each account’s requests. -- Counterexample: accounts with no requests get one preserved row. SELECT a.id,COUNT(r.id) AS request_count FROM ai_accounts a LEFT JOIN ai_requests r ON r.account_id=a.id GROUP BY a.id;`
- Challenges: Fix the proposed COUNT(*) LEFT JOIN query. Return id and request_count for every account, including zero-request accounts. || Fix an AI query that divides integers or filters out inactive accounts. Return id and success_pct for every account, NULL with no requests, 2 decimals.
- Concept check: A generated query’s plan says SEARCH. What still needs checking? Correct answer: The metric definition, the edge cases, and the actual result Explanation: A SEARCH plan is evidence about access, not proof the metric is right. Check the grain, the filters, and the rows that come back.
- Declared prerequisites: 32 (Ratios, ROUND & NULLIF, position 18); 49 (Multi-grain joins without fan-out, position 55)
- Practice: lc-75-0, lc-75-1
- Project: none
- Opening walkthrough: Read the accounts before trusting a query. Specific to this lesson.

### 71. Lesson 69 — Bronze: inspect raw data before cleaning

- Module: 9 Warehouse & reporting projects
- Course position: 71
- Concept: Bronze preserves source records for traceability. Profile missing keys, duplicates, dates, and type mismatches before writing cleaning rules. Do not silently erase rows without documenting why. These source rows are fictional, inspired by common CRM/catalog/sales issues.
- Example: `SELECT TRIM(raw_id) AS customer_id,COUNT(*) AS versions FROM bronze_customers WHERE raw_id IS NOT NULL GROUP BY TRIM(raw_id) HAVING COUNT(*)>1;`
- Challenges: Return customer_id (trimmed raw_id) and versions for non-NULL duplicate customer keys in bronze_customers. Keep only keys with more than one version. || Return row_id and order_date for bronze sales whose date is invalid (date(order_date) IS NULL).
- Concept check: Why keep invalid and duplicate records in Bronze while profiling them? Correct answer: To preserve source evidence and explain later cleaning decisions Explanation: Bronze preserves traceable source records. Profiling identifies quality issues before explicit cleaning or quarantine rules are applied.
- Declared prerequisites: 44 (Deduplicate event retries, position 50); 39 (Date boundaries & monthly buckets, position 34)
- Practice: lc-69-0, lc-69-1
- Project: Warehouse and Reporting (project 3, milestone lesson 69)
- Opening walkthrough: Preserve the raw input. Specific to this lesson.

### 72. Lesson 70 — Silver: clean, map & deduplicate

- Module: 9 Warehouse & reporting projects
- Course position: 72
- Concept: Silver applies explicit quality rules. Normalize keys and text, keep the latest customer version, map country codes, and exclude missing keys. With equal version timestamps production logic needs an additional reliable tie-breaker; this sample has none.
- Example: `CREATE TEMP TABLE silver_customers AS WITH ranked AS(SELECT *,ROW_NUMBER() OVER(PARTITION BY TRIM(raw_id) ORDER BY updated_at DESC) AS rn FROM bronze_customers WHERE raw_id IS NOT NULL AND TRIM(raw_id)<>'') SELECT TRIM(raw_id) AS customer_id,TRIM(name) AS name,CASE UPPER(TRIM(country)) WHEN 'US' THEN 'United States' WHEN 'USA' THEN 'United States' WHEN 'UK' THEN 'United Kingdom' WHEN 'GB' THEN 'United Kingdom' WHEN 'IND' THEN 'India' WHEN 'CA' THEN 'Canada' ELSE UPPER(TRIM(country)) END AS country FROM ranked WHERE rn=1; SELECT customer_id,name,country FROM silver_customers;`
- Challenges: Create TEMP silver_customers: trim keys/names; discard NULL/empty keys; keep latest updated_at per trimmed key. Map US/USA→United States, GB/UK→United Kingdom, IND→India, CA→Canada. Return customer_id,name,country. || Create the same TEMP silver_customers, then return country and customer_count per mapped country.
- Concept check: Should a warehouse assign customer surrogate keys with fresh ROW_NUMBER on every load? Correct answer: No; persist stable keys or use an existing dimension lookup Explanation: Re-numbering can break historical fact relationships. The project uses established dimension lookup keys.
- Declared prerequisites: 69 (Bronze: inspect raw data before cleaning, position 71); 44 (Deduplicate event retries, position 50)
- Practice: lc-70-0, lc-70-1. Tracks: SQL for Data Engineers (lc-70-0)
- Project: Warehouse and Reporting (project 3, milestone lesson 70)
- Opening walkthrough: Inspect the starting state. Generic SELECT * inspection.

### 73. Lesson 71 — Gold: dimensions, facts & quality gates

- Module: 9 Warehouse & reporting projects
- Course position: 73
- Concept: Gold presents business entities and measures. Dimensional surrogate keys come from the existing dimension lookup, not a new ROW_NUMBER on every load. One fact row is one sales line. For this exercise reject unknown keys, invalid dates, and nonpositive/nonnumeric quantities; recompute sales from quantity × catalog price.
- Example: `CREATE TEMP TABLE built_fact AS SELECT b.row_id AS sale_key,c.customer_key,p.product_key,CAST(b.quantity AS INTEGER) AS quantity,CAST(b.quantity AS INTEGER)*p.price AS sales,b.order_date FROM bronze_sales b JOIN dim_customer c ON c.customer_id=TRIM(b.customer_id) JOIN dim_product p ON p.product_id=TRIM(b.product_id) WHERE TRIM(b.quantity)<>'' AND TRIM(b.quantity) NOT GLOB '*[^0-9]*' AND CAST(b.quantity AS INTEGER)>0 AND b.order_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND date(b.order_date,'+0 days')=b.order_date; SELECT * FROM built_fact;`
- Challenges: Build TEMP built_fact from bronze_sales and dimension lookups. Validate numeric positive quantity, valid date and matching trimmed natural keys. Recompute sales = quantity × dim_product.price. Return sale_key,customer_key,product_key,quantity,sales,order_date. || Build the same TEMP built_fact; return rejected_rows as source row count minus built fact row count.
- Concept check: What is the grain of Northstar’s fact_sales? Correct answer: One sales line Explanation: Each sale_key identifies one line. Aggregate only after deciding the reporting grain.
- Declared prerequisites: 70 (Silver: clean, map & deduplicate, position 72); 56 (CAST, text types & NULL arithmetic, position 20)
- Practice: lc-71-0, lc-71-1
- Project: Warehouse and Reporting (project 3, milestone lesson 71)
- Opening walkthrough: Inspect the starting state. Generic SELECT * inspection.

### 74. Lesson 72 — EDA: explore before telling the story

- Module: 9 Warehouse & reporting projects
- Course position: 74
- Concept: Start with schema, dimension categories, date coverage, measures, and grain. COUNT(DISTINCT sale_key) counts sales lines in this model, not a missing order-header identifier. Define what a metric counts before putting it into a report.
- Example: `SELECT MIN(order_date) AS first_sale,MAX(order_date) AS last_sale, COUNT(*) AS sales_lines,SUM(sales) AS total_sales FROM fact_sales;`
- Challenges: Return first_sale, last_sale, sales_lines and total_sales as one summary row from fact_sales. || Return metric and value using UNION ALL for Total sales (sum of sales), Units (sum of quantity), and Active customers (distinct customer_key) from fact_sales.
- Concept check: Before summarizing fact_sales, what should you decide? Correct answer: What one row represents and what the metric counts Explanation: Exploration starts with grain. A count of sales lines is not a count of customers or of orders.
- Declared prerequisites: 71 (Gold: dimensions, facts & quality gates, position 73)
- Practice: lc-72-0, lc-72-1
- Project: Warehouse and Reporting (project 3, milestone lesson 72)
- Opening walkthrough: Look at one sales line. Specific to this lesson.

### 75. Lesson 73 — Customer & product reporting contracts

- Module: 9 Warehouse & reporting projects
- Course position: 75
- Concept: A reusable report combines identity, totals, dates, and meaningful segmentation at one entity grain. Preserve entities with no sales when requested. These exercises define recency against 2025-04-01 rather than today, so the answer is reproducible.
- Example: `SELECT c.customer_id,c.name,COUNT(f.sale_key) AS sales_lines, COALESCE(SUM(f.sales),0) AS total_sales FROM dim_customer c LEFT JOIN fact_sales f ON f.customer_key=c.customer_key GROUP BY c.customer_key,c.customer_id,c.name;`
- Challenges: Return customer_id,name,sales_lines,total_sales,recency_days for every dim_customer. Missing sales total=0; recency=NULL with no sales. Recency = days from last order_date to 2025-04-01, integer. || Return product_id,name,total_sales,total_units,performance_segment for every dim_product. Missing totals=0. High if total_sales>=200, otherwise Standard.
- Concept check: A report must list every customer, including those with no sales. Where do you start? Correct answer: From the customer list, keeping customers with no matching sales Explanation: An inner join to sales drops customers who never bought. Start from the customer list when the report has to keep them.
- Declared prerequisites: 72 (EDA: explore before telling the story, position 74); 15 (Keep unmatched rows, position 22)
- Practice: lc-73-0, lc-73-1. Tracks: Real-World Data Analytics (lc-73-0)
- Project: Warehouse and Reporting (project 3, milestone lesson 73)
- Opening walkthrough: Start from the customer. Specific to this lesson.

### 76. Lesson 74 — Monthly change & cumulative reports

- Module: 9 Warehouse & reporting projects
- Course position: 76
- Concept: Aggregate to monthly grain before using LAG or a running SUM. A percentage change needs a nonzero prior value. This report uses observed months; a complete calendar would be required if missing months should appear as zero.
- Example: `WITH monthly AS(SELECT strftime('%Y-%m',order_date) AS month, SUM(sales) AS sales FROM fact_sales GROUP BY month) SELECT month,sales,SUM(sales) OVER(ORDER BY month ROWS UNBOUNDED PRECEDING) AS running_sales FROM monthly;`
- Challenges: Return month (YYYY-MM),sales,running_sales for observed months; cumulative sales ordered by month. Sort output by month. || Return month,sales,previous_sales,change_pct for observed months. Compare to previous observed month; percentage rounded to 2 decimals, NULL with no/nonzero denominator. Sort by month.
- Concept check: Before LAG or a running SUM of monthly sales, what grain do you need? Correct answer: One row per month Explanation: Aggregate to one row per month first. The first month has no prior month, so its change is missing rather than zero.
- Declared prerequisites: 72 (EDA: explore before telling the story, position 74); 24 (Compare rows with LAG, position 38); 23 (Running totals, position 37)
- Practice: lc-74-0, lc-74-1
- Project: Warehouse and Reporting (project 3, milestone lesson 74)
- Opening walkthrough: Establish monthly grain. Specific to this lesson.

### 77. Lesson 76 — Reconcile extraction & Bronze ingestion

- Module: 9 Warehouse & reporting projects
- Course position: 77
- Concept: Bronze preserves raw values. Compare a supplied extraction manifest to landed counts before cleaning; a matching count alone cannot prove correct column alignment. A discrepancy is evidence to investigate, not permission to delete data.
- Example: `WITH landed AS(SELECT 'CRM' AS source_name,COUNT(*) AS landed_rows FROM crm_people UNION ALL SELECT 'ERP',COUNT(*) FROM erp_people) SELECT m.source_name,m.expected_rows,l.landed_rows,l.landed_rows-m.expected_rows AS difference FROM load_manifest m JOIN landed l USING(source_name);`
- Challenges: Return source_name,expected_rows,landed_rows,difference (landed minus expected) for CRM and ERP using load_manifest and the raw tables. || Return source_row and customer_id for CRM records with a missing or whitespace-only customer key. Do not modify Bronze.
- Concept check: Can a matching Bronze row count prove correct CSV column mapping? Correct answer: No; also inspect columns, values, and source contract Explanation: A count can expose missing rows while still missing shifted or malformed columns.
- Declared prerequisites: 69 (Bronze: inspect raw data before cleaning, position 71)
- Practice: lc-76-0, lc-76-1
- Project: CRM + ERP Integration (project 4, milestone lesson 76)
- Opening walkthrough: Understand the source contract. Specific to this lesson.

### 78. Lesson 77 — Integrate CRM + ERP with source authority

- Module: 9 Warehouse & reporting projects
- Course position: 78
- Concept: Normalize source identifiers under a declared contract: strip one leading NAS in ERP people and hyphens in ERP locations. Keep the latest CRM customer; source_row breaks equal timestamps. CRM gender wins when meaningful; ERP supplies a fallback. Preserve every valid CRM customer. Validate birth dates against fixed 2025-04-01.
- Example: `WITH crm AS(WITH ranked AS (SELECT *,ROW_NUMBER() OVER(PARTITION BY TRIM(customer_id) ORDER BY updated_at DESC,source_row DESC) AS rn FROM crm_people WHERE customer_id IS NOT NULL AND TRIM(customer_id)<>'') SELECT TRIM(customer_id) AS customer_id,TRIM(name) AS name,CASE UPPER(TRIM(gender)) WHEN 'F' THEN 'Female' WHEN 'M' THEN 'Male' ELSE NULL END AS crm_gender FROM ranked WHERE rn=1),erp AS(SELECT CASE WHEN SUBSTR(TRIM(erp_id),1,3)='NAS' THEN SUBSTR(TRIM(erp_id),4) ELSE TRIM(erp_id) END AS customer_id,CASE UPPER(TRIM(gender)) WHEN 'F' THEN 'Female' WHEN 'FEMALE' THEN 'Female' WHEN 'M' THEN 'Male' WHEN 'MALE' THEN 'Male' ELSE NULL END AS erp_gender,birth_date FROM erp_people),loc AS(SELECT REPLACE(TRIM(erp_id),'-','') AS customer_id,CASE UPPER(TRIM(country_code)) WHEN 'US' THEN 'United States' WHEN 'USA' THEN 'United States' WHEN 'GB' THEN 'United Kingdom' WHEN 'UK' THEN 'United Kingdom' WHEN 'IND' THEN 'India' ELSE 'Unknown' END AS country FROM erp_locations) SELECT c.customer_id,c.name,COALESCE(c.crm_gender,e.erp_gender,'Unknown') AS gender,COALESCE(l.country,'Unknown') AS country,CASE WHEN e.birth_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND date(e.birth_date,'+0 days')=e.birth_date AND e.birth_date<='2025-04-01' THEN e.birth_date ELSE NULL END AS birth_date FROM crm c LEFT JOIN erp e ON e.customer_id=c.customer_id LEFT JOIN loc l ON l.customer_id=c.customer_id`
- Challenges: Return customer_id,name,gender,country,birth_date using the integration contract in Understand. Use latest normalized CRM keys, CRM-first gender, ERP fallback, mapped country, and valid nonfuture birth date. || Use the same integration contract; return gender and customer_count grouped by the resolved gender.
- Concept check: CRM says Female and ERP says Male. Which wins here? Correct answer: Meaningful CRM under the declared authority rule Explanation: Authority is an explicit requirement. Meaningful CRM wins here; ERP is the fallback.
- Declared prerequisites: 76 (Reconcile extraction & Bronze ingestion, position 77); 70 (Silver: clean, map & deduplicate, position 72); 55 (Logical query processing & row grain, position 19)
- Practice: lc-77-0, lc-77-1
- Project: CRM + ERP Integration (project 4, milestone lesson 77)
- Opening walkthrough: Understand the source contract. Specific to this lesson.

### 79. Lesson 78 — Product validity with LEAD & half-open intervals

- Module: 9 Warehouse & reporting projects
- Course position: 79
- Concept: LEAD finds the next version start. Use [valid_from,valid_to) so a change date belongs to exactly one version; NULL end means current. This lab has unique starts per product. Latest-only output discards history; an as-of join needs all versions.
- Example: `SELECT version_id,product_id,valid_from,LEAD(valid_from) OVER(PARTITION BY product_id ORDER BY valid_from,version_id) AS valid_to FROM product_versions;`
- Challenges: Return version_id,product_id,valid_from,valid_to. valid_to is the next start for the same product, NULL for the latest version. || As of 2025-02-01, return product_id,cost for the version effective on that date using inclusive start and exclusive end.
- Concept check: A new version starts on February 1. Which version owns that date? Correct answer: The new version under inclusive start/exclusive end Explanation: Half-open effective ranges assign the boundary to exactly one version.
- Declared prerequisites: 24 (Compare rows with LAG, position 38)
- Practice: lc-78-0, lc-78-1. Tracks: SQL for Data Engineers (lc-78-0)
- Project: CRM + ERP Integration (project 4, milestone lesson 78)
- Opening walkthrough: Understand the source contract. Specific to this lesson.

### 80. Lesson 79 — Validate calendar dates before converting

- Module: 9 Warehouse & reporting projects
- Course position: 80
- Concept: Eight digits do not prove a valid date. Shape YYYYMMDD to YYYY-MM-DD, require exactly eight digits, and compare the candidate to SQLite date(candidate,+0 days) so normalization exposes impossible dates. Invalid or missing values remain NULL; keep the source row. SQL Server uses TRY_CONVERT with an explicit style.
- Example: `WITH shaped AS(SELECT row_id,raw_date,SUBSTR(raw_date,1,4)||'-'||SUBSTR(raw_date,5,2)||'-'||SUBSTR(raw_date,7,2) AS candidate FROM raw_dates) SELECT row_id,raw_date,CASE WHEN raw_date GLOB '[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]' AND date(candidate,'+0 days')=candidate THEN candidate ELSE NULL END AS clean_date FROM shaped`
- Challenges: Return row_id,raw_date,clean_date for every raw_dates row. Accept exactly eight digits and a valid calendar day; invalid values become NULL. || Return row_id and raw_date only for invalid or missing dates under the same rule.
- Concept check: Is 20250230 a valid date because it has eight digits? Correct answer: No; validate the actual calendar day Explanation: February 30 is impossible. A format check alone is insufficient.
- Declared prerequisites: 56 (CAST, text types & NULL arithmetic, position 20)
- Practice: lc-79-0, lc-79-1
- Project: CRM + ERP Integration (project 4, milestone lesson 79)
- Opening walkthrough: Understand the source contract. Specific to this lesson.

### 81. Lesson 80 — Quarantine bad rows & reconcile the batch

- Module: 9 Warehouse & reporting projects
- Course position: 81
- Concept: Filtering invalid rows is not enough: preserve a reject table with source identity, raw value, and reason. Accepted + rejected must equal source count with no overlap. This lab classifies only dates: missing, format, or calendar errors. Nothing edits the raw input.
- Example: `CREATE TEMP TABLE checked_dates AS WITH shaped AS(SELECT row_id,raw_date,SUBSTR(raw_date,1,4)||'-'||SUBSTR(raw_date,5,2)||'-'||SUBSTR(raw_date,7,2) AS candidate FROM raw_dates) SELECT row_id,raw_date,CASE WHEN raw_date GLOB '[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]' AND date(candidate,'+0 days')=candidate THEN candidate ELSE NULL END AS clean_date FROM shaped; CREATE TEMP TABLE date_rejects AS SELECT row_id,raw_date,CASE WHEN raw_date IS NULL THEN 'missing' WHEN raw_date NOT GLOB '[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]' THEN 'format' ELSE 'calendar' END AS reason FROM checked_dates WHERE clean_date IS NULL; SELECT row_id,raw_date,reason FROM date_rejects;`
- Challenges: Create TEMP checked_dates using the validation rule and TEMP date_rejects with invalid rows. Return row_id,raw_date,reason: missing for NULL, format for not exactly eight digits, otherwise calendar. || Create TEMP checked_dates; return source_rows,accepted_rows,rejected_rows,reconciled (1 if accepted+rejected equals source count).
- Concept check: What must accepted + rejected equal for a single-reason batch? Correct answer: The raw source row count, with no overlap Explanation: Reconciliation ensures every source row has an explicit disposition.
- Declared prerequisites: 79 (Validate calendar dates before converting, position 80)
- Practice: lc-80-0, lc-80-1
- Project: CRM + ERP Integration (project 4, milestone lesson 80)
- Opening walkthrough: Understand the source contract. Specific to this lesson.

### 82. Lesson 81 — Automated star-schema quality tests

- Module: 9 Warehouse & reporting projects
- Course position: 82
- Concept: A quality test has a named expectation and a failure count. Zero means that expectation passed, not that all data is perfect. Check unique line IDs, valid measures, and both dimension relationships. Gate promotion on declared blocking rules; do not silently repair financial data.
- Example: `SELECT 'duplicate_line_ids' AS test,COUNT(*) AS failures FROM (SELECT line_id FROM dq_sales GROUP BY line_id HAVING COUNT(*)>1) UNION ALL SELECT 'orphan_customers',COUNT(*) FROM dq_sales s LEFT JOIN dim_customer c ON c.customer_key=s.customer_key WHERE c.customer_key IS NULL UNION ALL SELECT 'orphan_products',COUNT(*) FROM dq_sales s LEFT JOIN dim_product p ON p.product_key=s.product_key WHERE p.product_key IS NULL UNION ALL SELECT 'invalid_quantity',COUNT(*) FROM dq_sales WHERE quantity IS NULL OR quantity<=0`
- Challenges: Return test,failures for duplicate_line_ids (number of duplicated id groups), orphan_customers (rows), orphan_products (rows), and invalid_quantity (NULL or <=0 rows) in dq_sales. || Return blocking_failures as the sum of the four failure counts, and can_publish as 1 only if that sum is zero.
- Concept check: Does zero orphan count prove the whole warehouse is correct? Correct answer: No; uniqueness, validity, business rules and other tests still matter Explanation: Each test covers one declared expectation.
- Declared prerequisites: 71 (Gold: dimensions, facts & quality gates, position 73); 15 (Keep unmatched rows, position 22)
- Practice: lc-81-0, lc-81-1. Tracks: SQL for Data Engineers (lc-81-0)
- Project: CRM + ERP Integration (project 4, milestone lesson 81)
- Opening walkthrough: Understand the source contract. Specific to this lesson.

### 83. Lesson 82 — Durable surrogate keys across loads

- Module: 9 Warehouse & reporting projects
- Course position: 83
- Concept: A warehouse key should remain stable when a new earlier-sorting natural key arrives. The lab current_people table assigns a key once via INTEGER PRIMARY KEY AUTOINCREMENT and retains it on update. ROW_NUMBER is an analytical rank, not a durable assignment mechanism. These keys persist within this script; the app resets afterward.
- Example: `INSERT INTO current_people(customer_id,name,updated_at) VALUES('C000','New earlier key','2025-02-01'); SELECT customer_id,customer_key FROM current_people;`
- Challenges: Insert natural key C000, name New earlier key, updated_at 2025-02-01 into current_people without supplying customer_key. Return customer_id,customer_key for all rows. || Update C001 name to Alice Updated without changing its key. Return customer_id,customer_key,name for all current_people rows.
- Concept check: What happens to an existing durable key when C000 arrives? Correct answer: Existing keys remain unchanged Explanation: Assign warehouse keys once rather than recomputing ROW_NUMBER.
- Declared prerequisites: 58 (DDL: create, alter & inspect a table, position 59); 59 (DML: INSERT, UPDATE & DELETE, position 60); 70 (Silver: clean, map & deduplicate, position 72)
- Practice: lc-82-0, lc-82-1
- Project: CRM + ERP Integration (project 4, milestone lesson 82)
- Opening walkthrough: Understand the source contract. Specific to this lesson.

### 84. Lesson 83 — Latest-state reporting versus SCD Type 2

- Module: 9 Warehouse & reporting projects
- Course position: 84
- Concept: The foundational project keeps latest state. Type 1 overwrites attributes; Type 2 retains effective versions with distinct keys. Decide whether a report means current classification or classification at event time. Here customer_history uses nonoverlapping half-open validity ranges; NULL end means current.
- Example: `SELECT customer_id,country FROM customer_history WHERE valid_to IS NULL;`
- Challenges: Return customer_id,country for the current version of every customer_history customer. || Join fact_sales to dim_customer for natural customer_id and customer_history at sale time. Return sale_key,customer_id,country as of each order_date.
- Concept check: Type 2 history needs which lookup for an event? Correct answer: Natural key and effective-date interval Explanation: Choose the version valid when the event happened.
- Declared prerequisites: 78 (Product validity with LEAD & half-open intervals, position 79); 82 (Durable surrogate keys across loads, position 83)
- Practice: lc-83-0, lc-83-1. Tracks: SQL for Data Engineers (lc-83-0)
- Project: CRM + ERP Integration (project 4, milestone lesson 83)
- Opening walkthrough: Understand the source contract. Specific to this lesson.

### 85. Lesson 84 — Idempotent incremental UPSERT & stale updates

- Module: 9 Warehouse & reporting projects
- Course position: 85
- Concept: An incremental load inserts new keys and updates only newer source versions. Replay the same batch and the final rows must stay the same. A timestamp watermark alone can miss late records or equal timestamps; real pipelines need a defined tie-breaker/replay window, delete handling, and transactional checkpointing.
- Example: `INSERT INTO current_people(customer_id,name,updated_at) SELECT customer_id,name,updated_at FROM incoming_people WHERE 1 ON CONFLICT(customer_id) DO UPDATE SET name=excluded.name,updated_at=excluded.updated_at WHERE excluded.updated_at>current_people.updated_at; INSERT INTO current_people(customer_id,name,updated_at) SELECT customer_id,name,updated_at FROM incoming_people WHERE 1 ON CONFLICT(customer_id) DO UPDATE SET name=excluded.name,updated_at=excluded.updated_at WHERE excluded.updated_at>current_people.updated_at; SELECT customer_id,name,updated_at FROM current_people;`
- Challenges: Apply incoming_people to current_people with INSERT ON CONFLICT(customer_id) DO UPDATE only if the incoming updated_at is newer. Apply that same batch twice. Return customer_id,name,updated_at. || Apply that UPSERT once. Return customer_id,customer_key for all current_people rows, showing that old keys stayed stable.
- Concept check: Does replaying an identical batch need to change the final rows? Correct answer: No; idempotent final state should remain unchanged Explanation: A unique natural key and version-aware update avoid duplicate inserts and stale overwrites.
- Declared prerequisites: 82 (Durable surrogate keys across loads, position 83)
- Practice: lc-84-0, lc-84-1. Tracks: SQL for Data Engineers (lc-84-0)
- Project: CRM + ERP Integration (project 4, milestone lesson 84)
- Opening walkthrough: Understand the source contract. Specific to this lesson.

### 86. Lesson 85 — Stage, validate & atomically promote a refresh

- Module: 9 Warehouse & reporting projects
- Course position: 86
- Concept: Build and validate the candidate before replacing published data. A transaction makes related writes commit together; rollback retains the old snapshot. In this controlled lab the candidate is known to pass. Production needs explicit blocking gates, failure handling, and workload-specific isolation. SQL Server TRUNCATE syntax is not executed here.
- Example: `BEGIN; DELETE FROM published_totals; INSERT INTO published_totals SELECT * FROM refresh_stage; ROLLBACK; SELECT customer_id,total_sales FROM published_totals;`
- Challenges: Simulate an interrupted promotion: BEGIN, DELETE published_totals, INSERT from refresh_stage, ROLLBACK. Return customer_id,total_sales; the old snapshot must remain. || Promote the known-valid refresh_stage in a transaction: DELETE old rows, INSERT staged rows, COMMIT. Return customer_id,total_sales.
- Concept check: Rollback during replacement should leave what published? Correct answer: The earlier committed snapshot Explanation: The transaction undoes the replacement writes when explicitly rolled back.
- Declared prerequisites: 61 (Transactions & savepoint recovery, position 62); 81 (Automated star-schema quality tests, position 82)
- Practice: lc-85-0, lc-85-1. Tracks: SQL for Data Engineers (lc-85-0)
- Project: CRM + ERP Integration (project 4, milestone lesson 85)
- Opening walkthrough: Understand the source contract. Specific to this lesson.

### 87. Lesson 86 — Protect fact grain when joining versions

- Module: 9 Warehouse & reporting projects
- Course position: 87
- Concept: The fact grain is one sales line. Joining a customer to every historical version multiplies rows and totals. Choose the current version for current-state reporting or effective version at event time for historical reporting. Validate row counts as well as measures; DISTINCT does not repair a wrong join.
- Example: `SELECT h.country,SUM(f.sales) AS total_sales FROM fact_sales f JOIN dim_customer c ON c.customer_key=f.customer_key JOIN customer_history h ON h.customer_id=c.customer_id AND h.valid_to IS NULL GROUP BY h.country;`
- Challenges: Return country,total_sales using CURRENT customer_history version, for facts with a customer history match. Group by current country. || Return country,total_sales using the customer_history version effective at each sale date; group by historical country.
- Concept check: A fact joins both versions of the same customer. What is the risk? Correct answer: Fan-out and inflated totals Explanation: A natural-key join alone matches every version; select current or effective version.
- Declared prerequisites: 83 (Latest-state reporting versus SCD Type 2, position 84); 49 (Multi-grain joins without fan-out, position 55)
- Practice: lc-86-0, lc-86-1
- Project: CRM + ERP Integration (project 4, milestone lesson 86)
- Opening walkthrough: Understand the source contract. Specific to this lesson.

### 88. Lesson 87 — Capstone: integrated customers to trusted sales

- Module: 9 Warehouse & reporting projects
- Course position: 88
- Concept: Build two reusable temporary outputs in one script: integrated CRM/ERP customers and validated sales lines with existing dimension keys. Report at customer grain, preserving customers with no valid sales. The catalog states field authority and exercise sales rules. This is a runnable miniature of the architecture, not a deployed enterprise pipeline.
- Example: `CREATE TEMP TABLE integrated_customers AS WITH crm AS(WITH ranked AS (SELECT *,ROW_NUMBER() OVER(PARTITION BY TRIM(customer_id) ORDER BY updated_at DESC,source_row DESC) AS rn FROM crm_people WHERE customer_id IS NOT NULL AND TRIM(customer_id)<>'') SELECT TRIM(customer_id) AS customer_id,TRIM(name) AS name,CASE UPPER(TRIM(gender)) WHEN 'F' THEN 'Female' WHEN 'M' THEN 'Male' ELSE NULL END AS crm_gender FROM ranked WHERE rn=1),erp AS(SELECT CASE WHEN SUBSTR(TRIM(erp_id),1,3)='NAS' THEN SUBSTR(TRIM(erp_id),4) ELSE TRIM(erp_id) END AS customer_id,CASE UPPER(TRIM(gender)) WHEN 'F' THEN 'Female' WHEN 'FEMALE' THEN 'Female' WHEN 'M' THEN 'Male' WHEN 'MALE' THEN 'Male' ELSE NULL END AS erp_gender,birth_date FROM erp_people),loc AS(SELECT REPLACE(TRIM(erp_id),'-','') AS customer_id,CASE UPPER(TRIM(country_code)) WHEN 'US' THEN 'United States' WHEN 'USA' THEN 'United States' WHEN 'GB' THEN 'United Kingdom' WHEN 'UK' THEN 'United Kingdom' WHEN 'IND' THEN 'India' ELSE 'Unknown' END AS country FROM erp_locations) SELECT c.customer_id,c.name,COALESCE(c.crm_gender,e.erp_gender,'Unknown') AS gender,COALESCE(l.country,'Unknown') AS country,CASE WHEN e.birth_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND date(e.birth_date,'+0 days')=e.birth_date AND e.birth_date<='2025-04-01' THEN e.birth_date ELSE NULL END AS birth_date FROM crm c LEFT JOIN erp e ON e.customer_id=c.customer_id LEFT JOIN loc l ON l.customer_id=c.customer_id; CREATE TEMP TABLE built_sales AS SELECT b.row_id AS sale_key,c.customer_key,p.product_key,CAST(b.quantity AS INTEGER) AS quantity,CAST(b.quantity AS INTEGER)*p.price AS sales,b.order_date FROM bronze_sales b JOIN dim_customer c ON c.customer_id=TRIM(b.customer_id) JOIN dim_product p ON p.product_id=TRIM(b.product_id) WHERE TRIM(b.quantity)<>'' AND TRIM(b.quantity) NOT GLOB '*[^0-9]*' AND CAST(b.quantity AS INTEGER)>0 AND b.order_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND date(b.order_date,'+0 days')=b.order_date; SELECT i.customer_id,i.name,i.gender,i.country,COUNT(s.sale_key) AS sales_lines,COALESCE(SUM(s.sales),0) AS total_sales FROM integrated_customers i JOIN dim_customer c ON c.customer_id=i.customer_id LEFT JOIN built_sales s ON s.customer_key=c.customer_key GROUP BY i.customer_id,i.name,i.gender,i.country;`
- Challenges: Create TEMP integrated_customers using the integration contract, and TEMP built_sales using the Gold validation rules from lesson Gold: dimensions, facts & quality gates. Return customer_id,name,gender,country,sales_lines,total_sales for valid CRM customers with a dimension match; preserve customers with no valid sales as 0 totals. || Create the same two TEMP outputs. Return country,total_sales at integrated country grain, preserving countries with no sales as 0.
- Concept check: What does this capstone deliver? Correct answer: A tested miniature integration with original teaching data Explanation: The app executes a bounded SQLite project; server ingestion and orchestration require a separate platform.
- Declared prerequisites: 77 (Integrate CRM + ERP with source authority, position 78); 80 (Quarantine bad rows & reconcile the batch, position 81); 81 (Automated star-schema quality tests, position 82); 85 (Stage, validate & atomically promote a refresh, position 86); 86 (Protect fact grain when joining versions, position 87)
- Practice: lc-87-0, lc-87-1
- Project: CRM + ERP Integration (project 4, milestone lesson 87)
- Opening walkthrough: Understand the source contract. Specific to this lesson.
