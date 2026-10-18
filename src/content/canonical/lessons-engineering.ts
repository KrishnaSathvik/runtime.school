import { quiz, step, task, type LessonOverrides } from "./spec";

/** Database engineering and performance: lessons 58–68 and 75. Labs run on a disposable copy of the dataset. */
export const engineeringLessons: LessonOverrides = {
  58: {
    dataset: "developer", decision: "MIGRATE", reason: "DDL now extends the real Developer Platform schema with a review-checklist table.",
    concept: "DDL (data definition language) defines database objects. CREATE TABLE names columns, types and keys; ALTER TABLE adds a column to an existing table. After running DDL, inspect the schema itself (sqlite_schema, pragma_table_info) as well as the rows you insert.",
    trap: "A SELECT that returns the expected constants does not create the table; the check inspects the schema.",
    grain: "One checklist item per row.",
    example: "CREATE TABLE release_notes (note_id INTEGER PRIMARY KEY, repository_id INTEGER NOT NULL REFERENCES repositories(repository_id), body TEXT NOT NULL);\nINSERT INTO release_notes VALUES (1, 1, 'First release');\nSELECT * FROM release_notes;",
    hints: ["CREATE TABLE review_checklist (item_id INTEGER PRIMARY KEY, pull_request_id INTEGER NOT NULL REFERENCES pull_requests(pull_request_id), item TEXT NOT NULL).", "ALTER TABLE review_checklist ADD COLUMN done INTEGER NOT NULL DEFAULT 0."],
    tasks: [
      task("Create review_checklist with item_id INTEGER PRIMARY KEY, pull_request_id INTEGER NOT NULL referencing pull_requests(pull_request_id), and item TEXT NOT NULL. Insert (1, 1, 'Tests pass') and (2, 1, 'Docs updated'), then return item_id, pull_request_id and item.", "CREATE TABLE review_checklist (item_id INTEGER PRIMARY KEY, pull_request_id INTEGER NOT NULL REFERENCES pull_requests(pull_request_id), item TEXT NOT NULL); INSERT INTO review_checklist VALUES (1, 1, 'Tests pass'), (2, 1, 'Docs updated'); SELECT item_id, pull_request_id, item FROM review_checklist", { validate: [
        { sql: "SELECT COUNT(*) FROM sqlite_schema WHERE type = 'table' AND name = 'review_checklist'", value: 1 },
        { sql: "SELECT COUNT(*) FROM pragma_foreign_key_list('review_checklist') WHERE \"table\" = 'pull_requests'", value: 1 },
      ] }),
      task("Create the same review_checklist table, then ALTER it to add done INTEGER NOT NULL DEFAULT 0. Insert (1, 1, 'Tests pass') naming only item_id, pull_request_id and item. Return item_id, item and done.", "CREATE TABLE review_checklist (item_id INTEGER PRIMARY KEY, pull_request_id INTEGER NOT NULL REFERENCES pull_requests(pull_request_id), item TEXT NOT NULL); ALTER TABLE review_checklist ADD COLUMN done INTEGER NOT NULL DEFAULT 0; INSERT INTO review_checklist (item_id, pull_request_id, item) VALUES (1, 1, 'Tests pass'); SELECT item_id, item, done FROM review_checklist", { validate: [
        { sql: "SELECT COUNT(*) FROM pragma_table_info('review_checklist') WHERE name = 'done' AND dflt_value = '0'", value: 1 },
      ] }),
    ],
    quiz: quiz("Which statement adds a column to an existing table?", ["CREATE TABLE … ADD", "ALTER TABLE … ADD COLUMN", "UPDATE … SET COLUMN"], 1, "ALTER TABLE changes a table definition; UPDATE changes rows."),
    walkthrough: [
      step("Read a stored CREATE statement", "Run this. SQLite keeps the DDL for pull_requests in sqlite_schema—this is how you inspect how an existing table was defined.", "SELECT sql FROM sqlite_schema WHERE name = 'pull_requests';"),
      step("Create a table and insert rows", "This lab uses a disposable copy of the database. You define release_notes, insert a row, then SELECT it back to confirm DDL and DML worked together.", "CREATE TABLE release_notes (note_id INTEGER PRIMARY KEY, repository_id INTEGER NOT NULL REFERENCES repositories(repository_id), body TEXT NOT NULL);\nINSERT INTO release_notes VALUES (1, 1, 'First release');\nSELECT * FROM release_notes;"),
    ],
  },
  59: {
    dataset: "retail", decision: "MIGRATE", reason: "INSERT, UPDATE and DELETE on the real product catalog (disposable copy).",
    concept: "DML changes rows: INSERT adds, UPDATE modifies matching rows, DELETE removes matching rows. Every UPDATE and DELETE should have a WHERE clause that names exactly the rows you mean; run the same condition as a SELECT first to see what it will touch.",
    trap: "UPDATE products SET list_price = list_price * 1.1 without WHERE reprices the entire catalog.",
    grain: "One row per product in the affected category.",
    example: "SELECT stock_code, description, list_price\nFROM products\nWHERE category_id = 13\nORDER BY stock_code;",
    hints: ["INSERT INTO products VALUES (...) with all six columns.", "UPDATE … WHERE category_id = 12 AND list_price < 5; DELETE … WHERE … ."],
    tasks: [
      task("In category 13 (Pets): insert product 'PET001' described 'CAT TOY MOUSE' in category 13 priced 1.95 with first_sold_at '2011-12-10 09:00:00' and is_merchandise 1; raise the price of every Pets product priced below 5 by 0.50; delete product '20725' if it is in category 13. Return stock_code, description and list_price for category 13.", "INSERT INTO products VALUES ('PET001', 'CAT TOY MOUSE', 13, 1.95, '2011-12-10 09:00:00', 1); UPDATE products SET list_price = list_price + 0.5 WHERE category_id = 13 AND list_price < 5; DELETE FROM products WHERE stock_code = '20725' AND category_id = 13; SELECT stock_code, description, list_price FROM products WHERE category_id = 13"),
      task("In category 12 (Bath & Wellbeing): increase list_price by 10% (rounded to 2 decimals) for products priced below 5, then delete products in that category with no list price. Return stock_code, description and list_price for category 12.", "UPDATE products SET list_price = ROUND(list_price * 1.1, 2) WHERE category_id = 12 AND list_price < 5; DELETE FROM products WHERE category_id = 12 AND list_price IS NULL; SELECT stock_code, description, list_price FROM products WHERE category_id = 12", { stateQueries: ["SELECT stock_code, list_price FROM products WHERE category_id <> 12 ORDER BY stock_code"] }),
    ],
    quiz: quiz("What does UPDATE products SET list_price = 0 change?", ["Nothing without WHERE", "Every row of products", "Only the first row"], 1, "Without WHERE, UPDATE applies to all rows."),
    walkthrough: [
      step("Preview rows before you change them", "Run the same WHERE you will use in UPDATE as a SELECT first. You see every Pets product (category 13) before anything is modified.", "SELECT stock_code, description, list_price FROM products WHERE category_id = 13 ORDER BY stock_code;"),
      step("Update prices and check the result", "The script bumps cheap Pets lines by £1, then SELECTs the category again so you can compare before and after in one disposable run.", "UPDATE products SET list_price = list_price + 1 WHERE category_id = 13 AND list_price < 2;\nSELECT stock_code, list_price FROM products WHERE category_id = 13 ORDER BY stock_code;"),
    ],
  },
  60: {
    dataset: "logistics", decision: "MIGRATE", reason: "Constraints protect real logistics entities (service codes and package weights).",
    concept: "Constraints are rules the database enforces on every write: NOT NULL forbids missing values, UNIQUE forbids duplicates, CHECK requires a condition, and FOREIGN KEY requires a matching parent row. A rejected write is the constraint working.",
    trap: "A CHECK that allows NULL (weight_kg > 0) still lets a NULL weight in; add NOT NULL when the value is required.",
    grain: "One row per tariff or label in the new table.",
    example: "CREATE TABLE zone_codes (zone TEXT PRIMARY KEY, max_days INTEGER NOT NULL CHECK (max_days BETWEEN 0 AND 10));\nINSERT INTO zone_codes VALUES ('A', 1), ('B', 3);\nSELECT * FROM zone_codes;",
    hints: ["service_level_id INTEGER NOT NULL REFERENCES service_levels(service_level_id), weight_limit_kg REAL NOT NULL CHECK (weight_limit_kg > 0).", "tracking_number TEXT NOT NULL UNIQUE and package_id INTEGER NOT NULL REFERENCES packages(package_id)."],
    tasks: [
      task("Create weight_tariffs with tariff_id INTEGER PRIMARY KEY, service_level_id INTEGER NOT NULL referencing service_levels(service_level_id), weight_limit_kg REAL NOT NULL CHECK (weight_limit_kg > 0) and price REAL NOT NULL CHECK (price >= 0). Insert (1, 1, 5, 8.5) and (2, 3, 2, 14). Return tariff_id, service_level_id, weight_limit_kg and price.", "CREATE TABLE weight_tariffs (tariff_id INTEGER PRIMARY KEY, service_level_id INTEGER NOT NULL REFERENCES service_levels(service_level_id), weight_limit_kg REAL NOT NULL CHECK (weight_limit_kg > 0), price REAL NOT NULL CHECK (price >= 0)); INSERT INTO weight_tariffs VALUES (1, 1, 5, 8.5), (2, 3, 2, 14); SELECT tariff_id, service_level_id, weight_limit_kg, price FROM weight_tariffs", { validate: [
        { sql: "INSERT INTO weight_tariffs VALUES (3, 1, -1, 5)", mustFail: true },
        { sql: "INSERT INTO weight_tariffs VALUES (4, 1, NULL, 5)", mustFail: true },
        { sql: "INSERT INTO weight_tariffs VALUES (5, 999, 3, 5)", mustFail: true },
        { sql: "INSERT INTO weight_tariffs VALUES (6, 2, 3, 0)", mustSucceed: true },
      ] }),
      task("Create return_labels with label_id INTEGER PRIMARY KEY, package_id INTEGER NOT NULL referencing packages(package_id), and tracking_number TEXT NOT NULL UNIQUE. Insert (1, 1, 'RTN0001') and (2, 2, 'RTN0002'). Return label_id, package_id and tracking_number.", "CREATE TABLE return_labels (label_id INTEGER PRIMARY KEY, package_id INTEGER NOT NULL REFERENCES packages(package_id), tracking_number TEXT NOT NULL UNIQUE); INSERT INTO return_labels VALUES (1, 1, 'RTN0001'), (2, 2, 'RTN0002'); SELECT label_id, package_id, tracking_number FROM return_labels", { validate: [
        { sql: "INSERT INTO return_labels VALUES (3, 3, 'RTN0001')", mustFail: true },
        { sql: "INSERT INTO return_labels VALUES (4, 99999999, 'RTN0004')", mustFail: true },
        { sql: "INSERT INTO return_labels VALUES (5, 4, 'RTN0005')", mustSucceed: true },
      ] }),
    ],
    quiz: quiz("A CHECK (weight > 0) column receives NULL. What happens?", ["The insert fails", "The insert succeeds", "NULL becomes 0"], 1, "CHECK fails only when the condition is false; NULL makes it unknown, which passes. Add NOT NULL."),
    walkthrough: [
      step("Build a table with CHECK rules", "Run this. Valid zone rows insert cleanly; values outside the CHECK range would be rejected—that is the database enforcing the rule on every write.", "CREATE TABLE zone_codes (zone TEXT PRIMARY KEY, max_days INTEGER NOT NULL CHECK (max_days BETWEEN 0 AND 10));\nINSERT INTO zone_codes VALUES ('A', 1), ('B', 3);\nSELECT * FROM zone_codes;"),
      step("See the parent service levels", "service_levels is what shipments reference. These ids and codes are the parent keys your foreign keys must match.", "SELECT service_level_id, service_code, promised_business_days FROM service_levels;"),
    ],
  },
  61: {
    dataset: "payments", decision: "MIGRATE", reason: "Transactions and savepoints on real-shaped account balances (disposable copy).",
    concept: "A transaction groups changes so they succeed or fail together. BEGIN starts it, COMMIT keeps the changes and ROLLBACK undoes everything since BEGIN. A SAVEPOINT marks a point inside the transaction; ROLLBACK TO that savepoint undoes only the later changes.",
    trap: "ROLLBACK TO a savepoint does not end the transaction; you still need COMMIT to keep the earlier changes.",
    grain: "One row per account in the result.",
    example: "BEGIN;\nUPDATE accounts SET opening_balance_cents = opening_balance_cents + 100 WHERE account_id = 1;\nROLLBACK;\nSELECT account_id, opening_balance_cents FROM accounts WHERE account_id = 1;",
    hints: ["BEGIN; UPDATE …; ROLLBACK; then SELECT.", "Create the savepoint after the change you want to keep."],
    tasks: [
      task("Begin a transaction, add 10000 cents to opening_balance_cents of accounts 1–5, then roll back. Return account_id and opening_balance_cents for accounts 1–5 (the original values).", "BEGIN; UPDATE accounts SET opening_balance_cents = opening_balance_cents + 10000 WHERE account_id BETWEEN 1 AND 5; ROLLBACK; SELECT account_id, opening_balance_cents FROM accounts WHERE account_id BETWEEN 1 AND 5", { required: ["BEGIN", "ROLLBACK"] }),
      task("Begin; add 5000 cents to account 1; SAVEPOINT before_fee; subtract 2500 cents from account 2; ROLLBACK TO before_fee; COMMIT. Return account_id and opening_balance_cents for accounts 1 and 2.", "BEGIN; UPDATE accounts SET opening_balance_cents = opening_balance_cents + 5000 WHERE account_id = 1; SAVEPOINT before_fee; UPDATE accounts SET opening_balance_cents = opening_balance_cents - 2500 WHERE account_id = 2; ROLLBACK TO before_fee; COMMIT; SELECT account_id, opening_balance_cents FROM accounts WHERE account_id IN (1, 2)", { required: ["SAVEPOINT", "ROLLBACK TO", "COMMIT"] }),
    ],
    quiz: quiz("After BEGIN; change A; SAVEPOINT s; change B; ROLLBACK TO s; COMMIT, which changes remain?", ["A and B", "Only A", "Neither"], 1, "ROLLBACK TO s undoes B; COMMIT keeps A."),
    walkthrough: [
      step("Roll back an entire transaction", "BEGIN adds 100 cents to account 1, then ROLLBACK throws that change away—you should see the original opening_balance_cents again.", "BEGIN;\nUPDATE accounts SET opening_balance_cents = opening_balance_cents + 100 WHERE account_id = 1;\nROLLBACK;\nSELECT account_id, opening_balance_cents FROM accounts WHERE account_id = 1;"),
      step("Undo only after a savepoint", "The first UPDATE on account 3 stays; ROLLBACK TO the savepoint drops the zero-out, and COMMIT keeps the earlier change.", "BEGIN;\nUPDATE accounts SET opening_balance_cents = opening_balance_cents + 1 WHERE account_id = 3;\nSAVEPOINT s;\nUPDATE accounts SET opening_balance_cents = 0 WHERE account_id = 3;\nROLLBACK TO s;\nCOMMIT;\nSELECT account_id, opening_balance_cents FROM accounts WHERE account_id = 3;"),
    ],
  },
  62: {
    dataset: "retail", decision: "MIGRATE", reason: "Views over real Retail sales.",
    concept: "A view is a stored query with a name. Selecting from it runs the query against the current data, so it always reflects the latest rows. Views give a stable, reusable definition (for example, “net sales per customer”) without copying data.",
    trap: "A view does not store results; it is not a snapshot and does not make the underlying query faster.",
    grain: "One row per identified customer, then one row per order month.",
    example: "CREATE VIEW sale_lines AS\nSELECT i.*, o.ordered_at, o.customer_id\nFROM order_items i JOIN orders o ON o.order_id = i.order_id\nWHERE o.order_type = 'sale';\nSELECT COUNT(*) FROM sale_lines;",
    hints: ["CREATE VIEW customer_sales AS SELECT … GROUP BY o.customer_id.", "CREATE VIEW monthly_sales AS SELECT substr(o.ordered_at, 1, 7) AS month, …"],
    tasks: [
      task("Create view customer_sales with customer_id, sale_orders (distinct sale orders) and net_sales (quantity × unit_price over all lines, rounded to 2) for identified customers. Return customer_id, sale_orders and net_sales from the view for customers with net_sales above 10000.", "CREATE VIEW customer_sales AS SELECT o.customer_id, COUNT(DISTINCT CASE WHEN o.order_type = 'sale' THEN o.order_id END) AS sale_orders, ROUND(SUM(i.quantity * i.unit_price), 2) AS net_sales FROM orders o JOIN order_items i ON i.order_id = o.order_id WHERE o.customer_id IS NOT NULL GROUP BY o.customer_id; SELECT customer_id, sale_orders, net_sales FROM customer_sales WHERE net_sales > 10000", { validate: [{ sql: "SELECT COUNT(*) FROM sqlite_schema WHERE type = 'view' AND name = 'customer_sales'", value: 1 }] }),
      task("Create view monthly_sales with month (YYYY-MM of ordered_at) and net_sales (rounded to 2) over all lines. Return month and net_sales from the view.", "CREATE VIEW monthly_sales AS SELECT substr(o.ordered_at, 1, 7) AS month, ROUND(SUM(i.quantity * i.unit_price), 2) AS net_sales FROM orders o JOIN order_items i ON i.order_id = o.order_id GROUP BY month; SELECT month, net_sales FROM monthly_sales", { validate: [{ sql: "SELECT COUNT(*) FROM sqlite_schema WHERE type = 'view' AND name = 'monthly_sales'", value: 1 }] }),
    ],
    quiz: quiz("A row is added to order_items after a view is created. Does the view include it?", ["No, views are snapshots", "Yes, the view’s query runs each time", "Only after REFRESH"], 1, "A SQLite view stores the query, not the result."),
    walkthrough: [
      step("Create a view and count from it", "sale_lines is a saved join of order_items and orders filtered to sales. COUNT(*) runs that definition against whatever rows exist now.", "CREATE VIEW sale_lines AS SELECT i.*, o.ordered_at, o.customer_id FROM order_items i JOIN orders o ON o.order_id = i.order_id WHERE o.order_type = 'sale';\nSELECT COUNT(*) AS sale_lines FROM sale_lines;"),
      step("See a view refresh with new data", "The view does not store results—it re-queries. When order 1 becomes a cancellation, the cancellation count changes immediately.", "CREATE VIEW cancellations AS SELECT order_id FROM orders WHERE order_type = 'cancellation';\nUPDATE orders SET order_type = 'cancellation' WHERE order_id = 1;\nSELECT COUNT(*) AS cancellation_orders FROM cancellations;"),
    ],
  },
  63: {
    dataset: "flights", decision: "MIGRATE", reason: "CREATE TABLE AS and TEMP tables over real flight data.",
    concept: "A CTE lives only within one statement. CREATE TABLE … AS SELECT (CTAS) stores a result as a new table, and CREATE TEMP TABLE stores it only for the current connection. Materialize an intermediate result when several later statements reuse it.",
    trap: "A table built with CTAS does not update when its source changes; it is a copy at the time it was created.",
    grain: "One row per route, then one row per airline.",
    example: "CREATE TEMP TABLE daily_flights AS\nSELECT flight_date, COUNT(*) AS flights FROM flights GROUP BY flight_date;\nSELECT * FROM daily_flights ORDER BY flights DESC LIMIT 5;",
    hints: ["CREATE TEMP TABLE route_counts AS SELECT route_id, COUNT(*) AS flights FROM flights GROUP BY route_id.", "CREATE TEMP TABLE airline_delays AS SELECT airline_code, AVG(departure_delay) … WHERE cancelled = 0 GROUP BY airline_code."],
    tasks: [
      task("Create TEMP table route_counts with route_id and flights (all scheduled flights per route). Return route_id and flights from it for routes with at least 150 flights.", "CREATE TEMP TABLE route_counts AS SELECT route_id, COUNT(*) AS flights FROM flights GROUP BY route_id; SELECT route_id, flights FROM route_counts WHERE flights >= 150", { validate: [{ sql: "SELECT COUNT(*) FROM sqlite_temp_schema WHERE type = 'table' AND name = 'route_counts'", value: 1 }] }),
      task("Create TEMP table airline_delays with airline_code and avg_delay (average departure_delay of operated flights, rounded to 1 decimal). Return airline_code and avg_delay from it for airlines averaging more than 10 minutes.", "CREATE TEMP TABLE airline_delays AS SELECT airline_code, ROUND(AVG(departure_delay), 1) AS avg_delay FROM flights WHERE cancelled = 0 GROUP BY airline_code; SELECT airline_code, avg_delay FROM airline_delays WHERE avg_delay > 10", { validate: [{ sql: "SELECT COUNT(*) FROM sqlite_temp_schema WHERE type = 'table' AND name = 'airline_delays'", value: 1 }] }),
    ],
    quiz: quiz("Which object disappears when the connection closes?", ["A view", "A TEMP table", "A table created with CTAS in main"], 1, "TEMP objects live in the connection’s temporary schema."),
    walkthrough: [
      step("Store daily counts in a TEMP table", "CTAS groups flights by date once; the top five busiest days come from the stored table instead of scanning all flights again.", "CREATE TEMP TABLE daily_flights AS SELECT flight_date, COUNT(*) AS flights FROM flights GROUP BY flight_date;\nSELECT * FROM daily_flights ORDER BY flights DESC LIMIT 5;"),
      step("Answer two questions from one table", "After the same TEMP build, MIN and MAX flights across days show quietest versus busiest without regrouping the source.", "CREATE TEMP TABLE daily_flights AS SELECT flight_date, COUNT(*) AS flights FROM flights GROUP BY flight_date;\nSELECT MIN(flights) AS quietest_day, MAX(flights) AS busiest_day FROM daily_flights;"),
    ],
  },
  64: {
    dataset: "payments", decision: "MIGRATE", reason: "An audit trigger on real-shaped card status changes.",
    concept: "A trigger runs statements automatically when a table changes. An AFTER UPDATE OF column trigger can record OLD and NEW values in an audit table, so every change leaves a trace. Use WHEN to log only real changes.",
    trap: "A trigger fires once per affected row; an UPDATE touching 50 rows writes 50 audit rows.",
    grain: "One audit row per changed card.",
    example: "CREATE TABLE status_log (card_id INTEGER, changed_to TEXT);\nCREATE TRIGGER log_status AFTER UPDATE OF status ON cards\nBEGIN INSERT INTO status_log VALUES (NEW.card_id, NEW.status); END;\nUPDATE cards SET status = 'frozen' WHERE card_id = 1;\nSELECT * FROM status_log;",
    hints: ["CREATE TRIGGER card_status_audit AFTER UPDATE OF status ON cards WHEN OLD.status <> NEW.status BEGIN INSERT INTO card_audit VALUES (OLD.card_id, OLD.status, NEW.status); END;", "Card 119 is already frozen, so the WHEN condition skips it."],
    tasks: [
      task("Create card_audit(card_id INTEGER, old_status TEXT, new_status TEXT) and trigger card_status_audit: AFTER UPDATE OF status ON cards, logging only real changes. Set card 1’s status to 'frozen'. Return card_id, old_status and new_status from card_audit.", "CREATE TABLE card_audit (card_id INTEGER, old_status TEXT, new_status TEXT); CREATE TRIGGER card_status_audit AFTER UPDATE OF status ON cards WHEN OLD.status <> NEW.status BEGIN INSERT INTO card_audit VALUES (OLD.card_id, OLD.status, NEW.status); END; UPDATE cards SET status = 'frozen' WHERE card_id = 1; SELECT card_id, old_status, new_status FROM card_audit", { validate: [{ sql: "SELECT COUNT(*) FROM sqlite_schema WHERE type = 'trigger' AND name = 'card_status_audit'", value: 1 }] }),
      task("Create the same table and trigger, then set status 'frozen' for cards 110–130. Return card_id, old_status and new_status from card_audit (cards that were already frozen are not logged).", "CREATE TABLE card_audit (card_id INTEGER, old_status TEXT, new_status TEXT); CREATE TRIGGER card_status_audit AFTER UPDATE OF status ON cards WHEN OLD.status <> NEW.status BEGIN INSERT INTO card_audit VALUES (OLD.card_id, OLD.status, NEW.status); END; UPDATE cards SET status = 'frozen' WHERE card_id BETWEEN 110 AND 130; SELECT card_id, old_status, new_status FROM card_audit", { validate: [{ sql: "SELECT COUNT(*) FROM sqlite_schema WHERE type = 'trigger' AND name = 'card_status_audit'", value: 1 }] }),
    ],
    quiz: quiz("An UPDATE changes 3 rows. How often does a FOR EACH ROW trigger fire?", ["Once", "Three times", "Never"], 1, "SQLite triggers are row-level: one firing per affected row."),
    walkthrough: [
      step("Count cards by status", "Run this. Most cards are active; lost, expired, and frozen show up as smaller groups—context for the status changes your trigger will log.", "SELECT status, COUNT(*) AS cards FROM cards GROUP BY status;"),
      step("Log status changes with a trigger", "The AFTER UPDATE trigger inserts into status_log when you freeze card 1—you get an audit row without writing a separate INSERT yourself.", "CREATE TABLE status_log (card_id INTEGER, changed_to TEXT);\nCREATE TRIGGER log_status AFTER UPDATE OF status ON cards BEGIN INSERT INTO status_log VALUES (NEW.card_id, NEW.status); END;\nUPDATE cards SET status = 'frozen' WHERE card_id = 1;\nSELECT * FROM status_log;"),
    ],
  },
  65: {
    dataset: "logistics", decision: "MIGRATE", reason: "Procedure-style parameterized lookups over real-shaped shipment data.",
    concept: "A stored procedure packages a parameterized operation behind a stable contract: given inputs, return defined columns. SQLite has no stored procedures; the same contract is a query with one parameter value. Design the result first: inputs, output columns, ordering and what happens when nothing matches.",
    trap: "A contract that returns an empty result for an unknown id must still return the same columns, so callers can rely on the shape.",
    grain: "One row per package, then one row per tracking event.",
    example: "-- get_shipment_packages(:shipment_id)\nSELECT package_id, tracking_number, weight_kg\nFROM packages\nWHERE shipment_id = 6;",
    hints: ["Treat 6 as the :shipment_id parameter.", "Filter tracking_events by package_id and order by event_at, event_id."],
    tasks: [
      task("Implement the contract get_shipment_packages(:shipment_id) for shipment 6: return package_id, tracking_number, package_type and weight_kg for its packages.", "SELECT package_id, tracking_number, package_type, weight_kg FROM packages WHERE shipment_id = 6"),
      task("Implement get_package_history(:package_id) for package 5: return event_id, event_type, event_at and warehouse_id in the order the events happened (event_at, then event_id).", "SELECT event_id, event_type, event_at, warehouse_id FROM tracking_events WHERE package_id = 5 ORDER BY event_at, event_id", { ordered: true }),
    ],
    quiz: quiz("What should get_shipment_packages return for a shipment that does not exist?", ["An error", "The same columns with zero rows", "One row of NULLs"], 1, "A stable contract keeps its shape even when nothing matches."),
    walkthrough: [
      step("Inspect one shipment header", "Shipment 6 stands in for :shipment_id. You see the reference, service level, and created_at—the inputs a caller passes into get_shipment_packages.", "SELECT shipment_id, order_reference, service_level_id, created_at FROM shipments WHERE shipment_id = 6;"),
      step("List packages for that shipment", "These rows are the contract output: package_id, tracking_number, and weight_kg. An unknown shipment would still return the same columns with zero rows.", "SELECT package_id, tracking_number, weight_kg FROM packages WHERE shipment_id = 6;"),
    ],
  },
  66: {
    dataset: "retail", decision: "MIGRATE", reason: "Indexes change real access paths on the 125,613-line order_items table.",
    concept: "An index is a sorted structure that lets SQLite find matching rows without reading the whole table. Create one on columns used in selective filters or joins, then confirm the access path with EXPLAIN QUERY PLAN. Indexes cost storage and write time.",
    trap: "An index on (order_id, stock_code) helps filters on order_id; it does not help a filter on stock_code alone, because stock_code is not the leading column.",
    grain: "One row per matching order line.",
    example: "EXPLAIN QUERY PLAN\nSELECT order_item_id FROM order_items WHERE unit_price > 100;",
    hints: ["CREATE INDEX idx_items_unit_price ON order_items(unit_price).", "Name the index exactly as requested so the check can find it."],
    tasks: [
      task("Create index idx_items_unit_price on order_items(unit_price), then return order_item_id, stock_code and unit_price for lines priced above 200. Use Query plan to see the index search.", "CREATE INDEX idx_items_unit_price ON order_items(unit_price); SELECT order_item_id, stock_code, unit_price FROM order_items WHERE unit_price > 200", { validate: [
        { sql: "SELECT COUNT(*) FROM sqlite_schema WHERE type = 'index' AND name = 'idx_items_unit_price'", value: 1 },
        { sql: "SELECT COUNT(*) FROM pragma_index_info('idx_items_unit_price') WHERE name = 'unit_price'", value: 1 },
      ] }),
      task("Create index idx_orders_country_date on orders(country, ordered_at), then return order_id and ordered_at for orders to Germany placed in 2011.", "CREATE INDEX idx_orders_country_date ON orders(country, ordered_at); SELECT order_id, ordered_at FROM orders WHERE country = 'Germany' AND ordered_at >= '2011-01-01' AND ordered_at < '2012-01-01'", { validate: [
        { sql: "SELECT COUNT(*) FROM pragma_index_info('idx_orders_country_date')", value: 2 },
        { sql: "SELECT name FROM pragma_index_info('idx_orders_country_date') WHERE seqno = 0", value: "country" },
      ] }),
    ],
    quiz: quiz("A plan changes from SCAN to SEARCH … USING INDEX after you add an index. What have you learned?", ["The query is now 10× faster", "SQLite now uses the index to find rows; measure to know the speed", "Every query benefits"], 1, "A plan shows the access path; timing requires measurement on a real workload."),
    walkthrough: [
      step("See a full table scan in the plan", "EXPLAIN QUERY PLAN with no index on unit_price shows SQLite scanning order_items to find lines priced above £100.", "EXPLAIN QUERY PLAN SELECT order_item_id FROM order_items WHERE unit_price > 100;"),
      step("See the plan use an index", "After CREATE INDEX, the same filter should show SEARCH … USING INDEX—SQLite can jump to matching prices instead of reading every row.", "CREATE INDEX idx_items_unit_price ON order_items(unit_price);\nEXPLAIN QUERY PLAN SELECT order_item_id FROM order_items WHERE unit_price > 100;"),
    ],
  },
  67: {
    dataset: "flights", decision: "MIGRATE", reason: "SARGable ranges against real scheduled-departure timestamps.",
    concept: "A predicate is SARGable when the database can use an index to search it: the indexed column appears bare, compared with a value or range. Wrapping the column in a function, such as date(scheduled_departure) = '2025-01-15', hides it from a plain index; the equivalent half-open range keeps it searchable.",
    trap: "SARGability is about access paths, not a rule that functions are slow. On a tiny table a scan can be faster; on 124,460 flights the difference is visible in the plan.",
    grain: "One row per flight in the range.",
    example: "CREATE INDEX idx_flight_time ON flights(scheduled_departure);\nEXPLAIN QUERY PLAN SELECT flight_id FROM flights WHERE date(scheduled_departure) = '2025-01-15';",
    hints: ["CREATE INDEX idx_flight_time ON flights(scheduled_departure).", "scheduled_departure >= '2025-01-15 00:00' AND scheduled_departure < '2025-01-16 00:00'."],
    tasks: [
      task("Create index idx_flight_time on flights(scheduled_departure), then return flight_id and scheduled_departure for flights scheduled on 15 January 2025 using a half-open range the index can search.", "CREATE INDEX idx_flight_time ON flights(scheduled_departure); SELECT flight_id, scheduled_departure FROM flights WHERE scheduled_departure >= '2025-01-15 00:00' AND scheduled_departure < '2025-01-16 00:00'", { validate: [{ sql: "SELECT COUNT(*) FROM sqlite_schema WHERE type = 'index' AND name = 'idx_flight_time'", value: 1 }], planValidation: { indexes: [{ id: "time", table: "flights", columns: ["scheduled_departure"] }], access: [{ index: "time", strategy: "search" }] } }),
      task("Create the same index, then return flight_id and scheduled_departure for flights departing between 06:00 (inclusive) and 09:00 (exclusive) on 1 March 2025, again with a searchable range.", "CREATE INDEX idx_flight_time ON flights(scheduled_departure); SELECT flight_id, scheduled_departure FROM flights WHERE scheduled_departure >= '2025-03-01 06:00' AND scheduled_departure < '2025-03-01 09:00'", { validate: [{ sql: "SELECT COUNT(*) FROM sqlite_schema WHERE type = 'index' AND name = 'idx_flight_time'", value: 1 }], planValidation: { indexes: [{ id: "time", table: "flights", columns: ["scheduled_departure"] }], access: [{ index: "time", strategy: "search" }] } }),
    ],
    quiz: quiz("Which predicate can use an index on scheduled_departure?", ["date(scheduled_departure) = '2025-01-15'", "scheduled_departure >= '2025-01-15 00:00' AND scheduled_departure < '2025-01-16 00:00'", "substr(scheduled_departure, 1, 10) = '2025-01-15'"], 1, "Only the bare-column range can be searched in the index."),
    walkthrough: [
      step("Wrap the column in a function", "date(scheduled_departure) hides the indexed column from a plain index search, so the plan often still scans despite idx_flight_time.", "CREATE INDEX idx_flight_time ON flights(scheduled_departure);\nEXPLAIN QUERY PLAN SELECT flight_id FROM flights WHERE date(scheduled_departure) = '2025-01-15';"),
      step("Filter with a searchable range", "Leaving scheduled_departure bare in a half-open >= / < range is the SARGable form—the plan can search the index for January 15th flights.", "CREATE INDEX idx_flight_time ON flights(scheduled_departure);\nEXPLAIN QUERY PLAN SELECT flight_id FROM flights WHERE scheduled_departure >= '2025-01-15 00:00' AND scheduled_departure < '2025-01-16 00:00';"),
    ],
  },
  68: {
    dataset: "energy", decision: "MIGRATE", reason: "Partitioning trade-offs on real hourly grid data.",
    concept: "Partitioning splits a large table by a key, typically time, so queries that filter on that key read only matching partitions, and old data can be dropped as whole partitions. Its value depends on queries filtering by the partition key. SQLite has no native partitioning; you can still write the aligned range filters and per-period summaries partitioned engines reward.",
    trap: "A filtered result in SQLite is not evidence of partition elimination. Queries that do not filter on the partition key read every partition.",
    grain: "One row per balancing authority hour, then one row per authority and month.",
    example: "SELECT substr(hour_ending_utc, 1, 7) AS month, COUNT(*) AS rows_in_partition\nFROM hourly_demand\nGROUP BY month;",
    hints: ["hour_ending_utc >= '2024-01-01' AND hour_ending_utc < '2024-02-01'.", "GROUP BY ba_code, substr(hour_ending_utc, 1, 7)."],
    tasks: [
      task("Find ERCO in January 2024 using a half-open range on hour_ending_utc (the partition key). Return ba_code, hour_ending_utc and demand_mw.", "SELECT ba_code, hour_ending_utc, demand_mw FROM hourly_demand WHERE ba_code = 'ERCO' AND hour_ending_utc >= '2024-01-01' AND hour_ending_utc < '2024-02-01'"),
      task("Find every authority and month. Return ba_code, month (YYYY-MM of hour_ending_utc) and avg_demand_mw (rounded to 0 decimals).", "SELECT ba_code, substr(hour_ending_utc, 1, 7) AS month, ROUND(AVG(demand_mw), 0) AS avg_demand_mw FROM hourly_demand GROUP BY ba_code, month"),
    ],
    quiz: quiz("A table is partitioned by month. Which query benefits most?", ["One filtering a single month", "One computing a total over all months", "One filtering by ba_code only"], 0, "Only filters on the partition key let the engine skip partitions."),
    walkthrough: [
      step("Count rows per month slice", "Grouping hour_ending_utc by month shows how a time-partitioned table would be split—each month is one logical partition of the hourly data.", "SELECT substr(hour_ending_utc, 1, 7) AS month, COUNT(*) AS rows_in_partition FROM hourly_demand GROUP BY month;"),
      step("Filter one authority and one month", "PJM demand for March 2024 with a half-open range on hour_ending_utc matches how partitioned engines read only the partitions you need.", "SELECT COUNT(*) AS hours FROM hourly_demand WHERE ba_code = 'PJM' AND hour_ending_utc >= '2024-03-01' AND hour_ending_utc < '2024-04-01';"),
    ],
  },
  75: {
    dataset: "saas", decision: "REWRITE", reason: "Reviewing generated SQL now targets real workspace and invitation data; the toy AI-request tables are retired.",
    concept: "Treat generated SQL like any other code review: check the grain, the join type, the denominator and NULL handling against a small known case before trusting the output. Typical defects are inner joins that drop zero rows, COUNT(*) after a LEFT JOIN, and integer division.",
    trap: "A query that runs and returns plausible numbers can still be wrong; compare it with a hand-checked example.",
    grain: "One row per workspace.",
    example: "-- Proposed by an assistant: count projects per workspace\nSELECT a.account_id, COUNT(*) AS projects\nFROM accounts a LEFT JOIN projects p ON p.account_id = a.account_id\nGROUP BY a.account_id;",
    hints: ["COUNT(p.project_id) counts matches; COUNT(*) counts the unmatched row as 1.", "Use 100.0 * … / NULLIF(…, 0) and keep the LEFT JOIN."],
    tasks: [
      task("An assistant proposed counting projects per workspace with COUNT(*) after a LEFT JOIN, which reports 1 for workspaces with none. Return the corrected account_id and projects for every workspace (0 when none).", "SELECT a.account_id, COUNT(p.project_id) AS projects FROM accounts a LEFT JOIN projects p ON p.account_id = a.account_id GROUP BY a.account_id"),
      task("An assistant computed invitation acceptance with COUNT(accepted_at) / COUNT(*) after an inner join, which divides integers and drops workspaces with no invitations. Return account_id and acceptance_pct (0–100, 2 decimals) for every workspace, NULL when no invitation was sent.", "SELECT a.account_id, ROUND(100.0 * COUNT(i.accepted_at) / NULLIF(COUNT(i.invitation_id), 0), 2) AS acceptance_pct FROM accounts a LEFT JOIN invitations i ON i.account_id = a.account_id GROUP BY a.account_id"),
    ],
    quiz: quiz("Which check catches COUNT(*) after a LEFT JOIN?", ["Running it twice", "Checking a workspace you know has zero projects", "Adding ORDER BY"], 1, "A known zero case exposes the off-by-one count."),
    walkthrough: [
      step("Spot the bad LEFT JOIN count", "Run the assistant’s COUNT(*) version. Workspaces with zero projects can still show 1 because the unmatched join row counts as one row in the group.", "SELECT a.account_id, COUNT(*) AS projects FROM accounts a LEFT JOIN projects p ON p.account_id = a.account_id GROUP BY a.account_id HAVING COUNT(p.project_id) = 0 LIMIT 5;"),
      step("Count matches, not the unmatched row", "Run this for one workspace. COUNT(project_id) is 0 when that workspace has no projects. The challenge asks for every workspace, not only the empty ones.", "SELECT a.account_id, COUNT(p.project_id) AS projects FROM accounts a LEFT JOIN projects p ON p.account_id = a.account_id WHERE a.account_id = 1 GROUP BY a.account_id;"),
    ],
  },
};
