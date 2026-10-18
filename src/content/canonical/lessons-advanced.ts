import { quiz, step, task, type LessonOverrides } from "./spec";

/** Deduplicated logical events: the earliest delivery of each event_id. */
const LOGICAL_EVENTS = "SELECT * FROM (SELECT e.*, ROW_NUMBER() OVER (PARTITION BY event_id ORDER BY received_at, delivery_id) AS copy FROM events e) WHERE copy = 1";

/** Runtime’s internal cost schedule for metered product actions (fictional). */
const EVENT_COSTS = `CREATE TABLE event_costs (event_name TEXT PRIMARY KEY, cost_microdollars INTEGER NOT NULL);
INSERT INTO event_costs VALUES ('dashboard_viewed', 900), ('search_performed', 1500), ('filter_applied', 400), ('report_created', 12000), ('report_shared', 2500), ('data_exported', 30000), ('integration_connected', 45000), ('comment_added', 300);`;

/** Recursive CTEs, plans, capstone and product analytics: lessons 27–29, 44–52. */
export const advancedLessons: LessonOverrides = {
  27: {
    dataset: "developer", decision: "MIGRATE", reason: "Recursion now walks real nested teams and management chains up to four levels deep.",
    concept: "A recursive CTE has an anchor query that returns the starting rows and a recursive query that joins the CTE to the table to find the next level. SQLite repeats the recursive step until it adds no rows. Carry a depth column to know how far each row is from the start.",
    trap: "Joining in the wrong direction (parent to child versus child to parent) walks up the tree instead of down, or stops after one level.",
    grain: "One row per team, then one row per person.",
    example: "WITH RECURSIVE n(x) AS (\n  SELECT 1\n  UNION ALL\n  SELECT x + 1 FROM n WHERE x < 5\n)\nSELECT x FROM n;",
    hints: ["Anchor: teams with parent_team_id IS NULL at depth 0; recursive step: child.parent_team_id = tree.team_id.", "Anchor: the developer with manager_id IS NULL; step: d.manager_id = chain.developer_id."],
    tasks: [
      task("Find organization 2. Return team_id, team_name and depth for every team: top-level teams (no parent) have depth 0 and each nested level adds 1.", "WITH RECURSIVE tree(team_id, team_name, depth) AS (SELECT team_id, team_name, 0 FROM teams WHERE organization_id = 2 AND parent_team_id IS NULL UNION ALL SELECT t.team_id, t.team_name, tree.depth + 1 FROM teams t JOIN tree ON t.parent_team_id = tree.team_id) SELECT team_id, team_name, depth FROM tree"),
      task("Find organization 2. Return developer_id, role and levels_below_top: 0 for the person with no manager, plus 1 for each reporting level beneath them.", "WITH RECURSIVE chain(developer_id, role, levels_below_top) AS (SELECT developer_id, role, 0 FROM developers WHERE organization_id = 2 AND manager_id IS NULL UNION ALL SELECT d.developer_id, d.role, chain.levels_below_top + 1 FROM developers d JOIN chain ON d.manager_id = chain.developer_id) SELECT developer_id, role, levels_below_top FROM chain"),
    ],
    quiz: quiz("When does a recursive CTE stop?", ["After a fixed 100 iterations", "When the recursive step adds no new rows", "After the anchor runs"], 1, "Each step works on the rows the previous step produced; an empty step ends the recursion."),
    walkthrough: [
      step("Count from 1 to 5 with recursion", "Run this. A recursive CTE starts at 1 and keeps adding rows until the condition fails—the pattern you reuse for org trees.", "WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x + 1 FROM n WHERE x < 5) SELECT x FROM n;"),
      step("See how teams nest", "Run this. parent_team_id links each team to its parent; NULL means a top-level team in organization 2.", "SELECT team_id, team_name, parent_team_id FROM teams WHERE organization_id = 2 ORDER BY parent_team_id NULLS FIRST, team_id;"),
    ],
  },
  28: {
    dataset: "retail", decision: "MIGRATE", reason: "Explain mode now shows index searches on real 125,613-line tables.",
    concept: "EXPLAIN QUERY PLAN describes how SQLite will read the data: SCAN reads a whole table, SEARCH uses an index to jump to matching rows, and a covering index answers from the index alone. A plan is evidence about access paths, not a timing measurement.",
    trap: "An index on orders.customer_id helps a filter on customer_id; it does not help a filter on country.",
    grain: "One row per matching order, then one row per matching line.",
    example: "EXPLAIN QUERY PLAN\nSELECT order_id FROM orders WHERE country = 'Germany';",
    hints: ["Run the query, then press Explain to see SEARCH orders USING INDEX.", "order_items has an index on stock_code."],
    tasks: [
      task("Find every order of customer 18102. Return order_id, invoice_no and ordered_at. Then use Explain to see which index SQLite searches.", "SELECT order_id, invoice_no, ordered_at FROM orders WHERE customer_id = 18102"),
      task("Find every line of stock code 85123A. Return order_item_id, order_id and quantity. Use Explain to confirm the search on order_items.", "SELECT order_item_id, order_id, quantity FROM order_items WHERE stock_code = '85123A'"),
    ],
    quiz: quiz("A plan shows SCAN orders. What does that mean?", ["SQLite reads every row of orders", "The query failed", "An index was used"], 0, "SCAN visits every row; SEARCH uses an index to visit only matching rows."),
    walkthrough: [
      step("Read the plan for customer_id", "Run this. Explain shows SEARCH on an index—SQLite jumps to that customer’s rows instead of reading the whole orders table.", "EXPLAIN QUERY PLAN SELECT order_id FROM orders WHERE customer_id = 18102;"),
      step("Read the plan for country", "Run this. Without a helpful index on country, the plan shows SCAN and SQLite checks every order row.", "EXPLAIN QUERY PLAN SELECT order_id FROM orders WHERE country = 'Germany';"),
    ],
  },
  29: {
    dataset: "retail", decision: "MIGRATE", reason: "Capstone ranks real customers and categories by net sales.",
    concept: "A customer report combines what you have learned: join lines to orders and products, aggregate net sales at the customer or category grain, and rank the totals. Decide the grain first, then the measures, then the ranking.",
    trap: "Counting order lines instead of distinct orders inflates the order count for customers who buy many items per invoice.",
    grain: "One row per identified customer, then one row per category.",
    example: "SELECT o.customer_id, COUNT(DISTINCT o.order_id) AS orders, COUNT(*) AS lines\nFROM orders o JOIN order_items i ON i.order_id = o.order_id\nWHERE o.customer_id IS NOT NULL AND o.order_type = 'sale'\nGROUP BY o.customer_id\nORDER BY orders DESC\nLIMIT 10;",
    hints: ["Aggregate per customer in a CTE, then DENSE_RANK() OVER (ORDER BY net_sales DESC).", "Join products and categories, aggregate per category, then rank."],
    tasks: [
      task("Find every identified customer. Return customer_id, sale_orders (distinct sale orders), net_sales (quantity × unit_price over all their lines, rounded to 2 decimals) and sales_rank: DENSE_RANK by net_sales, highest first.", "WITH c AS (SELECT o.customer_id, COUNT(DISTINCT CASE WHEN o.order_type = 'sale' THEN o.order_id END) AS sale_orders, ROUND(SUM(i.quantity * i.unit_price), 2) AS net_sales FROM orders o JOIN order_items i ON i.order_id = o.order_id WHERE o.customer_id IS NOT NULL GROUP BY o.customer_id) SELECT customer_id, sale_orders, net_sales, DENSE_RANK() OVER (ORDER BY net_sales DESC) AS sales_rank FROM c"),
      task("Find every category. Return category_name, net_sales (all lines, rounded to 2 decimals) and category_rank: DENSE_RANK by net_sales, highest first.", "WITH c AS (SELECT cat.category_name, ROUND(SUM(i.quantity * i.unit_price), 2) AS net_sales FROM order_items i JOIN products p ON p.stock_code = i.stock_code JOIN categories cat ON cat.category_id = p.category_id GROUP BY cat.category_name) SELECT category_name, net_sales, DENSE_RANK() OVER (ORDER BY net_sales DESC) AS category_rank FROM c"),
    ],
    quiz: quiz("Which counts each customer’s orders correctly after joining lines?", ["COUNT(*)", "COUNT(DISTINCT o.order_id)", "COUNT(i.order_item_id)"], 1, "After the join there is one row per line; distinct order ids count orders."),
    walkthrough: [
      step("Count orders versus line items", "Run this. After joining items to orders, COUNT(*) is lines while COUNT(DISTINCT order_id) is invoices—use the distinct count when you mean orders.", "SELECT o.customer_id, COUNT(DISTINCT o.order_id) AS orders, COUNT(*) AS lines FROM orders o JOIN order_items i ON i.order_id = o.order_id WHERE o.customer_id IS NOT NULL AND o.order_type = 'sale' GROUP BY o.customer_id ORDER BY orders DESC LIMIT 10;"),
      step("Sum revenue per customer", "Run this. quantity × unit_price rolled up by customer_id is the net sales number you will rank in the capstone tasks.", "SELECT o.customer_id, ROUND(SUM(i.quantity * i.unit_price), 2) AS net_sales FROM orders o JOIN order_items i ON i.order_id = o.order_id WHERE o.customer_id IS NOT NULL GROUP BY o.customer_id ORDER BY net_sales DESC LIMIT 10;"),
    ],
  },
  44: {
    dataset: "saas", decision: "MIGRATE", reason: "Deduplication of real-shaped retried deliveries in the SaaS event pipeline.",
    concept: "Clients retry when a delivery times out, so one logical event can arrive several times with the same event_id. Keep one delivery per event_id with ROW_NUMBER() OVER (PARTITION BY event_id ORDER BY received_at, delivery_id) = 1, then count logical events.",
    trap: "COUNT(*) on the raw table counts deliveries, not events. Retries inflate every metric built on it.",
    grain: "One row per logical event, then one row per event name.",
    example: "SELECT event_id, COUNT(*) AS deliveries\nFROM events\nGROUP BY event_id\nHAVING COUNT(*) > 1\nLIMIT 10;",
    hints: ["Number deliveries per event_id ordered by received_at, delivery_id; keep 1.", "Compare COUNT(*) on raw rows with COUNT(*) after deduplication."],
    tasks: [
      task("Find events that occurred in June 2025. Keep one delivery per event_id (the earliest received, ties by the lowest delivery_id). Return delivery_id, event_id, user_id, and event_name.", "SELECT delivery_id, event_id, user_id, event_name FROM (SELECT delivery_id, event_id, user_id, event_name, ROW_NUMBER() OVER (PARTITION BY event_id ORDER BY received_at, delivery_id) AS copy FROM events WHERE occurred_at >= '2025-06-01' AND occurred_at < '2025-07-01') WHERE copy = 1"),
      task("Find events that occurred in June 2025. Return event_name, deliveries (raw rows) and logical_events (distinct event_id) per event name.", "SELECT event_name, COUNT(*) AS deliveries, COUNT(DISTINCT event_id) AS logical_events FROM events WHERE occurred_at >= '2025-06-01' AND occurred_at < '2025-07-01' GROUP BY event_name"),
    ],
    quiz: quiz("Two deliveries share event_id evt_42. How many logical events are they?", ["Two", "One", "Zero"], 1, "event_id identifies the logical event; extra deliveries are retries."),
    walkthrough: [
      step("Find event_ids with retries", "Run this. deliveries > 1 means the pipeline delivered the same logical event more than once.", "SELECT event_id, COUNT(*) AS deliveries FROM events GROUP BY event_id HAVING COUNT(*) > 1 LIMIT 10;"),
      step("Open one retried event", "Run this. You see every delivery row for a single event_id—same occurred_at, different delivery_id and received_at.", "SELECT delivery_id, event_id, event_name, occurred_at, received_at FROM events WHERE event_id = (SELECT event_id FROM events GROUP BY event_id HAVING COUNT(*) > 1 LIMIT 1);"),
      step("Rank deliveries per event", "Run this. ROW_NUMBER() ordered by received_at marks the earliest delivery as 1—that is the copy you keep for analytics.", "SELECT event_id, delivery_id, received_at,\n  ROW_NUMBER() OVER (PARTITION BY event_id ORDER BY received_at, delivery_id) AS delivery_rank\nFROM events\nWHERE event_id IN (SELECT event_id FROM events WHERE occurred_at >= '2025-05-01' AND occurred_at < '2025-05-02' GROUP BY event_id HAVING COUNT(*) > 1)\nORDER BY event_id, delivery_rank;"),
    ],
  },
  45: {
    dataset: "saas", decision: "MIGRATE", reason: "Daily active users from the real event stream instead of a toy watch log.",
    concept: "Daily active users (DAU) counts distinct users with at least one qualifying event on each day. Derive the day from the time the event happened, and count distinct users and distinct logical events so retries do not inflate engagement.",
    trap: "Grouping by received_at moves late events to the day they arrived instead of the day users were active.",
    grain: "One row per activity day.",
    example: "SELECT date(occurred_at) AS day, COUNT(DISTINCT user_id) AS active_users\nFROM events\nWHERE occurred_at >= '2025-06-01' AND occurred_at < '2025-06-08'\nGROUP BY day;",
    hints: ["GROUP BY date(occurred_at) and COUNT(DISTINCT user_id).", "ROUND(1.0 * COUNT(DISTINCT event_id) / COUNT(DISTINCT user_id), 2)."],
    tasks: [
      task("Find June 2025. Return day (YYYY-MM-DD of occurred_at) and active_users: distinct users with any event that day.", "SELECT date(occurred_at) AS day, COUNT(DISTINCT user_id) AS active_users FROM events WHERE occurred_at >= '2025-06-01' AND occurred_at < '2025-07-01' GROUP BY day"),
      task("Find June 2025. Return day, active_users and events_per_active_user: distinct logical events (event_id) divided by active users, rounded to 2 decimals.", "SELECT date(occurred_at) AS day, COUNT(DISTINCT user_id) AS active_users, ROUND(1.0 * COUNT(DISTINCT event_id) / COUNT(DISTINCT user_id), 2) AS events_per_active_user FROM events WHERE occurred_at >= '2025-06-01' AND occurred_at < '2025-07-01' GROUP BY day"),
    ],
    quiz: quiz("A user triggers 40 events on Monday. How many times do they count in Monday’s DAU?", ["40", "1", "0"], 1, "DAU counts distinct users per day."),
    walkthrough: [
      step("Count daily active users", "Run this. Each day shows how many distinct user_id values had at least one event when it happened (occurred_at), not when it was received.", "SELECT date(occurred_at) AS day, COUNT(DISTINCT user_id) AS active_users FROM events WHERE occurred_at >= '2025-06-01' AND occurred_at < '2025-06-08' GROUP BY day;"),
      step("See late-arriving events", "Run this. Rows where received day differs from occurred day are why DAU should use occurred_at, not ingestion time.", "SELECT COUNT(*) AS late_day_shifts FROM events WHERE date(received_at) <> date(occurred_at);"),
    ],
  },
  46: {
    dataset: "saas", decision: "MIGRATE", reason: "Ordered activation funnel over real signup, onboarding and project events.",
    concept: "An ordered funnel counts users who complete steps in sequence: each step must happen at or after the previous step. Find each user’s earliest qualifying time for step 1, then the earliest step-2 time at or after it, and so on. Users who skip a step stop there.",
    trap: "Counting users who ever did each event ignores order: a project created before onboarding would wrongly count as a completed funnel.",
    grain: "One summary row, then one row per user who completes the funnel.",
    example: "SELECT event_name, COUNT(DISTINCT user_id) AS users\nFROM events\nWHERE event_name IN ('user_signed_up', 'onboarding_completed', 'project_created')\nGROUP BY event_name;",
    hints: ["CTE per step: MIN(occurred_at) per user, joined with the condition next.occurred_at >= previous step time.", "LEFT JOIN each step so non-completers stay in the earlier counts."],
    tasks: [
      task("Find users who signed up (user_signed_up) in the first quarter of 2025. Return one row with signed_up, onboarded and created_project: users reaching each step in order, where onboarding_completed happens at or after signup and project_created at or after the user’s onboarding completion.", "WITH s AS (SELECT user_id, MIN(occurred_at) AS t1 FROM events WHERE event_name = 'user_signed_up' GROUP BY user_id HAVING MIN(occurred_at) >= '2025-01-01' AND MIN(occurred_at) < '2025-04-01'), o AS (SELECT s.user_id, MIN(e.occurred_at) AS t2 FROM s JOIN events e ON e.user_id = s.user_id AND e.event_name = 'onboarding_completed' AND e.occurred_at >= s.t1 GROUP BY s.user_id), p AS (SELECT o.user_id, MIN(e.occurred_at) AS t3 FROM o JOIN events e ON e.user_id = o.user_id AND e.event_name = 'project_created' AND e.occurred_at >= o.t2 GROUP BY o.user_id) SELECT (SELECT COUNT(*) FROM s) AS signed_up, (SELECT COUNT(*) FROM o) AS onboarded, (SELECT COUNT(*) FROM p) AS created_project"),
      task("Find every user who completes all three steps in order in the same users. Return user_id, signed_up_at, onboarded_at and first_project_at.", "WITH s AS (SELECT user_id, MIN(occurred_at) AS t1 FROM events WHERE event_name = 'user_signed_up' GROUP BY user_id HAVING MIN(occurred_at) >= '2025-01-01' AND MIN(occurred_at) < '2025-04-01'), o AS (SELECT s.user_id, s.t1, MIN(e.occurred_at) AS t2 FROM s JOIN events e ON e.user_id = s.user_id AND e.event_name = 'onboarding_completed' AND e.occurred_at >= s.t1 GROUP BY s.user_id, s.t1), p AS (SELECT o.user_id, o.t1, o.t2, MIN(e.occurred_at) AS t3 FROM o JOIN events e ON e.user_id = o.user_id AND e.event_name = 'project_created' AND e.occurred_at >= o.t2 GROUP BY o.user_id, o.t1, o.t2) SELECT user_id, t1 AS signed_up_at, t2 AS onboarded_at, t3 AS first_project_at FROM p"),
    ],
    quiz: quiz("A user creates a project, then completes onboarding, and never creates another project. Do they complete signup → onboarding → project?", ["Yes", "No", "Only if dates tie"], 1, "The project step must happen at or after onboarding."),
    walkthrough: [
      step("Compare naive step counts", "Run this. These totals count anyone who ever hit each step—they ignore whether onboarding came before the first project.", "SELECT event_name, COUNT(DISTINCT user_id) AS users FROM events WHERE event_name IN ('user_signed_up', 'onboarding_completed', 'project_created') GROUP BY event_name;"),
      step("Walk one user’s timeline", "Run this. User 100’s funnel events in time order—use this picture when you enforce signup → onboarding → project.", "SELECT user_id, event_name, occurred_at FROM events WHERE user_id = 100 AND event_name IN ('user_signed_up', 'onboarding_completed', 'project_created') ORDER BY occurred_at;"),
      step("Pivot first time per step", "Run this. CASE inside MIN gives each user’s earliest timestamp per event name; you still must require each step to come after the previous one.", "SELECT user_id,\n  MIN(CASE WHEN event_name = 'user_signed_up' THEN occurred_at END) AS signed_up,\n  MIN(CASE WHEN event_name = 'onboarding_completed' THEN occurred_at END) AS first_onboarding,\n  MIN(CASE WHEN event_name = 'project_created' THEN occurred_at END) AS first_project\nFROM events\nWHERE user_id BETWEEN 100 AND 110\nGROUP BY user_id;"),
    ],
  },
  47: {
    dataset: "saas", decision: "MIGRATE", reason: "Signup cohorts and exact-day retention on real 2025 signups.",
    concept: "A cohort groups users by when they started; retention asks what share came back later. Exact-day retention checks activity on one specific day (signup date + 7 for D7). Only include cohorts that are mature: their measurement day must fall before the data ends.",
    trap: "Users who signed up on 2025-06-28 cannot have D7 activity in data that ends on 2025-06-30. Including them makes the newest cohort look worse.",
    grain: "One row per signup month.",
    example: "SELECT substr(created_at, 1, 7) AS cohort_month, COUNT(*) AS signups\nFROM users\nGROUP BY cohort_month;",
    hints: ["Join users to events on user_id and date(e.occurred_at) = date(u.created_at, '+7 days').", "Keep users whose date(created_at, '+7 days') <= '2025-06-30'."],
    tasks: [
      task("Find users created from 2025-01-01 whose D7 day (signup date + 7 days) is no later than 2025-06-30. Return cohort_month (YYYY-MM of created_at), cohort_size, retained_d7 (users with any event on their D7 day) and retention_pct (0–100, 2 decimals).", "WITH c AS (SELECT user_id, substr(created_at, 1, 7) AS cohort_month, date(created_at, '+7 days') AS d7 FROM users WHERE created_at >= '2025-01-01' AND date(created_at, '+7 days') <= '2025-06-30'), r AS (SELECT c.user_id, MAX(EXISTS (SELECT 1 FROM events e WHERE e.user_id = c.user_id AND e.occurred_at >= c.d7 AND e.occurred_at < date(c.d7, '+1 day'))) AS kept FROM c GROUP BY c.user_id) SELECT c.cohort_month, COUNT(*) AS cohort_size, SUM(r.kept) AS retained_d7, ROUND(100.0 * SUM(r.kept) / COUNT(*), 2) AS retention_pct FROM c JOIN r USING (user_id) GROUP BY c.cohort_month"),
      task("Using the same definition, find D30 retention (activity on signup date + 30 days), including only cohorts’ users whose D30 day is no later than 2025-06-30. Return cohort_month, cohort_size, retained_d30 and retention_pct.", "WITH c AS (SELECT user_id, substr(created_at, 1, 7) AS cohort_month, date(created_at, '+30 days') AS d30 FROM users WHERE created_at >= '2025-01-01' AND date(created_at, '+30 days') <= '2025-06-30') SELECT cohort_month, COUNT(*) AS cohort_size, SUM(kept) AS retained_d30, ROUND(100.0 * SUM(kept) / COUNT(*), 2) AS retention_pct FROM (SELECT c.cohort_month, EXISTS (SELECT 1 FROM events e WHERE e.user_id = c.user_id AND e.occurred_at >= c.d30 AND e.occurred_at < date(c.d30, '+1 day')) AS kept FROM c) GROUP BY cohort_month"),
    ],
    quiz: quiz("Why exclude users whose D7 day is after the data ends?", ["They are inactive", "Their outcome is not observable yet", "They are duplicates"], 1, "An unobservable outcome is not a failure; counting it as one biases retention down."),
    walkthrough: [
      step("Size each signup month", "Run this. cohort_month groups users by when they joined—the denominator before you measure who came back.", "SELECT substr(created_at, 1, 7) AS cohort_month, COUNT(*) AS signups FROM users GROUP BY cohort_month;"),
      step("Check one user on day 7", "Run this. d7 is signup plus seven days; events_on_d7 counts activity on that calendar day only.", "SELECT u.user_id, date(u.created_at) AS signup_day, date(u.created_at, '+7 days') AS d7, COUNT(e.delivery_id) AS events_on_d7 FROM users u LEFT JOIN events e ON e.user_id = u.user_id AND date(e.occurred_at) = date(u.created_at, '+7 days') WHERE u.user_id BETWEEN 9000 AND 9010 GROUP BY u.user_id;"),
      step("See who is D7-measurable", "Run this. d7_observable counts signups whose seventh day already passed in the data—recent signups stay out until you can see that day.", "SELECT substr(created_at, 1, 7) AS cohort_month, COUNT(*) AS signups,\n  SUM(date(created_at, '+7 days') <= '2025-06-30') AS d7_observable\nFROM users\nWHERE created_at >= '2025-05-01'\nGROUP BY cohort_month;"),
    ],
  },
  48: {
    dataset: "saas", decision: "MIGRATE", reason: "Sessionization rebuilds sessions from the raw event stream.",
    concept: "Sessionization groups each user’s events into sessions: a new session starts at the first event or after a gap of at least 30 minutes. Mark starts with LAG, then turn the marks into session numbers with a running SUM.",
    trap: "Ordering by received_at instead of occurred_at splits sessions when late deliveries arrive out of order.",
    grain: "One row per user, then one row per logical event.",
    example: "SELECT user_id, occurred_at,\n  LAG(occurred_at) OVER (PARTITION BY user_id ORDER BY occurred_at, event_id) AS previous_at\nFROM events\nWHERE user_id = 100;",
    hints: ["new_session = 1 when the previous event is NULL or (julianday(t) − julianday(previous)) × 1440 >= 30.", "SUM(new_session) OVER (PARTITION BY user_id ORDER BY occurred_at, event_id) numbers the sessions."],
    tasks: [
      task("Using one delivery per event_id for events in June 2025, return user_id and sessions: the number of sessions per user, where a session starts at the user’s first event or after a gap of 30 minutes or more (ordered by occurred_at, event_id).", `WITH e AS (SELECT user_id, event_id, occurred_at FROM (${LOGICAL_EVENTS}) WHERE occurred_at >= '2025-06-01' AND occurred_at < '2025-07-01'), m AS (SELECT user_id, CASE WHEN LAG(occurred_at) OVER (PARTITION BY user_id ORDER BY occurred_at, event_id) IS NULL OR (julianday(occurred_at) - julianday(LAG(occurred_at) OVER (PARTITION BY user_id ORDER BY occurred_at, event_id))) * 1440 >= 30 THEN 1 ELSE 0 END AS new_session FROM e) SELECT user_id, SUM(new_session) AS sessions FROM m GROUP BY user_id`),
      task("Using the same rule and events, find every logical event. Return event_id, user_id, and session_number: 1 for the user’s first June session, increasing by 1 at each new session.", `WITH e AS (SELECT user_id, event_id, occurred_at FROM (${LOGICAL_EVENTS}) WHERE occurred_at >= '2025-06-01' AND occurred_at < '2025-07-01'), m AS (SELECT user_id, event_id, occurred_at, CASE WHEN LAG(occurred_at) OVER (PARTITION BY user_id ORDER BY occurred_at, event_id) IS NULL OR (julianday(occurred_at) - julianday(LAG(occurred_at) OVER (PARTITION BY user_id ORDER BY occurred_at, event_id))) * 1440 >= 30 THEN 1 ELSE 0 END AS new_session FROM e) SELECT event_id, user_id, SUM(new_session) OVER (PARTITION BY user_id ORDER BY occurred_at, event_id) AS session_number FROM m`),
    ],
    quiz: quiz("Events at 10:00, 10:10 and 10:55 with a 30-minute rule form how many sessions?", ["One", "Two", "Three"], 1, "The 45-minute gap before 10:55 starts a second session."),
    walkthrough: [
      step("Measure idle time between events", "Run this. LAG() on occurred_at shows minutes since user 100’s previous event—the input to a 30-minute session rule.", "SELECT user_id, occurred_at, ROUND((julianday(occurred_at) - julianday(LAG(occurred_at) OVER (PARTITION BY user_id ORDER BY occurred_at, event_id))) * 1440, 1) AS minutes_since_previous FROM events WHERE user_id = 100;"),
      step("Compare to stored sessions", "Run this. The sessions table is the product’s own log for the same user—your SQL rebuild should resemble these boundaries.", "SELECT session_id, started_at, ended_at FROM sessions WHERE user_id = 100;"),
      step("Mark where a session starts", "Run this. starts_session is 1 on the first event or after a gap of at least 30 minutes; a running sum of those flags numbers sessions next.", "WITH g AS (\n  SELECT user_id, occurred_at,\n    (julianday(occurred_at) - julianday(LAG(occurred_at) OVER (PARTITION BY user_id ORDER BY occurred_at, event_id))) * 1440 AS gap\n  FROM events WHERE user_id = 100\n)\nSELECT occurred_at, ROUND(gap, 1) AS minutes_since_previous,\n  CASE WHEN gap IS NULL OR gap >= 30 THEN 1 ELSE 0 END AS starts_session\nFROM g;"),
    ],
  },
  49: {
    dataset: "payments", decision: "MIGRATE", reason: "Fan-out between settlements and refunds on a real-shaped card ledger.",
    concept: "Joining a parent to two independent child tables multiplies rows: each settlement row is repeated once per refund, so summing settlement amounts after the join double-counts. Aggregate each child table to the shared grain first, then join the summaries.",
    trap: "SUM(s.amount_cents) after joining refunds counts a settlement with two refunds twice.",
    grain: "One row per account.",
    example: "SELECT s.settlement_id, COUNT(r.refund_id) AS refunds\nFROM settlements s\nLEFT JOIN refunds r ON r.settlement_id = s.settlement_id\nGROUP BY s.settlement_id\nHAVING COUNT(r.refund_id) > 1\nLIMIT 10;",
    hints: ["Path to an account: settlements → authorizations → cards → accounts.", "Build one CTE for settled cents per account and one for refunded cents per account, then LEFT JOIN both to accounts."],
    tasks: [
      task("Find accounts 1–200. Return account_id, settled_cents and refunded_cents: total card settlements and total refunds for cards on that account, each counted once, 0 when none.", "WITH sa AS (SELECT c.account_id, s.settlement_id, s.amount_cents FROM settlements s JOIN authorizations a ON a.authorization_id = s.authorization_id JOIN cards c ON c.card_id = a.card_id), st AS (SELECT account_id, SUM(amount_cents) AS cents FROM sa GROUP BY account_id), rf AS (SELECT sa.account_id, SUM(r.amount_cents) AS cents FROM refunds r JOIN sa ON sa.settlement_id = r.settlement_id GROUP BY sa.account_id) SELECT x.account_id, COALESCE(st.cents, 0) AS settled_cents, COALESCE(rf.cents, 0) AS refunded_cents FROM accounts x LEFT JOIN st ON st.account_id = x.account_id LEFT JOIN rf ON rf.account_id = x.account_id WHERE x.account_id BETWEEN 1 AND 200"),
      task("Find the same accounts. Return account_id and net_card_spend_cents: settled cents minus refunded cents, each source counted once, 0 when there is no activity.", "WITH sa AS (SELECT c.account_id, s.settlement_id, s.amount_cents FROM settlements s JOIN authorizations a ON a.authorization_id = s.authorization_id JOIN cards c ON c.card_id = a.card_id), st AS (SELECT account_id, SUM(amount_cents) AS cents FROM sa GROUP BY account_id), rf AS (SELECT sa.account_id, SUM(r.amount_cents) AS cents FROM refunds r JOIN sa ON sa.settlement_id = r.settlement_id GROUP BY sa.account_id) SELECT x.account_id, COALESCE(st.cents, 0) - COALESCE(rf.cents, 0) AS net_card_spend_cents FROM accounts x LEFT JOIN st ON st.account_id = x.account_id LEFT JOIN rf ON rf.account_id = x.account_id WHERE x.account_id BETWEEN 1 AND 200"),
    ],
    quiz: quiz("A settlement of 1,000 cents has two refunds. After settlements LEFT JOIN refunds, SUM(s.amount_cents) for it is…", ["1,000", "2,000", "0"], 1, "The settlement row repeats once per refund."),
    walkthrough: [
      step("Find settlements with many refunds", "Run this. refunds > 1 means one charge spawned several partial refund rows—the pattern that breaks naive joins.", "SELECT s.settlement_id, COUNT(r.refund_id) AS refunds FROM settlements s LEFT JOIN refunds r ON r.settlement_id = s.settlement_id GROUP BY s.settlement_id HAVING COUNT(r.refund_id) > 1 LIMIT 10;"),
      step("Watch totals double-count", "Run this. joined_sum adds settlement amounts once per refund row; true_sum is the correct ledger total.", "SELECT SUM(s.amount_cents) AS joined_sum, (SELECT SUM(amount_cents) FROM settlements) AS true_sum FROM settlements s LEFT JOIN refunds r ON r.settlement_id = s.settlement_id;"),
      step("Roll refunds up first", "Run this. One row per settlement_id with total refunded cents—safe to join without multiplying settlements.", "SELECT settlement_id, COUNT(*) AS refunds, SUM(amount_cents) AS refunded_cents\nFROM refunds\nGROUP BY settlement_id\nORDER BY refunds DESC\nLIMIT 10;"),
      step("Join summaries, not raw refunds", "Run this. settled_cents and refunded_cents match because each settlement appears once on the left.", "SELECT SUM(s.amount_cents) AS settled_cents, SUM(COALESCE(r.refunded_cents, 0)) AS refunded_cents\nFROM settlements s\nLEFT JOIN (SELECT settlement_id, SUM(amount_cents) AS refunded_cents FROM refunds GROUP BY settlement_id) r\n  ON r.settlement_id = s.settlement_id;"),
    ],
  },
  50: {
    dataset: "payments", decision: "MIGRATE", reason: "Reconciliation between settlements, refunds and the posted ledger, with real gaps.",
    concept: "Reconciliation compares two records of the same money. Bring each side to the same grain (one row per settlement), join them, and classify every row: matched, missing on one side, or different amounts. Unmatched rows are findings, not errors to filter away.",
    trap: "An inner join between settlements and ledger postings silently drops the settlements that never posted, which are exactly the problems to find.",
    grain: "One row per settlement in March 2025.",
    example: "SELECT transaction_type, status, COUNT(*) AS entries, SUM(amount_cents) AS cents\nFROM transactions\nWHERE posted_at >= '2025-03-01' AND posted_at < '2025-04-01'\nGROUP BY transaction_type, status;",
    hints: ["Aggregate refunds per settlement before joining.", "Match ledger card_purchase postings on authorization_id; their amount is the negative of the settlement."],
    tasks: [
      task("Find settlements settled in March 2025. Return settlement_id, settled_cents, refunded_cents (0 when none) and net_cents (settled minus refunded).", "SELECT s.settlement_id, s.amount_cents AS settled_cents, COALESCE(r.cents, 0) AS refunded_cents, s.amount_cents - COALESCE(r.cents, 0) AS net_cents FROM settlements s LEFT JOIN (SELECT settlement_id, SUM(amount_cents) AS cents FROM refunds GROUP BY settlement_id) r ON r.settlement_id = s.settlement_id WHERE s.settled_at >= '2025-03-01' AND s.settled_at < '2025-04-01'"),
      task("Find the same settlements. Return settlement_id, settled_cents, ledger_cents (the negated sum of posted card_purchase entries for the same authorization, NULL if none) and status: 'missing_posting', 'matched' or 'amount_mismatch'.", "SELECT s.settlement_id, s.amount_cents AS settled_cents, l.cents AS ledger_cents, CASE WHEN l.cents IS NULL THEN 'missing_posting' WHEN l.cents = s.amount_cents THEN 'matched' ELSE 'amount_mismatch' END AS status FROM settlements s LEFT JOIN (SELECT authorization_id, -SUM(amount_cents) AS cents FROM transactions WHERE transaction_type = 'card_purchase' AND status = 'posted' GROUP BY authorization_id) l ON l.authorization_id = s.authorization_id WHERE s.settled_at >= '2025-03-01' AND s.settled_at < '2025-04-01'"),
    ],
    quiz: quiz("Which join keeps settlements that never reached the ledger?", ["settlements JOIN ledger", "settlements LEFT JOIN ledger", "ledger LEFT JOIN settlements"], 1, "The settlement side must be preserved to find missing postings."),
    walkthrough: [
      step("Summarize March ledger activity", "Run this. Posted card purchases and other types in March 2025—the bank side of reconciliation.", "SELECT transaction_type, status, COUNT(*) AS entries, SUM(amount_cents) AS cents FROM transactions WHERE posted_at >= '2025-03-01' AND posted_at < '2025-04-01' GROUP BY transaction_type, status;"),
      step("Line up settlement and posting", "Run this. Each settlement ties to card_purchase rows through authorization_id so you can compare amounts row by row.", "SELECT s.settlement_id, s.amount_cents, t.transaction_id, t.amount_cents AS ledger_cents FROM settlements s LEFT JOIN transactions t ON t.authorization_id = s.authorization_id AND t.transaction_type = 'card_purchase' WHERE s.settlement_id <= 5;"),
      step("Add partial refunds per charge", "Run this. Several refund rows can share one settlement_id—sum them before you net against settled cents.", "SELECT settlement_id, COUNT(*) AS refunds, SUM(amount_cents) AS refunded_cents\nFROM refunds\nWHERE settlement_id <= 300\nGROUP BY settlement_id;"),
      step("Compare month totals", "Run this. settled_cents from the card processor should line up with negated posted card_purchase cents when nothing is missing.", "SELECT\n  (SELECT SUM(amount_cents) FROM settlements WHERE settled_at >= '2025-02-01' AND settled_at < '2025-03-01') AS settled_cents,\n  (SELECT -SUM(amount_cents) FROM transactions WHERE transaction_type = 'card_purchase' AND status = 'posted' AND posted_at >= '2025-02-01' AND posted_at < '2025-03-01') AS ledger_cents;"),
    ],
  },
  51: {
    title: "Usage cost & contribution margin",
    dataset: "saas", decision: "REWRITE", reason: "Unit economics now use the SaaS billing ledger and an internal cost schedule for metered actions; the AI-request toy tables are retired.",
    concept: "Contribution margin is revenue minus the variable cost of serving it. Revenue comes from cash collected (invoice payments net of refunds) in the period; usage cost is each logical event multiplied by its unit cost. Compute both at the same grain, then subtract.",
    trap: "Multiplying raw deliveries by unit cost charges retries twice; deduplicate events before costing them.",
    grain: "One row per event type, then one row per paying workspace.",
    example: "SELECT event_name, cost_microdollars\nFROM event_costs\nORDER BY cost_microdollars DESC;",
    hints: ["Deduplicate events with ROW_NUMBER per event_id before joining event_costs.", "Revenue: SUM(amount_cents) of invoice_paid and refund_issued billing events in May 2025."],
    tasks: [
      task(`For logical events (one per event_id) that occurred in June 2025, return event_name, events and cost_usd: events × the event_costs unit cost in microdollars, converted to dollars and rounded to 2 decimals. Include only costed event types.`, `SELECT e.event_name, COUNT(*) AS events, ROUND(SUM(c.cost_microdollars) / 1000000.0, 2) AS cost_usd FROM (${LOGICAL_EVENTS}) e JOIN event_costs c ON c.event_name = e.event_name WHERE e.occurred_at >= '2025-06-01' AND e.occurred_at < '2025-07-01' GROUP BY e.event_name`),
      task(`For workspaces with net billing revenue in May 2025 (invoice_paid plus refund_issued amounts), return account_id, revenue_usd, usage_cost_usd (logical events that occurred in May 2025 × unit cost, 0 when none) and margin_usd = revenue minus usage cost. Round all three to 2 decimals.`, `WITH rev AS (SELECT account_id, SUM(amount_cents) / 100.0 AS revenue FROM billing_events WHERE event_type IN ('invoice_paid', 'refund_issued') AND occurred_at >= '2025-05-01' AND occurred_at < '2025-06-01' GROUP BY account_id HAVING SUM(amount_cents) > 0), cost AS (SELECT e.account_id, SUM(c.cost_microdollars) / 1000000.0 AS usage_cost FROM (${LOGICAL_EVENTS}) e JOIN event_costs c ON c.event_name = e.event_name WHERE e.occurred_at >= '2025-05-01' AND e.occurred_at < '2025-06-01' GROUP BY e.account_id) SELECT rev.account_id, ROUND(rev.revenue, 2) AS revenue_usd, ROUND(COALESCE(cost.usage_cost, 0), 2) AS usage_cost_usd, ROUND(rev.revenue - COALESCE(cost.usage_cost, 0), 2) AS margin_usd FROM rev LEFT JOIN cost ON cost.account_id = rev.account_id`),
    ],
    quiz: quiz("Revenue 99.00, usage cost 7.25. What is the contribution margin?", ["106.25", "91.75", "7.25"], 1, "Margin = revenue − variable cost."),
    walkthrough: [
      step("Read the unit cost table", "Run this. Each event_name maps to a cost in microdollars—the variable cost you multiply by logical event counts.", "SELECT event_name, cost_microdollars FROM event_costs ORDER BY cost_microdollars DESC;"),
      step("See May billing cash", "Run this. invoice_paid and refund_issued rows show money collected in May 2025—the revenue side of margin.", "SELECT event_type, COUNT(*) AS events, SUM(amount_cents) / 100.0 AS usd FROM billing_events WHERE occurred_at >= '2025-05-01' AND occurred_at < '2025-06-01' GROUP BY event_type;"),
    ],
    setupSql: EVENT_COSTS,
  },
  52: {
    dataset: "saas", decision: "MIGRATE", reason: "Experiment denominators on a real-shaped A/B test with a measurable effect.",
    concept: "An experiment’s conversion rate divides converters by everyone assigned to the variant, not by users who happened to be active afterwards. A conversion counts only if it happens at or after the user’s assignment and before the measurement window ends.",
    trap: "Inner-joining assignments to conversion events drops assigned users who never converted, so both variants look close to 100%.",
    grain: "One row per variant, then one row per assignment.",
    example: "SELECT x.experiment_key, a.variant, COUNT(*) AS assigned\nFROM experiment_assignments a JOIN experiments x USING (experiment_id)\nWHERE x.experiment_id = 6\nGROUP BY x.experiment_key, a.variant;",
    hints: ["EXISTS (SELECT 1 FROM events e WHERE e.user_id = a.user_id AND e.event_name = 'report_created' AND e.occurred_at >= a.assigned_at AND e.occurred_at < '2024-09-02').", "Keep every assignment; convert the EXISTS to 1 or 0."],
    tasks: [
      task("Find experiment 6 (report_builder_v2). Return variant, assigned, converted and conversion_pct (0–100, 2 decimals). A user converts with any report_created event at or after assigned_at and before 2024-09-02.", "SELECT variant, COUNT(*) AS assigned, SUM(converted) AS converted, ROUND(100.0 * SUM(converted) / COUNT(*), 2) AS conversion_pct FROM (SELECT a.variant, EXISTS (SELECT 1 FROM events e WHERE e.user_id = a.user_id AND e.event_name = 'report_created' AND e.occurred_at >= a.assigned_at AND e.occurred_at < '2024-09-02') AS converted FROM experiment_assignments a WHERE a.experiment_id = 6) GROUP BY variant"),
      task("Find every assignment in the same experiment and definition. Return user_id, variant and converted (1 or 0).", "SELECT a.user_id, a.variant, EXISTS (SELECT 1 FROM events e WHERE e.user_id = a.user_id AND e.event_name = 'report_created' AND e.occurred_at >= a.assigned_at AND e.occurred_at < '2024-09-02') AS converted FROM experiment_assignments a WHERE a.experiment_id = 6"),
    ],
    quiz: quiz("What is the denominator of a variant’s conversion rate?", ["Users who converted", "Users assigned to the variant", "All users in the product"], 1, "Every assigned user is in the experiment, whether or not they converted."),
    walkthrough: [
      step("Count users per variant", "Run this. assigned is everyone split into A or B for experiment 6—the denominator for conversion rate.", "SELECT x.experiment_key, a.variant, COUNT(*) AS assigned FROM experiment_assignments a JOIN experiments x USING (experiment_id) WHERE x.experiment_id = 6 GROUP BY x.experiment_key, a.variant;"),
      step("See a biased denominator", "Run this. Inner-joining conversions drops users who never created a report, so both variants look almost 100% converted.", "SELECT a.variant, COUNT(DISTINCT a.user_id) AS users_seen FROM experiment_assignments a JOIN events e ON e.user_id = a.user_id AND e.event_name = 'report_created' AND e.occurred_at >= a.assigned_at WHERE a.experiment_id = 6 GROUP BY a.variant;"),
    ],
  },
};
