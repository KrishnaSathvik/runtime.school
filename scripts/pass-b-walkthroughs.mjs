/**
 * Pass B: rewrite generic lesson walkthroughs (and lesson 35 date setup).
 * Run: node scripts/pass-b-walkthroughs.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packPath = path.join(root, "src/content/content-pack.json");
const pack = JSON.parse(fs.readFileSync(packPath, "utf8"));

const dates = `(SELECT column1 AS day FROM (VALUES ('2025-01-01'), ('2025-01-02'), ('2025-01-03'))) AS days`;
const grid = `SELECT day, v.id AS viewer_id\nFROM ${dates}\nCROSS JOIN viewers v`;

/** @type {Record<number, { walkthrough: {title:string, description:string, query:string}[], concept?: string, example?: string, answers?: [string, string], hints?: [string, string] }>} */
const updates = {
  2: {
    walkthrough: [
      {
        title: "See duplicate cities first",
        description:
          "Many customers share a city. The raw list repeats Chicago and Austin. DISTINCT will keep one row per distinct value.",
        query: "SELECT city FROM customers ORDER BY city;",
      },
      {
        title: "Keep each city once",
        description:
          "DISTINCT removes duplicate output rows across the selected columns. NULL is kept once if it appears.",
        query: "SELECT DISTINCT city FROM customers;",
      },
    ],
  },
  7: {
    walkthrough: [
      {
        title: "Find missing cities",
        description:
          "Some city values are blank in the sense of NULL. Equality to NULL never matches; IS NULL does.",
        query: "SELECT name, city FROM customers WHERE city IS NULL;",
      },
      {
        title: "Replace NULL for display",
        description:
          "COALESCE returns the first non-NULL argument. Missing cities become the label Unknown without changing stored rows.",
        query: "SELECT name, COALESCE(city, 'Unknown') AS city FROM customers;",
      },
    ],
  },
  8: {
    walkthrough: [
      {
        title: "Sort prices before cutting",
        description:
          "ORDER BY decides which rows come first. LIMIT only makes sense after the sort, or you get an arbitrary cut.",
        query: "SELECT name, price FROM products ORDER BY price DESC, name ASC;",
      },
      {
        title: "Keep the top of the sorted list",
        description:
          "DESC puts expensive products first. LIMIT 3 keeps only the first three after sorting.",
        query: "SELECT name, price FROM products ORDER BY price DESC, name ASC LIMIT 3;",
      },
    ],
  },
  9: {
    walkthrough: [
      {
        title: "Look at the rows being counted",
        description:
          "Each customer is one row. An aggregate without GROUP BY collapses the whole table into one summary.",
        query: "SELECT id, name FROM customers;",
      },
      {
        title: "Collapse to a single count",
        description:
          "COUNT(*) counts rows. SUM and AVG work the same way: many input rows become one summary value.",
        query: "SELECT COUNT(*) AS customer_count FROM customers;",
      },
    ],
  },
  11: {
    walkthrough: [
      {
        title: "Form groups first",
        description:
          "GROUP BY customer_id builds one row per customer with an order_count. HAVING will filter these groups next.",
        query:
          "SELECT customer_id, COUNT(*) AS order_count FROM orders GROUP BY customer_id ORDER BY customer_id;",
      },
      {
        title: "Keep only qualifying groups",
        description:
          "HAVING runs after aggregation. It removes groups whose aggregate fails the test, unlike WHERE which filters source rows.",
        query:
          "SELECT customer_id, COUNT(*) AS order_count FROM orders GROUP BY customer_id HAVING COUNT(*) >= 2;",
      },
    ],
  },
  12: {
    walkthrough: [
      {
        title: "Read the prices you will classify",
        description:
          "Each product has a price. CASE will label rows at or above 80 as Premium and the rest as Standard.",
        query: "SELECT name, price FROM products ORDER BY price;",
      },
      {
        title: "Assign a tier with CASE",
        description:
          "WHEN branches are checked in order. The first true branch wins; ELSE covers everything else.",
        query:
          "SELECT name, CASE WHEN price >= 80 THEN 'Premium' ELSE 'Standard' END AS tier FROM products;",
      },
    ],
  },
  13: {
    walkthrough: [
      {
        title: "See paid vs other statuses",
        description:
          "Orders mix paid and unpaid statuses. Conditional aggregation can count only the paid ones in one pass.",
        query: "SELECT id, status, quantity FROM orders ORDER BY id;",
      },
      {
        title: "Count only paid rows inside SUM",
        description:
          "CASE returns 1 for paid rows and 0 otherwise. SUM adds those values into paid_count.",
        query:
          "SELECT SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) AS paid_count FROM orders;",
      },
    ],
  },
  14: {
    walkthrough: [
      {
        title: "Find the matching keys",
        description:
          "orders.customer_id references customers.id. Read both columns so the JOIN condition is concrete before you write it.",
        query:
          "SELECT id AS order_id, customer_id FROM orders ORDER BY id LIMIT 8;",
      },
      {
        title: "Combine matching rows with JOIN",
        description:
          "INNER JOIN keeps only pairs that satisfy the ON condition. Aliases keep the two id columns clear.",
        query: "SELECT o.id, c.name FROM orders o JOIN customers c ON c.id = o.customer_id;",
      },
    ],
  },
  17: {
    walkthrough: [
      {
        title: "Compute the comparison value",
        description:
          "A subquery can produce the average price once. The outer query will compare each product to that single number.",
        query: "SELECT AVG(price) AS avg_price FROM products;",
      },
      {
        title: "Filter rows against the subquery",
        description:
          "The parenthesized SELECT runs as a scalar subquery. Rows with price above that average remain.",
        query:
          "SELECT name, price FROM products WHERE price > (SELECT AVG(price) FROM products);",
      },
    ],
  },
  18: {
    walkthrough: [
      {
        title: "Check for a matching paid order",
        description:
          "EXISTS asks whether at least one related row satisfies the inner filter. It does not multiply the outer customer rows.",
        query:
          "SELECT c.id, c.name, o.id AS order_id, o.status FROM customers c LEFT JOIN orders o ON o.customer_id = c.id AND o.status = 'paid' ORDER BY c.id LIMIT 12;",
      },
      {
        title: "Keep customers with a match",
        description:
          "EXISTS returns true when the correlated subquery finds one or more rows. The outer SELECT lists those customers once.",
        query:
          "SELECT c.name FROM customers c WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id AND o.status = 'paid');",
      },
    ],
  },
  19: {
    walkthrough: [
      {
        title: "Build two compatible city lists",
        description:
          "Chicago and Austin rows each produce a city column. UNION stacks compatible selects and drops duplicates.",
        query:
          "SELECT city FROM customers WHERE city IN ('Chicago', 'Austin') ORDER BY city;",
      },
      {
        title: "Stack sets with UNION",
        description:
          "UNION removes duplicates across the stacked rows. UNION ALL would keep every duplicate.",
        query:
          "SELECT city FROM customers WHERE city = 'Chicago'\nUNION SELECT city FROM customers WHERE city = 'Austin';",
      },
    ],
  },
  20: {
    walkthrough: [
      {
        title: "Name an intermediate total",
        description:
          "WITH defines a temporary result you can read like a table. Here each customer gets a units total before filtering.",
        query:
          "SELECT customer_id, SUM(quantity) AS units FROM orders GROUP BY customer_id ORDER BY customer_id;",
      },
      {
        title: "Filter the named CTE",
        description:
          "The outer query reads totals as if it were a table. CTEs make multi-step logic easier to follow than nested subqueries.",
        query:
          "WITH totals AS (\n  SELECT customer_id, SUM(quantity) AS units\n  FROM orders GROUP BY customer_id\n) SELECT customer_id, units FROM totals WHERE units > 3;",
      },
    ],
  },
  21: {
    walkthrough: [
      {
        title: "Order a customer's orders",
        description:
          "ROW_NUMBER needs a clear order within each partition. Sort one customer's orders by time to see the sequence.",
        query:
          "SELECT id, customer_id, ordered_at FROM orders WHERE customer_id = 1 ORDER BY ordered_at, id;",
      },
      {
        title: "Number rows inside each partition",
        description:
          "PARTITION BY customer_id restarts the counter for each customer. ORDER BY decides which row is 1, 2, 3…",
        query:
          "SELECT id, customer_id, ROW_NUMBER() OVER(\n  PARTITION BY customer_id ORDER BY ordered_at, id\n) AS order_seq FROM orders;",
      },
    ],
  },
  22: {
    walkthrough: [
      {
        title: "Measure the value you will rank",
        description:
          "Ranking needs a sort key. Count orders per customer first; DENSE_RANK will order those counts.",
        query:
          "SELECT customer_id, COUNT(*) AS order_count FROM orders GROUP BY customer_id ORDER BY order_count DESC, customer_id;",
      },
      {
        title: "Assign dense ranks to groups",
        description:
          "DENSE_RANK gives the same rank to ties and does not skip the next rank. RANK would leave gaps after ties.",
        query:
          "SELECT customer_id, COUNT(*) AS order_count,\nDENSE_RANK() OVER(ORDER BY COUNT(*) DESC) AS rank\nFROM orders GROUP BY customer_id;",
      },
    ],
  },
  24: {
    walkthrough: [
      {
        title: "Line up a customer's quantities",
        description:
          "LAG looks at the previous row in the same partition. Sorting by time makes previous mean the prior order.",
        query:
          "SELECT id, customer_id, quantity, ordered_at FROM orders WHERE customer_id = 1 ORDER BY ordered_at, id;",
      },
      {
        title: "Read the previous quantity",
        description:
          "LAG(quantity) returns the prior order's quantity for that customer. The first order has NULL for previous.",
        query:
          "SELECT id, customer_id, LAG(quantity) OVER(\n  PARTITION BY customer_id ORDER BY ordered_at, id\n) AS previous_qty FROM orders;",
      },
    ],
  },
  25: {
    walkthrough: [
      {
        title: "See multiple rows per customer",
        description:
          "Customers can have several orders. Choosing the latest one needs an order and a way to keep only rank 1.",
        query:
          "SELECT id, customer_id, ordered_at FROM orders ORDER BY customer_id, ordered_at DESC, id DESC LIMIT 12;",
      },
      {
        title: "Keep the newest row per group",
        description:
          "ROW_NUMBER ordered by newest first marks the latest order as 1. Filtering rn = 1 keeps one row per customer.",
        query:
          "WITH ranked AS (\n  SELECT *, ROW_NUMBER() OVER(\n    PARTITION BY customer_id ORDER BY ordered_at DESC, id DESC\n  ) AS rn FROM orders\n) SELECT id, customer_id, ordered_at FROM ranked WHERE rn = 1;",
      },
    ],
  },
  27: {
    walkthrough: [
      {
        title: "Start from a base row",
        description:
          "A recursive CTE needs an anchor member. Here the sequence begins at 1 before the recursive step adds 1.",
        query: "SELECT 1 AS n;",
      },
      {
        title: "Grow the sequence recursively",
        description:
          "UNION ALL attaches rows produced from previous rows until the WHERE stop condition fails.",
        query:
          "WITH RECURSIVE numbers(n) AS (\n  SELECT 1\n  UNION ALL\n  SELECT n + 1 FROM numbers WHERE n < 5\n) SELECT n FROM numbers;",
      },
    ],
  },
  28: {
    walkthrough: [
      {
        title: "Run the filtered lookup",
        description:
          "This is the query whose plan you will inspect. Note the city predicate—indexes may later speed this path.",
        query: "SELECT name FROM customers WHERE city = 'Chicago';",
      },
      {
        title: "Read the query plan",
        description:
          "EXPLAIN QUERY PLAN names the access strategy (scan, search, and so on). Indexes change which path the engine picks.",
        query: "EXPLAIN QUERY PLAN SELECT name FROM customers WHERE city = 'Chicago';",
      },
    ],
  },
  29: {
    walkthrough: [
      {
        title: "Assemble paid revenue pieces",
        description:
          "Customer insights join customers, paid orders, and product prices before summing. Check the join keys first.",
        query:
          "SELECT c.name, o.quantity, p.price, o.status\nFROM customers c\nJOIN orders o ON o.customer_id = c.id\nJOIN products p ON p.id = o.product_id\nWHERE o.status = 'paid'\nLIMIT 8;",
      },
      {
        title: "Summarize paid revenue per customer",
        description:
          "The capstone CTE pattern computes paid_revenue, then the outer query ranks or filters those totals.",
        query:
          "WITH revenue AS (\n  SELECT c.name, SUM(o.quantity * p.price) AS paid_revenue\n  FROM customers c\n  JOIN orders o ON o.customer_id = c.id\n  JOIN products p ON p.id = o.product_id\n  WHERE o.status = 'paid'\n  GROUP BY c.name\n) SELECT name, paid_revenue FROM revenue ORDER BY paid_revenue DESC;",
      },
    ],
  },
  30: {
    walkthrough: [
      {
        title: "Scan the watch lengths",
        description:
          "Each event has watch_seconds. One overall MIN/MAX summarizes the whole table; GROUP BY later changes the grain.",
        query: "SELECT id, video_id, watch_seconds FROM watch_events ORDER BY id LIMIT 10;",
      },
      {
        title: "Summarize at the overall grain",
        description:
          "Without GROUP BY, MIN and MAX return one row for the entire result. That grain is “the whole table.”",
        query:
          "SELECT MIN(watch_seconds) AS shortest_watch, MAX(watch_seconds) AS longest_watch FROM watch_events;",
      },
    ],
  },
  32: {
    walkthrough: [
      {
        title: "Count successes and attempts",
        description:
          "A success rate needs both numerator and denominator. NULLIF protects against dividing by zero.",
        query:
          "SELECT account_id,\n  SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) AS successes,\n  COUNT(*) AS attempts\nFROM ai_requests GROUP BY account_id;",
      },
      {
        title: "Turn counts into a rounded percent",
        description:
          "Multiply by 100.0 for a real division, wrap the denominator in NULLIF(..., 0), then ROUND to two decimals.",
        query:
          "SELECT account_id, ROUND(100.0 * SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 2) AS success_pct\nFROM ai_requests GROUP BY account_id;",
      },
    ],
  },
  33: {
    walkthrough: [
      {
        title: "See messy emails before cleaning",
        description:
          "Whitespace and mixed case make the same address look different. Cleaning must happen before you compare or group.",
        query: "SELECT id, email FROM members ORDER BY id LIMIT 8;",
      },
      {
        title: "Normalize with TRIM and LOWER",
        description:
          "TRIM removes surrounding spaces; LOWER folds case. Together they produce a stable clean_email.",
        query: "SELECT id, LOWER(TRIM(email)) AS clean_email FROM members;",
      },
    ],
  },
  34: {
    walkthrough: [
      {
        title: "Read members and their referrer ids",
        description:
          "referrer_id points at another row in the same table. A self-join uses two aliases for those two roles.",
        query: "SELECT id, email, country, referrer_id FROM members ORDER BY id;",
      },
      {
        title: "Join the table to itself",
        description:
          "Alias m is the member and r is the referrer. LEFT JOIN keeps members who have no referrer.",
        query:
          "SELECT m.id AS member_id, r.id AS referrer_id\nFROM members m LEFT JOIN members r ON r.id = m.referrer_id;",
      },
    ],
  },
  35: {
    concept:
      "CROSS JOIN creates every pair of rows. It is useful for a deliberate date × entity grid, but careless use multiplies data. The three dates below are supplied setup data via a VALUES list—you are not being tested on UNION. Focus on CROSS JOIN (and optional signup filtering).",
    example: `${grid};`,
    answers: [
      `SELECT day,v.id AS viewer_id FROM (SELECT column1 AS day FROM (VALUES ('2025-01-01'), ('2025-01-02'), ('2025-01-03'))) AS days CROSS JOIN viewers v`,
      `SELECT day,v.id AS viewer_id FROM (SELECT column1 AS day FROM (VALUES ('2025-01-01'), ('2025-01-02'), ('2025-01-03'))) AS days CROSS JOIN viewers v WHERE day>=v.signup_at`,
    ],
    hints: [
      "Treat the VALUES date list as given setup data, then CROSS JOIN viewers.",
      "Filter day >= signup_at after creating the grid for the second task.",
    ],
    walkthrough: [
      {
        title: "Use the provided three dates",
        description:
          "These three day values are setup data (a VALUES list). You do not need UNION or recursion—your job is the CROSS JOIN next.",
        query:
          "SELECT column1 AS day FROM (VALUES ('2025-01-01'), ('2025-01-02'), ('2025-01-03'));",
      },
      {
        title: "Pair every date with every viewer",
        description:
          "CROSS JOIN multiplies the date list by the viewers. Filter by signup_at only after the grid exists when the task asks for that.",
        query: `${grid};`,
      },
    ],
  },
  36: {
    walkthrough: [
      {
        title: "See invoice and payment keys",
        description:
          "Some invoices lack payments and some payments lack invoices. FULL OUTER JOIN keeps unmatched rows from both sides.",
        query:
          "SELECT i.id AS invoice_id, p.id AS payment_id\nFROM invoices i LEFT JOIN payments p ON p.invoice_id = i.id\nORDER BY i.id, p.id;",
      },
      {
        title: "Retain unmatched rows on both sides",
        description:
          "FULL OUTER JOIN returns matches plus leftovers from either table. Missing matches show NULL on the empty side.",
        query:
          "SELECT i.id AS invoice_id, p.id AS payment_id\nFROM invoices i FULL OUTER JOIN payments p ON p.invoice_id = i.id;",
      },
    ],
  },
  38: {
    walkthrough: [
      {
        title: "List viewers of video 1",
        description:
          "INTERSECT will keep viewers who also watched video 2. EXCEPT would keep viewers of video 1 who never watched video 2.",
        query: "SELECT viewer_id FROM watch_events WHERE video_id = 1 ORDER BY viewer_id;",
      },
      {
        title: "Keep viewers in both sets",
        description:
          "INTERSECT returns distinct rows present in both SELECT results. Column positions must align.",
        query:
          "SELECT viewer_id FROM watch_events WHERE video_id = 1\nINTERSECT SELECT viewer_id FROM watch_events WHERE video_id = 2;",
      },
    ],
  },
  39: {
    walkthrough: [
      {
        title: "Bound January with half-open dates",
        description:
          "Timestamps need a clear start and end. Use >= month start and < next month start so the boundary stays unambiguous.",
        query:
          "SELECT id, watched_at FROM watch_events WHERE watched_at >= '2025-01-01' AND watched_at < '2025-02-01' ORDER BY watched_at LIMIT 8;",
      },
      {
        title: "Select the January window",
        description:
          "The half-open range includes midnight on January 1 and excludes midnight on February 1.",
        query:
          "SELECT id, watched_at FROM watch_events WHERE watched_at >= '2025-01-01' AND watched_at < '2025-02-01';",
      },
    ],
  },
  40: {
    walkthrough: [
      {
        title: "Order a viewer's watch timeline",
        description:
          "LEAD looks forward in the same partition. Sort one viewer's events by time to see what “next” means.",
        query:
          "SELECT id, viewer_id, watched_at FROM watch_events WHERE viewer_id = 1 ORDER BY watched_at, id;",
      },
      {
        title: "Read the next event time",
        description:
          "LEAD(watched_at) returns the following event's timestamp for that viewer. The last event has NULL for next.",
        query:
          "SELECT id, viewer_id, LEAD(watched_at) OVER(\n  PARTITION BY viewer_id ORDER BY watched_at, id\n) AS next_watched_at FROM watch_events;",
      },
    ],
  },
  41: {
    walkthrough: [
      {
        title: "Follow one viewer's video sequence",
        description:
          "LAST_VALUE needs an explicit frame to see the end of the partition as rows accumulate.",
        query:
          "SELECT id, viewer_id, video_id, watched_at FROM watch_events WHERE viewer_id = 1 ORDER BY watched_at, id;",
      },
      {
        title: "Carry the last video with a frame",
        description:
          "ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING lets LAST_VALUE see the whole partition for each row.",
        query:
          "SELECT id, viewer_id, LAST_VALUE(video_id) OVER(\n  PARTITION BY viewer_id ORDER BY watched_at, id\n  ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING\n) AS last_video FROM watch_events;",
      },
    ],
  },
  43: {
    walkthrough: [
      {
        title: "Count requests per model",
        description:
          "A share of total needs each group's count and the grand total. Start from the per-model counts.",
        query:
          "SELECT model, COUNT(*) AS request_count FROM ai_requests GROUP BY model ORDER BY model;",
      },
      {
        title: "Divide each count by the window total",
        description:
          "A window SUM over the model counts supplies the denominator so each row can show its share.",
        query:
          "WITH counts AS (\n  SELECT model, COUNT(*) AS request_count FROM ai_requests GROUP BY model\n) SELECT model, request_count,\n  ROUND(1.0 * request_count / SUM(request_count) OVER (), 3) AS share\nFROM counts;",
      },
    ],
  },
  45: {
    walkthrough: [
      {
        title: "Bucket watches by calendar day",
        description:
          "Daily active users need a day grain. date(watched_at) turns timestamps into calendar days before counting viewers.",
        query:
          "SELECT date(watched_at) AS day, viewer_id FROM watch_events ORDER BY day, viewer_id LIMIT 12;",
      },
      {
        title: "Count distinct viewers per day",
        description:
          "COUNT(DISTINCT viewer_id) counts people, not events. Grouping by day produces the DAU series.",
        query:
          "SELECT date(watched_at) AS day, COUNT(DISTINCT viewer_id) AS active_viewers\nFROM watch_events GROUP BY date(watched_at);",
      },
    ],
  },
  52: {
    walkthrough: [
      {
        title: "See assignment and conversion pieces",
        description:
          "Experiment math needs a clear denominator: assigned members per variant. Conversion checks for a later success event.",
        query:
          "SELECT member_id, variant, assigned_at FROM experiment_assignments ORDER BY variant, member_id;",
      },
      {
        title: "Keep the assignment denominator",
        description:
          "Count assigned members first, then mark who converted. Filtering to converters before counting shrinks the denominator incorrectly.",
        query: pack.lessons[52].example,
      },
    ],
  },
  53: {
    walkthrough: [
      {
        title: "Rank videos inside each creator",
        description:
          "Top-N per group needs a partition. Aggregate watch time per video, then number videos within each creator.",
        query:
          "SELECT v.creator_id, v.id AS video_id, SUM(w.watch_seconds) AS watch_seconds\nFROM videos v JOIN watch_events w ON w.video_id = v.id\nGROUP BY v.creator_id, v.id\nORDER BY v.creator_id, watch_seconds DESC;",
      },
      {
        title: "Keep the top rows per group",
        description:
          "ROW_NUMBER or RANK inside the creator partition selects the top videos. Ties need an explicit rule.",
        query: pack.lessons[53].example,
      },
    ],
  },
  56: {
    walkthrough: [
      {
        title: "Read numeric prices as stored",
        description:
          "CAST changes how a value is represented in the result. The stored price stays numeric until you cast it.",
        query: "SELECT id, price FROM lab_items ORDER BY id;",
      },
      {
        title: "Cast price to text",
        description:
          "CAST(price AS TEXT) returns a text form for display or concatenation. It is not validation by itself.",
        query: "SELECT id, CAST(price AS TEXT) AS price_text FROM lab_items;",
      },
    ],
  },
  57: {
    walkthrough: [
      {
        title: "Sort the values you will bucket",
        description:
          "NTILE splits an ordered list into roughly equal buckets. Sort watch_seconds so bucket 1 holds the longest watches.",
        query:
          "SELECT id, watch_seconds FROM watch_events ORDER BY watch_seconds DESC, id LIMIT 12;",
      },
      {
        title: "Assign quartile buckets",
        description:
          "NTILE(4) labels rows 1–4 over the ordered window. Bucket edges can differ slightly when counts do not divide evenly.",
        query:
          "SELECT id, watch_seconds, NTILE(4) OVER(ORDER BY watch_seconds DESC, id) AS bucket FROM watch_events;",
      },
    ],
  },
  58: {
    walkthrough: [
      {
        title: "Inspect the empty practice surface",
        description:
          "DDL builds structure. Start from the lab items you already have, then create a separate practice table in the next step.",
        query: "SELECT id, name, price FROM lab_items ORDER BY id;",
      },
      {
        title: "Create and alter a table",
        description:
          "CREATE TABLE defines columns; ALTER TABLE ADD COLUMN extends the contract. Inspect with a SELECT afterward.",
        query: pack.lessons[58].example,
      },
    ],
  },
  59: {
    walkthrough: [
      {
        title: "Read rows before mutation",
        description:
          "DML changes data. Note the current lab_items rows so you can see inserts, updates, and deletes afterward.",
        query: "SELECT id, name, price FROM lab_items ORDER BY id;",
      },
      {
        title: "Insert, update, then delete",
        description:
          "INSERT adds rows, UPDATE changes matching rows, DELETE removes them. Run the full script to see the net effect.",
        query: pack.lessons[59].example,
      },
    ],
  },
  60: {
    walkthrough: [
      {
        title: "See data that constraints will protect",
        description:
          "Constraints reject invalid writes. Think about NOT NULL, PRIMARY KEY, and CHECK before creating inventory.",
        query: "SELECT id, name, price FROM lab_items ORDER BY id;",
      },
      {
        title: "Declare constraints on create",
        description:
          "PRIMARY KEY, NOT NULL, and CHECK(quantity >= 0) encode the data contract at write time.",
        query: pack.lessons[60].example,
      },
    ],
  },
  61: {
    walkthrough: [
      {
        title: "Note prices before a transaction",
        description:
          "A transaction groups changes. ROLLBACK undoes them; COMMIT would keep them until this disposable database ends.",
        query: "SELECT id, price FROM lab_items ORDER BY id;",
      },
      {
        title: "Roll back a grouped change",
        description:
          "BEGIN starts a transaction. After UPDATE, ROLLBACK restores the prior prices visible in the final SELECT.",
        query: pack.lessons[61].example,
      },
    ],
  },
  63: {
    walkthrough: [
      {
        title: "Compute units you will materialize",
        description:
          "CTAS and TEMP tables store a query result. Build the customer_units shape in your head before writing CREATE TEMP TABLE.",
        query:
          "SELECT customer_id, SUM(quantity) AS units FROM orders GROUP BY customer_id ORDER BY customer_id;",
      },
      {
        title: "Materialize with CTAS",
        description:
          "CREATE TEMP TABLE … AS SELECT stores the result for later queries in the same session.",
        query: pack.lessons[63].example,
      },
    ],
  },
  64: {
    walkthrough: [
      {
        title: "Read prices the trigger will watch",
        description:
          "A trigger fires on a data change. Note current prices; an UPDATE that changes price should write an audit row.",
        query: "SELECT id, name, price FROM lab_items ORDER BY id;",
      },
      {
        title: "Define a trigger and see its effect",
        description:
          "AFTER UPDATE OF price inserts into an audit table when OLD.price differs from NEW.price.",
        query: pack.lessons[64].example,
      },
    ],
  },
  65: {
    walkthrough: [
      {
        title: "Call out the parameter boundary",
        description:
          "Procedures package a contract: inputs in, result set out. Here the “parameter” is customer_id = 1 in the filter.",
        query: "SELECT DISTINCT customer_id FROM orders ORDER BY customer_id;",
      },
      {
        title: "Return rows for one parameter value",
        description:
          "Filtering to a single customer_id models a parameterized lookup. Keep the contract explicit and narrow.",
        query: "SELECT id, customer_id, quantity FROM orders WHERE customer_id = 1;",
      },
    ],
  },
  66: {
    walkthrough: [
      {
        title: "Plan a lookup before indexing",
        description:
          "Without an index, filtering orders by customer_id may scan. EXPLAIN QUERY PLAN shows the current path.",
        query: "EXPLAIN QUERY PLAN SELECT id, quantity FROM orders WHERE customer_id = 1;",
      },
      {
        title: "Add an index and re-check the plan",
        description:
          "CREATE INDEX can change the access path. Compare the new plan to the scan you saw before.",
        query: pack.lessons[66].example,
      },
    ],
  },
  68: {
    walkthrough: [
      {
        title: "Filter a date slice of the fact",
        description:
          "Partitioning ideas show up as pruning a date range. Narrow fact_sales to one month before aggregating.",
        query:
          "SELECT sale_key, order_date, sales FROM fact_sales\nWHERE order_date >= '2025-02-01' AND order_date < '2025-03-01'\nORDER BY order_date LIMIT 8;",
      },
      {
        title: "Query within the partition window",
        description:
          "Date predicates that match partition boundaries let engines skip irrelevant slices. Keep the range half-open.",
        query: pack.lessons[68].example,
      },
    ],
  },
  71: {
    walkthrough: [
      {
        title: "Inspect Bronze sales before Gold",
        description:
          "Gold maps cleaned keys into dimensions and facts. Read bronze_sales fields that will become fact grain and measures.",
        query:
          "SELECT row_id, customer_id, product_id, quantity, order_date FROM bronze_sales ORDER BY row_id LIMIT 8;",
      },
      {
        title: "Assemble a fact with dimension keys",
        description:
          "Join Bronze rows to dimension surrogates, cast measures, and materialize the fact. Quality gates check counts and orphans.",
        query: pack.lessons[71].example,
      },
    ],
  },
};

// Fix lesson 19 step 0 - two statements might be OK in worker; verify later.
// Lesson 36 and 38 also use multi-statement - parity runner sends whole query string.

let changed = 0;
for (const [idStr, patch] of Object.entries(updates)) {
  const id = Number(idStr);
  const lesson = pack.lessons[id];
  if (!lesson) throw new Error(`missing lesson ${id}`);
  if (patch.walkthrough.length !== lesson.walkthrough.length) {
    throw new Error(`lesson ${id}: step count ${patch.walkthrough.length} != ${lesson.walkthrough.length}`);
  }
  lesson.walkthrough = patch.walkthrough;
  if (patch.concept) lesson.concept = patch.concept;
  if (patch.example) lesson.example = patch.example;
  if (patch.hints) lesson.hints = patch.hints;
  if (patch.answers) {
    lesson.tasks[0].answer = patch.answers[0];
    lesson.tasks[1].answer = patch.answers[1];
  }
  changed++;
}

fs.writeFileSync(packPath, JSON.stringify(pack, null, 2) + "\n");
console.log(`Updated ${changed} lessons in content-pack.json`);
console.log("IDs:", Object.keys(updates).map(Number).sort((a, b) => a - b).join(", "));
